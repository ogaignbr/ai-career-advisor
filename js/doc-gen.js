/**
 * doc-gen.js
 * 実際のテンプレート（JIS規格履歴書・職務経歴書）に完全一致するWord出力を生成する
 * HTML形式でWordファイル(.doc)として出力
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
@page { size:A4 portrait; margin:15mm 12mm 15mm 20mm; }
body { font-family:"MS明朝","游明朝",serif; font-size:10.5pt; line-height:1.5; color:#000; }
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
   JIS規格に忠実なレイアウト（実際のテンプレートに基づく）
   ============================================================ */
async function generateResumeDocx(resumeData, photoDataUrl) {
  const r = resumeData || {};

  // 生年月日
  const birth = escW(r.birth_date || '');
  const age = r.age ? `（満${escW(r.age)}歳）` : '';
  const birthStr = birth ? `${birth}生　${age}` : '';
  const gender = escW(r.gender || '');

  // 証明写真セル（30×40mm = 85×113pt）
  const photoContent = photoDataUrl
    ? `<img src="${photoDataUrl}" style="width:85pt;height:113pt;object-fit:cover;display:block;">`
    : `<div style="width:85pt;height:113pt;border:1pt solid #999;text-align:center;font-size:7pt;color:#999;padding-top:40pt;line-height:1.6;">写真を<br>貼る<br>（30×40mm）</div>`;

  // 学歴行
  const eduRows = (r.education || []).map(e =>
    `<tr>
      <td style="text-align:center;">${escW(e.year)}</td>
      <td style="text-align:center;">${escW(e.month)}</td>
      <td>${escW(e.content)}</td>
    </tr>`
  ).join('') || `<tr><td style="height:18pt;"></td><td></td><td></td></tr>
    <tr><td style="height:18pt;"></td><td></td><td></td></tr>
    <tr><td style="height:18pt;"></td><td></td><td></td></tr>`;

  // 職歴行
  const careerRows = (r.career || []).map(e =>
    `<tr>
      <td style="text-align:center;">${escW(e.year)}</td>
      <td style="text-align:center;">${escW(e.month)}</td>
      <td>${escW(e.content)}</td>
    </tr>`
  ).join('') || `<tr><td style="height:18pt;"></td><td></td><td></td></tr>
    <tr><td style="height:18pt;"></td><td></td><td></td></tr>
    <tr><td style="height:18pt;"></td><td></td><td></td></tr>`;

  // 資格行
  const qualRows = (r.qualifications || []).map(e =>
    `<tr>
      <td style="text-align:center;">${escW(e.year)}</td>
      <td style="text-align:center;">${escW(e.month)}</td>
      <td>${escW(e.content)}</td>
    </tr>`
  ).join('') || `<tr><td style="height:18pt;"></td><td></td><td></td></tr>
    <tr><td style="height:18pt;"></td><td></td><td></td></tr>`;

  const commute   = escW(r.commute_time   || '');
  const dependents = escW(r.dependents    || '');
  const spouse    = escW(r.spouse         || '有・無');
  const spouseSupport = escW(r.spouse_support || '有・無');

  const hobbies   = nl2br(r.skills_hobbies || '');
  const motivation = nl2br(r.motivation   || '');
  const note      = nl2br(r.note          || '貴社の規定に従います。');

  /*
   * 基本情報テーブルは6列構成で、行ごとに適切な幅を持たせる：
   *   col1(ラベル:60pt) col2(左内容:140pt) col3(中間:45pt)
   *   col4(副ラベル:55pt) col5(副内容:95pt) col6(写真:90pt)
   *
   * 行ごとのcolspan設計：
   *   行1,2,4,5 : col1 | col2+3+4+5 colspan=4 | col6(photo rowspan=5)
   *   行3       : col1 | col2+3 colspan=2(生年月日) | col4(性別ラベル) | col5(性別値) | col6(photo続き)
   *   行6,7     : col1 | col2+3 colspan=2(ふりがな/連絡先) | col4(電話ラベル) | col5+6 colspan=2(電話番号)
   *   行8       : col1+2+3 colspan=3 | col4(E-mailラベル) | col5+6 colspan=2(メール)
   */

  const styles = `
    h1.resume-title {
      font-size:18pt; font-weight:bold; text-align:center;
      letter-spacing:2em; margin:0 0 4pt 0; border:none;
    }
    .date-right { text-align:right; font-size:9pt; margin-bottom:4pt; }
    table.resume-main { border-collapse:collapse; font-size:9.5pt; width:100%; }
    table.resume-main td {
      border:1pt solid #000; padding:3pt 5pt; vertical-align:middle;
    }
    .th-label {
      background:#f0f0f0; font-weight:bold; white-space:nowrap;
      font-size:8pt; text-align:center; vertical-align:middle;
    }
    .name-cell { font-size:15pt; font-weight:bold; vertical-align:middle; padding:4pt 6pt; }
    .photo-cell { text-align:center; vertical-align:middle; padding:4pt; }
    .kana-cell { font-size:8pt; color:#555; vertical-align:top; padding:2pt 5pt; }
    table.history-table { border-collapse:collapse; font-size:9.5pt; width:100%; }
    table.history-table td, table.history-table th {
      border:1pt solid #000; padding:3pt 5pt; vertical-align:middle;
    }
    table.history-table th {
      background:#f0f0f0; font-weight:bold; text-align:center;
    }
    .section-label-row td {
      text-align:center; font-weight:bold; background:#e8e8e8; padding:2pt 5pt;
    }
    .ijou-row td { text-align:right; border-left:none; border-right:none; border-top:none; padding:1pt 5pt; }
    table.commute-table { border-collapse:collapse; font-size:9pt; width:100%; }
    table.commute-table td { border:1pt solid #000; padding:3pt 5pt; vertical-align:middle; }
    .text-area-box {
      border:1pt solid #000; padding:5pt 7pt; min-height:55pt;
      font-size:9.5pt; line-height:1.8; width:100%; box-sizing:border-box;
    }
    .section-header {
      font-size:9pt; font-weight:bold; margin:5pt 0 1pt 0;
      border-bottom:1pt solid #000; padding-bottom:1pt;
    }
  `;

  const body = `
    <h1 class="resume-title">履　歴　書</h1>
    <p class="date-right">${getCurrentDateJPDoc()}現在</p>

    <!--
      基本情報テーブル（6列構成）
      col1:60pt / col2:140pt / col3:45pt / col4:55pt / col5:95pt / col6:90pt
    -->
    <table class="resume-main">
      <!-- 列幅指定用の非表示行 -->
      <tr style="height:0;line-height:0;font-size:0;border:none;">
        <td style="width:60pt;padding:0;border:none;"></td>
        <td style="width:140pt;padding:0;border:none;"></td>
        <td style="width:45pt;padding:0;border:none;"></td>
        <td style="width:55pt;padding:0;border:none;"></td>
        <td style="width:95pt;padding:0;border:none;"></td>
        <td style="width:90pt;padding:0;border:none;"></td>
      </tr>

      <!-- 行1: ふりがな（col1 | col2+3+4+5 | col6=写真 rowspan=5） -->
      <tr>
        <td class="th-label">ふりがな</td>
        <td colspan="4" class="kana-cell">${escW(r.name_kana)}</td>
        <td class="photo-cell" rowspan="5">${photoContent}</td>
      </tr>

      <!-- 行2: 氏名 -->
      <tr>
        <td class="th-label">氏&emsp;名</td>
        <td colspan="4" class="name-cell">${escW(r.name)}</td>
      </tr>

      <!-- 行3: 生年月日 + 性別（col1 | col2+3=生年月日 | col4=性別ラベル | col5=性別値 | col6=写真続き） -->
      <tr>
        <td class="th-label">生年月日</td>
        <td colspan="2">${birthStr}</td>
        <td class="th-label">性別</td>
        <td style="text-align:center;">${gender}</td>
      </tr>

      <!-- 行4: ふりがな（住所） -->
      <tr>
        <td class="th-label">ふりがな</td>
        <td colspan="4" class="kana-cell">${escW(r.address_kana || '')}</td>
      </tr>

      <!-- 行5: 現住所（最後の写真rowspan行） -->
      <tr>
        <td class="th-label">現住所</td>
        <td colspan="4">〒${escW(r.postal_code || '')}&nbsp;&nbsp;${escW(r.address || '')}</td>
      </tr>

      <!--
        以下、写真rowspan終了。col6が通常セルとして使える。
        行6,7: col1(ラベル) | col2+3(ふりがな/連絡先, 185pt) | col4(電話ラベル, 55pt) | col5+6(電話番号, 185pt)
      -->

      <!-- 行6: ふりがな（連絡先）+ 自宅電話 -->
      <tr>
        <td class="th-label">ふりがな</td>
        <td colspan="2" class="kana-cell">${escW(r.contact_address_kana || '')}</td>
        <td class="th-label" style="font-size:7.5pt;text-align:center;">自宅<br>電話</td>
        <td colspan="2">${escW(r.phone_home || '')}</td>
      </tr>

      <!-- 行7: 連絡先 + 携帯電話 -->
      <tr>
        <td class="th-label">連絡先</td>
        <td colspan="2" style="font-size:8pt;color:#555;">
          ${r.contact_address ? `〒${escW(r.contact_address)}` : '（現住所以外の場合のみ記入）'}
        </td>
        <td class="th-label" style="font-size:7.5pt;text-align:center;">携帯<br>電話</td>
        <td colspan="2">${escW(r.phone || '')}</td>
      </tr>

      <!-- 行8: E-mail（左3セル空白） -->
      <tr>
        <td colspan="3" style="border-top:none;border-left:none;border-bottom:none;"></td>
        <td class="th-label">E-mail</td>
        <td colspan="2">${escW(r.email || '')}</td>
      </tr>
    </table>

    <!-- 学歴・職歴 -->
    <table class="history-table">
      <tr>
        <th style="width:32pt;">年</th>
        <th style="width:24pt;">月</th>
        <th>学歴・職歴（各別にまとめて書く）</th>
      </tr>
      <tr class="section-label-row"><td></td><td></td><td>学&emsp;&emsp;歴</td></tr>
      ${eduRows}
      <tr class="section-label-row"><td></td><td></td><td>職&emsp;&emsp;歴</td></tr>
      ${careerRows}
      <tr class="ijou-row"><td colspan="3" style="text-align:right;border:none;padding-right:2pt;">以上</td></tr>
    </table>

    <!-- 免許・資格 -->
    <table class="history-table" style="margin-top:0;">
      <tr>
        <th style="width:32pt;">年</th>
        <th style="width:24pt;">月</th>
        <th>免許・資格</th>
      </tr>
      ${qualRows}
      <tr class="ijou-row"><td colspan="3" style="text-align:right;border:none;padding-right:2pt;">以上</td></tr>
    </table>

    <!-- 通勤時間・扶養家族・配偶者 -->
    <table class="commute-table">
      <tr>
        <td class="th-label" style="width:58pt;">通勤時間</td>
        <td style="width:90pt;">約&nbsp;${commute || '　　時間　　分'}</td>
        <td class="th-label" style="width:75pt;">扶養家族数<br><span style="font-size:7pt;">（配偶者を除く）</span></td>
        <td style="width:55pt;">${dependents || '　　人'}</td>
        <td class="th-label" style="width:40pt;">配偶者</td>
        <td style="width:45pt;text-align:center;">${spouse}</td>
        <td class="th-label" style="width:70pt;">配偶者の<br>扶養義務</td>
        <td style="text-align:center;">${spouseSupport}</td>
      </tr>
    </table>

    <!-- 特技・趣味・得意科目 -->
    <p class="section-header">特技・趣味・得意科目など</p>
    <div class="text-area-box">${hobbies || '&nbsp;'}</div>

    <!-- 志望動機 -->
    <p class="section-header">志望動機</p>
    <div class="text-area-box">${motivation || '&nbsp;'}</div>

    <!-- 本人希望記入欄 -->
    <p class="section-header">本人希望記入欄（特に給料・職種・勤務時間・勤務地・その他についての希望などがあれば記入）</p>
    <div class="text-area-box">${note}</div>
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
