import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { List, PencilLine, Play, Plus, Shuffle, Sparkles, Trash2, Users, X } from "lucide-react";
import CardLoader, { type LoaderCard } from "@/components/ui/card-stack-loader";
import { ManagerAvatar } from "@/components/ui/manager-avatar";
import { DynamicIsland, type IslandState } from "@/components/dynamic-island";
import { EntryEditor } from "@/components/entry-editor";
import { ManagerPicker } from "@/components/manager-picker";
import { ManagerRoster } from "@/components/manager-roster";
import { LadderBoard } from "@/components/ladder-board";
import { ResultSheet, type ResultRow } from "@/components/result-sheet";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { fileToAvatar } from "@/lib/image";
import { createGame, laneColor, parseEntries, type Entry, type Game } from "@/lib/ladder";
import { cn } from "@/lib/utils";

const DEFAULT_MANAGERS = ["이지호", "이윤채", "정희선", "전은희", "주기쁨"];
const SAMPLE_DESIGNERS = ["김설계", "이설계", "박설계", "최설계", "강설계"];

const LOADER_CARDS: LoaderCard[] = [
  { id: 1, title: "매물 섞는 중", code: "STEP_01", color: "bg-amber-300", icon: Shuffle },
  { id: 2, title: "매니저 소환", code: "STEP_02", color: "bg-cyan-300", icon: Users },
  { id: 3, title: "사다리 그리기", code: "STEP_03", color: "bg-rose-300", icon: PencilLine },
  { id: 4, title: "운명 결정!", code: "STEP_04", color: "bg-emerald-300", icon: Sparkles },
];
const LOADER_MS = 2000;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const haptic = (p: number | number[]) => {
  try { navigator.vibrate?.(p); } catch { /* unsupported */ }
};

