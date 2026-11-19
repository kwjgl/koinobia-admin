/* 화면 도우미. 서버가 준 글은 모두 textContent(글자 노드)로만 넣는다. innerHTML·style 속성은 쓰지 않는다. */
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
  window.UI = { el, toast };
})();
