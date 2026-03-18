/**
 * doc-gen.js
 * HTML形式でWordファイル(.doc)を生成してダウンロードする
 * 外部ライブラリ不要・ブラウザ標準機能のみ使用
 */

function getCurrentDateJPDoc() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  if (y >= 2019) return `令和${y - 2018}年${m}月${d}日`;
  if (y >= 1989) return `平成${y - 1988}年${m}月${d}日`;
  return `${y}年${m}月${d}日`;
}

function escWord(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function downloadAsWord(htmlContent, filename) {
  const fullHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8">
      <meta name="ProgId" content="Word.Document">
      <meta name="Generator" content="Microsoft Word 15">
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: A4;
          margin: 18mm 15mm 18mm 20mm;
          mso-page-orientation: portrait;
        }
        body {
          font-family: "MS Gothic", "MS明朝", "游明朝", serif;
          font-size: 10.5pt;
          line-height: 1.6;
          color: #000;
        }
        h1 {
          font-size: 18pt;
          font-weight: bold;
          text-align: center;
          letter-spacing: 0.5em;
          margin: 0 0 4pt 0;
          border: none;
        }
        h2 {
          font-size: 11pt;
          font-weight: bold;
          border-bottom: 2px solid #2d6a4f;
          padding-bottom: 3pt;
          margin: 10pt 0 5pt 0;
          color: #2d6a4f;
        }
        .date-right {
          text-align: right;
          font-size: 9pt;
          color: #555;
          margin-bottom: 8pt;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8pt;
          font-size: 10pt;
        }
        th {
          background-color: #d8f3dc;
          font-weight: bold;
          padding: 5pt 8pt;
          border: 1pt solid #aaa;
          text-align: left;
          white-space: nowrap;
          vertical-align: top;
          width: 18%;
        }
        td {
          padding: 5pt 8pt;
          border: 1pt solid #aaa;
          vertical-align: top;
        }
        .history-table th { width: 8%; text-align: center; }
        .history-label td {
          text-align: center;
          font-weight: bold;
          background-color: #f0fdf4;
          color: #2d6a4f;
        }
        .text-right { text-align: right; }
        .text-box {
          border: 1pt solid #aaa;
          padding: 8pt;
          min-height: 40pt;
          width: 100%;
          box-sizing: border-box;
          font-size: 10pt;
          line-height: 1.8;
        }
        .company-header {
          font-size: 11pt;
          font-weight: bold;
          background-color: #f0fdf4;
          border-left: 4pt solid #2d6a4f;
          padding: 5pt 8pt;
          margin: 8pt 0 3pt 0;
          color: #1b4332;
        }
        .section-label {
          font-weight: bold;
          color: #2d6a4f;
          font-size: 9.5pt;
          margin: 5pt 0 2pt 0;
        }
        .photo-area {
          float: right;
          width: 90pt;
          height: 120pt;
          border: 1pt solid #aaa;
          text-align: center;
          vertical-align: middle;
          padding: 5pt;
          margin-left: 10pt;
          margin-bottom: 5pt;
          font-size: 8pt;
          color: #888;
        }
        .clearfix::after { content: ""; display: table; clear: both; }
        p { margin: 3pt 0; }
        .ijo { text-align: right; margin-top: 10pt; font-size: 10pt; }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', fullHtml], {
    type: 'application/msword;charset=utf-8'
  });

  // FileSaver.js があれば使用、なければネイティブ
  if (typeof saveAs !== 'undefined') {
    saveAs(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

/* ============================================================
   履歴書生成
   ============================================================ */
async function generateResumeDocx(resumeData, photoDataUrl) {
  const r = resumeData || {};
  const birthInfo = r.birth_date
    ? `${escWord(r.birth_date)}${r.age ? `（${escWord(r.age)}歳）` : ''}`
    : '';

  const photoCell = photoDataUrl
    ? `<img src="${photoDataUrl}" style="width:88pt;height:118pt;object-fit:cover;" alt="証明写真">`
    : '<div style="width:88pt;height:118pt;border:1pt solid #aaa;display:flex;align-items:center;justify-content:center;font-size:8pt;color:#aaa;text-align:center;">写真<br>貼付欄</div>';

  const eduRows = (r.education || []).map(e =>
    `<tr><td style="text-align:center;">${escWord(e.year)}</td><td style="text-align:center;">${escWord(e.month)}</td><td>${escWord(e.content)}</td></tr>`
  ).join('');

  const careerRows = (r.career || []).map(e =>
    `<tr><td style="text-align:center;">${escWord(e.year)}</td><td style="text-align:center;">${escWord(e.month)}</td><td>${escWord(e.content)}</td></tr>`
  ).join('');

  const qualRows = (r.qualifications || []).map(e =>
    `<tr><td style="text-align:center;">${escWord(e.year)}</td><td style="text-align:center;">${escWord(e.month)}</td><td>${escWord(e.content)}</td></tr>`
  ).join('');

  const motivationText = escWord(r.motivation || '').replace(/\n/g, '<br>');
  const selfPrText = escWord(r.self_pr || r.skills_hobbies || '').replace(/\n/g, '<br>');

  const html = `
    <h1>履　歴　書</h1>
    <p class="date-right">${getCurrentDateJPDoc()}現在</p>

    <div class="clearfix">
      <div class="photo-area">${photoCell}</div>
      <table>
        <tr><th>ふりがな</th><td colspan="3">${escWord(r.name_kana)}</td></tr>
        <tr><th>氏名</th><td colspan="3" style="font-size:14pt;font-weight:bold;">${escWord(r.name)}</td></tr>
        <tr><th>生年月日</th><td>${birthInfo}</td><th style="width:8%;">性別</th><td>${escWord(r.gender)}</td></tr>
        <tr><th>住所</th><td colspan="3">${escWord(r.address)}</td></tr>
        <tr><th>電話番号</th><td>${escWord(r.phone)}</td><th>メール</th><td>${escWord(r.email)}</td></tr>
      </table>
    </div>

    <h2>学歴・職歴</h2>
    <table class="history-table">
      <tr><th>年</th><th>月</th><th>内　　容</th></tr>
      <tr class="history-label"><td></td><td></td><td>学　歴</td></tr>
      ${eduRows || '<tr><td></td><td></td><td></td></tr>'}
      <tr class="history-label"><td></td><td></td><td>職　歴</td></tr>
      ${careerRows || '<tr><td></td><td></td><td></td></tr>'}
      <tr><td></td><td></td><td class="text-right">以上</td></tr>
    </table>

    ${(r.qualifications || []).length > 0 ? `
    <h2>免許・資格</h2>
    <table class="history-table">
      <tr><th>年</th><th>月</th><th>免許・資格名</th></tr>
      ${qualRows}
    </table>` : ''}

    ${r.motivation ? `
    <h2>志望動機</h2>
    <div class="text-box">${motivationText}</div>` : ''}

    ${selfPrText ? `
    <h2>自己PR・特技</h2>
    <div class="text-box">${selfPrText}</div>` : ''}

    <h2>本人希望欄</h2>
    <div class="text-box">${escWord(r.note || '貴社規定に従います。')}</div>
  `;

  // Blob を返す（app.js 側で downloadAsWord を呼ぶため、ここでは blob を返す）
  const blob = new Blob(['\ufeff', `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8"><style>
    @page{size:A4;margin:18mm 15mm 18mm 20mm;}
    body{font-family:"MS Gothic",serif;font-size:10.5pt;line-height:1.6;color:#000;}
    h1{font-size:18pt;font-weight:bold;text-align:center;letter-spacing:.5em;margin:0 0 4pt 0;}
    h2{font-size:11pt;font-weight:bold;border-bottom:2px solid #2d6a4f;padding-bottom:3pt;margin:10pt 0 5pt 0;color:#2d6a4f;}
    .date-right{text-align:right;font-size:9pt;color:#555;margin-bottom:8pt;}
    table{width:100%;border-collapse:collapse;margin-bottom:8pt;font-size:10pt;}
    th{background-color:#d8f3dc;font-weight:bold;padding:5pt 8pt;border:1pt solid #aaa;text-align:left;white-space:nowrap;vertical-align:top;width:18%;}
    td{padding:5pt 8pt;border:1pt solid #aaa;vertical-align:top;}
    .history-table th{width:8%;text-align:center;}
    .history-label td{text-align:center;font-weight:bold;background-color:#f0fdf4;color:#2d6a4f;}
    .text-right{text-align:right;}
    .text-box{border:1pt solid #aaa;padding:8pt;min-height:40pt;width:100%;box-sizing:border-box;font-size:10pt;line-height:1.8;}
    .clearfix::after{content:"";display:table;clear:both;}
    </style></head><body>${html}</body></html>
  `], { type: 'application/msword;charset=utf-8' });

  return blob;
}

/* ============================================================
   職務経歴書生成
   ============================================================ */
async function generateWorkHistoryDocx(workData) {
  const w = workData || {};
  const skills = w.skills || {};

  const experiencesHtml = (w.experiences || []).map((exp, i) => {
    const period = exp.period_start
      ? `${escWord(exp.period_start)}${exp.period_end ? ` ～ ${escWord(exp.period_end)}` : ''}`
      : '';
    const dutiesText = escWord(exp.duties || '').replace(/\n/g, '<br>');
    const achievementsText = escWord(exp.achievements || '').replace(/\n/g, '<br>');
    return `
      <div class="company-header">【${i + 1}】${escWord(exp.company_name)}　${period ? `（${period}）` : ''}</div>
      <table>
        ${exp.business_type ? `<tr><th>業種</th><td>${escWord(exp.business_type)}</td></tr>` : ''}
        ${exp.overview ? `<tr><th>事業概要</th><td>${escWord(exp.overview)}</td></tr>` : ''}
        ${exp.position ? `<tr><th>役職・職種</th><td>${escWord(exp.position)}</td></tr>` : ''}
      </table>
      ${exp.duties ? `<p class="section-label">【担当業務】</p><div class="text-box">${dutiesText}</div>` : ''}
      ${exp.achievements ? `<p class="section-label">【主な実績・成果】</p><div class="text-box">${achievementsText}</div>` : ''}
    `;
  }).join('');

  const summaryText = escWord(w.summary || '').replace(/\n/g, '<br>');
  const selfPrText = escWord(w.self_pr || '').replace(/\n/g, '<br>');

  const html = `
    <h1>職務経歴書</h1>
    <p class="date-right">${getCurrentDateJPDoc()}現在</p>

    <table>
      <tr><th style="width:15%;">氏名</th><td style="font-size:13pt;font-weight:bold;">${escWord(w.name)}</td></tr>
    </table>

    ${w.summary ? `<h2>■ 職務要約</h2><div class="text-box">${summaryText}</div>` : ''}

    ${(skills.experience || skills.qualifications || skills.pc_skills) ? `
    <h2>■ 活かせる経験・資格・スキル</h2>
    <table>
      ${skills.experience ? `<tr><th>活かせる経験</th><td>${escWord(skills.experience)}</td></tr>` : ''}
      ${skills.qualifications ? `<tr><th>保有資格</th><td>${escWord(skills.qualifications)}</td></tr>` : ''}
      ${skills.pc_skills ? `<tr><th>PCスキル</th><td>${escWord(skills.pc_skills)}</td></tr>` : ''}
    </table>` : ''}

    ${experiencesHtml ? `<h2>■ 職務経歴</h2>${experiencesHtml}` : ''}

    ${w.self_pr ? `<h2>■ 自己PR</h2><div class="text-box">${selfPrText}</div>` : ''}

    <p class="ijo">以上</p>
  `;

  const blob = new Blob(['\ufeff', `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8"><style>
    @page{size:A4;margin:18mm 15mm 18mm 20mm;}
    body{font-family:"MS Gothic",serif;font-size:10.5pt;line-height:1.6;color:#000;}
    h1{font-size:18pt;font-weight:bold;text-align:center;letter-spacing:.5em;margin:0 0 4pt 0;}
    h2{font-size:11pt;font-weight:bold;border-bottom:2px solid #2d6a4f;padding-bottom:3pt;margin:10pt 0 5pt 0;color:#2d6a4f;}
    .date-right{text-align:right;font-size:9pt;color:#555;margin-bottom:8pt;}
    table{width:100%;border-collapse:collapse;margin-bottom:8pt;font-size:10pt;}
    th{background-color:#d8f3dc;font-weight:bold;padding:5pt 8pt;border:1pt solid #aaa;text-align:left;white-space:nowrap;vertical-align:top;width:18%;}
    td{padding:5pt 8pt;border:1pt solid #aaa;vertical-align:top;}
    .text-box{border:1pt solid #aaa;padding:8pt;min-height:40pt;width:100%;box-sizing:border-box;font-size:10pt;line-height:1.8;}
    .company-header{font-size:11pt;font-weight:bold;background-color:#f0fdf4;border-left:4pt solid #2d6a4f;padding:5pt 8pt;margin:8pt 0 3pt 0;color:#1b4332;}
    .section-label{font-weight:bold;color:#2d6a4f;font-size:9.5pt;margin:5pt 0 2pt 0;}
    .ijo{text-align:right;margin-top:10pt;font-size:10pt;}
    </style></head><body>${html}</body></html>
  `], { type: 'application/msword;charset=utf-8' });

  return blob;
}
