/* ?demo: 가짜 서버. 화면 확인용이라 이름과 숫자는 모두 지어낸 것이다. 쓰기는 메모리에만 반영한다.
   ?demo  앱 관리자   ?demo=out  로그인 전   ?demo=notadmin  앱 관리자 아님   ?demo=error  첫 호출 실패
   ?demo=empty  신청·의견·신고 없음(교회 목록은 그대로)   ?demo=small  038 이전 서버 모양(공동체가 적어 5명 미만 가림 값이 나옴)
   (이용 통계) ?demo=small 038 이전 서버 모양 확인용(거의 다 가림)  ?demo=empty 기록 없음(가린 값 없음)  ?demo=error 첫 호출 뒤 이용 통계 호출이 계속 실패
   (이용 단계 042) ?demo&no042 교회 카드에 이용 단계 칸이 없는 옛 서버 모양(오늘 화면 줄도 없음)  이용 단계 저장은 메모리에만 반영
   ?demo&db=72 / ?demo&db=95  저장 공간 사용 비율을 바꿔 본다(기본 50)
   (이용 통계 040) ?demo&no040 핵심 지표·이상 신호·기능과 다시 오기·묶음 비교·출시 표시 함수가 없는 모양  &floor 오래된 기록이 접힌 모양  &alert=none|off|quiet 이상 신호 없음·기록 꺼짐·조용한 앱
   (이용 통계 041) ?demo&no041 연구 탭(코드북·수집 변경 기록·연구용 내보내기) 함수가 없는 모양. 수집 변경 기록 추가는 메모리에만 반영
   (이름이 나오는 화면을 만들 때 `<b>굵게</b>`처럼 HTML을 넣어 글자로만 보이는지 본다) */
