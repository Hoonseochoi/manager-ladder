# 설계 몰빵 사다리 (PWA)

**앱 주소: https://hoonseochoi.github.io/manager-ladder/**
아이폰 Safari 로 열고 공유 → **홈 화면에 추가** 하면 앱처럼 쓸 수 있다 (오프라인 OK).

`main` 에 푸시하면 GitHub Actions 가 빌드해서 `gh-pages` 브랜치로 자동 배포한다.

설계매물을 `설계사이름_매니저명` 형식으로 입력하면 사다리를 타서 매니저를 배정하는 게임.
Vite + React + TypeScript + Tailwind CSS v4, shadcn 구조(`src/components/ui`, `@/` 별칭, `components.json`).

## 맥에서 로컬 서버로 쓰기
처음 한 번: [Node.js LTS](https://nodejs.org) 설치 → 저장소 받기
```bash
git clone https://github.com/Hoonseochoi/manager-ladder.git
```
그다음부터는 Finder 에서 `manager-ladder/start-mac.command` **더블클릭** (또는 터미널에서 `npm start`).
- 맥: http://localhost:4173 (자동으로 열림)
- 같은 와이파이의 아이폰: 터미널에 찍히는 `http://192.168.x.x:4173`
- 처음 실행 때 "확인되지 않은 개발자" 경고가 뜨면: 우클릭 → 열기

| 명령 | 용도 |
|---|---|
| `npm start` | 빌드 후 서버 실행 (폰에서도 접속 가능, 기록 공유) |
| `npm run server` | 빌드된 앱 + 기록 서버만 실행 |
| `npm run dev` | 개발 모드 (코드 고치면 바로 반영) |
| `npm run phone` | 개발 모드 + 폰 접속 허용 |

### 기록을 맥에 모아서 다 같이 보기
`npm start`(또는 `start-mac.command`)로 켜면 `server.mjs` 가 앱을 띄우고, **돌린 기록을 이 맥의 `data/history.json`** 에 저장한다.
이 맥 주소(`http://192.168.x.x:4173`)로 들어온 사람은 모두 같은 기록을 보고, 처음 들어올 때 입력한 이름이 "누가 돌렸는지"로 같이 남는다.
- 지난 기록에 `맥에 저장 · 다 같이 봐요` 가 보이면 서버에 붙은 것. GitHub Pages 주소로 열면 `이 기기에만 저장`
- 서버에 처음 붙을 때 그 기기에만 있던 기록은 자동으로 서버에 올라감
- 저장 폴더 바꾸기: `LADDER_DATA_DIR=~/Documents/사다리기록 npm start`
- 전체 삭제 시 `data/history-backup-*.json` 으로 백업이 남음
- **기록 삭제는 비밀번호 필요** — 맥의 `data/delete-password.txt` 에 적힌 값(저장소엔 안 올라감). 파일이 없으면 삭제가 막힘. 바꾸려면 이 파일만 고치면 됨
- 개발 중엔 `npm run server`(기록 서버) + `npm run dev` 를 같이 켜면 `/api` 가 서버로 연결됨

### 와이파이 밖에서도 접속 (맥 자동 실행)
```bash
bash mac/install-autostart.sh
```
- 맥에 로그인하면 서버(`server.mjs`)와 Cloudflare 임시 터널(`mac/tunnel.sh`)이 자동으로 뜨고, 꺼지면 다시 켜짐. 서버가 도는 동안 맥이 잠들지 않음
- 터널 주소는 켤 때마다 바뀌는데, `mac/tunnel.sh` 가 새 주소를 `public/server.json` 으로 GitHub 에 자동 푸시 → **모두 https://hoonseochoi.github.io/manager-ladder/ 로 들어오면 됨**
- 현재 터널 주소: `data/tunnel-url.txt`, 로그: `data/*.log`
- 해제: `bash mac/install-autostart.sh uninstall`

## 사용
1. **이번 판** — 매니저 전원이 기본 참여. 빠질 사람만 탭해서 끄기
2. **당첨 인원** −/+ 로 정하기 (최대 참여 인원 − 1)
3. (선택) **몰빵할 설계** 메모 — 결과·복사 문구에 같이 나옴
4. **사다리 만들기** → 매니저를 탭해 한 명씩, 또는 **전체 시작**
   아래 `?` 칸 중 당첨 인원만큼이 🏆 당첨, 나머지는 꽝. 도착해야 열림
5. **결과** 시트에서 당첨자 확인·복사
6. **지난 기록**: 한 판을 끝까지(전원 공개) 타면 자동 저장 — 일시·돌린 사람·설계 메모·당첨자·참여자
   돌린 사람별로 거르기 가능
   누적 당첨 횟수, 전체 복사, 엑셀(CSV) 내려받기, 개별/전체 삭제. 최근 300판까지 이 기기에 저장
7. **매니저 명단·사진은 코드에서 직접 관리** (사이트에서는 못 바꿈 → 모두에게 똑같이 보임)
   - 명단: `src/lib/managers.ts` 의 `MANAGERS` 수정
   - 사진: `src/assets/managers/이름.jpg` 로 넣기 (png·webp 도 됨, 없으면 빈 동그라미)
   - 고친 뒤 `main` 에 푸시 → GitHub Pages 자동 반영. 맥 서버는 `npm run build` 후 재시작

## 구조
```
server.mjs                              # 앱 + 기록 API (data/history.json)
src/
  components/ui/card-stack-loader.tsx   # 카드 스택 로더 (사다리 만들 때 표시)
  components/ui/manager-avatar.tsx      # 프로필 사진 / 빈 아바타
  components/dynamic-island.tsx         # 상단 다이나믹 아일랜드
  components/ladder-board.tsx           # SVG 사다리 + 경로 애니메이션
  components/result-sheet.tsx           # 당첨 결과 바텀시트
  components/confetti.tsx               # 당첨 색종이
  components/history-log.tsx            # 지난 기록 (자동 저장·CSV)
  components/name-prompt.tsx            # 첫 접속 때 이름 입력
  hooks/use-shared-history.ts           # 기록: 맥 서버 공유 / 기기 저장
  lib/managers.ts                       # 매니저 명단 + 사진 자동 연결
  lib/ladder.ts                         # 사다리 생성·당첨 칸 섞기·경로 계산
```

## 앱으로 설치
- iPhone: Safari → 공유 → **홈 화면에 추가**
- Android: Chrome → 메뉴 → **앱 설치**
