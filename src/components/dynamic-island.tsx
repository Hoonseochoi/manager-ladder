import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ManagerAvatar } from "@/components/ui/manager-avatar";

export type IslandState =
  | { mode: "idle"; text: string }
  | { mode: "live"; text: string; color: string }
  | { mode: "expanded"; label: string; from: string; to: string; color: string; avatar?: string };

const SIZE = {
  idle: { width: 150, height: 38, borderRadius: 19 },
  live: { width: 290, height: 44, borderRadius: 22 },
  expanded: { width: 372, height: 112, borderRadius: 44 },
} as const;

const spring = { type: "spring", stiffness: 420, damping: 30, mass: 0.9 } as const;

/** iPhone 다이나믹 아일랜드처럼 상태에 따라 늘었다 줄었다 하는 상단 알약 */
export function DynamicIsland({ state, onClick }: { state: IslandState; onClick?: () => void }) {
  const size = SIZE[state.mode];

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center pt-safe">
      <motion.button
        type="button"
        onClick={onClick}
        aria-live="polite"
        className="pointer-events-auto relative mt-2.5 max-w-[calc(100vw-20px)] overflow-hidden bg-black text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
        initial={false}
        animate={size}
        transition={spring}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={state.mode}
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.85, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: { ...spring, delay: 0.08 } }}
            exit={{ opacity: 0, scale: 0.9, filter: "blur(6px)", transition: { duration: 0.15 } }}
          >
            {state.mode === "idle" && (
              <span className="flex items-center gap-2 text-[13px] font-bold tracking-tight">
                <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                {state.text}
              </span>
            )}

            {state.mode === "live" && (
              <span className="flex min-w-0 items-center gap-2.5 px-5 text-sm font-bold">
                <span
                  className="size-4 shrink-0 animate-spin rounded-full border-[2.5px] border-white/20"
                  style={{ borderTopColor: state.color }}
                />
                <span className="truncate">{state.text}</span>
              </span>
            )}

            {state.mode === "expanded" && (
              <span className="flex w-full min-w-0 items-center gap-3.5 px-6">
                <span className="rounded-full p-[3px]" style={{ background: state.color }}>
                  <ManagerAvatar name={state.to} src={state.avatar} size={54} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-black text-black"
                    style={{ background: state.color }}
                  >
                    {state.label}
                  </span>
                  <span className="flex w-full min-w-0 items-center gap-2 font-cute text-[22px] leading-none">
                    <span className="truncate">{state.from}</span>
                    <ArrowRight className="size-5 shrink-0 text-white/40" strokeWidth={3} />
                    <span className="truncate" style={{ color: state.color }}>
                      {state.to}
                    </span>
                  </span>
                </span>
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
