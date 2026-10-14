import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { ManagerAvatar } from "@/components/ui/manager-avatar";
import { boardHeight, lanePath, laneColor, laneX, rowY, type Game, type Geometry } from "@/lib/ladder";
import { cn } from "@/lib/utils";

type Props = {
  game: Game;
  /** 위쪽에 서는 매니저들 */
  players: string[];
  avatars: Record<string, string>;
  done: ReadonlySet<number>;
  /** 지금 타고 있는 레인과 진행률(0..1) */
  active: { lane: number; t: number } | null;
  onPick: (lane: number) => void;
};

const MIN_LANE = 64;

export function LadderBoard({ game, players, avatars, done, active, onPick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth - 24));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo: Geometry = useMemo(
    () => ({ laneW: Math.max(MIN_LANE, Math.floor(width / game.n)), rowH: 30, padY: 14 }),
    [width, game.n],
  );
  const W = geo.laneW * game.n;
  const H = boardHeight(geo, game.rows);
  const paths = useMemo(() => Array.from({ length: game.n }, (_, i) => lanePath(game, geo, i)), [game, geo]);

  // 진행 중인 경로: 선을 dash 로 잘라 그리고, 머리 위치에 점을 둔다
  const activeOuter = useRef<SVGPathElement>(null);
  const activeInner = useRef<SVGPathElement>(null);
  const head = useRef<SVGGElement>(null);
  useLayoutEffect(() => {
    const p = activeInner.current;
    if (!active || !p) return;
    const L = p.getTotalLength();
    for (const el of [activeOuter.current, p]) {
      el?.setAttribute("stroke-dasharray", `${L} ${L}`);
      el?.setAttribute("stroke-dashoffset", `${L * (1 - active.t)}`);
    }
    const pt = p.getPointAtLength(L * active.t);
    head.current?.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
  }, [active, paths]);

  // 진행 중인 레인이 화면 밖이면 스크롤
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !active) return;
    const x = laneX(geo, active.lane) - el.clientWidth / 2 + 12;
    el.scrollTo({ left: Math.max(0, x), behavior: "smooth" });
  }, [active?.lane, geo]); // eslint-disable-line react-hooks/exhaustive-deps

  const hitBy = new Map<number, number>();
  for (const i of done) hitBy.set(game.ends[i], i);

  return (
    <div ref={scrollRef} className="no-scrollbar -mx-5 overflow-x-auto px-3 pb-2 pt-1">
      <div className="mx-auto" style={{ width: W }}>
        {/* 위: 매니저 */}
        <div className="flex">
          {players.map((name, i) => {
            const isDone = done.has(i);
            const isActive = active?.lane === i;
            const won = isDone && game.prizes[game.ends[i]];
            return (
              <div key={i} className="flex shrink-0 justify-center px-1" style={{ width: geo.laneW }}>
                <motion.button
                  type="button"
                  onClick={() => onPick(i)}
                  whileTap={{ scale: 0.9 }}
                  animate={isActive ? { y: [0, -5, 0] } : { y: 0 }}
                  transition={isActive ? { repeat: Infinity, duration: 0.6 } : undefined}
                  title={name}
                  className="flex w-full flex-col items-center gap-1"
                >
                  <span className="relative rounded-full p-[3px]" style={{ background: isDone || isActive ? laneColor(i).hex : "transparent" }}>
                    <ManagerAvatar name={name} src={avatars[name]} size={38} />
                    {won && (
                      <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border-2 border-black bg-amber-300">
                        <Trophy className="size-3" strokeWidth={3} />
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "w-full truncate rounded-full border-2 border-black px-1 py-0.5 text-center text-xs font-extrabold shadow-brutal-sm transition-colors",
                      isDone || isActive ? laneColor(i).bg : "bg-white",
                    )}
                  >
                    {name}
                  </span>
                </motion.button>
              </div>
            );
          })}
        </div>

        {/* 사다리 */}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" aria-hidden>
          <g stroke="#000" strokeOpacity={0.14} strokeWidth={4} strokeLinecap="round" fill="none">
            {Array.from({ length: game.n }, (_, i) => (
              <line key={`v${i}`} x1={laneX(geo, i)} y1={3} x2={laneX(geo, i)} y2={H - 3} />
            ))}
            {game.rungs.flatMap((row, r) =>
              row.map((on, i) =>
                on ? <line key={`h${r}-${i}`} x1={laneX(geo, i)} y1={rowY(geo, r)} x2={laneX(geo, i + 1)} y2={rowY(geo, r)} /> : null,
              ),
            )}
          </g>

          {[...done].map((i) => (
            <TracedPath key={i} d={paths[i]} color={laneColor(i).hex} />
          ))}

          {active && (
            <g key={`${game.id}-${active.lane}`}>
              <TracedPath d={paths[active.lane]} color={laneColor(active.lane).hex} outerRef={activeOuter} innerRef={activeInner} />
              <g ref={head}>
                <circle r={10} fill="#000" />
                <circle r={6.5} fill={laneColor(active.lane).hex} />
              </g>
            </g>
          )}
        </svg>

        {/* 아래: 당첨 / 꽝 (도착하기 전엔 ? 로 가려둠) */}
        <div className="flex">
          {game.prizes.map((win, j) => {
            const by = hitBy.get(j);
            const open = by !== undefined;
            return (
              <div key={j} className="flex shrink-0 justify-center px-1" style={{ width: geo.laneW }}>
                <motion.div
                  key={open ? `open-${game.id}` : "closed"}
                  initial={open ? { rotateY: 90, scale: 0.7 } : false}
                  animate={{ rotateY: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 16 }}
                  className={cn(
                    "flex h-14 w-full flex-col items-center justify-center rounded-2xl border-[2.5px] border-black text-xs font-black shadow-brutal-sm",
                    !open && "bg-white text-black/30",
                    open && win && "bg-amber-300",
                    open && !win && "bg-zinc-200 text-black/50",
                  )}
                  style={open ? { boxShadow: `3px 3px 0 0 ${laneColor(by).hex}, 3px 3px 0 2px #000` } : undefined}
                >
                  {!open ? (
                    <span className="font-cute text-2xl leading-none">?</span>
                  ) : win ? (
                    <>
                      <Trophy className="size-5" strokeWidth={2.6} />
                      <span className="mt-0.5">당첨</span>
                    </>
                  ) : (
                    <>
                      <span className="font-cute text-lg leading-none">꽝</span>
                    </>
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TracedPath({
  d,
  color,
  outerRef,
  innerRef,
}: {
  d: string;
  color: string;
  outerRef?: React.Ref<SVGPathElement>;
  innerRef?: React.Ref<SVGPathElement>;
}) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path ref={outerRef} d={d} stroke="#000" strokeWidth={10} />
      <path ref={innerRef} d={d} stroke={color} strokeWidth={5.5} />
    </g>
  );
}
