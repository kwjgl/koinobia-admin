/* ?demo: 가짜 서버. 화면 확인용이라 이름과 숫자는 모두 지어낸 것이다. 쓰기는 메모리에만 반영한다.
   ?demo  앱 관리자   ?demo=out  로그인 전   ?demo=notadmin  앱 관리자 아님   ?demo=error  첫 호출 실패
   ?demo=empty  신청 없음
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
  const today = () => ({
    apply: { pending: applies.filter(a => a.status === '대기').length, made: applies.filter(a => a.status === '만듦').length },
    feedback_unread: 2,
    reports_new: 1,
    churches: { total: 4, test: 1, stopped: 1, no_admin: 2 },
    db: { bytes: 262144000, limit_bytes: 524288000, percent: 50 },
    switches: { church_open: 'admins', church_apply: 'on', community_open: 'on', usage_track: 'off' }
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
          usedCodes.push(c); it.status = '만듦'; it.churchId = 'c-demo-' + it.id;
          return ok(Object.assign(applyList(), { made: { churchId: it.churchId, code: c } }));
        }
        if (name === 'church_apply_reject') {
          const it = find(a.p_id), r = String(a.p_reason || '');
          if (r.length > 60) throw bad('사유는 60자 이하로 적어 주세요.');
          it.status = '거절'; it.reason = r; return ok(applyList());
        }
      } catch (e) { return no(e); }
      no(err('PGRST202', 'not found', 404));
    }, 150))
  };
})();
