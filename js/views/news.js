/* 소식: 대문 사이트(koinobia.com)의 '소식'에 올릴 글을 쓰고, 올라간 글을 고치고 내리고 지운다(서버 045).
   글은 모두에게 공개되는 글이다(사람이 앱에 적은 기록 내용이 아니다). 글·제목은 textContent로만 넣는다(UI.el, Markdown.render).
   쓰던 글은 이 기기에만 잠깐 기억한다(localStorage 'koinobia-admin-news'. 올리면 지운다). */
(function () {
  const { el, toast } = UI;
  const SITE = 'https://koinobia.com/news/';
  const KEY = 'koinobia-admin-news';
  const TAGS = ['공지', '업데이트', '안내', '이야기', '개발 철학'];
  const HELP = ['빈 줄은 문단 나누기예요. 줄만 바꾸면 그 자리에서 줄이 바뀌어요.',
    '# 제목 → 작은 제목, > 인용, - 점 목록, 1. 번호 목록, **굵게**, *기울임*, [글자](https://주소)처럼 써요.',
    '위의 단추를 누르면 이런 모양이 알아서 들어가요. 미리보기에서 실제 모양을 볼 수 있어요.'];
  const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const dayText = v => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? m[1] + '년 ' + (+m[2]) + '월 ' + (+m[3]) + '일' : String(v || ''); };
  const mem = {
    get() { try { const x = JSON.parse(localStorage.getItem(KEY) || 'null'); return x && typeof x === 'object' ? x : null; } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* 저장이 안 되어도 글쓰기는 된다 */ } },
    clear() { try { localStorage.removeItem(KEY); } catch (e) { /* 없는 것으로 본다 */ } }
  };
  // 가는 선 아이콘(SVG는 DOM으로 만든다. innerHTML 없음)
  const IC = {
    bold: ['M7 5h6a3.5 3.5 0 0 1 0 7H7z', 'M7 12h7.5a3.5 3.5 0 0 1 0 7H7z'], italic: ['M10 5h8', 'M6 19h8', 'M15 5l-6 14'],
    heading: ['M6 5v14', 'M18 5v14', 'M6 12h12'], ul: ['M9 6h11', 'M9 12h11', 'M9 18h11', 'M4.5 6h.01', 'M4.5 12h.01', 'M4.5 18h.01'],
    ol: ['M10 6h10', 'M10 12h10', 'M10 18h10', 'M4 5l1.6-1v5', 'M4 14.5c.4-.9 3-1 3 .5 0 1-3 2-3 3h3'], quote: ['M5 6v12', 'M10 8h9', 'M10 12h9', 'M10 16h6'],
    link: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
    eye: ['M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z', 'M12 9.5a2.5 2.5 0 1 0 .01 0'], back: ['M15 5l-7 7 7 7']
  };
  function icon(paths) {
    const NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'nw-ic'); s.setAttribute('aria-hidden', 'true');
    paths.forEach(d => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); s.append(p); });
    return s;
  }
  const APPS = ['코이데', '디다코', '텔리오'];
  const blank = () => ({ id: null, title: '', tag: '공지', summary: '', date: todayStr(), body: '', status: '임시', kind: '공지', app: '', source: '' });

  // d: {items} 또는 {error} (서버 SQL이 없을 때)
  function render(d) {
    const st = { v: Number(d && d.v) || 1, items: (d && d.items) || [], error: (d && d.error) || '', ed: null, prev: false, busy: false, err: '', ask: false, done: null };
    const sec = el('section', null);
    const redraw = () => sec.replaceChildren(...build());
    const live = it => it.live;
    const statusText = it => it.status === '임시' ? '임시 저장' : it.live ? '올라가 있어요' : dayText(it.date).replace(/^\d+년 /, '') + '부터(예약)';
    const link = it => el('a', { class: 'aa-a', href: SITE + '#' + (it.slug || 'post-' + it.id), target: '_blank', rel: 'noopener' }, '소식에서 보기');

    function open(it) {
      st.ed = it ? { id: it.id, title: it.title, tag: it.tag, summary: it.summary, date: it.date, body: it.body, status: it.status, kind: it.kind || '공지', app: it.app || '', source: (it.source || []).join('\n'), imagesN: (it.images || []).length } : blank();
      st.prev = false; st.err = ''; st.ask = false; st.done = null; redraw();
    }
    function resume(b) { st.ed = Object.assign(blank(), b); st.prev = false; st.err = ''; st.ask = false; st.done = null; redraw(); }
    function close() { st.ed = null; st.prev = false; st.err = ''; st.ask = false; redraw(); }

    async function save(status) {
      const e = st.ed;
      if (st.busy) return;
      st.busy = true; st.err = ''; redraw();
      try {
        const r = await api.newsSave({ id: e.id, title: e.title, tag: e.tag, summary: e.summary, body: e.body, date: e.date, status, kind: e.kind, app: e.app, source: e.source, old: st.v < 2 });
        st.items = r.items || [];
        const it = st.items.find(x => x.id === r.saved);
        mem.clear(); st.ed = null; st.prev = false;
        st.done = { id: r.saved, slug: it && it.slug || 'post-' + r.saved, msg: status === '임시' ? '임시 저장했어요. 아직 소식에는 보이지 않아요.' : it && !it.live ? '올렸어요. ' + dayText(it.date) + '부터 소식에 보여요.' : '올렸어요. 소식에 바로 보여요(처음 몇 초는 걸릴 수 있어요).' };
      } catch (x) { st.err = x.code === 'sql' ? '서버 SQL 046이 아직 없어요. docs/setup.md의 안내대로 넣어 주세요.' : (x.message || '저장하지 못했어요.'); }
      st.busy = false; redraw();
    }
    async function remove() {
      const e = st.ed;
      if (st.busy) return;
      st.busy = true; st.err = ''; st.ask = false; redraw();
      try {
        const r = await api.newsDelete(e.id);
        st.items = r.items || []; mem.clear(); st.ed = null; st.done = { id: null, msg: '글을 지웠어요.' };
      } catch (x) { st.err = x.message || '지우지 못했어요.'; }
      st.busy = false; redraw();
    }

    // 본문 칸에서 고른 글자를 앞뒤로 감싸거나 줄 앞에 표시를 붙인다
    function wrap(ta, before, after, sample) {
      const a = ta.selectionStart, b = ta.selectionEnd, sel = ta.value.slice(a, b) || sample;
      ta.setRangeText(before + sel + after, a, b, 'select'); ta.setSelectionRange(a + before.length, a + before.length + sel.length);
      ta.dispatchEvent(new Event('input')); ta.focus();
    }
    function prefix(ta, mark) {
      const a = ta.selectionStart, b = ta.selectionEnd, v = ta.value;
      const s = v.lastIndexOf('\n', a - 1) + 1, e0 = v.indexOf('\n', b), e = e0 < 0 ? v.length : e0;
      const text = v.slice(s, e).split('\n').map((l, i) => (typeof mark === 'function' ? mark(i) : mark) + l).join('\n') || mark;
      ta.setRangeText(text, s, e, 'end'); ta.dispatchEvent(new Event('input')); ta.focus();
    }
    function link2(ta) {
      const a = ta.selectionStart, b = ta.selectionEnd, sel = ta.value.slice(a, b) || '글자';
      ta.setRangeText('[' + sel + '](https://)', a, b, 'end');
      const at = a + sel.length + 3; ta.setSelectionRange(at + 8, at + 8); ta.dispatchEvent(new Event('input')); ta.focus();
    }

    function editor() {
      const e = st.ed, kids = [];
      const wasLive = !!(e.id && st.items.some(x => x.id === e.id && x.status === '올림'));
      const keep = () => mem.set(e);   // 쓰는 중에 화면을 옮겨도 이어 쓸 수 있게 이 기기에 잠깐 기억
      const onIn = (k, ev) => { e[k] = ev.target.value; keep(); };
      const ib = (ic, label, fn, pressed) => el('button', { class: 'nw-ib', type: 'button', 'aria-label': label, title: label, 'aria-pressed': pressed == null ? null : String(pressed), onclick: fn }, icon(IC[ic]));
      // 제목은 길면 줄이 바뀌도록 칸을 늘려 보인다(Enter는 줄바꿈 대신 본문으로 넘어간다)
      const title = el('textarea', { class: 'nw-title', rows: '1', maxlength: '100', placeholder: '제목', 'aria-label': '제목', oninput: ev => { ev.target.value = ev.target.value.replace(/\n/g, ' '); onIn('title', ev); },
        onkeydown: ev => { if (ev.key === 'Enter') { ev.preventDefault(); ta.focus(); } } });
      title.value = e.title;
      const tag = el('input', { class: 'nw-pill', type: 'text', maxlength: '20', value: e.tag, list: 'aa-news-tags', size: '8', autocomplete: 'off', placeholder: '꼬리표', 'aria-label': '꼬리표(제목 옆 작은 표시)', oninput: ev => onIn('tag', ev) });
      const tags = el('datalist', { id: 'aa-news-tags' }, ...TAGS.map(t => el('option', { value: t })));
      const isNote = e.kind === '개발 노트';
      const kindBtn = k => el('button', { class: 'nw-pill nw-kind', type: 'button', 'aria-pressed': String(e.kind === k), onclick: () => { e.kind = k; if (k === '개발 노트') { if (!e.app) e.app = APPS[0]; if (e.tag === '공지') e.tag = ''; } else if (!e.tag) e.tag = '공지'; keep(); redraw(); } }, k);
      const app = el('select', { class: 'nw-pill', 'aria-label': '앱 이름', onchange: ev => { e.app = ev.target.value; keep(); } },
        ...APPS.concat(e.app && !APPS.includes(e.app) ? [e.app] : []).map(a => el('option', { value: a, selected: a === e.app }, a)), el('option', { value: '', selected: !e.app }, '앱 없음'));
      const src = el('textarea', { class: 'nw-src', rows: '3', maxlength: '1700', placeholder: '한 줄에 하나씩', 'aria-label': '참고 자료', oninput: ev => onIn('source', ev) });
      src.value = e.source;
      const date = el('input', { class: 'nw-pill', type: 'date', value: e.date, 'aria-label': '날짜', onchange: ev => { e.date = ev.target.value || todayStr(); keep(); redraw(); } });
      const sum = el('input', { class: 'nw-sum', type: 'text', maxlength: '200', value: e.summary, autocomplete: 'off', placeholder: '목록에 보일 한 줄 요약(비우면 본문 첫 문단)', 'aria-label': '목록에 보이는 요약', oninput: ev => onIn('summary', ev) });
      const ta = el('textarea', { class: 'nw-text', maxlength: '20000', 'aria-label': '본문', placeholder: '여기에 글을 써 보세요', oninput: ev => { e.body = ev.target.value; keep(); } });
      ta.value = e.body;
      const tools = el('div', { class: 'tip-row nw-tools' },
        el('div', { class: 'nw-tools-in', role: 'group', 'aria-label': '꾸미기' },
          ib('bold', '굵게', () => wrap(ta, '**', '**', '굵게')), ib('italic', '기울임', () => wrap(ta, '*', '*', '기울임')),
          ib('heading', '작은 제목', () => prefix(ta, '### ')), ib('ul', '점 목록', () => prefix(ta, '- ')),
          ib('ol', '번호 목록', () => prefix(ta, i => (i + 1) + '. ')), ib('quote', '인용', () => prefix(ta, '> ')), ib('link', '링크', () => link2(ta))),
        UI.info(['날짜를 앞으로 고르면 그날부터 소식에 보여요(예약).', ...HELP], { label: '글쓰기 도움말' }));

      // 위쪽 줄: 돌아가기 · 미리보기 · 임시 저장 · 올리기
      kids.push(el('div', { class: 'nw-bar' },
        ib('back', '목록으로(쓰던 글은 이 기기에 남아요)', close),
        el('span', { class: 'nw-sp' }),
        ib('eye', st.prev ? '쓰기로 돌아가기' : '미리보기', () => { st.prev = !st.prev; redraw(); }, st.prev),
        wasLive ? null : el('button', { class: 'link', type: 'button', disabled: st.busy, onclick: () => save('임시') }, '임시 저장'),
        el('button', { class: 'btn small nw-go', type: 'button', disabled: st.busy, onclick: () => save('올림') }, wasLive ? '고쳐서 올리기' : '올리기')));

      const future = e.date > todayStr();
      if (!st.prev) {
        kids.push(el('div', { class: 'nw-paper' }, title,
          st.v >= 2 ? el('div', { class: 'nw-meta-row', role: 'group', 'aria-label': '글 종류' }, kindBtn('공지'), kindBtn('개발 노트'), isNote ? app : null) : null,
          el('div', { class: 'nw-meta-row' }, isNote ? null : date, tag, tags),
          future && !isNote ? el('p', { class: 'hint' }, dayText(e.date) + '부터 소식에 보여요.') : null,
          el('details', { class: 'nw-sumbox', open: !!e.summary }, el('summary', null, '요약 넣기(선택)'), sum),
          st.v >= 2 ? el('details', { class: 'nw-sumbox', open: !!e.source }, el('summary', null, '참고 자료(선택)'), src) : null,
          e.imagesN ? el('p', { class: 'hint' }, '앱 화면 사진 ' + e.imagesN + '장이 붙어 있어요. 여기서는 바꿀 수 없고 그대로 유지돼요.') : null,
          tools, ta));
      } else {
        kids.push(el('div', { class: 'nw-paper nw-prev' },
          el('div', { class: 'aa-head' }, el('span', { class: 'hint' }, dayText(e.date)), e.tag ? el('span', { class: 'own-tag' }, e.tag) : null),
          el('h2', null, e.title || '(제목이 비어 있어요)'),
          el('p', { class: 'hint' }, e.summary ? e.summary : Markdown.lead(e.body) ? Markdown.inline(Markdown.lead(e.body)) : '(요약이 비어 있어요)'),
          Markdown.render(e.body)));
        kids.push(el('p', { class: 'hint' }, '실제 소식 페이지에서는 글꼴과 색이 조금 달라 보일 수 있어요.'));
      }
      if (st.err) kids.push(el('p', { class: 'aa-err', role: 'alert' }, st.err));
      if (st.ask) {
        kids.push(el('div', { class: 'card aa-card' }, el('p', { class: 'msg' }, '이 글을 지울까요? 되돌릴 수 없어요.' + (wasLive ? ' 내리기만 하려면 "소식에서 내리기"를 눌러요.' : '')),
          el('div', { class: 'actions' },
            el('button', { class: 'btn small', type: 'button', disabled: st.busy, onclick: remove }, '글 지우기'),
            el('button', { class: 'btn small ghost', type: 'button', onclick: () => { st.ask = false; redraw(); } }, '돌아가기'))));
      } else {
        kids.push(el('div', { class: 'nw-foot' },
          el('p', { class: 'hint' }, '누구나 볼 수 있는 글이에요. 사람 이름·교회 이름·기도제목은 쓰지 마세요.'),
          el('div', { class: 'actions' },
            wasLive ? el('button', { class: 'link quiet', type: 'button', disabled: st.busy, onclick: () => save('임시') }, '소식에서 내리기') : null,
            e.id ? el('button', { class: 'link quiet', type: 'button', disabled: st.busy, onclick: () => { st.ask = true; redraw(); } }, '글 지우기')
              : (e.title || e.body ? el('button', { class: 'link quiet', type: 'button', disabled: st.busy, onclick: () => { mem.clear(); close(); } }, '이 글 버리기') : null))));
      }
      return [el('div', { class: 'nw-ed' }, ...kids)];
    }

    function row(it) {
      return el('div', { class: 'card aa-card' + (it.status === '임시' ? ' stopped' : '') },
        el('div', { class: 'aa-head' }, el('b', null, it.title)),
        el('div', { class: 'aa-head' }, el('span', { class: it.live ? 'own-tag' : 'ch-todo warn' }, statusText(it)),
          el('span', { class: 'hint nw-meta' }, (it.kind === '개발 노트' ? [it.app || null, it.tag || null] : [dayText(it.date), it.tag || null]).filter(Boolean).join(' · '))),
        el('div', { class: 'aa-acts' }, el('button', { class: 'btn small', type: 'button', onclick: () => open(it) }, '고치기'), live(it) ? link(it) : null));
    }

    function build() {
      if (st.ed) return editor();
      const kids = [UI.withInfo(el('h1', null, '소식'), ['여기서 쓴 글은 koinobia.com의 소식 탭에 올라가요.', '공지는 날짜가 최근인 순서로, 개발 노트는 날짜 없이 앱 이름과 참고 자료를 달아 공지 아래에 보여요.', 'news.js에만 있고 서버로 옮기지 않은 글은 여기서 고칠 수 없어요(그대로 같이 보여요).'], { label: '소식 도움말' })];
      if (st.error) { kids.push(el('div', { class: 'card' }, el('p', { class: 'msg' }, st.error))); return kids; }
      if (st.v < 2) kids.push(el('div', { class: 'card aa-card' }, el('p', { class: 'msg' }, 'news.js에 있던 기존 글을 여기서 고치고 싶다면 서버 SQL 046을 넣어 주세요(docs/setup.md). 넣기 전에는 공지만 쓸 수 있어요.')));
      kids.push(el('p', { class: 'aa-sum' }, '올라간 글 ' + st.items.filter(live).length + '개 · 임시·예약 ' + st.items.filter(x => !live(x)).length + '개'));
      if (st.done) kids.push(el('div', { class: 'card aa-card' }, el('p', { class: 'msg', role: 'status' }, st.done.msg),
        st.done.id && st.items.some(x => x.id === st.done.id && x.live) ? el('div', { class: 'actions' }, link({ slug: st.done.slug })) : null));
      const b = mem.get();
      if (b && (b.title || b.body)) kids.push(el('div', { class: 'card aa-card' }, el('p', { class: 'msg' }, '쓰던 글이 이 기기에 남아 있어요' + (b.title ? ': ' + b.title : '') + '.'),
        el('div', { class: 'actions' },
          el('button', { class: 'btn small', type: 'button', onclick: () => resume(b) }, '이어서 쓰기'),
          el('button', { class: 'btn small ghost', type: 'button', onclick: () => { mem.clear(); redraw(); } }, '지우기'))));
      kids.push(el('div', { class: 'actions nw-new' }, el('button', { class: 'btn', type: 'button', onclick: () => open(null) }, '새 글 쓰기')));
      if (!st.items.length) kids.push(el('div', { class: 'card' }, el('p', { class: 'msg us-empty' }, '아직 여기서 쓴 글이 없어요.')));
      else {
        const group = (name, list) => list.length ? [el('h2', { class: 'nw-group' }, name + ' ' + list.length), el('div', { class: 'aa-grid' }, ...list.map(row))] : [];
        const notes = st.items.filter(x => x.kind === '개발 노트');
        kids.push(...group('공지', st.items.filter(x => x.kind !== '개발 노트')), ...group('개발 노트', notes));
      }
      return kids;
    }

    redraw();
    return sec;
  }
  window.Views = Object.assign(window.Views || {}, { news: { render } });
})();
