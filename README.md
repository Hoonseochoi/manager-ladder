# 매니저 사다리 (PWA)

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
1. 매니저 알약을 고르고 설계사 이름만 입력 후 ＋ — 또는 `김설계_이지호` 형식 / 여러 줄 붙여넣기
2. 입력된 매물 칩을 탭하면 설계사 이름·매니저 수정, 삭제
3. **매니저 명단**: 빈 동그라미 탭 → 사진 넣기 / **편집** → 이름 고치기·빼기·추가
   (기본 명단: 이지호 · 이윤채 · 정희선 · 전은희 · 주기쁨)
4. **사다리 만들기** → 카드 스택 로더 → 설계사 탭(한 줄) 또는 **전체 시작**
5. **결과** 시트에서 확인·복사 (다이나믹 아일랜드 탭해도 열림)

## 구조
```
src/
  components/ui/card-stack-loader.tsx   # 카드 스택 로더 (사다리 만들 때 표시)
  components/ui/manager-avatar.tsx      # 빈 아바타 / 프로필 사진 업로드
  components/dynamic-island.tsx         # 상단 다이나믹 아일랜드
  components/ladder-board.tsx           # SVG 사다리 + 경로 애니메이션
  components/result-sheet.tsx           # 결과 바텀시트
  lib/ladder.ts                         # 파싱·사다리 생성·경로 계산
```

## 앱으로 설치
- iPhone: Safari → 공유 → **홈 화면에 추가**
- Android: Chrome → 메뉴 → **앱 설치**
