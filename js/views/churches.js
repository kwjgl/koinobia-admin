/* 교회 화면: 스위치 카드, 교회 카드 목록(만든 순서 그대로, 정렬·비교 없음), 교회 만들기, 최근 바꾼 일.
   서버 글은 모두 textContent로만 넣는다(UI.el). 초대 토큰·링크는 화면 메모리에만 두고 닫으면 지운다. */
(function () {
  const { el, toast } = UI;
  const CFG = window.ADMIN_CONFIG || {};
  const SW = { off: '꺼짐', admins: '관리자만', on: '켜짐' };
  const SWITCHES = [
    ['church_open', '교회 문', '교회 기능을 쓸 수 있는 사람을 정해요. 코이데와 디다코 교회에 함께 적용돼요.'],
    ['church_apply', '교회 신청', '교회 신청서를 낼 수 있는 사람을 정해요.'],
    ['community_open', '코이데 공동체', '코이데 공동체를 쓸 수 있는 사람을 정해요.'],
    ['didako_community_open', '디다코 공동체', '디다코 공동체를 쓸 수 있는 사람을 정해요.'],
    ['usage_track', '이용 통계 기록', '앱이 이름 없는 이용 기록을 서버에 보낼지 정해요. 코이데와 디다코에 함께 적용돼요.']
  ];
  // 값마다 바꾸면 어떻게 되는지(확정 상자에 보인다)
  const MEANS = {
    church_open: { off: '아무도 교회 기능을 쓸 수 없어요.', admins: '앱 관리자 계정만 교회 기능을 써요.', on: '누구나 교회 기능을 쓸 수 있어요.' },
    church_apply: { off: '교회 신청을 받지 않아요.', admins: '앱 관리자만 교회 신청서를 낼 수 있어요.', on: '누구나 교회 신청서를 낼 수 있어요.' },
    community_open: { off: '코이데 공동체를 닫아요.', admins: '앱 관리자 계정만 코이데 공동체를 써요.', on: '누구나 코이데 공동체를 쓸 수 있어요.' },
    didako_community_open: { off: '디다코 공동체를 닫아요.', admins: '앱 관리자 계정만 디다코 공동체를 써요.', on: '누구나 디다코 공동체를 쓸 수 있어요.' },
    usage_track: { off: '이용 기록을 받지 않아요.', on: '앱이 이름 없는 이용 기록을 보내요.' }
  };
  const NEED_OK = ['church_open', 'church_apply', 'usage_track'];   // '켜짐'으로 바꿀 때 준비 확인 체크가 필요한 것
  const ACTION = {
    'church-create': '교회 만듦', 'church-rename': '이름 고침', 'church-state': '멈춤·풀기', 'code-add': '코드 더함',
    'code-stop': '코드 멈춤', 'code-open': '코드 풀기', invite: '초대 링크 만듦', setting: '스위치 바꿈'
  };
  const STATS = [['members', '회원'], ['depts', '부서'], ['households', '가정'], ['linked', '연결'], ['admins', '관리자']];
  const norm = v => String(v || '').toUpperCase().replace(/[^A-Z0-9가-힣]/g, '');
  const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

  function when(v, withTime) {
    const d = new Date(v);
    if (isNaN(d)) return String(v || '');
    const t = (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
    return withTime ? t + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : t;
  }
  // 서버(036)가 주는 링크 모양 그대로: 코이데 시작 주소 + ?opsjoin=토큰 (교회 코드는 붙이지 않는다)
  function inviteUrl(token) {
    return String((CFG.APPS || {}).koide || '') + '?opsjoin=' + encodeURIComponent(token);
  }

  function render(first) {
    const st = { sw: first.settings.items || [], list: first.churches.items || [], log: first.log && first.log.items || null,
      open: {}, invite: {}, ask: {}, pick: {}, swAsk: null, busy: false, add: false };
    const sec = el('section', null);
    const redraw = () => {
      sec.replaceChildren(...build());
      if (st.focus) {   // 방금 만든 교회로 화면을 옮긴다
        const n = sec.querySelector('[data-id="' + st.focus + '"]'); st.focus = null;
        if (n && n.scrollIntoView) n.scrollIntoView({ block: 'center' });
      }
    };
    // 운영 기록만 따로 바꾼다(입력 중인 칸이 지워지지 않게 전체를 다시 그리지 않는다)
    const reloadLog = () => api.logList().then(r => { st.log = r.items || []; const o = sec.querySelector('.aa-log'), n = logBox(); if (o && n) { n.open = o.open; o.replaceWith(n); } }, () => {});
    // 쓰기 하나: 성공하면 apply(결과)로 상태를 바꾸고 다시 그린다. 실패하면 오류 글을 보인다
    async function act(errNode, call, apply, okMsg) {
      if (st.busy) return;
      st.busy = true; errNode.hidden = true;
      sec.querySelectorAll('button:not(.tip-btn)').forEach(b => { b.disabled = true; });
      try {
        const r = await call();
        apply(r); st.busy = false;
        if (okMsg) toast(okMsg);
        redraw(); reloadLog();
      } catch (e) {
        st.busy = false;
        sec.querySelectorAll('button:not(.tip-btn)').forEach(b => { b.disabled = false; });
        errNode.textContent = e.message || '하지 못했어요.'; errNode.hidden = false;
      }
    }
    const errP = () => el('p', { class: 'aa-err', role: 'alert', hidden: true });
    const setList = r => { st.list = r.items || []; };

    // ---- 스위치 ----
    // 한 줄 행: 이름과 도움말, 세그먼트 단추. 칸을 누르면 값을 '고르기'만 하고(서버에 안 보냄) 확정 상자가 열린다. 서버에 가는 단추는 확정 상자 안의 하나뿐이다
    function switchRow(key, name, desc) {
      const item = st.sw.find(x => x.key === key) || {};
      const cur = item.value, allowed = item.allowed || [];
      const opts = ['off', 'admins', 'on'].filter(o => allowed.includes(o));
      const to = st.pick[key];
      const seg = el('div', { class: 'sw-seg', role: 'group', 'aria-label': name + ' 값' }, ...opts.map(o => el('button', {
        class: 'sw-opt' + (to === o && o !== cur ? ' pending' : ''), type: 'button', 'aria-pressed': String(o === cur), 'data-sw': key + ':' + o,
        onclick: () => {
          if (o === cur || st.busy) return;
          st.pick[key] = o; st.swAsk = key; redraw();
          const b = sec.querySelector('[data-sw="' + key + ':' + o + '"]'); if (b) b.focus();
        } }, SW[o] || o)));
      const label = el('span', { class: 'sw-name' }, el('b', null, name), cur ? null : el('span', { class: 'own-tag' }, '정해지지 않음'));
      const kids = [UI.withInfo(label, desc, { label: name + ' 도움말' }), seg];
      if (st.swAsk === key && to && to !== cur) {
        const err = errP();
        const needOk = to === 'on' && NEED_OK.includes(key);
        const ok = el('input', { type: 'checkbox' });
        const wait = el('p', { class: 'hint' }, '위 확인에 체크하면 눌러져요');
        const go = el('button', { class: 'btn small', type: 'button', disabled: needOk }, '바꾸기 확정');
        ok.addEventListener('change', () => { go.disabled = !ok.checked; wait.hidden = ok.checked; });
        go.addEventListener('click', () => act(err, () => api.settingSet(key, to), r => { st.sw = r.items || []; st.swAsk = null; delete st.pick[key]; }, name + ': ' + (SW[to] || to) + '으로 바꿨어요.'));
        kids.push(el('div', { class: 'aa-link' },
          el('p', { class: 'msg' }, el('b', null, name + ': ' + (SW[cur] || '정해지지 않음') + ' → ' + (SW[to] || to))),
          (MEANS[key] || {})[to] ? el('p', { class: 'msg' }, '바꾸면: ' + MEANS[key][to]) : null,
          needOk ? el('label', { class: 'check' }, ok, '개인정보 처리방침과 준비를 마쳤어요') : null,
          err,
          el('div', { class: 'actions' }, go, el('button', { class: 'btn small ghost', type: 'button', onclick: () => { delete st.pick[key]; st.swAsk = null; redraw(); } }, '돌아가기')),
          needOk ? wait : null));
      }
      return el('div', { class: 'sw-row' }, ...kids);
    }

    // ---- 교회 카드의 펼침 칸 ----
    function renamePanel(c) {
      const err = errP(), inp = el('input', { class: 'field', type: 'text', maxlength: '40', value: c.name, autocomplete: 'off', 'aria-label': '교회 이름' });
      return el('div', { class: 'aa-form' }, inp, err, el('div', { class: 'actions' },
        el('button', { class: 'btn small', type: 'button', onclick: () => {
          const n = inp.value.trim();
          if (n.length < 1 || n.length > 40) { err.textContent = '교회 이름은 1~40자로 적어 주세요.'; err.hidden = false; return; }
          act(err, () => api.churchRename(c.id, n), r => { setList(r); delete st.open[c.id]; }, '이름을 고쳤어요.');
        } }, '이름 바꾸기'), closeBtn(c)));
    }
    function closeBtn(c) { return el('button', { class: 'link quiet', type: 'button', onclick: () => { delete st.open[c.id]; delete st.invite[c.id]; delete st.ask[c.id]; redraw(); } }, '닫기'); }
    function statePanel(c) {
      const err = errP(), to = c.status === '멈춤' ? '열림' : '멈춤';
      return el('div', { class: 'aa-form' },
        el('p', { class: 'msg' }, to === '멈춤' ? '멈추면 이 교회 사람들이 앱을 쓰지 못하고 새로 들어오지 못해요. 멈출까요?' : '멈춤을 풀면 이 교회 사람들이 다시 앱을 쓸 수 있어요. 풀까요?'),
        err, el('div', { class: 'actions' },
          el('button', { class: 'btn small', type: 'button', onclick: () => act(err, () => api.churchState(c.id, to), r => { setList(r); delete st.open[c.id]; }, to === '멈춤' ? '교회를 멈췄어요.' : '멈춤을 풀었어요.') }, to === '멈춤' ? '멈추기' : '멈춤 풀기'),
          closeBtn(c)));
    }
    function codePanel(c) {
      const err = errP(), openCount = c.codes.filter(x => x.status === '열림').length;
      const rows = c.codes.map(x => {
        const asked = st.ask[c.id] === x.code, to = x.status === '열림' ? 'stop' : 'open';
        const row = [el('div', { class: 'aa-head' }, el('span', { class: 'aa-code' + (x.status === '열림' ? '' : ' off') }, x.code),
          el('span', { class: 'hint' }, x.status === '열림' ? '열림' : '멈춤'),
          asked ? null : el('button', { class: 'link', type: 'button', onclick: () => { if (to === 'open') run(x.code, 'open'); else { st.ask[c.id] = x.code; redraw(); } } }, x.status === '열림' ? '멈추기' : '풀기'))];
        if (asked) row.push(el('div', { class: 'aa-link' },
          el('p', { class: 'msg' }, '이 코드를 멈출까요? 이 코드로는 새로 들어오지 못해요.' + (openCount <= 1 ? ' 열린 코드가 없어져요.' : '')),
          el('div', { class: 'actions' }, el('button', { class: 'btn small', type: 'button', onclick: () => run(x.code, 'stop') }, '멈추기'),
            el('button', { class: 'btn small ghost', type: 'button', onclick: () => { delete st.ask[c.id]; redraw(); } }, '돌아가기'))));
        return el('div', { class: 'aa-app' }, ...row);
      });
      function run(code, op) { act(err, () => api.churchCode(c.id, code, op), r => { setList(r); delete st.ask[c.id]; }, op === 'stop' ? '코드를 멈췄어요.' : '코드를 풀었어요.'); }
      const inp = el('input', { class: 'field', type: 'text', maxlength: '40', autocomplete: 'off', autocapitalize: 'characters', placeholder: '새 코드', 'aria-label': '새 코드' });
      const prev = el('p', { class: 'hint', hidden: true });
      inp.addEventListener('input', () => { const n = norm(inp.value); prev.textContent = n ? '이렇게 저장돼요: ' + n : ''; prev.hidden = !n; });
      return el('div', { class: 'aa-form' }, ...rows, UI.withInfo(el('label', { class: 'f' }, '코드 더하기'), '영문·숫자·한글 3~30자. 소문자는 대문자로 저장돼요. 코드는 지우지 않고 멈춰요.', { label: '코드 더하기 도움말' }), inp, prev, err,
        el('div', { class: 'actions' },
          el('button', { class: 'btn small', type: 'button', onclick: () => {
            const n = norm(inp.value);
            if (n.length < 3 || n.length > 30) { err.textContent = '코드는 영문·숫자·한글 3~30자로 적어 주세요.'; err.hidden = false; return; }
            act(err, () => api.churchCode(c.id, n, 'add'), r => { setList(r); }, '코드를 더했어요.');
          } }, '더하기'), closeBtn(c)));
    }
    function invitePanel(c) {
      const v = st.invite[c.id];
      if (!v) {
        const err = errP();
        return el('div', { class: 'aa-form' },
          el('p', { class: 'msg' }, '새 초대 링크를 만들면 쓰지 않은 예전 초대는 거두어져요.'), err,
          el('div', { class: 'actions' },
            el('button', { class: 'btn small', type: 'button', onclick: () => act(err, () => api.churchInvite(c.id), r => { st.invite[c.id] = { token: r.token, expires: r.expires }; }, '초대 링크를 만들었어요.') }, '링크 만들기'),
            closeBtn(c)));
      }
      return inviteBox(c, v);
    }
    function inviteBox(c, v) {
      const url = inviteUrl(v.token);
      return el('div', { class: 'aa-link' },
        el('p', { class: 'msg' }, when(v.expires) + '까지 한 번만 쓸 수 있어요.'),
        el('code', null, url),
        el('div', { class: 'actions' },
          el('button', { class: 'btn small', type: 'button', onclick: async () => {
            try { await navigator.clipboard.writeText(url); toast('링크를 복사했어요.'); } catch (e) { toast('복사하지 못했어요. 링크를 길게 눌러 복사해 주세요.'); }
          } }, '링크 복사'), closeBtn(c)));
    }

    function card(c) {
      const kind = st.open[c.id];
      const todos = [];
      if (!c.has_admin) todos.push('첫 관리자 아직 없음');
      if (c.invite_pending) todos.push('초대 링크 기다리는 중');
      const kids = [
        el('div', { class: 'aa-head' }, el('b', null, c.name),
          c.kind === '테스트' ? el('span', { class: 'own-tag' }, '테스트') : null,
          c.status === '멈춤' ? el('span', { class: 'own-tag' }, '멈춤') : null),
        el('div', { class: 'aa-codes' }, ...c.codes.map(x => el('span', { class: 'aa-code' + (x.status === '열림' ? '' : ' off') }, x.status === '열림' ? x.code : x.code + ' 멈춤'))),
        el('dl', { class: 'aa-stats five' }, ...STATS.map(([k, l]) => el('div', null, el('dt', null, l), el('dd', null, num((c.counts || {})[k]))))),
        todos.length ? el('div', { class: 'ch-todos' }, ...todos.map(t => el('span', { class: 'ch-todo warn' }, t))) : null];
      const tab = (k, label) => el('button', { class: 'btn small ghost', type: 'button', 'aria-pressed': kind === k ? 'true' : 'false', onclick: () => { if (st.open[c.id] === k) { delete st.open[c.id]; delete st.invite[c.id]; } else st.open[c.id] = k; redraw(); } }, label);
      kids.push(el('div', { class: 'aa-acts' }, tab('rename', '이름 고치기'), tab('state', c.status === '멈춤' ? '멈춤 풀기' : '멈춤'), tab('code', '코드'),
        tab('invite', c.has_admin ? '관리자 초대 링크' : '첫 관리자 초대 링크')));
      if (kind === 'rename') kids.push(renamePanel(c));
      else if (kind === 'state') kids.push(statePanel(c));
      else if (kind === 'code') kids.push(codePanel(c));
      else if (kind === 'invite') kids.push(invitePanel(c));
      return el('div', { class: 'card aa-card' + (c.status === '멈춤' ? ' stopped' : ''), 'data-id': c.id }, ...kids);
    }

    // ---- 교회 만들기 ----
    function addForm() {
      const err = errP(), actions = el('div', { class: 'actions' });
      const name = el('input', { class: 'field', type: 'text', maxlength: '40', autocomplete: 'off', 'aria-label': '교회 이름' });
      const kind = el('select', { class: 'field', 'aria-label': '종류' }, el('option', { value: '교회' }, '교회'), el('option', { value: '테스트' }, '테스트 (시험 공간)'));
      const code = el('input', { class: 'field', type: 'text', maxlength: '40', autocomplete: 'off', autocapitalize: 'characters', 'aria-label': '코드' });
      const dept = el('input', { class: 'field', type: 'text', maxlength: '12', value: '첫 부서', autocomplete: 'off', 'aria-label': '첫 부서 이름' });
      const prev = el('p', { class: 'hint', hidden: true });
      code.addEventListener('input', () => { const n = norm(code.value); prev.textContent = n ? '이렇게 저장돼요: ' + n : ''; prev.hidden = !n; });
      const showErr = m => { err.textContent = m; err.hidden = !m; };
      const fields = [name, kind, code, dept];
      function edit() {
        fields.forEach(x => { x.disabled = false; });
        actions.replaceChildren(el('button', { class: 'btn small', type: 'button', onclick: ask }, '다음'),
          el('button', { class: 'link quiet', type: 'button', onclick: () => { st.add = false; redraw(); } }, '닫기'));
      }
      function ask() {
        const n = name.value.trim(), c = norm(code.value), d = dept.value.trim();
        if (n.length < 1 || n.length > 40) return showErr('교회 이름은 1~40자로 적어 주세요.');
        if (c.length < 3 || c.length > 30) return showErr('코드는 영문·숫자·한글 3~30자로 적어 주세요.');
        if (d.length < 1 || d.length > 12) return showErr('부서 이름은 1~12자로 적어 주세요.');
        showErr(''); fields.forEach(x => { x.disabled = true; });
        actions.replaceChildren(el('p', { class: 'msg' }, '이 ' + kind.value + '를 만들까요? 되돌릴 수 없어요.'),
          el('button', { class: 'btn small', type: 'button', onclick: () => act(err, () => api.churchCreate(n, kind.value, c, d), r => {
            setList(r); st.add = false;
            if (r.made) { st.open[r.made.churchId] = 'invite'; st.invite[r.made.churchId] = { token: r.made.token, expires: r.made.expires }; st.focus = r.made.churchId; }
          }, '교회를 만들었어요. 아래 초대 링크를 첫 관리자에게 보내 주세요.') }, '만들기'),
          el('button', { class: 'btn small ghost', type: 'button', onclick: edit }, '다시 고치기'));
      }
      edit();
      return el('div', { class: 'card aa-card' }, UI.withInfo(el('h2', null, '교회 만들기'), '신청 없이 직접 만들 때, 또는 시험 공간을 만들 때 써요.'),
        el('div', { class: 'aa-form' }, el('label', { class: 'f' }, '교회 이름'), name, el('label', { class: 'f' }, '종류'), kind,
          UI.withInfo(el('label', { class: 'f' }, '코드'), '영문·숫자·한글 3~30자. 소문자는 대문자로 저장돼요.', { label: '코드 도움말' }), code, prev, el('label', { class: 'f' }, '첫 부서 이름'), dept, err, actions));
    }

    function logBox() {
      if (!st.log) return null;
      return el('details', { class: 'card aa-log' }, el('summary', null, '최근 바꾼 일'),
        st.log.length ? el('ul', { class: 'aa-loglist' }, ...st.log.map(x => el('li', null, el('span', { class: 'hint' }, when(x.at, true)), ' ' + (ACTION[x.action] || x.action) + (x.target ? ' · ' + x.target : ''))))
          : el('p', { class: 'hint' }, '아직 바꾼 일이 없어요.'));
    }

    function build() {
      const kids = [el('h1', null, '교회'),
        el('p', { class: 'eyebrow' }, '스위치'),
        el('div', { class: 'card sw-list' }, ...SWITCHES.filter(([k]) => k !== 'didako_community_open' || st.sw.some(x => x.key === k)).map(([k, n, d]) => switchRow(k, n, d))),
        el('p', { class: 'eyebrow' }, '교회 ' + st.list.length + '곳 (만든 순서)')];
      kids.push(st.list.length ? el('div', { class: 'aa-grid' }, ...st.list.map(card)) : el('div', { class: 'card' }, el('p', { class: 'msg' }, '아직 교회가 없어요.')));
      kids.push(st.add ? addForm() : el('button', { class: 'aa-add', type: 'button', onclick: () => { st.add = true; redraw(); } }, el('span', null, '+'), '교회 만들기'));
      const lb = logBox(); if (lb) kids.push(lb);
      return kids;
    }
    redraw();
    return sec;
  }
  window.Views = Object.assign(window.Views || {}, { churches: { render } });
})();
