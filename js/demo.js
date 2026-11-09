/* ?demo: 가짜 기본 서버. 화면 확인용이라 이름과 숫자는 모두 지어낸 것이다.
   ?demo  로그인된 앱 관리자(교회 4곳)   ?demo=out  로그인 전   ?demo=notadmin  앱 관리자 아님 */
(function () {
  const q = new URLSearchParams(location.search);
  if (!q.has('demo')) return;
  const mode = q.get('demo') || 'in';
  const churches = [
    { id: 'A', name: '샘플 사랑교회', kind: '교회', codes: 'SAMPLE1, 샘플', stopped: false, memo: '지어낸 예시', came: 12,
      status: { version: '2026-11-08 예시', depts: 3, linked: 40, errors: 0, asks: 0, opened: true, auto: false }, err: '',
      didako: 'https://example.invalid/didako', didakoStatus: { version: '2026-11-08', errors: 0 }, didakoErr: '' },
    { id: 'B', name: '예시 소망교회 <b>굵게</b>', kind: '교회', codes: 'SAMPLE2', stopped: false, memo: '<i>글자로만</i> 보여야 한다', came: 5,
      status: null, err: '서버가 답하지 않아요(404)', didako: 'https://example.invalid/didako', didakoStatus: null, didakoErr: '서버가 답하지 않아요(500)' },
    { id: 'C', name: '예시 믿음교회', kind: '교회', codes: 'SAMPLE3', stopped: false, memo: '', came: 7,
      status: { version: '2026-10-01 예시', depts: 2, linked: 20, errors: 3, asks: 2, opened: false, auto: true }, err: '',
      didako: 'https://example.invalid/didako', didakoStatus: { version: '2026-11-08', errors: 2, writers: 9 }, didakoErr: '' },
    { id: 'TEST', name: '테스트 공간', kind: '테스트', codes: '', stopped: true, memo: '', came: 0,
      status: { version: '2026-11-08 예시', depts: 0, linked: 0, errors: 0, asks: 0, opened: true, auto: false }, err: '',
      didako: '', didakoStatus: null, didakoErr: '' }
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
