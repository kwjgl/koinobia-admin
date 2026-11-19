/* 그래프 도구(직접 SVG). 외부 라이브러리·CDN 없음. 색은 css/admin.css의 변수만 쓰고, 여러 줄은 선 모양(실선·점선)과 줄 끝 이름으로 나눈다.
   스타일은 CSS 클래스와 SVG 속성(fill·stroke·opacity)으로만 한다(style 속성 없음). 서버가 준 글은 글자 노드로만 넣는다.
   가려진 값({n,small:true} 등)은 0이 아니라 "빈 칸 + 5명 미만"으로 그린다. 값을 모를 때는 null로 받는다. */
(function () {
  const { el } = UI;
  const NS = 'http://www.w3.org/2000/svg';
  const W = window.innerWidth >= 700 ? 720 : 360;  // 모든 그래프의 가로 눈금(viewBox). 넓은 화면은 눈금을 넓혀 글씨가 커지지 않게 한다
  const MASK = '5명 미만';
  const DASH = ['', '6 3', '1.5 3.5'];             // 실선·점선·점점선

  function svg(tag, attrs, ...kids) {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (v != null && v !== false) n.setAttribute(k, v); });
    kids.forEach(k => { if (k != null) n.append(k.nodeType ? k : document.createTextNode(String(k))); });
    return n;
  }
  const txt = (x, y, s, cls, anchor) => svg('text', { x, y, class: cls || 'gr-txt', 'text-anchor': anchor || 'start' }, s);
  const fmtN = v => Number(v).toLocaleString('ko-KR');
  const pct = r => (Math.round(Number(r) * 1000) / 10) + '%';
  // {n,small}·{r,small}·{v,small} 중 값 하나를 꺼낸다. 가려졌으면 null(0이 아니다)
  const pick = (o, k) => (o && !o.small && o[k] != null && Number.isFinite(Number(o[k]))) ? Number(o[k]) : null;
  const isMask = o => !o || !!o.small || o.n == null && o.r == null && o.v == null;

  function niceMax(m) {
    if (!(m > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(m))), f = m / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }
  // 기간 글자: day 11/19, week 11/17 주, month 26.11
  function plabel(p, grain) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(p || ''));
    if (!m) return String(p || '');
    if (grain === 'month') return m[1].slice(2) + '.' + Number(m[2]);
    return Number(m[2]) + '/' + Number(m[3]) + (grain === 'week' ? '주' : '');
  }

  // ---- 표로 보기 ----
  function table(head, rows) {
    return el('div', { class: 'us-tblw' }, el('table', { class: 'st-tbl' },
      el('thead', null, el('tr', null, ...head.map(h => el('th', null, h)))),
      el('tbody', null, ...rows.map(r => el('tr', null, ...r.map(c => el('td', null, c == null ? MASK : c)))))));
  }
  // 그래프 하나를 감싼다: 그래프(role=img, 요약 aria-label)와 같은 데이터를 표로 바꿔 보는 단추
  function figure(o) {
    const box = el('div', { class: 'gr-fig' });
    const tbl = o.table ? table(o.table.head, o.table.rows) : null;
    const g = el('div', { class: 'gr-view' }, o.svg);
    if (tbl) tbl.hidden = true;
    let on = false;
    const btn = tbl ? el('button', { class: 'link', type: 'button', 'aria-pressed': 'false', onclick: () => {
      on = !on; tbl.hidden = !on; g.hidden = on;
      btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? '그래프로 보기' : '표로 보기';
    } }, '표로 보기') : null;
    box.append(g);
    if (tbl) box.append(tbl);
    if (o.legend) box.append(legend(o.legend));
    if (btn) box.append(el('div', { class: 'gr-tools' }, btn));
    return box;
  }
  // 범례: [['line','글'], ['mask','글'], ['bar'..], ['empty'..], ['dash'..]]
  function legend(items) {
    return el('div', { class: 'gr-key' }, ...items.map(([k, t]) => {
      const s = svg('svg', { class: 'gr-sw', viewBox: '0 0 18 12', 'aria-hidden': 'true' });
      if (k === 'mask') s.append(svg('rect', { class: 'gr-hmask', x: 1, y: 1, width: 16, height: 10 }));
      else if (k === 'bar') s.append(svg('rect', { class: 'gr-bar', x: 1, y: 1, width: 16, height: 10 }));
      else if (k === 'mid') s.append(svg('rect', { class: 'gr-bar mid', x: 1, y: 1, width: 16, height: 10 }));
      else if (k === 'empty') s.append(svg('rect', { class: 'gr-cell', x: 1, y: 1, width: 16, height: 10 }));
      else s.append(svg('line', { class: 'gr-line', x1: 1, y1: 6, x2: 17, y2: 6, 'stroke-dasharray': k === 'dash' ? DASH[1] : k === 'dot' ? DASH[2] : null }));
      return el('span', { class: 'gr-keyi' }, s, t);
    }));
  }

  // ---- 꺾은선: xs(기간 글자들), series [{name, values:[number|null]}]. 가려진(null) 칸은 선을 끊고 회색 띠로 표시 ----
  function line(xs, series, o) {
    o = o || {};
    const H = 170, L = 36, T = 10, B = 24, R = series.length > 1 ? 64 : 12, pw = W - L - R, ph = H - T - B, n = xs.length;
    const all = series.flatMap(s => s.values).filter(v => v != null);
    const top = niceMax(Math.max(0, ...all)), fmt = o.fmt || fmtN;
    const X = i => L + (n === 1 ? pw / 2 : i * pw / (n - 1)), Y = v => T + ph - v / top * ph;
    const g = svg('svg', { class: 'gr-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.label || '꺾은선 그래프' });
    [0, .5, 1].forEach(f => {
      const y = T + ph - f * ph;
      g.append(svg('line', { class: 'gr-grid', x1: L, y1: y, x2: W - R, y2: y }), txt(L - 4, y + 3, fmt(top * f), 'gr-txt', 'end'));
    });
    const bw = n === 1 ? 24 : pw / (n - 1);
    for (let i = 0; i < n; i++) {
      if (series.every(s => s.values[i] == null)) {
        const x0 = Math.max(L, X(i) - bw / 2), x1 = Math.min(W - R, X(i) + bw / 2);
        g.append(svg('rect', { class: 'gr-band', x: x0, y: T, width: Math.max(1, x1 - x0), height: ph }));
      }
    }
    const step = Math.max(1, Math.ceil(n / 6));
    for (let i = 0; i < n; i += step) g.append(txt(X(i), H - 8, xs[i], 'gr-txt', 'middle'));
    series.forEach((s, si) => {
      let d = '', pen = false, last = -1;
      s.values.forEach((v, i) => {
        if (v == null) { pen = false; return; }
        d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); pen = true; last = i;
      });
      if (d) g.append(svg('path', { class: 'gr-line', d, 'stroke-dasharray': DASH[si] || null }));
      s.values.forEach((v, i) => {
        if (v == null) return;
        const alone = (i === 0 || s.values[i - 1] == null) && (i === n - 1 || s.values[i + 1] == null);
        if (alone || n <= 31) g.append(svg('circle', { class: 'gr-dot', cx: X(i), cy: Y(v), r: alone ? 3 : 2 }));
      });
      if (series.length > 1 && last >= 0) g.append(txt(Math.min(W - 2, X(last) + 5), Y(s.values[last]) + 3, s.name, 'gr-txt'));
    });
    return g;
  }

  // ---- 세로 막대: cols [{label, v|null}] 또는 두 묶음 [{label, vs:[a|null, b|null]}]. 0에서 시작. null이면 점선 빈 칸 ----
  function barsV(cols, o) {
    o = o || {};
    const H = 170, L = 36, T = 16, B = 24, pw = W - L - 8, ph = H - T - B, n = cols.length, fmt = o.fmt || fmtN;
    const vsOf = c => c.vs || [c.v], k = Math.max(1, ...cols.map(c => vsOf(c).length));
    const top = niceMax(Math.max(0, ...cols.flatMap(c => vsOf(c)).filter(v => v != null)));
    const slot = n ? pw / n : pw, gw = slot * .7, bw = gw / k, showVal = n * k <= 16;
    const g = svg('svg', { class: 'gr-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.label || '막대 그래프' });
    [0, .5, 1].forEach(f => {
      const y = T + ph - f * ph;
      g.append(svg('line', { class: 'gr-grid', x1: L, y1: y, x2: W - 8, y2: y }), txt(L - 4, y + 3, fmt(top * f), 'gr-txt', 'end'));
    });
    const step = Math.max(1, Math.ceil(n / 8));
    cols.forEach((c, i) => {
      const cx = L + slot * i + slot / 2;
      vsOf(c).forEach((v, j) => {
        const x = cx - gw / 2 + j * bw, mx = x + bw / 2;
        if (v == null) {
          g.append(svg('rect', { class: 'gr-hmask', x: x + 1, y: T + ph - 34, width: Math.max(2, bw - 2), height: 34 }));
          if (k === 1) g.append(txt(mx, T + ph - 18, '가림', 'gr-txt', 'middle'));
        } else {
          const h = v / top * ph;
          g.append(svg('rect', { class: 'gr-bar' + (j === 1 ? ' mid' : '') + (c.partial ? ' part' : ''), x: x + (k > 1 ? 1 : 0), y: T + ph - h, width: Math.max(2, bw - (k > 1 ? 2 : 0)), height: Math.max(h, v > 0 ? 1 : 0) }));
          if (showVal) g.append(txt(mx, T + ph - h - 4, k === 1 && c.text ? c.text : fmt(v), 'gr-val', 'middle'));
        }
      });
      if (i % step === 0) g.append(txt(cx, H - 8, c.label, 'gr-txt', 'middle'));
    });
    return g;
  }

  // ---- 가로 막대: rows [{label, v|null, text}] 줄마다 이름 위, 막대 아래. null이면 점선 + "5명 미만" ----
  function barsH(rows, o) {
    o = o || {};
    const RH = 36, BX = 0, BW = W - 110, fmt = o.fmt || fmtN, H = Math.max(RH, rows.length * RH);
    const top = Math.max(o.max || 0, ...rows.map(r => r.v).filter(v => v != null)) || 1;
    const g = svg('svg', { class: 'gr-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.label || '가로 막대 그래프' });
    rows.forEach((r, i) => {
      const y = i * RH;
      g.append(txt(BX, y + 11, r.label, 'gr-lab'));
      if (r.v == null) {
        g.append(svg('rect', { class: 'gr-hmask', x: BX, y: y + 16, width: 56, height: 12 }), txt(BX + 62, y + 26, r.text || MASK + '이라 가렸어요', 'gr-txt'));
      } else {
        const w = r.v / top * BW;
        g.append(svg('rect', { class: 'gr-bar', x: BX, y: y + 16, width: Math.max(w, r.v > 0 ? 1 : 0), height: 12 }), txt(BX + w + 6, y + 26, r.text || fmt(r.v), 'gr-val'));
      }
    });
    return g;
  }

  // ---- 시간대 지도: cells [{dow(0=일), hour, events:{n,small}}] 사건이 있는 칸만 온다 ----
  function heat(cells) {
    const days = ['일', '월', '화', '수', '목', '금', '토'], L = 20, T = 14, cw = Math.floor((W - 20 - 4) / 24), ch = 16, H = T + 7 * ch + 4;
    const map = new Map(cells.map(c => [c.dow + '-' + c.hour, c]));
    const vals = cells.map(c => pick(c.events, 'n')).filter(v => v != null), max = Math.max(1, ...vals);
    const g = svg('svg', { class: 'gr-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': '요일과 시간대 지도' });
    [0, 6, 12, 18, 23].forEach(h => g.append(txt(L + h * cw + cw / 2, 9, String(h), 'gr-txt', 'middle')));
    days.forEach((d, r) => {
      g.append(txt(2, T + r * ch + 11, d, 'gr-txt'));
      for (let h = 0; h < 24; h++) {
        const c = map.get(r + '-' + h), x = L + h * cw + 1, y = T + r * ch + 1;
        if (!c) g.append(svg('rect', { class: 'gr-cell', x, y, width: cw - 2, height: ch - 2, rx: 2 }));
        else {
          const v = pick(c.events, 'n');
          if (v == null) g.append(svg('rect', { class: 'gr-hmask', x, y, width: cw - 2, height: ch - 2, rx: 2 }));
          else g.append(svg('rect', { class: 'gr-bar', x, y, width: cw - 2, height: ch - 2, rx: 2, 'fill-opacity': (0.15 + 0.85 * v / max).toFixed(2) }));
        }
      }
    });
    return g;
  }

  // ---- 깔때기: steps [{label, users:{n,small}, from_prev, from_first}] 가려진 단계와 그 뒤는 가림 ----
  function funnel(steps) {
    const RH = 48, BW = W - 130, H = Math.max(RH, steps.length * RH);
    const first = pick(steps[0] && steps[0].users, 'n');
    const g = svg('svg', { class: 'gr-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': '단계별 흐름 깔때기' });
    let masked = false;
    steps.forEach((s, i) => {
      const y = i * RH, v = pick(s.users, 'n');
      if (v == null || first == null) masked = true;
      g.append(txt(0, y + 11, (i + 1) + '. ' + s.label, 'gr-lab'));
      if (masked) {
        g.append(svg('rect', { class: 'gr-hmask', x: 0, y: y + 16, width: 56, height: 14 }), txt(62, y + 27, MASK + '이라 가렸어요', 'gr-txt'));
      } else {
        const w = v / first * BW;
        g.append(svg('rect', { class: 'gr-bar', x: 0, y: y + 16, width: Math.max(w, v > 0 ? 1 : 0), height: 14 }), txt(w + 6, y + 27, fmtN(v) + '명', 'gr-val'));
        const a = pick(s.from_prev, 'r'), b = pick(s.from_first, 'r');
        if (i > 0) g.append(txt(0, y + 44, '앞 단계 대비 ' + (a == null ? MASK : pct(a)) + ' · 첫 단계 대비 ' + (b == null ? MASK : pct(b)), 'gr-txt'));
      }
    });
    return g;
  }

  // ---- 코호트 표: 비율 칸의 진하기는 클래스(l1~l4)로 ----
  function cohortTable(head, rows) {
    const lv = r => r < .2 ? 'l1' : r < .4 ? 'l2' : r < .6 ? 'l3' : 'l4';
    return el('div', { class: 'us-tblw' }, el('table', { class: 'st-tbl us-coh' },
      el('thead', null, el('tr', null, ...head.map(h => el('th', null, h)))),
      el('tbody', null, ...rows.map(r => el('tr', null, el('td', null, r.label),
        el('td', null, r.size == null ? MASK : fmtN(r.size) + '명'),
        ...r.rates.map(x => x == null ? el('td', { class: 'mask' }, '가림') : el('td', { class: lv(x) }, pct(x))))))));
  }

  // ---- 숫자 타일: items [{label, value(숫자·글자·null), note}] null이면 "5명 미만" ----
  function tiles(items) {
    return el('dl', { class: 'gr-tiles' }, ...items.map(t => el('div', null,
      el('dt', null, t.label),
      el('dd', { class: t.value == null ? 'mask' : null }, t.value == null ? MASK : String(t.value)),
      t.note ? el('dd', { class: 'note' }, t.note) : null)));
  }

  window.Charts = { line, barsV, barsH, heat, funnel, cohortTable, tiles, table, figure, legend, pick, isMask, plabel, fmtN, pct, MASK };
})();
