import { useCallback, useEffect, useRef, useState } from "react";
import type { HistoryEntry } from "@/components/history-log";
import { useLocalStorage } from "@/hooks/use-local-storage";

const SAME_ORIGIN = "./api/history";
const LOCAL_MAX = 300;
const POLL_MS = 15_000;

/** online: 맥 서버에 저장(다 같이 봄) · local: 이 기기에만 저장 · checking: 아직 확인 중 */
export type SyncMode = "checking" | "online" | "local";

/**
 * 기록 서버 주소 찾기.
 * 1) 맥 서버로 열었으면 같은 주소의 /api
 * 2) GitHub Pages 로 열었으면 server.json 에 적힌 터널 주소(맥이 켜질 때마다 자동으로 갱신됨)
 */
let apiPromise: Promise<string> | null = null;
function findApi(): Promise<string> {
  apiPromise ??= (async () => {
    try {
      const res = await fetch(SAME_ORIGIN, { cache: "no-store" });
      if (res.ok && Array.isArray(await res.json())) return SAME_ORIGIN;
    } catch {
      /* 같은 주소엔 서버 없음 */
    }
    const conf = await fetch("./server.json", { cache: "no-store" }).then((r) => r.json());
    if (typeof conf?.url !== "string" || !conf.url) throw new Error("no server");
    return `${conf.url.replace(/\/$/, "")}/api/history`;
  })();
  apiPromise.catch(() => (apiPromise = null));
  return apiPromise;
}

/** 삭제 비밀번호가 틀렸을 때 */
export class WrongPasswordError extends Error {}
/** 삭제 결과 — 서버가 비밀번호를 거절하면 wrong */
export type DeleteResult = "ok" | "wrong" | "error";

async function call(method: string, path = "", body?: unknown, password?: string): Promise<HistoryEntry[]> {
  let url: string;
  try {
    url = (await findApi()) + path;
  } catch (e) {
    apiPromise = null;
    throw e;
  }
  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(password !== undefined ? { "X-Delete-Password": password } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (res.status === 401) throw new WrongPasswordError();
  if (!res.ok) {
    apiPromise = null; // 터널 주소가 바뀌었을 수 있으니 다음엔 다시 찾기
    throw new Error(String(res.status));
  }
  const data = await res.json().catch(() => null);
  if (!Array.isArray(data)) {
    apiPromise = null;
    throw new Error("bad response");
  }
  return data;
}

/**
 * 지난 기록. 맥 서버(server.mjs)로 열었으면 서버 폴더에 저장해서 모두가 같이 보고,
 * 서버가 없으면(GitHub Pages 등) 예전처럼 이 기기에만 저장한다.
 * 서버에 처음 붙을 때 이 기기에만 있던 기록은 서버로 올린다.
 */
export function useSharedHistory() {
  const [local, setLocal] = useLocalStorage<HistoryEntry[]>("manager-ladder:history", []);
  const [remote, setRemote] = useState<HistoryEntry[]>([]);
  const [mode, setMode] = useState<SyncMode>("checking");
  const localRef = useRef(local);
  localRef.current = local;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const refresh = useCallback(async () => {
    try {
      let list = await call("GET");
      if (modeRef.current !== "online" && localRef.current.length) {
        list = await call("POST", "", localRef.current);
        setLocal([]);
      }
      setRemote(list);
      setMode("online");
    } catch {
      setMode((m) => (m === "online" ? m : "local"));
    }
  }, [setLocal]);

  useEffect(() => {
    refresh();
    const t = window.setInterval(() => document.visibilityState === "visible" && refresh(), POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  /** 서버에 못 보내면 이 기기에 남겨 두고, 다음에 붙을 때 올린다 */
  const add = useCallback(
    async (entry: HistoryEntry) => {
      if (modeRef.current === "online") {
        setRemote((prev) => [entry, ...prev]);
        try {
          setRemote(await call("POST", "", entry));
          return;
        } catch {
          setMode("local");
        }
      }
      setLocal((prev) => [entry, ...prev].slice(0, LOCAL_MAX));
    },
    [setLocal],
  );

  /** 맥 서버 기록은 비밀번호가 맞아야 지워진다. 이 기기에만 있는 기록은 바로 지운다 */
  const del = useCallback(
    async (path: string, password: string | undefined, dropLocal: () => void): Promise<DeleteResult> => {
      if (modeRef.current !== "online") {
        dropLocal();
        return "ok";
      }
      try {
        setRemote(await call("DELETE", path, undefined, password ?? ""));
        dropLocal();
        return "ok";
      } catch (e) {
        return e instanceof WrongPasswordError ? "wrong" : "error";
      }
    },
    [],
  );

  const remove = useCallback(
    (id: string, password?: string) => del(`/${encodeURIComponent(id)}`, password, () => setLocal((prev) => prev.filter((h) => h.id !== id))),
    [del, setLocal],
  );
  const clear = useCallback((password?: string) => del("", password, () => setLocal([])), [del, setLocal]);

  // 서버에 붙어 있어도 아직 못 올린 기록이 있으면 같이 보여준다
  const entries = mode === "online" ? [...local, ...remote] : local;
  return { entries, mode, add, remove, clear };
}
