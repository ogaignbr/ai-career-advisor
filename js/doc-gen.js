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
   rirekisyo.xlsx（JIS規格 A4横 様式第1号）テンプレートに
   SheetJS でデータを流し込み、xlsx ファイルとして出力する
   ============================================================ */
async function generateResumeDocx(resumeData, photoDataUrl) {
  const r = resumeData || {};

  /*
   * rirekisyo.xlsx（JIS規格 A4横 様式第1号）テンプレートに SheetJS でデータを流し込む
   *
   * セルマッピング（テンプレート解析結果より）:
   *   E3  : 作成日
   *   D5  : 氏名ふりがな          (merged D5:G5)
   *   B7  : 氏名                  (merged B7:G9)
   *   B10 : 生年月日              (merged B10:G11)
   *   H11 : 性別                  (merged H11:I11)
   *   D12 : 現住所ふりがな        (merged D12:H12)
   *   I12 : 電話（自宅）          (現住所行の電話セル)
   *   D13 : 郵便番号              (merged D13:H14 → 上部)
   *   B15 : 現住所                (merged B15:H16)
   *   I13 : E-mail                (merged I13:I16)
   *   D17 : 連絡先ふりがな        (merged D17:H18)
   *   I17 : 電話（携帯）          (連絡先行の電話セル)
   *   B20 : 連絡先住所            (merged B20:H22)
   *   I19 : E-mail（連絡先）      (merged I19:I22)
   *
   *   学歴・職歴（左面 15スロット）:
   *     B26,C26,D26 / B28,C28,D28 / B30,C30,D30 / B32,C32,D32 / B34,C34,D34
   *     B35,C35,D35 / B37,C37,D37 / B39,C39,D39 / B40,C40,D40 / B42,C42,D42
   *     B44,C44,D44 / B46,C46,D46 / B47,C47,D47 / B48,C48,D48 / B49,C49,D49
   *   学歴・職歴（右面続き 7スロット）:
   *     L4,M4,N4 / L6,M6,N6 / L8,M8,N8 / L9,M9,N9 / L10,M10,N10 / L12,M12,N12 / L14,M14,N14
   *
   *   免許・資格（右面 5スロット）:
   *     L18,M18,N18 / L22,M22,N22 / L25,M25,N25 / L27,M27,N27 / L29,M29,N29
   *
   *   志望動機・自己PR: L33  (merged L33:P42)
   *   本人希望:         L46  (merged L46:P46) ～ L49
   */

  // SheetJS ライブラリチェック
  if (typeof XLSX === 'undefined') {
    throw new Error('SheetJS (xlsx.js) が読み込まれていません。index.html の CDN を確認してください。');
  }
  if (typeof RIREKISYO_TEMPLATE_B64 === 'undefined') {
    throw new Error('履歴書テンプレート (resume-template.js) が読み込まれていません。');
  }

  // テンプレート読み込み
  const wb = XLSX.read(RIREKISYO_TEMPLATE_B64, { type: 'base64', cellStyles: true });
  const ws = wb.Sheets[wb.SheetNames[0]];

  /**
   * セルに文字列値を書き込む（既存のセルスタイルを保持）
   */
  function wc(addr, value) {
    if (value === null || value === undefined) return;
    const str = String(value);
    if (!str.trim()) return;
    const existing = ws[addr];
    const s = existing ? existing.s : undefined;
    ws[addr] = { t: 's', v: str };
    if (s !== undefined) ws[addr].s = s;
  }

  // ─── 作成日 ───────────────────────────────────────────────
  wc('E3', getCurrentDateJPDoc() + '現在');

  // ─── 氏名・ふりがな ───────────────────────────────────────
  wc('D5', r.name_kana || '');
  wc('B7', r.name || '');

  // ─── 生年月日 ─────────────────────────────────────────────
  const birth = r.birth_date || '';
  const age   = r.age ? `（満${r.age}歳）` : '';
  if (birth) wc('B10', `${birth}生　${age}`);

  // ─── 性別 ─────────────────────────────────────────────────
  wc('H11', r.gender || '');

  // ─── 現住所 ───────────────────────────────────────────────
  wc('D12', r.address_kana || '');           // 住所ふりがな
  if (r.postal_code) wc('D13', `〒${r.postal_code}`);
  const addrStr = [r.postal_code ? `〒${r.postal_code}` : '', r.address || '']
    .filter(Boolean).join('　');
  wc('B15', addrStr);

  // ─── 電話・E-mail（現住所） ──────────────────────────────
  wc('I12', r.phone_home || r.phone || '');  // 電話セル（自宅/携帯どちらか）
  wc('I13', r.email || '');                  // E-mail セル (I13:I16 merged)

  // ─── 連絡先 ───────────────────────────────────────────────
  wc('D17', r.contact_address_kana || '');   // 連絡先ふりがな
  wc('I17', r.phone || '');                  // 電話（携帯）
  if (r.contact_address) wc('B20', r.contact_address);
  wc('I19', r.email || '');                  // E-mail (I19:I22 merged)

  // ─── 学歴・職歴 ───────────────────────────────────────────
  // 左面スロット（15行分）
  const histLeft = [
    ['B26','C26','D26'], ['B28','C28','D28'], ['B30','C30','D30'],
    ['B32','C32','D32'], ['B34','C34','D34'], ['B35','C35','D35'],
    ['B37','C37','D37'], ['B39','C39','D39'], ['B40','C40','D40'],
    ['B42','C42','D42'], ['B44','C44','D44'], ['B46','C46','D46'],
    ['B47','C47','D47'], ['B48','C48','D48'], ['B49','C49','D49'],
  ];
  // 右面続きスロット（7行分）
  const histRight = [
    ['L4','M4','N4'],   ['L6','M6','N6'],   ['L8','M8','N8'],
    ['L9','M9','N9'],   ['L10','M10','N10'], ['L12','M12','N12'],
    ['L14','M14','N14'],
  ];
  const allHist = [...histLeft, ...histRight];
  let hi = 0;

  const writeHist = (year, month, content) => {
    if (hi >= allHist.length) return;
    const [cy, cm, cc] = allHist[hi++];
    wc(cy, year);
    wc(cm, month);
    wc(cc, content);
  };

  writeHist('', '', '学　　　歴');                  // 学歴セクションヘッダ
  for (const e of (r.education || [])) {
    writeHist(e.year || '', e.month || '', e.content || '');
  }
  writeHist('', '', '職　　　歴');                  // 職歴セクションヘッダ
  for (const e of (r.career || [])) {
    writeHist(e.year || '', e.month || '', e.content || '');
  }
  writeHist('', '', '以上');

  // ─── 免許・資格 ───────────────────────────────────────────
  const qualSlots = [
    ['L18','M18','N18'], ['L22','M22','N22'], ['L25','M25','N25'],
    ['L27','M27','N27'], ['L29','M29','N29'],
  ];
  let qi = 0;
  for (const q of (r.qualifications || [])) {
    if (qi >= qualSlots.length) break;
    const [qy, qm, qc] = qualSlots[qi++];
    wc(qy, q.year || '');
    wc(qm, q.month || '');
    wc(qc, q.content || '');
  }
  if (qi < qualSlots.length) wc(qualSlots[qi][2], '以上');

  // ─── 志望動機・特技・自己PR ──────────────────────────────
  const motivParts = [];
  if (r.motivation)    motivParts.push(r.motivation);
  if (r.skills_hobbies) motivParts.push(`【特技・趣味】\n${r.skills_hobbies}`);
  const motivText = motivParts.join('\n\n');
  if (motivText) wc('L33', motivText);          // merged L33:P42

  // ─── 本人希望 ─────────────────────────────────────────────
  const noteText = r.note || '貴社の規定に従います。';
  wc('L46', noteText);                          // merged L46:P46（1行目）

  // ─── xlsx バイナリ生成 → Blob 返却 ──────────────────────
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
  const buf = new ArrayBuffer(wbout.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < wbout.length; i++) {
    view[i] = wbout.charCodeAt(i) & 0xff;
  }
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
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
