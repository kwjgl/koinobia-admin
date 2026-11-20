/* 오늘 화면: admin_today 결과를 받은 일 카드 줄로 그린다. 받은 일 개수는 운영 사실이라 5명 미만 가림을 쓰지 않는다. */
(function () {
  const { el } = UI;
  const SW = { off: '꺼짐', admins: '관리자만', on: '켜짐' };
  const SWITCHES = [['church_open', '교회 열기'], ['church_apply', '교회 신청 받기'], ['community_open', '공동체 열기']];

  // 숫자 한 줄 카드. go가 있으면 눌러서 그 메뉴로 간다
  function row(label, value, go, warn) {
    const body = [el('span', { class: 'td-label' }, label)];
    if (value != null && value !== '') body.push(el('b', { class: 'td-val' + (warn ? ' ch-todo' : '') }, value));
    return go ? el('a', { class: 'card td-row', href: '#/' + go }, ...body) : el('div', { class: 'card td-row' }, ...body);
  }
  const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

  // 이용 통계 이상 신호(040): 말과 일수만 보인다. 사람 수·그래프는 이용 통계 메뉴에서 본다.
  // alerts: 서버 결과 | 'sql'(040이 아직 없음) | null(다른 이유로 못 받음: 구역을 그리지 않는다)
  const APP_NAME = { koide: '코이데', didako: '디다코', telio: '텔리오' };
  const TABS = ['glance', 'feature', 'flow', 'back', 'time', 'device'];
  function alertText(a) {
    const app = APP_NAME[a.app] || '앱';
    if (a.code === 'silent') return app + '에서 ' + num((a.value || {}).silent_days) + '일째 기록이 들어오지 않아요. 통계 보내기가 꺼졌는지 확인해 보세요.';
    if (a.code === 'drop') return app + ' 활동한 사람이 평소보다 많이 줄었어요.';
    if (a.code === 'errors') return app + '에서 오류가 평소보다 많이 늘었어요.';
    return '';
  }
  function alertsSection(al) {
    if (al == null) return null;
    const head = el('p', { class: 'eyebrow' }, '이용 통계 이상 신호');
    if (al === 'sql') return [head, el('p', { class: 'hint' }, '이상 신호는 서버 040을 넣으면 보여요.')];
    const items = Array.isArray(al.items) ? al.items : [];
    if (items.some(i => i.code === 'track_off')) return [head, el('p', { class: 'hint' }, '이용 통계 기록이 꺼져 있어요.')];
    const warns = items.filter(i => i.level === 'warn' && alertText(i));
    if (!warns.length) {
      const quiet = (al.apps || []).some(x => x.status === 'quiet');
      const hint = el('p', { class: 'hint' }, '이용 통계에서 이상한 점이 보이지 않아요.');
      return [head, quiet ? UI.withInfo(hint, '조용한 앱이 있어 그 앱은 판단을 쉬었어요.', { label: '이상 신호 도움말' }) : hint];
    }
    return [head, el('div', { class: 'td-rows' }, ...warns.map(i => {
      const q = new URLSearchParams({ tab: TABS.includes(i.tab) ? i.tab : 'glance', app: APP_NAME[i.app] ? i.app : '' });
      return row(alertText(i), '확인', 'usage?' + q.toString(), true);
    }))];
  }

  function render(t, alerts) {
    const ap = t.apply || {}, ch = t.churches || {}, db = t.db || {}, sw = t.switches || {};
    const pct = num(db.percent);
    const rows = [];
    const ending = num(t.plan_ending != null ? t.plan_ending : ch.plan_ending), ended = num(t.plan_ended != null ? t.plan_ended : ch.plan_ended);   // 042 전 서버는 주지 않는다
    if (num(ap.pending)) rows.push(row('신청 기다림', num(ap.pending) + '건', 'apply'));
    if (num(t.feedback_unread)) rows.push(row('안 읽은 의견', num(t.feedback_unread) + '건', 'feedback'));
    if (num(t.reports_new)) rows.push(row('새 신고', num(t.reports_new) + '건', 'community'));
    if (num(ch.no_admin)) rows.push(row('활동 관리자가 아직 없는 교회', num(ch.no_admin) + '곳', 'church'));
    if (ending) rows.push(row('이용 기간이 30일 안에 끝나는 교회 ' + ending + '곳', null, 'church'));
    if (ended) rows.push(row('이용 기간이 지난 교회 ' + ended + '곳', null, 'church'));
    if (num(ch.stopped)) rows.push(row('멈춘 교회', num(ch.stopped) + '곳', 'church'));
    const kids = [el('h1', null, '오늘')];
    kids.push(rows.length ? el('div', { class: 'td-rows' }, ...rows) : el('div', { class: 'card' }, el('p', { class: 'msg' }, '오늘 할 일이 없어요.')));
    const as = alertsSection(alerts);
    if (as) kids.push(...as);
    kids.push(el('p', { class: 'eyebrow' }, '지금 상태'));
    kids.push(el('div', { class: 'td-rows' },
      row('저장 공간', pct + '%', 'storage', pct > 70),
      row('교회', num(ch.total) + '곳 (테스트 ' + num(ch.test) + '곳 포함)', 'church'),
      ...SWITCHES.map(([k, name]) => row(name, SW[sw[k]] || '알 수 없음', 'church'))));
    if (sw.usage_track === 'off' && (alerts == null || alerts === 'sql')) kids.push(el('p', { class: 'hint' }, '이용 통계 기록이 꺼져 있어요.'));
    return el('section', null, ...kids);
  }
  window.Views = Object.assign(window.Views || {}, { today: { render } });
})();
