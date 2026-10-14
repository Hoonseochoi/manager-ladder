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
| `npm start` | 빌드 후 서버 실행 (폰에서도 접속 가능) |
| `npm run dev` | 개발 모드 (코드 고치면 바로 반영) |
| `npm run phone` | 개발 모드 + 폰 접속 허용 |

> 데이터(매물·매니저 명단·사진)는 **브라우저마다** 따로 저장된다. 맥 크롬에서 넣은 건 아이폰 사파리에 안 보임.

## 사용
1. **이번 판** — 매니저 전원이 기본 참여. 빠질 사람만 탭해서 끄기
2. **당첨 인원** −/+ 로 정하기 (최대 참여 인원 − 1)
3. (선택) **몰빵할 설계** 메모 — 결과·복사 문구에 같이 나옴
4. **사다리 만들기** → 매니저를 탭해 한 명씩, 또는 **전체 시작**
   아래 `?` 칸 중 당첨 인원만큼이 🏆 당첨, 나머지는 꽝. 도착해야 열림
5. **결과** 시트에서 당첨자 확인·복사
6. **지난 기록**: 한 판을 끝까지(전원 공개) 타면 자동 저장 — 일시·설계 메모·당첨자·참여자
   누적 당첨 횟수, 전체 복사, 엑셀(CSV) 내려받기, 개별/전체 삭제. 최근 300판까지 이 기기에 저장
7. **매니저 명단**: 빈 동그라미 탭 → 사진 / **편집** → 이름 고치기·빼기·추가
   (기본 명단: 이지호 · 이윤채 · 정희선 · 전은희 · 주기쁨 · 이채아.
   기본 명단에 새로 넣은 사람은 이미 쓰던 기기에도 한 번 자동 추가, 지운 사람은 되살리지 않음)

## 구조
```
src/
  components/ui/card-stack-loader.tsx   # 카드 스택 로더 (사다리 만들 때 표시)
  components/ui/manager-avatar.tsx      # 빈 아바타 / 프로필 사진 업로드
  components/dynamic-island.tsx         # 상단 다이나믹 아일랜드
  components/ladder-board.tsx           # SVG 사다리 + 경로 애니메이션
  components/manager-roster.tsx         # 매니저 명단 (사진·편집)
  components/result-sheet.tsx           # 당첨 결과 바텀시트
  components/confetti.tsx               # 당첨 색종이
  components/history-log.tsx            # 지난 기록 (자동 저장·CSV)
  lib/ladder.ts                         # 사다리 생성·당첨 칸 섞기·경로 계산
```

## 앱으로 설치
- iPhone: Safari → 공유 → **홈 화면에 추가**
- Android: Chrome → 메뉴 → **앱 설치**
