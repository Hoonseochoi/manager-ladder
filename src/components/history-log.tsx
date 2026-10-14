import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Cloud, Copy, Download, Smartphone, Trash2, Trophy, UserRound } from "lucide-react";
import { ManagerAvatar } from "@/components/ui/manager-avatar";
import type { DeleteResult, SyncMode } from "@/hooks/use-shared-history";
import { cn } from "@/lib/utils";

export type HistoryEntry = {
  id: string;
  /** ISO 시각 */
  at: string;
  /** 돌린 사람 */
  by?: string;
  memo: string;
  players: string[];
  winners: string[];
};

type Props = {
  entries: HistoryEntry[];
  mode: SyncMode;
  me: string;
  onEditMe: () => void;
  avatars: Record<string, string>;
  onDelete: (id: string, password?: string) => Promise<DeleteResult>;
  onClear: (password?: string) => Promise<DeleteResult>;
  onCopied: (msg: string) => void;
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const historyLine = (h: HistoryEntry) =>
  `${fmt(h.at)}${h.by ? ` (${h.by})` : ""}${h.memo ? ` [${h.memo}]` : ""} 🏆 ${h.winners.join(", ")} (참여 ${h.players.length}명: ${h.players.join(", ")})`;

function toCsv(entries: HistoryEntry[]) {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const head = ["일시", "돌린 사람", "설계", "당첨", "당첨 인원", "참여", "참여 인원"].join(",");
  const rows = entries.map((h) =>
    [fmt(h.at), h.by ?? "", h.memo, h.winners.join(" / "), h.winners.length, h.players.join(" / "), h.players.length]
      .map((v) => q(String(v)))
      .join(","),
  );
  // 엑셀에서 한글 깨지지 않게 BOM
  return "﻿" + [head, ...rows].join("\n");
}

/** 지난 판 기록 — 판이 끝날 때마다 자동으로 쌓인다 (맥 서버로 열면 다 같이, 아니면 이 기기에 저장) */
export function HistoryLog({ entries: all, mode, me, onEditMe, avatars, onDelete, onClear, onCopied }: Props) {
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  /** 돌린 사람으로 거르기 (null = 전체) */
  const [byFilter, setByFilter] = useState<string | null>(null);
  const runners = [...new Set(all.map((h) => h.by).filter((b): b is string => !!b))];
  const entries = byFilter ? all.filter((h) => h.by === byFilter) : all;
  const shown = showAll ? entries : entries.slice(0, 5);

  /** 맥에 저장된 기록은 비밀번호를 받아서 지운다 */
  const confirmDelete = async (question: string, run: (password?: string) => Promise<DeleteResult>) => {
    let password: string | undefined;
    if (mode === "online") {
      const input = prompt(`${question}\n삭제 비밀번호를 입력해 주세요.`);
      if (input === null) return;
      password = input;
    } else if (!confirm(question)) return;
    const result = await run(password);
    onCopied(result === "ok" ? "기록을 지웠어요 🗑️" : result === "wrong" ? "비밀번호가 틀렸어요 🔒" : "지우지 못했어요. 연결을 확인해 주세요");
  };

  // 매니저별 당첨 횟수
  const tally = new Map<string, number>();
  for (const h of entries) for (const w of h.winners) tally.set(w, (tally.get(w) ?? 0) + 1);
  const ranking = [...tally.entries()].sort((a, b) => b[1] - a[1]);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(entries.map(historyLine).join("\n"));
      onCopied("기록을 복사했어요 📋");
    } catch {
      onCopied("복사에 실패했어요");
    }
  };
  const download = () => {
    const blob = new Blob([toCsv(entries)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ladder-log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.style.display = "none";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="brutal-card mb-5 p-5">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between" aria-expanded={open}>
        <h2 className="font-cute text-2xl">지난 기록</h2>
        <span className="flex items-center gap-2">
          <span className="rounded-full border-2 border-black bg-emerald-300 px-2.5 py-0.5 font-mono text-xs font-black">
            {entries.length}판
          </span>
          <ChevronDown className={cn("size-5 transition-transform duration-300", open && "rotate-180")} strokeWidth={3} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full border-2 border-black px-2.5 py-0.5",
                  mode === "online" ? "bg-cyan-200" : "bg-white text-black/55",
                )}
              >
                {mode === "online" ? <Cloud className="size-3.5" strokeWidth={2.6} /> : <Smartphone className="size-3.5" strokeWidth={2.6} />}
                {mode === "online" ? "맥에 저장 · 다 같이 봐요" : mode === "local" ? "이 기기에만 저장" : "연결 확인 중…"}
              </span>
              <button type="button" onClick={onEditMe} className="flex items-center gap-1 rounded-full border-2 border-black bg-white px-2.5 py-0.5 active:bg-black/5">
                <UserRound className="size-3.5" strokeWidth={2.6} /> {me || "이름 없음"}
                <span className="text-black/40">변경</span>
              </button>
            </div>

            {runners.length > 1 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[null, ...runners].map((r) => (
                  <button
                    key={r ?? "__all"}
                    type="button"
                    onClick={() => setByFilter(r)}
                    className={cn(
                      "rounded-full border-2 border-black px-2.5 py-0.5 text-xs font-extrabold",
                      byFilter === r ? "bg-black text-white" : "bg-white active:bg-black/5",
                    )}
                  >
                    {r ?? "전체"}
                    {r === me && " (나)"}
                  </button>
                ))}
              </div>
            )}

            {!entries.length ? (
              <div className="mt-4 rounded-[22px] border-[2.5px] border-dashed border-black/25 py-7 text-center text-sm font-semibold text-black/35">
                사다리를 끝까지 타면 여기에 기록이 남아요 📝
              </div>
            ) : (
              <>
                {/* 누적 당첨 */}
                <div className="mt-4 rounded-[22px] border-[2.5px] border-black bg-amber-100 p-3">
                  <p className="flex items-center gap-1 px-1 text-sm font-extrabold">
                    <Trophy className="size-4" strokeWidth={2.6} /> 누적 당첨
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {ranking.map(([name, n]) => (
                      <li key={name} className="flex items-center gap-1.5 rounded-full border-2 border-black bg-white py-0.5 pl-0.5 pr-2.5 text-sm font-extrabold">
                        <ManagerAvatar name={name} src={avatars[name]} size={22} />
                        {name}
                        <span className="rounded-full bg-amber-300 px-1.5 font-mono text-xs">{n}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <ol className="mt-3 flex flex-col gap-2">
                  {shown.map((h) => (
                    <li key={h.id} className="rounded-[20px] border-[2.5px] border-black bg-white p-3 shadow-brutal-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold text-black/50">
                            {fmt(h.at)}
                            {h.by && <span className="ml-1.5 font-sans font-extrabold text-black/70">· {h.by} 돌림</span>}
                          </p>
                          {h.memo && <p className="mt-0.5 truncate text-sm font-extrabold">📦 {h.memo}</p>}
                        </div>
                        <button
                          type="button"
                          aria-label="이 기록 지우기"
                          onClick={() => confirmDelete("이 기록을 지울까요?", (pw) => onDelete(h.id, pw))}
                          className="grid size-7 shrink-0 place-items-center rounded-full text-black/35 active:bg-black/5"
                        >
                          <Trash2 className="size-4" strokeWidth={2.4} />
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-black">🏆</span>
                        {h.winners.map((w) => (
                          <span key={w} className="flex items-center gap-1 rounded-full border-2 border-black bg-amber-300 py-0.5 pl-0.5 pr-2 text-xs font-extrabold">
                            <ManagerAvatar name={w} src={avatars[w]} size={18} />
                            {w}
                          </span>
                        ))}
                      </div>
                      <p className="mt-1.5 text-xs font-semibold text-black/45">
                        참여 {h.players.length}명 · {h.players.filter((p) => !h.winners.includes(p)).join(", ")} 꽝
                      </p>
                    </li>
                  ))}
                </ol>

                {entries.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="mt-2 w-full rounded-full py-2 text-sm font-extrabold text-black/60 active:bg-black/5"
                  >
                    {showAll ? "접기" : `${entries.length - 5}판 더 보기`}
                  </button>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copyAll}
                    className="press flex items-center gap-1.5 rounded-full border-[2.5px] border-black bg-white px-3.5 py-1.5 text-sm font-extrabold shadow-brutal-sm"
                  >
                    <Copy className="size-4" strokeWidth={2.6} /> 전체 복사
                  </button>
                  <button
                    type="button"
                    onClick={download}
                    className="press flex items-center gap-1.5 rounded-full border-[2.5px] border-black bg-cyan-300 px-3.5 py-1.5 text-sm font-extrabold shadow-brutal-sm"
                  >
                    <Download className="size-4" strokeWidth={2.6} /> 엑셀(CSV)
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete("기록을 전부 지울까요? 되돌릴 수 없어요.", onClear)}
                    className="ml-auto flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-extrabold text-rose-500 active:bg-rose-50"
                  >
                    <Trash2 className="size-4" strokeWidth={2.6} /> 전체 삭제
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
