/* ?demo: 가짜 서버. 화면 확인용이라 이름과 숫자는 모두 지어낸 것이다. 쓰기는 메모리에만 반영한다.
   ?demo  앱 관리자   ?demo=out  로그인 전   ?demo=notadmin  앱 관리자 아님   ?demo=error  첫 호출 실패
   (?demo=small·?demo=empty는 이용 통계 PR에서 더한다. 이름이 나오는 화면을 만들 때 `<b>굵게</b>`처럼 HTML을 넣어 글자로만 보이는지 본다) */
(function () {
  const q = new URLSearchParams(location.search);
  if (!q.has('demo')) return;
  const mode = q.get('demo') || 'in';
  let failed = false;
  // 서버가 돌려줄 오류와 같은 모양({code, message, status})으로 거절한다
  const err = (code, message, status) => Object.assign(new Error(message), { code, message, status });
  const today = {
    apply: { pending: 3, made: 1 },
    feedback_unread: 2,
    reports_new: 1,
    churches: { total: 4, test: 1, stopped: 1, no_admin: 2 },
    db: { bytes: 262144000, limit_bytes: 524288000, percent: 50 },
    switches: { church_open: 'admins', church_apply: 'on', community_open: 'on', usage_track: 'off' }
  };
  window.AdminDemo = {
    mode,
    rpc: name => new Promise((ok, no) => setTimeout(() => {
      if (mode === 'out') return no(err('28000', 'login', 401));
      if (mode === 'error' && !failed) { failed = true; return no(err('XX000', 'internal', 500)); }
      if (name === 'admin_me') return ok({ admin: mode !== 'notadmin' });
      if (mode === 'notadmin') return no(err('P0001', 'bad: 앱 관리자만 할 수 있어요.', 400));
      if (name === 'admin_today') return ok(JSON.parse(JSON.stringify(today)));
      no(err('PGRST202', 'not found', 404));
    }, 150))
  };
})();
