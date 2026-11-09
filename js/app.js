/* 화면 상태와 그리기. 서버는 api.*로만 부른다(기본 서버 주소·요청 모양은 모른다).
   서버가 준 글은 모두 textContent로만 넣는다(HTML로 해석하지 않는다). */
(function () {
  const CFG = window.ADMIN_CONFIG || {};
  const root = document.getElementById('app');
  const S = { view: 'loading', msg: '', me: '', hubVersion: '', churches: [], edit: null, link: null, busy: false };

  // 작은 도우미: el('p', {class:'hint'}, '글자') — 글자는 textContent로만
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (v != null && v !== false) n.setAttribute(k, v === true ? '' : v); });
    kids.forEach(k => { if (k != null) n.append(k.nodeType ? k : document.createTextNode(String(k))); });
    return n;
  }
  function toast(t) {
    const b = document.getElementById('toast'); b.textContent = t; b.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { b.hidden = true; }, 3500);
  }

  function accept(r) {
    S.me = String(r.me || ''); S.hubVersion = String(r.version || ''); S.churches = Array.isArray(r.churches) ? r.churches : [];
  }
  function openEdit(orig) {
    if (S.busy) return;
    S.edit = { orig }; S.link = null; render();
    document.getElementById('aa-name').focus();
  }
  function churchForm() {
    const edit = S.edit, c = S.churches.find(c => c.id === edit.orig) || {};
    const draft = edit.draft || c;
    const form = el('form', { class: 'card aa-form', onsubmit: saveChurch, oninput: event => {
      const data = new FormData(event.currentTarget);
      edit.draft = Object.fromEntries(data); edit.draft.stopped = data.has('stopped');
    } },
      el('h2', null, edit.orig ? c.name + ' 고치기' : '교회·테스트 공간 더하기'));
    function field(name, label, attrs, hint) {
      const input = el('input', Object.assign({ class: 'field', id: 'aa-' + name, name, disabled: S.busy }, attrs));
      input.value = draft[name] || '';
      form.append(el('label', { class: 'f', for: input.id }, label), input);
      if (hint) form.append(el('p', { class: 'hint' }, hint));
    }
    field('name', '이름', { maxlength: 30, required: true });
    if (!edit.orig) field('id', '이름표', { maxlength: 20, required: true, pattern: '[A-Za-z0-9_\\-]+', autocapitalize: 'characters', placeholder: '예) B, TEST' },
      '영어·숫자로. 한 번 정하면 바꿀 수 없어요. 그 교회 서버의 CHURCH_ID에 같은 값을 넣어요.');
    const kind = el('select', { class: 'field', id: 'aa-kind', name: 'kind', disabled: S.busy },
      el('option', { value: '교회' }, '교회'), el('option', { value: '테스트' }, '테스트'));
    kind.value = draft.kind || '교회';
    form.append(el('label', { class: 'f', for: 'aa-kind' }, '종류'), kind);
    field('codes', '코드', { required: true, placeholder: '예) KOIDE24, 코이데' },
      '쉼표로 여럿 쓸 수 있어요. 대소문자·띄어쓰기·-는 가리지 않아요.');
    const address = { inputmode: 'url', placeholder: 'https://script.google.com/macros/s/…/exec' };
    field('url', '서버 주소', Object.assign({ required: true }, address),
      '그 교회 시트의 Apps Script › 배포 › 배포 관리에서 웹 앱 URL을 복사해 붙여 넣어요. /exec로 끝나는 주소예요.');
    field('didako', '디다코 서버 주소 (비워도 돼요)', address,
      '이 교회가 디다코 노트를 쓰면 디다코 서버의 웹 앱 주소를 넣어요. 비워 두면 디다코에서는 "아직 쓰지 않아요"로 나와요.');
    field('memo', '메모', { maxlength: 60 });
    if (edit.orig) {
      const stopped = el('input', { type: 'checkbox', name: 'stopped', disabled: S.busy });
      stopped.checked = !!draft.stopped;
      form.append(el('label', { class: 'check' }, stopped, '멈춤 · 이 코드로 새로 들어올 수 없어요'));
    }
    form.append(el('p', { class: 'hint' }, '그 교회 서버의 스크립트 속성에 HUB_SECRET(기본 서버와 같은 값)과 CHURCH_ID(이름표)를 넣어야 이어져요. 테스트 공간이면 AUTO_APPROVE에 예를 넣어요.'),
      el('div', { class: 'actions' },
        el('button', { class: 'btn small', type: 'submit', disabled: S.busy }, '저장'),
        el('button', { class: 'btn small ghost', type: 'button', disabled: S.busy, onclick: () => { S.edit = null; render(); } }, '취소')));
    return form;
  }
  async function saveChurch(event) {
    event.preventDefault();
    if (S.busy || !S.edit) return;
    const form = event.currentTarget, data = new FormData(form), body = { orig: S.edit.orig };
    ['id', 'name', 'kind', 'codes', 'url', 'didako', 'memo'].forEach(k => { body[k] = String(data.get(k) || '').trim(); });
    body.stopped = data.has('stopped');
    S.edit.draft = body; S.busy = true; render();
    try {
      accept(await api.saveChurch(body)); S.edit = null; S.link = null; toast('저장했어요.');
    } catch (e) {
      if (e.code === 'login') { S.edit = null; S.link = null; show('out'); return; }
      toast(e.message || '저장하지 못했어요.');
    } finally { S.busy = false; render(); }
  }
  async function invite(c) {
    if (S.busy) return;
    const pending = { id: c.id, wait: true };
    S.link = pending; render();
    try {
      const result = await api.invite(c.id);
      if (S.link === pending) S.link = Object.assign({ id: c.id }, result);
    } catch (e) {
      if (e.code === 'login') { S.edit = null; S.link = null; show('out'); return; }
      if (S.link === pending) S.link = { id: c.id, err: e.message || '초대 링크를 만들지 못했어요.' };
    }
    render();
  }
  function inviteBox(link) {
    if (link.wait) return el('div', { class: 'aa-link' }, el('p', { class: 'hint' }, '초대 링크를 만드는 중…'));
    if (link.err) return el('div', { class: 'aa-link' }, el('p', { class: 'aa-err' }, link.err));
    return el('div', { class: 'aa-link' },
      el('p', { class: 'label' }, '첫 관리자 초대 링크'), el('code', null, link.link),
      el('div', { class: 'actions' },
        el('button', { class: 'btn small', onclick: async () => {
          try { await navigator.clipboard.writeText(link.link); toast('복사했어요. 카톡에 붙여 넣으세요.'); }
          catch (e) { toast('복사하지 못했어요. 링크를 길게 눌러 복사해 주세요.'); }
        } }, '복사'),
        el('button', { class: 'link quiet', onclick: () => { S.link = null; render(); } }, '닫기')),
      el('p', { class: 'hint' }, link.until + '까지 한 번 쓸 수 있어요. 받은 사람이 이 링크로 열고 카카오로 로그인하면 이 교회의 전체 관리자가 돼요.'));
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
        c.stopped ? el('span', { class: 'own-tag' }, '멈춤') : null,
        el('button', { class: 'link', disabled: S.busy, onclick: () => openEdit(c.id) }, '고치기')),
      el('div', { class: 'aa-codes' }, ...(codes.length ? codes.map(code => el('span', { class: 'aa-code' }, code)) : [el('span', { class: 'hint' }, '코드 없음')])),
      koideBox(c), didakoBox(c), telioBox(),
      S.link && S.link.id === c.id ? inviteBox(S.link) : null,
      el('div', { class: 'aa-acts' }, el('button', { class: 'btn small ghost', disabled: S.busy, onclick: () => invite(c) }, '첫 관리자 초대 링크')));
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
        !S.churches.length ? el('p', { class: 'hint' }, '아직 교회가 없어요.') : null,
        el('div', { class: 'aa-grid' },
          ...S.churches.map(c => S.edit && S.edit.orig === c.id ? churchForm() : card(c)),
          S.edit && !S.edit.orig ? churchForm() : el('button', { class: 'aa-add', disabled: S.busy, onclick: () => openEdit('') },
            el('span', { 'aria-hidden': 'true' }, '+'), '교회·테스트 공간 더하기')),
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
      accept(r);
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
