/* 저장 공간: admin_db_size 결과. 사람 수가 아니라 서버 크기라 가리지 않는다.
   막대는 SVG 속성으로만 그린다(style 속성 없음). 모양은 CSS 클래스로 정한다. */
(function () {
  const { el } = UI;
  const NS = 'http://www.w3.org/2000/svg';
  const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const mb = b => (num(b) / 1048576).toFixed(1) + 'MB';

  function svg(tag, attrs, ...kids) {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
    kids.forEach(k => n.append(k));
    return n;
  }
  function bar(pct) {
    const W = 300, x = Math.max(0, Math.min(100, pct)) * W / 100;
    return svg('svg', { class: 'st-bar', viewBox: '0 0 300 30', role: 'img', 'aria-label': '저장 공간 ' + pct + '% 사용' },
      svg('rect', { class: 'st-track', x: 0, y: 0, width: W, height: 14, rx: 7 }),
      svg('rect', { class: 'st-fill' + (pct >= 90 ? ' bad' : pct >= 70 ? ' warn' : ''), x: 0, y: 0, width: x, height: 14, rx: 7 }),
      svg('line', { class: 'st-tick', x1: W * .7, y1: 0, x2: W * .7, y2: 18 }),
      svg('line', { class: 'st-tick', x1: W * .9, y1: 0, x2: W * .9, y2: 18 }),
      svg('text', { class: 'st-lab', x: W * .7, y: 28, 'text-anchor': 'middle' }, '70%'),
      svg('text', { class: 'st-lab', x: W * .9, y: 28, 'text-anchor': 'middle' }, '90%'));
  }

  function render(d) {
    const pct = num(d.percent), tables = Array.isArray(d.top_tables) ? d.top_tables : [];
    const kids = [el('h1', null, '저장 공간'),
      el('div', { class: 'card' },
        el('p', { class: 'st-big' }, pct + '% 사용 중'),
        bar(pct),
        el('p', { class: 'hint' }, mb(d.bytes) + ' / ' + mb(d.limit_bytes))),
    ];
    if (pct >= 90) kids.push(el('div', { class: 'card st-note bad' }, el('p', { class: 'msg' }, '한도에 거의 다 왔어요. Supabase Pro나 정리를 알아보세요.')));
    else if (pct >= 70) kids.push(el('div', { class: 'card st-note' }, el('p', { class: 'msg' }, '곧 한도가 다가와요.')));
    const oldest = d.oldest_event ? String(d.oldest_event).slice(0, 10) : '';
    kids.push(el('p', { class: 'eyebrow' }, '쌓인 이용 기록'));
    kids.push(el('div', { class: 'card' },
      el('dl', { class: 'ap-info' },
        el('dt', null, '줄 수'), el('dd', null, num(d.usage_events).toLocaleString('ko-KR') + '줄'),
        el('dt', null, '가장 오래된 날'), el('dd', null, oldest || '없음')),
      el('p', { class: 'hint' }, '오래된 기록은 매달 1일 새벽 3시 10분에 자동으로 정리돼요(pg_cron이 켜져 있을 때).')));
    kids.push(el('p', { class: 'eyebrow' }, '큰 표 ' + Math.min(10, tables.length) + '개'));
    if (!tables.length) kids.push(el('div', { class: 'card' }, el('p', { class: 'msg' }, '표 정보가 없어요.')));
    else kids.push(el('div', { class: 'card st-tbl-wrap' }, el('table', { class: 'st-tbl' },
      el('thead', null, el('tr', null, el('th', null, '표 이름'), el('th', null, '크기'), el('th', null, '대략 줄 수'))),
      el('tbody', null, ...tables.slice(0, 10).map(t => el('tr', null,
        el('td', null, String(t.table || '')), el('td', null, mb(t.bytes)), el('td', null, num(t.rows).toLocaleString('ko-KR'))))))));
    return el('section', null, ...kids);
  }
  window.Views = Object.assign(window.Views || {}, { storage: { render } });
})();
