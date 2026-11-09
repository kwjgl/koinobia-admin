# 사용자가 할 일 (설정 순서)

코드가 올라간 뒤 아래를 순서대로 한다. 값(기본 서버 주소, 카카오 키)은 이 저장소 밖에서 가져온다. 모르면 AI에게 값을 알려 주고 `config.js`에 넣게 한다(비밀값은 넣지 않는다).

1. **GitHub Pages 켜기**: 저장소 Settings > Pages > Source `main`, 폴더 `/ (root)`. 사용자 지정 도메인은 `CNAME` 파일 덕에 `admin.koinobia.com`으로 잡힌다. 저장소는 공개로 둔다.
2. **가비아 DNS**: `CNAME` 레코드 한 줄. 호스트 `admin`, 값 `kwjgl.github.io.`(끝에 점). 반영되면 Pages에서 "Enforce HTTPS"를 켠다.
3. **카카오 개발자 앱(코이노비아)**: 사이트 도메인에 `https://admin.koinobia.com`, 카카오 로그인 Redirect URI에 `https://admin.koinobia.com/`를 더한다. 기존 주소는 그대로 둔다.
4. **기본 서버 스크립트 속성 `REDIRECT_URI`**: **맨 뒤에** `,https://admin.koinobia.com/`를 더한다. 첫 주소(코이데)와 디다코 주소는 그대로 둔다(첫 주소가 초대 링크의 바탕이다). 고치기 전에 원래 값을 따로 적어 둔다. 저장한 뒤 코이데 로그인이 되는지 바로 확인한다. 코드 재배포는 필요 없다(속성만 바꾼다).
5. **`config.js` 채우기**: 2026-11-09에 채웠다(`HUB_URL`, `KAKAO_REST_KEY`). 기본 서버를 새 주소로 배포하거나 카카오 앱을 바꾸면 여기도 바꾼다. Client Secret은 넣지 않는다.
6. **확인**: `https://admin.koinobia.com/`에서 카카오로 로그인한다. 앱 관리자가 아니면 "앱 관리자만 볼 수 있어요. 내 카카오ID: …"가 나온다. 그 숫자를 기본 서버 `APP_ADMINS`에 넣는다. 새 주소에서 서버 호출이 막히면 이 PR 단계에서 먼저 알려 준다.

화면만 먼저 보려면 `?demo`, `?demo=out`, `?demo=notadmin`을 붙여 연다(서버 없이 가짜 응답).
