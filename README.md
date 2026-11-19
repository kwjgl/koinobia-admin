# koinobia-admin (코이노비아 앱 관리)

코이데·디다코·(나중에) 텔리오의 이용 통계와 운영 도구를 모은 운영자(앱 관리자)용 페이지다. 메뉴는 오늘, 교회 신청, 교회, 이용 통계, 의견함, 공동체, 저장 공간 일곱 개다. 주소는 `https://admin.koinobia.com/`(GitHub Pages).

- 빌드 없는 정적 페이지다(`index.html`, `config.js`, `css/`, `js/`; 외부 코드는 `js/vendor/supabase.js` 하나, 코이데와 같은 파일).
- 서버는 pray-for 저장소의 Supabase(`supabase/`)다. 서버를 부르는 코드는 `js/api.js` 한 파일에만 있다. 옛 허브는 끄는 중이다.
- 화면 색은 코이데 먹색 테마이고 늘 밝다.
- 이 저장소는 공개다. 비밀값(`service_role`·secret 키, Supabase 콘솔 비밀, 시트 주소)은 두지 않는다.
- `?demo`(그 밖에 `?demo=out`, `?demo=notadmin`, `?demo=small`, `?demo=empty`, `?demo=error`)로 열면 가짜 서버로 화면을 볼 수 있다(지어낸 이름만).

문서: 약속과 결정 기록 `docs/design.md`, 사용자가 할 일 `docs/setup.md`, 전체 계획 `docs/plan.md`. 작업 규칙은 `AGENTS.md`, `CLAUDE.md`.

## 지금 되는 것
Supabase로 옮기는 중이다. 로그인(카카오·구글·애플), 앱 관리자 확인, 메뉴 줄, 오늘 화면이 된다. 나머지 메뉴는 "준비 중"이고 PR마다 하나씩 옮긴다. 교회 카드는 교회 메뉴 PR에서 새 서버 함수로 다시 만든다.
