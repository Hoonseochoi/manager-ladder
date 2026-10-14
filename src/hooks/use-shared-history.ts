import { useCallback, useEffect, useRef, useState } from "react";
import type { HistoryEntry } from "@/components/history-log";
import { useLocalStorage } from "@/hooks/use-local-storage";

const API = "./api/history";
const LOCAL_MAX = 300;
const POLL_MS = 15_000;

/** online: 맥 서버에 저장(다 같이 봄) · local: 이 기기에만 저장 · checking: 아직 확인 중 */
export type SyncMode = "checking" | "online" | "local";

async function call(method: string, url = API, body?: unknown): Promise<HistoryEntry[]> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(String(res.status));
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("bad response");
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
        list = await call("POST", API, localRef.current);
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
          setRemote(await call("POST", API, entry));
          return;
        } catch {
          setMode("local");
        }
      }
      setLocal((prev) => [entry, ...prev].slice(0, LOCAL_MAX));
    },
    [setLocal],
  );

  const remove = useCallback(
    async (id: string) => {
      setLocal((prev) => prev.filter((h) => h.id !== id));
      if (modeRef.current !== "online") return;
      setRemote((prev) => prev.filter((h) => h.id !== id));
      try {
        setRemote(await call("DELETE", `${API}/${encodeURIComponent(id)}`));
      } catch {
        /* 다음 새로고침 때 맞춰짐 */
      }
    },
    [setLocal],
  );

  const clear = useCallback(async () => {
    setLocal([]);
    if (modeRef.current !== "online") return;
    setRemote([]);
    try {
      setRemote(await call("DELETE"));
    } catch {
      /* 다음 새로고침 때 맞춰짐 */
    }
  }, [setLocal]);

  // 서버에 붙어 있어도 아직 못 올린 기록이 있으면 같이 보여준다
  const entries = mode === "online" ? [...local, ...remote] : local;
  return { entries, mode, add, remove, clear };
}
