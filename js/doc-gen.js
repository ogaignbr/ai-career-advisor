/**
 * doc-gen.js
 * docx ライブラリ (v8) を使用して日本語の履歴書・職務経歴書 Word ファイルを生成する
 */

/* --------------------------------------------------
   ユーティリティ
   -------------------------------------------------- */
function toWareki(date) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  if (y >= 2019) return `令和${y - 2018}年${m}月${d}日`;
  if (y >= 1989) return `平成${y - 1988}年${m}月${d}日`;
  return `${y}年${m}月${d}日`;
}
function getCurrentWareki() { return toWareki(new Date()); }

function getD() {
  if (typeof docx === 'undefined') throw new Error('docxライブラリが読み込まれていません。');
  return docx;
}

/** テキストを改行で分割して Paragraph 配列に変換 */
function textToParas(text, d, size, opts = {}) {
  if (!text) return [new d.Paragraph({ children: [new d.TextRun({ text: '', size })] })];
  return String(text).split(/\r?\n/).map(line =>
    new d.Paragraph({
      children: [new d.TextRun({ text: line, size, font: 'MS Gothic', ...opts })],
      spacing: { after: 80, line: 340 },
    })
  );
}

/** セクション見出し Paragraph */
function sectionTitle(text, d, color = '5B21B6') {
  return new d.Paragraph({
    children: [new d.TextRun({ text, bold: true, size: 24, font: 'MS Gothic', color })],
    spacing: { before: 240, after: 120 },
    border: { bottom: { style: d.BorderStyle.SINGLE, size: 8, color } },
  });
}

/** ヘッダーセル（背景色付き） */
function hCell(text, width, d) {
  return new d.TableCell({
    children: [new d.Paragraph({
      children: [new d.TextRun({ text: text || '', bold: true, size: 19, font: 'MS Gothic' })],
    })],
    width: { size: width, type: d.WidthType.DXA },
    shading: { fill: 'EDE9FE', type: d.ShadingType ? d.ShadingType.CLEAR : 'clear', color: 'auto' },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
  });
}

