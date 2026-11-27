/* 소식 글 본문(마크다운 일부)을 화면용 DOM으로 바꾼다. 미리보기에 쓴다. 글은 모두 글자 노드로만 넣는다(innerHTML 없음).
   대문 사이트 koinobia 저장소의 blog.js(md)와 같은 규칙이다. 한쪽을 고치면 다른 쪽도 손으로 맞춘다.
   규칙: 빈 줄 = 문단 나누기, # ## ### = 작은 제목, > = 인용, - 또는 * = 점 목록, 1. = 번호 목록,
   **굵게**, *기울임*, [글자](https://주소 · /주소 · #글-id). HTML은 쓸 수 없고 글자로만 보인다. */
(function () {
  const H = /^#{1,3}\s+(.+)$/, UL = /^[-*]\s+(.*)$/, OL = /^\d+[.)]\s+(.*)$/, Q = /^>\s?(.*)$/;
  const starts = t => H.test(t) || UL.test(t) || OL.test(t) || Q.test(t);
  const O = '\u0001', C = '\u0002', S = '\u0003';   // 꾸밈 표시용 임시 글자(본문에서는 미리 지운다)

  // 한 줄 안의 꾸밈. 대문 사이트와 같은 순서(굵게 → 기울임 → 링크)로 바꾼 뒤 노드로 만든다
  function inline(raw) {
    const s = String(raw).replace(/[\u0001-\u0003]/g, '')
      .replace(/\*\*(.+?)\*\*/g, O + 'b' + C + '$1' + O + '/b' + C)
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1' + O + 'e' + C + '$2' + O + '/e' + C)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*|#[\w-]+)\)/g, O + 'a' + S + '$2' + C + '$1' + O + '/a' + C);
    const root = document.createDocumentFragment(), stack = [{ tag: null, node: root }];
    const top = () => stack[stack.length - 1].node;
    const re = /\u0001([^\u0002]*)\u0002/g;
    let last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) top().append(document.createTextNode(s.slice(last, m.index)));
      last = re.lastIndex;
      const mark = m[1];
      if (mark[0] === '/') {
        const k = stack.map(x => x.tag).lastIndexOf(mark.slice(1));
        if (k > 0) stack.length = k;   // 짝이 안 맞게 겹치면 안쪽까지 함께 닫는다
      } else {
        const type = mark[0], n = document.createElement(type === 'b' ? 'b' : type === 'e' ? 'em' : 'a');
        if (type === 'a') { n.setAttribute('href', mark.slice(2)); if (/^https?:/.test(mark.slice(2))) { n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener'); } }
        top().append(n); stack.push({ tag: type, node: n });
      }
    }
    if (last < s.length) top().append(document.createTextNode(s.slice(last)));
    return root;
  }
  const withInline = (tag, text) => { const n = document.createElement(tag); n.append(inline(text)); return n; };

  // 본문 → div.md. 빈 본문이면 빈 div
  function render(text) {
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n'), n = lines.length, out = document.createElement('div');
    out.className = 'md';
    let i = 0, m;
    const take = re => { const rows = []; while (i < n && (m = re.exec(lines[i].trim()))) { rows.push(m[1]); i++; } return rows; };
    while (i < n) {
      let t = lines[i].trim();
      if (!t) { i++; continue; }
      if ((m = H.exec(t))) { out.append(withInline('h3', m[1])); i++; continue; }
      if (UL.test(t) || OL.test(t)) {
        const ul = UL.test(t), list = document.createElement(ul ? 'ul' : 'ol');
        take(ul ? UL : OL).forEach(x => list.append(withInline('li', x)));
        out.append(list); continue;
      }
      if (Q.test(t)) {
        const bq = document.createElement('blockquote');
        take(Q).forEach((x, k) => { if (k) bq.append(document.createElement('br')); bq.append(inline(x)); });
        out.append(bq); continue;
      }
      const p = document.createElement('p');
      let k = 0;
      while (i < n) {
        t = lines[i].trim();
        if (!t || starts(t)) break;
        if (k++) p.append(document.createElement('br'));
        p.append(inline(t)); i++;
      }
      out.append(p);
    }
    return out;
  }
  // 요약이 비었을 때 사이트가 본문 첫 문단으로 만드는 한 줄(대문 사이트 blog.js의 lead와 같다)
  function lead(text) {
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n'), rows = [];
    let i = 0;
    while (i < lines.length && (!lines[i].trim() || starts(lines[i].trim()))) {
      const t0 = lines[i].trim();
      if (t0) { const re = H.test(t0) ? H : UL.test(t0) ? UL : OL.test(t0) ? OL : Q; while (i < lines.length && re.test(lines[i].trim())) i++; } else i++;
    }
    while (i < lines.length && lines[i].trim() && !starts(lines[i].trim())) { rows.push(lines[i].trim()); i++; }
    const p = rows.join(' ');
    return p.length > 110 ? p.slice(0, 108).replace(/\s+\S*$/, '') + '…' : p;
  }
  window.Markdown = { render, inline, lead };
})();
