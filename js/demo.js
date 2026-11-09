/* ?demo: 가짜 기본 서버. 화면 확인용이라 이름과 숫자는 모두 지어낸 것이다.
   ?demo  로그인된 앱 관리자(교회 4곳)   ?demo=out  로그인 전   ?demo=notadmin  앱 관리자 아님 */
(function () {
  const q = new URLSearchParams(location.search);
  if (!q.has('demo')) return;
  const mode = q.get('demo') || 'in';
  let churches = [
    { id: 'A', url: 'https://script.google.com/macros/s/DEMO-A/exec', name: '샘플 사랑교회', kind: '교회', codes: 'SAMPLE1, 샘플', stopped: false, memo: '지어낸 예시', came: 12,
      status: { version: '2026-11-08 예시', depts: 3, linked: 40, errors: 0, asks: 0, opened: true, auto: false }, err: '',
      didako: 'https://script.google.com/macros/s/DEMO-DIDAKO-A/exec', didakoStatus: { version: '2026-11-08', errors: 0 }, didakoErr: '' },
    { id: 'B', url: 'https://script.google.com/macros/s/DEMO-B/exec', name: '예시 소망교회 <b>굵게</b>', kind: '교회', codes: 'SAMPLE2', stopped: false, memo: '<i>글자로만</i> 보여야 한다', came: 5,
      status: null, err: '서버가 답하지 않아요(404)', didako: 'https://script.google.com/macros/s/DEMO-DIDAKO-B/exec', didakoStatus: null, didakoErr: '서버가 답하지 않아요(500)' },
    { id: 'C', url: 'https://script.google.com/macros/s/DEMO-C/exec', name: '예시 믿음교회', kind: '교회', codes: 'SAMPLE3', stopped: false, memo: '', came: 7,
      status: { version: '2026-10-01 예시', depts: 2, linked: 20, errors: 3, asks: 2, opened: false, auto: true }, err: '',
      didako: 'https://script.google.com/macros/s/DEMO-DIDAKO-C/exec', didakoStatus: { version: '2026-11-08', errors: 2, writers: 9 }, didakoErr: '' },
    { id: 'TEST', url: 'https://script.google.com/macros/s/DEMO-TEST/exec', name: '테스트 공간', kind: '테스트', codes: '', stopped: true, memo: '', came: 0,
      status: { version: '2026-11-08 예시', depts: 0, linked: 0, errors: 0, asks: 0, opened: true, auto: false }, err: '',
      didako: '', didakoStatus: null, didakoErr: '' }
  ];
  const view = () => ({ me: '1234567890', version: '2026-11-08 예시 기본 서버', churches });
  window.AdminDemo = {
    mode,
    call: (action, body, st) => new Promise((ok, no) => setTimeout(() => {
      if (action === 'login') return ok({ token: 'demo', nick: '데모' });
      if (action === 'admin') {
        if (mode === 'out') return no({ code: 'login', message: '다시 로그인해 주세요.' });
        if (mode === 'notadmin') return no({ code: 'forbidden', message: '앱 관리자만 볼 수 있어요. 내 카카오ID: 1234567890' });
        return ok(view());
      }
      if (action === 'churchSave' || action === 'invite') {
        if (mode === 'out') return no({ code: 'login', message: '다시 로그인해 주세요.' });
        if (mode === 'notadmin') return no({ code: 'forbidden', message: '앱 관리자만 볼 수 있어요.' });
      }
      if (action === 'churchSave') {
        if (!body.name) return no({ code: 'bad', message: '이름을 써 주세요.' });
        if (!String(body.url).startsWith('https://script.google.com/macros/s/') || !String(body.url).endsWith('/exec'))
          return no({ code: 'bad', message: '서버 주소는 Apps Script 웹 앱 주소(https://script.google.com/macros/s/…/exec)로 넣어 주세요.' });
        if (!body.orig && churches.some(c => c.id === body.id)) return no({ code: 'bad', message: '같은 이름표가 이미 있어요.' });
        if (body.orig) churches = churches.map(c => c.id === body.orig ? Object.assign({}, c, body, { id: c.id }) : c);
        else churches.push(Object.assign({}, body, { status: null, err: '아직 서버에 묻지 않았어요(데모)', came: 0, didakoStatus: null, didakoErr: '' }));
        return ok(view());
      }
      if (action === 'invite') {
        if (body.id === 'B') return no({ code: 'bad', message: '그 교회 서버가 답하지 않아요. 서버 주소를 확인해 주세요.' });
        const c = churches.find(c => c.id === body.id);
        if (!c) return no({ code: 'bad', message: '교회를 찾지 못했어요.' });
        return ok({ link: 'https://koide.example.invalid/app/?opsjoin=DEMO-TOKEN&church=' + encodeURIComponent(c.codes.split(',')[0].trim()), until: '2026-11-16 15:00' });
      }
      no({ code: 'bad', message: '모르는 요청이에요.' });
    }, 150))
  };
})();
