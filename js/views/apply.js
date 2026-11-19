/* 교회 신청 화면: church_apply_admin_list 결과를 기다림 → 만듦 → 거절 순서(서버 순서 그대로)로 그린다.
   연락처·대표 목사님 이름은 이 화면에만 쓰려고 받은 것이다. 메모리에서만 쓰고 저장·콘솔 출력·정렬 기준으로 쓰지 않는다.
   서버 글은 모두 textContent로만 넣는다(UI.el). */
(function () {
  const { el, toast } = UI;
  const OPEN = { off: '지금은 신청을 받지 않아요', admins: '지금은 앱 관리자만 신청을 받아요', on: '지금 신청을 받고 있어요' };
  const GROUPS = [['대기', '기다림'], ['만듦', '만듦 (신청한 분이 앱에서 시작하기를 기다리는 중)'], ['거절', '거절']];
  const PHONE = /^[0-9+() -]{9,20}$/;

  // 코드 정규화: 대문자로 바꾸고 영문 대문자·숫자·한글만 남긴다(서버와 같은 규칙, 마지막 판단은 서버)
  const norm = v => String(v || '').toUpperCase().replace(/[^A-Z0-9가-힣]/g, '');
  // 소개 주소는 http(s)일 때만 링크로 만든다
  function safeUrl(v) {
    try { const u = new URL(String(v)); return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null; } catch (e) { return null; }
  }
  const val = (label, node) => [el('dt', null, label), el('dd', null, node)];
  const text = v => (v ? String(v) : '-');

  function contactNode(v) {
    const t = String(v || '');
    if (!t) return '-';
    return PHONE.test(t) ? el('a', { class: 'aa-a', href: 'tel:' + t.replace(/[^0-9+]/g, '') }, t) : t;
  }
  function siteNode(v) {
    const t = String(v || '');
    if (!t) return '-';
    const href = safeUrl(t);
    return href ? el('a', { class: 'aa-a', href, target: '_blank', rel: 'noopener noreferrer' }, t) : t;
  }

  function render(first, ctx) {
    const st = { data: first, open: {}, made: {}, busy: false };   // open: 신청 번호 → 'make'|'reject'
    const sec = el('section', null);

    function setData(d) { st.data = { open: d.open, items: d.items || [] }; if (ctx && ctx.changed) ctx.changed(st.data); }
    const redraw = () => sec.replaceChildren(...build());

    function tags(it) {
      const t = [];
      if (it.dup > 0) t.push('같은 이름의 신청 ' + it.dup + '건 더 있어요');
      if (it.sameChurch) t.push('같은 이름의 교회가 이미 있어요');
      if (it.inChurch) t.push('신청한 분이 이미 다른 교회에 들어가 있어요');
      return t.length ? el('div', { class: 'ch-todos' }, ...t.map(x => el('span', { class: 'ch-todo' }, x))) : null;
    }

    // 만들기 폼. 입력하는 동안 다시 그리지 않는다(미리보기 글만 바꾼다)
    function makeForm(it) {
      const err = el('p', { class: 'aa-err', role: 'alert', hidden: true });
      const name = el('input', { class: 'field', type: 'text', maxlength: '40', value: it.name || '', autocomplete: 'off' });
      const code = el('input', { class: 'field', type: 'text', maxlength: '40', autocomplete: 'off', autocapitalize: 'characters', placeholder: '예: SAMPLE1' });
      const dept = el('input', { class: 'field', type: 'text', maxlength: '12', value: '첫 부서', autocomplete: 'off' });
      const prev = el('p', { class: 'hint' }, '영문·숫자·한글 3~30자. 소문자는 대문자로 저장돼요.');
      code.addEventListener('input', () => {
        const n = norm(code.value);
        prev.textContent = n ? '이렇게 저장돼요: ' + n : '영문·숫자·한글 3~30자. 소문자는 대문자로 저장돼요.';
      });
      const actions = el('div', { class: 'actions' });
      const showErr = m => { err.textContent = m; err.hidden = !m; };
      const form = el('div', { class: 'aa-form' },
        el('label', { class: 'f' }, '교회 이름'), name,
        el('label', { class: 'f' }, '코드 (필수)'), code, prev,
        el('label', { class: 'f' }, '첫 부서 이름'), dept,
        err, actions);

      function stepAsk() {
        const n = name.value.trim(), c = norm(code.value), d = dept.value.trim();
        if (n.length < 1 || n.length > 40) return showErr('교회 이름은 1~40자로 적어 주세요.');
        if (c.length < 3 || c.length > 30) return showErr('코드는 영문·숫자·한글 3~30자로 적어 주세요.');
        if (d.length < 1 || d.length > 12) return showErr('부서 이름은 1~12자로 적어 주세요.');
        showErr('');
        [name, code, dept].forEach(x => { x.disabled = true; });
        actions.replaceChildren(
          el('p', { class: 'msg' }, '이 교회를 만들까요? 되돌릴 수 없어요.'),
          el('button', { class: 'btn small', type: 'button', onclick: () => run(n, c, d) }, '만들기'),
          el('button', { class: 'btn small ghost', type: 'button', onclick: stepEdit }, '다시 고치기'));
      }
      function stepEdit() {
        [name, code, dept].forEach(x => { x.disabled = false; });
        actions.replaceChildren(
          el('button', { class: 'btn small', type: 'button', onclick: stepAsk }, '다음'),
          el('button', { class: 'link quiet', type: 'button', onclick: () => { delete st.open[it.id]; redraw(); } }, '닫기'));
      }
      async function run(n, c, d) {
        if (st.busy) return;
        st.busy = true;
        actions.querySelectorAll('button').forEach(b => { b.disabled = true; });
        try {
          const r = await api.applyMake(it.id, n, c, d);
          setData(r);
          st.made[it.id] = r.made && r.made.code || c;
          delete st.open[it.id];
          toast('교회를 만들었어요.');
          st.busy = false; redraw();
        } catch (e) {
          st.busy = false;
          stepEdit(); showErr(e.message || '만들지 못했어요.');
        }
      }
      stepEdit();
      return form;
    }

    function rejectForm(it) {
      const err = el('p', { class: 'aa-err', role: 'alert', hidden: true });
      const why = el('input', { class: 'field', type: 'text', maxlength: '60', autocomplete: 'off', placeholder: '사유 (선택, 60자까지)' });
      const actions = el('div', { class: 'actions' });
      const showErr = m => { err.textContent = m; err.hidden = !m; };
      const form = el('div', { class: 'aa-form' },
        el('label', { class: 'f' }, '거절 사유'), why,
        el('p', { class: 'hint' }, '적은 사유는 신청한 분에게 그대로 보여요.'), err, actions);
      function stepEdit() {
        why.disabled = false;
        actions.replaceChildren(
          el('button', { class: 'btn small', type: 'button', onclick: stepAsk }, '다음'),
          el('button', { class: 'link quiet', type: 'button', onclick: () => { delete st.open[it.id]; redraw(); } }, '닫기'));
      }
      function stepAsk() {
        why.disabled = true;
        actions.replaceChildren(
          el('p', { class: 'msg' }, '이 신청을 거절할까요?'),
          el('button', { class: 'btn small', type: 'button', onclick: run }, '거절하기'),
          el('button', { class: 'btn small ghost', type: 'button', onclick: stepEdit }, '돌아가기'));
      }
      async function run() {
        if (st.busy) return;
        st.busy = true;
        actions.querySelectorAll('button').forEach(b => { b.disabled = true; });
        try {
          setData(await api.applyReject(it.id, why.value.trim()));
          delete st.open[it.id];
          toast('신청을 거절했어요.');
          st.busy = false; redraw();
        } catch (e) { st.busy = false; stepEdit(); showErr(e.message || '거절하지 못했어요.'); }
      }
      stepEdit();
      return form;
    }

    function card(it) {
      const kind = st.open[it.id];
      const dl = el('dl', { class: 'ap-info' },
        ...val('신청일', text(it.at)), ...val('지역', text(it.region)), ...val('교단', text(it.denom)),
        ...val('대표 목사님', text(it.pastor)), ...val('연락처', contactNode(it.contact)),
        ...val('대략 인원', text(it.size)), ...val('소개 주소', siteNode(it.site)));
      const kids = [
        el('div', { class: 'aa-head' }, el('b', null, text(it.name)),
          it.status !== '대기' ? el('span', { class: 'own-tag' }, it.status) : null),
        tags(it), dl];
      if (it.status === '거절' && it.reason) kids.push(el('p', { class: 'hint' }, '거절 사유: ' + it.reason));
      if (it.status === '만듦') {
        const c = st.made[it.id];
        kids.push(el('div', { class: 'aa-link' },
          el('p', { class: 'msg' }, c ? '교회를 만들었어요. 코드: ' + c : '교회를 만들었어요.'),
          el('p', { class: 'hint' }, '신청한 분이 코이데 앱에서 첫 관리자로 시작하기를 누르면 돼요. 링크를 보낼 필요가 없어요.')));
      }
      if (it.status === '대기') {
        if (kind === 'make') kids.push(makeForm(it));
        else if (kind === 'reject') kids.push(rejectForm(it));
        else kids.push(el('div', { class: 'aa-acts' },
          el('button', { class: 'btn small', type: 'button', onclick: () => { st.open[it.id] = 'make'; redraw(); } }, '만들기'),
          el('button', { class: 'btn small ghost', type: 'button', onclick: () => { st.open[it.id] = 'reject'; redraw(); } }, '거절')));
      }
      return el('div', { class: 'card aa-card' + (it.status === '거절' ? ' stopped' : '') }, ...kids);
    }

    function build() {
      const d = st.data, items = d.items || [];
      const kids = [el('h1', null, '교회 신청'),
        el('p', { class: 'aa-sum' }, OPEN[d.open] || '신청 상태를 알 수 없어요', ' (바꾸는 일은 교회 메뉴에서 해요)')];
      if (!items.length) { kids.push(el('div', { class: 'card' }, el('p', { class: 'msg' }, '신청이 없어요.'))); return kids; }
      GROUPS.forEach(([status, label]) => {
        const list = items.filter(i => i.status === status);
        if (!list.length) return;
        kids.push(el('p', { class: 'eyebrow ap-group' }, label + ' ' + list.length + '건'));
        kids.push(el('div', { class: 'aa-grid' }, ...list.map(card)));
      });
      return kids;
    }

    redraw();
    return sec;
  }
  window.Views = Object.assign(window.Views || {}, { apply: { render } });
})();
