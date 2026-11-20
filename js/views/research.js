/* 이용 통계 '연구' 탭(서버 041). 앱 전체 합계만 다룬다(사람·교회 단위 값이 없다). 연구용 내보내기는 가리지 않는다: 작은 숫자(0~4)도 그대로 들어 있다.
   네 카드: 연구용 내보내기 · 코드북 · 지표 정의 · 수집 변경 기록. 서버 글은 모두 textContent로만 넣는다. 서버 041이 없으면 카드마다 한 줄 안내만 보인다. */
(function () {
  const { el } = UI;
  const APPS = [['', '전체'], ['koide', '코이데'], ['didako', '디다코'], ['telio', '텔리오']];
  const APP_NAME = { koide: '코이데', didako: '디다코', telio: '텔리오' };
  const KIND = { screen: '화면', action: '행동', error: '오류' };
  const LOG_KIND = { start: '보내기 시작', stop: '보내기 멈춤', rename: '이름 바꿈', unit: '숫자 뜻 바뀜', sender: '보내는 쪽 바뀜', metric: '지표 정의 바뀜', note: '메모' };
  const UNIT = { sec: '초' };
  const AREA = { note: '노트', community: '공동체', church: '교회' };
  const TABLES = [
    ['activity', '활동한 사람·사건 수·새로 온 사람(날·주·달)'], ['core', '핵심 행동을 한 사람(영역·역할별)'],
    ['retention_month', '처음 온 달별 다시 온 비율'], ['retention_week', '처음 온 주별 다시 온 비율'],
    ['features', '기능별 쓴 사람'], ['funnel', '단계별 흐름(단계 고르기)'], ['feature_return', '기능과 다시 오기'],
    ['segments_device', '묶음 비교: 기기'], ['segments_standalone', '묶음 비교: 홈 화면 앱'], ['segments_ver', '묶음 비교: 앱 판'],
    ['frequency', '사용 빈도 분포'], ['stickiness', '고착도(달별)']
  ];
  const GRAIN_TABLES = ['activity', 'core'];
  const PRESETS = [[30, '최근 30일'], [90, '최근 90일'], [180, '최근 180일'], [430, '최근 430일(최대)'], ['', '직접 고르기']];
  const MAX_DAYS = 430;
  const WARN = '사람·교회 단위 값은 없어요. 작은 숫자(0~4)도 그대로 들어 있어요. 발표하기 전에 표본 크기를 확인하세요.';
  const kst = ms => new Date(ms + 9 * 36e5).toISOString().slice(0, 10);
  const todayS = () => kst(Date.now());
  const daysAgo = n => kst(Date.now() - n * 864e5);
  const R = { table: 'activity', app: '', preset: 90, from: '', to: '', grain: 'week', steps: ['', '', '', ''], book: null, bookAt: 0, q: '', fApp: '', fKind: '', fCore: '', lf: { day: '', app: '', ev: '', kind: 'note', note: '' }, seq: 0 };

  // 서버 041 함수가 아직 없으면 카드마다 차분한 안내를 보인다(오류 빨간 글이 아니다)
  const wrap41 = p => p.catch(e => { throw e && e.code === 'sql' ? { code: 'sql41', message: '서버 041을 넣으면 보여요.' } : e; });
  function book(force) {
    if (!force && R.book && Date.now() - R.bookAt < 60000) return R.book;
    const p = wrap41(api.usage.codebook());
    R.book = p; R.bookAt = Date.now();
    p.catch(() => { if (R.book === p) R.book = null; });
    return p;
  }
  const shell = (title, help, ...kids) => el('div', { class: 'card us-card' }, el('div', { class: 'us-hd' }, UI.withInfo(el('h2', null, title), help, { label: title + ' 도움말' })), ...kids);
  const errLine = e => e && e.code === 'sql41' ? el('p', { class: 'hint' }, e.message) : el('p', { class: 'aa-err' }, (e && e.message) || '불러오지 못했어요.');
  const sel = (label, opts, val, on) => {
    const s = el('select', { class: 'field', 'aria-label': label, onchange: () => on(s.value) }, ...opts.map(([v, t]) => el('option', { value: v, selected: String(v) === String(val) ? true : null }, t)));
    return s;
  };
  const field = (label, ctl) => el('label', null, label, ctl);
  function tbl(head, rows, numCols) {
    const nc = numCols || [];
    return el('div', { class: 'us-tblw' }, el('table', { class: 'st-tbl rs-tbl' + (head.length >= 8 ? ' wide' : head.length >= 4 ? ' mid' : '') },
      el('thead', null, el('tr', null, ...head.map((h, i) => el('th', { class: nc.includes(i) ? 'num' : null }, h)))),
      el('tbody', null, ...rows.map(r => el('tr', null, ...r.map((c, i) => el('td', { class: nc.includes(i) ? 'num' : null }, c == null || c === '' ? '-' : String(c))))))));
  }
  const ym = d => d ? String(d).slice(0, 7) : null;
  const fmtCell = v => v == null ? '' : typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v);
  const today = () => todayS();

  // ---- 1. 연구용 내보내기 ----
  function exportCard(bk) {
    const st = { data: null, args: null };
    const out = el('div', null);
    const stepBox = el('div', null);
    const note = el('p', { class: 'hint' });
    const body = el('div', null);
    const reset = () => { st.data = null; out.replaceChildren(); };
    const setRange = () => { if (R.preset) { R.to = today(); R.from = daysAgo(R.preset - 1); } };
    if (!R.from) { R.preset = 90; setRange(); }
    const fromIn = el('input', { class: 'field', type: 'date', 'aria-label': '시작 날짜', max: today(), value: R.from, onchange: () => { R.from = fromIn.value; R.preset = ''; presetSel.value = ''; reset(); } });
    const toIn = el('input', { class: 'field', type: 'date', 'aria-label': '끝 날짜', max: today(), value: R.to, onchange: () => { R.to = toIn.value; R.preset = ''; presetSel.value = ''; reset(); } });
    const presetSel = sel('기간 고르기', PRESETS, R.preset, v => {
      R.preset = v === '' ? '' : Number(v); setRange(); fromIn.value = R.from; toIn.value = R.to; reset();
    });
    const grainSel = sel('묶는 단위', [['day', '하루'], ['week', '한 주'], ['month', '한 달']], R.grain, v => { R.grain = v; reset(); });
    const evs = () => (bk.events || []).filter(e => e.app === (R.app || 'koide') && e.kind !== 'error');
    function drawSteps() {
      if (R.table !== 'funnel') { stepBox.replaceChildren(); return; }
      const items = evs();
      const sels = R.steps.map((v, i) => {
        const s = el('select', { class: 'field', 'aria-label': (i + 1) + '단계', onchange: () => { R.steps[i] = s.value; reset(); } },
          el('option', { value: '' }, i < 2 ? '(고르세요)' : '(없음)'), ...items.map(it => el('option', { value: it.ev, selected: it.ev === v ? true : null }, it.label + ' (' + it.ev + ')')));
        return el('div', { class: 'us-pick' }, el('span', { class: 'hint' }, (i + 1) + '단계'), s);
      });
      stepBox.replaceChildren(
        el('p', { class: 'hint' }, (APP_NAME[R.app || 'koide']) + '의 이름에서 2~8개를 순서대로 골라 주세요.' + (R.app ? '' : ' 앱을 고르지 않아 코이데로 봐요.') + ' 이 표는 날짜 범위가 아니라 첫 단계 뒤 며칠 안인지(기간 일수, 1~90일)를 써요.'),
        ...sels,
        R.steps.length < 8 ? el('button', { class: 'btn small ghost', type: 'button', onclick: () => { R.steps.push(''); drawSteps(); } }, '단계 더하기') : null);
    }
    function sync() {
      const g = GRAIN_TABLES.includes(R.table);
      grainSel.disabled = !g;
      note.textContent = g ? '' : '이 표는 묶는 단위를 쓰지 않아요(표마다 정해진 단위예요).';
      drawSteps();
    }
    const tableSel = sel('표 고르기', TABLES.map(([k, t]) => [k, k + ' — ' + t]), R.table, v => { R.table = v; sync(); reset(); });
    const appSel = sel('앱', APPS, R.app, v => { R.app = v; R.steps = R.steps.map(() => ''); drawSteps(); reset(); });
    function args() {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(R.from) || !/^\d{4}-\d{2}-\d{2}$/.test(R.to)) return '날짜를 골라 주세요.';
      if (R.from > R.to) return '시작 날짜가 끝 날짜보다 늦어요.';
      if (R.to > today()) return '끝 날짜는 오늘까지 고를 수 있어요.';
      if ((Date.parse(R.to) - Date.parse(R.from)) / 864e5 > MAX_DAYS - 1) return '기간은 최대 ' + MAX_DAYS + '일까지예요.';
      const a = { table: R.table, app: R.app, from: R.from, to: R.to, grain: R.grain };
      if (R.table === 'funnel') {
        const s = R.steps.filter(Boolean);
        if (s.length < 2) return '단계를 두 개 이상 골라 주세요.';
        if (new Set(s).size !== s.length) return '같은 단계를 두 번 고를 수 없어요.';
        a.app = R.app || 'koide'; a.steps = s;
      }
      return a;
    }
    function metaLines(d) {
      const m = d.meta || {};
      const L = ['코이노비아 이용 통계 · 연구용(앱 전체 합계, 가림 없음)', '표: ' + (m.table || R.table), '앱: ' + (m.app ? APP_NAME[m.app] || m.app : '전체'), '기간: ' + (m.from || '') + ' ~ ' + (m.to || '') + ' (한국 시간)'];
      if (m.grain) L.push('묶는 단위: ' + { day: '하루', week: '한 주', month: '한 달' }[m.grain]);
      L.push('내보낸 날: ' + (m.exported_on || today()), '지표 정의 판: ' + (m.version || ''), '주의: ' + (m.note || '사람·교회 단위 값 없음. 작은 숫자(0~4)도 그대로 들어 있습니다'));
      Object.keys(m).filter(k => !['version', 'table', 'app', 'from', 'to', 'grain', 'exported_on', 'note'].includes(k)).forEach(k => L.push(k + ': ' + fmtCell(m[k])));
      (d.columns || []).forEach(c => L.push('열 ' + c.key + ' = ' + c.label + (c.type ? ' [' + c.type + ']' : '') + (c.desc ? ' : ' + c.desc : '') + (c.def ? ' (지표: ' + c.def + ')' : '')));
      return L;
    }
    function draw(d) {
      const cols = d.columns || [], rows = d.rows || [], m = d.meta || {};
      const num = cols.map((c, i) => ['people', 'count', 'number', 'ratio'].includes(c.type) ? i : -1).filter(i => i >= 0);
      const parts = [];
      parts.push(el('p', { class: 'hint' }, '실제 기간 ' + (m.from || '') + ' ~ ' + (m.to || '') + (m.grain ? ' · 단위 ' + { day: '하루', week: '한 주', month: '한 달' }[m.grain] : '') + ' · 지표 정의 판 ' + (m.version || '') + ' · 전체 ' + rows.length + '줄'));
      if (!rows.length) parts.push(el('p', { class: 'msg us-empty' }, '이 조건에는 줄이 없어요.'));
      else parts.push(tbl(cols.map(c => c.label), rows.slice(0, 10).map(r => r.map(fmtCell)), num),
        rows.length > 10 ? el('p', { class: 'hint' }, '미리보기는 처음 10줄이에요. CSV에는 전체가 들어 있어요.') : null);
      parts.push(el('div', { class: 'rs-act' }, el('button', { class: 'btn small', type: 'button', onclick: () => {
        const ym2 = s => String(s || '').replace(/-/g, '');
        Csv.download('koinobia-research-' + R.table + '-' + ym2(m.from) + '_' + ym2(m.to) + (m.grain ? '-' + m.grain : ''),
          metaLines(d), cols.map(c => c.key), rows.map(r => r.map(fmtCell)));
      } }, 'CSV 내려받기(연구용)')));
      out.replaceChildren(...parts);
    }
    const go = el('button', { class: 'btn small', type: 'button', onclick: () => {
      const a = args();
      if (typeof a === 'string') { out.replaceChildren(el('p', { class: 'aa-err' }, a)); return; }
      const tk = ++R.seq;
      out.replaceChildren(el('p', { class: 'loading' }, '불러오는 중…'));
      go.disabled = true;
      wrap41(api.usage.research(a)).then(d => { if (tk === R.seq) { st.data = d; draw(d); } }, e => { if (tk === R.seq) out.replaceChildren(errLine(e)); }).finally(() => { go.disabled = false; });
    } }, '미리보기');
    sync();
    body.append(
      el('div', { class: 'rs-grid' }, field('표', tableSel), field('앱', appSel), field('기간', presetSel), field('시작', fromIn), field('끝', toIn), field('묶는 단위', grainSel)),
      note, stepBox,
      el('div', { class: 'rs-warn' }, el('p', null, WARN)),
      el('div', { class: 'rs-act' }, go), out);
    return shell('연구용 내보내기',
      ['표를 고르면 앱 전체 합계가 표 모양으로 나와요. 비율에는 분자·분모(사람 수)가 함께 들어 있어요.', 'CSV 맨 위의 # 줄에 표·앱·기간·지표 정의 판과 열 설명이 들어가요. pandas는 comment="#", R은 comment.char="#"로 읽어요.'], body);
  }

  // ---- 2. 코드북 ----
  function codebookCard(bk) {
    const list = el('div', null), count = el('p', { class: 'hint' });
    const events = bk.events || [];
    const coreText = e => e.core ? (AREA[e.core.area] || e.core.area) + ' · ' + e.core.role : '';
    function pass(e) {
      if (R.fApp && e.app !== R.fApp) return false;
      if (R.fKind && e.kind !== R.fKind) return false;
      if (R.fCore === 'core' && !e.core) return false;
      if (R.fCore === 'none' && e.core) return false;
      const q = R.q.trim().toLowerCase();
      return !q || [e.ev, e.label, e.trigger_note].some(x => String(x || '').toLowerCase().includes(q));
    }
    function draw() {
      const rows = events.filter(pass);
      count.textContent = rows.length + '개 / 전체 ' + events.length + '개';
      const apps = APPS.slice(1).map(a => a[0]).filter(a => rows.some(e => e.app === a));
      if (!rows.length) { list.replaceChildren(el('p', { class: 'msg us-empty' }, '맞는 이름이 없어요.')); return; }
      list.replaceChildren(...apps.map((a, i) => {
        const rs = rows.filter(e => e.app === a);
        return el('details', { class: 'rs-det', open: i === 0 || apps.length === 1 ? true : null },
          el('summary', null, APP_NAME[a] + ' (' + rs.length + '개)'),
          tbl(['이름', '코드', '종류', '숫자 뜻', '핵심 행동', '무엇이 일으키나', '처음 본 날', '마지막으로 본 날', '본 날 수'],
            rs.map(e => [e.label, e.ev, KIND[e.kind] || e.kind, e.n_unit ? (UNIT[e.n_unit] || e.n_unit) : '', coreText(e), e.trigger_note || '미기재',
              e.first_seen ? (e.first_precision === 'month' ? ym(e.first_seen) : e.first_seen) : '없음', e.last_seen ? (e.last_precision === 'month' ? ym(e.last_seen) : e.last_seen) : '없음',
              e.seen_days && e.seen_days.n != null ? e.seen_days.n : 0]), [8]));
      }));
    }
    const search = el('input', { class: 'field', type: 'search', 'aria-label': '이름 찾기', placeholder: '이름·코드 찾기', value: R.q, oninput: () => { R.q = search.value; draw(); } });
    const csv = el('button', { class: 'btn small ghost', type: 'button', onclick: () => {
      Csv.download('koinobia-codebook-' + String(today()).replace(/-/g, ''),
        ['코이노비아 이용 통계 · 코드북(연구용, 전체 이름)', '지표 정의 판: ' + (bk.version || ''), '내보낸 날: ' + today(),
          '주의: 처음·마지막으로 본 날은 서버에 처음·마지막으로 들어온 날이고, 앱이 보내기 시작한 날이 아닙니다. precision이 month이면 그 달의 1일로 적은 값입니다.',
          '열 core_area·core_role = 핵심 행동 표의 영역·역할(핵심 행동이 아니면 비움). n_unit = 사건의 숫자(n) 뜻(sec은 초).'],
        ['app', 'ev', 'label', 'kind', 'n_unit', 'core_area', 'core_role', 'trigger_note', 'first_seen', 'first_precision', 'last_seen', 'last_precision', 'seen_days'],
        events.map(e => [e.app, e.ev, e.label, e.kind, e.n_unit, e.core && e.core.area, e.core && e.core.role, e.trigger_note, e.first_seen, e.first_precision, e.last_seen, e.last_precision, e.seen_days && e.seen_days.n]));
    } }, '코드북 CSV 내려받기');
    draw();
    return shell('코드북',
      ['앱이 보내는 모든 이름(아직 안 쓰인 것도)의 뜻과 핵심 행동 표시예요.', '처음·마지막으로 본 날은 서버에 처음·마지막으로 들어온 날이에요. 앱이 보내기 시작한 날이 아니에요. 달만 남은 오래된 기록은 YYYY-MM으로 보여요.'],
      el('div', { class: 'rs-grid' }, field('찾기', search), field('앱', sel('앱', APPS, R.fApp, v => { R.fApp = v; draw(); })),
        field('종류', sel('종류', [['', '전체'], ['screen', '화면'], ['action', '행동'], ['error', '오류']], R.fKind, v => { R.fKind = v; draw(); })),
        field('핵심 행동', sel('핵심 행동', [['', '전체'], ['core', '핵심 행동만'], ['none', '핵심 행동 아닌 것']], R.fCore, v => { R.fCore = v; draw(); }))),
      count, list, el('div', { class: 'rs-act' }, csv));
  }

  // ---- 3. 지표 정의 ----
  function metricsCard(bk) {
    const ms = bk.metrics || [], core = bk.core || [];
    const csv = el('button', { class: 'btn small ghost', type: 'button', onclick: () => {
      Csv.download('koinobia-metrics-' + String(bk.version || 'm').replace(/[^A-Za-z0-9_-]/g, '') + '-' + String(today()).replace(/-/g, ''),
        ['코이노비아 이용 통계 · 지표 정의(연구용)', '지표 정의 판: ' + (bk.version || ''), '내보낸 날: ' + today(), '논문에는 지표 이름과 판 번호를 같이 적으세요.'],
        ['key', 'ver', 'name', 'def', 'since'], ms.map(m => [m.key, m.ver, m.name, m.def, m.since]));
    } }, '지표 정의 CSV 내려받기');
    return shell('지표 정의',
      ['논문에는 지표 이름과 판 번호를 같이 적으세요. 정의가 바뀌면 새 판이 생기고, 옛 판은 지워지지 않아요.', '핵심 행동 표는 "핵심 행동을 한 사람"을 세는 기준이에요.'],
      el('p', { class: 'hint' }, '현재 판 ' + (bk.version || '')),
      ms.length ? tbl(['지표', '판', '정의', '시작일'], ms.map(m => [m.name, m.ver, m.def, m.since])) : el('p', { class: 'msg us-empty' }, '지표 정의가 없어요.'),
      el('h3', { class: 'us-sub' }, '핵심 행동 표'),
      core.length ? tbl(['앱', '영역', '코드', '역할', '이름'], core.map(c => [APP_NAME[c.app] || c.app, AREA[c.area] || c.area, c.ev, c.role, c.label])) : el('p', { class: 'msg us-empty' }, '핵심 행동 표가 비었어요.'),
      el('div', { class: 'rs-act' }, csv));
  }

  // ---- 4. 수집 변경 기록 ----
  function logCard(bk) {
    let log = bk.log || [];
    const L = R.lf;
    if (!L.day) L.day = today();
    const listBox = el('div', null), formBox = el('div', null);
    function drawList() {
      listBox.replaceChildren(log.length ? tbl(['날짜', '앱', '이름', '종류', '내용'], log.map(l => [l.day, l.app ? APP_NAME[l.app] || l.app : '전체', l.ev || '', LOG_KIND[l.kind] || l.kind, l.note])) : el('p', { class: 'msg us-empty' }, '아직 기록이 없어요.'));
    }
    const evOpts = () => {
      const seen = new Set(), out = [['', '(없음)']];
      (bk.events || []).forEach(e => { if ((!L.app || e.app === L.app) && !seen.has(e.ev)) { seen.add(e.ev); out.push([e.ev, e.label + ' (' + e.ev + ')']); } });
      return out;
    };
    function drawForm(confirmMsg) {
      const msg = el('p', { class: 'aa-err' });
      const day = el('input', { class: 'field', type: 'date', 'aria-label': '날짜', max: today(), value: L.day, onchange: () => { L.day = day.value; } });
      const app = sel('앱', [['', '앱 전체'], ...APPS.slice(1)], L.app, v => { L.app = v; if (!evOpts().some(o => o[0] === L.ev)) L.ev = ''; drawForm(); });
      const ev = sel('이름', evOpts(), L.ev, v => { L.ev = v; });
      const kind = sel('종류', Object.entries(LOG_KIND), L.kind, v => { L.kind = v; });
      const note = el('textarea', { class: 'field', 'aria-label': '내용', maxlength: 200, rows: 3, oninput: () => { L.note = note.value; cnt.textContent = note.value.length + ' / 200'; } });
      note.value = L.note;
      const cnt = el('span', { class: 'hint' }, L.note.length + ' / 200');
      if (confirmMsg) {
        formBox.replaceChildren(el('div', { class: 'rs-warn' }, el('p', null, confirmMsg), el('p', null, '기록은 지울 수 없어요. 이 내용으로 남길까요?')),
          el('div', { class: 'rs-act' },
            el('button', { class: 'btn small', type: 'button', onclick: ev2 => {
              const b = ev2.currentTarget; b.disabled = true;
              wrap41(api.usage.collectLogAdd({ day: L.day, app: L.app, ev: L.ev, kind: L.kind, note: L.note.trim() })).then(r => {
                log = r || log; bk.log = log; L.note = ''; L.ev = ''; drawList(); drawForm(); UI.toast('기록을 남겼어요.');
              }, e => { drawForm(); const m = formBox.querySelector('.aa-err'); if (m) m.textContent = (e && e.message) || '남기지 못했어요.'; });
            } }, '남기기'),
            el('button', { class: 'btn small ghost', type: 'button', onclick: () => drawForm() }, '돌아가기')));
        return;
      }
      formBox.replaceChildren(el('h3', { class: 'us-sub' }, '한 줄 더하기'),
        el('div', { class: 'rs-form' },
          el('div', { class: 'rs-grid' }, field('날짜', day), field('앱', app), field('이름(선택)', ev), field('종류', kind)),
          field('내용(1~200자)', note), cnt, msg,
          el('div', { class: 'rs-act' }, el('button', { class: 'btn small', type: 'button', onclick: () => {
            const t = L.note.trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(L.day) || L.day > today()) { msg.textContent = '날짜는 오늘까지 고를 수 있어요.'; return; }
            if (t.length < 1 || t.length > 200) { msg.textContent = '내용은 1~200자로 적어 주세요.'; return; }
            drawForm(L.day + ' · ' + (L.app ? APP_NAME[L.app] : '앱 전체') + (L.ev ? ' · ' + L.ev : '') + ' · ' + LOG_KIND[L.kind] + ' · ' + t);
          } }, '기록 더하기'))));
    }
    drawList(); drawForm();
    return shell('수집 변경 기록',
      ['앱이 이름을 새로 보내기 시작했거나 멈추거나, 뜻이 바뀐 날을 남겨요. 논문에서 "이 날 이전 수치는 비교하기 어렵다"를 설명할 때 써요.', '한 번 남기면 지울 수 없어요. 내용에는 이름이나 기도제목 같은 개인 글을 적지 마세요.'],
      listBox, formBox);
  }

  // ---- 탭 본문 ----
  function build(tk, current, topApp) {
    if (topApp !== R.topApp) { R.topApp = topApp; R.app = topApp || ''; }
    const box = el('div', null, shell('연구 탭', null, el('p', { class: 'loading' }, '불러오는 중…')));
    book().then(bk => {
      if (!current()) return;
      box.replaceChildren(exportCard(bk), codebookCard(bk), metricsCard(bk), logCard(bk));
    }, e => {
      if (!current()) return;
      const M = ['연구용 내보내기', '코드북', '지표 정의', '수집 변경 기록'];
      box.replaceChildren(...M.map(t => shell(t, null, errLine(e))));
    });
    return [box];
  }
  function refresh() { R.book = null; }
  window.Research = { build, refresh };
})();