export default function App() {
  const [entries, setEntries] = useLocalStorage<Entry[]>("manager-ladder:entries", []);
  const [avatars, setAvatars] = useLocalStorage<Record<string, string>>("manager-ladder:avatars", {});
  const [managers, setManagers] = useLocalStorage<string[]>("manager-ladder:managers", DEFAULT_MANAGERS);
  const [draft, setDraft] = useState("");
  const [picked, setPicked] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const [game, setGame] = useState<Game | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [active, setActive] = useState<{ lane: number; t: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [island, setIsland] = useState<IslandState>({ mode: "idle", text: "준비" });
  const [toast, setToast] = useState<string | null>(null);

  const gameRef = useRef<Game | null>(null);
  gameRef.current = game;
  const islandTimer = useRef<number | undefined>(undefined);
  const ladderRef = useRef<HTMLElement>(null);

  /* ───────── 아일랜드 ───────── */
  const idleText = useCallback(() => {
    const g = gameRef.current;
    if (g) return done.size === g.n ? "모두 배정 완료 ✨" : `${done.size} / ${g.n} 배정`;
    return entries.length ? `매물 ${entries.length}건 대기` : "준비";
  }, [done, entries.length]);

  useEffect(() => {
    if (!running && island.mode === "idle") setIsland({ mode: "idle", text: idleText() });
  }, [idleText, running, island.mode]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 1800);
  };

  /* ───────── 입력 ───────── */
  const invalidate = () => {
    setGame(null);
    setDone(new Set());
    setActive(null);
  };
  /** 명단에 없는 매니저 이름은 명단에 자동으로 추가 */
  const ensureManagers = (names: string[]) => {
    const fresh = [...new Set(names.filter((n) => n && !managers.includes(n)))];
    if (fresh.length) setManagers((prev) => [...prev, ...fresh]);
  };
  const addEntries = (raw: string, fallbackManager = "") => {
    const added = parseEntries(raw).map((e) => ({ ...e, manager: e.manager || fallbackManager }));
    if (!added.length) return 0;
    ensureManagers(added.map((e) => e.manager));
    setEntries((prev) => [...prev, ...added]);
    invalidate();
    haptic(8);
    return added.length;
  };
  const removeEntry = (i: number) => {
    setEntries((prev) => prev.filter((_, k) => k !== i));
    invalidate();
  };
  const updateEntry = (i: number, next: Entry) => {
    ensureManagers([next.manager]);
    setEntries((prev) => prev.map((e, k) => (k === i ? next : e)));
    invalidate();
  };

  /* ───────── 매니저 명단 ───────── */
  const addManager = (raw: string) => {
    const name = raw.trim();
    if (!name) return false;
    if (managers.includes(name)) {
      flash(`${name} 님은 이미 있어요`);
      return false;
    }
    setManagers((prev) => [...prev, name]);
    flash(`${name} 추가!`);
    return true;
  };
  const renameManager = (from: string, raw: string) => {
    const to = raw.trim();
    if (!to || to === from) return false;
    if (managers.includes(to)) {
      flash(`${to} 님은 이미 있어요`);
      return false;
    }
    setManagers((prev) => prev.map((m) => (m === from ? to : m)));
    setEntries((prev) => prev.map((e) => (e.manager === from ? { ...e, manager: to } : e)));
    setAvatars((prev) => {
      if (!prev[from]) return prev;
      const next = { ...prev, [to]: prev[from] };
      delete next[from];
      return next;
    });
    if (picked === from) setPicked(to);
    invalidate();
    return true;
  };
  const removeManager = (name: string) => {
    const used = entries.filter((e) => e.manager === name).length;
    if (!confirm(used ? `${name} 님을 명단에서 뺄까요?\n(입력된 매물 ${used}건은 그대로 남아요)` : `${name} 님을 명단에서 뺄까요?`)) return;
    setManagers((prev) => prev.filter((m) => m !== name));
    if (picked === name) setPicked("");
  };

  const pickAvatar = async (name: string, file: File) => {
    try {
      const url = await fileToAvatar(file);
      setAvatars((prev) => ({ ...prev, [name]: url }));
      flash(`${name} 사진 등록!`);
    } catch {
      flash("사진을 불러오지 못했어요");
    }
  };
  const clearAvatar = (name: string) =>
    setAvatars((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });

  /* ───────── 게임 ───────── */
  const build = async () => {
    if (entries.length < 2) return flash("2건 이상 입력해 주세요");
    if (running) return;
    setLoading(true);
    setIsland({ mode: "live", text: "사다리 준비 중…", color: "#fcd34d" });
    await wait(LOADER_MS);
    setGame(createGame(entries));
    setDone(new Set());
    setActive(null);
    setLoading(false);
    setIsland({ mode: "idle", text: `0 / ${entries.length} 배정` });
    requestAnimationFrame(() => ladderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const showResult = (g: Game, lane: number) => {
    window.clearTimeout(islandTimer.current);
    const e = entries[lane];
    const to = g.bottoms[g.ends[lane]];
    setIsland({
      mode: "expanded",
      label: e.manager && e.manager === to ? "배정 완료 · 기존 유지" : "배정 완료",
      from: e.designer,
      to,
      color: laneColor(lane).hex,
      avatar: avatars[to],
    });
    islandTimer.current = window.setTimeout(() => setIsland({ mode: "idle", text: "" }), 2400);
  };

  const animateLane = (g: Game, lane: number, speed: number) =>
    new Promise<boolean>((resolve) => {
      const dur = Math.min(900 + g.moves[lane].length * 220, 2800) / speed;
      const t0 = performance.now();
      const step = (now: number) => {
        if (gameRef.current !== g) return resolve(false); // 도중에 다시 섞음
        const t = Math.min((now - t0) / dur, 1);
        setActive({ lane, t: easeInOut(t) });
        if (t < 1) requestAnimationFrame(step);
        else resolve(true);
      };
      requestAnimationFrame(step);
    });

  const runLane = async (g: Game, lane: number, speed = 1) => {
    window.clearTimeout(islandTimer.current);
    setIsland({ mode: "live", text: `${entries[lane].designer} 사다리 타는 중…`, color: laneColor(lane).hex });
    const ok = await animateLane(g, lane, speed);
    if (!ok) return false;
    setActive(null);
    setDone((prev) => new Set(prev).add(lane));
    haptic([10, 40, 18]);
    showResult(g, lane);
    return true;
  };

  const pickLane = async (lane: number) => {
    const g = game;
    if (!g) return;
    if (done.has(lane)) return showResult(g, lane);
    if (running) return;
    setRunning(true);
    await runLane(g, lane);
    setRunning(false);
  };

  const runAll = async () => {
    const g = game;
    if (!g || running) return;
    setRunning(true);
    for (let i = 0; i < g.n; i++) {
      if (gameRef.current !== g) break;
      if (done.has(i)) continue;
      if (!(await runLane(g, i, 1.8))) break;
      await wait(700);
    }
    setRunning(false);
    if (gameRef.current === g) window.setTimeout(() => setSheetOpen(true), 600);
  };

  const rows: ResultRow[] = entries.map((e, i) => ({
    lane: i,
    designer: e.designer,
    orig: e.manager,
    to: game && done.has(i) ? game.bottoms[game.ends[i]] : null,
  }));
  const copy = async () => {
    const text = rows.map((r) => `${r.designer} → ${r.to ?? "대기"}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      flash("결과를 복사했어요 📋");
    } catch {
      flash("복사에 실패했어요");
    }
  };

  const allDone = !!game && done.size === game.n;

  return (
    <>
      <DynamicIsland state={island.mode === "idle" ? { mode: "idle", text: idleText() } : island} onClick={() => game && done.size > 0 && setSheetOpen(true)} />

      <main className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top,0px)+76px)] pb-[calc(env(safe-area-inset-bottom,0px)+120px)]">
        {/* 헤더 */}
        <header className="relative mb-6 px-1">
          <span className="inline-block -rotate-3 rounded-full border-[2.5px] border-black bg-cyan-300 px-3 py-1 font-mono text-[11px] font-black tracking-widest shadow-brutal-sm">
            MANAGER_LADDER
          </span>
          <h1 className="mt-3 font-cute text-[44px] leading-[1.05] tracking-tight">
            매니저
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">사다리 타기</span>
              <span className="absolute inset-x-[-4px] bottom-1 z-0 h-4 -rotate-1 rounded-full bg-amber-300" />
            </span>
          </h1>
          <p className="mt-3 text-[15px] font-medium text-black/55">설계매물을 넣고 사다리를 타면 매니저가 정해져요.</p>
          <span className="absolute right-2 top-2 animate-bob text-4xl" aria-hidden>
            🪜
          </span>
        </header>

        {/* 설계매물 입력 */}
        <section className="brutal-card mb-5 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-cute text-2xl">설계매물</h2>
            <span className="rounded-full border-2 border-black bg-amber-300 px-2.5 py-0.5 font-mono text-xs font-black">
              {entries.length}건
            </span>
          </div>

          <form
            className="mt-4 flex items-center gap-2 rounded-full border-[2.5px] border-black bg-cream py-1.5 pl-5 pr-1.5 shadow-brutal-sm focus-within:shadow-brutal transition-shadow"
            onSubmit={(e) => {
              e.preventDefault();
              if (addEntries(draft, picked)) setDraft("");
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (!/[\n,;]/.test(text)) return;
                e.preventDefault();
                flash(`${addEntries(text, picked)}건 추가!`);
              }}
              placeholder={picked ? `설계사 이름 → ${picked}` : "설계사이름_매니저명"}
              aria-label="설계매물 입력 (설계사이름_매니저명)"
              enterKeyHint="done"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-[17px] font-semibold outline-none placeholder:text-black/30"
            />
            <button
              type="submit"
              aria-label="추가"
              className="press grid size-10 shrink-0 place-items-center rounded-full border-[2.5px] border-black bg-amber-300 shadow-brutal-sm"
            >
              <Plus className="size-5" strokeWidth={3} />
            </button>
          </form>
          <p className="mt-2.5 px-1 text-[13px] text-black/50">
            매니저를 먼저 고르고 설계사 이름만 넣어도 돼요. <code className="rounded-md bg-black/5 px-1.5 py-0.5 font-mono text-xs">김설계_이지호</code>{" "}
            형식·여러 줄 붙여넣기도 OK
          </p>
          <ManagerPicker className="mt-3" managers={managers} avatars={avatars} value={picked} onChange={setPicked} />

          {entries.length ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              <AnimatePresence initial={false}>
                {entries.map((e, i) => (
                  <motion.li
                    key={`${e.designer}_${e.manager}_${i}`}
                    layout
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    className={cn(
                      "flex items-center gap-2 rounded-full border-[2.5px] border-black py-1 pl-1 pr-1.5 shadow-brutal-sm",
                      laneColor(i).bg,
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setEditIdx(i)}
                      aria-label={`${e.designer} 고치기`}
                      className="flex items-center gap-2 transition-transform active:scale-95"
                    >
                      <ManagerAvatar name={e.manager || e.designer} src={avatars[e.manager]} size={28} />
                      <span className="text-[15px] font-extrabold">{e.designer}</span>
                      <span className="text-sm font-semibold text-black/60">· {e.manager || "매니저 없음"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEntry(i)}
                      aria-label={`${e.designer} 삭제`}
                      className="grid size-6 place-items-center rounded-full bg-black/10 transition-transform active:scale-75"
                    >
                      <X className="size-3" strokeWidth={3.5} />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <div className="mt-4 rounded-[22px] border-[2.5px] border-dashed border-black/25 py-7 text-center text-sm font-semibold text-black/35">
              아직 입력된 매물이 없어요 👀
            </div>
          )}

          <div className="mt-4 flex justify-between">
            <button
              type="button"
              onClick={() => {
                setEntries(SAMPLE_DESIGNERS.map((designer, i) => ({ designer, manager: managers[i % managers.length] ?? "" })));
                invalidate();
              }}
              className="rounded-full px-3 py-1.5 text-sm font-extrabold text-black/70 active:bg-black/5"
            >
              예시 넣기
            </button>
            <button
              type="button"
              disabled={!entries.length}
              onClick={() => {
                if (confirm("입력한 매물을 모두 지울까요?")) {
                  setEntries([]);
                  invalidate();
                }
              }}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-extrabold text-rose-500 active:bg-rose-50 disabled:opacity-30"
            >
              <Trash2 className="size-4" strokeWidth={2.6} /> 전체 삭제
            </button>
          </div>
        </section>

        {/* 매니저 명단 */}
        <ManagerRoster
          managers={managers}
          avatars={avatars}
          onAdd={addManager}
          onRename={renameManager}
          onRemove={removeManager}
          onPickPhoto={pickAvatar}
          onClearPhoto={clearAvatar}
        />

        {/* 사다리 */}
        {game && (
          <motion.section
            ref={ladderRef}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="brutal-card mb-5 scroll-mt-[calc(env(safe-area-inset-top,0px)+70px)] p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-cute text-2xl">사다리</h2>
              <span className={cn("rounded-full border-2 border-black px-2.5 py-0.5 font-mono text-xs font-black", allDone ? "bg-emerald-300" : "bg-white")}>
                {done.size} / {game.n}
              </span>
            </div>
            <p className="mb-3 mt-1.5 px-0.5 text-[13px] text-black/50">설계사 이름을 탭하면 한 줄씩 내려가요 👇</p>
            <LadderBoard game={game} entries={entries} avatars={avatars} done={done} active={active} onPick={pickLane} />
          </motion.section>
        )}
      </main>

      {/* 하단 독 */}
      <nav
        aria-label="게임 조작"
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+14px)] left-1/2 z-40 flex max-w-[calc(100vw-24px)] -translate-x-1/2 gap-1.5 rounded-full border-[3px] border-black bg-white p-1.5 shadow-brutal-lg"
      >
        <DockButton onClick={build} disabled={running || loading || entries.length < 2} icon={game ? Shuffle : Sparkles}>
          {game ? "다시 섞기" : "사다리 만들기"}
        </DockButton>
        <DockButton onClick={runAll} disabled={!game || running || allDone} icon={Play} primary>
          전체 시작
        </DockButton>
        <DockButton onClick={() => setSheetOpen(true)} disabled={!game} icon={List}>
          결과
        </DockButton>
      </nav>

      {/* 카드 스택 로더 */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="fixed inset-0 z-45 grid place-items-center bg-cream/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <motion.div
              initial={{ scale: 0.8, rotate: -4, y: 30 }}
              animate={{ scale: 1, rotate: 0, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 360, damping: 20 }}
              className="[&>div>div]:rounded-[30px] [&>div>div>div:nth-child(2)]:rounded-[20px] [&>div>div>div:last-child]:rounded-full"
            >
              <CardLoader
                cards={LOADER_CARDS}
                interval={450}
                badge="사다리 준비중"
                footerLabel="LADDER_BUILD"
                footerStatus={`${entries.length}건`}
                className="min-h-0"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <EntryEditor
        entry={editIdx !== null ? entries[editIdx] ?? null : null}
        managers={managers}
        avatars={avatars}
        onClose={() => setEditIdx(null)}
        onSave={(next) => {
          if (editIdx !== null) updateEntry(editIdx, next);
          setEditIdx(null);
          flash("수정했어요 ✏️");
        }}
        onDelete={() => {
          if (editIdx !== null) removeEntry(editIdx);
          setEditIdx(null);
        }}
      />

      <ResultSheet open={sheetOpen} rows={rows} avatars={avatars} onClose={() => setSheetOpen(false)} onCopy={copy} />

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            role="status"
            className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+92px)] left-1/2 z-80 -translate-x-1/2 whitespace-nowrap rounded-full border-[2.5px] border-black bg-black px-4 py-2 text-sm font-bold text-white"
            initial={{ opacity: 0, y: 16, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 8, x: "-50%" }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function DockButton({
  children,
  icon: Icon,
  primary,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; primary?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "flex h-12 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[15px] font-extrabold transition-[transform,opacity] duration-300 ease-spring active:scale-90 disabled:opacity-35 disabled:active:scale-100 max-[380px]:px-3 max-[380px]:text-sm",
        primary ? "border-[2.5px] border-black bg-amber-300" : "",
      )}
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={2.6} />
      {children}
    </button>
  );
}