/** データセル */
function dCell(text, width, d, bold = false) {
  return new d.TableCell({
    children: [new d.Paragraph({
      children: [new d.TextRun({ text: text || '', size: 20, font: 'MS Gothic', bold })],
    })],
    width: { size: width, type: d.WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
  });
}

/** テキストブロック（枠付きセル1列） */
function textBoxTable(text, d) {
  const lines = String(text || '').split(/\r?\n/);
  return new d.Table({
    rows: [new d.TableRow({
      children: [new d.TableCell({
        children: lines.map(line => new d.Paragraph({
          children: [new d.TextRun({ text: line, size: 20, font: 'MS Gothic' })],
          spacing: { after: 80, line: 340 },
        })),
        width: { size: 9500, type: d.WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
      })],
    })],
    width: { size: 9500, type: d.WidthType.DXA },
  });
}

/* --------------------------------------------------
   履歴書 generateResumeDocx
   -------------------------------------------------- */
async function generateResumeDocx(resumeData, photoDataUrl) {
  const d = getD();
  const children = [];

  /* タイトル */
  children.push(new d.Paragraph({
    children: [new d.TextRun({ text: '履　歴　書', bold: true, size: 40, font: 'MS Gothic' })],
    alignment: d.AlignmentType.CENTER,
    spacing: { after: 160 },
  }));

  /* 作成日 */
  children.push(new d.Paragraph({
    children: [new d.TextRun({ text: `${getCurrentWareki()}現在`, size: 18, font: 'MS Gothic' })],
    alignment: d.AlignmentType.RIGHT,
    spacing: { after: 200 },
  }));

  /* 基本情報テーブル */
  const birthInfo = resumeData.birth_date
    ? `${resumeData.birth_date}${resumeData.age ? `（${resumeData.age}歳）` : ''}`
    : '';

  children.push(new d.Table({
    rows: [
      new d.TableRow({ children: [
        hCell('ふりがな', 1600, d),
        new d.TableCell({
          children: [new d.Paragraph({ children: [new d.TextRun({ text: resumeData.name_kana || '', size: 19, font: 'MS Gothic' })] })],
          width: { size: 7900, type: d.WidthType.DXA },
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
        }),
      ]}),
      new d.TableRow({ children: [
        hCell('氏名', 1600, d),
        new d.TableCell({
          children: [new d.Paragraph({ children: [new d.TextRun({ text: resumeData.name || '', bold: true, size: 30, font: 'MS Gothic' })] })],
          width: { size: 7900, type: d.WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
        }),
      ]}),
      new d.TableRow({ children: [
        hCell('生年月日', 1600, d),
        dCell(birthInfo, 4000, d),
        hCell('性別', 900, d),
        dCell(resumeData.gender || '', 3000, d),
      ]}),
      new d.TableRow({ children: [
        hCell('住所', 1600, d),
        new d.TableCell({
          children: [new d.Paragraph({ children: [new d.TextRun({ text: resumeData.address || '', size: 20, font: 'MS Gothic' })] })],
          columnSpan: 3,
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
        }),
      ]}),
      new d.TableRow({ children: [
        hCell('電話番号', 1600, d),
        dCell(resumeData.phone || '', 3500, d),
        hCell('メールアドレス', 1600, d),
        dCell(resumeData.email || '', 2800, d),
      ]}),
    ],
    width: { size: 9500, type: d.WidthType.DXA },
  }));

  /* 証明写真の注記（DataURL がある場合） */
  if (photoDataUrl) {
    children.push(new d.Paragraph({
      children: [new d.TextRun({ text: '※ 証明写真は別途印刷して右上欄に貼付してください。', size: 16, font: 'MS Gothic', color: '888888' })],
      spacing: { before: 60, after: 60 },
    }));
  }

  children.push(new d.Paragraph({ spacing: { after: 120 } }));

  /* 学歴・職歴 */
  children.push(sectionTitle('学歴・職歴', d));

  const historyRows = [
    new d.TableRow({ children: [
      hCell('年', 900, d), hCell('月', 700, d), hCell('内　　容', 7900, d),
    ]}),
    /* 学歴ラベル */
    new d.TableRow({ children: [
      dCell('', 900, d), dCell('', 700, d),
      new d.TableCell({
        children: [new d.Paragraph({ children: [new d.TextRun({ text: '学　　歴', bold: true, size: 20, font: 'MS Gothic' })], alignment: d.AlignmentType.CENTER })],
        shading: { fill: 'F5F3FF', type: 'clear', color: 'auto' },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
      }),
    ]}),
  ];

  (resumeData.education || []).forEach(e => {
    historyRows.push(new d.TableRow({ children: [
      dCell(e.year || '', 900, d), dCell(e.month || '', 700, d), dCell(e.content || '', 7900, d),
    ]}));
  });

  /* 職歴ラベル */
  historyRows.push(new d.TableRow({ children: [
    dCell('', 900, d), dCell('', 700, d),
    new d.TableCell({
      children: [new d.Paragraph({ children: [new d.TextRun({ text: '職　　歴', bold: true, size: 20, font: 'MS Gothic' })], alignment: d.AlignmentType.CENTER })],
      shading: { fill: 'F5F3FF', type: 'clear', color: 'auto' },
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
    }),
  ]}));

  (resumeData.career || []).forEach(e => {
    historyRows.push(new d.TableRow({ children: [
      dCell(e.year || '', 900, d), dCell(e.month || '', 700, d), dCell(e.content || '', 7900, d),
    ]}));
  });

  historyRows.push(new d.TableRow({ children: [
    dCell('', 900, d), dCell('', 700, d),
    new d.TableCell({
      children: [new d.Paragraph({ children: [new d.TextRun({ text: '以上', size: 20, font: 'MS Gothic' })], alignment: d.AlignmentType.RIGHT })],
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
    }),
  ]}));

  children.push(new d.Table({ rows: historyRows, width: { size: 9500, type: d.WidthType.DXA } }));
  children.push(new d.Paragraph({ spacing: { after: 120 } }));

  /* 免許・資格 */
  children.push(sectionTitle('免許・資格', d));

  const qualRows = [
    new d.TableRow({ children: [hCell('年', 900, d), hCell('月', 700, d), hCell('免許・資格名', 7900, d)] }),
  ];
  const quals = resumeData.qualifications || [];
  if (quals.length === 0) {
    qualRows.push(new d.TableRow({ children: [dCell('', 900, d), dCell('', 700, d), dCell('', 7900, d)] }));
  } else {
    quals.forEach(e => qualRows.push(new d.TableRow({ children: [dCell(e.year || '', 900, d), dCell(e.month || '', 700, d), dCell(e.content || '', 7900, d)] })));
  }
  children.push(new d.Table({ rows: qualRows, width: { size: 9500, type: d.WidthType.DXA } }));
  children.push(new d.Paragraph({ spacing: { after: 120 } }));

  /* 特技・趣味 */
  if (resumeData.skills_hobbies) {
    children.push(sectionTitle('特技・趣味', d));
    children.push(textBoxTable(resumeData.skills_hobbies, d));
    children.push(new d.Paragraph({ spacing: { after: 120 } }));
  }

  /* 志望動機 */
  if (resumeData.motivation) {
    children.push(sectionTitle('志望動機', d));
    children.push(textBoxTable(resumeData.motivation, d));
    children.push(new d.Paragraph({ spacing: { after: 120 } }));
  }

  /* 本人希望欄 */
  children.push(sectionTitle('本人希望欄', d));
  children.push(new d.Table({
    rows: [new d.TableRow({ children: [new d.TableCell({
      children: [new d.Paragraph({ children: [new d.TextRun({ text: '貴社規定に従います。', size: 20, font: 'MS Gothic' })] })],
      width: { size: 9500, type: d.WidthType.DXA },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
    })] })],
    width: { size: 9500, type: d.WidthType.DXA },
  }));

  /* ドキュメント生成 */
  const doc = new d.Document({
    sections: [{
      properties: {
        page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
      },
      children,
    }],
  });

  return await d.Packer.toBlob(doc);
}

/* --------------------------------------------------
   職務経歴書 generateWorkHistoryDocx
   -------------------------------------------------- */
async function generateWorkHistoryDocx(workHistoryData) {
  const d = getD();
  const children = [];

  /* タイトル */
  children.push(new d.Paragraph({
    children: [new d.TextRun({ text: '職　務　経　歴　書', bold: true, size: 40, font: 'MS Gothic' })],
    alignment: d.AlignmentType.CENTER,
    spacing: { after: 160 },
  }));

  /* 作成日 */
  children.push(new d.Paragraph({
    children: [new d.TextRun({ text: `${getCurrentWareki()}現在`, size: 18, font: 'MS Gothic' })],
    alignment: d.AlignmentType.RIGHT,
    spacing: { after: 200 },
  }));

  /* 氏名 */
  children.push(new d.Table({
    rows: [new d.TableRow({ children: [
      hCell('氏名', 1500, d),
      new d.TableCell({
        children: [new d.Paragraph({ children: [new d.TextRun({ text: workHistoryData.name || '', bold: true, size: 28, font: 'MS Gothic' })] })],
        width: { size: 8000, type: d.WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 80, right: 80 },
      }),
    ]})],
    width: { size: 9500, type: d.WidthType.DXA },
  }));

  children.push(new d.Paragraph({ spacing: { after: 120 } }));

  /* 職務要約 */
  children.push(sectionTitle('■ 職務要約', d));
  if (workHistoryData.summary) {
    children.push(textBoxTable(workHistoryData.summary, d));
  }
  children.push(new d.Paragraph({ spacing: { after: 120 } }));

  /* 活かせる経験・資格・スキル */
  children.push(sectionTitle('■ 活かせる経験・資格・スキル', d));
  const skills = workHistoryData.skills || {};
  const skillRows = [];
  if (skills.experience)      skillRows.push(new d.TableRow({ children: [hCell('活かせる経験', 2000, d), dCell(skills.experience, 7500, d)] }));
  if (skills.qualifications)  skillRows.push(new d.TableRow({ children: [hCell('保有資格', 2000, d), dCell(skills.qualifications, 7500, d)] }));
  if (skills.pc_skills)       skillRows.push(new d.TableRow({ children: [hCell('PCスキル', 2000, d), dCell(skills.pc_skills, 7500, d)] }));
  if (skillRows.length > 0) {
    children.push(new d.Table({ rows: skillRows, width: { size: 9500, type: d.WidthType.DXA } }));
  }
  children.push(new d.Paragraph({ spacing: { after: 120 } }));

  /* 職務経歴 */
  children.push(sectionTitle('■ 職務経歴', d));

  (workHistoryData.experiences || []).forEach((exp, i) => {
    const period = `${exp.period_start || ''}${exp.period_end ? ` 〜 ${exp.period_end}` : ''}`;

    /* 会社名ヘッダー */
    children.push(new d.Paragraph({
      children: [new d.TextRun({
        text: `【${i + 1}】 ${exp.company_name || ''}  （${period}）`,
        bold: true, size: 22, font: 'MS Gothic', color: '3B0764',
      })],
      spacing: { before: 200, after: 80 },
    }));

    /* 会社概要テーブル */
    const infoRows = [];
    if (exp.business_type) infoRows.push(new d.TableRow({ children: [hCell('業種', 1800, d), dCell(exp.business_type, 7700, d)] }));
    if (exp.overview)      infoRows.push(new d.TableRow({ children: [hCell('事業概要', 1800, d), dCell(exp.overview, 7700, d)] }));
    if (exp.position)      infoRows.push(new d.TableRow({ children: [hCell('役職・職種', 1800, d), dCell(exp.position, 7700, d)] }));
    if (infoRows.length > 0) {
      children.push(new d.Table({ rows: infoRows, width: { size: 9500, type: d.WidthType.DXA } }));
    }

    /* 担当業務 */
    if (exp.duties) {
      children.push(new d.Paragraph({
        children: [new d.TextRun({ text: '【担当業務】', bold: true, size: 20, font: 'MS Gothic', color: '5B21B6' })],
        spacing: { before: 120, after: 60 },
      }));
      children.push(textBoxTable(exp.duties, d));
    }

    /* 主な実績 */
    if (exp.achievements) {
      children.push(new d.Paragraph({
        children: [new d.TextRun({ text: '【主な実績・成果】', bold: true, size: 20, font: 'MS Gothic', color: '5B21B6' })],
        spacing: { before: 100, after: 60 },
      }));
      children.push(textBoxTable(exp.achievements, d));
    }

    children.push(new d.Paragraph({ spacing: { after: 120 } }));
  });

  /* 自己PR */
  if (workHistoryData.self_pr) {
    children.push(sectionTitle('■ 自己PR', d));
    children.push(textBoxTable(workHistoryData.self_pr, d));
    children.push(new d.Paragraph({ spacing: { after: 120 } }));
  }

  /* 以上 */
  children.push(new d.Paragraph({
    children: [new d.TextRun({ text: '以上', size: 20, font: 'MS Gothic' })],
    alignment: d.AlignmentType.RIGHT,
    spacing: { before: 200 },
  }));

  const doc = new d.Document({
    sections: [{
      properties: {
        page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
      },
      children,
    }],
  });

  return await d.Packer.toBlob(doc);
}
