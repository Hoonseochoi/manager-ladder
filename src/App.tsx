import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, EyeOff, List, Minus, PencilLine, Play, Plus, Shuffle, Sparkles, Trophy, Users } from "lucide-react";
import CardLoader, { type LoaderCard } from "@/components/ui/card-stack-loader";
import { ManagerAvatar } from "@/components/ui/manager-avatar";
import { Confetti } from "@/components/confetti";
import { DynamicIsland, type IslandState } from "@/components/dynamic-island";
import { HistoryLog, type HistoryEntry } from "@/components/history-log";
import { LadderBoard } from "@/components/ladder-board";
import { ManagerRoster } from "@/components/manager-roster";
import { ResultSheet, type ResultRow } from "@/components/result-sheet";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { fileToAvatar } from "@/lib/image";
import { createGame, laneColor, type Game } from "@/lib/ladder";
import { cn } from "@/lib/utils";

const DEFAULT_MANAGERS = ["이지호", "이윤채", "정희선", "전은희", "주기쁨", "이채아"];
const HISTORY_MAX = 300;

const LOADER_CARDS: LoaderCard[] = [
  { id: 1, title: "매니저 집합", code: "STEP_01", color: "bg-amber-300", icon: Users },
  { id: 2, title: "당첨 칸 숨기기", code: "STEP_02", color: "bg-cyan-300", icon: EyeOff },
  { id: 3, title: "사다리 그리기", code: "STEP_03", color: "bg-rose-300", icon: PencilLine },
  { id: 4, title: "몰빵 결정!", code: "STEP_04", color: "bg-emerald-300", icon: Sparkles },
];
const LOADER_MS = 2000;

type Round = { g: Game; players: string[] };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const haptic = (p: number | number[]) => {
  try { navigator.vibrate?.(p); } catch { /* unsupported */ }
};

