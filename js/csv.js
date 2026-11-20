/* 표를 CSV 파일로 내려받는다(운영용). 엑셀에서 한글이 깨지지 않게 UTF-8 BOM을 앞에 붙이고, 줄바꿈은 CRLF로 쓴다.
   수식 주입 방지: 글자 칸이 = + - @ 탭 줄바꿈으로 시작하면 앞에 '를 붙인다(숫자만 든 칸은 그대로).
   머리말은 # 줄이다(pandas comment='#', R comment.char='#'). 파일은 Blob → 임시 주소 → 숨긴 a[download] 클릭으로 받고, 10초 뒤 주소를 거둔다. style 속성·외부 요청 없음. */
(function () {
  const NUM = /^-?\d+(\.\d+)?$/;
  function cell(v) {
    if (v == null) return '';
    let s = String(v);
    if (typeof v !== 'number' && !NUM.test(s) && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  // 머리말 줄(글자) 안의 줄바꿈은 공백으로: # 줄이 여러 줄로 깨지지 않게
  const meta = s => '# ' + String(s == null ? '' : s).replace(/[\r\n]+/g, ' ');
  function text(metaLines, head, rows) {
    return [].concat((metaLines || []).map(meta), [head.map(cell).join(',')], rows.map(r => r.map(cell).join(','))).join('\r\n') + '\r\n';
  }
  // 파일 이름에 못 쓰는 글자를 '-'로
  const safe = s => String(s || 'export').trim().replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'export';
  function download(name, metaLines, head, rows) {
    const blob = new Blob(['﻿' + text(metaLines, head, rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = safe(name) + '.csv'; a.hidden = true;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  window.Csv = { download, text, cell, safe };
})();
