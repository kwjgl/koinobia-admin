/* 이용 통계: 앱 전체 합계만 그린다(교회·사람 단위 없음). 서버 값을 그대로 그린다(038부터 가리지 않는다). 옛 서버가 small을 주면 0이 아니라 빈 칸 + '5명 미만'으로 둔다.
   탭을 열 때만 그 탭의 함수를 부른다. 같은 (함수·인자)는 60초 메모리에 기억하고, 늦게 온 옛 요청은 버린다(S.seq). */
(function () {
  const { el } = UI;
  const C = Charts;
  const APPS = [['', '전체'], ['koide', '코이데'], ['didako', '디다코'], ['telio', '텔리오']];
  const APP_NAME = { koide: '코이데', didako: '디다코', telio: '텔리오' };
  const TABS = [['glance', '한눈에'], ['feature', '기능'], ['flow', '흐름'], ['back', '다시 오는 사람'], ['time', '시간'], ['device', '기기·앱'], ['research', '연구']];
  const FLOWS = [
    { app: 'koide', name: '코이데 노트 첫 기도', steps: ['note.open', 'note.item-add', 'note.pray-start', 'note.pray-done'], note: '활성화율: 처음 노트를 열고 이 기간 안에 기도하기를 마친 사람의 비율이에요.' },
    { app: 'koide', name: '코이데 교회 첫 접속', steps: ['church.step-login', 'church.step-consent', 'church.step-app'], note: '부서·사랑방·가정 화면은 건너뛰는 사람이 있어서 순서 깔때기에서 뺐어요.' },
    { app: 'koide', name: '코이데 교회 기도', steps: ['church.open', 'church.item-save', 'church.pray-start', 'church.pray-done'], note: '교회 화면에서 기도제목을 저장하고 기도하기를 마친 흐름이에요.' },
    { app: 'koide', name: '코이데 공동체', steps: ['community.list', 'community.create', 'community.invite-create', 'community.first-topic'], note: '공동체를 만들고 초대한 뒤 첫 기도제목을 올린 흐름이에요.' },
    { app: 'didako', name: '디다코 노트', steps: ['note.open', 'note.answer'], note: '노트를 열고 오늘의 질문에 대답을 남긴 흐름이에요.' },
    { app: 'didako', name: '디다코 공동체', steps: ['cm.open', 'cm.keep-sentence', 'cm.reflect'], note: '공동체를 열고 오늘 남길 한 문장을 쓴 뒤 돌아보기까지 남긴 흐름이에요.' },
    { app: 'didako', name: '디다코 교회', steps: ['church.open', 'church.keep-sentence', 'church.reflect'], note: '교회를 열고 오늘 남길 한 문장을 쓴 뒤 돌아보기까지 남긴 흐름이에요.' }
  ];
  const S = { app: '', days: 30, tab: 'glance', grain: 'day', nrGrain: 'week', kind: '', months: 6, flow: 0, fdays: 7, custom: ['', '', '', '', '', '', '', ''], customGo: null, cross: '', fkind: 'action', fsort: 'adj', fhide: false, seg: 'device', segm: 'ret', seq: 0 };
  const cache = new Map();
  let panelEl = null, daysSel = null;
  // 표 CSV(운영용) 머리말에 쓰는 앱·기간·날짜. 지표 정의 판은 서버 040의 m1
  C.setCsvCtx(() => { const r = range(); return { app: S.app ? APP_NAME[S.app] : '전체', from: r.from, to: r.to, today: kst(Date.now()), ver: 'm1' }; });

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
  // 040(핵심 지표·이상 신호) 함수가 서버에 아직 없으면 그 카드에만 차분한 안내를 보인다(오류 빨간 글이 아니다)
  const get40 = (name, args) => get(name, args).catch(e => {
    throw e && e.code === 'sql' ? { code: 'sql40', message: '서버 040을 넣으면 보여요.' } : e;
  });
  const DEVICE_NAME = { phone: '휴대폰', tablet: '태블릿', pc: '컴퓨터', '': '알 수 없음' };
  const secText = v => v == null ? null : v < 60 ? v + '초' : Math.floor(v / 60) + '분' + (v % 60 ? ' ' + (v % 60) + '초' : '');
  const appName = a => APP_NAME[a] || a || '';
  const dash = x => x == null ? C.mk() : x;
  // 서버가 small:true를 준 응답(038 이전)일 때만 5명 미만 안내를 쓴다. 아니면 값이 없는 것이라 기록 없음으로 안내한다
  const MASK_NOTE = () => C.isMasking() ? '5명 미만이라 가려졌어요.' : '기록이 없어요.';

  // 카드: 제목, 설명, (선택) 도구 줄, 불러오는 함수, 그리는 함수. 실패해도 이 카드에만 오류 문구가 보인다
  function card(title, hint, tools, load, draw, token) {
    const body = el('div', { class: 'us-body' }, el('p', { class: 'loading' }, '불러오는 중…'));
    const c = el('div', { class: 'card us-card' }, el('div', { class: 'us-hd' }, UI.withInfo(el('h2', null, title), hint, { label: title + ' 도움말' }), tools), body);
    load().then(d => {
      if (token !== S.seq) return;
      C.setWidth(body.clientWidth);
      let n;
      try { C.setMasking(JSON.stringify(d || {}).includes('"small":true')); n = draw(d); } catch (e) { n = el('p', { class: 'aa-err' }, '그래프를 그리지 못했어요.'); console.error('draw', e); }
      body.replaceChildren(n);
    }, e => {
      if (token !== S.seq) return;
      body.replaceChildren(e && e.code === 'sql40' ? el('p', { class: 'hint' }, e.message) : el('p', { class: 'aa-err' }, (e && e.message) || '불러오지 못했어요.'));
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
  const nothing = t => el('p', { class: 'msg us-empty' }, t);


  // ---- 핵심 지표판 ----
  const ROLE_NAME = { pray: '기도했어요 누름', finish: '기도하기 마침', answer: '대답 남김', meditate: '묵상 마침', keep: '남기기', open: '질문 펴 보기', quiz: '말씀 퀴즈 풀기', share: '나눔하기 마침' };
  const AREA_NAME = { note: '노트', community: '공동체', church: '교회' };
  const dnum = o => (o && !o.small && o.n != null && Number.isFinite(Number(o.n))) ? Number(o.n) : null;
  const drate = o => (o && !o.small && o.r != null && Number.isFinite(Number(o.r))) ? Number(o.r) : null;
  const shortDate = d => { const m = /^\d{4}-(\d{2})-(\d{2})/.exec(d || ''); return m ? Number(m[1]) + '월 ' + Number(m[2]) + '일' : ''; };
  // 변화 줄: 이전 0이면 "이전 0명"만, 이전이 작으면(10 미만) 사람 수 차이만, 그 밖은 퍼센트. 비율은 %p. 오류(better:'down')는 색 없이 글과 화살표로만 알린다
  function delta(cur, prev, better, rate) {
    if (cur == null || prev == null) return null;
    let text, dir;
    if (rate) {
      const d = Math.round((cur - prev) * 1000) / 10;
      dir = Math.abs(d) < 0.5 ? 0 : d > 0 ? 1 : -1;
      text = dir === 0 ? '→ 비슷해요' : (d > 0 ? '↑ +' : '↓ ') + C.f1(d) + '%p';
    } else if (prev === 0) { return { text: '이전 0명', cls: 'flat' }; }
    else if (prev < 10) {
      const d = cur - prev; dir = d === 0 ? 0 : d > 0 ? 1 : -1;
      text = dir === 0 ? '→ 같아요' : (d > 0 ? '↑ +' : '↓ ') + d + '명';
    } else {
      const p = (cur - prev) / prev; dir = Math.abs(p) < 0.05 ? 0 : p > 0 ? 1 : -1;
      text = dir === 0 ? '→ 비슷해요' : (p > 0 ? '↑ ' : '↓ ') + Math.round(Math.abs(p) * 100) + '%';
    }
    if (better === 'down' && dir) text += dir > 0 ? ' 늘었어요' : ' 줄었어요';
    return { text, cls: better === 'down' ? 'neutral' : dir === 0 ? 'flat' : dir > 0 ? 'up' : 'down' };
  }
  const TILE = {
    active: { label: '활동한 사람', help: '그 기간에 한 번이라도 앱을 쓴 사람 수예요.' },
    core: { label: '핵심 행동을 한 사람', help: '앱마다 정한 핵심 행동(기도했어요, 기도하기 마침, 대답 남기기 등)을 한 번이라도 한 사람 수예요. 영역별 정의는 아래 "영역별로 보기"에 있어요.' },
    pray_rate: { label: '기도했어요를 누른 비율', help: '코이데를 쓴 사람 중 기도했어요를 한 번이라도 누른 사람의 비율이에요. 분자는 누른 사람, 분모는 코이데를 쓴 사람이에요.' },
    new: { label: '새로 온 사람', help: '기록에서 처음 나타난 사람 수예요. 오래된 기록은 접혀서 알 수 없을 수 있어요.' },
    ret28: { label: '4주 안에 다시 온 비율', help: '처음 온 사람 중 4주 안에 다시 온 사람의 비율이에요. 4주가 지나야 알 수 있어서 28일 늦게 반영돼요.' },
    err: { label: '오류가 난 사람', help: '오류를 한 번이라도 겪은 사람 수예요. 늘어난 것이 나쁘다고 단정하지 않아서 색 없이 보여요.' }
  };
  function kpiTile(k, d) {
    const t = TILE[k.key] || { label: k.key, help: '' }, rate = k.key === 'pray_rate' || k.key === 'ret28';
    const cur = rate ? drate(k.cur) : dnum(k.cur), prev = rate ? drate(k.prev) : dnum(k.prev);
    const sp = (k.spark || []).map(x => rate ? (drate(x) == null ? null : Math.round(drate(x) * 1000) / 10) : dnum(x));
    let value = cur == null ? '—' : rate ? C.pct(cur) : C.fmtN(cur) + '명', sub = '', dl = delta(cur, prev, k.better, rate);
    if (k.limited === 'floor') { value = '—'; sub = '오래된 기록이 접혀서 알 수 없어요'; dl = null; }
    else if (k.key === 'core') {
      const act = (d.kpis.find(x => x.key === 'active') || {}).cur, a = dnum(act);
      if (!(d.core_defs || []).length) sub = '핵심 행동이 아직 없어요';
      else if (cur != null && a) sub = '활동한 사람 중 ' + Math.round(cur / a * 100) + '%';
    } else if (k.key === 'pray_rate') {
      const den = dnum(k.cur && k.cur.den), num = dnum(k.cur && k.cur.num);
      if (!den) { value = '—'; sub = '코이데 기록이 아직 안 들어와요'; dl = null; }
      else sub = num + '/' + den + ' · 코이데 활동한 사람 중';
    } else if (k.key === 'ret28') {
      const den = dnum(k.cur && k.cur.den);
      if (den != null && den < 5) sub = '표본이 적어요(' + den + '명)';
    }
    const lab = t.label + ' ' + value + (dl ? ', ' + dl.text : '') + (sub ? ', ' + sub : '');
    return el('div', { class: 'gr-kpi' },
      UI.withInfo(el('span', { class: 'gr-kpi-l' }, t.label), t.help, { label: t.label + ' 도움말' }),
      el('b', { class: 'gr-kpi-v' + (cur == null ? ' none' : '') }, value),
      el('span', { class: 'gr-kpi-s' }, sub),
      el('span', { class: 'gr-delta ' + (dl ? dl.cls : 'flat') }, dl ? dl.text : ''),
      C.spark(sp, { label: t.label + ' 추이. ' + lab }));
  }
  function kpiDraw(d) {
    const ks = d.kpis || [];
    const vals = ks.flatMap(k => [k.cur, k.prev]);
    const anyVal = vals.some(o => (dnum(o) || 0) > 0 || (drate(o) || 0) > 0);
    if (!anyVal) return nothing('이 기간에는 기록이 없어요.');
    const out = el('div', null);
    const cf = d.cur || {}, pf = d.prev || {};
    out.append(note('어제까지 ' + d.days + '일(' + shortDate(cf.from) + '~' + shortDate(cf.to) + '), 바로 앞 같은 기간(' + shortDate(pf.from) + '~' + shortDate(pf.to) + ')과 비교해요.' + (S.days > 180 ? ' 365일은 180일로 줄여서 보여요.' : '')));
    out.append(el('div', { class: 'gr-kpis' }, ...ks.map(k => kpiTile(k, d))));
    const core = ks.find(k => k.key === 'core');
    if (core && (core.areas || []).length) {
      const areas = core.areas, nm = a => appName(a.app) + ' · ' + (AREA_NAME[a.area] || a.area);
      const box = el('div', null);
      box.append(C.figure({ csv: '핵심 행동 영역별', file: 'kpi-areas', period: '최근 ' + d.days + '일(어제까지)',
        svg: C.barsH(areas.map(a => ({ label: nm(a), v: dnum(a.cur) })), { compact: true, unit: '명', label: '영역별 핵심 행동을 한 사람 가로 막대 그래프. 영역 ' + areas.length + '개' }),
        table: { head: ['영역', '지금', '이전'], rows: areas.map(a => [nm(a), dnum(a.cur) == null ? null : C.fmtN(dnum(a.cur)), dnum(a.prev) == null ? null : C.fmtN(dnum(a.prev))]) }
      }));
      const roles = (core.roles || []).filter(r => (dnum(r.cur) || 0) > 0 || (dnum(r.prev) || 0) > 0);
      if (roles.length) box.append(C.table(['행동', '지금', '이전'], roles.map(r => [r.label || ROLE_NAME[r.role] || ((d.core_defs || []).find(x => x.role === r.role) || {}).label || r.role, dnum(r.cur) == null ? null : C.fmtN(dnum(r.cur)), dnum(r.prev) == null ? null : C.fmtN(dnum(r.prev))])));
      out.append(el('details', { class: 'us-det' }, el('summary', null, '영역별로 보기'), note('한 사람이 여러 영역을 하면 각각에 들어가요. 그래서 영역 합이 위의 사람 수보다 클 수 있어요.'), box));
    }
    const fv = (k, o) => { const r = k.key === 'pray_rate' || k.key === 'ret28', v = r ? drate(o) : dnum(o); return v == null ? null : r ? C.pct(v) : C.fmtN(v) + '명'; };
    out.append(el('details', { class: 'us-det' }, el('summary', null, '모든 숫자 표로 보기'), C.table(['지표', '지금', '이전', '변화'], ks.map(k => {
      const rate = k.key === 'pray_rate' || k.key === 'ret28', dl = k.limited === 'floor' ? null : delta(rate ? drate(k.cur) : dnum(k.cur), rate ? drate(k.prev) : dnum(k.prev), k.better, rate);
      return [(TILE[k.key] || { label: k.key }).label, fv(k, k.cur), fv(k, k.prev), dl ? dl.text : '—'];
    }))));
    return out;
  }
  function kpiCard(tk) {
    const days = Math.min(S.days, 180);
    return card('핵심 지표', '활동한 사람, 핵심 행동, 기도했어요 비율, 새로 온 사람, 4주 안에 다시 온 비율, 오류를 한눈에 봐요. 어제까지 고른 기간과 바로 앞 같은 기간을 비교하고, 작은 선은 그 기간을 거꾸로 이어 본 추이예요(달력 주가 아니라 어제부터 7일씩). 4주 지표는 28일 늦게 반영돼요. 365일은 180일로 줄여요.', null,
      () => get40('kpi', { app: S.app, days }), kpiDraw, tk);
  }

  // ---- 한눈에 ----
  function glance(tk) {
    const r = range(), g = S.days > 90 && S.grain === 'day' ? 'week' : S.grain;
    const a = { app: S.app, from: r.from, to: r.to, grain: g };
    const sg = S.days <= 90 ? 'week' : 'month';
    return [
      kpiCard(tk),
      card('활동한 사람', '그 기간에 한 번이라도 앱을 쓴 사람 수예요.',
        tools(select('단위', [['day', '하루'], ['week', '한 주'], ['month', '한 달']], g, v => { S.grain = v; panel(); })),
        () => Promise.all([get('active', a), get40('releases', { app: S.app, from: r.from, to: r.to }).catch(() => null)]),
        ([d, rel]) => {
          const s = d.series || [];
          if (!s.length) return nothing('이 기간에는 기록이 없어요.');
          const vals = s.map(x => C.pick(x.active, 'n')), seen = vals.filter(v => v != null);
          const out = el('div', null);
          if (!seen.length) out.append(note('이 기간은 모두 ' + MASK_NOTE()));
          const marks = releaseMarks(rel, s, g);
          out.append(C.figure({ csv: '활동한 사람', file: 'active',
            svg: C.line(s.map(x => C.plabel(x.period, g)), [{ name: '활동한 사람', values: vals }], { area: true, unit: '명', marks, full: s.map(x => C.plong(x.period, g)), label: '활동한 사람 꺾은선 그래프. 기간 ' + s.length + '개, 가려진 기간 ' + (s.length - seen.length) + '개' + (marks.length ? ', 출시 표시 ' + marks.length + '개(' + marks.map(m => m.tip).join(', ') + ')' : '') + (seen.length ? ', 보이는 값은 ' + Math.min(...seen) + '명에서 ' + Math.max(...seen) + '명' : '') }),
            legend: [['s1', '활동한 사람'], ['mark', '새 판이 처음 나타난 날(점선)'], ['mask', C.MASK + '이라 가린 기간']],
            table: { head: ['기간', '활동한 사람', '사건 수'], rows: s.map(x => [x.period, C.pick(x.active, 'n') == null ? null : C.fmtN(C.pick(x.active, 'n')), C.pick(x.events, 'n') == null ? null : C.fmtN(C.pick(x.events, 'n'))]) }
          }));
          if (rel && (!S.app || S.app === 'koide') && !(rel.items || []).some(x => x.app === 'koide')) out.append(note('코이데 판 번호가 아직 들어오지 않았어요.'));
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
          out.append(C.figure({ csv: '고착도', file: 'stickiness', period: '최근 ' + ms.length + '달(달 단위)',
            svg: C.line(ms.map(lab), [{ name: '고착도', values: vals.map(v => v == null ? null : C.f1(v * 100)) }], { area: true, fmt: v => v + '%', full: ms.map(m => { const x = /^(\d{4})-(\d{2})/.exec(m.month || ''); return x ? x[1] + '년 ' + Number(x[2]) + '월' : String(m.month); }), partial: ms.map(m => !!m.partial), label: '고착도 꺾은선 그래프. 달 ' + ms.length + '개, 가려진 달 ' + (ms.length - seen.length) + '개' + (ms.some(m => m.partial) ? ', 이번 달은 진행 중' : '') + (seen.length ? ', 보이는 값은 ' + C.pct(Math.min(...seen)) + '에서 ' + C.pct(Math.max(...seen)) : '') }),
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
          const cols = s.map(x => ({ label: C.plabel(x.period, g), full: C.plong(x.period, g), vs: [C.pick(x.new, 'n'), C.pick(x.returning, 'n')] }));
          const seen = cols.filter(c => c.vs.some(v => v != null)).length, out = el('div', null);
          if (!seen) out.append(note('이 기간은 모두 ' + MASK_NOTE()));
          const cell = o => C.pick(o, 'n') == null ? null : C.fmtN(C.pick(o, 'n'));
          out.append(C.figure({ csv: '새로 온 사람과 다시 온 사람', file: 'new-returning',
            svg: C.barsStack(cols, ['새로 온 사람', '다시 온 사람'], { unit: '명', label: '새로 온 사람과 다시 온 사람 누적 막대 그래프. 기간 ' + s.length + '개, 둘 다 가려진 기간 ' + (s.length - seen) + '개' }),
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
          const cols = s.map(x => ({ label: C.plabel(x.period, sg), full: C.plong(x.period, sg), v: C.pick(x.new, 'n') })), seen = cols.filter(c => c.v != null);
          const cell = o => C.pick(o, 'n') == null ? null : C.fmtN(C.pick(o, 'n'));
          const out = el('div', null);
          if (!seen.length) out.append(note('이 기간은 모두 ' + MASK_NOTE()));
          out.append(C.figure({ csv: '새로 온 계정', file: 'signups',
            svg: C.barsV(cols, { unit: '명', label: '새로 온 계정 막대 그래프. 기간 ' + s.length + '개, 가려진 기간 ' + (s.length - seen.length) + '개' }),
            legend: [['f1', '새 계정'], ['mask', C.MASK + '이라 가린 기간']],
            table: { head: ['기간', '새 계정', '누적'], rows: s.map(x => [x.period, cell(x.new), cell(x.cumulative)]) }
          }));
          out.append(C.tiles([{ label: '지금까지 모두', value: C.pick(d.cumulative_total, 'n') == null ? null : C.fmtN(C.pick(d.cumulative_total, 'n')) + '명' }]));
          out.append(el('p', { class: 'label' }, '로그인 방법'));
          const PN = ['카카오', '구글', '애플', '그 밖'], pv = x => { const p = x.providers || {}; return [C.pick(p.kakao, 'n'), C.pick(p.google, 'n'), C.pick(p.apple, 'n'), C.pick(p.other, 'n')]; };
          out.append(C.figure({ csv: '로그인 방법', file: 'providers',
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
    // 0명인 기능은 줄에서 뺀다(안 쓴 기능은 '아무도 안 쓴 기능' 카드에 있다). 가려진 값(null)은 0이 아니라 남긴다. 많이 쓴 기능 순(기능 비교라 괜찮다)
    const used = (i, key) => { const v = key === 'reach' ? C.pick(i.reach, 'r') : C.pick(i.users, 'n'); return v !== 0; };
    const byUse = (x, y) => (C.pick(y.reach, 'r') ?? -1) - (C.pick(x.reach, 'r') ?? -1) || (C.pick(y.users, 'n') ?? -1) - (C.pick(x.users, 'n') ?? -1);
    const one = (items, key, label, legend) => {
      const rr = rows(items, key), seen = rr.filter(x => x.v != null);
      return C.figure({ csv: label, file: 'features-' + key, svg: C.barsH(rr, { compact: true, label: label + ' 가로 막대 그래프. 기능 ' + items.length + '개, 가려진 기능 ' + (items.length - seen.length) + '개' }), legend: legend || [['f1', key === 'reach' ? '전체 활동자 중 비율' : '사람 수'], ['mask', C.MASK + '이라 가림']], table: tbl(items) });
    };
    const bars = (all, key, label, legend, group) => {
      const items = all.filter(i => used(i, key)).sort(byUse);
      if (!items.length) return nothing('이 기간에 쓰인 기능이 없어요.');
      const out = el('div', null);
      if (!items.some(i => (key === 'reach' ? C.pick(i.reach, 'r') : C.pick(i.users, 'n')) != null)) out.append(note('모두 ' + MASK_NOTE()));
      const apps = group && !S.app ? [...new Set(items.map(i => i.app))] : null;
      if (!apps) { out.append(one(items, key, label, legend)); return out; }
      apps.forEach(ap => out.append(el('h3', { class: 'us-sub' }, appName(ap)), one(items.filter(i => i.app === ap), key, label + ' ' + appName(ap), legend)));
      return out;
    };
    return [
      card('기능별 사용', '전체 활동자 중 몇 %가 썼는지예요. 한 번도 안 쓴 기능은 아래 카드에 있어요. 코이데 교회 화면은 맨 아래 묶음에 따로 있어요.',
        tools(select('종류', [['', '화면·행동'], ['screen', '화면'], ['action', '행동']], S.kind, v => { S.kind = v; panel(); })),
        load, d => {
          const items = (d.items || []).filter(i => i.kind !== 'error' && !isChurch(i) && (!S.kind || i.kind === S.kind));
          const out = el('div', null, note('이 기간 활동한 사람: ' + (C.pick(d.active, 'n') == null ? C.mk() : C.fmtN(C.pick(d.active, 'n')) + '명')));
          out.append(bars(items, 'reach', '기능별 사용', null, true));
          return out;
        }, tk),
      card('아무도 안 쓴 기능', '이 기간에 한 번도 쓰이지 않은 기능이에요.', null, load, d => {
        const u = (d.items || []).filter(i => i.unused);
        if (!u.length) return nothing('모든 기능이 한 번 이상 쓰였어요.');
        const chips = list => el('div', { class: 'ch-todos' }, ...list.map(i => el('span', { class: 'ch-todo warn' }, i.label)));
        if (S.app) return chips(u);
        const out = el('div', null);
        [...new Set(u.map(i => i.app))].forEach(ap => out.append(el('h3', { class: 'us-sub' }, appName(ap)), chips(u.filter(i => i.app === ap))));
        return out;
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
      UI.withInfo(el('h2', null, '단계별 흐름'), '순서대로 단계를 밟은 사람 수예요. 단계 사이에 건너뛴 화면이 있어도 괜찮아요.', { label: '단계별 흐름 도움말' }),
      el('div', { class: 'us-tools' },
        ...FLOWS.map((f, i) => el('button', { class: 'btn small ghost', type: 'button', 'aria-pressed': String(S.flow === i), onclick: () => { S.flow = i; panel(); } }, f.name)),
        el('button', { class: 'btn small ghost', type: 'button', 'aria-pressed': String(custom), onclick: () => { S.flow = 'custom'; panel(); } }, '직접 고르기'),
        select('며칠', [[7, '7일'], [14, '14일'], [30, '30일'], [90, '90일']], S.fdays, v => { S.fdays = Number(v); panel(); })));
    let steps, name, hint, app;
    if (!custom) { const f = FLOWS[S.flow]; steps = f.steps; name = f.name; hint = f.note; app = f.app; }
    else { steps = S.customGo; name = '직접 고른 흐름'; hint = ''; app = fa; }
    const out = [head];
    if (custom) {
      const pickTitle = () => UI.withInfo(el('h2', null, '단계 고르기'), appName(fa) + '의 기능 이름에서 2~8개를 순서대로 골라 주세요.', { label: '단계 고르기 도움말' });
      const picker = el('div', { class: 'card us-card' }, pickTitle(), el('p', { class: 'loading' }, '불러오는 중…'));
      get('features', { app: fa }).then(d => {
        if (tk !== S.seq) return;
        const items = (d.items || []).filter(i => i.app === fa && i.kind !== 'error');
        const sels = S.custom.map((v, i) => {
          const s = el('select', { class: 'field', 'aria-label': (i + 1) + '단계', onchange: () => { S.custom[i] = s.value; } },
            el('option', { value: '' }, i < 2 ? '(고르세요)' : '(없음)'), ...items.map(it => el('option', { value: it.ev, selected: it.ev === v ? true : null }, it.label)));
          return s;
        });
        const msg = el('p', { class: 'aa-err' });
        picker.replaceChildren(pickTitle(),
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
      wrap.append(C.figure({ csv: name, file: 'funnel', period: '최근 ' + d.days + '일(어제까지)',
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

  // ---- 출시 표시: 새 판이 처음 나타난 날을 그래프의 칸에 붙인다(사람 2명 미만인 판은 뺀다). 한 주·한 달 단위는 그 날짜가 든 칸 ----
  function releaseMarks(rel, s, g) {
    if (!rel || !s.length) return [];
    const out = [];
    (rel.items || []).forEach(x => {
      const n = dnum(x.people);
      if (!x.first_day || !x.ver || n == null || n < 2) return;
      let i = -1;
      s.forEach((p, k) => { if (p.period <= x.first_day) i = k; });
      if (i < 0) return;
      let end;
      if (i + 1 < s.length) end = s[i + 1].period;
      else { const d = new Date(Date.parse(s[i].period + 'T00:00:00Z')); if (g === 'month') d.setUTCMonth(d.getUTCMonth() + 1); else d.setUTCDate(d.getUTCDate() + (g === 'week' ? 7 : 1)); end = d.toISOString().slice(0, 10); }
      if (x.first_day >= end) return;
      out.push({ i, text: String(x.ver), tip: appName(x.app) + ' ' + x.ver + ' 처음 나타남(' + shortDate(x.first_day) + ', ' + n + '명)' });
    });
    return out.slice(-8);
  }

  // ---- 기능과 다시 오기(040) ----
  const num = v => v != null && Number.isFinite(Number(v)) ? Number(v) : null;
  const sgn = v => (v < 0 ? '-' : '+') + C.f1(Math.abs(v) * 100) + '%p';   // 화면 글: 부호를 붙인 %p
  const pc1 = v => v == null ? null : String(C.f1(v * 100));                // 표 칸: 숫자만(단위는 머리글에)
  const THIN_NOTE = '표본이 적어 판단하기 일러요';
  const FR_KIND = { screen: '화면', action: '행동', core: '핵심 행동' };
  function returnRow(it, adjFirst) {
    const wr = drate(it.with && it.with.ret), orr = drate(it.without && it.without.ret), wn = dnum(it.with && it.with.pw), on = dnum(it.without && it.without.pw), pp = dnum(it.with && it.with.people);
    const lift = it.lift && !it.lift.small ? num(it.lift.v) : null, adj = it.adj_lift ? num(it.adj_lift.v) : null;
    const ci = wr != null && orr != null && wn && on ? C.diffCI(wr, wn, orr, on) : null;
    const main = adjFirst && adj != null ? adj : lift;
    const lines = [it.label,
      '한 주: 다음 주 다시 온 비율 ' + (wr == null ? C.mk() : C.pct(wr)) + ' (사람-주 ' + (wn == null ? C.mk() : wn) + ')',
      '안 한 주: ' + (orr == null ? C.mk() : C.pct(orr)) + ' (사람-주 ' + (on == null ? C.mk() : on) + ')',
      '거친 차이 ' + (lift == null ? C.mk() : sgn(lift)) + (ci ? ' (95% 구간 ' + sgn(ci[0]) + ' ~ ' + sgn(ci[1]) + ')' : '')];
    if (adj != null) lines.push('보정 차이 ' + sgn(adj));
    if (it.thin) lines.push(THIN_NOTE);
    return { it, lift, adj, key: main, thin: !!it.thin,
      chart: { label: it.label, a: orr, b: wr, ci, thin: !!it.thin, text: main == null ? C.mk() : (adjFirst && adj != null ? '보정 ' : '') + sgn(main), note: it.thin ? THIN_NOTE : '', tip: lines },
      cells: [it.label, FR_KIND[it.kind] || it.kind || '', wn == null ? null : String(wn), pp == null ? null : String(pp), pc1(wr), on == null ? null : String(on), pc1(orr), lift == null ? null : String(C.f1(lift * 100)), adj == null ? null : String(C.f1(adj * 100)), it.thin ? '표본 적음' : ''] };
  }
  const FR_HEAD = ['기능', '종류', '한 주 사람-주', '한 주 사람 수', '한 주 다음 주 다시 온 비율(%)', '안 한 주 사람-주', '안 한 주 다음 주 다시 온 비율(%)', '거친 차이(%p)', '보정 차이(%p)', '표본'];
  function returnFig(rows, name, d, label) {
    return C.figure({ csv: name, file: 'return-' + (/핵심/.test(name) ? 'core' : S.fkind), period: d.from + ' ~ ' + d.to + ' (한국 시간, 주 단위)',
      svg: C.dumbbell(rows.map(r => r.chart), { label: label + ' 아령 그래프. 줄 ' + rows.length + '개' + rows.slice(0, 5).map(r => '. ' + r.chart.label + ' ' + r.chart.text + (r.thin ? ' (표본 적음)' : '')).join('') }),
      legend: [['dwo', '안 한 주(다음 주 다시 온 비율)'], ['dwf', '한 주'], ['ci', '차이의 95% 구간'], ['thin', THIN_NOTE]],
      table: { head: FR_HEAD, rows: rows.map(r => r.cells) } });
  }
  function returnCard(tk) {
    const r = range();
    return card('기능과 다시 오기',
      ['어떤 기능을 쓴 주에 그 사람이 다음 주에도 왔는지를, 안 쓴 주와 견줘요. 단위는 사람-주(한 사람이 한 주에 한 번)예요. ○는 그 기능을 안 쓴 주, ●는 쓴 주의 다음 주 다시 온 비율이고, 차이가 클수록 두 점이 멀어요.',
        '다시 오게 만든다는 뜻이 아니에요. 많이 오는 사람이 기능도 많이 써서 생기는 차이가 섞여 있어요. 보정 차이는 그 주에 온 날 수(1일·2~3일·4일 이상)가 같은 사람끼리 견준 값이라 그 영향을 줄여 주지만, 이것도 원인을 밝혀 주지는 않아요.',
        '같은 사람이 여러 주에 들어가 있어서 가는 선(95% 구간)은 실제보다 좁게 보일 수 있어요. 사람-주가 30 미만이거나 쓴 사람이 10명 미만이면 회색으로 두고 판단하기 일러요라고 적어요.',
        '다음 주까지 지난 주만 세서 최근 두 주는 빠져요. 기간은 최근 90일 이상으로 올려서 봐요.'],
      tools(select('종류', [['action', '행동'], ['screen', '화면']], S.fkind, v => { S.fkind = v; panel(); }),
        select('정렬', [['adj', '보정 차이 큰 순'], ['raw', '거친 차이 큰 순']], S.fsort, v => { S.fsort = v; panel(); }),
        el('label', { class: 'us-chk' }, el('input', { type: 'checkbox', checked: S.fhide ? true : null, onchange: e => { S.fhide = e.target.checked; panel(); } }), '표본 적은 줄 숨기기')),
      () => get40('featureReturn', { app: S.app, from: r.from, to: r.to }),
      d => {
        const items = d.items || [];
        if (!items.length) return nothing('이 기간에는 보여 줄 기록이 없어요.');
        const adjFirst = S.fsort === 'adj', ovr = drate(d.overall && d.overall.ret);
        const out = el('div', null);
        out.append(el('p', { class: 'hint' }, '전체 다시 온 비율 ', el('b', { class: 'us-big' }, ovr == null ? C.mk() : C.pct(ovr)), ' (' + shortDate(d.from) + '~' + shortDate(d.to) + ', 어느 주든 다음 주에 다시 온 사람-주 비율)'));
        const built = list => list.map(it => returnRow(it, adjFirst)).filter(x => !(S.fhide && x.thin));
        const core = built(items.filter(i => /^_core/.test(i.ev)));
        const feat = built(items.filter(i => !/^_core/.test(i.ev) && i.kind === S.fkind)).sort((x, y) => (y.key ?? -9) - (x.key ?? -9));
        if (core.length) out.append(el('h3', { class: 'us-sub' }, '핵심 행동'), returnFig(core, '핵심 행동 다시 오기', d, '핵심 행동'));
        out.append(el('h3', { class: 'us-sub' }, S.fkind === 'screen' ? '화면' : '행동'));
        if (feat.length) out.append(returnFig(feat, '기능과 다시 오기(' + (S.fkind === 'screen' ? '화면' : '행동') + ')', d, '기능과 다시 오기'));
        else out.append(nothing(S.fhide ? '표본이 충분한 줄이 없어요. 숨기기를 풀면 보여요.' : '보여 줄 기능이 없어요.'));
        return out;
      }, tk);
  }

  // ---- 묶음 비교(040): 기기·홈 화면 앱·앱 판 ----
  const SEG_BY = [['device', '기기'], ['standalone', '홈 화면 앱'], ['ver', '앱 판']];
  const SEG_M = {
    ret: { label: '다음 주 다시 온 비율', get: x => drate(x && x.ret), fmt: v => C.pct(v), cell: v => pc1(v), head: '다음 주 다시 온 비율(%)' },
    core: { label: '핵심 행동을 한 사람 비율', get: x => drate(x && x.core), fmt: v => C.pct(v), cell: v => pc1(v), head: '핵심 행동한 사람 비율(%)' },
    days: { label: '한 주에 연 날', get: x => x && x.days_pw && !x.days_pw.small ? num(x.days_pw.v) : null, fmt: v => C.f1(v) + '일', cell: v => v == null ? null : String(C.f1(v)), head: '한 주에 연 날' }
  };
  function segCard(tk) {
    const r = range(), m = SEG_M[S.segm], byName = (SEG_BY.find(x => x[0] === S.seg) || [])[1] || '';
    return card('묶음 비교',
      ['기기, 홈 화면 앱, 앱 판으로 묶어서 다음 주 다시 온 비율·핵심 행동을 한 사람 비율·한 주에 연 날을 견줘요. 점선은 같은 정의로 센 전체예요.',
        '묶음은 겹칠 수 있어요. 한 주에 휴대폰과 컴퓨터로 모두 연 사람은 두 묶음에 모두 들어가요. 사람-주가 30 미만인 묶음은 회색이고 판단하기 일러요. 어느 묶음이 더 낫다는 뜻이 아니라, 어떤 사람들이 그 묶음을 쓰는지가 달라서 생기는 차이일 수 있어요.',
        '다음 주까지 지난 주만 세요. 기간은 최근 90일 이상으로 올려서 봐요.'],
      tools(select('묶음', SEG_BY, S.seg, v => { S.seg = v; panel(); }), select('지표', Object.keys(SEG_M).map(k => [k, SEG_M[k].label]), S.segm, v => { S.segm = v; panel(); })),
      () => get40('segments', { app: S.app, from: r.from, to: r.to, by: S.seg }),
      d => {
        const by = d.by || S.seg, items = d.items || [];
        if (!items.length) return nothing('이 기간에는 기록이 없어요.');
        const name = k => by === 'device' ? (DEVICE_NAME[k] != null ? DEVICE_NAME[k] : String(k)) : by === 'standalone' ? (k === true || k === 'true' ? '홈 화면 앱' : '브라우저') : (k ? String(k) : '알 수 없음');
        const ppl = x => dnum(x.people);
        const rows = items.map(x => {
          const v = m.get(x);
          return { label: name(x.k), v, text: v == null ? null : m.fmt(v) + (ppl(x) != null ? ' · ' + ppl(x) + '명' : '') + (x.thin ? ' · 판단하기 일러요' : ''),
            tip: [name(x.k) + (x.thin ? ' (표본 적음)' : ''), m.label + ' ' + (v == null ? C.mk() : m.fmt(v)), '사람 ' + (ppl(x) == null ? C.mk() : ppl(x) + '명') + ' · 사람-주 ' + (dnum(x.ret && x.ret.den) == null ? C.mk() : dnum(x.ret.den))].concat(x.thin ? [THIN_NOTE] : []) };
        });
        const ref = m.get(d.all), out = el('div', null), period = d.from + ' ~ ' + d.to + ' (한국 시간, 주 단위)';
        out.append(C.figure({ csv: '묶음 비교(' + byName + ')', file: 'segments-' + S.seg + '-' + S.segm, period,
          svg: C.barsH(rows, { fmt: m.fmt, max: S.segm === 'days' ? 0 : 1, ref, refLabel: ref == null ? null : '전체 ' + m.fmt(ref), thin: items.map(x => !!x.thin), label: byName + '별 ' + m.label + ' 가로 막대 그래프. 묶음 ' + items.length + '개' + (ref == null ? '' : ', 전체 ' + m.fmt(ref)) + rows.filter(x => x.v != null).slice(0, 6).map(x => '. ' + x.text).join('') }),
          legend: [['f1', m.label], ['thin', THIN_NOTE], ['ref', '전체(같은 정의)']],
          table: { head: [byName, '사람 수', SEG_M.ret.head, SEG_M.days.head, SEG_M.core.head, '표본'], rows: [['전체', dnum(d.all && d.all.people) == null ? null : String(dnum(d.all.people)), SEG_M.ret.cell(SEG_M.ret.get(d.all)), SEG_M.days.cell(SEG_M.days.get(d.all)), SEG_M.core.cell(SEG_M.core.get(d.all)), '']]
            .concat(items.map(x => [name(x.k), ppl(x) == null ? null : String(ppl(x)), SEG_M.ret.cell(SEG_M.ret.get(x)), SEG_M.days.cell(SEG_M.days.get(x)), SEG_M.core.cell(SEG_M.core.get(x)), x.thin ? '표본 적음' : ''])) } }));
        // 주별 구성(그 주에 그 묶음으로 쓴 사람 수의 비율): 위에서 5개까지, 나머지는 '그 밖'
        const top = items.slice(0, 5), rest = items.length > 5, same = (e, k) => String(e.k) === String(k);
        const weeks = [...new Set((d.series || []).map(x => x.period))].sort();
        if (weeks.length) {
          const names = top.map(x => name(x.k)).concat(rest ? ['그 밖'] : []), keys = top.map((_, i) => String(i + 1)).concat(rest ? ['o'] : []);
          const cols = weeks.map(w => {
            const at = k => { const e = d.series.find(x => x.period === w && same(x, k)); return e ? C.pick(e.users, 'n') : 0; };
            const vs = top.map(x => at(x.k));
            if (rest) { const o = items.slice(5).map(x => at(x.k)); vs.push(o.some(v => v == null) ? null : o.reduce((a, b) => a + b, 0)); }
            return { label: C.plabel(w, 'week'), vs };
          });
          out.append(el('p', { class: 'label us-sub' }, '주별 구성(그 주에 그 묶음으로 쓴 사람의 비율)'));
          out.append(C.figure({ csv: '묶음 주별 구성(' + byName + ')', file: 'segments-weeks-' + S.seg, period,
            svg: C.stack100(cols, names, { keys, label: byName + '별 주별 구성 비율 누적 막대 그래프. 주 ' + weeks.length + '개' }),
            legend: names.map((nm, i) => ['f' + keys[i], nm]).concat([['mask', C.MASK + '이라 가림']]),
            table: { head: ['주'].concat(names), rows: cols.map(c => [c.label].concat(c.vs.map(v => v == null ? null : String(v)))) } }));
        }
        return out;
      }, tk);
  }

  // ---- 다시 오는 사람 ----
  function back(tk) {
    return [
      returnCard(tk),
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
          const cols = bs.map(b => ({ label: name(b).replace('일', ''), full: name(b), v: C.pick(b.users, 'n') })), seen = cols.filter(c => c.v != null).length;
          const out = el('div', null, note('이 기간 활동한 사람: ' + (C.pick(d.active, 'n') == null ? C.mk() : C.fmtN(d.active.n) + '명') + ' · 최근 ' + d.days + '일'));
          if (!seen) out.append(note('모두 ' + MASK_NOTE()));
          out.append(C.figure({ csv: '한 달에 며칠 오나', file: 'frequency', period: '최근 ' + d.days + '일',
            svg: C.barsV(cols, { unit: '명', label: '사용 빈도 막대 그래프. 구간 ' + bs.length + '개, 가려진 구간 ' + (bs.length - seen) + '개' }),
            legend: [['f1', '사람 수'], ['mask', C.MASK + '이라 가림']],
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
        out.append(C.figure({ csv: '요일·시간대 지도', file: 'heatmap',
          svg: C.heat(cs, { label: '요일과 시간대 지도. 기록이 있는 칸 ' + cs.length + '개, 가려진 칸 ' + (cs.length - seen) + '개' }),
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
        out.append(C.figure({ csv: '머문 시간', file: 'duration',
          svg: C.boxplot(rows, { fmt: v => secText(Math.round(v)), label: '머문 시간 상자 그림. 항목 ' + items.length + '개, 가려진 항목 ' + (items.length - shown) + '개' + rows.filter(r => r.med != null).map(r => '. ' + r.label + ' 중앙값 ' + secText(r.med)).join('') }),
          legend: [['box', '많은 사람의 범위(25%~75%)'], ['med', '중앙값(절반이 이보다 짧아요)'], ['avg', '평균'], ['mask', C.MASK + '이라 가림']],
          table: { head: ['항목', '사람 수', '중앙값', '25%', '75%', '평균'], rows: items.map(i => okOf(i) ? [nm(i), C.fmtN(i.users.n) + '명', secText(i.median_sec), secText(i.p25_sec), secText(i.p75_sec), secText(i.avg_sec)] : [nm(i), null, null, null, null, null]) }
        }));
        items.forEach(i => {
          if (!okOf(i)) return;
          out.append(el('p', { class: 'label us-sub' }, nm(i) + ' · 머문 시간 구간별 횟수'));
          const bs = i.buckets || [], cols = bs.map(b => ({ label: b.label, full: b.label, v: C.pick(b.events, 'n') }));
          out.append(C.figure({ csv: i.label + ' 머문 시간 구간별 횟수', file: 'duration-hist',
            svg: C.barsV(cols, { h: 110, unit: '번', label: i.label + ' 머문 시간 구간별 횟수 히스토그램' }),
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
    const KIND = DEVICE_NAME;
    // 구성 비율(조각 3~4개)은 도넛, 서로 겹칠 수 있는 묶음은 가로 막대
    const barsOf = (list, name, label, period) => {
      if (!list.length) return nothing('이 기간에는 기록이 없어요.');
      const rr = list.map(x => { const v = C.pick(x.users, 'n'); return { label: name(x.k), v, text: v == null ? null : C.fmtN(v) + '명' }; });
      const seen = rr.filter(x => x.v != null).length, out = el('div', null);
      if (!seen) out.append(note('모두 ' + MASK_NOTE()));
      out.append(C.figure({ csv: label, file: ({ '기기': 'devices', '여는 방법': 'standalone', '앱': 'by-app', '쓴 앱 수': 'cross-app-count' })[label] || 'chart', period: period,  svg: C.barsH(rr, { label: label + ' 가로 막대 그래프. 항목 ' + rr.length + '개, 가려진 항목 ' + (rr.length - seen) + '개' }), legend: [['f1', '사람 수'], ['mask', C.MASK + '이라 가림']], table: { head: [label, '사람 수'], rows: list.map(x => [name(x.k), C.pick(x.users, 'n') == null ? null : C.fmtN(C.pick(x.users, 'n'))]) } }));
      return out;
    };
    const donutOf = (list, name, label, cls, period) => {
      if (!list.length) return nothing('이 기간에는 기록이 없어요.');
      const parts = list.map((x, i) => ({ label: name(x.k), v: C.pick(x.users, 'n'), cls: cls ? cls(x, i) : String(i + 1) }));
      const seen = parts.filter(x => x.v != null).length, out = el('div', null);
      if (!seen) out.append(note('모두 ' + MASK_NOTE()));
      out.append(C.figure({ csv: label, file: ({ '기기': 'devices', '여는 방법': 'standalone', '앱': 'by-app', '쓴 앱 수': 'cross-app-count' })[label] || 'chart', period: period,  svg: C.donut(parts, { label: label + ' 도넛 그래프. 항목 ' + parts.length + '개, 가려진 항목 ' + (parts.length - seen) + '개' + parts.filter(x => x.v != null).map(x => '. ' + x.label + ' ' + C.fmtN(x.v) + '명').join('') }), table: { head: [label, '사람 수'], rows: list.map(x => [name(x.k), C.pick(x.users, 'n') == null ? null : C.fmtN(C.pick(x.users, 'n'))]) } }));
      return out;
    };
    const months = [];
    { const t = new Date(Date.now() + 9 * 36e5); for (let i = 0; i < 13; i++) { const d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - i, 1)); const v = d.toISOString().slice(0, 10); months.push([i === 0 ? '' : v, d.getUTCFullYear() + '년 ' + (d.getUTCMonth() + 1) + '월']); } }
    return [
      segCard(tk),
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
          const per = (d.month || '').slice(0, 7) + ' (한 달)';
          out.append(donutOf(b.map(x => ({ k: x.apps, users: x.users })), k => '앱 ' + k + '개 쓴 사람', '쓴 앱 수', x => ({ 1: 'q2', 2: 'q4', 3: 'q5' })[x.k] || 'q3', per));
          out.append(UI.withInfo(el('p', { class: 'label' }, '앱별 사용한 사람'), '여러 앱을 쓴 사람은 각 앱에 한 번씩 들어가요.', { label: '앱별 사용한 사람 도움말' }));
          out.append(barsOf(by.map(x => ({ k: x.app, users: x.users })), k => appName(k), '앱', per));
          return out;
        }, tk)
    ];
  }

  const research = tk => Research.build(tk, () => tk === S.seq, S.app);
  const BUILD = { glance, feature, flow, back, time, device, research };

  function panel() {
    const tk = ++S.seq;
    if (daysSel) daysSel.hidden = S.tab === 'research';   // 연구 탭은 자기 기간을 쓴다
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

  // 오늘 화면 이상 신호 링크(#/usage?tab=time&app=didako)를 읽는다. 허용된 값만 쓰고 주소는 깨끗이 되돌린다
  function fromHash() {
    const m = /^#\/usage\?(.*)$/.exec(location.hash);
    if (!m) return;
    const q = new URLSearchParams(m[1]), t = q.get('tab'), a = q.get('app');
    if (TABS.some(x => x[0] === t)) S.tab = t;
    if (a !== null && APPS.some(x => x[0] === a)) S.app = a;
    try { history.replaceState(null, '', location.pathname + location.search + '#/usage'); } catch (e) { /* 주소만 못 지운다 */ }
  }

  function render() {
    fromHash();
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
    daysSel = select('기간', [[7, '최근 7일'], [30, '최근 30일'], [90, '최근 90일'], [365, '최근 365일']], S.days, v => { S.days = Number(v); panel(); });
    const ctl = el('div', { class: 'us-ctl' },
      select('앱', APPS, S.app, v => { S.app = v; panel(); }),
      daysSel,
      el('button', { class: 'btn small ghost', type: 'button', onclick: () => { cache.clear(); Research.refresh(); panel(); } }, '다시 불러오기'));
    const sec = el('section', null, UI.withInfo(el('h1', null, '이용 통계'), '앱 전체 합계만 보여요. 사람이나 교회별로 나누지 않아요.'),
      banner(), ctl, tabs, panelEl);
    panel();
    return sec;
  }

  window.Views = Object.assign(window.Views || {}, { stats: { render } });
})();
