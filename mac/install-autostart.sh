#!/bin/bash
# 맥이 켜지면(로그인하면) 사다리 서버와 외부 접속 터널이 자동으로 돌게 등록한다.
#   설치:  bash mac/install-autostart.sh
#   해제:  bash mac/install-autostart.sh uninstall
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
AGENTS="$HOME/Library/LaunchAgents"
NODE="$(command -v node)"
mkdir -p "$AGENTS" "$DIR/data"

for name in server tunnel; do
  launchctl bootout "gui/$(id -u)/com.manager-ladder.$name" 2>/dev/null || true
  rm -f "$AGENTS/com.manager-ladder.$name.plist"
done
if [ "$1" = "uninstall" ]; then echo "자동 실행을 해제했어요."; exit 0; fi

[ -n "$NODE" ] || { echo "node 를 찾을 수 없어요."; exit 1; }
[ -d "$DIR/node_modules" ] || (cd "$DIR" && npm install)
(cd "$DIR" && npm run build)

plist() { # $1 이름, $2.. 실행할 명령
  local name="$1"; shift
  {
    echo '<?xml version="1.0" encoding="UTF-8"?>'
    echo '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">'
    echo '<plist version="1.0"><dict>'
    echo "<key>Label</key><string>com.manager-ladder.$name</string>"
    echo '<key>ProgramArguments</key><array>'
    for a in "$@"; do echo "<string>$a</string>"; done
    echo '</array>'
    echo "<key>WorkingDirectory</key><string>$DIR</string>"
    echo '<key>RunAtLoad</key><true/><key>KeepAlive</key><true/>'
    echo "<key>StandardOutPath</key><string>$DIR/data/$name.out.log</string>"
    echo "<key>StandardErrorPath</key><string>$DIR/data/$name.out.log</string>"
    echo '</dict></plist>'
  } > "$AGENTS/com.manager-ladder.$name.plist"
  launchctl bootstrap "gui/$(id -u)" "$AGENTS/com.manager-ladder.$name.plist"
}
# caffeinate -i : 서버가 도는 동안 맥이 잠들지 않게
plist server /usr/bin/caffeinate -i "$NODE" "$DIR/server.mjs"
plist tunnel /bin/bash "$DIR/mac/tunnel.sh"

echo ""
echo "등록 완료! 이제 맥을 켜면 자동으로 돌아요."
echo "  기록 파일:     $DIR/data/history.json"
echo "  외부 주소:     https://hoonseochoi.github.io/manager-ladder/ (자동 연결)"
echo "  터널 직접주소: $DIR/data/tunnel-url.txt"
echo "  해제:          bash mac/install-autostart.sh uninstall"
