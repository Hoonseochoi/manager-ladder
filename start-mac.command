#!/bin/bash
# 맥에서 더블클릭하면 매니저 사다리 서버가 켜진다 (끄려면 이 창을 닫거나 Ctrl+C)
cd "$(dirname "$0")" || exit 1
if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js 가 없어요. https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행해 주세요."
  read -r -p "엔터를 누르면 닫혀요" _
  exit 1
fi
[ -d node_modules ] || npm install
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
echo ""
echo "  맥에서:      http://localhost:4173"
[ -n "$IP" ] && echo "  같은 와이파이 폰에서: http://$IP:4173"
echo ""
(sleep 4 && open "http://localhost:4173") &
npm start
