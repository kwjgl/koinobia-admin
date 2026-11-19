/* 오늘 화면: admin_today 결과를 받은 일 카드 줄로 그린다. 받은 일 개수는 운영 사실이라 5명 미만 가림을 쓰지 않는다. */
(function () {
  const { el } = UI;
  const SW = { off: '꺼짐', admins: '관리자만', on: '켜짐' };
  const SWITCHES = [['church_open', '교회 열기'], ['church_apply', '교회 신청 받기'], ['community_open', '공동체 열기']];

  // 숫자 한 줄 카드. go가 있으면 눌러서 그 메뉴로 간다
  function row(label, value, go, warn) {
    const body = [el('span', { class: 'td-label' }, label), el('b', { class: 'td-val' + (warn ? ' ch-todo' : '') }, value)];
    return go ? el('a', { class: 'card td-row', href: '#/' + go }, ...body) : el('div', { class: 'card td-row' }, ...body);
  }
  const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

  function render(t) {
    const ap = t.apply || {}, ch = t.churches || {}, db = t.db || {}, sw = t.switches || {};
    const pct = num(db.percent);
    const rows = [];
    if (num(ap.pending)) rows.push(row('신청 기다림', num(ap.pending) + '건', 'apply'));
    if (num(t.feedback_unread)) rows.push(row('안 읽은 의견', num(t.feedback_unread) + '건', 'feedback'));
    if (num(t.reports_new)) rows.push(row('새 신고', num(t.reports_new) + '건', 'community'));
    if (num(ch.no_admin)) rows.push(row('활동 관리자가 아직 없는 교회', num(ch.no_admin) + '곳', 'church'));
    if (num(ch.stopped)) rows.push(row('멈춘 교회', num(ch.stopped) + '곳', 'church'));
    const kids = [el('h1', null, '오늘')];
    kids.push(rows.length ? el('div', { class: 'td-rows' }, ...rows) : el('div', { class: 'card' }, el('p', { class: 'msg' }, '오늘 할 일이 없어요.')));
    kids.push(el('p', { class: 'eyebrow' }, '지금 상태'));
    kids.push(el('div', { class: 'td-rows' },
      row('저장 공간', pct + '%', 'storage', pct > 70),
      row('교회', num(ch.total) + '곳 (테스트 ' + num(ch.test) + '곳 포함)', 'church'),
      ...SWITCHES.map(([k, name]) => row(name, SW[sw[k]] || '알 수 없음', 'church'))));
    if (sw.usage_track === 'off') kids.push(el('p', { class: 'hint' }, '이용 통계 기록이 꺼져 있어요.'));
    return el('section', null, ...kids);
  }
  window.Views = Object.assign(window.Views || {}, { today: { render } });
})();
