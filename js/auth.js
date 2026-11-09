/* 카카오 로그인 이동과 돌아온 주소 읽기. 서버와 이야기하는 것은 api.js가 한다. */
(function () {
  const CFG = window.ADMIN_CONFIG || {};
  const DEMO = window.AdminDemo || null;
  window.Auth = {
    // 카카오 로그인 화면으로 간다
    goKakao: () => {
      if (DEMO) { location.search = '?demo'; return; }
      if (!CFG.KAKAO_REST_KEY) return false;
      location.href = 'https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=' + encodeURIComponent(CFG.KAKAO_REST_KEY) + '&redirect_uri=' + encodeURIComponent(CFG.REDIRECT_URI);
    },
    // 카카오에서 돌아온 주소의 ?code·?error를 읽고 곧바로 주소에서 지운다(새로고침하면 "이미 썼다"가 나기 때문)
    takeReturn: () => {
      const q = new URLSearchParams(location.search);
      if (DEMO) return { code: null, error: null };
      const out = { code: q.get('code'), error: q.get('error') };
      if (out.code || out.error) history.replaceState(null, '', location.pathname);
      return out;
    }
  };
})();
