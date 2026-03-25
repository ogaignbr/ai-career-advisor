/**
 * doc-gen.js
 * rirekisyo_a4.docx（JIS規格 様式第1号 A4縦）に準拠したWord出力を生成する
 * HTML形式でWordファイル(.doc)として出力
 *
 * テンプレート解析結果（rirekisyo_a4.docx）:
 * - ページ余白: 全辺13mm（720 twips）
 * - テーブル1（基本情報）: 4列 57pt|57pt|283pt|128pt = 525pt
 * - テーブル2（学歴・職歴）: 3列 64pt|43pt|418pt = 525pt
 * - テーブル3（免許・資格）: 3列 71pt|43pt|411pt = 525pt
 * - テーブル4（志望動機・自己PR）: 1列 525pt
 * - テーブル5（本人希望）: 1列 525pt
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

function triggerWordDownload(blob, filename) {
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
   rirekisyo_a4.docx（JIS規格 様式第1号）に準拠したレイアウト
   ============================================================ */
async function generateResumeDocx(resumeData, photoDataUrl) {
  const r = resumeData || {};

  // 生年月日
  const birth = escW(r.birth_date || '');
  const age = r.age ? `（満${escW(r.age)}歳）` : '';
  const birthStr = birth ? `${birth}生　${age}` : '';
  const gender = escW(r.gender || '');

  // 証明写真セル（縦36〜40mm × 横24〜30mm）
  // col4(128pt)の縦方向 rows2〜4 = 23+60+32 = 115pt ≈ 40.5mm に収まるサイズ
  const photoContent = photoDataUrl
    ? `<img src="${photoDataUrl}" style="width:85pt;height:113pt;object-fit:cover;display:block;">`
    : `<div style="width:85pt;height:113pt;border:1pt solid #999;text-align:center;font-size:7pt;color:#999;padding-top:36pt;line-height:1.7;box-sizing:border-box;">写真を<br>貼る<br>位置<br><br>縦36〜40mm<br>×横24〜30mm</div>`;

  // 学歴行
  const eduRows = (r.education || []).map(e =>
    `<tr style="height:28pt;"><td style="text-align:center;">${escW(e.year)}</td><td style="text-align:center;">${escW(e.month)}</td><td>${escW(e.content)}</td></tr>`
  );

  // 職歴行
  const careerRows = (r.career || []).map(e =>
    `<tr style="height:28pt;"><td style="text-align:center;">${escW(e.year)}</td><td style="text-align:center;">${escW(e.month)}</td><td>${escW(e.content)}</td></tr>`
  );

  // 学歴・職歴統合（テンプレートに合わせ1テーブル）
  const historyRowsHtml = [
    `<tr class="section-label-row"><td></td><td></td><td>学&emsp;&emsp;歴</td></tr>`,
    ...eduRows,
    // 空行パディング（学歴最低4行）
    ...Array(Math.max(0, 4 - eduRows.length)).fill(`<tr style="height:28pt;"><td></td><td></td><td></td></tr>`),
    `<tr class="section-label-row"><td></td><td></td><td>職&emsp;&emsp;歴</td></tr>`,
    ...careerRows,
    // 空行パディング（職歴最低5行）
    ...Array(Math.max(0, 5 - careerRows.length)).fill(`<tr style="height:28pt;"><td></td><td></td><td></td></tr>`),
    `<tr class="ijou-row"><td colspan="3">以上</td></tr>`,
  ].join('');

  // 資格行
  const qualRowsArr = (r.qualifications || []).map(e =>
    `<tr style="height:28pt;"><td style="text-align:center;">${escW(e.year)}</td><td style="text-align:center;">${escW(e.month)}</td><td>${escW(e.content)}</td></tr>`
  );
  const qualRowsHtml = [
    ...qualRowsArr,
    // 空行パディング（最低6行）
    ...Array(Math.max(0, 6 - qualRowsArr.length)).fill(`<tr style="height:28pt;"><td></td><td></td><td></td></tr>`),
    `<tr class="ijou-row"><td colspan="3">以上</td></tr>`,
  ].join('');

  // 志望動機ボックス（特技・趣味も含む — テンプレートの "志望の動機、特技、自己PR" 欄）
  const motivationParts = [];
  if (r.motivation) motivationParts.push(nl2br(r.motivation));
  if (r.skills_hobbies) motivationParts.push(`【特技・趣味】<br>${nl2br(r.skills_hobbies)}`);
  const motivationBoxContent = motivationParts.join('<br><br>') || '&nbsp;';

  const note = nl2br(r.note || '貴社の規定に従います。');

  /*
   * テーブル1（基本情報）列構成（rirekisyo_a4.docxより）:
   *   col1: 57pt（ラベル列）
   *   col2: 57pt（ラベル列2 — col1と結合してラベル計114ptに使用）
   *   col3: 283pt（メインコンテンツ）
   *   col4: 128pt（右側：写真/電話/E-mail）
   *   合計: 525pt（A4 幅 210mm − 余白 13mm×2 ≈ 525pt）
   *
   * 行構造:
   *   行1 (h=36pt): [履歴書 col1+2+3=397pt][日付 col4=128pt]
   *   行2 (h=23pt): [ふりがな col1+2][kana col3][写真 col4 rowspan=3]
   *   行3 (h=60pt): [氏名 col1+2][name col3]
   *   行4 (h=32pt): [生年月日 col1+2][birthdate col3]（写真 rowspan終了）
   *   行5 (h=21pt): [ふりがな col1+2][addr_kana col3][※性別 col4]
   *   行6 (h=42pt): [現住所 col1+2][〒address col3][電話 col4]
   *   行7 (h=21pt): [ふりがな col1+2][contact_kana col3][携帯 col4]
   *   行8 (h=42pt): [連絡先 col1+2][contact col3][E-mail col4]
   */

  const styles = `
    table.resume-main {
      border-collapse: collapse;
      width: 100%;
      table-layout: fixed;
      font-size: 9.5pt;
    }
    table.resume-main td {
      border: 1pt solid #000;
      padding: 2pt 4pt;
      vertical-align: middle;
    }
    .title-cell {
      font-size: 18pt;
      font-weight: bold;
      text-align: center;
      letter-spacing: 2em;
      border: none;
      border-bottom: 1.5pt solid #000;
      padding: 3pt 0 3pt 2em;
    }
    .date-cell {
      text-align: right;
      font-size: 9pt;
      border: none;
      border-bottom: 1.5pt solid #000;
      padding: 3pt 2pt;
      vertical-align: bottom;
    }
    .th-label {
      background: #f0f0f0;
      font-size: 8pt;
      text-align: center;
      font-weight: bold;
      white-space: nowrap;
      vertical-align: middle;
    }
    .kana-cell {
      font-size: 7.5pt;
      color: #555;
      vertical-align: bottom;
      padding: 1pt 4pt;
    }
    .name-cell {
      font-size: 15pt;
      font-weight: bold;
      padding: 3pt 6pt;
    }
    .photo-cell {
      text-align: center;
      vertical-align: middle;
      padding: 2pt;
    }
    .right-cell {
      font-size: 8.5pt;
      vertical-align: top;
      padding: 2pt 4pt;
    }
    table.history-table {
      border-collapse: collapse;
      width: 100%;
      font-size: 9.5pt;
      table-layout: fixed;
    }
    table.history-table td, table.history-table th {
      border: 1pt solid #000;
      padding: 2pt 4pt;
      vertical-align: middle;
    }
    table.history-table th {
      background: #f0f0f0;
      font-weight: bold;
      text-align: center;
    }
    .section-label-row td {
      background: #e8e8e8;
      font-weight: bold;
      text-align: center;
      padding: 2pt 4pt;
      height: 20pt;
    }
    .ijou-row td {
      text-align: right;
      border: none;
      padding: 1pt 4pt;
      font-size: 9pt;
    }
    .box-label {
      font-size: 9pt;
      font-weight: bold;
      border: 1pt solid #000;
      border-bottom: none;
      padding: 2pt 5pt;
      margin-top: 2pt;
      background: #f5f5f5;
    }
    .box-content {
      border: 1pt solid #000;
      padding: 5pt 7pt;
      min-height: 70pt;
      font-size: 9.5pt;
      line-height: 1.8;
    }
    .box-content-note {
      border: 1pt solid #000;
      padding: 5pt 7pt;
      min-height: 55pt;
      font-size: 9.5pt;
      line-height: 1.8;
    }
  `;

  const body = `
    <!-- ======================================================
         テーブル1: 基本情報
         4列構成: 57pt | 57pt | 283pt | 128pt = 525pt
         ====================================================== -->
    <table class="resume-main">
      <colgroup>
        <col style="width:57pt">
        <col style="width:57pt">
        <col style="width:283pt">
        <col style="width:128pt">
      </colgroup>

      <!-- 行1 (h=36pt): タイトル + 作成日 -->
      <tr style="height:36pt;">
        <td colspan="3" class="title-cell">履　歴　書</td>
        <td class="date-cell">${getCurrentDateJPDoc()}現在</td>
      </tr>

      <!-- 行2 (h=23pt): ふりがな（氏名） + 写真 rowspan=3 -->
      <tr style="height:23pt;">
        <td colspan="2" class="th-label">ふりがな</td>
        <td class="kana-cell">${escW(r.name_kana || '')}</td>
        <td class="photo-cell" rowspan="3">${photoContent}</td>
      </tr>

      <!-- 行3 (h=60pt): 氏名 -->
      <tr style="height:60pt;">
        <td colspan="2" class="th-label">氏&emsp;名</td>
        <td class="name-cell">${escW(r.name || '')}</td>
      </tr>

      <!-- 行4 (h=32pt): 生年月日（写真 rowspan 最終行） -->
      <tr style="height:32pt;">
        <td colspan="2" class="th-label" style="font-size:7.5pt;">生年月日</td>
        <td>${birthStr}</td>
      </tr>

      <!-- 行5 (h=21pt): ふりがな（住所） + ※性別 -->
      <tr style="height:21pt;">
        <td colspan="2" class="th-label">ふりがな</td>
        <td class="kana-cell">${escW(r.address_kana || '')}</td>
        <td class="right-cell" style="font-size:7.5pt;">
          <span style="font-weight:bold;">※性別</span>&nbsp;${gender}
          <div style="font-size:6.5pt;color:#666;margin-top:1pt;">（記載は任意）</div>
        </td>
      </tr>

      <!-- 行6 (h=42pt): 現住所 + 電話 -->
      <tr style="height:42pt;">
        <td colspan="2" class="th-label">現住所</td>
        <td style="vertical-align:top;padding-top:3pt;">〒${escW(r.postal_code || '')}&nbsp;&nbsp;${escW(r.address || '')}</td>
        <td class="right-cell">
          <div style="font-size:7.5pt;font-weight:bold;">電話（自宅）</div>
          <div>${escW(r.phone_home || '')}</div>
          <div style="font-size:7.5pt;font-weight:bold;margin-top:2pt;">携帯電話</div>
          <div>${escW(r.phone || '')}</div>
        </td>
      </tr>

      <!-- 行7 (h=21pt): ふりがな（連絡先） + E-mailラベル -->
      <tr style="height:21pt;">
        <td colspan="2" class="th-label">ふりがな</td>
        <td class="kana-cell">${escW(r.contact_address_kana || '')}</td>
        <td class="right-cell" style="font-size:7.5pt;font-weight:bold;">E-mail</td>
      </tr>

      <!-- 行8 (h=42pt): 連絡先 + E-mail値 -->
      <tr style="height:42pt;">
        <td colspan="2" class="th-label">連絡先</td>
        <td style="font-size:8pt;color:#555;vertical-align:top;padding-top:3pt;">
          ${r.contact_address ? `〒${escW(r.contact_address)}` : '（現住所以外に連絡を希望する場合のみ記入）'}
        </td>
        <td class="right-cell">${escW(r.email || '')}</td>
      </tr>
    </table>

    <!-- ======================================================
         テーブル2: 学歴・職歴
         3列構成: 64pt | 43pt | 418pt = 525pt
         ====================================================== -->
    <table class="history-table">
      <colgroup>
        <col style="width:64pt">
        <col style="width:43pt">
        <col style="width:418pt">
      </colgroup>
      <tr>
        <th>年</th>
        <th>月</th>
        <th>学歴・職歴（各別にまとめて書く）</th>
      </tr>
      ${historyRowsHtml}
    </table>

    <!-- ======================================================
         テーブル3: 免許・資格
         3列構成: 71pt | 43pt | 411pt = 525pt
         ====================================================== -->
    <table class="history-table" style="margin-top:0;">
      <colgroup>
        <col style="width:71pt">
        <col style="width:43pt">
        <col style="width:411pt">
      </colgroup>
      <tr>
        <th>年</th>
        <th>月</th>
        <th>免許・資格</th>
      </tr>
      ${qualRowsHtml}
    </table>

    <!-- ======================================================
         テーブル4: 志望の動機・特技・自己PR
         rirekisyo_a4.docx: "志望の動機、特技、自己PR、アピールポイントなど"
         ====================================================== -->
    <div class="box-label">志望の動機、特技、自己PR、アピールポイントなど</div>
    <div class="box-content">${motivationBoxContent}</div>

    <!-- ======================================================
         テーブル5: 本人希望記入欄
         rirekisyo_a4.docx: "本人希望記入欄（特に給料、職種、勤務時間、勤務地、その他についての希望などがあれば記入）"
         ====================================================== -->
    <div class="box-label" style="margin-top:4pt;">本人希望記入欄（特に給料、職種、勤務時間、勤務地、その他についての希望などがあれば記入）</div>
    <div class="box-content-note">${note}</div>
  `;

  return makeWordBlob(body, styles);
}

/* ============================================================
   職務経歴書生成
   実際のテンプレートに基づく形式（■セクション形式）
   ============================================================ */
async function generateWorkHistoryDocx(workData) {
  const w = workData || {};
  const skills = w.skills || {};

  // 職務経験セクション
  const experiencesHtml = (w.experiences || []).map((exp, i) => {
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

  // スキルセクション
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
