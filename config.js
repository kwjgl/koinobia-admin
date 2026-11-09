/* 화면 설정. 공개되어도 되는 값만 둔다. 비밀 열쇠·Client Secret·앱 관리자 목록·시트 주소는 절대 넣지 않는다. */
window.ADMIN_CONFIG = {
  // 기본 서버 웹 앱 주소(코이데 koide의 config와 같은 값). 공개 값이라 커밋한다(AGENTS.md 예외). 기본 서버를 새 주소로 배포하면 여기도 바꾼다
  HUB_URL: 'https://script.google.com/macros/s/AKfycbxzOsJrAvxkVn4iyfXhXwN-zodjeH8OJ3qeHYAE2MRdFJWiZCWdFHGEU1jYwODeaT0c/exec',
  // 카카오 REST API 키(공개 값). Client Secret은 넣지 않는다
  KAKAO_REST_KEY: '797c76e7cc40eb0fb93ca86e6d1bb62e',
  // 이 페이지 주소(끝 / 포함). 카카오와 기본 서버 REDIRECT_URI에 같은 값이 등록되어 있어야 한다
  REDIRECT_URI: 'https://admin.koinobia.com/',
  // 앱별 시작 주소
  APPS: { koide: 'https://koide.koinobia.com/app/', didako: 'https://didako.koinobia.com/note/' },
  // 코이데 app/index.html의 NEED_SERVER와 같게 손으로 맞춘다(서버 버전 앞 날짜)
  NEED_SERVER: '2026-11-08',
  // 이 화면의 버전. 푸터에 보인다
  VERSION: '2026-11-09 고치기·초대'
};
