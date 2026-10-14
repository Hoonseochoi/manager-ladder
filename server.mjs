// 매니저 사다리 서버 — 앱(dist/)을 띄우고, 돌린 기록을 이 맥의 폴더(data/)에 JSON 으로 저장한다.
// 같은 주소로 들어온 사람은 모두 같은 기록을 본다. 외부 패키지 없이 Node 내장 모듈만 쓴다.
//   node server.mjs            → http://localhost:4173
//   PORT=8080 LADDER_DATA_DIR=~/Documents/사다리기록 node server.mjs
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, "dist");
const DATA_DIR = path.resolve((process.env.LADDER_DATA_DIR || path.join(ROOT, "data")).replace(/^~(?=$|\/)/, os.homedir()));
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const PORT = Number(process.env.PORT) || 4173;
const HISTORY_MAX = 5000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

/* ───────── 기록 저장소 ───────── */
let history = [];
async function load() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    history = JSON.parse(await fs.readFile(HISTORY_FILE, "utf8"));
    if (!Array.isArray(history)) history = [];
  } catch {
    history = [];
  }
}
// 쓰기는 한 줄로 세워서 순서대로 — 임시 파일에 쓰고 rename 해서 중간에 꺼져도 파일이 깨지지 않게
let writing = Promise.resolve();
function save() {
  const snapshot = JSON.stringify(history, null, 2);
  writing = writing.then(async () => {
    const tmp = `${HISTORY_FILE}.tmp`;
    await fs.writeFile(tmp, snapshot);
    await fs.rename(tmp, HISTORY_FILE);
  });
  return writing;
}

const str = (v, max = 200) => (typeof v === "string" ? v.slice(0, max) : "");
const names = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").map((x) => x.slice(0, 40)).slice(0, 100) : []);
function clean(e) {
  if (!e || typeof e !== "object") return null;
  const id = str(e.id, 80);
  const at = str(e.at, 40);
  if (!id || Number.isNaN(Date.parse(at))) return null;
  return { id, at, by: str(e.by, 40), memo: str(e.memo), players: names(e.players), winners: names(e.winners) };
}

/* ───────── HTTP ───────── */
const send = (res, status, body, type = "application/json; charset=utf-8") => {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
};

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > 2_000_000) throw new Error("too large");
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "null");
}

async function api(req, res, pathname) {
  if (pathname === "/api/history" && req.method === "GET") return send(res, 200, history);

  // 한 건 또는 여러 건(이 기기에만 있던 기록 올리기) 추가. 같은 id 는 무시
  if (pathname === "/api/history" && req.method === "POST") {
    const body = await readBody(req);
    const incoming = (Array.isArray(body) ? body : [body]).map(clean).filter(Boolean);
    const have = new Set(history.map((h) => h.id));
    const fresh = incoming.filter((e) => !have.has(e.id));
    if (fresh.length) {
      history = [...fresh, ...history].sort((a, b) => b.at.localeCompare(a.at)).slice(0, HISTORY_MAX);
      await save();
      for (const e of fresh) console.log(`[기록] ${e.at} ${e.by || "?"} → 🏆 ${e.winners.join(", ")}`);
    }
    return send(res, 200, history);
  }

  const one = pathname.match(/^\/api\/history\/([^/]+)$/);
  if (one && req.method === "DELETE") {
    const id = decodeURIComponent(one[1]);
    history = history.filter((h) => h.id !== id);
    await save();
    return send(res, 200, history);
  }
  if (pathname === "/api/history" && req.method === "DELETE") {
    // 전체 삭제 전에 백업 한 부 남겨둔다
    if (history.length) await fs.writeFile(path.join(DATA_DIR, `history-backup-${Date.now()}.json`), JSON.stringify(history, null, 2));
    history = [];
    await save();
    return send(res, 200, history);
  }
  return send(res, 404, { error: "not found" });
}

async function serveStatic(res, pathname) {
  const rel = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = path.join(DIST, rel);
  if (!file.startsWith(DIST)) return send(res, 403, "forbidden", "text/plain");
  try {
    if ((await fs.stat(file)).isDirectory()) file = path.join(file, "index.html");
  } catch {
    file = path.join(DIST, "index.html");
  }
  try {
    const data = await fs.readFile(file);
    const ext = path.extname(file);
    // 해시 붙은 빌드 파일은 오래 캐시, 나머지(index.html, sw.js)는 매번 확인
    const cache = rel.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache";
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": cache });
    res.end(data);
  } catch {
    send(res, 404, "dist/ 가 없어요. npm run build 먼저 해 주세요.", "text/plain; charset=utf-8");
  }
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://x");
  try {
    if (pathname.startsWith("/api/")) return await api(req, res, pathname);
    return await serveStatic(res, pathname);
  } catch (err) {
    console.error(err);
    send(res, 400, { error: String(err.message || err) });
  }
});

await load();
server.listen(PORT, "0.0.0.0", () => {
  const lan = Object.values(os.networkInterfaces())
    .flat()
    .find((i) => i && i.family === "IPv4" && !i.internal)?.address;
  console.log(`\n  매니저 사다리 서버 켜짐 (기록 ${history.length}판)`);
  console.log(`  맥에서:               http://localhost:${PORT}`);
  if (lan) console.log(`  같은 와이파이 폰에서: http://${lan}:${PORT}`);
  console.log(`  기록 저장 위치:       ${HISTORY_FILE}\n`);
});
