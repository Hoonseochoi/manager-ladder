export type Entry = { designer: string; manager: string };

/** 사다리 한 줄의 이동: row 높이에서 dir 방향(+1 오른쪽, -1 왼쪽)으로 건넘 */
export type Move = { row: number; dir: 1 | -1 };

export type Game = {
  id: number;
  n: number;
  rows: number;
  rungs: boolean[][];
  bottoms: string[];
  moves: Move[][];
  ends: number[];
};

export const LANE_COLORS = [
  { bg: "bg-amber-300", hex: "#fcd34d" },
  { bg: "bg-cyan-300", hex: "#67e8f9" },
  { bg: "bg-rose-300", hex: "#fda4af" },
  { bg: "bg-emerald-300", hex: "#6ee7b7" },
  { bg: "bg-violet-300", hex: "#c4b5fd" },
  { bg: "bg-lime-300", hex: "#bef264" },
  { bg: "bg-orange-300", hex: "#fdba74" },
  { bg: "bg-pink-300", hex: "#f9a8d4" },
  { bg: "bg-sky-300", hex: "#7dd3fc" },
  { bg: "bg-teal-300", hex: "#5eead4" },
] as const;

export const laneColor = (i: number) => LANE_COLORS[i % LANE_COLORS.length];

/** "설계사이름_매니저명" 여러 건 → Entry[]. 줄바꿈·쉼표·세미콜론으로 구분 */
export function parseEntries(raw: string): Entry[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf("_");
      if (i === -1) return { designer: s, manager: "" };
      return { designer: s.slice(0, i).trim(), manager: s.slice(i + 1).trim() };
    })
    .filter((e) => e.designer);
}

export function shuffle<T>(a: readonly T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function makeRungs(n: number, rows: number): boolean[][] {
  const rungs = Array.from({ length: rows }, () => new Array<boolean>(Math.max(n - 1, 0)).fill(false));
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < n - 1; i++) {
      if (i > 0 && rungs[r][i - 1]) continue; // 같은 높이에서 가로줄이 이어 붙지 않게
      if (Math.random() < 0.42) rungs[r][i] = true;
    }
  }
  // 인접한 세로줄 사이마다 가로줄 최소 2개
  for (let i = 0; i < n - 1; i++) {
    let have = rungs.reduce((s, row) => s + (row[i] ? 1 : 0), 0);
    for (let guard = 0; have < 2 && guard < 60; guard++) {
      const r = Math.floor(Math.random() * rows);
      if (rungs[r][i] || rungs[r][i - 1] || rungs[r][i + 1]) continue;
      rungs[r][i] = true;
      have++;
    }
  }
  return rungs;
}

function trace(rungs: boolean[][], start: number) {
  let lane = start;
  const moves: Move[] = [];
  rungs.forEach((row, r) => {
    if (row[lane]) { moves.push({ row: r, dir: 1 }); lane++; }
    else if (lane > 0 && row[lane - 1]) { moves.push({ row: r, dir: -1 }); lane--; }
  });
  return { moves, end: lane };
}

let gameSeq = 0;

export function createGame(entries: Entry[]): Game {
  const n = entries.length;
  const rows = Math.min(Math.max(n * 2 + 2, 9), 18);
  const rungs = makeRungs(n, rows);
  const traced = entries.map((_, i) => trace(rungs, i));
  return {
    id: ++gameSeq,
    n,
    rows,
    rungs,
    bottoms: shuffle(entries.map((e) => e.manager || "—")),
    moves: traced.map((t) => t.moves),
    ends: traced.map((t) => t.end),
  };
}

export type Geometry = { laneW: number; rowH: number; padY: number };

export const laneX = (g: Geometry, i: number) => g.laneW * i + g.laneW / 2;
export const rowY = (g: Geometry, r: number) => g.padY + g.rowH * (r + 0.5);
export const boardHeight = (g: Geometry, rows: number) => g.padY * 2 + g.rowH * rows;

/** 한 레인의 경로를 꺾이는 곳이 둥근 SVG path 로 */
export function lanePath(game: Game, geo: Geometry, start: number, radius = 10): string {
  const pts: [number, number][] = [[laneX(geo, start), 0]];
  let lane = start;
  for (const m of game.moves[start]) {
    const y = rowY(geo, m.row);
    pts.push([laneX(geo, lane), y]);
    lane += m.dir;
    pts.push([laneX(geo, lane), y]);
  }
  pts.push([laneX(geo, lane), boardHeight(geo, game.rows)]);

  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let k = 1; k < pts.length - 1; k++) {
    const [px, py] = pts[k - 1];
    const [cx, cy] = pts[k];
    const [nx, ny] = pts[k + 1];
    const inLen = Math.hypot(cx - px, cy - py);
    const outLen = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(radius, inLen / 2, outLen / 2);
    const ax = cx - ((cx - px) / inLen) * r;
    const ay = cy - ((cy - py) / inLen) * r;
    const bx = cx + ((nx - cx) / outLen) * r;
    const by = cy + ((ny - cy) / outLen) * r;
    d += ` L${ax},${ay} Q${cx},${cy} ${bx},${by}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last[0]},${last[1]}`;
}
