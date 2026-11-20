# koinobia-admin 작업 규칙 (Claude·ChatGPT 공통)

## 프로젝트
- 코이노비아 앱(코이데·디다코·텔리오) 운영자용 정적 페이지. 공개 저장소, 주소 `admin.koinobia.com`.
- 서버는 pray-for 저장소의 Supabase(`supabase/`의 SQL 함수)다. 허브(`apps-script/hub/`)는 쓰지 않는다(끄는 중). 서버 함수가 바뀌어야 하면 pray-for에서 따로 PR을 만든다.
- 계획은 `docs/plan.md`(2026-11-19 이전 허브 기준은 지난 일), 약속과 결정은 `docs/design.md`, 사용자가 할 일은 `docs/setup.md`.

## 사용자
- 비개발자 출신 교육 분야 기획자다. 개발 이야기는 천천히, 차근차근, 쉬운 말로 한다.

## 일 나누기 (2026-11-19부터)
- Claude가 계획·실행·검토를 나눠 한다(모델과 순서는 CLAUDE.md). 검토하는 쪽은 파일을 직접 고치지 않는다.
- ChatGPT(Codex)가 맡는 일은 `codex/` 브랜치를 쓴다.
- 합치기는 사용자에게 확인한 뒤 한다.

## 브랜치와 PR
- 작업 단위마다 main에서 새 브랜치를 따서 따로 PR을 만든다. 서로 다른 일을 한 PR에 섞지 않는다.
- main에 직접 올리지 않는다. 브랜치 앞머리: Claude `claude/`, ChatGPT(Codex) `codex/`.
- 시작 전에 열린 PR을 본다. 같은 파일을 고치는 PR이 있으면 시작하지 말고 사용자에게 묻는다.
- 한 기능은 한 AI만 맡는다. 다른 AI의 브랜치에는 커밋하지 않는다(사용자가 시키면 예외). 합치기 전에 main을 내 브랜치에 합쳐 충돌을 먼저 푼다.
- main에 합치기는 사용자에게 확인한 뒤 한다.

## 코드 규칙
- **서버 부르기는 `js/api.js` 한 파일에만 둔다.** 화면 코드는 `api.today()`, `api.churchList()`처럼 뜻으로만 부르고 서버 함수 이름·요청 모양을 모른다(함수 이름 목록은 `docs/design.md` 4장 표).
- 서버가 준 글은 모두 `textContent`로만 넣는다. `innerHTML`·`insertAdjacentHTML`·`eval`·`style` 속성을 쓰지 않는다.
- `config.js`에는 `SUPABASE_URL`과 publishable 키까지만 둔다. `secret`·`service_role` 키는 어디에도 두지 않는다.
- 로그인은 `supabase-js`가 한다. 로그인에서 돌아온 `?code`가 주소에 남지 않게 한다.
- **기록 내용(이름·기도제목·기록 글)을 부르는 함수는 만들지 않는다.** 예외는 운영자가 읽으라고 받은 글 셋뿐이다: 의견함 글, 교회 신청서(연락처·대표 목사님 이름), 공동체 신고 상세.
- 외부 CDN 스크립트는 쓰지 않는다. `js/vendor/`에는 `supabase.js` 하나만 둔다.

## 화면 글과 숫자
- 화면 글과 주석은 한국어. 이모지는 넣지 않는다.
- **교회끼리 순위·비교는 넣지 않는다.** 교회 목록은 만든 순서이고 "많은 순" 정렬이 없다.
- 숫자와 그래프는 이용 통계 메뉴에서만, 앱 전체 합계로만 보여 준다(교회·사람 단위로 나누지 않는다). 앱 화면은 숫자로 재지 않는다는 원칙은 앱 쪽 원칙이고, 운영자 사이트는 `docs/usage-stats.md`(pray-for) 1장대로 그래프를 허용한다.
- 이용 통계는 `docs/usage-stats.md`의 선 4가지를 지킨다: 이름·내용을 모으지 않는다, 개인 단위로 보여 주지 않는다, 13개월만 본다, 처리방침을 먼저 한다. 2026-11-20부터 이용 통계는 가리지 않는다(서버 038). 옛 서버가 `small`을 주면 0이 아니라 '5명 미만'으로 그린다.

## 디자인
- 화면 색은 코이데 기본(초록) 테마의 밝은 값이다. `css/admin.css` `:root`에 고정했고, 기기가 어두운 모드여도 늘 밝다(어두운 모드 분기를 두지 않는다). 코이데 색이 바뀌면 이 복사본도 손으로 맞춘다.
- 화면 색은 코이데 변수만 쓴다(새 색을 만들지 않는다). 새 버튼·카드는 `css/admin.css`의 비슷한 것을 본뜬다. 그래프는 `css/admin.css`의 그래프 전용 팔레트(`--chart-*`, `--seq-*`)만 쓰고, 그래프 종류는 데이터에 맞게 고른다(시간 흐름은 꺾은선, 구성은 누적 막대·도넛, 분포는 상자 그림 등). 여러 계열은 범례와 숫자 라벨로도 구분한다.
- 맡은 일이 아니면 색, 글씨, 여백, 배치, 화면에 쓰는 이름을 바꾸지 않는다. 화면을 바꾼 PR에는 어떻게 보이게 바뀌는지 설명에 적는다.

## 확인은 일의 크기에 맞게
- 문서만: 화면 확인 없음. 글자·작은 것: 휴대폰 폭 한 장.
- 새 화면·로그인·데이터: `?demo`의 여러 모드(`?demo`, `?demo=out`, `?demo=notadmin`, `?demo=small`, `?demo=empty`, `?demo=error`)로 휴대폰·PC를 보고, 기기 설정을 어둡게 해도 밝은지 한 장 본다. 그래프는 `?demo=small`·`?demo=empty`도 본다.
- SQL은 pray-for의 규칙대로 시험 DB에서 확인한다.

## 데이터와 비밀값
- 실제 교회 이름·사람 이름·기도제목은 올리지 않는다. 데모는 지어낸 이름만.
- `service_role` 키, `sb_secret` 키, Supabase 콘솔의 비밀값, 시트 주소, 옛 허브 비밀(`HUB_SECRET`)과 웹 앱 주소는 커밋하지 않는다. 커밋 전에 아래 검사를 돌려 결과가 비어 있어야 한다(`js/vendor/supabase.js`는 제외).
  `grep -rniE "service_role|sb_secret|HUB_SECRET|spreadsheets|script.google.com/macros/s/" . --exclude-dir=.git --exclude-dir=vendor`
- 예외: `config.js`의 `SUPABASE_URL`과 publishable 키는 공개 값이라 커밋한다. 데이터는 RLS와 관리자 함수가 지킨다.

## 문서
- 새로 정한 것은 `docs/design.md` 결정 기록에 날짜와 이유를 남긴다. 설계의 기준은 `docs/design.md` 하나다.
- `CNAME` 파일은 지우지 않는다.
