/* 껍데기와 라우터. 해시 주소(#/today 등)로 메뉴를 바꾸고, 서버는 api.*로만 부른다.
   서버가 준 글은 모두 textContent로만 넣는다(UI.el). 관리자 판정은 서버(admin_me)만 믿는다. */
(function () {
  const CFG = window.ADMIN_CONFIG || {};
  const { el, toast } = UI;
  const root = document.getElementById('app');
  const MENU = [
    ['today', '오늘'], ['apply', '교회 신청'], ['church', '교회'], ['usage', '이용 통계'],
    ['feedback', '의견함'], ['community', '공동체'], ['storage', '저장 공간']
  ];
  const S = { today: null, sess: null, admin: false, seq: 0 };

  const loading = () => el('p', { class: 'loading' }, '불러오는 중…');
  function paint(node) { root.replaceChildren(node); }
  function errorView(msg, retry) {
    return el('div', { class: 'gate' }, el('h1', null, '코이노비아 앱 관리'),
      el('div', { class: 'card' },
        el('p', { class: 'msg' }, msg || '불러오지 못했어요.'),
        el('button', { class: 'btn wide', type: 'button', onclick: retry }, '다시 해 보기'),
        el('button', { class: 'btn ghost wide', type: 'button', onclick: logout }, '로그아웃')));
  }

  async function showLogin(msg) {
    S.today = null; S.admin = false;
    paint(loading());
    const providers = await api.providers();
    paint(Auth.loginView(providers, msg || '', async p => {
      try { await api.login(p); } catch (e) { toast('로그인하지 못했어요.'); }
    }));
  }
  async function logout() {
    await api.logout();
    if (window.AdminDemo) { location.search = '?demo=out'; return; }
    showLogin();
  }
  function showNotAdmin() { S.admin = false; paint(Auth.notAdminView(S.sess, logout)); }
  function fail(e) {
    if (e.code === 'login') return showLogin();
    if (e.code === 'forbidden') return showNotAdmin();
    paint(errorView(e.message, load));
  }

  function badge(key) {
    const t = S.today || {};
    const n = key === 'apply' ? (t.apply && t.apply.pending) : key === 'feedback' ? t.feedback_unread : key === 'community' ? t.reports_new : 0;
    return Number(n) > 0 ? Number(n) : 0;
  }
  function menu(cur) {
    return el('nav', { class: 'aa-menu', 'aria-label': '메뉴' }, ...MENU.map(([k, name]) => {
      const n = badge(k);
      return el('a', { class: 'aa-tab', href: '#/' + k, 'aria-current': k === cur ? 'page' : null },
        name, n ? el('span', { class: 'aa-badge', 'aria-label': n + '건' }, n) : null);
    }));
  }
  function footer() {
    return el('footer', { class: 'aa-foot' },
      el('p', null, '로그인 방법 ' + (S.sess && S.sess.provider || '')),
      el('p', null, '화면 ' + (CFG.VERSION || '')),
      el('p', null, '공용 컴퓨터에서는 다 쓰고 로그아웃해 주세요.'),
      el('button', { class: 'link', type: 'button', onclick: logout }, '로그아웃'));
  }
  function soon(name) {
    return el('section', null, el('h1', null, name), el('div', { class: 'card' }, el('p', { class: 'msg' }, '준비 중이에요.')));
  }

  // 신청 목록이 바뀌면 메뉴 옆 숫자를 맞춘다(오늘 결과가 있을 때만)
  function applyChanged(list) {
    if (!S.today) return;
    const items = list.items || [];
    S.today.apply = { pending: items.filter(i => i.status === '대기').length, made: items.filter(i => i.status === '만듦').length };
    const old = root.querySelector('.aa-menu');
    if (old) old.replaceWith(menu('apply'));
  }

  async function showShell() {
    const m = location.hash.match(/^#\/([a-z]+)/);
    const cur = m && MENU.some(x => x[0] === m[1]) ? m[1] : 'today';
    const my = ++S.seq;           // 늦게 온 옛 요청은 버린다
    let body;
    paint(el('div', null, menu(cur), loading()));
    if (cur === 'today') {
      try { S.today = await api.today(); } catch (e) { return my === S.seq && fail(e); }
      if (my !== S.seq) return;
      body = Views.today.render(S.today);
    } else if (cur === 'apply') {
      let list;
      try {
        const need = S.today ? null : api.today().then(t => { S.today = t; }, () => {});
        list = await api.applyList();
        if (need) await need;
      } catch (e) { return my === S.seq && fail(e); }
      if (my !== S.seq) return;
      body = Views.apply.render(list, { changed: applyChanged });
      paint(el('div', null, menu(cur), body, footer()));
      return;
    } else body = soon(MENU.find(x => x[0] === cur)[1]);
    paint(el('div', null, menu(cur), body, footer()));
  }

  async function load() {
    paint(loading());
    try {
      const me = await api.me();
      S.sess = await api.session();
      if (!me || me.admin !== true) return showNotAdmin();
    } catch (e) { return fail(e); }
    S.admin = true;
    showShell();
  }

  async function boot() {
    api.onSlow(() => { const l = root.querySelector('.loading'); if (l) l.textContent = '서버를 깨우는 중이에요. 처음에는 20초쯤 걸릴 수 있어요…'; });
    api.onSignedOut(() => { if (!window.AdminDemo) showLogin(); });
    window.addEventListener('hashchange', () => { if (S.admin) showShell(); });
    const back = await api.init();
    if (!(await api.hasSession())) return showLogin(back.loginError ? '로그인하지 못했어요. 다시 해 주세요.' : '');
    load();
  }
  boot();
})();
