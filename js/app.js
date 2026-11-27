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
  const S = { today: null, sess: null, admin: false, seq: 0, last: 0 };
  const BASE_TITLE = document.title;
  const EVERY = 5 * 60 * 1000;   // 열어 둔 화면의 '오늘' 숫자를 이 간격으로 조용히 다시 받는다
  const curKey = () => { const m = location.hash.match(/^#\/([a-z]+)/); return m && MENU.some(x => x[0] === m[1]) ? m[1] : 'today'; };

  const loading = () => el('p', { class: 'loading' }, '불러오는 중…');
  function paint(node) { root.replaceChildren(node); setTitle(); }
  function errorView(msg, retry) {
    return el('div', { class: 'gate' }, el('h1', null, '코이노비아 앱 관리'),
      el('div', { class: 'card' },
        el('p', { class: 'msg' }, msg || '불러오지 못했어요.'),
        el('button', { class: 'btn wide', type: 'button', onclick: retry }, '다시 해 보기'),
        el('button', { class: 'btn ghost wide', type: 'button', onclick: logout }, '로그아웃')));
  }

  async function showLogin(msg) {
    S.today = null; S.admin = false; setTitle();
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
  function showNotAdmin() { S.admin = false; setTitle(); paint(Auth.notAdminView(S.sess, logout)); }
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
  // 브라우저 탭 제목 앞에 할 일 개수(신청 기다림 + 안 읽은 의견 + 새 신고)를 붙인다. 다른 일을 하다가도 알 수 있다
  function setTitle() {
    const n = S.admin ? badge('apply') + badge('feedback') + badge('community') : 0;
    document.title = n ? '(' + n + ') ' + BASE_TITLE : BASE_TITLE;
  }
  function menu(cur) {
    return el('nav', { class: 'aa-menu', 'aria-label': '메뉴' }, ...MENU.map(([k, name]) => {
      const n = badge(k);
      return el('a', { class: 'aa-tab', href: '#/' + k, 'aria-current': k === cur ? 'page' : null },
        name, n ? el('span', { class: 'aa-badge', 'aria-label': n + '건' }, n) : null);
    }));
  }
  function footer() {
    const prov = S.sess && S.sess.provider || '';
    const first = prov ? UI.withInfo(el('span', null, '로그인 방법 ' + prov), '화면 버전 ' + (CFG.VERSION || ''), { up: true, label: '화면 버전 보기' }) : el('span', null, '로그인 방법');
    return el('footer', { class: 'aa-foot' },
      el('div', { class: 'aa-foot-row' }, first, el('button', { class: 'btn ghost', type: 'button', onclick: logout }, '로그아웃')),
      el('p', { class: 'hint' }, '공용 컴퓨터에서는 다 쓰고 로그아웃해 주세요.'));
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
    setTitle();
  }

  // 안 읽은 의견·새 신고 개수가 바뀌면 메뉴 옆 숫자를 맞춘다
  function countChanged(key, n, cur) {
    if (!S.today) return;
    S.today[key] = n;
    const old = root.querySelector('.aa-menu');
    if (old) old.replaceWith(menu(cur));
    setTitle();
  }

  async function showShell() {
    const m = location.hash.match(/^#\/([a-z]+)/);
    const cur = m && MENU.some(x => x[0] === m[1]) ? m[1] : 'today';
    const my = ++S.seq;           // 늦게 온 옛 요청은 버린다
    let body;
    paint(el('div', null, menu(cur), loading()));
    if (cur === 'today') {
      let al = null;
      try {
        // 이상 신호(040)는 못 받아도 오늘 화면은 그대로 그린다
        const r = await Promise.all([api.today(), api.usage.alerts().then(x => x, e => (e && e.code === 'sql' ? 'sql' : null))]);
        S.today = r[0]; al = r[1]; S.alerts = al; S.last = Date.now();
      } catch (e) { return my === S.seq && fail(e); }
      if (my !== S.seq) return;
      body = Views.today.render(S.today, al);
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
    } else if (cur === 'church') {
      let d;
      try {
        const r = await Promise.all([api.settingList(), api.churchList(), api.logList().catch(() => null)]);
        d = { settings: r[0], churches: r[1], log: r[2] };
      } catch (e) { return my === S.seq && fail(e); }
      if (my !== S.seq) return;
      body = Views.churches.render(d);
    } else if (cur === 'feedback') {
      let d;
      try { d = await api.feedbackList(50, false); } catch (e) { return my === S.seq && fail(e); }
      if (my !== S.seq) return;
      if (S.today) S.today.feedback_unread = d.unread;
      body = Views.feedback.render(d, { changed: n => countChanged('feedback_unread', n, 'feedback') });
      paint(el('div', null, menu(cur), body, footer()));
      return;
    } else if (cur === 'community') {
      let d;
      try {
        const r = await Promise.all([api.communityHealth(), api.communityReports()]);
        d = { health: r[0], reports: r[1], ctx: { changed: n => countChanged('reports_new', n, 'community') } };
      } catch (e) { return my === S.seq && fail(e); }
      if (my !== S.seq) return;
      body = Views.community.render(d);
    } else if (cur === 'storage') {
      let d;
      try { d = await api.dbSize(); } catch (e) { return my === S.seq && fail(e); }
      if (my !== S.seq) return;
      body = Views.storage.render(d);
    } else if (cur === 'usage') {
      body = Views.stats.render();
    } else body = soon(MENU.find(x => x[0] === cur)[1]);
    paint(el('div', null, menu(cur), body, footer()));
    setTitle();
  }

  // 열어 둔 화면의 '오늘' 숫자를 조용히 다시 받아 메뉴 배지와 탭 제목을 맞춘다. 오늘 화면이면 그 화면도 새로 그린다.
  // 다른 화면은 입력 중일 수 있어 건드리지 않는다. 실패해도 아무 말 없이 다음에 다시 한다
  async function refreshQuiet() {
    if (!S.admin || document.hidden) return;
    const my = S.seq, cur = curKey();
    try {
      const r = await Promise.all([api.today(), cur === 'today' ? api.usage.alerts().then(x => x, e => (e && e.code === 'sql' ? 'sql' : null)) : null]);
      if (!S.admin || my !== S.seq) return;
      S.today = r[0]; S.last = Date.now();
      const old = root.querySelector('.aa-menu');
      if (old) old.replaceWith(menu(cur));
      if (cur === 'today') { S.alerts = r[1]; const sec = root.querySelector('section'); if (sec) sec.replaceWith(Views.today.render(S.today, r[1])); }
      setTitle();
    } catch (e) { /* 조용히 넘어간다 */ }
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
    setInterval(refreshQuiet, EVERY);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - S.last > 60000) refreshQuiet(); });
    const back = await api.init();
    if (!(await api.hasSession())) return showLogin(back.loginError ? '로그인하지 못했어요. 다시 해 주세요.' : '');
    load();
  }
  boot();
})();
