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
  const blank = () => ({ id: null, title: '', tag: '공지', summary: '', date: todayStr(), body: '', status: '임시' });

  // d: {items} 또는 {error} (서버 SQL이 없을 때)
  function render(d) {
    const st = { items: (d && d.items) || [], error: (d && d.error) || '', ed: null, prev: false, busy: false, err: '', ask: false, done: null };
    const sec = el('section', null);
    const redraw = () => sec.replaceChildren(...build());
    const live = it => it.live;
    const statusText = it => it.status === '임시' ? '임시 저장' : it.live ? '올라가 있어요' : dayText(it.date).replace(/^\d+년 /, '') + '부터(예약)';
    const link = it => el('a', { class: 'aa-a', href: SITE + '#post-' + it.id, target: '_blank', rel: 'noopener' }, '소식에서 보기');

    function open(it) {
      st.ed = it ? { id: it.id, title: it.title, tag: it.tag, summary: it.summary, date: it.date, body: it.body, status: it.status } : blank();
      st.prev = false; st.err = ''; st.ask = false; st.done = null; redraw();
    }
    function resume(b) { st.ed = Object.assign(blank(), b); st.prev = false; st.err = ''; st.ask = false; st.done = null; redraw(); }
    function close() { st.ed = null; st.prev = false; st.err = ''; st.ask = false; redraw(); }

    async function save(status) {
      const e = st.ed;
      if (st.busy) return;
      st.busy = true; st.err = ''; redraw();
      try {
        const r = await api.newsSave({ id: e.id, title: e.title, tag: e.tag, summary: e.summary, body: e.body, date: e.date, status });
        st.items = r.items || [];
        const it = st.items.find(x => x.id === r.saved);
        mem.clear(); st.ed = null; st.prev = false;
        st.done = { id: r.saved, msg: status === '임시' ? '임시 저장했어요. 아직 소식에는 보이지 않아요.' : it && !it.live ? '올렸어요. ' + dayText(it.date) + '부터 소식에 보여요.' : '올렸어요. 소식에 바로 보여요(처음 몇 초는 걸릴 수 있어요).' };
      } catch (x) { st.err = x.message || '저장하지 못했어요.'; }
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
      const field = (label, node, help) => [UI.withInfo(el('label', { class: 'f' }, label), help, { label: label + ' 도움말' }), node];
      const keep = () => mem.set(e);   // 쓰는 중에 화면을 옮겨도 이어 쓸 수 있게 이 기기에 잠깐 기억
      const onIn = (k, ev) => { e[k] = ev.target.value; keep(); };
      const title = el('input', { class: 'field', type: 'text', maxlength: '100', value: e.title, autocomplete: 'off', placeholder: '소식 제목', 'aria-label': '제목', oninput: ev => onIn('title', ev) });
      const tag = el('input', { class: 'field', type: 'text', maxlength: '20', value: e.tag, list: 'aa-news-tags', autocomplete: 'off', placeholder: '공지', 'aria-label': '꼬리표', oninput: ev => onIn('tag', ev) });
      const tags = el('datalist', { id: 'aa-news-tags' }, ...TAGS.map(t => el('option', { value: t })));
      const date = el('input', { class: 'field', type: 'date', value: e.date, 'aria-label': '날짜', onchange: ev => { e.date = ev.target.value || todayStr(); keep(); redraw(); } });
      const sum = el('input', { class: 'field', type: 'text', maxlength: '200', value: e.summary, autocomplete: 'off', placeholder: '비우면 본문 첫 문단이 들어가요', 'aria-label': '목록에 보이는 요약', oninput: ev => onIn('summary', ev) });
      const ta = el('textarea', { class: 'field nw-body', rows: '16', maxlength: '20000', 'aria-label': '본문', placeholder: '여기에 글을 써요. 마크다운을 몰라도 위의 단추로 꾸밀 수 있어요.', oninput: ev => { e.body = ev.target.value; keep(); } });
      ta.value = e.body;
      const tb = el('div', { class: 'aa-acts fb-bar nw-tools', role: 'group', 'aria-label': '꾸미기' },
        el('button', { class: 'btn small ghost', type: 'button', onclick: () => wrap(ta, '**', '**', '굵게') }, '굵게'),
        el('button', { class: 'btn small ghost', type: 'button', onclick: () => wrap(ta, '*', '*', '기울임') }, '기울임'),
        el('button', { class: 'btn small ghost', type: 'button', onclick: () => prefix(ta, '### ') }, '작은 제목'),
        el('button', { class: 'btn small ghost', type: 'button', onclick: () => prefix(ta, '- ') }, '점 목록'),
        el('button', { class: 'btn small ghost', type: 'button', onclick: () => prefix(ta, i => (i + 1) + '. ') }, '번호 목록'),
        el('button', { class: 'btn small ghost', type: 'button', onclick: () => prefix(ta, '> ') }, '인용'),
        el('button', { class: 'btn small ghost', type: 'button', onclick: () => link2(ta) }, '링크'));
      const tabs = el('div', { class: 'aa-acts fb-bar', role: 'group', 'aria-label': '쓰기와 미리보기' },
        el('button', { class: 'btn small ghost', type: 'button', 'aria-pressed': String(!st.prev), onclick: () => { st.prev = false; redraw(); } }, '쓰기'),
        el('button', { class: 'btn small ghost', type: 'button', 'aria-pressed': String(st.prev), onclick: () => { st.prev = true; redraw(); } }, '미리보기'));
      kids.push(el('h1', null, e.id ? '소식 글 고치기' : '새 소식 글'));
      kids.push(el('p', { class: 'hint' }, '누구나 볼 수 있는 글이에요. 사람 이름·교회 이름·기도제목은 쓰지 마세요.'));
      const future = e.date > todayStr();
      if (!st.prev) {
        kids.push(el('div', { class: 'card aa-card' }, el('div', { class: 'aa-form' },
          ...field('제목', title), ...field('꼬리표(제목 옆 작은 표시)', tag, '비워도 돼요. 공지·업데이트·안내처럼 짧게 써요.'), tags,
          ...field('날짜', date, '오늘 날짜가 기본이에요. 앞으로의 날짜를 고르면 그날부터 소식에 보여요(예약).'),
          future ? el('p', { class: 'hint' }, dayText(e.date) + '부터 소식에 보여요.') : null,
          ...field('목록에 보이는 요약(없어도 돼요)', sum, '소식 목록에서 제목 아래에 한 줄로 보여요. 비우면 본문 첫 문단이 알아서 들어가요.'),
          ...field('본문', el('div', null, tabs, tb, ta), HELP))));
      } else {
        const it = el('div', { class: 'card aa-card nw-prev' },
          el('div', { class: 'aa-head' }, el('span', { class: 'hint' }, dayText(e.date)), e.tag ? el('span', { class: 'own-tag' }, e.tag) : null),
          el('h2', null, e.title || '(제목이 비어 있어요)'),
          el('p', { class: 'hint' }, e.summary ? e.summary : Markdown.lead(e.body) ? Markdown.inline(Markdown.lead(e.body)) : '(요약이 비어 있어요)'),
          Markdown.render(e.body));
        kids.push(tabs, it, el('p', { class: 'hint' }, '실제 소식 페이지에서는 글꼴과 색이 조금 달라 보일 수 있어요.'));
      }
      if (st.err) kids.push(el('p', { class: 'aa-err', role: 'alert' }, st.err));
      if (st.ask) {
        kids.push(el('div', { class: 'card aa-card' }, el('p', { class: 'msg' }, '이 글을 지울까요? 되돌릴 수 없어요. 내리기만 하려면 "소식에서 내리기"를 눌러요.'),
          el('div', { class: 'actions' },
            el('button', { class: 'btn small', type: 'button', disabled: st.busy, onclick: remove }, '글 지우기'),
            el('button', { class: 'btn small ghost', type: 'button', onclick: () => { st.ask = false; redraw(); } }, '돌아가기'))));
      } else {
        const wasLive = e.id && st.items.some(x => x.id === e.id && x.status === '올림');
        kids.push(el('div', { class: 'actions nw-acts' },
          el('button', { class: 'btn', type: 'button', disabled: st.busy, onclick: () => save('올림') }, wasLive ? '고쳐서 올리기' : '올리기'),
          wasLive ? el('button', { class: 'btn ghost', type: 'button', disabled: st.busy, onclick: () => save('임시') }, '소식에서 내리기') : el('button', { class: 'btn ghost', type: 'button', disabled: st.busy, onclick: () => save('임시') }, '임시 저장'),
          el('button', { class: 'btn ghost', type: 'button', disabled: st.busy, onclick: () => { mem.clear(); close(); } }, e.id ? '닫기' : '버리기'),
          e.id ? el('button', { class: 'link quiet', type: 'button', disabled: st.busy, onclick: () => { st.ask = true; redraw(); } }, '글 지우기') : null));
      }
      return kids;
    }

    function row(it) {
      return el('div', { class: 'card aa-card' + (it.status === '임시' ? ' stopped' : '') },
        el('div', { class: 'aa-head' }, el('b', null, it.title)),
        el('div', { class: 'aa-head' }, el('span', { class: it.live ? 'own-tag' : 'ch-todo warn' }, statusText(it)),
          el('span', { class: 'hint nw-meta' }, [dayText(it.date), it.tag || null].filter(Boolean).join(' · '))),
        el('div', { class: 'aa-acts' }, el('button', { class: 'btn small', type: 'button', onclick: () => open(it) }, '고치기'), live(it) ? link(it) : null));
    }

    function build() {
      if (st.ed) return editor();
      const kids = [UI.withInfo(el('h1', null, '소식'), ['여기서 쓴 글은 koinobia.com의 소식 탭에 올라가요.', 'news.js에 원래 있던 글은 여기서 고칠 수 없어요(그대로 같이 보여요).'], { label: '소식 도움말' })];
      if (st.error) { kids.push(el('div', { class: 'card' }, el('p', { class: 'msg' }, st.error))); return kids; }
      kids.push(el('p', { class: 'aa-sum' }, '올라간 글 ' + st.items.filter(live).length + '개 · 임시·예약 ' + st.items.filter(x => !live(x)).length + '개'));
      if (st.done) kids.push(el('div', { class: 'card aa-card' }, el('p', { class: 'msg', role: 'status' }, st.done.msg),
        st.done.id && st.items.some(x => x.id === st.done.id && x.live) ? el('div', { class: 'actions' }, link({ id: st.done.id })) : null));
      const b = mem.get();
      if (b && (b.title || b.body)) kids.push(el('div', { class: 'card aa-card' }, el('p', { class: 'msg' }, '쓰던 글이 이 기기에 남아 있어요' + (b.title ? ': ' + b.title : '') + '.'),
        el('div', { class: 'actions' },
          el('button', { class: 'btn small', type: 'button', onclick: () => resume(b) }, '이어서 쓰기'),
          el('button', { class: 'btn small ghost', type: 'button', onclick: () => { mem.clear(); redraw(); } }, '지우기'))));
      kids.push(el('div', { class: 'actions nw-new' }, el('button', { class: 'btn', type: 'button', onclick: () => open(null) }, '새 글 쓰기')));
      if (!st.items.length) kids.push(el('div', { class: 'card' }, el('p', { class: 'msg us-empty' }, '아직 여기서 쓴 글이 없어요.')));
      else kids.push(el('div', { class: 'aa-grid' }, ...st.items.map(row)));
      return kids;
    }

    redraw();
    return sec;
  }
  window.Views = Object.assign(window.Views || {}, { news: { render } });
})();