(function () {
  const q = new URLSearchParams(location.search);
  if (!q.has('demo')) return;
  const mode = q.get('demo') || 'in';
  let failed = false;
  // 서버가 돌려줄 오류와 같은 모양({code, message, status})으로 거절한다
  const err = (code, message, status) => Object.assign(new Error(message), { code, message, status });
  // 교회 신청(HTML이 든 이름은 글자로만 보이는지 보려고 일부러 넣었다)
  const applies = mode === 'empty' ? [] : [
    { id: 'a1', status: '대기', at: '11월 19일', region: '가상시 가나구', name: '<b>은혜</b>교회', denom: '예시교단', pastor: '<i>김예시</i> 목사', contact: '010-0000-0001', size: '30명쯤', site: 'https://example.com/eunhye', reason: '', dup: 1, sameChurch: false, inChurch: false, churchId: null },
    { id: 'a2', status: '대기', at: '11월 18일', region: '가상시 나다구', name: '샘물교회', denom: '', pastor: '이예시 목사', contact: 'pastor@example.com', size: '', site: 'javascript:alert(1)', reason: '', dup: 0, sameChurch: true, inChurch: false, churchId: null },
    { id: 'a3', status: '대기', at: '11월 17일', region: '', name: '새벽빛교회', denom: '예시교단', pastor: '박예시 목사', contact: '02-000-0003', size: '10명 안팎', site: '', reason: '', dup: 0, sameChurch: false, inChurch: true, churchId: null },
    { id: 'a4', status: '만듦', at: '11월 10일', region: '가상시', name: '소망교회', denom: '예시교단', pastor: '최예시 목사', contact: '010-0000-0004', size: '50명', site: '', reason: '', dup: 0, sameChurch: false, inChurch: false, churchId: 'c-demo-4' },
    { id: 'a5', status: '거절', at: '11월 5일', region: '', name: '시험교회', denom: '', pastor: '정예시', contact: '', size: '', site: '', reason: '신청 정보를 확인할 수 없었어요', dup: 0, sameChurch: false, inChurch: false, churchId: null }
  ];
  const usedCodes = ['KOIDE1', 'SAMPLE'];
  const rank = { '대기': 0, '만듦': 1, '거절': 2 };
  const applyList = () => ({ open: 'on', items: JSON.parse(JSON.stringify(applies.slice().sort((a, b) => rank[a.status] - rank[b.status]))) });
  const bad = m => err('P0001', 'bad: ' + m, 400);
  const find = id => applies.find(a => a.id === id && a.status === '대기') || (() => { throw bad('신청을 찾을 수 없어요.'); })();
  // 교회 목록·스위치·운영 기록(이름은 지어낸 것, HTML이 든 이름은 글자로만 보이는지 보려는 것)
  const dayStr = n => { const d = new Date(Date.now() + n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const mk = (id, name, kind, status, codes, counts, has_admin, invite_pending, plan, plan_until, plan_note) => ({ id, name, kind, status, plan, plan_until: plan_until || null, plan_note: plan_note || null, created_at: '2026-10-01', codes, counts, invite_pending, has_admin });
  const churches = [
    mk('c1', '<b>사랑</b>교회', '교회', '열림', [{ code: 'LOVE1', status: '열림' }, { code: 'LOVE2', status: '멈춤' }], { members: 12, depts: 2, households: 5, linked: 1, admins: 2 }, true, false, '유료', dayStr(20), '입금 확인 2026-11-20 <b>예시</b>'),
    mk('c2', '멈춘교회', '교회', '멈춤', [{ code: 'STOP1', status: '열림' }], { members: 3, depts: 1, households: 1, linked: 0, admins: 1 }, true, false, '시범'),
    mk('c3', '<i>시험</i> 공간', '테스트', '열림', [{ code: 'TEST1', status: '열림' }], { members: 1, depts: 1, households: 0, linked: 0, admins: 1 }, true, false, '시범'),
    mk('c4', '새싹교회', '교회', '열림', [{ code: 'SPROUT', status: '열림' }], { members: 0, depts: 1, households: 0, linked: 0, admins: 0 }, false, true, '무료', dayStr(-3))
  ];
  const settings = { church_open: 'admins', church_apply: 'on', community_open: 'on', usage_track: 'off', didako_community_open: 'admins' };
  const allowed = { church_open: ['off', 'admins', 'on'], church_apply: ['off', 'admins', 'on'], community_open: ['off', 'admins', 'on'], usage_track: ['on', 'off'], didako_community_open: ['off', 'admins', 'on'] };
  const logs = [{ at: '2026-11-18T09:30:00+09:00', action: 'setting', target: 'church_apply=on' }, { at: '2026-11-17T20:05:00+09:00', action: 'church-create', target: 'c3' },
    { at: '2026-11-16T11:00:00+09:00', action: 'church-plan', target: 'c4=무료' }, { at: '2026-11-15T10:20:00+09:00', action: 'church-state', target: 'c2=멈춤' },
    { at: '2026-11-14T16:45:00+09:00', action: 'invite', target: 'c4' }, { at: '2026-11-12T09:10:00+09:00', action: 'setting', target: 'usage_track=off' }, { at: '2025-12-30T09:00:00+09:00', action: 'church-rename', target: 'c1' }];
  const putLog = (action, target) => { logs.unshift({ at: new Date().toISOString(), action, target }); };
  churches.forEach(c => c.codes.forEach(x => usedCodes.push(x.code)));
  const normCode = v => String(v || '').toUpperCase().replace(/[^A-Z0-9가-힣]/g, '');
  const cList = () => ({ items: JSON.parse(JSON.stringify(churches)).map(c => { if (q.has('no042')) { delete c.plan; delete c.plan_until; delete c.plan_note; } return c; }) });
  const planEnd = (a, b) => churches.filter(c => c.plan_until && c.plan_until >= dayStr(a) && c.plan_until <= dayStr(b)).length;
  const sList = () => ({ items: Object.keys(settings).map(key => ({ key, value: settings[key], allowed: allowed[key] })) });
  const church = id => churches.find(c => c.id === id) || (() => { throw bad('교회를 찾지 못했어요.'); })();
  const addChurch = (name, kind, code) => {
    const c = mk('c-demo-' + (churches.length + 1), name, kind, '열림', [{ code, status: '열림' }], { members: 0, depts: 1, households: 0, linked: 0, admins: 0 }, false, false, '시범');
    churches.push(c); return c;
  };
  // 의견함(HTML이 든 글은 글자로만 보이는지 보려는 것)
  const fbAll = mode === 'empty' ? [] : [
    { id: 5, at: '2026-11-19T08:10:00+09:00', kind: '불편해요', text: '글씨가 <b>너무 작아서</b> 읽기 힘들어요.\n두 번째 줄도 줄바꿈이 보여야 해요.', named: true, nick: '<i>예시</i>님', ver: 'v2026-11-18', width: 360, read: false },
    { id: 4, at: '2026-11-18T21:40:00+09:00', kind: '이랬으면', text: '기도 시간을 알려 주면 좋겠어요.', named: false, nick: '', ver: 'v2026-11-18', width: 390, read: false },
    { id: 3, at: '2026-11-17T12:00:00+09:00', kind: '고마워요', text: '매일 잘 쓰고 있어요. 고맙습니다.', named: false, nick: '', ver: 'v2026-11-10', width: 1280, read: true },
    { id: 2, at: '2026-11-15T09:00:00+09:00', kind: '불편해요', text: '알림이 늦게 와요.', named: true, nick: '시험', ver: 'v2026-11-10', width: 412, read: true },
    { id: 1, at: '2026-11-12T17:30:00+09:00', kind: '이랬으면', text: '다른 사람 기도제목을 한눈에 보고 싶어요.', named: false, nick: '', ver: 'v2026-11-01', width: 375, read: true }
  ];
  const fbUnread = () => fbAll.filter(f => !f.read).length;
  // 공동체 점검(신고 글에도 HTML을 넣었다)
  const comms = {
    g1: { id: 'g1', name: '<b>아침</b> 기도 모임', status: '열림', created_at: '2026-10-02', endsOn: '2026-12-02', n: 8, reports: [{ at: '2026-11-18T10:00:00+09:00', reason: '기도제목이 맞지 않아요', note: '<b>굵게</b> 적힌 신고 글이에요.\n둘째 줄', status: '새로' }, { at: '2026-11-16T09:00:00+09:00', reason: '기도제목이 맞지 않아요', note: '', status: '새로' }, { at: '2026-11-10T09:00:00+09:00', reason: '다른 이유', note: '', status: '처리함' }] },
    g2: { id: 'g2', name: '예시 공동체', status: '끝맺음', created_at: '2026-09-20', endsOn: '2026-11-25', n: 5, reports: [{ at: '2026-11-17T22:00:00+09:00', reason: '다른 이유', note: '', status: '새로' }] },
    g3: { id: 'g3', name: '조용한 방', status: '열림', created_at: '2026-11-01', endsOn: '2026-12-31', n: 3, reports: [] }
  };
  const tokens = { 'demo-token': 'g1' };
  const commReports = () => ({ items: mode === 'empty' ? [] : Object.values(comms).map(c => {
    const nw = c.reports.filter(r => r.status === '새로');
    return nw.length && c.status !== '닫음' ? { community_id: c.id, name: c.name, status: c.status, new_count: nw.length, total_count: c.reports.length, last_at: nw[0].at, reasons: nw.reduce((m, r) => { m[r.reason] = (m[r.reason] || 0) + 1; return m; }, {}) } : null;
  }).filter(Boolean) });
  const health = () => mode === 'small'
    ? { by_status: { '열림': { n: null, small: true }, '끝맺음': { n: null, small: true }, '닫음': { n: null, small: true } }, avg_members_open: { v: null, small: true }, ending_14d: { n: null, small: true } }
    : { by_status: { '열림': { n: 12, small: false }, '끝맺음': { n: 6, small: false }, '닫음': { n: 2, small: false } }, avg_members_open: { v: 6.4, small: false }, ending_14d: { n: 5, small: false } };
  const dbPct = Math.min(100, Math.max(0, Number(q.get('db')) || 50));
  const dbSize = () => ({
    bytes: Math.round(524288000 * dbPct / 100), limit_bytes: 524288000, percent: dbPct, usage_events: mode === 'empty' ? 0 : 18342, oldest_event: mode === 'empty' ? null : '2026-04-21T03:00:00+09:00',
    top_tables: [['usage_event', 61865984, 18342], ['church_item', 20971520, 9120], ['church_member', 4194304, 1210], ['church_household', 2097152, 640], ['auth_user', 1048576, 480], ['admin_log', 524288, 120], ['church_dept', 262144, 60], ['church_code', 131072, 30], ['church_link', 65536, 12], ['koide_setting', 32768, 6]].map(t => ({ table: t[0], bytes: t[1], rows: t[2] }))
  });
  const today = () => ({
    apply: { pending: applies.filter(a => a.status === '대기').length, made: applies.filter(a => a.status === '만듦').length },
    feedback_unread: fbUnread(),
    reports_new: commReports().items.reduce((n, i) => n + i.new_count, 0),
    churches: { total: churches.length, test: churches.filter(c => c.kind === '테스트').length, stopped: churches.filter(c => c.status === '멈춤').length, no_admin: churches.filter(c => !c.has_admin).length },
    ...(q.has('no042') ? {} : { plan_ending: planEnd(0, 30), plan_ended: churches.filter(c => c.plan_until && c.plan_until < dayStr(0)).length }),
    db: { bytes: dbSize().bytes, limit_bytes: 524288000, percent: dbPct },
    switches: Object.assign({}, settings)
  });
  // 이용 통계(모두 지어낸 값). 038부터 서버는 가리지 않는다(small:false). ?demo=small만 옛 서버처럼 {n:null, small:true}를 준다.
  // ?demo&no037  행동 지표(037) 함수가 서버에 아직 없는 모양
  // ?demo 값 있음(가림 없음)  ?demo=small 038 이전 서버 모양(거의 다 가림)  ?demo=empty 기록 없음(가림 없음)  ?demo=error 이용 통계 호출이 계속 실패(첫 호출 뒤)
  const hh = s => { let x = 2166136261; for (const c of String(s)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return ((x >>> 0) % 1000) / 1000; };
  const vis = k => mode === 'empty' ? false : mode === 'small' ? hh(k) < 0.12 : true;
  const sm = mode === 'small';
  const N = (n, k) => mode === 'empty' ? { n: null, small: false } : !sm ? { n: Math.round(n), small: false } : vis(k) && n >= 5 ? { n: Math.round(n), small: false } : { n: null, small: true };
  const Rr = (r, k, base) => mode === 'empty' ? { r: null, small: false } : !sm ? { r: Math.round(r * 1e4) / 1e4, small: false } : vis(k) && (base === undefined || base >= 5) ? { r: Math.round(r * 1e4) / 1e4, small: false } : { r: null, small: true };
  const d2s = d => d.toISOString().slice(0, 10);
  const periods = (from, to, grain) => {
    const out = []; const d = new Date((from || '2026-10-21') + 'T00:00:00Z'), end = new Date((to || '2026-11-19') + 'T00:00:00Z');
    if (grain === 'week') d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    if (grain === 'month') d.setUTCDate(1);
    while (d <= end && out.length < 400) {
      out.push(d2s(d));
      if (grain === 'day') d.setUTCDate(d.getUTCDate() + 1); else if (grain === 'week') d.setUTCDate(d.getUTCDate() + 7); else d.setUTCMonth(d.getUTCMonth() + 1);
    }
    return out;
  };
  const GR = { day: 1, week: 2.4, month: 5 };
  const EV = [
    ['koide', 'note.open', '노트 열기', 'screen'], ['koide', 'note.item-add', '기도제목 추가', 'action'], ['koide', 'note.pray-start', '기도하기 시작', 'action'],
    ['koide', 'note.prayed', '기도했어요 누름(노트)', 'action'], ['koide', 'note.pray-done', '기도하기 마침', 'action'], ['koide', 'note.share', '나누기 열기', 'action'], ['koide', 'note.settings', '설정 열기', 'screen'], ['koide', 'note.error-save', '저장 오류', 'error'],
    ['koide', 'church.open', '교회 열기', 'screen'], ['koide', 'church.step-login', '교회 로그인 단계', 'screen'], ['koide', 'church.step-consent', '교회 동의 단계', 'screen'], ['koide', 'church.step-app', '교회 앱 안내 단계', 'screen'],
    ['koide', 'church.item-save', '교회 기도제목 저장', 'action'], ['koide', 'church.prayed', '기도했어요 누름(교회)', 'action'], ['koide', 'church.pray-start', '교회 기도하기 시작', 'action'], ['koide', 'church.pray-done', '교회 기도하기 마침', 'action'], ['koide', 'church.meet-done', '모임 모드 마침', 'action'], ['koide', 'church.error-sync', '교회 동기화 오류', 'error'],
    ['koide', 'community.list', '공동체 목록', 'screen'], ['koide', 'community.prayed', '기도했어요 누름(공동체)', 'action'], ['koide', 'community.pray-done', '공동체 기도하기 마침', 'action'], ['koide', 'community.create', '공동체 만들기', 'action'], ['koide', 'community.invite-create', '초대 만들기', 'action'], ['koide', 'community.first-topic', '첫 기도제목 올리기', 'action'], ['koide', 'community.error-join', '공동체 들어가기 오류', 'error'],
    ['didako', 'note.open', '노트 열기', 'screen'], ['didako', 'note.answer', '오늘의 질문에 대답', 'action'], ['didako', 'note.walk-done', '질문으로 묵상하기 마침', 'action'], ['didako', 'note.keep', '남기기', 'action'],
    ['didako', 'cm.first-before', '이번 주의 질문 펴 보기(전)', 'action'], ['didako', 'cm.first-after', '이번 주의 질문 펴 보기(후)', 'action'], ['didako', 'cm.quiz-done', '오늘의 말씀 퀴즈 풀기', 'action'], ['didako', 'cm.share-done', '나눔하기 마침', 'action'],
    ['didako', 'church.first-before', '교회 이번 주의 질문 펴 보기(전)', 'action'], ['didako', 'church.first-after', '교회 이번 주의 질문 펴 보기(후)', 'action'], ['didako', 'church.quiz-done', '교회 말씀 퀴즈 풀기', 'action'], ['didako', 'church.share-done', '교회 나눔하기 마침', 'action'], ['didako', 'cm.open', '공동체 열기', 'screen'], ['didako', 'cm.keep-sentence', '오늘 남길 한 문장', 'action'], ['didako', 'cm.reflect', '돌아보기 남기기', 'action'],
    ['didako', 'church.open', '교회 열기', 'screen'], ['didako', 'church.keep-sentence', '교회 오늘 남길 한 문장', 'action'], ['didako', 'church.reflect', '교회 돌아보기 남기기', 'action'],
    ['didako', 'didako.open', '디다코 열기', 'screen'], ['didako', 'didako.item-add', '기록 추가', 'action'], ['didako', 'didako.error-load', '불러오기 오류', 'error']
  ];
  // ---- 연구 탭(041). ?demo&no041 이면 함수가 없는 모양. 로그 추가는 메모리에만 반영한다 ----
  const TRIG = { 'note.open': '노트 화면이 열릴 때', 'note.pray-done': '기도하기 끝 화면에서 마침을 누를 때', 'church.open': '교회 화면이 열릴 때', 'cm.keep-sentence': '오늘 남길 한 문장을 저장할 때' };
  const CORE = { 'koide:note.prayed': ['note', 'pray'], 'koide:note.pray-done': ['note', 'finish'], 'koide:community.prayed': ['community', 'pray'], 'koide:community.pray-done': ['community', 'finish'], 'koide:church.prayed': ['church', 'pray'], 'koide:church.pray-done': ['church', 'finish'],
    'didako:note.answer': ['note', 'answer'], 'didako:note.walk-done': ['note', 'meditate'], 'didako:note.keep': ['note', 'keep'],
    'didako:cm.first-before': ['community', 'meditate'], 'didako:cm.first-after': ['community', 'meditate'], 'didako:cm.quiz-done': ['community', 'quiz'], 'didako:cm.share-done': ['community', 'share'],
    'didako:church.first-before': ['church', 'meditate'], 'didako:church.first-after': ['church', 'meditate'], 'didako:church.quiz-done': ['church', 'quiz'], 'didako:church.share-done': ['church', 'share'] };
  const rcol = (key, label, type, def, desc) => ({ key, label, type, def: def || null, desc: desc || null });
  const eLabel = ev => (EV.find(e => e[1] === ev) || [0, ev, ev])[2];
  const collectLog = [
    { id: 3, day: '2026-11-12', app: 'koide', ev: 'church.item-save', kind: 'start', note: '교회 기도제목 저장 사건을 보내기 시작했다(데모 예시).' },
    { id: 2, day: '2026-11-05', app: 'didako', ev: null, kind: 'sender', note: '디다코 노트가 열 때마다 한 번씩만 보내도록 바뀌었다(데모 예시).' },
    { id: 1, day: '2026-10-21', app: null, ev: null, kind: 'note', note: '이용 통계 기록을 처음 켰다(데모 예시).' }
  ];
  const codebookDemo = () => ({
    version: 'm1',
    events: EV.map(e => {
      const k = e[0] + ':' + e[1], c = CORE[k], h = hh('cb' + k), none = mode === 'empty' || h < .06;
      const mon = !none && h > .85;
      return { app: e[0], ev: e[1], kind: e[3], label: e[2], n_unit: e[1] === 'didako.open' ? 'sec' : null, core: c ? { area: c[0], role: c[1] } : null, trigger_note: TRIG[e[1]] || null,
        first_seen: none ? null : mon ? '2026-05-01' : '2026-0' + (6 + Math.floor(h * 4)) + '-' + String(1 + Math.floor(h * 27)).padStart(2, '0'), first_precision: none ? null : mon ? 'month' : 'day',
        last_seen: none ? null : '2026-11-19', last_precision: none ? null : 'day', seen_days: { n: none ? 0 : Math.round(20 + 150 * h) } };
    }),
    core: Object.keys(CORE).map(k => { const [app, ev] = k.split(':'); return { app, area: CORE[k][0], ev, role: CORE[k][1], label: eLabel(ev) }; }),
    metrics: [['activity_active', '활동한 사람', '이 기간에 사건이 한 번이라도 있는 서로 다른 계정 수'], ['new_returning', '새로 온 사람·다시 온 사람', '기간 시작 전에 사건이 없었으면 새로, 있었으면 다시'],
      ['kpi_core', '핵심 행동을 한 사람', '핵심 행동 표의 사건이 하나라도 있는 계정 수'], ['core_table', '핵심 행동 영역·역할별', '영역·역할마다 핵심 행동을 한 계정 수'],
      ['retention_w1_4_12', '1·4·12주째 다시 온 비율', '첫 사건 뒤 7~14일, 28~35일, 84~91일 사이에 사건이 있는 사람 ÷ 대상 사람'], ['retention_week', '주별 다시 온 비율', '처음 온 주마다 이후 주별로 다시 온 사람'],
      ['features', '기능별 쓴 사람', '이름마다 사건이 있는 서로 다른 계정 수'], ['feature_return', '기능과 다시 오기', '쓴 주와 안 쓴 주의 다음 주 다시 온 비율 차이'],
      ['segment_device', '기기별 묶음 비교', '기기 값마다 사람·다시 온 비율·핵심 행동'], ['frequency', '사용 빈도', '최근 N일 동안 온 날 수 구간별 사람'], ['stickiness', '고착도', '하루 평균 활동한 사람 ÷ 한 달 활동한 사람']
    ].map((m, i) => ({ key: m[0], ver: 'm1', name: m[1], def: m[2], since: i < 9 ? '2026-11-19' : '2026-11-20' })),
    log: collectLog.map(l => Object.assign({}, l))
  });
  const researchDemo = a => {
    const t = a.p_table, g = a.p_grain || 'week', to = a.p_to || '2026-11-20', from = a.p_from || '2026-08-23';
    const V = (k, base) => mode === 'empty' ? 0 : sm ? Math.floor(hh(k) * 5) : Math.round(base * (.7 + .6 * hh(k)));
    const R4 = (n, d) => d ? Math.round(n / d * 1e4) / 1e4 : null;
    const grainCols = extra => [rcol('period', g === 'day' ? '날짜' : g === 'week' ? '주(월요일 날짜)' : '달(1일 날짜)', 'date')].concat(extra);
    let cols, rows = [], gr = false, extra = {};
    const P = periods(from, to, g).slice(-120);
    if (t === 'activity') {
      gr = true; cols = grainCols([rcol('active', '활동한 사람', 'people', 'activity_active', '이 기간에 사건이 한 번이라도 있는 서로 다른 계정 수'), rcol('events', '사건 수', 'count', 'activity_active', '이 기간에 받은 사건 수'),
        rcol('new', '새로 온 사람', 'people', 'new_returning', '이 기간 시작 전에 사건이 없던 활동한 사람'), rcol('returning', '다시 온 사람', 'people', 'new_returning', '이 기간 시작 전에도 사건이 있던 활동한 사람')]);
      rows = P.map(p => { const n = V('a' + p, 40 * GR[g]), nw = Math.min(n, V('n' + p, 8 * GR[g])); return [p, n, sm ? n * 3 : V('e' + p, 130 * GR[g]), nw, n - nw]; });
    } else if (t === 'core') {
      gr = true; const ks = ['koide_note', 'koide_community', 'koide_church', 'didako_note', 'didako_community', 'didako_church', 'role_pray', 'role_finish', 'role_answer', 'role_keep', 'role_reflect', 'role_meditate'];
      cols = grainCols([rcol('core_people', '핵심 행동을 한 사람', 'people', 'kpi_core', '핵심 행동 표의 사건이 하나라도 있는 계정 수')].concat(ks.map(k => rcol(k, k, 'people', 'core_table', k + ' 영역·역할을 한 사람'))));
      rows = P.map(p => [p, V('c' + p, 20 * GR[g])].concat(ks.map(k => V(k + p, 9 * GR[g]))));
    } else if (t === 'retention_month' || t === 'retention_week') {
      const wk = t === 'retention_week', n = wk ? 12 : 6;
      cols = [rcol('cohort', wk ? '처음 온 주(월요일 날짜)' : '처음 온 달(1일 날짜)', 'date'), rcol('size', '처음 온 사람', 'people', 'retention_w1_4_12', '이 달·주에 처음 사건이 생긴 계정 수')];
      [1, 4, 12].forEach(w => cols.push(rcol('w' + w + '_num', w + '주째 다시 옴(사람)', 'people'), rcol('w' + w + '_den', w + '주째 대상(사람)', 'people'), rcol('w' + w + '_rate', w + '주째 다시 온 비율', 'ratio')));
      for (let i = n; i >= 1; i--) {
        const d = new Date(Date.UTC(2026, wk ? 10 : 10 - i, wk ? 16 - 7 * i : 1)), k = 'r' + t + i, sz = V(k, wk ? 10 : 35), r = [d2s(d), sz];
        [1, 4, 12].forEach(w => { const den = i * (wk ? 1 : 4.3) > w ? sz : Math.floor(sz * .5), num = Math.min(den, V(k + w, den * (.7 - w * .03))); r.push(num, den, R4(num, den)); });
        rows.push(r);
      }
    } else if (t === 'features') {
      cols = [rcol('app', '앱', 'text'), rcol('ev', '이름', 'text'), rcol('label', '뜻', 'text'), rcol('kind', '종류', 'text'), rcol('users', '쓴 사람', 'people', 'features'), rcol('active', '활동한 사람', 'people', 'features'), rcol('reach', '쓴 비율', 'ratio', 'features'), rcol('events', '사건 수', 'count', 'features')];
      rows = EV.filter(e => !a.p_app || e[0] === a.p_app).map(e => { const act = V('fa', 90), u = Math.min(act, V('f' + e[1] + e[0], 40)); return [e[0], e[1], e[2], e[3], u, act, R4(u, act), sm ? u * 2 : u * 4]; });
    } else if (t === 'funnel') {
      const st = a.p_steps || []; if (st.length < 2) throw err('P0001', 'bad: 흐름은 단계를 2~8개로 골라 주세요.', 400);
      cols = [rcol('step', '단계', 'number'), rcol('ev', '이름', 'text'), rcol('label', '뜻', 'text'), rcol('users', '이 단계까지 온 사람', 'people'), rcol('prev_users', '앞 단계 사람', 'people'), rcol('from_prev', '앞 단계에서 이어진 비율', 'ratio'), rcol('first_users', '첫 단계 사람', 'people'), rcol('from_first', '첫 단계에서 이어진 비율', 'ratio')];
      let prev = null, first = null; extra = { funnel_days: 30 };
      rows = st.map((ev, i) => { const u = sm ? Math.max(0, 4 - i) : mode === 'empty' ? 0 : Math.round(100 * Math.pow(.7, i)); if (i === 0) first = u; const r = [i + 1, ev, eLabel(ev), u, i ? prev : null, i ? R4(u, prev) : null, first, i ? R4(u, first) : null]; prev = u; return r; });
    } else if (t === 'feature_return') {
      cols = [rcol('app', '앱', 'text'), rcol('ev', '이름', 'text'), rcol('label', '뜻', 'text'), rcol('area', '영역', 'text'), rcol('role', '역할', 'text'), rcol('pw_with', '쓴 사람-주', 'count'), rcol('people_with', '쓴 서로 다른 사람', 'people'), rcol('ret_with', '쓴 주 뒤 다시 옴', 'count'), rcol('rate_with', '쓴 주의 다시 온 비율', 'ratio'),
        rcol('pw_without', '안 쓴 사람-주', 'count'), rcol('ret_without', '안 쓴 주 뒤 다시 옴', 'count'), rcol('rate_without', '안 쓴 주의 다시 온 비율', 'ratio'), rcol('lift', '차이', 'number'), rcol('adj_lift', '보정한 차이', 'number'), rcol('thin', '표본 적음', 'bool')];
      rows = EV.filter(e => e[3] === 'action' && (!a.p_app || e[0] === a.p_app)).map(e => {
        const c = CORE[e[0] + ':' + e[1]] || [], pw = V('pw' + e[1], 80), rw = Math.min(pw, V('rw' + e[1], 50)), po = V('po' + e[1], 300), ro = Math.min(po, V('ro' + e[1], 150)), a1 = R4(rw, pw), a2 = R4(ro, po);
        return [e[0], e[1], e[2], c[0] || '', c[1] || '', pw, Math.min(pw, V('pp' + e[1], 20)), rw, a1, po, ro, a2, a1 == null || a2 == null ? null : Math.round((a1 - a2) * 1e4) / 1e4, a1 == null || a2 == null ? null : Math.round((a1 - a2) * 8e3) / 1e4, pw < 30]; });
    } else if (/^segments_/.test(t)) {
      const ks = t === 'segments_device' ? ['(전체)', 'phone', 'pc', 'tablet'] : t === 'segments_standalone' ? ['(전체)', 'true', 'false'] : ['(전체)', 'v41', 'v40', 'v39'];
      cols = [rcol('k', t === 'segments_device' ? '기기' : t === 'segments_standalone' ? '홈 화면 앱으로 열었나' : '앱 판', 'text'), rcol('people', '사람', 'people'), rcol('ret_num', '다음 주에 다시 옴(사람-주)', 'count'), rcol('ret_den', '센 사람-주', 'count'), rcol('ret_rate', '다시 온 비율', 'ratio'),
        rcol('core_num', '핵심 행동한 사람', 'people'), rcol('core_den', '묶음 사람', 'people'), rcol('days_pw', '그 주에 온 날 수 평균', 'number'), rcol('thin', '표본 적음', 'bool')];
      rows = ks.map((k, i) => { const p = V('sg' + t + k, 120 / (i + 1)), den = V('sd' + k, p * 5), num = Math.min(den, V('sn' + k, den * .5)), cn = Math.min(p, V('sc' + k, p * .6)); return [k, p, num, den, R4(num, den), cn, p, p ? Math.round((1.5 + hh(k)) * 100) / 100 : null, den < 30]; });
    } else if (t === 'frequency') {
      cols = [rcol('days_from', '온 날 수(부터)', 'number'), rcol('days_to', '온 날 수(까지, 비면 그 이상)', 'number'), rcol('users', '사람', 'people'), rcol('active', '활동한 사람', 'people')];
      const bs = [[1, 1], [2, 3], [4, 7], [8, 14], [15, null]], us = bs.map((b, i) => V('fq' + i, 60 / (i + 1))), tot = us.reduce((x, y) => x + y, 0);
      rows = bs.map((b, i) => [b[0], b[1], us[i], tot]);
    } else if (t === 'stickiness') {
      cols = [rcol('month', '달(1일 날짜)', 'date'), rcol('partial', '진행 중인 달', 'bool'), rcol('mau', '한 달 활동한 사람', 'people'), rcol('dau_avg', '하루 평균 활동한 사람', 'number'), rcol('ratio', '고착도', 'ratio')];
      rows = [5, 4, 3, 2, 1, 0].map(i => { const d = new Date(Date.UTC(2026, 10 - i, 1)), mau = V('st' + i, 90), av = mau ? Math.round(mau * (.12 + .1 * hh('av' + i)) * 100) / 100 : null; return [d2s(d), i === 0, mau, av, mau ? Math.round(av / mau * 1e4) / 1e4 : null]; });
    } else throw err('P0001', 'bad: 알 수 없는 표예요.', 400);
    if (mode === 'empty') rows = [];
    return { meta: Object.assign({ version: 'm1', table: t, app: a.p_app || null, from, to, grain: gr ? g : null, exported_on: '2026-11-20', note: '앱 전체 합계. 사람·교회·원본 단위 값 없음. 작은 숫자(0~4)도 그대로 들어 있어요' }, extra), columns: cols, rows };
  };
  const demo41 = (name, a) => {
    if (q.has('no041')) throw err('PGRST202', 'not found', 404);
    if (name === 'admin_usage_codebook') return codebookDemo();
    if (name === 'admin_usage_research') return researchDemo(a);
    const day = String(a.p_day || ''), note = String(a.p_note || '').trim(), ev = a.p_ev || null, ap = a.p_app || null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day > '2026-11-20') throw err('P0001', 'bad: 날짜는 오늘까지 고를 수 있어요.', 400);
    if (!['start', 'stop', 'rename', 'unit', 'sender', 'metric', 'note'].includes(a.p_kind)) throw err('P0001', 'bad: 종류를 다시 골라 주세요.', 400);
    if (note.length < 1 || note.length > 200) throw err('P0001', 'bad: 내용은 1~200자로 적어 주세요.', 400);
    if (ev && !EV.some(e => e[1] === ev && (!ap || e[0] === ap))) throw err('P0001', 'bad: 알 수 없는 이름이에요.', 400);
    collectLog.unshift({ id: collectLog.length + 1, day, app: ap, ev, kind: a.p_kind, note });
    collectLog.sort((x, y) => (y.day > x.day ? 1 : y.day < x.day ? -1 : y.id - x.id));
    return collectLog.map(l => Object.assign({}, l));
  };
  const usageDemo = (name, a) => {
    if (/^admin_usage_(codebook|collect_log_add|research)$/.test(name)) return demo41(name, a);
    if (name === 'admin_usage_active') {
      const g = a.p_grain || 'day';
      return { app: a.p_app, grain: g, from: a.p_from, to: a.p_to, series: periods(a.p_from, a.p_to, g).map(p => { const n = (30 + 45 * hh('a' + p)) * GR[g], k = 'a' + p; return { period: p, active: N(n, k), events: N(n * (3 + 2 * hh('e' + p)), k) }; }) };
    }
    if (name === 'admin_usage_signups') {
      const g = a.p_grain || 'month'; let cum = 0;
      const series = periods(a.p_from, a.p_to, g).map(p => {
        const n = (6 + 10 * hh('s' + p)) * GR[g]; cum += Math.round(n); const k = 's' + p;
        // 006 규칙: 로그인 방법 칸 중 1~4명(가림)이 하나라도 있으면 그 기간 합계도 가린다. 0명은 가리지 않는다
        const pr = (x, w) => (mode !== 'empty' && Math.round(n * w) === 0 ? { n: 0, small: false } : N(n * w, k + w));
        const providers = { kakao: pr(n, .55), google: pr(n, .28), apple: pr(n, .17), other: pr(n, 0) };
        const anyMask = Object.keys(providers).some(x => providers[x].small);
        return { period: p, new: anyMask ? { n: null, small: true } : N(n, k), cumulative: N(cum + 90, k), providers };
      });
      return { grain: g, from: a.p_from, to: a.p_to, cumulative_total: N(cum + 90, 'cum'), series };
    }
    if (name === 'admin_usage_retention') {
      const m = Math.min(12, Math.max(1, a.p_months || 6)), out = [];
      for (let i = m - 1; i >= 0; i--) {
        const d = new Date(Date.UTC(2026, 10 - i, 1)), k = 'c' + i, size = 25 + 40 * hh(k);
        out.push({ cohort: d2s(d), size: N(size, k), w1: Rr(.55 + .15 * hh(k + 1), k, size), w4: i < 1 ? { r: null, small: sm } : Rr(.35 + .15 * hh(k + 4), k, size), w12: i < 3 ? { r: null, small: sm } : Rr(.18 + .12 * hh(k + 12), k, size) });
      }
      return { app: a.p_app, cohorts: mode === 'empty' ? [] : out };
    }
    if (name === 'admin_usage_features') {
      const total = 120, items = EV.filter(e => !a.p_app || e[0] === a.p_app).map(e => {
        const u = hh(e[1]) < .1 || mode === 'empty' ? 0 : e[3] === 'error' ? 2 + 14 * hh(e[1]) : 8 + 100 * hh(e[1]), k = 'f' + e[1];
        return { app: e[0], ev: e[1], label: e[2], kind: e[3], events: N(u * 4, k), users: N(u, k), reach: Rr(u / total, k, u), unused: u === 0 || (mode === 'small' && hh(e[1]) < .1) };
      });
      return { app: a.p_app, from: a.p_from, to: a.p_to, active: N(total, 'tot'), items };
    }
    if (name === 'admin_usage_funnel') {
      const st = a.p_steps || [], out = []; let base = 90, first = null, prev = null;
      st.forEach((ev, i) => {
        const it = EV.find(e => e[1] === ev && (!a.p_app || e[0] === a.p_app)) || EV.find(e => e[1] === ev); if (!it) throw bad('허용 목록에 없는 이름이에요: ' + ev);
        const n = mode === 'small' ? 3 : base * Math.pow(.68, i), k = 'fu' + ev, u = N(n, k);
        if (i === 0) first = u.n;
        out.push({ step: i + 1, ev, label: it[2], users: u, from_prev: i ? Rr(n / (base * Math.pow(.68, i - 1)), k, n) : null, from_first: i ? Rr(Math.pow(.68, i), k, n) : null });
      });
      return { app: a.p_app, days: a.p_days, steps: out };
    }
    if (/^admin_usage_(kpi|alerts|feature_return|segments|releases)$/.test(name) && q.has('no040')) throw err('PGRST202', 'not found', 404);
    if (name === 'admin_usage_kpi') {
      const app = a.p_app || '', days = Math.min(180, Math.max(7, a.p_days || 7)), bk = days <= 14 ? 1 : 7, np = Math.min(Math.ceil(2 * days / bk), 26);
      const sc = { '': 1, koide: .62, didako: .38, telio: .08 }[app] || 1, last = new Date('2026-11-19T00:00:00Z'), day = x => d2s(new Date(last.getTime() - x * 864e5));
      const cnt = (key, base) => mode === 'empty' ? 0 : sm ? Math.floor(hh(key) * 5) : Math.round(base * sc * (0.85 + 0.3 * hh(key)));
      const A = [cnt('ac' + app + days, 38 * Math.sqrt(days)), cnt('ap' + app + days, 34 * Math.sqrt(days))];
      const part = (f, key) => [Math.round(A[0] * f * (.9 + .2 * hh(key + 'c'))), Math.round(A[1] * f * (.9 + .2 * hh(key + 'p')))];
      const mk2 = (v) => ({ n: v, small: false });
      const series = (f, key) => Array.from({ length: np }, (_, i) => ({ p: day((np - 1 - i) * bk), n: mode === 'empty' ? 0 : sm ? (hh(key + i) < .25 ? Math.floor(hh(key + 'v' + i) * 4) : 0) : Math.round(A[0] * f / Math.sqrt(days) * 3 * (.7 + .6 * hh(key + i))) }));
      const rate = (num, den) => ({ r: den > 0 ? Math.round(num / den * 1e4) / 1e4 : null, small: false, num: mk2(num), den: mk2(den) });
      const AREAS = [['koide', 'note', .5], ['koide', 'community', .22], ['koide', 'church', .3], ['didako', 'note', .35], ['didako', 'community', .2], ['didako', 'church', .1]].filter(x => !app || x[0] === app);
      const coreN = part(.55, 'core'), tel = app === 'telio';
      const prayD = part(.7, 'pd'), prayN = [Math.round(prayD[0] * .46), Math.round(prayD[1] * .41)];
      const retD = [sm ? 3 : Math.round(A[0] * .3), sm ? 4 : Math.round(A[1] * .3)], retN = [Math.round(retD[0] * .31), Math.round(retD[1] * .27)];
      const fl = q.has('floor');
      const ks = [
        { key: 'active', better: 'up', cur: mk2(A[0]), prev: mk2(A[1]), spark: series(1, 'sa') },
        { key: 'core', better: 'up', cur: mk2(tel ? 0 : coreN[0]), prev: mk2(tel ? 0 : coreN[1]), spark: series(tel ? 0 : .55, 'sc'),
          areas: tel ? [] : AREAS.map(x => { const v = part(x[2] * .6, x[0] + x[1]); return { app: x[0], area: x[1], cur: mk2(v[0]), prev: mk2(v[1]) }; }),
          roles: (app === 'koide' ? ['pray', 'finish'] : app === 'didako' || app === 'telio' ? ['answer', 'meditate', 'keep', 'open', 'quiz', 'share'] : ['pray', 'finish', 'answer', 'meditate', 'keep', 'open', 'quiz', 'share']).map((r, i) => { const v = part(.5 - i * .05, 'r' + r); return { role: r, cur: mk2(tel ? 0 : Math.max(0, v[0])), prev: mk2(tel ? 0 : Math.max(0, v[1])) }; }) }
      ];
      if (app === '' || app === 'koide') ks.push({ key: 'pray_rate', better: 'up', cur: rate(prayN[0], prayD[0]), prev: rate(prayN[1], prayD[1]),
        spark: series(1, 'sp').map(x => ({ p: x.p, r: x.n > 0 ? .3 + .3 * hh('pr' + x.p) : null, den: x.n })), den_app: 'koide' });
      ks.push({ key: 'new', better: 'up', cur: fl ? { n: null, small: false } : mk2(Math.round(A[0] * .2)), prev: fl ? { n: null, small: false } : mk2(Math.round(A[1] * .17)), spark: series(.2, 'sn'), limited: fl ? 'floor' : undefined });
      ks.push({ key: 'ret28', better: 'up', cur: fl ? { r: null, small: false, num: null, den: null } : rate(retN[0], retD[0]), prev: fl ? { r: null, small: false, num: null, den: null } : rate(retN[1], retD[1]),
        spark: series(.3, 'sr').map(x => ({ p: x.p, r: x.n > 0 ? .2 + .2 * hh('rr' + x.p) : null, den: x.n })), limited: fl ? 'floor' : undefined });
      ks.push({ key: 'err', better: 'down', cur: mk2(mode === 'empty' ? 0 : sm ? 1 : Math.round(A[0] * .09)), prev: mk2(mode === 'empty' ? 0 : sm ? 0 : Math.round(A[1] * .06)), spark: series(.08, 'se') });
      const core_defs = tel ? [] : [['koide', 'note', 'note.prayed', 'pray', '기도했어요 누름(노트)'], ['koide', 'community', 'community.prayed', 'pray', '기도했어요 누름(공동체)'], ['koide', 'church', 'church.prayed', 'pray', '기도했어요 누름(교회)'], ['didako', 'note', 'note.answer', 'answer', '오늘의 질문에 대답 남김']].filter(x => !app || x[0] === app).map(x => ({ app: x[0], area: x[1], ev: x[2], role: x[3], label: x[4] }));
      return { app: a.p_app || null, days, version: 'm1', as_of: '2026-11-19', cur: { from: day(days - 1), to: day(0) }, prev: { from: day(2 * days - 1), to: day(days) }, core_defs, kpis: ks };
    }
    if (name === 'admin_usage_alerts') {
      const al = q.get('alert'), ap = (k, st, ld, sd) => ({ app: k, last_day: ld, silent_days: sd, recent_med: 12, base_med: 14, status: st });
      if (al === 'off') return { as_of: '2026-11-19', version: 'm1', track: 'off', apps: [], items: [{ code: 'track_off', level: 'info', app: null, value: { track: 'off' }, base: { want: 'on' }, tab: 'glance' }] };
      if (mode === 'empty') return { as_of: '2026-11-19', version: 'm1', track: 'on', apps: ['koide', 'didako', 'telio'].map(k => ap(k, 'never', null, null)), items: [] };
      if (al === 'none' || al === 'quiet') return { as_of: '2026-11-19', version: 'm1', track: 'on', apps: [ap('koide', 'ok', '2026-11-19', 0), ap('didako', al === 'quiet' ? 'quiet' : 'ok', '2026-11-19', 0), ap('telio', 'never', null, null)], items: [] };
      return { as_of: '2026-11-19', version: 'm1', track: 'on', apps: [ap('koide', 'ok', '2026-11-19', 0), ap('didako', 'silent', '2026-11-15', 4), ap('telio', 'never', null, null)],
        items: [{ code: 'silent', level: 'warn', app: 'didako', value: { silent_days: 4, last_day: '2026-11-15' }, base: { threshold_days: 3 }, tab: 'time' },
          { code: 'errors', level: 'warn', app: 'koide', value: { last3: 9 }, base: { base3: 1.5 }, tab: 'feature' },
          { code: 'drop', level: 'warn', app: 'koide', value: { recent_med: 3 }, base: { base_med: 9 }, tab: 'glance' }] };
    }
    if (name === 'admin_usage_feature_return') {
      const app = a.p_app || '', clampR = x => Math.min(.97, Math.max(.03, x));
      const rt = (r, n, k) => Object.assign(Rr(r, k, n), { num: N(r * n, k + 'n'), den: N(n, k + 'd') });
      const fr = (ap, ev, label, kind, area, role, key) => {
        const h = x => hh(key + x), thin = sm ? true : h('t') < .18 || /meet-done|invite-create/.test(ev);
        const wpw = sm ? 2 + Math.floor(h('w') * 18) : thin ? 14 + Math.floor(h('w') * 12) : 45 + Math.round(h('w') * 260), opw = sm ? 20 : 380 - Math.round(h('o') * 60);
        const ppl = Math.max(1, Math.round(wpw * (thin ? .6 : .45))), orr = .3 + .12 * h('r'), wrr = clampR(orr + (h('l') - .3) * .5), lift = Math.round((wrr - orr) * 1e4) / 1e4;
        return { app: ap, ev, label, kind, area, role,
          with: { pw: N(wpw, key + 'w'), people: N(ppl, key + 'p'), ret: rt(wrr, wpw, key + 'wr') }, without: { pw: N(opw, key + 'o'), ret: rt(orr, opw, key + 'or') },
          lift: sm ? { v: null, small: true } : { v: lift, small: false }, adj_lift: sm ? { v: null, small: false, strata: 0 } : { v: Math.round(lift * (.3 + .7 * h('a')) * 1e4) / 1e4, small: false, strata: 2 }, thin };
      };
      const items = [];
      if (mode !== 'empty') {
        const cores = [['_core', '', '핵심 행동', null], ['_core:koide:note', 'koide', '핵심 행동 · 코이데 노트', 'note'], ['_core:koide:church', 'koide', '핵심 행동 · 코이데 교회', 'church'], ['_core:koide:community', 'koide', '핵심 행동 · 코이데 공동체', 'community'], ['_core:didako:note', 'didako', '핵심 행동 · 디다코 노트', 'note']];
        cores.filter(c => c[0] === '_core' || !app || c[1] === app).forEach(c => items.push(fr(c[1] || (app || null), c[0], c[2], 'core', c[3], null, 'fc' + c[0])));
        EV.filter(e => e[3] !== 'error' && (!app || e[0] === app)).forEach(e => items.push(fr(e[0], e[1], e[2], e[3], e[1].split('.')[0], null, 'fr' + e[0] + e[1])));
        // 화면 글자 확인용: HTML이 든 이름과 =로 시작하는 이름(글자로만 보여야 하고 CSV에는 '가 붙어야 한다)
        items.push(fr(app || 'koide', 'demo.html', '<b>굵게</b> <img src=x> 시험', 'action', 'demo', null, 'fh1'), fr(app || 'koide', 'demo.eq', '=1+1 시험', 'action', 'demo', null, 'fh2'));
      }
      const ovn = sm ? 3 : 2400;
      return { app: a.p_app, from: '2026-08-20', to: '2026-11-19', weeks: 11, min: { pw: 30, people: 10 }, overall: { pw: N(ovn, 'frov'), ret: rt(.41, ovn, 'frov') }, items };
    }
    if (name === 'admin_usage_segments') {
      const by = a.p_by || 'device', app = a.p_app || '';
      if (!['device', 'standalone', 'ver'].includes(by)) throw bad('묶음은 device, standalone, ver 중 하나예요.');
      const vers = app === 'koide' ? ['v208', 'v207', 'v206', ''] : app === 'didako' ? ['cm-v64', 'cm-v63', 'cm-v62', ''] : ['v208', 'cm-v64', 'v207', 'cm-v63', 'v206', 'cm-v62', ''];
      const ks = by === 'device' ? ['phone', 'tablet', 'pc', ''] : by === 'standalone' ? [true, false] : vers;
      const rt = (r, n, k) => Object.assign(Rr(r, k, n), { num: N(r * n, k + 'n'), den: N(n, k + 'd') });
      const items = mode === 'empty' ? [] : ks.map((k, i) => {
        const key = 'sg' + by + String(k), h = x => hh(key + x), thin = sm ? true : (by === 'device' ? i >= 3 : by === 'ver' ? i >= ks.length - 2 : false);
        const pw = sm ? 2 + Math.floor(h('p') * 15) : thin ? 12 + Math.floor(h('p') * 15) : 160 - i * 12 + Math.round(h('p') * 120), ppl = Math.max(1, Math.round(pw * .5));
        return { k, people: N(ppl, key + 'p'), ret: rt(.34 + .2 * h('r'), pw, key + 'r'), days_pw: sm ? { v: null, small: true } : { v: Math.round((1.5 + 1.6 * h('d')) * 100) / 100, small: false }, core: rt(.25 + .3 * h('c'), ppl, key + 'c'), thin };
      });
      const series = [];
      if (mode !== 'empty') for (let w = 0; w < 12; w++) { const d = new Date(Date.UTC(2026, 8, 7 + w * 7)); items.forEach(it => series.push({ period: d2s(d), k: it.k, users: N(Math.max(1, (it.thin ? 4 : 30 + 20 * hh('s' + String(it.k) + w)) * (.8 + .4 * hh('w' + w))), 'se' + by + String(it.k) + w) })); }
      return { by, from: '2026-08-20', to: '2026-11-19', min: { pw: 30 },
        all: mode === 'empty' ? { people: N(0, 'x'), ret: rt(0, 0, 'ar'), days_pw: { v: null, small: false }, core: rt(0, 0, 'ac') } : { people: N(sm ? 4 : 130, 'allp'), ret: rt(.41, sm ? 9 : 900, 'allr'), days_pw: sm ? { v: null, small: true } : { v: 2.4, small: false }, core: rt(.37, sm ? 9 : 130, 'allc') },
        items, series };
    }
    if (name === 'admin_usage_releases') {
      const all = [['didako', 'cm-v62', '2026-10-23', 44], ['didako', 'cm-v63', '2026-11-05', 31], ['didako', 'cm-v64', '2026-11-18', 1]];
      const items = mode === 'empty' ? [] : all.filter(x => (!a.p_app || x[0] === a.p_app) && (!a.p_from || x[2] >= a.p_from) && (!a.p_to || x[2] <= a.p_to))
        .map(x => ({ app: x[0], ver: x[1], first_day: x[2], last_day: '2026-11-19', people: N(x[3], 'rl' + x[1]) }));
      return { from: a.p_from, to: a.p_to, items };
    }
    if (/^admin_usage_(stickiness|frequency|duration|new_returning)$/.test(name)) {
      if (q.has('no037')) throw err('PGRST202', 'not found', 404);
    }
    if (name === 'admin_usage_stickiness') {
      const m = Math.min(13, Math.max(1, a.p_months || 6)), out = [];
      for (let i = m - 1; i >= 0; i--) {
        const d = new Date(Date.UTC(2026, 10 - i, 1)), k = 'sk' + i, mau = 80 + 40 * hh(k), r = (i === 0 ? .16 : .2) + .1 * hh(k + 'r'), show = sm ? vis(k) : mode !== 'empty';
        out.push({ month: d2s(d), partial: i === 0, mau: N(mau, k), dau_avg: show ? { v: Math.round(mau * r * 100) / 100, small: false } : { v: null, small: sm }, ratio: Rr(r, k, mau) });
      }
      return { app: a.p_app, months: out };
    }
    if (name === 'admin_usage_frequency') {
      const B = [[1, 1, 38], [2, 3, 30], [4, 7, 24], [8, 15, 14], [16, null, 4]];
      return { app: a.p_app, days: a.p_days, active: N(110, 'fq'), buckets: B.map(b => ({ from: b[0], to: b[1], users: N(b[2], 'fq' + b[0]) })) };
    }
    if (name === 'admin_usage_duration') {
      const D = [['koide', 'note.pray-done', '기도하기 마침', 48, 240], ['koide', 'church.pray-done', '교회 기도하기 마침', 22, 420], ['koide', 'church.meet-done', '모임 모드 마침', 4, 900]];
      // 기록이 없는 항목(늘 n=0): 상자 그림에 '이 기간에는 기록이 없어요'가 보이는 경우
      const none = { app: 'koide', ev: 'group.share-done', label: '공동체 나눔하기 마침', users: { n: 0, small: false }, events: { n: 0, small: false }, median_sec: null, p25_sec: null, p75_sec: null, avg_sec: null, buckets: [] };
      if (mode === 'empty') none.users = none.events = { n: null, small: false };
      return { from: a.p_from, to: a.p_to, items: D.filter(x => !a.p_app || x[0] === a.p_app).map(x => {
        const k = 'du' + x[1], u = N(x[3], k), ok = !u.small;
        return { app: x[0], ev: x[1], label: x[2], users: u, events: N(x[3] * 2.4, k), median_sec: ok ? x[4] : null, p25_sec: ok ? Math.round(x[4] * .5) : null, p75_sec: ok ? Math.round(x[4] * 1.8) : null, avg_sec: ok ? Math.round(x[4] * 1.2) : null,
          buckets: ['1분 미만', '1~3분', '3~5분', '5~10분', '10분 이상'].map((l, j) => ({ label: l, events: N([x[3] * .3, x[3] * .8, x[3] * .7, x[3] * .4, x[3] * .2][j], k + j) })) };
      }).concat(!a.p_app || a.p_app === 'koide' ? [none] : []) };
    }
    if (name === 'admin_usage_new_returning') {
      const g = a.p_grain || 'week';
      return { grain: g, from: a.p_from, to: a.p_to, series: periods(a.p_from, a.p_to, g).map(p => { const f = GR[g], k = 'nr' + p; return { period: p, new: N((4 + 8 * hh(k)) * f, k + 'n'), returning: N((18 + 20 * hh(k + 'r')) * f, k + 'r') }; }) };
    }
    if (name === 'admin_usage_heatmap') {
      const cells = []; if (mode !== 'empty') for (let dow = 0; dow < 7; dow++) for (let h = 0; h < 24; h++) {
        if (h >= 2 && h <= 4) continue;
        const peak = Math.exp(-Math.pow(h - 7, 2) / 8) + 1.3 * Math.exp(-Math.pow(h - 21, 2) / 10), n = h <= 1 || h === 5 ? 3 : 15 + 220 * peak * (dow === 0 ? 1.3 : .8 + .3 * hh('hm' + dow));
        cells.push({ dow, hour: h, events: N(n, 'hm' + dow + '-' + h) });
      }
      return { app: a.p_app, from: a.p_from, to: a.p_to, cells };
    }
    if (name === 'admin_usage_devices') {
      const U = (n, k) => N(n, 'd' + k);
      return { app: a.p_app, from: a.p_from, to: a.p_to, device: [{ k: 'phone', users: U(82, 1) }, { k: 'pc', users: U(31, 2) }, { k: 'tablet', users: U(6, 3) }, { k: '', users: U(3, 4) }],
        standalone: [{ k: true, users: U(44, 5) }, { k: false, users: U(78, 6) }], ver: [{ k: 'v2026-11-18', users: U(70, 7) }, { k: 'v2026-11-10', users: U(40, 8) }, { k: 'v2026-11-01', users: U(4, 9) }] };
    }
    if (name === 'admin_usage_cross_app') {
      const U = (n, k) => N(n, 'x' + k);
      return { month: a.p_month || '2026-11-01', buckets: [{ apps: 1, users: U(88, 1) }, { apps: 2, users: U(23, 2) }, { apps: 3, users: U(3, 3) }], by_app: [{ app: 'koide', users: U(104, 4) }, { app: 'didako', users: U(31, 5) }] };
    }
    if (name === 'admin_usage_dormant') {
      return { app: a.p_app, as_of: '2026-11-19', days: 30, active: N(85, 'dm1'), dormant: N(35, 'dm2'), dormant_rate: Rr(35 / 120, 'dm3', 35) };
    }
  };
  window.AdminDemo = {
    mode,
    rpc: (name, a) => new Promise((ok, no) => setTimeout(() => {
      if (mode === 'out') return no(err('28000', 'login', 401));
      if (mode === 'error' && !failed) { failed = true; return no(err('XX000', 'internal', 500)); }
      if (name === 'admin_me') return ok({ admin: mode !== 'notadmin' });
      if (mode === 'notadmin') return no(err('P0001', 'bad: 앱 관리자만 할 수 있어요.', 400));
      if (name === 'admin_today') return ok(today());
      try {
        if (/^admin_usage_/.test(name)) {
          if (mode === 'error') throw name === 'admin_usage_heatmap' ? err('57014', 'canceling statement due to statement timeout', 500) : err('XX000', 'internal', 500);
          const u = usageDemo(name, a);
          if (u !== undefined) return ok(JSON.parse(JSON.stringify(u)));
        }
        if (name === 'church_apply_admin_list') return ok(applyList());
        if (name === 'church_apply_make') {
          const it = find(a.p_id), n = String(a.p_name || '').trim(), c = String(a.p_code || '').toUpperCase().replace(/[^A-Z0-9가-힣]/g, ''), d = String(a.p_dept || '').trim();
          if (n.length < 1 || n.length > 40) throw bad('교회 이름은 1~40자로 적어 주세요.');
          if (c.length < 3 || c.length > 30) throw bad('코드는 3~30자로 적어 주세요.');
          if (d.length < 1 || d.length > 12) throw bad('부서 이름은 1~12자로 적어 주세요.');
          if (usedCodes.includes(c)) throw bad('이미 쓰는 코드예요.');
          usedCodes.push(c); it.status = '만듦'; it.churchId = addChurch(n, '교회', c).id;
          return ok(Object.assign(applyList(), { made: { churchId: it.churchId, code: c } }));
        }
        if (name === 'church_apply_reject') {
          const it = find(a.p_id), r = String(a.p_reason || '');
          if (r.length > 60) throw bad('사유는 60자 이하로 적어 주세요.');
          it.status = '거절'; it.reason = r; return ok(applyList());
        }
        if (name === 'admin_feedback_list') {
          const lim = Math.min(200, Math.max(1, Number(a.p_limit) || 50));
          const items = fbAll.filter(f => !a.p_unread_only || !f.read).slice(0, lim);
          return ok({ unread: fbUnread(), items: JSON.parse(JSON.stringify(items)) });
        }
        if (name === 'admin_feedback_mark_read') {
          const f = fbAll.find(x => x.id === a.p_id);
          if (!f) throw bad('그 의견을 찾을 수 없어요.');
          f.read = true; return ok({ ok: true });
        }
        if (name === 'admin_community_health') return ok(health());
        if (name === 'admin_community_reports') return ok(commReports());
        if (name === 'admin_community_lookup') {
          const c = comms[String(a.p_key || '').trim()] || comms[tokens[String(a.p_key || '').trim()]];
          if (!c) throw bad('공동체를 찾을 수 없어요.');
          return ok(JSON.parse(JSON.stringify(c)));
        }
        if (name === 'admin_community_close') {
          const c = comms[a.p_id];
          if (!c) throw bad('공동체를 찾을 수 없어요.');
          c.status = '닫음'; c.reports.forEach(r => { if (r.status === '새로') r.status = '처리함'; });
          return ok({ ok: true });
        }
        if (name === 'admin_db_size') return ok(dbSize());
        if (name === 'admin_church_list') return ok(cList());
        if (name === 'admin_setting_list') return ok(sList());
        if (name === 'admin_log_list') return ok({ items: JSON.parse(JSON.stringify(logs.slice(0, Math.min(200, Number(a.p_limit) || 50)))) });
        if (name === 'admin_setting_set') {
          if (!allowed[a.p_key]) throw bad('바꿀 수 없는 스위치예요.');
          if (!allowed[a.p_key].includes(a.p_value)) throw bad('값은 ' + allowed[a.p_key].join(', ') + ' 중 하나예요.');
          settings[a.p_key] = a.p_value; putLog('setting', a.p_key + '=' + a.p_value); return ok(sList());
        }
        if (name === 'admin_church_create') {
          const n = String(a.p_name || '').trim(), c = normCode(a.p_code), d = String(a.p_dept || '').trim();
          if (n.length < 1 || n.length > 40) throw bad('교회 이름은 1~40자로 적어 주세요.');
          if (c.length < 3 || c.length > 30) throw bad('코드는 3~30자로 적어 주세요.');
          if (d.length < 1 || d.length > 12) throw bad('부서 이름은 1~12자로 적어 주세요.');
          if (usedCodes.includes(c)) throw bad('이미 쓰는 코드예요.');
          usedCodes.push(c);
          const ch = addChurch(n, a.p_kind === '테스트' ? '테스트' : '교회', c); ch.invite_pending = true; putLog('church-create', ch.id);
          return ok(Object.assign(cList(), { made: { churchId: ch.id, name: n, code: c, token: 'demo-token-' + ch.id, expires: new Date(Date.now() + 7 * 864e5).toISOString() } }));
        }
        if (name === 'admin_church_plan') {
          if (q.has('no042')) throw err('PGRST202', 'not found', 404);
          const ch = church(a.p_id);
          if (!['시범', '무료', '유료'].includes(a.p_plan)) throw bad('이용 단계는 시범·무료·유료 중 하나예요.');
          if (a.p_note && String(a.p_note).length > 200) throw bad('메모는 200자까지예요.');
          ch.plan = a.p_plan; ch.plan_until = a.p_until || null; ch.plan_note = a.p_note || null; putLog('church-plan', ch.id + '=' + a.p_plan); return ok(cList());
        }
        if (name === 'admin_church_rename') {
          const ch = church(a.p_id), n = String(a.p_name || '').trim();
          if (n.length < 1 || n.length > 40) throw bad('교회 이름은 1~40자로 적어 주세요.');
          ch.name = n; putLog('church-rename', ch.id); return ok(cList());
        }
        if (name === 'admin_church_state') {
          const ch = church(a.p_id);
          if (a.p_status !== '열림' && a.p_status !== '멈춤') throw bad('상태는 열림 또는 멈춤이에요.');
          ch.status = a.p_status; putLog('church-state', ch.id + '=' + a.p_status); return ok(cList());
        }
        if (name === 'admin_church_code') {
          const ch = church(a.p_id), op = a.p_op || 'add';
          if (op === 'add') {
            const c = normCode(a.p_code);
            if (c.length < 3 || c.length > 30) throw bad('코드는 3~30자로 적어 주세요.');
            if (usedCodes.includes(c)) throw bad('이미 쓰는 코드예요.');
            usedCodes.push(c); ch.codes.push({ code: c, status: '열림' }); putLog('code-add', ch.id);
          } else {
            const x = ch.codes.find(k => k.code === normCode(a.p_code));
            if (!x) throw bad('그 코드를 찾지 못했어요.');
            x.status = op === 'stop' ? '멈춤' : '열림'; putLog('code-' + op, ch.id);
          }
          return ok(cList());
        }
        if (name === 'admin_church_invite') {
          const ch = church(a.p_id);
          if (ch.status === '멈춤') throw bad('이 교회는 멈춰 있어요. 먼저 멈춤을 풀어 주세요.');
          ch.invite_pending = true; putLog('invite', ch.id);
          return ok({ token: 'demo-token-' + ch.id, expires: new Date(Date.now() + 7 * 864e5).toISOString() });
        }
      } catch (e) { return no(e); }
      no(err('PGRST202', 'not found', 404));
    }, 150))
  };
})();
