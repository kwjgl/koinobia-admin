/* ?demo: 가짜 기본 서버. 화면 확인용이라 이름과 숫자는 모두 지어낸 것이다.
   ?demo  로그인된 앱 관리자(교회 3곳)   ?demo=out  로그인 전   ?demo=notadmin  앱 관리자 아님 */
(function () {
  const q = new URLSearchParams(location.search);
  if (!q.has('demo')) return;
  const mode = q.get('demo') || 'in';
  const churches = [
    { id: 'A', name: '샘플 사랑교회', kind: '교회', codes: ['SAMPLE1'], stopped: false, memo: '지어낸 예시', came: 12, status: { version: '2026-11-08 예시' }, err: null, didako: 'x', didakoStatus: { version: '2026-11-08', errors: 0 }, didakoErr: null },
    { id: 'B', name: '예시 소망교회 <b>굵게</b>', kind: '교회', codes: ['SAMPLE2'], stopped: false, memo: '<i>글자로만</i> 보여야 한다', came: 5, status: null, err: '서버가 답하지 않았어요', didako: '', didakoStatus: null, didakoErr: null },
    { id: 'TEST', name: '테스트 공간', kind: '테스트', codes: ['TEST1'], stopped: true, memo: '', came: 0, status: { version: '2026-11-08 예시' }, err: null, didako: '', didakoStatus: null, didakoErr: null }
  ];
  window.AdminDemo = {
    mode,
    call: (action, body, st) => new Promise((ok, no) => setTimeout(() => {
      if (action === 'login') return ok({ token: 'demo', nick: '데모' });
      if (action === 'admin') {
        if (mode === 'out') return no({ code: 'login', message: '다시 로그인해 주세요.' });
        if (mode === 'notadmin') return no({ code: 'forbidden', message: '앱 관리자만 볼 수 있어요. 내 카카오ID: 1234567890' });
        return ok({ me: '1234567890', version: '2026-11-08 예시 기본 서버', churches });
      }
      no({ code: 'bad', message: '모르는 요청이에요.' });
    }, 150))
  };
})();
