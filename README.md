# koinobia-admin (코이노비아 앱 관리)

코이데·디다코·(나중에) 텔리오를 한곳에서 관리하는 앱 관리자용 페이지다. 주소는 `https://admin.koinobia.com/`(GitHub Pages).

- 빌드 없는 정적 페이지다(`index.html`, `config.js`, `css/`, `js/`).
- 서버는 새로 만들지 않고 지금 기본 서버(pray-for 저장소 `apps-script/hub/`)를 그대로 쓴다. 서버를 부르는 코드는 `js/api.js` 한 파일에만 있다.
- 화면 색은 코이데 먹색 테마이고 늘 밝다.
- 이 저장소는 공개다. 비밀값(`HUB_SECRET`, 카카오 Client Secret, 앱 관리자 목록, 시트 주소)은 두지 않는다.
- `?demo`, `?demo=out`, `?demo=notadmin`으로 열면 가짜 서버로 화면을 볼 수 있다(지어낸 이름만).

문서: 약속과 결정 기록 `docs/design.md`, 사용자가 할 일 `docs/setup.md`, 전체 계획 `docs/plan.md`. 작업 규칙은 `AGENTS.md`, `CLAUDE.md`.

## 지금 되는 것 (1-1 뼈대)
로그인 전 화면, 앱 관리자가 아닐 때 화면, 로그인 뒤 교회 수 한 줄과 푸터. 교회 카드는 다음 PR에서 더한다.