export default function App() {
  const [managers, setManagers] = useLocalStorage<string[]>("manager-ladder:managers", DEFAULT_MANAGERS);
  const [avatars, setAvatars] = useLocalStorage<Record<string, string>>("manager-ladder:avatars", {});
  /** 이번 판에 빠지는 매니저 */
  const [absent, setAbsent] = useLocalStorage<string[]>("manager-ladder:absent", []);
  const [winnersWanted, setWinnersWanted] = useLocalStorage<number>("manager-ladder:winners", 1);
  const [memo, setMemo] = useLocalStorage<string>("manager-ladder:memo", "");
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>("manager-ladder:history", []);
  /** 이미 명단에 반영한 기본 매니저 — 새로 추가된 기본 매니저만 한 번 넣고, 지운 사람은 되살리지 않는다 */
  const [defaultsSeen, setDefaultsSeen] = useLocalStorage<string[] | null>("manager-ladder:defaults-seen", null);

  useEffect(() => {
    const seen = defaultsSeen ?? DEFAULT_MANAGERS.filter((m) => managers.includes(m));
    const fresh = DEFAULT_MANAGERS.filter((m) => !seen.includes(m) && !managers.includes(m));
    if (fresh.length) setManagers((prev) => [...prev, ...fresh]);
    if (!defaultsSeen || DEFAULT_MANAGERS.some((m) => !defaultsSeen.includes(m))) setDefaultsSeen([...DEFAULT_MANAGERS]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const players = managers.filter((m) => !absent.includes(m));
  const maxWinners = Math.max(1, players.length - 1);
  const winners = Math.min(Math.max(1, winnersWanted), maxWinners);

  /** 사다리를 만든 시점의 참여자로 고정된 한 판 */
  const [round, setRound] = useState<Round | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [active, setActive] = useState<{ lane: number; t: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [island, setIsland] = useState<IslandState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [boom, setBoom] = useState(0);

  const roundRef = useRef(round);
  roundRef.current = round;
  const islandTimer = useRef<number | undefined>(undefined);
  const ladderRef = useRef<HTMLElement>(null);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 1800);
  };

  // 참여자나 당첨 인원이 바뀌면 만들어 둔 사다리는 버린다
  const settingsKey = `${players.join("|")}#${winners}`;
  const builtKey = useRef("");
  useEffect(() => {
    if (roundRef.current && builtKey.current !== settingsKey) {
      setRound(null);
      setDone(new Set());
      setActive(null);
    }
  }, [settingsKey]);

  // 한 판이 끝나면(전원 공개) 기록에 남긴다
  const loggedRound = useRef<number | null>(null);
  useEffect(() => {
    const r = round;
    if (!r || done.size !== r.g.n || loggedRound.current === r.g.id) return;
    loggedRound.current = r.g.id;
    const entry: HistoryEntry = {
      id: `${Date.now()}-${r.g.id}`,
      at: new Date().toISOString(),
      memo: memo.trim(),
      players: r.players,
      winners: r.players.filter((_, i) => r.g.prizes[r.g.ends[i]]),
    };
    setHistory((prev) => [entry, ...prev].slice(0, HISTORY_MAX));
  }, [done, round]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleAbsent = (name: string) => {
    if (running) return;
    setAbsent((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
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
    setAbsent((prev) => prev.map((m) => (m === from ? to : m)));
    setAvatars((prev) => {
      if (!prev[from]) return prev;
      const next = { ...prev, [to]: prev[from] };
      delete next[from];
      return next;
    });
    return true;
  };
  const removeManager = (name: string) => {
    if (!confirm(`${name} 님을 명단에서 뺄까요?`)) return;
    setManagers((prev) => prev.filter((m) => m !== name));
    setAbsent((prev) => prev.filter((m) => m !== name));
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
    if (players.length < 2) return flash("참여 매니저가 2명 이상이어야 해요");
    if (running) return;
    setLoading(true);
    setIsland({ mode: "live", text: "사다리 준비 중…", color: "#fcd34d" });
    await wait(LOADER_MS);
    builtKey.current = settingsKey;
    setRound({ g: createGame(players.length, winners), players: [...players] });
    setDone(new Set());
    setActive(null);
    setLoading(false);
    setIsland(null);
    requestAnimationFrame(() => ladderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const isWin = (r: Round, lane: number) => r.g.prizes[r.g.ends[lane]];

  const showResult = (r: Round, lane: number) => {
    window.clearTimeout(islandTimer.current);
    const name = r.players[lane];
    const win = isWin(r, lane);
    setIsland({
      mode: "expanded",
      label: win ? "설계 몰빵 당첨!" : "아쉽지만…",
      from: name,
      to: win ? "당첨 🎉" : "꽝",
      color: win ? "#fcd34d" : "#a1a1aa",
      avatar: avatars[name],
    });
    islandTimer.current = window.setTimeout(() => setIsland(null), win ? 3000 : 2000);
  };

  const animateLane = (r: Round, lane: number, speed: number) =>
    new Promise<boolean>((resolve) => {
      const dur = Math.min(900 + r.g.moves[lane].length * 220, 2800) / speed;
      const t0 = performance.now();
      const step = (now: number) => {
        if (roundRef.current !== r) return resolve(false); // 도중에 다시 섞음
        const t = Math.min((now - t0) / dur, 1);
        setActive({ lane, t: easeInOut(t) });
        if (t < 1) requestAnimationFrame(step);
        else resolve(true);
      };
      requestAnimationFrame(step);
    });

  const runLane = async (r: Round, lane: number, speed = 1) => {
    window.clearTimeout(islandTimer.current);
    setIsland({ mode: "live", text: `${r.players[lane]} 내려가는 중…`, color: laneColor(lane).hex });
    const ok = await animateLane(r, lane, speed);
    if (!ok) return false;
    setActive(null);
    setDone((prev) => new Set(prev).add(lane));
    if (isWin(r, lane)) {
      setBoom((b) => b + 1);
      haptic([20, 60, 20, 60, 40]);
    } else {
      haptic(12);
    }
    showResult(r, lane);
    return true;
  };

  const pickLane = async (lane: number) => {
    const r = round;
    if (!r) return;
    if (done.has(lane)) return showResult(r, lane);
    if (running) return;
    setRunning(true);
    await runLane(r, lane);
    setRunning(false);
  };

  const runAll = async () => {
    const r = round;
    if (!r || running) return;
    setRunning(true);
    for (let i = 0; i < r.g.n; i++) {
      if (roundRef.current !== r) break;
      if (done.has(i)) continue;
      if (!(await runLane(r, i, 1.8))) break;
      await wait(isWin(r, i) ? 1400 : 700);
    }
    setRunning(false);
    if (roundRef.current === r) window.setTimeout(() => setSheetOpen(true), 500);
  };

  const rows: ResultRow[] = round
    ? round.players.map((name, i) => ({ name, win: done.has(i) ? isWin(round, i) : null }))
    : [];
  const winnerNames = rows.filter((r) => r.win).map((r) => r.name);
  const prizeCount = round ? round.g.prizes.filter(Boolean).length : winners;

  const copy = async () => {
    const lines = [
      `🪜 설계 몰빵 사다리${memo ? ` — ${memo}` : ""}`,
      `🏆 당첨: ${winnerNames.join(", ") || "아직 없음"}`,
      `참여: ${rows.map((r) => r.name).join(", ")}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      flash("결과를 복사했어요 📋");
    } catch {
      flash("복사에 실패했어요");
    }
  };

  const allDone = !!round && done.size === round.g.n;
  const idleText = round
    ? allDone
      ? `🏆 ${winnerNames.join(", ")}`
      : `${done.size}/${round.g.n} 공개 · 당첨 ${winnerNames.length}/${prizeCount}`
    : `참여 ${players.length}명 · 당첨 ${winners}명`;

  return (
    <>
      <DynamicIsland state={island ?? { mode: "idle", text: idleText }} onClick={() => round && done.size > 0 && setSheetOpen(true)} />
      {boom > 0 && <Confetti key={boom} />}

      <main className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top,0px)+76px)] pb-[calc(env(safe-area-inset-bottom,0px)+120px)]">
        {/* 헤더 */}
        <header className="relative mb-6 px-1">
          <span className="inline-block -rotate-3 rounded-full border-[2.5px] border-black bg-cyan-300 px-3 py-1 font-mono text-[11px] font-black tracking-widest shadow-brutal-sm">
            ALL_IN_LADDER
          </span>
          <h1 className="mt-3 font-cute text-[44px] leading-[1.05] tracking-tight">
            설계 몰빵
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">사다리 타기</span>
              <span className="absolute inset-x-[-4px] bottom-1 z-0 h-4 -rotate-1 rounded-full bg-amber-300" />
            </span>
          </h1>
          <p className="mt-3 text-[15px] font-medium text-black/55">매니저 전원이 타고, 당첨된 사람이 설계를 몰빵 받아요.</p>
          <span className="absolute right-2 top-2 animate-bob text-4xl" aria-hidden>
            🏆
          </span>
        </header>

        {/* 이번 판 설정 */}
        <section className="brutal-card mb-5 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-cute text-2xl">이번 판</h2>
            <span className="rounded-full border-2 border-black bg-amber-300 px-2.5 py-0.5 font-mono text-xs font-black">
              참여 {players.length}명
            </span>
          </div>

          <p className="mt-4 px-1 text-sm font-extrabold">참여 매니저</p>
          <p className="mt-0.5 px-1 text-[13px] text-black/50">기본은 전원 참여 · 탭하면 이번 판에서 빠져요</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {managers.map((m) => {
              const on = !absent.includes(m);
              return (
                <li key={m}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => toggleAbsent(m)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border-[2.5px] py-1 pl-1 pr-3 text-sm font-extrabold transition-[transform,background-color,opacity] duration-300 ease-spring active:scale-90",
                      on ? "border-black bg-white shadow-brutal-sm" : "border-dashed border-black/30 bg-transparent text-black/35 line-through",
                    )}
                  >
                    <span className={cn(!on && "opacity-40 grayscale")}>
                      <ManagerAvatar name={m} src={avatars[m]} size={26} />
                    </span>
                    {m}
                    {on && <Check className="size-3.5" strokeWidth={3.5} />}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex items-center justify-between gap-3 rounded-[22px] border-[2.5px] border-black bg-amber-100 p-3 pl-4">
            <div>
              <p className="flex items-center gap-1 text-sm font-extrabold">
                <Trophy className="size-4" strokeWidth={2.6} /> 당첨 인원
              </p>
              <p className="text-[12px] text-black/50">최대 {maxWinners}명</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="당첨 인원 줄이기"
                disabled={winners <= 1 || running}
                onClick={() => setWinnersWanted(winners - 1)}
                className="press grid size-10 place-items-center rounded-full border-[2.5px] border-black bg-white shadow-brutal-sm disabled:opacity-30"
              >
                <Minus className="size-4" strokeWidth={3.5} />
              </button>
              <motion.span
                key={winners}
                initial={{ scale: 1.4, rotate: -8 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 14 }}
                className="w-14 text-center font-cute text-3xl leading-none"
                aria-live="polite"
              >
                {winners}명
              </motion.span>
              <button
                type="button"
                aria-label="당첨 인원 늘리기"
                disabled={winners >= maxWinners || running}
                onClick={() => setWinnersWanted(winners + 1)}
                className="press grid size-10 place-items-center rounded-full border-[2.5px] border-black bg-amber-300 shadow-brutal-sm disabled:opacity-30"
              >
                <Plus className="size-4" strokeWidth={3.5} />
              </button>
            </div>
          </div>

          <label className="mt-5 block px-1 text-sm font-extrabold" htmlFor="memo">
            몰빵할 설계 <span className="font-semibold text-black/40">(선택)</span>
          </label>
          <input
            id="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예) 김설계 외 3건"
            enterKeyHint="done"
            autoComplete="off"
            className="mt-2 w-full rounded-full border-[2.5px] border-black bg-cream px-5 py-2.5 text-[16px] font-semibold shadow-brutal-sm outline-none placeholder:text-black/30 focus:shadow-brutal"
          />
        </section>

        {/* 사다리 */}
        {round && (
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
                {done.size} / {round.g.n}
              </span>
            </div>
            <p className="mb-3 mt-1.5 px-0.5 text-[13px] text-black/50">
              매니저를 탭하면 한 명씩 내려가요 · 아래 <b className="text-black/70">?</b> 중 {prizeCount}칸이 당첨 🏆
            </p>
            <LadderBoard game={round.g} players={round.players} avatars={avatars} done={done} active={active} onPick={pickLane} />
          </motion.section>
        )}

        {/* 지난 기록 */}
        <HistoryLog
          entries={history}
          avatars={avatars}
          onDelete={(id) => setHistory((prev) => prev.filter((h) => h.id !== id))}
          onClear={() => setHistory([])}
          onCopied={flash}
        />

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
      </main>

      {/* 하단 독 */}
      <nav
        aria-label="게임 조작"
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+14px)] left-1/2 z-40 flex max-w-[calc(100vw-24px)] -translate-x-1/2 gap-1.5 rounded-full border-[3px] border-black bg-white p-1.5 shadow-brutal-lg"
      >
        <DockButton onClick={build} disabled={running || loading || players.length < 2} icon={round ? Shuffle : Sparkles}>
          {round ? "다시 섞기" : "사다리 만들기"}
        </DockButton>
        <DockButton onClick={runAll} disabled={!round || running || allDone} icon={Play} primary>
          전체 시작
        </DockButton>
        <DockButton onClick={() => setSheetOpen(true)} disabled={!round} icon={List}>
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
                badge="몰빵 준비중"
                footerLabel="ALL_IN_BUILD"
                footerStatus={`당첨 ${winners}/${players.length}`}
                className="min-h-0"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ResultSheet open={sheetOpen} rows={rows} memo={memo} avatars={avatars} onClose={() => setSheetOpen(false)} onCopy={copy} />

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
