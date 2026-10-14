#!/bin/bash
# 외부 접속용 Cloudflare 임시 터널을 열고, 바뀐 주소를 GitHub 의 public/server.json 에 올린다.
# → GitHub Pages 앱(hoonseochoi.github.io/manager-ladder)이 그 주소를 읽어서 이 맥에 기록을 저장한다.
# launchd 가 계속 살려두므로 직접 실행할 일은 거의 없다.
cd "$(dirname "$0")/.." || exit 1
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
PORT="${PORT:-4173}"
LOG="data/tunnel.log"
mkdir -p data

# 작업 중인 파일은 건드리지 않고 origin/main 위에 server.json 만 바꾼 커밋을 만들어 올린다
publish() {
  local url="$1" blob tree commit idx
  git fetch -q origin main || return 1
  if [ "$(git show origin/main:public/server.json 2>/dev/null)" = "{\"url\":\"$url\"}" ]; then return 0; fi
  blob=$(printf '{"url":"%s"}' "$url" | git hash-object -w --stdin)
  idx=$(mktemp)
  GIT_INDEX_FILE="$idx" git read-tree origin/main
  GIT_INDEX_FILE="$idx" git update-index --add --cacheinfo "100644,$blob,public/server.json"
  tree=$(GIT_INDEX_FILE="$idx" git write-tree)
  rm -f "$idx"
  commit=$(git commit-tree "$tree" -p origin/main -m "외부 접속 주소 갱신: $url")
  git push -q origin "$commit:refs/heads/main"
}

while true; do
  : > "$LOG"
  cloudflared tunnel --no-autoupdate --url "http://localhost:$PORT" >> "$LOG" 2>&1 &
  CF=$!
  URL=""
  for _ in $(seq 60); do
    URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | head -1)
    [ -n "$URL" ] && break
    sleep 1
  done
  if [ -n "$URL" ]; then
    echo "$(date '+%F %T') 외부 주소: $URL"
    echo "$URL" > data/tunnel-url.txt
    for _ in 1 2 3 4 5; do publish "$URL" && break; sleep 10; done
  fi
  wait "$CF"
  echo "$(date '+%F %T') 터널이 끊겨서 다시 연결합니다"
  sleep 5
done
