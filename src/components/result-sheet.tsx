import { AnimatePresence, motion } from "framer-motion";
import { Copy, X } from "lucide-react";
import { ManagerAvatar } from "@/components/ui/manager-avatar";
import { laneColor } from "@/lib/ladder";

export type ResultRow = { lane: number; designer: string; orig: string; to: string | null };

type Props = {
  open: boolean;
  rows: ResultRow[];
  avatars: Record<string, string>;
  onClose: () => void;
  onCopy: () => void;
};

/** 아래에서 올라오는 결과 시트 — 끌어내려서 닫기 */
export function ResultSheet({ open, rows, avatars, onClose, onCopy }: Props) {
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
            aria-label="배정 결과"
            className="fixed inset-x-0 bottom-0 z-70 mx-auto flex max-h-[84vh] max-w-xl flex-col rounded-t-[34px] border-[3px] border-b-0 border-black bg-cream px-5 pt-2.5 pb-safe"
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
                배정 결과 <span className="inline-block animate-bob">🎉</span>
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

            <ol className="mt-4 flex flex-col gap-2.5 overflow-y-auto pb-5" onPointerDownCapture={(e) => e.stopPropagation()}>
              {rows.map((r, idx) => (
                <motion.li
                  key={r.lane}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx, type: "spring", stiffness: 400, damping: 28 }}
                  className="flex items-center gap-3 rounded-[22px] border-[2.5px] border-black bg-white p-2.5 pr-3.5 shadow-brutal-sm"
                >
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full border-2 border-black font-cute ${laneColor(r.lane).bg}`}>
                    {r.lane + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-extrabold tracking-tight">{r.designer}</span>
                    {r.orig && <span className="block truncate text-xs font-semibold text-black/45">기존 {r.orig}</span>}
                  </span>
                  {r.to ? (
                    <span className="flex shrink-0 items-center gap-2">
                      <ManagerAvatar name={r.to} src={avatars[r.to]} size={34} />
                      <span className="max-w-24 truncate font-cute text-lg">{r.to}</span>
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full border-2 border-dashed border-black/30 px-2.5 py-1 text-xs font-bold text-black/40">
                      대기
                    </span>
                  )}
                </motion.li>
              ))}
            </ol>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
