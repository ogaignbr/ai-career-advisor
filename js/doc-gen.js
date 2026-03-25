/**
 * doc-gen.js
 * 履歴書: rirekisyo.xlsx テンプレートに ExcelJS でデータを流し込み xlsx 出力
 * 職務経歴書: Word HTML 形式で .doc 出力
 */

/* ============================================================
   共通ユーティリティ
   ============================================================ */
function getCurrentDateJPDoc() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  if (y >= 2019) return `令和${y - 2018}年${m}月${d}日`;
  if (y >= 1989) return `平成${y - 1988}年${m}月${d}日`;
  return `${y}年${m}月${d}日`;
}

function escW(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function nl2br(str) {
  return escW(str).replace(/\n/g, '<br>');
}

function makeWordBlob(bodyHtml, styles) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:w="urn:schemas-microsoft-com:office:word"
    xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<meta name="ProgId" content="Word.Document">
<!--[if gte mso 9]><xml><w:WordDocument>
  <w:View>Print</w:View><w:Zoom>100</w:Zoom>
</w:WordDocument></xml><![endif]-->
<style>
@page { size:A4 portrait; margin:13mm; }
body { font-family:"MS明朝","游明朝",serif; font-size:9.5pt; line-height:1.4; color:#000; }
${styles || ''}
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
  return new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
}

/* ============================================================
   履歴書生成
   rirekisyo.xlsx（厚労省 JIS規格 A4横 様式第1号）テンプレートに
   ExcelJS でデータを流し込み、xlsx ファイルとして出力する

   ルール:
   - テンプレートのセル結合・罫線・行高・列幅・印刷設定は一切変更しない
   - 結合セルへの書き込みは必ず左上セルに対して行う
   - フォントは ＭＳ Ｐゴシック + 指定サイズで明示設定する
   ============================================================ */

const FONT_NAME = 'ＭＳ Ｐゴシック';

const EDU_CELLS = [
  ['B28','C28','D28'],
  ['B30','C30','D30'],
  ['B32','C32','D32'],
  ['B34','C34','D34'],
];

const WORK_CELLS = [
  ['B37','C37','D37'],
  ['B39','C39','D39'],
  ['B40','C40','D40'],
  ['B42','C42','D42'],
];

const HIST_RIGHT_CELLS = [
  ['L4','M4','N4'],
  ['L6','M6','N6'],
  ['L8','M8','N8'],
  ['L9','M9','N9'],
  ['L10','M10','N10'],
  ['L12','M12','N12'],
  ['L14','M14','N14'],
];

const LICENSE_CELLS = [
  ['L18','M18','N18'],
  ['L22','M22','N22'],
  ['L25','M25','N25'],
  ['L27','M27','N27'],
  ['L29','M29','N29'],
];

function writeCell(ws, coord, value, fontSize) {
  if (value === null || value === undefined) return;
  const str = String(value);
  const cell = ws.getCell(coord);
  cell.value = str;
  cell.font = { name: FONT_NAME, size: fontSize };
}

async function generateResumeDocx(resumeData, photoDataUrl) {
  const r = resumeData || {};

  if (typeof ExcelJS === 'undefined') {
    throw new Error('ExcelJS が読み込まれていません。ページを再読み込みしてください。');
  }
  if (typeof RIREKISYO_TEMPLATE_B64 === 'undefined') {
    throw new Error('履歴書テンプレート (resume-template.js) が読み込まれていません。');
  }

  const raw = atob(RIREKISYO_TEMPLATE_B64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buf.buffer);

  const ws = workbook.getWorksheet('A4サイズ') || workbook.worksheets[0];
  if (!ws) throw new Error('テンプレートにワークシートが見つかりません。');

  // ─── 基本情報（フォントサイズ早見表に準拠） ────────────────
  writeCell(ws, 'E3',  getCurrentDateJPDoc() + '現在', 11);  // 日付: 11
  writeCell(ws, 'D5',  r.name_kana || '', 11);               // ふりがな: 11
  writeCell(ws, 'B7',  r.name || '', 28);                    // 氏名: 28

  const birth = r.birth_date || '';
  const age = r.age ? `（満${r.age}歳）` : '';
  if (birth) writeCell(ws, 'B10', `${birth}生　${age}`, 11); // 生年月日: 11

  if (r.gender) writeCell(ws, 'H11', r.gender, 11);          // 性別: 11

  if (r.postal_code) writeCell(ws, 'D13', `〒${r.postal_code}`, 11); // 郵便番号: 11
  writeCell(ws, 'B15', r.address || '', 16);                  // 住所: 16

  writeCell(ws, 'I12', r.phone || '', 21);                    // 電話番号: 21
  writeCell(ws, 'I13', r.email || '', 11);                    // E-mail: 11

  // ─── 連絡先（任意：値がある場合のみ上書き） ────────────────
  if (r.phone) writeCell(ws, 'I17', r.phone, 21);
  if (r.email) writeCell(ws, 'I19', r.email, 11);

  // ─── 顔写真 ───────────────────────────────────────────────
  if (photoDataUrl) {
    try {
      const imgId = workbook.addImage({
        base64: photoDataUrl.replace(/^data:image\/\w+;base64,/, ''),
        extension: 'jpeg',
      });
      ws.addImage(imgId, {
        tl: { col: 7, row: 4 },
        ext: { width: 91, height: 121 },
      });
    } catch (e) {
      console.warn('顔写真の埋め込みに失敗:', e);
    }
  }

  // ─── 学歴（フォントサイズ14） ─────────────────────────────
  writeCell(ws, 'D26', '学　　　歴', 14);

  const education = r.education || [];
  for (let i = 0; i < education.length && i < EDU_CELLS.length; i++) {
    const [yc, mc, dc] = EDU_CELLS[i];
    const e = education[i];
    writeCell(ws, yc, e.year ? String(e.year) : '', 14);
    writeCell(ws, mc, e.month ? String(e.month) : '', 14);
    writeCell(ws, dc, e.content || '', 14);
  }

  // ─── 職歴（フォントサイズ14） ─────────────────────────────
  writeCell(ws, 'D35', '職　　　歴', 14);

  const career = r.career || [];
  let careerIdx = 0;

  for (let i = 0; i < career.length && i < WORK_CELLS.length; i++) {
    const [yc, mc, dc] = WORK_CELLS[i];
    const e = career[i];
    writeCell(ws, yc, e.year ? String(e.year) : '', 14);
    writeCell(ws, mc, e.month ? String(e.month) : '', 14);
    writeCell(ws, dc, e.content || '', 14);
    careerIdx = i + 1;
  }

  // 左側に収まらない職歴は右側テーブルに続き
  if (career.length > WORK_CELLS.length) {
    const overflow = career.slice(WORK_CELLS.length);
    for (let i = 0; i < overflow.length && i < HIST_RIGHT_CELLS.length; i++) {
      const [yc, mc, dc] = HIST_RIGHT_CELLS[i];
      const e = overflow[i];
      writeCell(ws, yc, e.year ? String(e.year) : '', 14);
      writeCell(ws, mc, e.month ? String(e.month) : '', 14);
      writeCell(ws, dc, e.content || '', 14);
    }
  }

  writeCell(ws, 'D44', '以上', 14);

  // ─── 免許・資格（フォントサイズ14） ───────────────────────
  const quals = r.qualifications || [];
  for (let i = 0; i < quals.length && i < LICENSE_CELLS.length; i++) {
    const [yc, mc, dc] = LICENSE_CELLS[i];
    const q = quals[i];
    writeCell(ws, yc, q.year ? String(q.year) : '', 14);
    writeCell(ws, mc, q.month ? String(q.month) : '', 14);
    writeCell(ws, dc, q.content || '', 14);
  }
  if (quals.length < LICENSE_CELLS.length) {
    const [, , ijouCell] = LICENSE_CELLS[quals.length];
    writeCell(ws, ijouCell, '以上', 14);
  }

  // ─── 志望動機・特技・自己PR（フォントサイズ10） ────────────
  const motivParts = [];
  if (r.motivation) motivParts.push(r.motivation);
  if (r.skills_hobbies) motivParts.push(`【特技・趣味】\n${r.skills_hobbies}`);
  const motivText = motivParts.join('\n\n');
  if (motivText) writeCell(ws, 'L33', motivText, 10);

  // ─── 本人希望（フォントサイズ14） ─────────────────────────
  const noteText = r.note || '貴社の規定に従います。';
  writeCell(ws, 'L46', noteText, 14);

  // ─── xlsx Blob 生成 ───────────────────────────────────────
  const xlsxBuf = await workbook.xlsx.writeBuffer();
  return new Blob([xlsxBuf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/* ============================================================
   職務経歴書生成
   Word HTML 形式（■セクション形式）
   ============================================================ */
async function generateWorkHistoryDocx(workData) {
  const w = workData || {};
  const skills = w.skills || {};

  const experiencesHtml = (w.experiences || []).map((exp) => {
    const period = [exp.period_start, exp.period_end].filter(Boolean).join('　｜　');
    const duties = nl2br(exp.duties || '');
    const achievements = nl2br(exp.achievements || '');

    return `
      <table class="cv-table" style="margin-bottom:4pt;">
        <tr>
          <td colspan="2" class="company-name-row">
            ${escW(exp.company_name || '')}
            ${exp.business_type ? `<span class="biz-type">　事業内容：${escW(exp.business_type)}</span>` : ''}
          </td>
        </tr>
        <tr>
          <td class="cv-label" style="width:80pt;">期間</td>
          <td>${escW(period)}</td>
        </tr>
        <tr>
          <td class="cv-label">雇用形態</td>
          <td>${escW(exp.employment_type || '')}</td>
        </tr>
        ${exp.position ? `<tr><td class="cv-label">所属・役職</td><td>${escW(exp.position)}</td></tr>` : ''}
        ${exp.overview ? `<tr><td class="cv-label">概要</td><td>${nl2br(exp.overview)}</td></tr>` : ''}
      </table>
      ${duties ? `<p class="sub-label">【職務内容】</p><div class="cv-text-box">${duties}</div>` : ''}
      ${achievements ? `<p class="sub-label">【実績・工夫】</p><div class="cv-text-box">${achievements}</div>` : ''}
      <div style="height:6pt;"></div>
    `;
  }).join('');

  const skillsRows = [
    skills.experience ? `<tr><td class="cv-label" style="width:100pt;">活かせる経験</td><td>${nl2br(skills.experience)}</td></tr>` : '',
    skills.qualifications ? `<tr><td class="cv-label">保有資格</td><td>${nl2br(skills.qualifications)}</td></tr>` : '',
    skills.pc_skills ? `<tr><td class="cv-label">PCスキル</td><td>${nl2br(skills.pc_skills)}</td></tr>` : '',
  ].filter(Boolean).join('');

  const styles = `
    h1.cv-title {
      font-size:16pt; font-weight:bold; text-align:center;
      letter-spacing:1.5em; margin:0 0 4pt 0; border:none;
    }
    .date-right { text-align:right; font-size:9pt; margin-bottom:6pt; }
    table.name-table {
      width:100%; border-collapse:collapse; margin-bottom:8pt; font-size:10.5pt;
    }
    table.name-table td { border:1pt solid #000; padding:4pt 8pt; }
    .name-label { width:60pt; background:#f5f5f5; font-weight:bold; text-align:center; }
    .name-value { font-size:14pt; font-weight:bold; }
    h2.cv-section {
      font-size:11pt; font-weight:bold;
      border-bottom:2pt solid #000;
      padding-bottom:2pt; margin:10pt 0 4pt 0;
    }
    .cv-text-box {
      border:1pt solid #000; padding:6pt 8pt;
      min-height:36pt; font-size:9.5pt; line-height:1.7;
      width:100%; box-sizing:border-box; margin-bottom:4pt;
    }
    table.cv-table {
      width:100%; border-collapse:collapse; font-size:9.5pt;
    }
    table.cv-table td { border:1pt solid #000; padding:3pt 6pt; vertical-align:top; }
    .cv-label { background:#f5f5f5; font-weight:bold; white-space:nowrap; text-align:center; vertical-align:middle; }
    .company-name-row {
      font-size:11pt; font-weight:bold; background:#f0f0f0;
      padding:4pt 8pt; border:1pt solid #000;
    }
    .biz-type { font-size:9pt; font-weight:normal; color:#444; }
    .sub-label { font-size:9pt; font-weight:bold; margin:3pt 0 1pt 0; color:#333; }
    table.skills-table {
      width:100%; border-collapse:collapse; font-size:9.5pt; margin-bottom:4pt;
    }
    table.skills-table td { border:1pt solid #000; padding:3pt 6pt; vertical-align:top; }
    .ijo { text-align:right; font-size:10pt; margin-top:8pt; }
  `;

  const body = `
    <h1 class="cv-title">職務経歴書</h1>
    <p class="date-right">${getCurrentDateJPDoc()}現在</p>

    <table class="name-table">
      <tr>
        <td class="name-label">氏名</td>
        <td class="name-value">${escW(w.name || '')}</td>
      </tr>
    </table>

    <!-- 職務要約 -->
    <h2 class="cv-section">■ 職務要約</h2>
    <div class="cv-text-box">${nl2br(w.summary || '')}</div>

    <!-- 活かせる経験・資格・スキル -->
    ${skillsRows ? `
    <h2 class="cv-section">■ 活かせる経験・資格・スキル</h2>
    <table class="skills-table">
      ${skillsRows}
    </table>` : ''}

    <!-- 職務経験 -->
    ${experiencesHtml ? `
    <h2 class="cv-section">■ 職務経験</h2>
    ${experiencesHtml}` : ''}

    <!-- 自己PR -->
    ${w.self_pr ? `
    <h2 class="cv-section">■ 自己PR</h2>
    <div class="cv-text-box">${nl2br(w.self_pr)}</div>` : ''}

    <p class="ijo">以上</p>
  `;

  return makeWordBlob(body, styles);
}
