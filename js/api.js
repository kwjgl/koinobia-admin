/* 서버 부르기는 이 파일에만 둔다.
   화면 코드(app.js, auth.js)는 api.admin(), api.login(code)처럼 뜻으로만 부르고, 기본 서버 주소와 요청 모양을 모른다.
   나중에 Supabase로 바꿀 때 이 파일 안쪽만 갈아 끼운다(docs/design.md 결정 기록).
   모든 함수는 성공하면 값을 주고, 실패하면 { code, message }를 던진다. code가 'login'이면 로그인 표시를 이미 지운 뒤다. */
(function () {
  const CFG = window.ADMIN_CONFIG || {};
  const DEMO = window.AdminDemo || null;
  const KEY = 'koinobia-admin-token';
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* 이번만 */ } };

  let slowHook = null;   // 서버가 4초 넘게 답하지 않을 때 부르는 함수(화면이 정한다)

  // 기본 서버 요청 하나: 본문은 JSON 글자 그대로(Apps Script가 사전 요청 없이 받게), 60초 제한
  async function call(action, data) {
    if (DEMO) return DEMO.call(action, data || {}, { hasToken: !!lsGet(KEY) });
    if (!CFG.HUB_URL) throw { code: 'config', message: '기본 서버 주소가 아직 설정되지 않았어요. config.js의 HUB_URL을 채워 주세요.' };
    const body = Object.assign({ action, token: lsGet(KEY) }, data || {});
    const slow = setTimeout(() => { if (slowHook) slowHook(); }, 4000);
    const ctl = new AbortController(), stop = setTimeout(() => ctl.abort(), 60000);
    let res;
    try { res = await (await fetch(CFG.HUB_URL, { method: 'POST', body: JSON.stringify(body), signal: ctl.signal })).json(); }
    catch (e) { throw { code: 'net', message: '서버가 답하지 않아요. 잠시 뒤 다시 해 주세요.' }; }
    finally { clearTimeout(slow); clearTimeout(stop); }
    if (!res.ok) {
      if (res.code === 'login') lsSet(KEY, null);
      throw { code: res.code, message: res.message };
    }
    return res.data;
  }

  window.api = {
    // 이 기기에 로그인 표시가 있는지(맞는지는 서버가 말해 준다)
    hasSession: () => DEMO ? DEMO.mode !== 'out' : !!lsGet(KEY),
    // 카카오가 돌려준 code로 로그인한다. 성공하면 로그인 표시를 이 기기에 적어 둔다
    login: async code => {
      const r = await call('login', { code, redirectUri: CFG.REDIRECT_URI || '' });
      lsSet(KEY, r.token);
      return { nick: r.nick };
    },
    logout: () => lsSet(KEY, null),
    // 앱 관리자 보기: { me, version, churches: [...] }. 앱 관리자가 아니면 code 'forbidden'(서버 문장 그대로)
    admin: () => call('admin'),
    // 교회 더하기·고치기. 성공하면 admin()과 같은 값을 준다
    saveChurch: data => call('churchSave', data),
    // 첫 관리자 초대 링크: { link, until }
    invite: id => call('invite', { id }),
    onSlow: fn => { slowHook = fn; }
  };
})();
