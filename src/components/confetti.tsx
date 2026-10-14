import { useMemo } from "react";
import { motion } from "framer-motion";

const COLORS = ["#fcd34d", "#67e8f9", "#fda4af", "#6ee7b7", "#c4b5fd", "#bef264", "#111111"];

/** 당첨 때 화면 위쪽에서 터지는 색종이. key 를 바꿔서 다시 터뜨린다 */
export function Confetti({ count = 46 }: { count?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 360,
        y: 260 + Math.random() * 380,
        r: (Math.random() - 0.5) * 720,
        w: 6 + Math.random() * 8,
        round: Math.random() < 0.35,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 0.15,
      })),
    [count],
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+60px)] z-[55] flex justify-center">
      {bits.map((b) => (
        <motion.span
          key={b.id}
          className="absolute border-[1.5px] border-black"
          style={{
            width: b.w,
            height: b.round ? b.w : b.w * 0.55,
            borderRadius: b.round ? 999 : 2,
            background: b.color,
          }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.4 }}
          animate={{ x: b.x, y: b.y, rotate: b.r, opacity: 0, scale: 1 }}
          transition={{ duration: 1.6, delay: b.delay, ease: [0.2, 0.7, 0.4, 1] }}
        />
      ))}
    </div>
  );
}
