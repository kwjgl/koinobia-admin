/* 저장 공간: admin_db_size 결과. 사람 수가 아니라 서버 크기라 가리지 않는다.
   반원 게이지는 SVG 속성으로만 그린다(style 속성 없음). 모양은 CSS 클래스로 정한다. */
(function () {
  const { el } = UI;
  const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const mb = b => (num(b) / 1048576).toFixed(1) + 'MB';

  function render(d) {
    const pct = num(d.percent), tables = Array.isArray(d.top_tables) ? d.top_tables : [];
    const kids = [el('h1', null, '저장 공간'),
      el('div', { class: 'card' },
        el('p', { class: 'st-big' }, mb(d.bytes) + ' 사용 중'),
        Charts.gauge(pct, { label: '저장 공간 ' + pct + '% 사용. 70%에서 주의, 90%에서 한도 임박', sub: '사용 중' }),
        el('p', { class: 'hint' }, mb(d.bytes) + ' / ' + mb(d.limit_bytes))),
    ];
    if (pct >= 90) kids.push(el('div', { class: 'card st-note bad' }, el('p', { class: 'msg' }, '한도에 거의 다 왔어요. Supabase Pro나 정리를 알아보세요.')));
    else if (pct >= 70) kids.push(el('div', { class: 'card st-note' }, el('p', { class: 'msg' }, '곧 한도가 다가와요.')));
    const oldest = d.oldest_event ? String(d.oldest_event).slice(0, 10) : '';
    kids.push(UI.withInfo(el('p', { class: 'eyebrow' }, '쌓인 이용 기록'), '오래된 기록은 매달 1일 새벽 3시 10분에 자동으로 정리돼요(pg_cron이 켜져 있을 때).'));
    kids.push(el('div', { class: 'card' },
      el('dl', { class: 'ap-info' },
        el('dt', null, '줄 수'), el('dd', null, num(d.usage_events).toLocaleString('ko-KR') + '줄'),
        el('dt', null, '가장 오래된 날'), el('dd', null, oldest || '없음'))));
    kids.push(el('p', { class: 'eyebrow' }, '큰 표 ' + Math.min(10, tables.length) + '개'));
    if (!tables.length) kids.push(el('div', { class: 'card' }, el('p', { class: 'msg' }, '표 정보가 없어요.')));
    else kids.push(el('div', { class: 'card st-tbl-wrap' }, el('table', { class: 'st-tbl' },
      el('thead', null, el('tr', null, el('th', null, '표 이름'), el('th', null, '크기'), el('th', null, '대략 줄 수'))),
      el('tbody', null, ...tables.slice(0, 10).map(t => el('tr', null,
        el('td', null, String(t.table || '')), el('td', null, mb(t.bytes)), el('td', null, num(t.rows).toLocaleString('ko-KR'))))))));
    kids.push(serverCard());
    return el('section', null, ...kids);
  }

  // 서버 준비 상태: 단추를 눌렀을 때만 읽기 함수를 불러 본다. 없는 번호는 pray-for supabase 폴더에서 넣는다
  const STATE = { ok: '있음', missing: '없음', unknown: '확인하지 못했어요' };
  function serverCard() {
    const box = el('div', { class: 'card' });
    let busy = false, res = null;
    const paint = () => {
      const go = el('button', { class: 'btn small ghost', type: 'button', disabled: busy, onclick: run }, busy ? '점검 중…' : res ? '다시 점검하기' : '점검하기');
      const kids = [go];
      if (res) {
        kids.push(el('dl', { class: 'ap-info' }, ...res.flatMap(r => [el('dt', null, r.num + ' · ' + r.use),
          el('dd', null, r.state === 'ok' ? STATE.ok : el('span', { class: 'ch-todo' + (r.state === 'missing' ? '' : ' warn') }, STATE[r.state]))])));
        const miss = res.filter(r => r.state === 'missing').map(r => r.num);
        if (miss.length) kids.push(el('p', { class: 'hint' }, '없는 번호(' + miss.join(', ') + ')는 pray-for 저장소 supabase 폴더의 같은 번호 파일을 Supabase 콘솔 SQL Editor에서 실행하면 돼요.'));
      }
      box.replaceChildren(...kids);
    };
    async function run() {
      if (busy) return;
      busy = true; paint();
      try { res = await api.serverCheck(); } catch (e) { res = null; }
      busy = false; paint();
    }
    paint();
    return el('div', null,
      UI.withInfo(el('p', { class: 'eyebrow' }, '서버 준비 상태'), '서버 SQL 번호가 Supabase에 들어갔는지 읽기만 해서 알려 줘요. 아무것도 바꾸지 않아요. 036·037·039·040·041·042를 봐요.', { label: '서버 준비 상태 도움말' }),
      box);
  }
  window.Views = Object.assign(window.Views || {}, { storage: { render } });
})();
