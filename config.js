/* 화면 설정. 공개되어도 되는 값만 둔다. SUPABASE_URL과 publishable 키는 공개 값이라 커밋한다(AGENTS.md 예외). 비밀 키(secret 계열)는 절대 넣지 않는다.
   index.html의 CSP(connect-src)에 같은 호스트가 적혀 있다. SUPABASE_URL이 바뀌면 거기도 손으로 맞춘다. */
window.ADMIN_CONFIG = {
  SUPABASE_URL: 'https://knzibzjnpkcpelwfqdvx.supabase.co',
  SUPABASE_KEY: 'sb_publishable_zWrybkJVwpzQ04XnUoxnSA_keakooJI',
  // 앱별 시작 주소
  APPS: { koide: 'https://koide.koinobia.com/app/', didako: 'https://didako.koinobia.com/note/' },
  // 이 화면의 버전. 푸터에 보인다
  VERSION: '2026-11-19 이용 통계(그래프)'
};
