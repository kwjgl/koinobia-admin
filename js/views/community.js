/* 공동체 점검: ① 상태별 요약 ② 신고 들어온 공동체 ③ 직접 찾기. 공동체 목록·회원 목록은 만들지 않는다(서버에 그런 함수가 없다).
   신고 글(note)에는 이름이 적혀 있을 수 있다. 운영자가 읽으라고 받은 글이라 가리지 않지만 메모리에서만 쓰고
   복사·저장 기능을 두지 않는다. 공동체 번호·초대 토큰은 저장하지 않고, 토큰 입력 칸은 글자를 가린다. 글은 textContent로만 넣는다. */
(function () {
  const { el, toast } = UI;
  const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const MASK = '5명 미만이라 가렸어요';
  const MASK_PLACE = '5곳 미만이라 가렸어요';   // 공동체 수를 세는 칸

  function when(v) {
    const d = new Date(v);
    return isNaN(d) ? '-' : (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
  }
  const ymd = v => (v ? String(v).slice(0, 10) : '-');

  // 옛 서버가 가림 값(small)을 주면 0이 아니라 안내 글로 보인다
  function stat(label, o, fmt, mask) {
    return el('div', null, el('dt', null, label), el('dd', { class: o && o.small ? 'st-mask' : null }, o && !o.small ? fmt(o) : (mask || MASK)));
  }

  // 상세(신고 목록 포함)와 닫기. onClosed는 닫은 뒤 목록을 새로 받아 오라는 신호
  function detail(d, onClosed) {
    const box = el('div', { class: 'aa-link cm-detail' });
    const reports = Array.isArray(d.reports) ? d.reports : [];
    const acts = el('div', { class: 'actions' });
    const err = el('p', { class: 'aa-err', role: 'alert', hidden: true });
    let busy = false;
    function stepIdle() {
      if (d.status === '닫음' || d.status === '끝남') { acts.replaceChildren(el('span', { class: 'hint' }, d.status === '닫음' ? '이미 닫은 공동체예요.' : '이미 끝난 공동체예요.')); return; }
      acts.replaceChildren(el('button', { class: 'btn small', type: 'button', onclick: stepAsk }, '닫기'));
    }
    function stepAsk() {
      acts.replaceChildren(
        el('p', { class: 'msg' }, '닫으면 되돌릴 수 없고 30일 뒤 지워져요. 닫을까요?'),
        el('button', { class: 'btn small', type: 'button', onclick: run }, '닫기'),
        el('button', { class: 'btn small ghost', type: 'button', onclick: stepIdle }, '돌아가기'));
    }
    async function run() {
      if (busy) return;
      busy = true; acts.querySelectorAll('button').forEach(b => { b.disabled = true; });
      try { await api.communityClose(d.id); toast('공동체를 닫았어요.'); busy = false; d.status = '닫음'; stepIdle(); if (onClosed) onClosed(); }
      catch (e) { busy = false; err.textContent = e.message || '닫지 못했어요.'; err.hidden = false; stepAsk(); }
    }
    stepIdle();
    box.append(
      el('p', { class: 'msg' }, el('b', null, String(d.name || '이름 없음'))),
      el('dl', { class: 'ap-info' },
        el('dt', null, '상태'), el('dd', null, String(d.status || '-')),
        el('dt', null, '만든 날'), el('dd', null, ymd(d.created_at)),
        el('dt', null, '끝나는 날'), el('dd', null, ymd(d.endsOn)),
        el('dt', null, '함께하는 사람'), el('dd', null, num(d.n) + '명')),
      el('p', { class: 'label' }, '신고 ' + reports.length + '건'),
      ...reports.map(r => el('div', { class: 'cm-rep' },
        el('p', { class: 'hint' }, when(r.at) + ' · ' + String(r.reason || '') + ' · ' + String(r.status || '')),
        r.note ? el('p', { class: 'fb-text' }, String(r.note)) : null)),
      err, acts);
    return box;
  }

  function render(d) {
    const st = { health: d.health, reports: d.reports, open: {}, found: null, findErr: '' };
    const ctx = d.ctx || {};
    const sec = el('section', null);
    const redraw = () => sec.replaceChildren(...build());

    async function refresh() {
      try {
        const r = await Promise.all([api.communityHealth(), api.communityReports()]);
        st.health = r[0]; st.reports = r[1];
        if (ctx.changed) ctx.changed((st.reports.items || []).reduce((n, i) => n + num(i.new_count), 0));
      } catch (e) { toast(e.message || '목록을 새로 받지 못했어요.'); }
      redraw();
    }

    async function openDetail(it) {
      if (st.open[it.community_id]) { delete st.open[it.community_id]; return redraw(); }
      try { st.open[it.community_id] = await api.communityLookup(it.community_id); redraw(); }
      catch (e) { toast(e.message || '자세히 불러오지 못했어요.'); }
    }

    function reportCard(it) {
      const reasons = Object.entries(it.reasons || {}).map(([k, n]) => el('span', { class: 'ch-todo warn' }, k + ' ' + num(n) + '건'));
      const d2 = st.open[it.community_id];
      return el('div', { class: 'card aa-card' },
        el('div', { class: 'aa-head' }, el('b', null, String(it.name || '이름 없음')), el('span', { class: 'own-tag' }, String(it.status || ''))),
        el('p', { class: 'hint' }, '새 신고 ' + num(it.new_count) + '건 (전체 ' + num(it.total_count) + '건) · 마지막 ' + when(it.last_at)),
        reasons.length ? el('div', { class: 'ch-todos' }, ...reasons) : null,
        d2 ? detail(d2, refresh) : null,
        el('div', { class: 'aa-acts' }, el('button', { class: 'btn small ghost', type: 'button', onclick: () => openDetail(it) }, d2 ? '접기' : '자세히 보기')));
    }

    function finder() {
      const key = el('input', { class: 'field', type: 'password', autocomplete: 'off', placeholder: '공동체 번호 또는 초대 토큰', 'aria-label': '공동체 번호 또는 초대 토큰' });
      const err = el('p', { class: 'aa-err', role: 'alert', hidden: !st.findErr }, st.findErr);
      const go = async () => {
        const k = key.value.trim();
        if (!k) return;
        st.findErr = ''; st.found = null;
        try { st.found = await api.communityLookup(k); } catch (e) { st.findErr = e.message || '찾지 못했어요.'; }
        key.value = ''; redraw();
      };
      key.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      return el('div', { class: 'card aa-form' },
        UI.withInfo(el('label', { class: 'f' }, '직접 찾기'), '입력한 값은 저장하지 않아요. 초대 토큰은 비밀이라 글자를 가려요.'), key,
        err,
        el('div', { class: 'actions' }, el('button', { class: 'btn small', type: 'button', onclick: go }, '찾기')),
        st.found ? detail(st.found, async () => { await refresh(); }) : null);
    }

    function build() {
      const h = st.health || {}, bs = h.by_status || {}, items = (st.reports && st.reports.items) || [];
      const kids = [UI.withInfo(el('h1', null, '공동체'), '신고 글에는 이름이 적혀 있을 수 있어서 복사나 저장 기능을 두지 않았어요.'),
        el('p', { class: 'eyebrow' }, '지금 상태'),
        el('div', { class: 'card' }, el('dl', { class: 'aa-stats three' },
          stat('열림', bs['열림'], o => o.n + '곳', MASK_PLACE), stat('끝맺음', bs['끝맺음'], o => o.n + '곳', MASK_PLACE), stat('닫음', bs['닫음'], o => o.n + '곳', MASK_PLACE),
          stat('열린 곳 평균 인원', h.avg_members_open, o => (Math.round(num(o.v) * 10) / 10) + '명'),
          stat('14일 안에 끝나는 곳', h.ending_14d, o => o.n + '곳', MASK_PLACE))),
        el('p', { class: 'eyebrow' }, '신고가 들어온 공동체')];
      if (!items.length) kids.push(el('div', { class: 'card' }, el('p', { class: 'msg' }, '새 신고가 없어요.')));
      else kids.push(el('div', { class: 'aa-grid' }, ...items.map(reportCard)));
      kids.push(finder());
      return kids;
    }

    redraw();
    return sec;
  }
  window.Views = Object.assign(window.Views || {}, { community: { render } });
})();
