/* 화면 도우미. 서버가 준 글은 모두 textContent(글자 노드)로만 넣는다. innerHTML·style 속성은 쓰지 않는다.
   도움말 팝오버 위치는 CSS 클래스로만 잡는다(style 속성·CSSOM 위치 지정 없음). */
(function () {
  // el('p', {class:'hint'}, '글자') — 글자는 항상 글자 노드로
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v != null && v !== false) n.setAttribute(k, v === true ? '' : v);
    });
    kids.forEach(k => { if (k != null) n.append(k.nodeType ? k : document.createTextNode(String(k))); });
    return n;
  }
  function toast(t) {
    const b = document.getElementById('toast'); b.textContent = t; b.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { b.hidden = true; }, 3500);
  }

  // ---- 도움말: 풀이 글은 '?' 단추를 눌러 보는 팝오버로 둔다. 위치는 .tip-row(position:relative)와 CSS 클래스가 정한다 ----
  let seq = 0, cur = null;   // cur: 지금 열린 도움말 {btn, pop, pinned, hover}
  function paint(t) {        // 열림 = 눌러 고정(pinned) 또는 마우스 올림(hover)
    const on = t.pinned || t.hover;
    if (on && cur && cur !== t) { cur.pinned = cur.hover = false; paint(cur); }
    t.pop.hidden = !on; t.btn.setAttribute('aria-expanded', String(on));
    cur = on ? t : (cur === t ? null : cur);
  }
  // info(글 또는 글 배열, {up, left, label}) — left: 오른쪽 끝에 놓인 도움말은 팝오버를 왼쪽으로 펼친다 → span.tip. 반드시 .tip-row 안에서 쓴다(withInfo가 감싼다)
  function info(text, o) {
    o = o || {};
    const id = 'tip-' + (++seq), paras = [].concat(text);
    const btn = el('button', { class: 'tip-btn', type: 'button', 'aria-expanded': 'false', 'aria-controls': id, 'aria-label': o.label || '도움말' }, '?');
    const pop = el('div', { class: 'tip-pop' + (o.up ? ' up' : '') + (o.left ? ' left' : ''), id, role: 'tooltip', hidden: true }, ...paras.map(p => el('p', null, p)));
    const t = { btn, pop, pinned: false, hover: false };
    btn.addEventListener('click', () => { if (t.pinned || t.hover) t.pinned = t.hover = false; else t.pinned = true; paint(t); });
    btn.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { t.hover = true; paint(t); } });
    btn.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { t.hover = false; paint(t); } });
    return el('span', { class: 'tip' }, btn, pop);
  }
  // withInfo(노드, 글, {up, label}) → div.tip-row [노드, 도움말]. 글이 비면 노드를 그대로 돌려준다
  function withInfo(node, text, o) {
    if (!text || (Array.isArray(text) && !text.length)) return node;
    o = Object.assign({}, o);
    if (!o.label) o.label = (node.textContent || '') + ' 도움말';
    return el('div', { class: 'tip-row' }, node, info(text, o));
  }
  // 화면 읽기용(스크린리더) 상태 줄
  function say(text) {
    let r = document.getElementById('sr');
    if (!r) { r = el('div', { id: 'sr', class: 'sr', role: 'status', 'aria-live': 'polite' }); document.body.append(r); }
    r.textContent = text;
  }
  document.addEventListener('pointerdown', e => {
    if (cur && !cur.btn.isConnected) cur = null;
    if (cur && !cur.btn.contains(e.target) && !cur.pop.contains(e.target)) { cur.pinned = cur.hover = false; paint(cur); }
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !cur) return;
    if (!cur.btn.isConnected) { cur = null; return; }
    const b = cur.btn; cur.pinned = cur.hover = false; paint(cur); b.focus();
  });

  window.UI = { el, toast, info, withInfo, say };
})();
