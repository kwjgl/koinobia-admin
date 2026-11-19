/* 의견함: admin_feedback_list 결과를 최신 순(서버 순서 그대로)으로 그린다.
   의견 글에는 이름이 적혀 있을 수 있다. 운영자가 읽으라고 받은 글이라 가리지 않지만, 화면 메모리에서만 쓰고
   복사·저장 기능을 두지 않으며 저장소·콘솔·주소에 남기지 않는다. 글은 textContent로만 넣는다(UI.el). */
(function () {
  const { el, toast } = UI;
  const STEPS = [50, 100, 200];

  function when(v) {
    const d = new Date(v);
    if (isNaN(d)) return '-';
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function render(first, ctx) {
    const st = { data: first, limit: STEPS[0], only: false, busy: false, err: '' };
    const sec = el('section', null);
    const redraw = () => sec.replaceChildren(...build());

    async function reload() {
      if (st.busy) return;
      st.busy = true; st.err = ''; redraw();
      try { st.data = await api.feedbackList(st.limit, st.only); if (ctx && ctx.changed) ctx.changed(st.data.unread); }
      catch (e) { st.err = e.message || '불러오지 못했어요.'; }
      st.busy = false; redraw();
    }

    async function markRead(it) {
      if (it.read) return;
      it.read = true; st.data.unread = Math.max(0, Number(st.data.unread) - 1);   // 먼저 바꿔 보이고, 실패하면 되돌린다
      if (ctx && ctx.changed) ctx.changed(st.data.unread);
      redraw();
      try { await api.feedbackRead(it.id); }
      catch (e) {
        it.read = false; st.data.unread = Number(st.data.unread) + 1;
        if (ctx && ctx.changed) ctx.changed(st.data.unread);
        redraw(); toast(e.message || '읽음으로 바꾸지 못했어요.');
      }
    }

    function card(it) {
      const kids = [
        el('div', { class: 'aa-head' }, el('span', { class: 'own-tag' }, it.kind || '의견'),
          !it.read ? el('span', { class: 'ch-todo' }, '안 읽음') : null,
          el('span', { class: 'hint fb-when' }, when(it.at))),
        el('p', { class: 'fb-text' }, String(it.text || '')),
        el('p', { class: 'hint' }, [it.named && it.nick ? String(it.nick) : '이름 없음', it.ver ? '앱 ' + it.ver : null, it.width ? '화면 폭 ' + it.width : null].filter(Boolean).join(' · '))];
      if (!it.read) kids.push(el('div', { class: 'aa-acts' }, el('button', { class: 'btn small', type: 'button', onclick: () => markRead(it) }, '읽었어요')));
      return el('div', { class: 'card aa-card' + (it.read ? ' stopped' : '') }, ...kids);
    }

    function build() {
      const d = st.data, items = d.items || [];
      const kids = [el('h1', null, '의견함'),
        el('p', { class: 'aa-sum' }, '안 읽은 의견 ' + (Number(d.unread) || 0) + '건'),
        el('div', { class: 'aa-acts fb-bar' },
          el('button', { class: 'btn small ghost', type: 'button', 'aria-pressed': st.only ? 'true' : 'false', disabled: st.busy,
            onclick: () => { st.only = !st.only; st.limit = STEPS[0]; reload(); } }, '안 읽은 것만 보기'))];
      if (st.err) kids.push(el('p', { class: 'aa-err', role: 'alert' }, st.err));
      if (!items.length) { kids.push(el('div', { class: 'card' }, el('p', { class: 'msg' }, st.only ? '안 읽은 의견이 없어요.' : '받은 의견이 없어요.'))); return kids; }
      kids.push(el('div', { class: 'aa-grid' }, ...items.map(card)));
      if (items.length >= st.limit) {
        const next = STEPS.find(x => x > st.limit);
        kids.push(next ? el('button', { class: 'btn ghost wide fb-more', type: 'button', disabled: st.busy, onclick: () => { st.limit = next; reload(); } }, '더 보기')
          : el('p', { class: 'hint' }, '가장 최근 ' + st.limit + '건까지 보여 줘요.'));
      }
      kids.push(el('p', { class: 'hint' }, '의견에는 이름이 적혀 있을 수 있어서 복사나 저장 기능을 두지 않았어요.'));
      return kids;
    }

    redraw();
    return sec;
  }
  window.Views = Object.assign(window.Views || {}, { feedback: { render } });
})();
