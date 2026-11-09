/* 화면 상태와 그리기. 서버는 api.*로만 부른다(기본 서버 주소·요청 모양은 모른다).
   서버가 준 글은 모두 textContent로만 넣는다(HTML로 해석하지 않는다). */
(function () {
  const CFG = window.ADMIN_CONFIG || {};
  const root = document.getElementById('app');
  const S = { view: 'loading', msg: '', me: '', hubVersion: '', churches: [] };

  // 작은 도우미: el('p', {class:'hint'}, '글자') — 글자는 textContent로만
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (k === 'onclick') n.addEventListener('click', v); else n.setAttribute(k, v); });
    kids.forEach(k => { if (k != null) n.append(k.nodeType ? k : document.createTextNode(String(k))); });
    return n;
  }
  function toast(t) {
    const b = document.getElementById('toast'); b.textContent = t; b.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { b.hidden = true; }, 3500);
  }

  // 카드의 앱 칸은 받은 상태만 그린다. 서버 주소는 화면에 넣지 않는다.
  function isOld(status) { return status && String(status.version).slice(0, 10) < CFG.NEED_SERVER; }
  function koideBox(c) {
    const st = c.status, todos = [];
    const box = el('div', { class: 'aa-app' }, el('p', { class: 'label' }, '코이데'));
    if (st) {
      const stats = [['부서', st.depts], ['연결', st.linked], ['코드로 온 사람', c.came], ['7일 오류', st.errors]];
      box.append(el('dl', { class: 'aa-stats' }, ...stats.map(([name, value]) =>
        el('div', null, el('dt', null, name), el('dd', null, value ?? 0)))));
      if (st.asks > 0) todos.push(el('span', { class: 'ch-todo' }, '승인 기다림 ' + st.asks));
      if (isOld(st)) todos.push(el('span', { class: 'ch-todo' }, '새 버전으로 배포 필요'));
      if (!st.opened) todos.push(el('span', { class: 'ch-todo warn' }, '이번 달 기도제목 아직 없음'));
      if (st.auto) todos.push(el('span', { class: 'ch-todo warn' }, '승인 없이 바로 연결'));
    } else {
      box.append(el('p', { class: 'aa-err' }, '서버에 묻지 못했어요' + (c.err ? ' · ' + c.err : '')));
    }
    if (todos.length) box.append(el('div', { class: 'ch-todos' }, ...todos));
    const details = [st && st.version ? '서버 ' + st.version : '', c.memo].filter(Boolean);
    if (details.length) box.append(el('p', { class: 'aa-ver' }, details.join(' · ')));
    return box;
  }
  function didakoBox(c) {
    const box = el('div', { class: 'aa-app' }, el('p', { class: 'label' }, '디다코'));
    if (!c.didako) box.append(el('p', { class: 'aa-off' }, '쓰지 않아요'));
    else if (c.didakoStatus) {
      const st = c.didakoStatus;
      box.append(el('p', { class: st.errors > 0 ? 'aa-err' : 'aa-ver' },
        '디다코 서버 ' + (st.version || '') + ' · 7일 오류 ' + (st.errors ?? 0)));
    } else {
      box.append(el('p', { class: 'aa-err' }, '답이 없어요'),
        el('p', { class: 'hint' }, c.didakoErr || '서버 주소가 틀렸거나 꺼져 있을 수 있어요.'));
    }
    return box;
  }
  function telioBox() {
    return el('div', { class: 'aa-app' }, el('p', { class: 'label' }, '텔리오'), el('p', { class: 'aa-off' }, '준비 중'));
  }
  function card(c) {
    const st = c.status;
    const bad = !st || isOld(st) || st.errors > 0 || (c.didako && (!c.didakoStatus || c.didakoStatus.errors > 0));
    const codes = String(c.codes || '').split(',').map(code => code.trim()).filter(Boolean);
    return el('section', { class: 'card aa-card' + (c.stopped ? ' stopped' : '') },
      el('div', { class: 'aa-head' },
        el('span', { class: 'ops-dot' + (bad ? ' bad' : ''), title: bad ? '살펴볼 것이 있어요' : '잘 이어져 있어요' }),
        el('b', null, c.name),
        c.kind === '테스트' ? el('span', { class: 'own-tag' }, '테스트') : null,
        c.stopped ? el('span', { class: 'own-tag' }, '멈춤') : null),
      el('div', { class: 'aa-codes' }, ...(codes.length ? codes.map(code => el('span', { class: 'aa-code' }, code)) : [el('span', { class: 'hint' }, '코드 없음')])),
      koideBox(c), didakoBox(c), telioBox());
  }

  const views = {
    loading: () => el('p', { class: 'loading' }, '불러오는 중…'),
    // 로그인 전
    out: () => el('section', { class: 'gate' },
      el('p', { class: 'eyebrow' }, '앱 관리자'),
      el('h1', null, '코이노비아 앱 관리'),
      el('div', { class: 'card' },
        el('p', { class: 'msg' }, '앱 관리자만 들어올 수 있어요.'),
        S.msg ? el('p', { class: 'err' }, S.msg) : null,
        el('button', { class: 'btn wide', onclick: login }, '카카오로 로그인'),
        el('p', { class: 'hint' }, '공용 컴퓨터에서는 다 쓰고 로그아웃해 주세요.'))),
    // 앱 관리자가 아닐 때: 서버 문장 그대로(내 카카오ID를 앱 관리자 목록에 넣는 길이라 남겨 둔다)
    notadmin: () => el('section', { class: 'gate' },
      el('p', { class: 'eyebrow' }, '앱 관리자'),
      el('h1', null, '코이노비아 앱 관리'),
      el('div', { class: 'card' },
        el('p', { class: 'msg' }, S.msg),
        el('button', { class: 'btn ghost wide', onclick: logout }, '로그아웃'))),
    // 서버에 닿지 못했을 때
    error: () => el('section', { class: 'gate' },
      el('h1', null, '코이노비아 앱 관리'),
      el('div', { class: 'card' },
        el('p', { class: 'msg' }, S.msg),
        el('button', { class: 'btn wide', onclick: load }, '다시 해 보기'),
        el('button', { class: 'btn ghost wide', onclick: logout }, '로그아웃'))),
    // 교회 카드는 서버가 준 순서 그대로
    home: () => {
      const n = S.churches.length, t = S.churches.filter(c => c.kind === '테스트').length;
      const came = S.churches.reduce((sum, c) => sum + (Number(c.came) || 0), 0);
      return el('div', null,
        el('p', { class: 'eyebrow' }, '앱 관리자'),
        el('h1', null, '코이노비아 앱 관리'),
        el('p', { class: 'aa-sum' }, '교회 ' + (n - t) + '곳 · 테스트 공간 ' + t + '곳 · 코드로 들어온 사람 ' + came + '명'),
        S.churches.length ? el('div', { class: 'aa-grid' }, ...S.churches.map(card)) : el('p', { class: 'hint' }, '아직 교회가 없어요.'),
        el('footer', { class: 'aa-foot' },
          el('p', null, '기본 서버 ' + S.hubVersion),
          el('p', null, '내 카카오ID ' + S.me),
          el('p', null, '화면 ' + (CFG.VERSION || '')),
          el('button', { class: 'link', onclick: logout }, '로그아웃')));
    }
  };

  function render() { root.replaceChildren(views[S.view]()); }
  function show(view, msg) { S.view = view; S.msg = msg || ''; render(); }

  function login() {
    if (Auth.goKakao() === false) { S.msg = '카카오 로그인 키가 아직 설정되지 않았어요. config.js의 KAKAO_REST_KEY를 채워 주세요.'; render(); }
  }
  function logout() { api.logout(); if (window.AdminDemo) { location.search = '?demo=out'; return; } show('out'); }

  async function load() {
    show('loading');
    try {
      const r = await api.admin();
      S.me = String(r.me || ''); S.hubVersion = String(r.version || ''); S.churches = Array.isArray(r.churches) ? r.churches : [];
      show('home');
    } catch (e) {
      if (e.code === 'login') return show('out');
      if (e.code === 'forbidden') return show('notadmin', e.message);
      show('error', e.message || '불러오지 못했어요.');
    }
  }

  async function boot() {
    api.onSlow(() => { const l = root.querySelector('.loading'); if (l) l.textContent = '서버를 깨우는 중이에요. 처음에는 20초쯤 걸릴 수 있어요…'; });
    const back = Auth.takeReturn();
    if (back.error) { toast('카카오 로그인을 취소했어요.'); }
    if (back.code) {
      show('loading');
      try { await api.login(back.code); } catch (e) { return show('out', e.message || '로그인하지 못했어요.'); }
    }
    if (api.hasSession()) return load();
    show('out');
  }
  boot();
})();
