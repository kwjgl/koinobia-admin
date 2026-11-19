/* 서버(Supabase) 부르기는 이 파일 한 곳에만 둔다. 화면은 api.today()처럼 뜻으로만 부르고 서버 함수 이름·요청 모양을 모른다.
   실패는 {code, message}로 던진다. 비밀·토큰은 콘솔에 찍지 않는다. ?demo면 AdminDemo(가짜 서버)가 대신 답한다. */
(function () {
  const CFG = window.ADMIN_CONFIG || {};
  const DEMO = window.AdminDemo || null;
  const PROV_ALL = ['kakao', 'google', 'apple'];
  const PROV_KEY = 'koinobia-admin-providers';
  const LIMIT = 60000, SLOW = 4000;
  const fail = (code, message) => ({ code, message });
  let client = null, slowFn = null, outFn = null;

  function sb() {
    if (client) return client;
    if (!CFG.SUPABASE_URL || !CFG.SUPABASE_KEY || !window.supabase || !window.supabase.createClient) throw fail('net', '로그인 도구를 불러오지 못했어요.');
    client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, {
      auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true, storageKey: 'koinobia-admin-sb' }
    });
    client.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT' && outFn) outFn(); });
    return client;
  }

  // 서버 오류를 {code, message}로 바꾼다(한 곳)
  function convert(err, status) {
    const msg = String(err && err.message || ''), sql = String(err && err.code || '');
    if (msg === 'login' || sql === '28000' || status === 401) return fail('login', '로그인이 필요해요.');
    let m = /^forbidden: ([\s\S]*)$/.exec(msg) || /^bad: (앱 관리자만[\s\S]*)$/.exec(msg);
    if (m) return fail('forbidden', m[1]);
    m = /^(bad|busy): ([\s\S]*)$/.exec(msg);
    if (m) return fail(m[1], m[2]);
    if (sql === 'PGRST202' || status === 404) return fail('sql', '서버 SQL이 아직 없어요. docs/setup.md의 안내대로 036(또는 037)을 넣어 주세요.');
    if (sql === '57014') return fail('slow', '서버가 시간 안에 답하지 못했어요. 기간을 줄여 보세요.');
    if (status === 0 || /fetch|network|abort/i.test(msg + String(err && err.name || ''))) return fail('net', '서버가 답하지 않아요. 잠시 뒤 다시 해 주세요.');
    return fail('bad', '서버가 받지 못했어요. 잠시 뒤 다시 해 주세요.');
  }

  async function rpc(name, args) {
    const timer = setTimeout(() => { if (slowFn) slowFn(); }, SLOW);
    try {
      if (DEMO) {
        try { return await DEMO.rpc(name, args || {}); }
        catch (e) { throw convert(e, e && e.status); }
      }
      const c = sb();
      const ctl = new AbortController(), stop = setTimeout(() => ctl.abort(), LIMIT);
      let r;
      try { r = await c.rpc(name, args || {}).abortSignal(ctl.signal); }
      catch (e) { throw convert(e, 0); }
      finally { clearTimeout(stop); }
      if (r.error) {
        const e = convert(r.error, r.status);
        if (e.code === 'login') { try { await c.auth.signOut({ scope: 'local' }); } catch (x) { /* 이미 로그아웃 */ } }
        throw e;
      }
      return r.data;
    } finally { clearTimeout(timer); }
  }

  // 로그인 방법 목록을 이 기기에 기억해 바로 그린다(1시간 안이면 다시 받지 않는다). 실패하면 ['kakao']
  function provMem() {
    try {
      const x = JSON.parse(localStorage.getItem(PROV_KEY) || 'null');
      if (!x || !Array.isArray(x.list) || !(Date.now() - x.at < 30 * 864e5)) return null;
      const list = PROV_ALL.filter(k => x.list.includes(k));
      return list.length ? { list, at: x.at } : null;
    } catch (e) { return null; }
  }
  async function providers() {
    if (DEMO) return ['kakao', 'google', 'apple'];
    const m = provMem();
    if (m && Date.now() - m.at < 36e5) return m.list;
    try {
      const ctl = new AbortController(), stop = setTimeout(() => ctl.abort(), 6000);
      let res;
      try { res = await fetch(CFG.SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1/settings', { headers: { apikey: CFG.SUPABASE_KEY }, signal: ctl.signal }); }
      finally { clearTimeout(stop); }
      const e = (await res.json() || {}).external || {};
      const list = PROV_ALL.filter(k => e[k]);
      if (list.length) {
        try { localStorage.setItem(PROV_KEY, JSON.stringify({ list, at: Date.now() })); } catch (x) { /* 저장이 안 되어도 목록은 쓴다 */ }
        return list;
      }
    } catch (e) { /* 아래 대체값 */ }
    const old = provMem();
    return old ? old.list : ['kakao'];
  }

  const api = {
    // 시작할 때 한 번. 로그인에서 돌아온 ?code·?error를 처리하고 주소에서 지운다. 돌려주는 값: {loginError}
    async init() {
      if (DEMO) return { loginError: false };
      const q = new URLSearchParams(location.search);
      const loginError = q.has('error') || q.has('error_description');
      const had = q.has('code') || loginError;
      try { await sb().auth.getSession(); } catch (e) { /* 아래에서 주소만 정리 */ }
      if (had) {
        ['code', 'error', 'error_code', 'error_description'].forEach(k => q.delete(k));
        const rest = q.toString();
        history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
      }
      return { loginError };
    },
    async hasSession() {
      if (DEMO) return DEMO.mode !== 'out';
      try { const r = await sb().auth.getSession(); return !!(r.data && r.data.session); } catch (e) { return false; }
    },
    // 내 계정 번호와 로그인 방법(본인에게만 보인다)
    async session() {
      if (DEMO) return { uid: '00000000-demo-0000-0000-000000000000', provider: 'kakao' };
      try {
        const r = await sb().auth.getSession(), s = r.data && r.data.session;
        if (!s) return null;
        const p = s.user && s.user.app_metadata && s.user.app_metadata.provider;
        return { uid: String(s.user && s.user.id || ''), provider: String(p || '') };
      } catch (e) { return null; }
    },
    providers,
    async login(provider) {
      if (!PROV_ALL.includes(provider)) throw fail('bad', '로그인 방법을 고를 수 없어요.');
      if (DEMO) { location.search = '?demo'; return; }
      const r = await sb().auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + location.pathname } });
      if (r.error) throw fail('bad', '로그인하지 못했어요.');
    },
    async logout() {
      if (DEMO) return;
      try { await sb().auth.signOut({ scope: 'local' }); } catch (e) { /* 이 기기에서는 이미 나간 것으로 본다 */ }
    },
    onSlow(fn) { slowFn = fn; },
    onSignedOut(fn) { outFn = fn; },
    me: () => rpc('admin_me'),
    today: () => rpc('admin_today'),
    // 교회 신청(035). 연락처·대표 목사님 이름이 들어 있으니 화면 메모리에서만 쓴다
    applyList: () => rpc('church_apply_admin_list'),
    applyMake: (id, name, code, dept) => rpc('church_apply_make', { p_id: id, p_name: name, p_code: code, p_dept: dept }),
    applyReject: (id, reason) => rpc('church_apply_reject', { p_id: id, p_reason: reason || '' })
  };
  window.api = api;
})();
