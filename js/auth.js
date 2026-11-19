/* 로그인 전 화면과 앱 관리자 아님 화면. 서버와 이야기하는 것은 api.js가 한다. */
(function () {
  const { el, toast } = UI;
  const NAMES = { kakao: '카카오', google: '구글', apple: '애플' };

  // 로그인 전: 가능한 방법마다 버튼 하나
  function loginView(providers, msg, onPick) {
    return el('div', { class: 'gate' },
      el('h1', null, '코이노비아 앱 관리'),
      el('div', { class: 'card' },
        el('p', { class: 'msg' }, '앱 관리자만 들어올 수 있어요. 코이데에서 쓰던 방법으로 로그인해 주세요.'),
        msg ? el('p', { class: 'err' }, msg) : null,
        ...providers.map(p => el('button', { class: 'btn wide', type: 'button', onclick: () => onPick(p) }, NAMES[p] + '로 로그인')),
        el('p', { class: 'hint' }, '이 기기에 로그인이 유지돼요. 공용 컴퓨터에서는 다 쓰고 꼭 로그아웃해 주세요.')));
  }

  // 앱 관리자 아님: 본인 계정 번호(복사 버튼)와 로그인 방법을 보여 준다. 번호는 화면에만 둔다
  function notAdminView(sess, onLogout) {
    const uid = sess && sess.uid || '', prov = sess && sess.provider || '';
    return el('div', { class: 'gate' },
      el('h1', null, '코이노비아 앱 관리'),
      el('div', { class: 'card' },
        el('p', { class: 'msg' }, '이 계정은 앱 관리자가 아니에요.'),
        el('p', { class: 'msg' }, '코이데에서 쓰던 로그인 방법과 같은 방법으로 로그인했는지 확인해 주세요.'),
        el('p', { class: 'label' }, '로그인 방법'),
        el('p', { class: 'msg' }, NAMES[prov] || prov || '알 수 없음'),
        el('p', { class: 'label' }, '내 계정 번호'),
        el('p', { class: 'aa-code' }, uid || '알 수 없음'),
        uid ? el('button', { class: 'btn small ghost', type: 'button', onclick: async () => {
          try { await navigator.clipboard.writeText(uid); toast('번호를 복사했어요.'); }
          catch (e) { toast('복사하지 못했어요. 번호를 길게 눌러 복사해 주세요.'); }
        } }, '번호 복사') : null,
        el('p', { class: 'hint' }, '이 번호를 채팅이나 GitHub에 올리지 마세요. 앱 관리자로 넣어 줄 사람에게만 직접 알려 주세요.'),
        el('button', { class: 'btn ghost wide', type: 'button', onclick: onLogout }, '로그아웃')));
  }

  window.Auth = { loginView, notAdminView };
})();
