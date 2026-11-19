/* ?demo: 가짜 서버. 화면 확인용이라 이름과 숫자는 모두 지어낸 것이다. 쓰기는 메모리에만 반영한다.
   ?demo  앱 관리자   ?demo=out  로그인 전   ?demo=notadmin  앱 관리자 아님   ?demo=error  첫 호출 실패
   ?demo=empty  신청·의견·신고 없음(교회 목록은 그대로)   ?demo=small  공동체가 적어 5명 미만 가림 값이 나옴
   ?demo&db=72 / ?demo&db=95  저장 공간 사용 비율을 바꿔 본다(기본 50)
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
  const mk = (id, name, kind, status, codes, counts, has_admin, invite_pending) => ({ id, name, kind, status, plan: 'free', created_at: '2026-10-01', codes, counts, invite_pending, has_admin });
  const churches = [
    mk('c1', '<b>사랑</b>교회', '교회', '열림', [{ code: 'LOVE1', status: '열림' }, { code: 'LOVE2', status: '멈춤' }], { members: 12, depts: 2, households: 5, linked: 1, admins: 2 }, true, false),
    mk('c2', '멈춘교회', '교회', '멈춤', [{ code: 'STOP1', status: '열림' }], { members: 3, depts: 1, households: 1, linked: 0, admins: 1 }, true, false),
    mk('c3', '<i>시험</i> 공간', '테스트', '열림', [{ code: 'TEST1', status: '열림' }], { members: 1, depts: 1, households: 0, linked: 0, admins: 1 }, true, false),
    mk('c4', '새싹교회', '교회', '열림', [{ code: 'SPROUT', status: '열림' }], { members: 0, depts: 1, households: 0, linked: 0, admins: 0 }, false, true)
  ];
  const settings = { church_open: 'admins', church_apply: 'on', community_open: 'on', usage_track: 'off' };
  const allowed = { church_open: ['off', 'admins', 'on'], church_apply: ['off', 'admins', 'on'], community_open: ['off', 'admins', 'on'], usage_track: ['on', 'off'] };
  const logs = [{ at: '2026-11-18T09:30:00+09:00', action: 'setting', target: 'church_apply=on' }, { at: '2026-11-17T20:05:00+09:00', action: 'church-create', target: 'c3' }];
  const putLog = (action, target) => { logs.unshift({ at: new Date().toISOString(), action, target }); };
  churches.forEach(c => c.codes.forEach(x => usedCodes.push(x.code)));
  const normCode = v => String(v || '').toUpperCase().replace(/[^A-Z0-9가-힣]/g, '');
  const cList = () => ({ items: JSON.parse(JSON.stringify(churches)) });
  const sList = () => ({ items: Object.keys(settings).map(key => ({ key, value: settings[key], allowed: allowed[key] })) });
  const church = id => churches.find(c => c.id === id) || (() => { throw bad('교회를 찾지 못했어요.'); })();
  const addChurch = (name, kind, code) => {
    const c = mk('c-demo-' + (churches.length + 1), name, kind, '열림', [{ code, status: '열림' }], { members: 0, depts: 1, households: 0, linked: 0, admins: 0 }, false, false);
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
    : { by_status: { '열림': { n: 12, small: false }, '끝맺음': { n: 6, small: false }, '닫음': { n: 2, small: true } }, avg_members_open: { v: 6.4, small: false }, ending_14d: { n: 5, small: false } };
  const dbPct = Math.min(100, Math.max(0, Number(q.get('db')) || 50));
  const dbSize = () => ({
    bytes: Math.round(524288000 * dbPct / 100), limit_bytes: 524288000, percent: dbPct, usage_events: 18342, oldest_event: '2026-04-21T03:00:00+09:00',
    top_tables: [['usage_event', 61865984, 18342], ['church_item', 20971520, 9120], ['church_member', 4194304, 1210], ['church_household', 2097152, 640], ['auth_user', 1048576, 480], ['admin_log', 524288, 120], ['church_dept', 262144, 60], ['church_code', 131072, 30], ['church_link', 65536, 12], ['koide_setting', 32768, 6]].map(t => ({ table: t[0], bytes: t[1], rows: t[2] }))
  });
  const today = () => ({
    apply: { pending: applies.filter(a => a.status === '대기').length, made: applies.filter(a => a.status === '만듦').length },
    feedback_unread: fbUnread(),
    reports_new: commReports().items.reduce((n, i) => n + i.new_count, 0),
    churches: { total: churches.length, test: churches.filter(c => c.kind === '테스트').length, stopped: churches.filter(c => c.status === '멈춤').length, no_admin: churches.filter(c => !c.has_admin).length },
    db: { bytes: dbSize().bytes, limit_bytes: 524288000, percent: dbPct },
    switches: Object.assign({}, settings)
  });
  window.AdminDemo = {
    mode,
    rpc: (name, a) => new Promise((ok, no) => setTimeout(() => {
      if (mode === 'out') return no(err('28000', 'login', 401));
      if (mode === 'error' && !failed) { failed = true; return no(err('XX000', 'internal', 500)); }
      if (name === 'admin_me') return ok({ admin: mode !== 'notadmin' });
      if (mode === 'notadmin') return no(err('P0001', 'bad: 앱 관리자만 할 수 있어요.', 400));
      if (name === 'admin_today') return ok(today());
      try {
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
        if (name === 'admin_log_list') return ok({ items: JSON.parse(JSON.stringify(logs)) });
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
