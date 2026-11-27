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

  // 운영 안내: 자주 하는 일의 순서. 늘 같은 글이라 서버 값은 쓰지 않는다. 처음엔 접혀 있다
  const GUIDE = [
    ['새 교회 신청이 왔을 때', 'apply', '교회 신청',
      ['신청 카드에서 "같은 이름의 신청", "같은 이름의 교회" 표시를 먼저 봐요.', '맞으면 "만들기"에서 코드(영문·숫자·한글 3~30자)와 첫 부서 이름을 적고 확인해요.', '만든 뒤 "안내 문구 복사"로 신청한 분께 연락해요. 그분이 코이데 앱에서 첫 관리자로 시작하기를 누르면 끝이에요.', '거절하면 적은 사유가 신청한 분에게 그대로 보여요.']],
    ['교회를 열기 전에', 'church', '교회',
      ['먼저 "테스트" 교회를 만들어 이름 바꾸기, 멈춤, 코드, 초대 링크를 한 번씩 눌러 봐요. 끝나면 테스트 교회는 멈춤으로 둬요.', '스위치는 "관리자만"으로 먼저 걸어 보고 문제가 없으면 "켜짐"으로 바꿔요.', '"켜짐"으로 바꿀 때는 개인정보 처리방침과 준비를 마쳤다는 확인이 필요해요.']],
    ['스위치를 바꿀 때', 'church', '교회',
      ['원하는 값을 누르면 확정 상자가 열려요. 바꾸면 어떻게 되는지 읽고 "바꾸기 확정"을 눌러야 서버에 가요.', '바꾼 일은 교회 화면 맨 아래 "최근 바꾼 일"에 남아요.']],
    ['이용 단계와 기간을 정리할 때', 'church', '교회',
      ['교회 카드의 "이용 단계"에서 단계(시범·무료·유료), 끝나는 날, 메모를 기록해요. 입금을 확인한 뒤 손으로 바꿔요. 기능을 막지는 않아요.', '오늘 화면에 "30일 안에 끝나는 교회"와 "기간이 지난 교회"가 보여요. 누르면 그 교회만 걸러져 열려요.', '목록을 시트로 옮기려면 교회 화면 아래 "CSV 내려받기(운영용)"를 써요.']],
    ['의견과 신고', 'feedback', '의견함',
      ['의견은 읽고 "읽었어요"를 눌러요. 쌓였으면 종류로 거른 뒤 "보이는 것 모두 읽었어요"를 쓸 수 있어요.', '공동체 신고는 공동체 메뉴에서 "자세히 보기"로 봐요. 공동체를 닫으면 되돌릴 수 없고 30일 뒤 지워져요.']],
    ['화면이 이상할 때', 'storage', '저장 공간',
      ['"서버 SQL이 아직 없어요"가 보이면 저장 공간 화면 맨 아래 "서버 준비 상태"에서 "점검하기"를 눌러 어느 번호가 빠졌는지 봐요.', '로그인이 안 되면 코이데에서 쓰던 로그인 방법과 같은지 확인해요.', '공용 컴퓨터에서는 다 쓰고 꼭 로그아웃해요.']]
  ];
  let guideOpen = false;   // 5분마다 오늘 화면을 새로 그려도 열어 둔 안내가 닫히지 않게 기억한다
  function guide() {
    const box = el('details', { class: 'card aa-log gd', open: guideOpen ? true : null }, el('summary', null, '운영 안내 (자주 하는 일)'),
      ...GUIDE.flatMap(([title, go, name, items]) => [
        el('p', { class: 'gd-title' }, el('b', null, title), ' ', el('a', { class: 'aa-a', href: '#/' + go }, name + ' 메뉴')),
        el('ul', { class: 'gd-list' }, ...items.map(x => el('li', null, x)))]));
    box.addEventListener('toggle', () => { guideOpen = box.open; });
    return box;
  }

  function render(t, alerts) {
    const ap = t.apply || {}, ch = t.churches || {}, db = t.db || {}, sw = t.switches || {};
    const pct = num(db.percent);
    const rows = [];
    const ending = num(t.plan_ending), ended = num(t.plan_ended);   // 042 전 서버는 주지 않는다
    if (num(ap.pending)) rows.push(row('신청 기다림', num(ap.pending) + '건', 'apply'));
    if (num(t.feedback_unread)) rows.push(row('안 읽은 의견', num(t.feedback_unread) + '건', 'feedback'));
    if (num(t.reports_new)) rows.push(row('새 신고', num(t.reports_new) + '건', 'community'));
    if (num(ch.no_admin)) rows.push(row('활동 관리자가 아직 없는 교회', num(ch.no_admin) + '곳', 'church?f=noadmin'));
    if (ending) rows.push(row('이용 기간이 30일 안에 끝나는 교회', ending + '곳', 'church?f=ending'));
    if (ended) rows.push(row('이용 기간이 지난 교회', ended + '곳', 'church?f=ended'));
    if (num(ch.stopped)) rows.push(row('멈춘 교회', num(ch.stopped) + '곳', 'church?f=stopped'));
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
    kids.push(guide());
    return el('section', null, ...kids);
  }
  window.Views = Object.assign(window.Views || {}, { today: { render } });
})();
