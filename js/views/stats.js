/* 이용 통계: 앱 전체 합계만 그린다(교회·사람 단위 없음). 서버 값을 그대로 그린다(038부터 가리지 않는다). 옛 서버가 small을 주면 0이 아니라 빈 칸 + '5명 미만'으로 둔다.
   탭을 열 때만 그 탭의 함수를 부른다. 같은 (함수·인자)는 60초 메모리에 기억하고, 늦게 온 옛 요청은 버린다(S.seq). */
(function () {
  const { el } = UI;
  const C = Charts;
  const APPS = [['', '전체'], ['koide', '코이데'], ['didako', '디다코'], ['telio', '텔리오']];
  const APP_NAME = { koide: '코이데', didako: '디다코', telio: '텔리오' };
  const TABS = [['glance', '한눈에'], ['feature', '기능'], ['flow', '흐름'], ['back', '다시 오는 사람'], ['time', '시간'], ['device', '기기·앱']];
  const FLOWS = [
    { name: '노트 첫 기도', steps: ['note.open', 'note.item-add', 'note.pray-start', 'note.pray-done'], note: '활성화율: 처음 노트를 열고 이 기간 안에 기도하기를 마친 사람의 비율이에요.' },
    { name: '교회 첫 접속', steps: ['church.step-login', 'church.step-consent', 'church.step-app'], note: '부서·사랑방·가정 화면은 건너뛰는 사람이 있어서 순서 깔때기에서 뺐어요.' },
    { name: '교회 기도', steps: ['church.open', 'church.item-save', 'church.pray-start', 'church.pray-done'], note: '교회 화면에서 기도제목을 저장하고 기도하기를 마친 흐름이에요.' },
    { name: '공동체', steps: ['community.list', 'community.create', 'community.invite-create', 'community.first-topic'], note: '공동체를 만들고 초대한 뒤 첫 기도제목을 올린 흐름이에요.' }
  ];
  const S = { app: '', days: 30, tab: 'glance', grain: 'day', nrGrain: 'week', kind: '', months: 6, flow: 0, fdays: 7, custom: ['', '', '', '', '', '', '', ''], customGo: null, cross: '', seq: 0 };
  const cache = new Map();
  let panelEl = null;

  const kst = ms => new Date(ms + 9 * 36e5).toISOString().slice(0, 10);
  const range = () => ({ from: kst(Date.now() - (S.days - 1) * 864e5), to: kst(Date.now()) });
  function get(name, args) {
    const key = name + '|' + JSON.stringify(args), c = cache.get(key);
    if (c && Date.now() - c.t < 60000) return c.p;
    const p = api.usage[name](args);
    cache.set(key, { t: Date.now(), p });
    p.catch(() => cache.delete(key));
    return p;
  }
  // 037(행동 지표) 함수가 서버에 아직 없으면 그 카드에만 안내를 보인다
  const get37 = (name, args) => get(name, args).catch(e => {
    throw e && e.code === 'sql' ? { code: 'sql', message: '서버 SQL 037이 아직 없어요. 037을 Supabase에 넣은 뒤 다시 불러와 주세요.' } : e;
  });
  const secText = v => v == null ? null : v < 60 ? v + '초' : Math.floor(v / 60) + '분' + (v % 60 ? ' ' + (v % 60) + '초' : '');
  const appName = a => APP_NAME[a] || a || '';
  const dash = x => x == null ? C.mk() : x;
  // 서버가 small:true를 준 응답(038 이전)일 때만 5명 미만 안내를 쓴다. 아니면 값이 없는 것이라 기록 없음으로 안내한다
  const MASK_NOTE = () => C.isMasking() ? '5명 미만이라 가려졌어요.' : '기록이 없어요.';

  // 카드: 제목, 설명, (선택) 도구 줄, 불러오는 함수, 그리는 함수. 실패해도 이 카드에만 오류 문구가 보인다
  function card(title, hint, tools, load, draw, token) {
    const body = el('div', { class: 'us-body' }, el('p', { class: 'loading' }, '불러오는 중…'));
    const c = el('div', { class: 'card us-card' }, el('h2', null, title), hint ? el('p', { class: 'hint' }, hint) : null, tools, body);
    load().then(d => {
      if (token !== S.seq) return;
      let n;
      try { C.setMasking(JSON.stringify(d || {}).includes('"small":true')); n = draw(d); } catch (e) { n = el('p', { class: 'aa-err' }, '그래프를 그리지 못했어요.'); console.error('draw', e); }
      body.replaceChildren(n);
    }, e => {
      if (token !== S.seq) return;
      body.replaceChildren(el('p', { class: 'aa-err' }, (e && e.message) || '불러오지 못했어요.'));
    });
    return c;
  }
  function select(label, opts, val, on) {
    const s = el('select', { class: 'field', 'aria-label': label, onchange: () => on(s.value) },
      ...opts.map(([v, t]) => el('option', { value: v, selected: String(v) === String(val) ? true : null }, t)));
    return s;
  }
  const tools = (...k) => el('div', { class: 'us-tools' }, ...k);
  const note = t => el('p', { class: 'hint' }, t);
  const nothing = t => el('p', { class: 'msg' }, t);

  // ---- 한눈에 ----
  function glance(tk) {
    const r = range(), g = S.days > 90 && S.grain === 'day' ? 'week' : S.grain;
    const a = { app: S.app, from: r.from, to: r.to, grain: g };
    const sg = S.days <= 90 ? 'week' : 'month';
    return [
      card('활동한 사람', '그 기간에 한 번이라도 앱을 쓴 사람 수예요.',
        tools(select('단위', [['day', '하루'], ['week', '한 주'], ['month', '한 달']], g, v => { S.grain = v; panel(); })),
        () => get('active', a),
        d => {
          const s = d.series || [];
          if (!s.length) return nothing('이 기간에는 기록이 없어요.');
          const vals = s.map(x => C.pick(x.active, 'n')), seen = vals.filter(v => v != null);
          const out = el('div', null);
          if (!seen.length) out.append(note('이 기간은 모두 ' + MASK_NOTE()));
          out.append(C.figure({
            svg: C.line(s.map(x => C.plabel(x.period, g)), [{ name: '활동한 사람', values: vals }], { area: true, label: '활동한 사람 꺾은선 그래프. 기간 ' + s.length + '개, 가려진 기간 ' + (s.length - seen.length) + '개' + (seen.length ? ', 보이는 값은 ' + Math.min(...seen) + '명에서 ' + Math.max(...seen) + '명' : '') }),
            legend: [['s1', '활동한 사람'], ['mask', C.MASK + '이라 가린 기간']],
            table: { head: ['기간', '활동한 사람', '사건 수'], rows: s.map(x => [x.period, C.pick(x.active, 'n') == null ? null : C.fmtN(C.pick(x.active, 'n')), C.pick(x.events, 'n') == null ? null : C.fmtN(C.pick(x.events, 'n'))]) }
          }));
          // 1인당 평균 사건: 사람 수와 사건 수가 둘 다 보이는 가장 가까운 기간만
          let per = null, when = '';
          for (let i = s.length - 1; i >= 0; i--) {
            const p = C.pick(s[i].active, 'n'), e = C.pick(s[i].events, 'n');
            if (p != null && p > 0 && e != null) { per = Math.round(e / p * 10) / 10; when = s[i].period; break; }
          }
          const last = s[s.length - 1];
          out.append(C.tiles([
            { label: '가장 최근 기간 활동한 사람', value: C.pick(last.active, 'n') == null ? null : C.fmtN(C.pick(last.active, 'n')) + '명', note: C.plabel(last.period, g) },
            { label: '1인당 평균 사건 수', value: per == null ? null : per + '번', note: per == null ? '' : '사건 수 ÷ 사람 수 (' + C.plabel(when, g) + ')' }
          ]));
          return out;
        }, tk),
      card('고착도', '하루 평균 활동한 사람 ÷ 한 달 활동한 사람이에요. 높을수록 한 달 동안 자주 돌아오는 사람이 많아요. 이번 달은 어제까지만 세서 "진행 중"으로 표시해요.', null,
        () => get37('stickiness', { app: S.app, months: S.days >= 365 ? 13 : 6 }),
        d => {
          const ms = d.months || [];
          if (!ms.length) return nothing('이 기간에는 기록이 없어요.');
          const vals = ms.map(m => C.pick(m.ratio, 'r')), seen = vals.filter(v => v != null);
          const lab = m => { const x = /^(\d{4})-(\d{2})/.exec(m.month || ''); return x ? Number(x[2]) + '월' : String(m.month); };
          const num = (o, k) => C.pick(o, k) == null ? null : o[k];
          const out = el('div', null);
          if (!seen.length) out.append(note('모두 ' + MASK_NOTE()));
          out.append(C.figure({
            svg: C.line(ms.map(lab), [{ name: '고착도', values: vals.map(v => v == null ? null : C.f1(v * 100)) }], { area: true, fmt: v => v + '%', top: Math.max(10, Math.ceil(Math.max(0, ...seen.map(v => v * 100)) * 1.25 / 5) * 5), partial: ms.map(m => !!m.partial), label: '고착도 꺾은선 그래프. 달 ' + ms.length + '개, 가려진 달 ' + (ms.length - seen.length) + '개' + (ms.some(m => m.partial) ? ', 이번 달은 진행 중' : '') + (seen.length ? ', 보이는 값은 ' + C.pct(Math.min(...seen)) + '에서 ' + C.pct(Math.max(...seen)) : '') }),
            legend: [['s1', '고착도(달 단위)'], ['hollow', '이번 달(진행 중)'], ['mask', C.MASK + '이라 가린 달']],
            table: { head: ['달', '한 달 활동자', '하루 평균 활동자', '고착도', ''], rows: ms.map(m => [m.month, num(m.mau, 'n') == null ? null : C.fmtN(m.mau.n), num(m.dau_avg, 'v') == null ? null : String(m.dau_avg.v), C.pick(m.ratio, 'r') == null ? null : C.pct(m.ratio.r), m.partial ? '진행 중' : '']) }
          }));
          const done = ms.slice().reverse().find(m => !m.partial) || ms[ms.length - 1];
          out.append(C.tiles([
            { label: '지난 달 고착도', value: C.pick(done.ratio, 'r') == null ? null : C.pct(done.ratio.r), note: lab(done).replace('*', '') },
            { label: '하루 평균 활동자', value: C.pick(done.dau_avg, 'v') == null ? null : done.dau_avg.v + '명' },
            { label: '한 달 활동자', value: C.pick(done.mau, 'n') == null ? null : C.fmtN(done.mau.n) + '명' }
          ]));
          return out;
        }, tk),
      card('새로 온 사람과 다시 온 사람', '새로 온 사람은 기록에서 처음 나타난 사람, 다시 온 사람은 그 기간에 활동했고 처음 온 때가 그 전인 사람이에요. 기록을 접어 둔 옛 기간은 빠져요.',
        tools(select('단위', [['day', '하루'], ['week', '한 주'], ['month', '한 달']], S.nrGrain, v => { S.nrGrain = v; panel(); })),
        () => get37('newReturning', { app: S.app, from: r.from, to: r.to, grain: S.nrGrain }),
        d => {
          const s = d.series || [], g = d.grain || S.nrGrain;
          if (!s.length) return nothing('이 기간에는 기록이 없어요.');
          const cols = s.map(x => ({ label: C.plabel(x.period, g), vs: [C.pick(x.new, 'n'), C.pick(x.returning, 'n')] }));
          const seen = cols.filter(c => c.vs.some(v => v != null)).length, out = el('div', null);
          if (!seen) out.append(note('이 기간은 모두 ' + MASK_NOTE()));
          const cell = o => C.pick(o, 'n') == null ? null : C.fmtN(C.pick(o, 'n'));
          out.append(C.figure({
            svg: C.barsStack(cols, ['새로 온 사람', '다시 온 사람'], { label: '새로 온 사람과 다시 온 사람 누적 막대 그래프. 기간 ' + s.length + '개, 둘 다 가려진 기간 ' + (s.length - seen) + '개' }),
            legend: [['f1', '새로 온 사람'], ['f2', '다시 온 사람'], ['mask', C.MASK + '이라 가림']],
            table: { head: ['기간', '새로 온 사람', '다시 온 사람'], rows: s.map(x => [x.period, cell(x.new), cell(x.returning)]) }
          }));
          return out;
        }, tk),
      card('새로 온 계정', '새로 가입한 계정 수와 로그인 방법이에요(앱별로는 나누지 않아요).', null,
        () => get('signups', { from: r.from, to: r.to, grain: sg }),
        d => {
          const s = d.series || [];
          if (!s.length) return nothing('이 기간에는 기록이 없어요.');
          const cols = s.map(x => ({ label: C.plabel(x.period, sg), v: C.pick(x.new, 'n') })), seen = cols.filter(c => c.v != null);
          const cell = o => C.pick(o, 'n') == null ? null : C.fmtN(C.pick(o, 'n'));
          const out = el('div', null);
          if (!seen.length) out.append(note('이 기간은 모두 ' + MASK_NOTE()));
          out.append(C.figure({
            svg: C.barsV(cols, { label: '새로 온 계정 막대 그래프. 기간 ' + s.length + '개, 가려진 기간 ' + (s.length - seen.length) + '개' }),
            legend: [['f1', '새 계정'], ['mask', C.MASK + '이라 가린 기간']],
            table: { head: ['기간', '새 계정', '누적'], rows: s.map(x => [x.period, cell(x.new), cell(x.cumulative)]) }
          }));
          out.append(C.tiles([{ label: '지금까지 모두', value: C.pick(d.cumulative_total, 'n') == null ? null : C.fmtN(C.pick(d.cumulative_total, 'n')) + '명' }]));
          out.append(el('p', { class: 'label' }, '로그인 방법'));
          const PN = ['카카오', '구글', '애플', '그 밖'], pv = x => { const p = x.providers || {}; return [C.pick(p.kakao, 'n'), C.pick(p.google, 'n'), C.pick(p.apple, 'n'), C.pick(p.other, 'n')]; };
          out.append(C.figure({
            svg: C.stack100(s.map(x => ({ label: C.plabel(x.period, sg), vs: pv(x) })), PN, { keys: ['1', '2', '3', 'o'], label: '로그인 방법별 구성 비율 누적 막대 그래프. 기간 ' + s.length + '개' }),
            legend: [['f1', '카카오'], ['f2', '구글'], ['f3', '애플'], ['fo', '그 밖'], ['mask', C.MASK + '이라 가림']],
            table: { head: ['기간', '카카오', '구글', '애플', '그 밖'], rows: s.map(x => { const p = x.providers || {}; return [x.period, cell(p.kakao), cell(p.google), cell(p.apple), cell(p.other)]; }) }
          }));
          return out;
        }, tk)
    ];
  }

  // ---- 기능 ----
  function feature(tk) {
    const r = range(), a = { app: S.app, from: r.from, to: r.to }, load = () => get('features', a);
    const isChurch = i => i.app === 'koide' && /^church\./.test(i.ev);
    const rows = (items, key) => items.map(i => {
      const v = key === 'reach' ? C.pick(i.reach, 'r') : C.pick(i.users, 'n'), u = C.pick(i.users, 'n');
      return { label: i.label, v, text: v == null ? null : key === 'reach' ? C.pct(v) + ' · ' + C.fmtN(u) + '명' : C.fmtN(v) + '명' };
    });
    const tbl = items => ({ head: ['기능', '종류', '사람 수', '전체 중', '사건 수'], rows: items.map(i => [i.label, { screen: '화면', action: '행동', error: '오류' }[i.kind] || i.kind, C.pick(i.users, 'n') == null ? null : C.fmtN(C.pick(i.users, 'n')), C.pick(i.reach, 'r') == null ? null : C.pct(C.pick(i.reach, 'r')), C.pick(i.events, 'n') == null ? null : C.fmtN(C.pick(i.events, 'n'))]) });
    const bars = (items, key, label, legend) => {
      if (!items.length) return nothing('이 기간에는 보여 줄 기능이 없어요.');
      const rr = rows(items, key), seen = rr.filter(x => x.v != null);
      const out = el('div', null);
      if (!seen.length) out.append(note('모두 ' + MASK_NOTE()));
      out.append(C.figure({ svg: C.barsH(rr, { label: label + ' 가로 막대 그래프. 기능 ' + items.length + '개, 가려진 기능 ' + (items.length - seen.length) + '개' }), legend: legend || [['f1', key === 'reach' ? '전체 활동자 중 비율' : '사람 수'], ['mask', C.MASK + '이라 가림']], table: tbl(items) }));
      return out;
    };
    return [
      card('기능별 사용', '전체 활동자 중 몇 %가 썼는지예요. 코이데 교회 화면은 아래 묶음에 따로 있어요.',
        tools(select('종류', [['', '화면·행동'], ['screen', '화면'], ['action', '행동']], S.kind, v => { S.kind = v; panel(); })),
        load, d => {
          const items = (d.items || []).filter(i => i.kind !== 'error' && !isChurch(i) && (!S.kind || i.kind === S.kind));
          const out = el('div', null, note('이 기간 활동한 사람: ' + (C.pick(d.active, 'n') == null ? C.mk() : C.fmtN(C.pick(d.active, 'n')) + '명')));
          out.append(bars(items, 'reach', '기능별 사용'));
          return out;
        }, tk),
      card('아무도 안 쓴 기능', '이 기간에 한 번도 쓰이지 않은 기능이에요.', null, load, d => {
        const u = (d.items || []).filter(i => i.unused);
        if (!u.length) return nothing('모든 기능이 한 번 이상 쓰였어요.');
        return el('div', { class: 'ch-todos' }, ...u.map(i => el('span', { class: 'ch-todo warn' }, i.label)));
      }, tk),
      card('오류', '오류가 난 사람 수예요(원인 글은 모으지 않아요).', null, load, d => bars((d.items || []).filter(i => i.kind === 'error'), 'users', '오류', [['f1', '사람 수'], ['mask', C.MASK + '이라 가림']]), tk),
      card('코이데 교회 화면', '교회 기능의 화면·행동을 한 묶음으로 접어 두었어요.', null, load, d => {
        const items = (d.items || []).filter(i => isChurch(i) && i.kind !== 'error');
        if (!items.length) return nothing('이 앱·기간에는 교회 묶음이 없어요.');
        const det = el('details', { class: 'us-det' }, el('summary', null, '교회 화면 ' + items.length + '개 보기'), bars(items, 'users', '교회 화면', [['f1', '사람 수'], ['mask', C.MASK + '이라 가림']]));
        return det;
      }, tk)
    ];
  }

  // ---- 흐름 ----
  function flow(tk) {
    const custom = S.flow === 'custom';
    const fa = S.app || 'koide';
    const head = el('div', { class: 'card us-card' },
      el('h2', null, '단계별 흐름'),
      el('p', { class: 'hint' }, '순서대로 단계를 밟은 사람 수예요. 단계 사이에 건너뛴 화면이 있어도 괜찮아요.'),
      el('div', { class: 'us-tools' },
        ...FLOWS.map((f, i) => el('button', { class: 'btn small ghost', type: 'button', 'aria-pressed': String(S.flow === i), onclick: () => { S.flow = i; panel(); } }, f.name)),
        el('button', { class: 'btn small ghost', type: 'button', 'aria-pressed': String(custom), onclick: () => { S.flow = 'custom'; panel(); } }, '직접 고르기'),
        select('며칠', [[7, '7일'], [14, '14일'], [30, '30일'], [90, '90일']], S.fdays, v => { S.fdays = Number(v); panel(); })));
    let steps, name, hint, app;
    if (!custom) { const f = FLOWS[S.flow]; steps = f.steps; name = f.name; hint = f.note; app = 'koide'; }
    else { steps = S.customGo; name = '직접 고른 흐름'; hint = ''; app = fa; }
    const out = [head];
    if (custom) {
      const picker = el('div', { class: 'card us-card' }, el('h2', null, '단계 고르기'),
        el('p', { class: 'hint' }, appName(fa) + '의 기능 이름에서 2~8개를 순서대로 골라 주세요.'), el('p', { class: 'loading' }, '불러오는 중…'));
      get('features', { app: fa }).then(d => {
        if (tk !== S.seq) return;
        const items = (d.items || []).filter(i => i.app === fa && i.kind !== 'error');
        const sels = S.custom.map((v, i) => {
          const s = el('select', { class: 'field', 'aria-label': (i + 1) + '단계', onchange: () => { S.custom[i] = s.value; } },
            el('option', { value: '' }, i < 2 ? '(고르세요)' : '(없음)'), ...items.map(it => el('option', { value: it.ev, selected: it.ev === v ? true : null }, it.label)));
          return s;
        });
        const msg = el('p', { class: 'aa-err' });
        picker.replaceChildren(el('h2', null, '단계 고르기'), el('p', { class: 'hint' }, appName(fa) + '의 기능 이름에서 2~8개를 순서대로 골라 주세요.'),
          ...sels.map((s, i) => el('div', { class: 'us-pick' }, el('span', { class: 'hint' }, (i + 1) + '단계'), s)), msg,
          el('button', { class: 'btn small', type: 'button', onclick: () => {
            const st = S.custom.filter(Boolean);
            if (st.length < 2) { msg.textContent = '단계를 두 개 이상 골라 주세요.'; return; }
            if (new Set(st).size !== st.length) { msg.textContent = '같은 단계를 두 번 고를 수 없어요.'; return; }
            S.customGo = st; panel();
          } }, '흐름 보기'));
      }, e => { if (tk === S.seq) picker.replaceChildren(el('p', { class: 'aa-err' }, e.message || '불러오지 못했어요.')); });
      out.push(picker);
      if (!steps) return out;
    }
    out.push(card(name, hint, null, () => get('funnel', { app, steps, days: S.fdays }), d => {
      const st = d.steps || [];
      if (!st.length) return nothing('단계 정보가 없어요.');
      const v0 = C.pick(st[0].users, 'n');
      const seen = st.filter(s => C.pick(s.users, 'n') != null).length;
      const last = st[st.length - 1], act = v0 == null ? null : C.pick(last.from_first, 'r');
      const wrap = el('div', null);
      if (v0 == null) wrap.append(note(C.isMasking() ? '첫 단계가 ' + MASK_NOTE() : '첫 단계 ' + MASK_NOTE()));
      wrap.append(C.figure({
        svg: C.funnel(st),
        legend: [['f1', '그 단계까지 온 사람'], ['lost', '앞 단계에서 빠진 사람'], ['mask', C.MASK + '이라 가림(그 뒤 단계도 가려요)']],
        table: { head: ['단계', '사람 수', '앞 단계 대비', '첫 단계 대비'], rows: st.map(s => [s.label, C.pick(s.users, 'n') == null ? null : C.fmtN(C.pick(s.users, 'n')), s.from_prev ? (C.pick(s.from_prev, 'r') == null ? null : C.pct(C.pick(s.from_prev, 'r'))) : '-', s.from_first ? (C.pick(s.from_first, 'r') == null ? null : C.pct(C.pick(s.from_first, 'r'))) : '-']) }
      }));
      wrap.append(C.tiles([{ label: '활성화율 (첫 단계 대비 마지막 단계)', value: act == null ? null : C.pct(act), note: '최근 ' + d.days + '일' }]));
      if (seen === 0 && v0 != null) wrap.append(note(MASK_NOTE()));
      return wrap;
    }, tk));
    return out;
  }

  // ---- 다시 오는 사람 ----
  function back(tk) {
    return [
      card('처음 온 달별 다시 온 비율', '처음 온 달에 온 사람 중 1·4·12주 뒤에 다시 온 사람의 비율이에요. 아직 그 주가 지나지 않은 사람은 빼요.',
        tools(select('몇 달', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => [n, n + '달']), S.months, v => { S.months = Number(v); panel(); })),
        () => get('retention', { app: S.app, months: S.months }),
        d => {
          const cs = d.cohorts || [];
          if (!cs.length) return nothing('아직 보여 줄 달이 없어요.');
          const rows = cs.map(c => {
            const m = /^(\d{4})-(\d{2})/.exec(c.cohort || '');
            return { label: m ? m[1] + '년 ' + Number(m[2]) + '월' : String(c.cohort), size: C.pick(c.size, 'n'), rates: [C.pick(c.w1, 'r'), C.pick(c.w4, 'r'), C.pick(c.w12, 'r')] };
          });
          const out = el('div', null);
          if (rows.every(r => r.rates.every(x => x == null))) out.append(note('모두 ' + MASK_NOTE()));
          const tbl = C.cohortTable(['처음 온 달', '처음 온 사람', '1주 뒤', '4주 뒤', '12주 뒤'], rows);
          out.append(tbl);
          // 가림 칸이 실제로 있을 때만 범례에 "가림"을 보인다
          out.append(C.legend([['ramp', '진할수록 다시 온 비율이 높아요']].concat(tbl.querySelector('.mask') ? [['mask', '"가림"은 값이 없는 칸(아직 그 주가 지나지 않았거나 ' + C.MASK + ')']] : [])));
          return out;
        }, tk),
      card('한 달에 며칠 오나', '이 기간에 며칠 왔는지로 사람을 묶었어요(최대 90일까지 봐요).', null,
        () => get37('frequency', { app: S.app, days: Math.min(90, Math.max(7, S.days)) }),
        d => {
          const bs = d.buckets || [];
          if (!bs.length) return nothing('이 기간에는 기록이 없어요.');
          const name = b => b.to == null ? b.from + '일 이상' : b.from === b.to ? b.from + '일' : b.from + '~' + b.to + '일';
          const cols = bs.map(b => ({ label: name(b).replace('일', ''), v: C.pick(b.users, 'n') })), seen = cols.filter(c => c.v != null).length;
          const out = el('div', null, note('이 기간 활동한 사람: ' + (C.pick(d.active, 'n') == null ? C.mk() : C.fmtN(d.active.n) + '명') + ' · 최근 ' + d.days + '일'));
          if (!seen) out.append(note('모두 ' + MASK_NOTE()));
          out.append(C.figure({
            svg: C.barsV(cols, { label: '사용 빈도 막대 그래프. 구간 ' + bs.length + '개, 가려진 구간 ' + (bs.length - seen) + '개' }),
            legend: [['f1', '그 구간의 사람 수(가로축은 온 날 수)'], ['mask', C.MASK + '이라 가림']],
            table: { head: ['온 날 수', '사람 수'], rows: bs.map(b => [name(b), C.pick(b.users, 'n') == null ? null : C.fmtN(b.users.n)]) }
          }));
          return out;
        }, tk),
      card('쉬는 사람', '30일 넘게 오지 않은 사람의 비율이에요.', null,
        () => get('dormant', { app: S.app }),
        d => {
          const rate = C.pick(d.dormant_rate, 'r'), da = C.pick(d.dormant, 'n'), ac = C.pick(d.active, 'n');
          return el('div', null, C.tiles([
            { label: '30일 넘게 안 온 사람 비율', value: rate == null ? null : C.pct(rate), note: d.as_of ? d.as_of + ' 기준' : '' },
            { label: '쉬는 사람', value: da == null ? null : C.fmtN(da) + '명' },
            { label: '요즘 오는 사람', value: ac == null ? null : C.fmtN(ac) + '명' }
          ]), rate == null ? note(MASK_NOTE()) : null);
        }, tk)
    ];
  }

  // ---- 시간 ----
  function time(tk) {
    const r = range();
    // 시간대 지도는 서버 037이 들어간 뒤부터 일이 일어난 때(client_at)로 요일·시간을 센다(화면은 그대로)
    return [card('요일·시간대 지도', '한국 시간 기준이에요. 진할수록 그 시간에 쓰인 사건이 많아요.', null,
      () => get('heatmap', { app: S.app, from: r.from, to: r.to }),
      d => {
        const cs = d.cells || [], days = '일월화수목금토';
        if (!cs.length) return nothing('이 기간에는 기록이 없어요.');
        const seen = cs.filter(c => C.pick(c.events, 'n') != null).length;
        const out = el('div', null);
        if (!seen) out.append(note('모두 ' + MASK_NOTE()));
        out.append(C.figure({
          svg: (() => { const s = C.heat(cs); s.setAttribute('aria-label', '요일과 시간대 지도. 기록이 있는 칸 ' + cs.length + '개, 가려진 칸 ' + (cs.length - seen) + '개'); return s; })(),
          legend: [['ramp', '진할수록 그 시간의 사건이 많아요'], ['mask', C.MASK + '이라 가림'], ['empty', '기록 없음']],
          table: { head: ['요일', '시간', '사건 수'], rows: cs.map(c => [days[c.dow] || '', c.hour + '시', C.pick(c.events, 'n') == null ? null : C.fmtN(C.pick(c.events, 'n'))]) }
        }));
        return out;
      }, tk),
    card('머문 시간', '기도하기·모임 모드를 마칠 때 앱이 보낸 머문 시간이에요. 시간을 보낸 기록만 세요.', null,
      () => get37('duration', { app: S.app, from: r.from, to: r.to }),
      d => {
        const items = d.items || [];
        if (!items.length) return nothing('보여 줄 항목이 없어요.');
        const out = el('div', null);
        if (items.every(i => C.pick(i.users, 'n') == null)) out.append(note('앱이 머문 시간을 보내기 시작하면 보여요.' + (C.isMasking() ? ' 이미 보내고 있다면 ' + MASK_NOTE() : '')));
        const nm = i => i.label + (appName(i.app) ? ' (' + appName(i.app) + ')' : '');
        const okOf = i => C.pick(i.users, 'n') != null && i.median_sec != null;
        const rows = items.map(i => okOf(i) ? { label: nm(i), med: i.median_sec, p25: i.p25_sec, p75: i.p75_sec, avg: i.avg_sec } : { label: nm(i), med: null });
        const shown = rows.filter(r => r.med != null).length;
        out.append(C.figure({
          svg: C.boxplot(rows, { fmt: v => secText(Math.round(v)), label: '머문 시간 상자 그림. 항목 ' + items.length + '개, 가려진 항목 ' + (items.length - shown) + '개' + rows.filter(r => r.med != null).map(r => '. ' + r.label + ' 중앙값 ' + secText(r.med)).join('') }),
          legend: [['box', '많은 사람의 범위(25%~75%)'], ['med', '중앙값(절반이 이보다 짧아요)'], ['avg', '평균'], ['mask', C.MASK + '이라 가림']],
          table: { head: ['항목', '사람 수', '중앙값', '25%', '75%', '평균'], rows: items.map(i => okOf(i) ? [nm(i), C.fmtN(i.users.n) + '명', secText(i.median_sec), secText(i.p25_sec), secText(i.p75_sec), secText(i.avg_sec)] : [nm(i), null, null, null, null, null]) }
        }));
        items.forEach(i => {
          if (!okOf(i)) return;
          out.append(el('p', { class: 'label us-sub' }, nm(i) + ' · 머문 시간 구간별 횟수'));
          const bs = i.buckets || [], cols = bs.map(b => ({ label: b.label, v: C.pick(b.events, 'n') }));
          out.append(C.figure({
            svg: C.barsV(cols, { h: 130, label: i.label + ' 머문 시간 구간별 횟수 히스토그램' }),
            legend: [['f1', '구간별 횟수'], ['mask', C.MASK + '이라 가림']],
            table: { head: ['머문 시간', '횟수'], rows: bs.map(b => [b.label, C.pick(b.events, 'n') == null ? null : C.fmtN(b.events.n)]) }
          }));
        });
        return out;
      }, tk)];
  }

  // ---- 기기·앱 ----
  function device(tk) {
    const r = range(), a = { app: S.app, from: r.from, to: r.to }, load = () => get('devices', a);
    const KIND = { phone: '휴대폰', tablet: '태블릿', pc: '컴퓨터', '': '알 수 없음' };
    // 구성 비율(조각 3~4개)은 도넛, 서로 겹칠 수 있는 묶음은 가로 막대
    const barsOf = (list, name, label) => {
      if (!list.length) return nothing('이 기간에는 기록이 없어요.');
      const rr = list.map(x => { const v = C.pick(x.users, 'n'); return { label: name(x.k), v, text: v == null ? null : C.fmtN(v) + '명' }; });
      const seen = rr.filter(x => x.v != null).length, out = el('div', null);
      if (!seen) out.append(note('모두 ' + MASK_NOTE()));
      out.append(C.figure({ svg: C.barsH(rr, { label: label + ' 가로 막대 그래프. 항목 ' + rr.length + '개, 가려진 항목 ' + (rr.length - seen) + '개' }), legend: [['f1', '사람 수'], ['mask', C.MASK + '이라 가림']], table: { head: [label, '사람 수'], rows: list.map(x => [name(x.k), C.pick(x.users, 'n') == null ? null : C.fmtN(C.pick(x.users, 'n'))]) } }));
      return out;
    };
    const donutOf = (list, name, label, cls) => {
      if (!list.length) return nothing('이 기간에는 기록이 없어요.');
      const parts = list.map((x, i) => ({ label: name(x.k), v: C.pick(x.users, 'n'), cls: cls ? cls(x, i) : String(i + 1) }));
      const seen = parts.filter(x => x.v != null).length, out = el('div', null);
      if (!seen) out.append(note('모두 ' + MASK_NOTE()));
      out.append(C.figure({ svg: C.donut(parts, { label: label + ' 도넛 그래프. 항목 ' + parts.length + '개, 가려진 항목 ' + (parts.length - seen) + '개' + parts.filter(x => x.v != null).map(x => '. ' + x.label + ' ' + C.fmtN(x.v) + '명').join('') }), table: { head: [label, '사람 수'], rows: list.map(x => [name(x.k), C.pick(x.users, 'n') == null ? null : C.fmtN(C.pick(x.users, 'n'))]) } }));
      return out;
    };
    const months = [];
    { const t = new Date(Date.now() + 9 * 36e5); for (let i = 0; i < 13; i++) { const d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - i, 1)); const v = d.toISOString().slice(0, 10); months.push([i === 0 ? '' : v, d.getUTCFullYear() + '년 ' + (d.getUTCMonth() + 1) + '월']); } }
    return [
      card('기기', '화면 폭으로 나눈 기기 종류예요.', null, load, d => donutOf(d.device || [], k => KIND[k] != null ? KIND[k] : String(k), '기기', x => ({ phone: '1', pc: '2', tablet: '3' })[x.k] || 'o'), tk),
      card('홈 화면 앱', '홈 화면에 추가한 앱으로 연 사람과 브라우저로 연 사람이에요.', null, load, d => donutOf(d.standalone || [], k => k === true || k === 'true' ? '홈 화면 앱' : '브라우저', '여는 방법', x => (x.k === true || x.k === 'true') ? '1' : '2'), tk),
      card('앱 판', '쓰고 있는 화면 버전이에요.', null, load, d => {
        const list = d.ver || [];
        if (!list.length) return nothing('이 기간에는 기록이 없어요.');
        return C.table(['앱 판', '사람 수'], list.map(x => [x.k || '알 수 없음', C.pick(x.users, 'n') == null ? null : C.fmtN(C.pick(x.users, 'n'))]));
      }, tk),
      card('앱 넘나들기', '한 달 동안 코이노비아 앱을 몇 개 쓴 사람이 몇 명인지예요.',
        tools(select('달', months, S.cross, v => { S.cross = v; panel(); })),
        () => get('crossApp', { month: S.cross }), d => {
          const b = d.buckets || [], by = d.by_app || [];
          const out = el('div', null);
          out.append(donutOf(b.map(x => ({ k: x.apps, users: x.users })), k => '앱 ' + k + '개 쓴 사람', '쓴 앱 수', x => ({ 1: 'q2', 2: 'q4', 3: 'q5' })[x.k] || 'q3'));
          out.append(el('p', { class: 'label' }, '앱별 사용한 사람(여러 앱을 쓴 사람은 각 앱에 한 번씩 들어가요)'));
          out.append(barsOf(by.map(x => ({ k: x.app, users: x.users })), k => appName(k), '앱'));
          return out;
        }, tk)
    ];
  }

  const BUILD = { glance, feature, flow, back, time, device };

  function panel() {
    const tk = ++S.seq;
    panelEl.replaceChildren(...BUILD[S.tab](tk));
  }

  function banner() {
    const box = el('div', null);
    Promise.all([api.dbSize(), api.settingList().catch(() => null)]).then(r => {
      if (!r[0] || Number(r[0].usage_events) !== 0) return;
      const sw = r[1] && (r[1].items || []).find(i => i.key === 'usage_track');
      box.append(el('div', { class: 'card st-note' }, el('p', { class: 'msg' }, '아직 쌓인 기록이 없어요.'),
        el('p', { class: 'hint' }, sw ? '이용 통계 기록은 지금 ' + (sw.value === 'on' ? '켜짐' : '꺼짐') + '이에요.' + (sw.value === 'on' ? '' : ' 처리방침을 마친 뒤 교회 메뉴에서 켜요.') : '이용 통계 기록 스위치는 교회 메뉴에 있어요.')));
    }, () => { /* 안내만 못 보일 뿐이다 */ });
    return box;
  }

  function render() {
    S.seq++;
    panelEl = el('div', { id: 'us-panel', role: 'tabpanel', 'aria-labelledby': 'us-tab-' + S.tab });
    const tabs = el('div', { class: 'us-tabs', role: 'tablist', 'aria-label': '이용 통계 탭' }, ...TABS.map(([k, name]) =>
      el('button', { class: 'us-tab', type: 'button', role: 'tab', id: 'us-tab-' + k, 'aria-selected': String(S.tab === k), tabindex: S.tab === k ? '0' : '-1', 'aria-controls': 'us-panel', 'data-tab': k,
        onclick: () => pick(k) }, name)));
    function pick(k) {
      S.tab = k;
      tabs.querySelectorAll('.us-tab').forEach(b => { const on = b.dataset.tab === k; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      panelEl.setAttribute('aria-labelledby', 'us-tab-' + k);
      panel();
    }
    tabs.addEventListener('keydown', e => {
      const i = TABS.findIndex(t => t[0] === S.tab);
      const j = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i + TABS.length - 1) % TABS.length : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1;
      if (j < 0) return;
      e.preventDefault(); pick(TABS[j][0]); document.getElementById('us-tab-' + TABS[j][0]).focus();
    });
    const ctl = el('div', { class: 'us-ctl' },
      select('앱', APPS, S.app, v => { S.app = v; panel(); }),
      select('기간', [[7, '최근 7일'], [30, '최근 30일'], [90, '최근 90일'], [365, '최근 365일']], S.days, v => { S.days = Number(v); panel(); }),
      el('button', { class: 'btn small ghost', type: 'button', onclick: () => { cache.clear(); panel(); } }, '다시 불러오기'));
    const sec = el('section', null, el('h1', null, '이용 통계'),
      el('p', { class: 'hint' }, '앱 전체 합계만 보여요. 사람이나 교회별로 나누지 않아요.'),
      banner(), ctl, tabs, panelEl);
    panel();
    return sec;
  }

  window.Views = Object.assign(window.Views || {}, { stats: { render } });
})();
