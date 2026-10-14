import { AnimatePresence, motion } from "framer-motion";
import { Copy, Trophy, X } from "lucide-react";
import { ManagerAvatar } from "@/components/ui/manager-avatar";
import { cn } from "@/lib/utils";

/** win: true 당첨, false 꽝, null 아직 안 탐 */
export type ResultRow = { name: string; win: boolean | null };

type Props = {
  open: boolean;
  rows: ResultRow[];
  memo: string;
  avatars: Record<string, string>;
  onClose: () => void;
  onCopy: () => void;
};

/** 아래에서 올라오는 결과 시트 — 당첨자 먼저, 끌어내려서 닫기 */
export function ResultSheet({ open, rows, memo, avatars, onClose, onCopy }: Props) {
  const winners = rows.filter((r) => r.win === true);
  const others = rows.filter((r) => r.win !== true);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-60 bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            role="dialog"
            aria-label="당첨 결과"
            className="fixed inset-x-0 bottom-0 z-70 mx-auto flex max-h-[86vh] max-w-xl flex-col rounded-t-[34px] border-[3px] border-b-0 border-black bg-cream px-5 pt-2.5 pb-safe"
            initial={{ y: "105%" }}
            animate={{ y: 0 }}
            exit={{ y: "105%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
          >
            <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-black/25" />
            <div className="flex items-center justify-between">
              <h2 className="font-cute text-[26px] leading-none">
                몰빵 결과 <span className="inline-block animate-bob">🎉</span>
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onCopy}
                  className="press flex items-center gap-1.5 rounded-full border-[2.5px] border-black bg-amber-300 px-3.5 py-1.5 text-sm font-extrabold shadow-brutal-sm"
                >
                  <Copy className="size-4" strokeWidth={2.6} /> 복사
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="닫기"
                  className="press grid size-9 place-items-center rounded-full border-[2.5px] border-black bg-white shadow-brutal-sm"
                >
                  <X className="size-4" strokeWidth={3} />
                </button>
              </div>
            </div>
            {memo && <p className="mt-2 px-1 text-sm font-bold text-black/55">📦 {memo}</p>}

            <div className="mt-4 flex flex-col gap-3 overflow-y-auto pb-5" onPointerDownCapture={(e) => e.stopPropagation()}>
              {/* 당첨자 */}
              <div className="rounded-[26px] border-[3px] border-black bg-amber-300 p-4 shadow-brutal">
                <div className="flex items-center gap-1.5 font-cute text-lg">
                  <Trophy className="size-5" strokeWidth={2.6} /> 당첨 {winners.length}명
                </div>
                {winners.length ? (
                  <ul className="mt-3 flex flex-wrap gap-3">
                    {winners.map((r, idx) => (
                      <motion.li
                        key={r.name}
                        initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ delay: 0.08 * idx, type: "spring", stiffness: 420, damping: 14 }}
                        className="flex items-center gap-2 rounded-full border-[2.5px] border-black bg-white py-1 pl-1 pr-4"
                      >
                        <ManagerAvatar name={r.name} src={avatars[r.name]} size={40} />
                        <span className="font-cute text-xl">{r.name}</span>
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm font-bold text-black/50">아직 당첨자가 안 나왔어요</p>
                )}
              </div>

              {/* 나머지 */}
              <ul className="flex flex-col gap-2">
                {others.map((r) => (
                  <li
                    key={r.name}
                    className="flex items-center gap-3 rounded-[22px] border-[2.5px] border-black bg-white p-2 pr-4 shadow-brutal-sm"
                  >
                    <ManagerAvatar name={r.name} src={avatars[r.name]} size={34} />
                    <span className="flex-1 truncate text-[16px] font-extrabold">{r.name}</span>
                    <span
                      className={cn(
                        "rounded-full border-2 px-3 py-0.5 text-sm font-black",
                        r.win === false ? "border-black bg-zinc-200 text-black/60" : "border-dashed border-black/30 text-black/40",
                      )}
                    >
                      {r.win === false ? "꽝" : "대기"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
