/* 그래프 도구(직접 SVG). 외부 라이브러리·CDN 없음. 색은 css/admin.css의 그래프 전용 팔레트(--chart-*, --seq-*)와 코이데 변수만 쓴다.
   그래프 종류는 데이터에 맞게 고른다: 시간 흐름은 꺾은선·면적, 기간별 개수는 막대, 한 기간의 구성은 누적 막대·도넛, 순서형 크기는 히트맵,
   분포는 상자 그림·히스토그램, 한도 대비는 반원 게이지. 색 클래스 이름: gr-f1~f5·fo(채움), gr-s1~s5·so(선), gr-fq1~fq5·sq1~sq5(차례 단계).
   스타일은 CSS 클래스와 SVG 속성(fill·stroke·opacity)으로만 한다(style 속성 없음). 서버가 준 글은 글자 노드로만 넣는다.
   가려진 값({n,small:true} 등)은 0이 아니라 "빈 칸 + 5명 미만"으로 그린다. 값을 모를 때는 null로 받는다. */
(function () {
  const { el } = UI;
  const NS = 'http://www.w3.org/2000/svg';
  // 모든 그래프의 가로 눈금(viewBox). 카드를 그리기 직전에 setWidth(상자 폭)로 정해 눈금이 화면과 거의 1:1이 되게 한다(글씨가 늘어나지 않는다). 폭을 모르면 360/560
  let W = window.innerWidth >= 700 ? 560 : 360;
  const setWidth = px => { W = px > 0 ? clamp(Math.round(px), 320, 900) : (window.innerWidth >= 700 ? 560 : 360); };
  const maxbw = () => W > 400 ? 30 : 24;           // 막대 최대 폭: 칸이 적어도 막대가 두껍게 늘어나지 않는다
  const MASK = '5명 미만';
  // 가림 표시는 서버가 small:true를 준 응답일 때만 켠다(setMasking). 꺼져 있으면 값이 null이어도 "5명 미만"이 아니라 "—"와 빈 자리로 그린다
  let masking = true;
  const setMasking = on => { masking = !!on; };
  const mk = () => masking ? MASK : '—';
  const DASH = '6 3';

  function svg(tag, attrs, ...kids) {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (v != null && v !== false) n.setAttribute(k, v); });
    kids.forEach(k => { if (k != null) n.append(k.nodeType ? k : document.createTextNode(String(k))); });
    return n;
  }
  const txt = (x, y, s, cls, anchor) => svg('text', { x, y, class: cls || 'gr-txt', 'text-anchor': anchor || 'start' }, s);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const fmtN = v => Number(v).toLocaleString('ko-KR');
  const pct = r => (Math.round(Number(r) * 1000) / 10) + '%';
  const f1 = n => Math.round(n * 10) / 10;
  // {n,small}·{r,small}·{v,small} 중 값 하나를 꺼낸다. 가려졌으면 null(0이 아니다)
  const pick = (o, k) => (o && !o.small && o[k] != null && Number.isFinite(Number(o[k]))) ? Number(o[k]) : null;
  const isMask = o => !o || !!o.small || o.n == null && o.r == null && o.v == null;

  function niceMax(m) {
    if (!(m > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(m))), f = m / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }
  // 정수 눈금: 간격 1·2·5×10^k 중 칸 수가 maxSteps 이하인 가장 작은 것. max<=0이면 {top:1, ticks:[0,1]}
  function niceScale(max, maxSteps) {
    const m = Math.max(1, Math.ceil(max || 0)), N = maxSteps || 5;
    for (let p = 1; ; p *= 10) for (const f of [1, 2, 5]) {
      const step = f * p;
      if (Math.ceil(m / step) <= N) { const top = Math.ceil(m / step) * step; return { top, ticks: Array.from({ length: top / step + 1 }, (_, i) => i * step) }; }
    }
  }
  // 기간 글자: day 11/19, week 11/17 주, month 26.11
  function plabel(p, grain) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(p || ''));
    if (!m) return String(p || '');
    if (grain === 'month') return m[1].slice(2) + '.' + Number(m[2]);
    return Number(m[2]) + '/' + Number(m[3]) + (grain === 'week' ? '주' : '');
  }
  // 말풍선용 긴 기간 글: day 11월 19일, week 11월 17일부터 한 주, month 2026년 11월
  function plong(p, grain) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(p || ''));
    if (!m) return String(p || '');
    if (grain === 'month') return m[1] + '년 ' + Number(m[2]) + '월';
    return Number(m[2]) + '월 ' + Number(m[3]) + '일' + (grain === 'week' ? '부터 한 주' : '');
  }
  // 위쪽 숫자 라벨이 그래프 밖으로 나가지 않게 글자 정렬을 고른다
  const anchorAt = (x, lo, hi) => x < lo + 14 ? 'start' : x > hi - 14 ? 'end' : 'middle';
  const gridY = (g, L, R, T, ph, scale, fmt) => scale.ticks.forEach(v => {
    const y = T + ph - v / scale.top * ph;
    g.append(svg('line', { class: 'gr-grid', x1: L, y1: y, x2: R, y2: y }), txt(L - 4, y + 3, fmt(v), 'gr-txt', 'end'));
  });

  // ---- 값 말풍선(마우스 올림·탭·키보드). 위치는 SVG 속성(x, y, transform)으로만 옮긴다(style 속성 없음) ----
  // o: {rect:{x,y,w,h} 훑을 영역, n 칸 수, at(x,y)→칸|-1, view(i)→{ax,ay,lines,hl,guide,dots}, keys:'x'|'xy', cols}
  let openTip = null;
  document.addEventListener('pointerdown', e => { if (openTip && !openTip.g.contains(e.target)) openTip.hide(); });
  function tip(g, H, o) {
    const VBW = W, on = (n, v) => v ? n.classList.add('on') : n.classList.remove('on');
    const hl = svg('rect', { class: 'gr-hl' }), guide = svg('line', { class: 'gr-guide' }), dots = [];
    g.insertBefore(hl, g.firstChild);
    g.append(guide);
    const label = (g.getAttribute('aria-label') || '그래프') + ' 좌우 방향키로 값을 하나씩 읽을 수 있어요';
    const hit = svg('rect', { class: 'gr-hit', x: o.rect.x, y: o.rect.y, width: o.rect.w, height: o.rect.h, tabindex: '0', role: 'group', 'aria-label': label });
    const bg = svg('rect', { class: 'gr-tipbg', rx: 6, x: 0, y: 0, width: 10, height: 10 }), tt = svg('text', { class: 'gr-tipt', x: 8, y: 0 });
    const bubble = svg('g', { class: 'gr-tip' }, bg, tt);
    g.setAttribute('role', 'group');
    g.append(hit, bubble);   // 말풍선은 맨 위
    let last = -1, ptr = false;
    function hide() {
      on(bubble, false); on(hl, false); on(guide, false); dots.forEach(d => on(d, false));
      if (openTip && openTip.g === g) openTip = null;
    }
    function show(i, say) {
      const v = i >= 0 && i < o.n ? o.view(i) : null;
      if (!v) { hide(); return; }
      if (openTip && openTip.g !== g) openTip.hide();
      openTip = { g, hide }; last = i;
      if (v.hl) { Object.entries(v.hl).forEach(([k, x]) => hl.setAttribute(k === 'w' ? 'width' : k === 'h' ? 'height' : k, x)); on(hl, true); } else on(hl, false);
      if (v.guide) { guide.setAttribute('x1', v.guide.x); guide.setAttribute('x2', v.guide.x); guide.setAttribute('y1', v.guide.y1); guide.setAttribute('y2', v.guide.y2); on(guide, true); } else on(guide, false);
      const ds = v.dots || [];
      ds.forEach((d, k) => {
        if (!dots[k]) { dots[k] = svg('circle', { r: 5 }); g.insertBefore(dots[k], hit); }
        dots[k].setAttribute('class', 'gr-pt ' + d.cls + ' on'); dots[k].setAttribute('cx', d.x); dots[k].setAttribute('cy', d.y);
      });
      dots.slice(ds.length).forEach(d => on(d, false));
      tt.replaceChildren(...v.lines.map((ln, k) => svg('tspan', { x: 8, dy: k ? 14 : 0, class: k === 0 ? 'h' : null }, ln)));
      tt.setAttribute('y', 0); on(bubble, true);          // 보여야 크기를 잴 수 있다
      const bb = tt.getBBox(), w = bb.width + 16, h = bb.height + 10;
      tt.setAttribute('y', 5 - bb.y); bg.setAttribute('width', w); bg.setAttribute('height', h);
      let x = clamp(v.ax - w / 2, 2, VBW - w - 2), y = v.ay - h - 8;
      if (y < 2) y = Math.min(H - h - 2, v.ay + 12);
      bubble.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
      if (say) UI.say(v.lines.join(', '));
    }
    const pos = e => { const r = g.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * VBW, (e.clientY - r.top) / r.height * H]; };
    const hover = e => { const [x, y] = pos(e); show(o.at(x, y)); };
    hit.addEventListener('pointermove', hover);
    hit.addEventListener('pointerdown', e => { ptr = true; setTimeout(() => { ptr = false; }); hover(e); });
    hit.addEventListener('click', hover);
    hit.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hide(); });
    hit.addEventListener('focus', () => { if (!ptr) show(last >= 0 ? last : o.n - 1, true); });
    hit.addEventListener('blur', hide);
    hit.addEventListener('keydown', e => {
      const cur = last >= 0 ? last : o.n - 1, step = o.keys === 'xy' ? o.cols : 0;
      let j = e.key === 'ArrowLeft' ? cur - 1 : e.key === 'ArrowRight' ? cur + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? o.n - 1
        : e.key === 'ArrowUp' && step ? cur - step : e.key === 'ArrowDown' && step ? cur + step : null;
      if (e.key === 'Escape') { hide(); return; }
      if (j == null) return;
      e.preventDefault(); show(clamp(j, 0, o.n - 1), true);
    });
  }

  // ---- 표로 보기 ----
  function table(head, rows) {
    return el('div', { class: 'us-tblw' }, el('table', { class: 'st-tbl' },
      el('thead', null, el('tr', null, ...head.map(h => el('th', null, h)))),
      el('tbody', null, ...rows.map(r => el('tr', null, ...r.map(c => el('td', null, c == null ? mk() : c)))))));
  }
  // 범례 칸이 그래프에 실제로 있는지
  const used = (svgEl, k) => !svgEl.querySelector ? true : !!svgEl.querySelector(
    k === 'f1' || k === 'bar' ? '.gr-bar, .gr-f1' : /^f[2-5o]$/.test(k) ? '.gr-' + k : /^s[1-5o]$/.test(k) ? '.gr-' + k :
    k === 'hollow' ? '.gr-dot.hollow' : k === 'lost' ? '.gr-lost' : k === 'empty' ? '.gr-cell' : k === 'box' ? '.gr-box' :
    k === 'mark' ? '.gr-mark' : k === 'thin' ? '.gr-thin' : k === 'dwo' ? '.gr-dwo' : k === 'dwf' ? '.gr-dwf' : k === 'ci' ? '.gr-ci' : k === 'ref' ? '.gr-ref' :
    k === 'med' ? '.gr-med' : k === 'avg' ? '.gr-dot' : k === 'ramp' ? '[class*="gr-fq"]' : '.gr-hmask, .gr-band');
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
    // 범례 칸은 그래프에 실제로 있을 때만 그린다(가림 칸은 038 이후 서버가 가리지 않으면 없다). 계열이 하나만 남으면 범례 줄을 그리지 않는다(카드 제목과 말풍선이 이름을 말해 준다)
    const lg = o.legend && o.legend.filter(([k]) => used(o.svg, k));
    const SERIES = /^(f[1-5o]|s[1-5o]|bar)$/;
    if (lg && lg.length && !(lg.filter(([k]) => SERIES.test(k)).length === 1 && lg.every(([k]) => SERIES.test(k)))) box.append(legend(lg));
    // 표 CSV(운영용) 단추: 보이는 표와 같은 값을 내려받는다. o.csv === false면 끈다. 파일 이름·머리말은 csvCtx(앱·기간)와 o.csv(표 이름)·o.period로 만든다
    const cb = o.table && o.csv !== false ? el('button', { class: 'link', type: 'button', onclick: () => csvOut(o) }, 'CSV 내려받기(운영용)') : null;
    if (btn || cb) box.append(el('div', { class: 'gr-tools' }, btn, cb));
    return box;
  }
  // 내려받기에 쓰는 앱·기간·판(화면 쪽이 setCsvCtx로 알려 준다)
  let csvCtx = () => ({});
  const setCsvCtx = fn => { csvCtx = fn; };
  function csvOut(o) {
    const c = csvCtx() || {}, name = typeof o.csv === 'string' && o.csv ? o.csv : String(o.label || '표').slice(0, 24);
    const period = o.period || (c.from ? c.from + ' ~ ' + c.to + ' (한국 시간)' : '');
    const head = o.table.head.map(h => h || ' ');
    Csv.download(['koinobia', 'usage', o.file || 'chart', { '전체': 'all', 코이데: 'koide', 디다코: 'didako', 텔리오: 'telio' }[c.app || '전체'], (c.from || '').replace(/-/g, ''), (c.to || '').replace(/-/g, '')].filter(Boolean).join('-'),
      ['코이노비아 이용 통계 · 운영용(밖으로 내보내지 마세요)', '표: ' + name, '앱: ' + (c.app || '전체'), '기간: ' + period, '내보낸 날: ' + (c.today || ''), '지표 정의 판: ' + (c.ver || 'm1')],
      head, o.table.rows.map(r => r.map(x => x == null ? mk() : x)));
  }
  // 범례(색과 이름을 함께): ['f1'~'f5'|'fo' 채움, 's1'~ 선, 'hollow' 진행 중 점, 'lost' 이탈, 'mask' 가림, 'empty' 기록 없음, 'ramp' 진하기 단계, 'box' 상자, 'med' 중앙값, 'avg' 평균, 'bar'=f1]
  function legend(items) {
    return el('div', { class: 'gr-key' }, ...items.map(([k, t]) => {
      const wide = k === 'ramp';
      const s = svg('svg', { class: 'gr-sw' + (wide ? ' wide' : ''), viewBox: wide ? '0 0 46 12' : '0 0 18 12', 'aria-hidden': 'true' });
      if (k === 'mask') s.append(svg('rect', { class: 'gr-hmask', x: 1, y: 1, width: 16, height: 10 }));
      else if (k === 'empty') s.append(svg('rect', { class: 'gr-cell', x: 1, y: 1, width: 16, height: 10 }));
      else if (k === 'lost') s.append(svg('rect', { class: 'gr-lost', x: 1, y: 1, width: 16, height: 10 }));
      else if (k === 'ramp') ['q1', 'q2', 'q3', 'q4', 'q5'].forEach((q, i) => s.append(svg('rect', { class: 'gr-f' + q, x: i * 9, y: 1, width: 9, height: 10 })));
      else if (k === 'hollow') s.append(svg('line', { class: 'gr-line gr-s1', x1: 0, y1: 6, x2: 8, y2: 6 }), svg('circle', { class: 'gr-dot hollow gr-s1', cx: 13, cy: 6, r: 3.5 }));
      else if (k === 'mark') s.append(svg('line', { class: 'gr-mark', x1: 9, y1: 0, x2: 9, y2: 12 }));
      else if (k === 'ref') s.append(svg('line', { class: 'gr-ref', x1: 9, y1: 0, x2: 9, y2: 12 }));
      else if (k === 'thin') s.append(svg('rect', { class: 'gr-thin', x: 1, y: 1, width: 16, height: 10, rx: 2 }));
      else if (k === 'dwo') s.append(svg('circle', { class: 'gr-dwo', cx: 9, cy: 6, r: 4 }));
      else if (k === 'dwf') s.append(svg('circle', { class: 'gr-dwf', cx: 9, cy: 6, r: 4 }));
      else if (k === 'ci') s.append(svg('line', { class: 'gr-ci', x1: 1, y1: 6, x2: 17, y2: 6 }));
      else if (k === 'med') s.append(svg('line', { class: 'gr-med', x1: 9, y1: 0, x2: 9, y2: 12 }));
      else if (k === 'avg') s.append(svg('circle', { class: 'gr-dot gr-f1', cx: 9, cy: 6, r: 4 }));
      else if (k === 'box') s.append(svg('rect', { class: 'gr-box gr-f1 gr-s1', x: 1, y: 1, width: 16, height: 10 }));
      else if (/^s/.test(k)) s.append(svg('line', { class: 'gr-line gr-' + k, x1: 1, y1: 6, x2: 17, y2: 6 }));
      else s.append(svg('rect', { class: 'gr-f' + (k === 'bar' ? '1' : k.slice(1)), x: 1, y: 1, width: 16, height: 10, rx: 2 }));
      return el('span', { class: 'gr-keyi' }, s, t);
    }));
  }

  // ---- 꺾은선(옆으로 시간 흐름): xs(기간 글자들), series [{name, values:[number|null]}].
  //      o.area 옅은 면적, o.partial[i] 진행 중인 점(속이 빈 점과 점선), o.fmt 숫자 모양. 가려진(null) 칸은 선을 끊고 회색 띠로 표시.
  //      숫자 라벨: 마지막 값과 가장 큰 값(점이 8개 이하면 모두) ----
  function line(xs, series, o) {
    o = o || {};
    const mks = (o.marks || []).filter(m => m.i >= 0 && m.i < xs.length), H = (o.h || (xs.length <= 8 ? 130 : 150)) + (mks.length ? 14 : 0), L = 40, T = mks.length ? 32 : 18, B = 24, R = series.length > 1 ? 64 : 16, pw = W - L - R, ph = H - T - B, n = xs.length;
    const all = series.flatMap(s => s.values).filter(v => v != null);
    const scale = niceScale(Math.max(0, ...all), ph < 90 ? 3 : 5), top = scale.top, fmt = o.fmt || fmtN, part = o.partial || [], unit = o.unit || '';
    const X = i => L + (n === 1 ? pw / 2 : i * pw / (n - 1)), Y = v => T + ph - v / top * ph, base = T + ph;
    const g = svg('svg', { class: 'gr-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.label || '꺾은선 그래프' });
    gridY(g, L, W - R, T, ph, scale, fmt);
    const bw = n === 1 ? 24 : pw / (n - 1);
    for (let i = 0; i < n; i++) {
      if (series.every(s => s.values[i] == null)) {
        const x0 = Math.max(L, X(i) - bw / 2), x1 = Math.min(W - R, X(i) + bw / 2);
        if (masking) g.append(svg('rect', { class: 'gr-band', x: x0, y: T, width: Math.max(1, x1 - x0), height: ph }));
      }
    }
    // 출시 표시: 점선 세로선과 위쪽 글자(겹치지 않게 두 줄로 번갈아 놓는다). 말풍선에도 덧붙는다
    mks.forEach((m, k) => {
      g.append(svg('line', { class: 'gr-mark', x1: X(m.i), x2: X(m.i), y1: T - 6, y2: base }), txt(X(m.i), k % 2 ? 22 : 10, m.text, 'gr-mk', anchorAt(X(m.i), L, W - R)));
    });
    const step = Math.max(1, Math.ceil(n / 6));
    for (let i = 0; i < n; i += step) g.append(txt(X(i), H - 8, xs[i], 'gr-txt', 'middle'));
    series.forEach((s, si) => {
      const cls = 'gr-s' + (si + 1), fcls = 'gr-f' + (si + 1);
      // 끊기지 않는 구간(run)마다 선과 면적을 그린다
      const runs = []; let cur = null;
      s.values.forEach((v, i) => { if (v == null) { cur = null; return; } if (!cur) { cur = []; runs.push(cur); } cur.push(i); });
      runs.forEach(r => {
        const solid = r.filter(i => !part[i]), dash = r.filter(i => part[i]);
        if (o.area && series.length === 1 && r.length > 1) {
          g.append(svg('path', { class: 'gr-area ' + fcls, d: 'M' + X(r[0]).toFixed(1) + ' ' + base + r.map(i => 'L' + X(i).toFixed(1) + ' ' + Y(s.values[i]).toFixed(1)).join('') + 'L' + X(r[r.length - 1]).toFixed(1) + ' ' + base + 'Z' }));
        }
        if (solid.length > 1) g.append(svg('path', { class: 'gr-line ' + cls, d: solid.map((i, k) => (k ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(s.values[i]).toFixed(1)).join('') }));
        dash.forEach(i => {
          const p = r[r.indexOf(i) - 1];
          if (p != null) g.append(svg('path', { class: 'gr-line ' + cls, 'stroke-dasharray': '4 3', d: 'M' + X(p).toFixed(1) + ' ' + Y(s.values[p]).toFixed(1) + 'L' + X(i).toFixed(1) + ' ' + Y(s.values[i]).toFixed(1) }));
        });
      });
      let last = -1, peak = -1;
      s.values.forEach((v, i) => { if (v == null) return; last = i; if (peak < 0 || v > s.values[peak]) peak = i; });
      s.values.forEach((v, i) => {
        if (v == null) return;
        const alone = (i === 0 || s.values[i - 1] == null) && (i === n - 1 || s.values[i + 1] == null);
        if (part[i]) g.append(svg('circle', { class: 'gr-dot hollow ' + cls, cx: X(i), cy: Y(v), r: 4 }));
        else if (alone || n <= 31) g.append(svg('circle', { class: 'gr-dot ' + fcls, cx: X(i), cy: Y(v), r: alone ? 3.5 : 2.5 }));
        const lab = v > 0 && series.length === 1 && (n <= 8 || i === last || i === peak);
        if (lab) g.append(txt(X(i), Math.max(T - 2, Y(v) - 8), fmt(v), 'gr-val', anchorAt(X(i), L, W - R)));
        if (part[i] && series.length === 1) g.append(txt(X(i), Y(v) + 17, '진행 중', 'gr-txt', anchorAt(X(i), L, W - R)));
      });
      if (series.length > 1 && last >= 0) g.append(txt(Math.min(W - 2, X(last) + 5), Y(s.values[last]) + 3, s.name, 'gr-txt'));
    });
    tip(g, H, {
      rect: { x: L, y: T, w: pw, h: ph }, n,
      at: x => n === 1 ? 0 : clamp(Math.round((x - L) / pw * (n - 1)), 0, n - 1),
      view: i => {
        const vs = series.map(s => s.values[i]), seen = vs.filter(v => v != null);
        const lines = [(o.full && o.full[i]) || xs[i]].concat(series.map((s, si) => s.name + ' ' + (vs[si] == null ? mk() : fmt(vs[si]) + unit)));
        if (part[i]) lines.push('진행 중');
        mks.filter(m => m.i === i).forEach(m => lines.push(m.tip || m.text));
        const x0 = clamp(X(i) - bw / 2, L, W - R), x1 = clamp(X(i) + bw / 2, L, W - R);
        return { ax: X(i), ay: seen.length ? Y(Math.max(...seen)) : base, lines, hl: { x: x0, y: T, w: Math.max(1, x1 - x0), h: ph },
          guide: seen.length ? { x: X(i), y1: T, y2: base } : null, dots: series.map((s, si) => vs[si] == null ? null : { x: X(i), y: Y(vs[si]), cls: 'gr-f' + (si + 1) }).filter(Boolean) };
      }
    });
    return g;
  }

  // ---- 세로 막대(기간별 개수): cols [{label, v|null, text}]. 0에서 시작. null이면 점선 빈 칸. o.h 높이 ----
  function barsV(cols, o) {
    o = o || {};
    const n = cols.length, H = o.h || (n <= 8 ? 120 : 140), L = 40, T = 14, B = 24, pw = W - L - 8, ph = H - T - B, fmt = o.fmt || fmtN, unit = o.unit || '';
    const scale = niceScale(Math.max(0, ...cols.map(c => c.v).filter(v => v != null)), ph < 90 ? 3 : 5), top = scale.top;
    const slot = n ? pw / n : pw, bw = Math.min(maxbw(), Math.max(2, slot * .7)), showVal = slot >= 20 && n <= 16;
    const g = svg('svg', { class: 'gr-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.label || '막대 그래프' });
    gridY(g, L, W - 8, T, ph, scale, fmt);
    const step = Math.max(1, Math.ceil(n / 8));
    let peak = -1; cols.forEach((c, i) => { if (c.v != null && (peak < 0 || c.v > cols[peak].v)) peak = i; });
    cols.forEach((c, i) => {
      const cx = L + slot * i + slot / 2, x = cx - bw / 2;
      if (c.v == null) {
        if (masking) g.append(svg('rect', { class: 'gr-hmask', x: x + 1, y: T + ph - 34, width: Math.max(2, bw - 2), height: 34 }));
        if (masking && n <= 16) g.append(txt(cx, T + ph - 18, '가림', 'gr-txt', 'middle'));
      } else if (c.v > 0) {
        const h = c.v / top * ph;
        g.append(svg('rect', { class: 'gr-bar', x, y: T + ph - h, width: bw, height: Math.max(h, 1), rx: Math.min(4, bw / 2) }));
        if (showVal || i === peak) g.append(txt(cx, T + ph - h - 4, c.text || fmt(c.v), 'gr-val', 'middle'));
      }
      if (i % step === 0) g.append(txt(cx, H - 8, c.label, 'gr-txt', 'middle'));
    });
    tip(g, H, {
      rect: { x: L, y: T, w: pw, h: ph }, n, at: x => clamp(Math.floor((x - L) / slot), 0, n - 1),
      view: i => {
        const c = cols[i];
        return { ax: L + slot * i + slot / 2, ay: c.v > 0 ? T + ph - c.v / top * ph : T + ph, hl: { x: L + slot * i, y: T, w: slot, h: ph },
          lines: [c.full || c.label, c.v == null ? mk() : (c.text || fmt(c.v) + unit)] };
      }
    });
    return g;
  }

  // ---- 누적 막대(한 기간 안의 구성): cols [{label, vs:[a|null, b|null]}], names 계열 이름. 조각 사이 2px 틈.
  //      한 계열이라도 가려졌으면 그 조각은 점선 칸으로 얹고 합계 숫자는 적지 않는다 ----
  function barsStack(cols, names, o) {
    o = o || {};
    const n = cols.length, H = o.h || (n <= 8 ? 130 : 150), L = 40, T = 22, B = 24, pw = W - L - 8, ph = H - T - B, fmt = o.fmt || fmtN, MH = 16, unit = o.unit || '';
    const sums = cols.map(c => c.vs.reduce((a, v) => a + (v || 0), 0));
    const scale = niceScale(Math.max(0, ...sums), ph < 90 ? 3 : 5), top = scale.top;
    const slot = n ? pw / n : pw, bw = Math.min(maxbw(), Math.max(3, slot * .7));
    const g = svg('svg', { class: 'gr-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.label || '누적 막대 그래프' });
    gridY(g, L, W - 8, T, ph, scale, fmt);
    const step = Math.max(1, Math.ceil(n / 8));
    cols.forEach((c, i) => {
      const cx = L + slot * i + slot / 2, x = cx - bw / 2; let y = T + ph; const masked = c.vs.some(v => v == null);
      c.vs.forEach((v, j) => {
        if (v == null) return;
        const h = v / top * ph;
        if (h > 0) { g.append(svg('rect', { class: 'gr-seg gr-f' + (j + 1), x, y: y - h, width: bw, height: h })); y -= h; }
      });
      if (masked) {
        if (masking) g.append(svg('rect', { class: 'gr-hmask', x: x + 1, y: y - MH, width: Math.max(2, bw - 2), height: MH - 2 }));
        if (masking && slot >= 22) g.append(txt(cx, y - MH - 3, '가림', 'gr-txt', 'middle'));
      } else if (sums[i] > 0 && (n <= 12 || i === n - 1)) g.append(txt(cx, y - 4, fmt(sums[i]), 'gr-val', 'middle'));
      if (i % step === 0) g.append(txt(cx, H - 8, c.label, 'gr-txt', 'middle'));
    });
    tip(g, H, {
      rect: { x: L, y: T, w: pw, h: ph }, n, at: x => clamp(Math.floor((x - L) / slot), 0, n - 1),
      view: i => {
        const c = cols[i], masked = c.vs.some(v => v == null);
        const lines = [c.full || c.label].concat(names.map((nm, j) => nm + ' ' + (c.vs[j] == null ? mk() : fmt(c.vs[j]) + unit)));
        if (!masked) lines.push('합계 ' + fmt(sums[i]) + unit);
        return { ax: L + slot * i + slot / 2, ay: T + ph - sums[i] / top * ph, hl: { x: L + slot * i, y: T, w: slot, h: ph }, lines };
      }
    });
    return g;
  }

  // ---- 100% 누적 가로 막대(기간별 구성): rows [{label, vs:[...|null]}], names 계열 이름. 막대 아래에 이름과 비율을 바로 적는다.
  //      한 계열이라도 가려졌으면 그 줄은 점선 칸 + "5명 미만" ----
  function stack100(rows, names, o) {
    o = o || {};
    const RH = 54, BW = W - 8, H = Math.max(RH, rows.length * RH);
    const g = svg('svg', { class: 'gr-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.label || '구성 비율 누적 막대 그래프' });
    rows.forEach((r, i) => {
      const y = i * RH, sum = r.vs.reduce((a, v) => a + (v || 0), 0), masked = r.vs.some(v => v == null) || !(sum > 0);
      g.append(txt(0, y + 11, r.label, 'gr-txt'));
      if (masked) {
        if (masking) g.append(svg('rect', { class: 'gr-hmask', x: 0, y: y + 16, width: 56, height: 14 }), txt(62, y + 27, MASK + '이라 가렸어요', 'gr-txt'));
        return;
      }
      let x = 0; const parts = [];
      r.vs.forEach((v, j) => {
        const w = v / sum * BW;
        if (w > 0) g.append(svg('rect', { class: 'gr-seg gr-f' + (o.keys ? o.keys[j] : j + 1), x, y: y + 16, width: w, height: 14 }));
        x += w;
        if (v > 0) parts.push(names[j] + ' ' + Math.round(v / sum * 100) + '%');
      });
      g.append(txt(0, y + 46, parts.join(' · '), 'gr-txt'));
    });
    return g;
  }

  // 촘촘한 가로 막대(기능 목록용): PC는 한 줄(이름 | 막대 | 값), 휴대폰은 이름과 값이 윗줄, 막대가 아랫줄. 줄마다 얇은 구분선.
  //   0은 막대 없이 그리고, 0보다 크면 아주 작아도 막대가 보이게 최소 폭을 둔다.
  function barsCompact(rows, o) {
    const wide = W >= 500, RH = wide ? 28 : 34, LW = wide ? 190 : 0, VW = wide ? 110 : 0, BW = wide ? W - LW - VW - 8 : W, fmt = o.fmt || fmtN, H = Math.max(RH, rows.length * RH);
    const top = Math.max(o.max || 0, ...rows.map(r => r.v).filter(v => v != null)) || 1;
    const g = svg('svg', { class: 'gr-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.label || '가로 막대 그래프' });
    rows.forEach((r, i) => {
      const y = i * RH, bx = wide ? LW : 0, by = wide ? y + 9 : y + 20;
      if (i) g.append(svg('line', { class: 'gr-sep', x1: 0, x2: W, y1: y, y2: y }));
      g.append(txt(0, wide ? y + 18 : y + 14, r.label, 'gr-lab'));
      if (r.v == null) {
        const t = masking ? (r.text || MASK + '이라 가렸어요') : '—';
        if (masking) g.append(svg('rect', { class: 'gr-hmask', x: bx, y: by, width: Math.min(BW, 56), height: 10 }));
        g.append(txt(W, wide ? y + 18 : y + 14, t, 'gr-val', 'end'));
        return;
      }
      g.append(svg('rect', { class: 'gr-track', x: bx, y: by, width: BW, height: 10, rx: 5 }));
      if (r.v > 0) g.append(svg('rect', { class: 'gr-bar', x: bx, y: by, width: Math.max(r.v / top * BW, 4), height: 10, rx: 5 }));
      g.append(txt(W, wide ? y + 18 : y + 14, r.text || fmt(r.v), 'gr-val', 'end'));
    });
    return g;
  }

  // ---- 가로 막대(정렬된 비교): rows [{label, v|null, text}] 줄마다 이름 위, 막대 아래. null이면 점선 + "5명 미만" ----
  function barsH(rows, o) {
    o = o || {};
    if (o.compact) return barsCompact(rows, o);
    const RH = 32, BX = 0, BW = W - 110, fmt = o.fmt || fmtN, H = Math.max(RH, rows.length * RH) + (o.ref != null ? 12 : 0), Y0 = o.ref != null ? 12 : 0;
    const top = Math.max(o.max || 0, o.ref || 0, ...rows.map(r => r.v).filter(v => v != null)) || 1, thin = o.thin || [];
    const g = svg('svg', { class: 'gr-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.label || '가로 막대 그래프' });
    rows.forEach((r, i) => {
      const y = Y0 + i * RH, tn = thin[i];
      g.append(txt(BX, y + 11, r.label, 'gr-lab'));
      if (r.v == null) {
        if (masking) g.append(svg('rect', { class: 'gr-hmask', x: BX, y: y + 16, width: 56, height: 12 }), txt(BX + 62, y + 26, r.text || MASK + '이라 가렸어요', 'gr-txt'));
      } else if (r.v === 0) {
        g.append(txt(BX + 6, y + 26, r.text || fmt(0), 'gr-txt'));   // 0은 막대 없이 연한 글로
      } else {
        const w = r.v / top * BW;
        g.append(svg('rect', { class: 'gr-bar' + (tn ? ' gr-thin' : ''), x: BX, y: y + 16, width: Math.max(w, r.v > 0 ? 1 : 0), height: 12, rx: 4 }), txt(BX + w + 6, y + 26, r.text || fmt(r.v), tn ? 'gr-txt' : 'gr-val'));
      }
    });
    // 전체 기준선(점선 세로선): 같은 정의로 센 전체 값
    if (o.ref != null) {
      const rx = o.ref / top * BW;
      g.append(svg('line', { class: 'gr-ref', x1: rx, x2: rx, y1: Y0 - 2, y2: H }), txt(rx, 9, o.refLabel || '전체', 'gr-txt', anchorAt(rx, 0, W)));
    }
    // 줄마다 tip(글 배열)이 있으면 마우스 올림·탭·방향키로 읽는 말풍선을 붙인다
    if (rows.some(r => r.tip)) tip(g, H, {
      rect: { x: 0, y: Y0, w: W, h: rows.length * RH }, n: rows.length, at: (x, y) => clamp(Math.floor((y - Y0) / RH), 0, rows.length - 1),
      view: i => ({ ax: Math.min(W - 20, BX + Math.max(40, (rows[i].v || 0) / top * BW)), ay: Y0 + i * RH + 20, lines: rows[i].tip || [rows[i].label], hl: { x: 0, y: Y0 + i * RH, w: W, h: RH } })
    });
    return g;
  }

  // ---- 차이의 95% 구간(Newcombe 점수 방법): 두 비율 p1(n1)·p2(n2)의 차 p1-p2. [하한, 상한](비율 차). 같은 사람이 여러 주에 들어가 독립이 아니라서 실제보다 좁게 나올 수 있다 ----
  function diffCI(p1, n1, p2, n2) {
    const z = 1.96, wil = (p, n) => {
      const d = 1 + z * z / n, c = p + z * z / (2 * n), r = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
      return [(c - r) / d, (c + r) / d];
    };
    if (!(n1 > 0 && n2 > 0)) return null;
    const [l1, u1] = wil(p1, n1), [l2, u2] = wil(p2, n2), d = p1 - p2;
    return [d - Math.sqrt((p1 - l1) ** 2 + (u2 - p2) ** 2), d + Math.sqrt((u1 - p1) ** 2 + (p2 - l2) ** 2)];
  }

  // ---- 아령 그래프(안 한 때 ○ → 한 때 ●): rows [{label, a(안 한 때 비율 0~1)|null, b(한 때 비율)|null, text(오른쪽 글), note(아래 작은 글), thin, ci:[lo,hi]|null, tip:[글…]}].
  //      thin(표본 적음) 줄은 회색으로 그리고 아래에 note를 적는다. 가는 선은 차이의 95% 구간(점 ●을 기준으로 안 한 때 위치 + 구간). 가로 눈금은 0~100%의 정수 눈금.
  function dumbbell(rows, o) {
    o = o || {};
    const L = 8, R = 8, pw = W - L - R, AX = 16, ys = [], X = v => L + clamp(v, 0, 1) * pw;
    let acc = AX;
    rows.forEach(r => { ys.push(acc); acc += r.note ? 56 : 44; });
    const H = Math.max(acc, AX + 44) + 4;
    const g = svg('svg', { class: 'gr-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.label || '아령 그래프' });
    [0, .25, .5, .75, 1].forEach(t => g.append(svg('line', { class: 'gr-grid', x1: X(t), x2: X(t), y1: AX - 4, y2: H - 4 }), txt(X(t), 10, Math.round(t * 100) + '%', 'gr-txt', t === 0 ? 'start' : t === 1 ? 'end' : 'middle')));
    rows.forEach((r, i) => {
      const y = ys[i], cy = y + 28, tn = !!r.thin, ok = r.a != null && r.b != null;
      if (i) g.append(svg('line', { class: 'gr-sep', x1: 0, x2: W, y1: y, y2: y }));
      g.append(txt(0, y + 16, r.label, tn ? 'gr-txt' : 'gr-lab'), txt(W, y + 16, r.text || mk(), tn ? 'gr-txt' : 'gr-val', 'end'));
      if (!ok) { if (masking) g.append(svg('rect', { class: 'gr-hmask', x: L, y: cy - 6, width: 56, height: 12 })); }
      else {
        if (r.ci) g.append(svg('line', { class: 'gr-ci' + (tn ? ' gr-thin' : ''), x1: X(r.a + r.ci[0]), x2: X(r.a + r.ci[1]), y1: cy + 9, y2: cy + 9 }));
        g.append(svg('line', { class: 'gr-dwl' + (tn ? ' gr-thin' : ''), x1: X(r.a), x2: X(r.b), y1: cy, y2: cy }),
          svg('circle', { class: 'gr-dwo' + (tn ? ' gr-thin' : ''), cx: X(r.a), cy, r: 5 }), svg('circle', { class: 'gr-dwf' + (tn ? ' gr-thin' : ''), cx: X(r.b), cy, r: 5 }));
      }
      if (r.note) g.append(txt(0, y + 52, r.note, 'gr-txt'));
    });
    tip(g, H, {
      rect: { x: 0, y: AX, w: W, h: H - AX }, n: rows.length,
      at: (x, y) => { let k = 0; ys.forEach((v, i) => { if (y >= v) k = i; }); return k; },
      view: i => ({ ax: W / 2, ay: ys[i] + 20, lines: rows[i].tip || [rows[i].label], hl: { x: 0, y: ys[i], w: W, h: (ys[i + 1] != null ? ys[i + 1] : H - 4) - ys[i] } })
    });
    return g;
  }

  // ---- 도넛(구성): parts [{label, v|null, cls('1'~'5'|'o'|'q1'..)}], o.unit 단위, o.center 가운데 아래 글.
  //      가려진 조각은 점선 조각(각도는 고정)으로 두고 비율에는 넣지 않는다. 가운데에는 보이는 합계 ----
  function donut(parts, o) {
    o = o || {};
    const unit = o.unit || '명', R = 52, SW = 22, CX = 80, CY = 76, H = Math.max(152, 24 + parts.length * 34);
    const vis = parts.filter(p => p.v != null), S = vis.reduce((a, p) => a + p.v, 0), nm = masking ? parts.length - vis.length : 0;
    const g = svg('svg', { class: 'gr-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.label || '도넛 그래프' });
    const pt = a => [CX + R * Math.sin(a), CY - R * Math.cos(a)];
    const arc = (a0, a1, cls, extra) => {
      const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
      g.append(svg('path', Object.assign({ class: cls, fill: 'none', 'stroke-width': SW, d: 'M' + x0.toFixed(2) + ' ' + y0.toFixed(2) + 'A' + R + ' ' + R + ' 0 ' + (a1 - a0 > Math.PI ? 1 : 0) + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2) }, extra)));
    };
    const MASKA = .12;  // 가린 조각 하나가 차지하는 각도(라디안, 고정)
    const avail = Math.PI * 2 - nm * MASKA, gap = parts.length > 1 ? 2 / R : 0;
    if (S <= 0) { if (masking) g.append(svg('circle', { class: 'gr-hmask', cx: CX, cy: CY, r: R, fill: 'none', 'stroke-width': SW })); }
    else if (vis.length === 1 && !nm) g.append(svg('circle', { class: 'gr-s' + (vis[0].cls || '1'), cx: CX, cy: CY, r: R, fill: 'none', 'stroke-width': SW }));
    else {
      let a = 0;
      parts.forEach((p, i) => {
        const span = p.v == null ? (masking ? MASKA : 0) : p.v / S * avail;
        if (span <= 0) return;
        const a0 = a + (span > gap * 2 ? gap / 2 : 0), a1 = a + span - (span > gap * 2 ? gap / 2 : 0);
        if (p.v == null) arc(a0, a1, 'gr-hmask');
        else arc(a0, a1, 'gr-s' + (p.cls || String(i + 1)));
        a += span;
      });
    }
    g.append(txt(CX, CY + 5, S > 0 ? fmtN(S) + unit : mk(), S > 0 ? 'gr-big' : 'gr-txt', 'middle'));
    g.append(txt(CX, CY + 21, nm ? '보이는 합계' : '합계', 'gr-txt', 'middle'));
    parts.forEach((p, i) => {
      const y = 22 + i * 34;
      if (p.v == null) { if (masking) g.append(svg('rect', { class: 'gr-hmask', x: 168, y, width: 12, height: 12 }), txt(188, y + 10, p.label, 'gr-lab'), txt(188, y + 25, MASK + '이라 가렸어요', 'gr-txt')); else g.append(txt(188, y + 10, p.label, 'gr-lab'), txt(188, y + 25, '—', 'gr-txt')); }
      else g.append(svg('rect', { class: 'gr-f' + (p.cls || String(i + 1)), x: 168, y, width: 12, height: 12, rx: 2 }), txt(188, y + 10, p.label, 'gr-lab'), txt(188, y + 25, fmtN(p.v) + unit + ' · ' + Math.round(p.v / S * 100) + '%', 'gr-val'));
    });
    return g;
  }

  // ---- 반원 게이지(한도 대비): value 0~100(%), ticks 눈금 [70, 90], warnAt 이 값 넘으면 주의색 ----
  function gauge(value, o) {
    o = o || {};
    const v = Math.max(0, Math.min(100, Number(value) || 0)), CX = 150, CY = 140, R = 104, ticks = o.ticks || [70, 90];
    const g = svg('svg', { class: 'st-gauge', viewBox: '0 0 300 166', role: 'img', 'aria-label': o.label || '게이지 ' + v + '%' });
    const P = (p, r) => { const t = Math.PI * (1 - p / 100); return [CX + r * Math.cos(t), CY - r * Math.sin(t)]; };
    const arc = p => { const [x0, y0] = P(0, R), [x1, y1] = P(p, R); return 'M' + x0.toFixed(2) + ' ' + y0.toFixed(2) + 'A' + R + ' ' + R + ' 0 0 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2); };
    g.append(svg('path', { class: 'gr-gtrack', d: arc(100) }));
    if (v > 0) g.append(svg('path', { class: 'gr-gfill' + (v >= (ticks[1] || 90) ? ' bad' : v >= (ticks[0] || 70) ? ' warn' : ''), d: arc(v) }));
    ticks.forEach(t => {
      const [x0, y0] = P(t, R - 17), [x1, y1] = P(t, R + 17), [lx, ly] = P(t, R + 28);
      g.append(svg('line', { class: 'gr-gtick', x1: x0, y1: y0, x2: x1, y2: y1 }), txt(lx, ly + 3, t + '%', 'gr-txt', 'middle'));
    });
    g.append(txt(CX - R, CY + 18, '0%', 'gr-txt', 'middle'), txt(CX + R, CY + 18, '100%', 'gr-txt', 'middle'));
    g.append(txt(CX, CY - 12, v + '%', 'gr-big', 'middle'), txt(CX, CY + 6, o.sub || '사용 중', 'gr-txt', 'middle'));
    return g;
  }

  // ---- 상자 그림(분포): rows [{label, p25, med, p75, avg, n}] (같은 단위, 한 축). 상자 25%~75%, 굵은 선 중앙값, 점 평균.
  //      값 글은 막대 아래에 바로 적는다. 가려진 줄(med==null)은 점선 칸 ----
  function boxplot(rows, o) {
    o = o || {};
    const fmt = o.fmt || fmtN, RH = 58, AX = 22, L = 8, R = 16, pw = W - L - R, H = rows.length * RH + AX;
    const mx = niceMax(Math.max(1, ...rows.map(r => Math.max(r.p75 || 0, r.avg || 0)))), X = v => L + v / mx * pw;
    const g = svg('svg', { class: 'gr-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.label || '상자 그림' });
    [0, .5, 1].forEach(f => g.append(svg('line', { class: 'gr-grid', x1: X(mx * f), y1: 0, x2: X(mx * f), y2: rows.length * RH }),
      txt(X(mx * f), H - 6, fmt(mx * f), 'gr-txt', f === 0 ? 'start' : f === 1 ? 'end' : 'middle')));
    rows.forEach((r, i) => {
      const y = i * RH;
      g.append(txt(L, y + 12, r.label, 'gr-lab'));
      if (r.med == null) { if (masking) g.append(svg('rect', { class: 'gr-hmask', x: L, y: y + 20, width: 56, height: 16 }), txt(L + 62, y + 32, MASK + '이라 가렸어요', 'gr-txt')); return; }
      g.append(svg('rect', { class: 'gr-box gr-f1 gr-s1', x: X(r.p25), y: y + 20, width: Math.max(2, X(r.p75) - X(r.p25)), height: 18, rx: 3 }),
        svg('line', { class: 'gr-med', x1: X(r.med), y1: y + 17, x2: X(r.med), y2: y + 41 }));
      if (r.avg != null) g.append(svg('circle', { class: 'gr-dot gr-f1', cx: X(r.avg), cy: y + 29, r: 4.5 }));
      g.append(txt(L, y + 52, '중앙값 ' + fmt(r.med) + ' · 25~75% ' + fmt(r.p25) + '~' + fmt(r.p75) + (r.avg != null ? ' · 평균 ' + fmt(r.avg) : ''), 'gr-txt'));
    });
    return g;
  }

  // 값 크기를 다섯 단계(q1~q5)로 나눈다(0~1 비율)
  const lvl = r => 'q' + (r < .2 ? 1 : r < .4 ? 2 : r < .6 ? 3 : r < .8 ? 4 : 5);

  // ---- 시간대 지도(히트맵): cells [{dow(0=일), hour, events:{n,small}}] 사건이 있는 칸만 온다 ----
  function heat(cells, o) {
    o = o || {};
    const days = ['일', '월', '화', '수', '목', '금', '토'], L = 20, T = 14, cw = Math.floor((W - 20 - 4) / 24), ch = 16, H = T + 7 * ch + 4;
    const map = new Map(cells.map(c => [c.dow + '-' + c.hour, c]));
    const vals = cells.map(c => pick(c.events, 'n')).filter(v => v != null), max = Math.max(1, ...vals);
    const g = svg('svg', { class: 'gr-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.label || '요일과 시간대 지도' });
    [0, 6, 12, 18, 23].forEach(h => g.append(txt(L + h * cw + cw / 2, 9, String(h), 'gr-txt', 'middle')));
    days.forEach((d, r) => {
      g.append(txt(2, T + r * ch + 11, d, 'gr-txt'));
      for (let h = 0; h < 24; h++) {
        const c = map.get(r + '-' + h), x = L + h * cw + 1, y = T + r * ch + 1;
        if (!c) g.append(svg('rect', { class: 'gr-cell', x, y, width: cw - 2, height: ch - 2, rx: 2 }));
        else {
          const v = pick(c.events, 'n');
          if (v == null) g.append(svg('rect', { class: masking ? 'gr-hmask' : 'gr-cell', x, y, width: cw - 2, height: ch - 2, rx: 2 }));
          else g.append(svg('rect', { class: 'gr-f' + lvl(v / max), x, y, width: cw - 2, height: ch - 2, rx: 2 }));
        }
      }
    });
    tip(g, H, {
      rect: { x: L, y: T, w: 24 * cw, h: 7 * ch }, n: 168, keys: 'xy', cols: 24,
      at: (x, y) => { const col = Math.floor((x - L) / cw), row = Math.floor((y - T) / ch); return col < 0 || col > 23 || row < 0 || row > 6 ? -1 : row * 24 + col; },
      view: i => {
        const row = Math.floor(i / 24), col = i % 24, c = map.get(row + '-' + col), v = c ? pick(c.events, 'n') : null;
        return { ax: L + col * cw + cw / 2, ay: T + row * ch, hl: { x: L + col * cw, y: T + row * ch, w: cw, h: ch },
          lines: [days[row] + '요일 ' + col + '시', !c ? '기록 없음' : v == null ? mk() : '사건 ' + fmtN(v) + '번'] };
      }
    });
    return g;
  }

  // ---- 깔때기: steps [{label, users:{n,small}, from_prev, from_first}]. 단계 사이에 빠진 몫은 점선 주의색 칸 + "-32%"로 보인다.
  //      가려진 단계와 그 뒤는 가림 ----
  function funnel(steps) {
    const RH = 58, BW = W - 150, H = Math.max(RH, steps.length * RH);
    const first = pick(steps[0] && steps[0].users, 'n');
    const g = svg('svg', { class: 'gr-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': '단계별 흐름 깔때기' });
    let masked = false, prevV = null;
    steps.forEach((s, i) => {
      const y = i * RH, v = pick(s.users, 'n');
      if (v == null || first == null) masked = true;
      g.append(txt(0, y + 11, (i + 1) + '. ' + s.label, 'gr-lab'));
      if (masked) {
        if (masking) g.append(svg('rect', { class: 'gr-hmask', x: 0, y: y + 16, width: 56, height: 14 }), txt(62, y + 27, MASK + '이라 가렸어요', 'gr-txt'));
        else g.append(txt(62, y + 27, '—', 'gr-txt'));
        return;
      }
      const w = v / first * BW;
      g.append(svg('rect', { class: 'gr-bar', x: 0, y: y + 16, width: Math.max(w, v > 0 ? 1 : 0), height: 14, rx: 3 }));
      let end = w;
      if (i > 0 && prevV != null && prevV > v) {
        const pw = prevV / first * BW;
        g.append(svg('rect', { class: 'gr-lost', x: w, y: y + 16, width: pw - w, height: 14 }));
        end = pw;
      }
      g.append(txt(end + 6, y + 27, fmtN(v) + '명', 'gr-val'));
      const a = pick(s.from_prev, 'r'), b = pick(s.from_first, 'r');
      if (i > 0) {
        g.append(txt(0, y + 46, '앞 단계에서 ' + (a == null ? mk() : '-' + pct(1 - a) + ' 이탈') + ' · 첫 단계 대비 ' + (b == null ? mk() : pct(b)), a != null && a < .5 ? 'gr-warn' : 'gr-txt'));
      }
      prevV = v;
    });
    return g;
  }

  // ---- 코호트 히트맵 표: 비율 칸의 진하기(q1~q5)와 숫자를 함께 ----
  function cohortTable(head, rows) {
    return el('div', { class: 'us-tblw' }, el('table', { class: 'st-tbl us-coh' },
      el('thead', null, el('tr', null, ...head.map(h => el('th', null, h)))),
      el('tbody', null, ...rows.map(r => el('tr', null, el('td', null, r.label),
        el('td', null, r.size == null ? mk() : fmtN(r.size) + '명'),
        ...r.rates.map(x => x == null ? el('td', { class: masking ? 'mask' : null }, masking ? '가림' : '—') : el('td', { class: lvl(x) }, pct(x))))))));
  }

  // ---- 스파크라인(작은 꺾은선): points [number|null](오래된 것부터), o.label 요약 글. 끝점에 점. 값이 없으면 점선 한 줄 ----
  function spark(points, o) {
    o = o || {};
    const w = 100, h = 28, p = 3, vals = points.filter(v => v != null), n = points.length;
    const g = svg('svg', { class: 'gr-spark', viewBox: '0 0 ' + w + ' ' + h, role: 'img', 'aria-label': o.label || '추이' });
    if (!vals.length) { g.append(svg('line', { class: 'gr-sgrid', x1: p, x2: w - p, y1: h / 2, y2: h / 2 })); return g; }
    const hi = Math.max(...vals, 1), X = i => n === 1 ? w / 2 : p + i * (w - 2 * p) / (n - 1), Y = v => h - p - v / hi * (h - 2 * p);
    g.append(svg('line', { class: 'gr-sgrid', x1: p, x2: w - p, y1: h - p, y2: h - p }));
    let d = '', pen = false, last = -1;
    points.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); pen = true; last = i; });
    g.append(svg('path', { class: 'gr-line gr-s1 gr-sline', d }));
    if (last >= 0) g.append(svg('circle', { class: 'gr-dot gr-f1 gr-sdot', cx: X(last), cy: Y(points[last]), r: 2.6 }));
    return g;
  }

  // ---- 숫자 타일: items [{label, value(숫자·글자·null), note}] null이면 "5명 미만" ----
  function tiles(items) {
    return el('dl', { class: 'gr-tiles' }, ...items.map(t => el('div', null,
      el('dt', null, t.label),
      el('dd', { class: t.value == null && masking ? 'mask' : null }, t.value == null ? mk() : String(t.value)),
      t.note ? el('dd', { class: 'note' }, t.note) : null)));
  }

  window.Charts = { spark, dumbbell, diffCI, setCsvCtx, setWidth, niceScale, plong, line, barsV, barsStack, stack100, barsH, donut, gauge, boxplot, heat, funnel, cohortTable, tiles, table, figure, legend, pick, isMask, plabel, fmtN, pct, f1, MASK, mk, setMasking, isMasking: () => masking };
})();
