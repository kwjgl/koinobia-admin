/* ?demo: 가짜 서버. 화면 확인용이라 이름과 숫자는 모두 지어낸 것이다. 쓰기는 메모리에만 반영한다.
   ?demo  앱 관리자   ?demo=out  로그인 전   ?demo=notadmin  앱 관리자 아님   ?demo=error  첫 호출 실패
   ?demo=empty  신청 없음(교회 목록은 그대로)
   (?demo=small·?demo=empty는 이용 통계 PR에서 더한다. 이름이 나오는 화면을 만들 때 `<b>굵게</b>`처럼 HTML을 넣어 글자로만 보이는지 본다) */
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
  const today = () => ({
    apply: { pending: applies.filter(a => a.status === '대기').length, made: applies.filter(a => a.status === '만듦').length },
    feedback_unread: 2,
    reports_new: 1,
    churches: { total: churches.length, test: churches.filter(c => c.kind === '테스트').length, stopped: churches.filter(c => c.status === '멈춤').length, no_admin: churches.filter(c => !c.has_admin).length },
    db: { bytes: 262144000, limit_bytes: 524288000, percent: 50 },
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
