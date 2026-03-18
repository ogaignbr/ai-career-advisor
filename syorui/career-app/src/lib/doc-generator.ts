import {
  Document,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  Packer,
  ImageRun,
  VerticalMergeType,
  VerticalAlign,
} from "docx";
import type { GeneratedData } from "./claude";

// ─── ページ設定 ────────────────────────────────────────────────
// A4縦 / マージン各720DXA（約1.27cm）/ 本文幅10466DXA
const PAGE_MARGIN = 720;
const CONTENT_W = 10466;

// 個人情報テーブルの列幅
const CL = 1400;  // ラベル列
const CV = 5066;  // 値列（メイン）
const CR = 2200;  // 右列（電話・印等）
const CP = 1800;  // 写真列
// CL+CV+CR+CP = 10466

// 学歴・職歴テーブルの列幅
const CY = 900;   // 年
const CM_W = 600; // 月
const CC = 8966;  // 内容

// ─── セル境界線 ────────────────────────────────────────────────
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "000000" } as const;
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
const borders = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const noBorders = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

// ─── ヘルパー ──────────────────────────────────────────────────

function p(text: string, opts: { bold?: boolean; size?: number; align?: typeof AlignmentType[keyof typeof AlignmentType] } = {}): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 20, font: "游明朝" })],
    alignment: opts.align,
  });
}

function emptyP(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: "" })] });
}

/** 単純なセル（ラベル用）*/
function labelCell(text: string, widthDxa: number): TableCell {
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    children: [p(text, { size: 18 })],
    borders,
    shading: { fill: "F5F5F5" },
    verticalAlign: VerticalAlign.CENTER,
  });
}

/** 値セル（複数行テキスト対応）*/
function valueCell(
  lines: string[],
  widthDxa: number,
  opts: { bold?: boolean; size?: number; colSpan?: number; vMerge?: "restart" | "continue" } = {}
): TableCell {
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    columnSpan: opts.colSpan,
    verticalMerge: opts.vMerge,
    children: lines.map((l) => p(l, { bold: opts.bold, size: opts.size })),
    borders,
    verticalAlign: VerticalAlign.CENTER,
  });
}

/** 写真セル（rowSpan 3用・RESTART/CONTINUE）*/
function photoRestart(photo?: Buffer): TableCell {
  const W = 1560; // DXA ≈ 2.76cm
  const H = 2100; // DXA ≈ 3.71cm（縦長）

  const children: Paragraph[] = photo
    ? [
        new Paragraph({
          children: [
            new ImageRun({
              data: photo,
              transformation: { width: W, height: H },
            } as never),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ]
    : [
        p("写真", { align: AlignmentType.CENTER }),
        p("（任意）", { size: 16, align: AlignmentType.CENTER }),
      ];

  return new TableCell({
    width: { size: CP, type: WidthType.DXA },
    verticalMerge: VerticalMergeType.RESTART as never,
    children,
    borders,
    verticalAlign: VerticalAlign.CENTER,
  });
}

function photoContinue(): TableCell {
  return new TableCell({
    width: { size: CP, type: WidthType.DXA },
    verticalMerge: VerticalMergeType.CONTINUE as never,
    children: [emptyP()],
    borders,
  });
}

// ─── 履歴書 Word 生成 ────────────────────────────────────────────

export async function generateResumeDocx(
  data: GeneratedData["resume"],
  photo?: Buffer
): Promise<Buffer> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日現在`;

  // 個人情報テーブル（テンプレートに忠実な8行4列構造）
  const personalTable = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CL, CV, CR, CP],
    rows: [
      // 行1: ふりがな | 名前よみ | 女/男 | 写真（rowSpan=3）
      new TableRow({
        children: [
          labelCell("ふりがな", CL),
          valueCell([data.name_kana], CV),
          valueCell([data.gender], CR),
          photoRestart(photo),
        ],
      }),
      // 行2: 氏名 | 氏名（大） | 印 | photo-cont
      new TableRow({
        height: { value: 900, rule: "exact" as never },
        children: [
          labelCell("氏　名", CL),
          valueCell([data.name], CV, { bold: true, size: 28 }),
          valueCell(["印"], CR),
          photoContinue(),
        ],
      }),
      // 行3: 生年月日 | birth | 空 | photo-cont
      new TableRow({
        children: [
          labelCell("生年月日", CL),
          valueCell([`${data.birth_date}生（満${data.age}歳）`], CV),
          valueCell([""], CR),
          photoContinue(),
        ],
      }),
      // 行4: ふりがな（住所） | address_kana | （自宅電話）← col3+col4結合
      new TableRow({
        children: [
          labelCell("ふりがな", CL),
          valueCell([data.address_kana], CV),
          valueCell(["（自宅電話）"], CR + CP, { colSpan: 2 }),
        ],
      }),
      // 行5: 現住所 | 〒postal\naddress | （携帯電話）\nphone
      new TableRow({
        height: { value: 700, rule: "atLeast" as never },
        children: [
          labelCell("現 住 所", CL),
          valueCell([`〒${data.postal_code}`, data.address], CV),
          valueCell(["（携帯電話）", data.phone], CR + CP, { colSpan: 2 }),
        ],
      }),
      // 行6: E-mail | email | phone番号
      new TableRow({
        children: [
          labelCell("E－mail", CL),
          valueCell([data.email], CV),
          valueCell([data.phone], CR + CP, { colSpan: 2 }),
        ],
      }),
      // 行7: ふりがな（連絡先） | 空 | （連絡先電話）
      new TableRow({
        children: [
          labelCell("ふりがな", CL),
          valueCell([""], CV),
          valueCell(["（連絡先電話）"], CR + CP, { colSpan: 2 }),
        ],
      }),
      // 行8: 連絡先 | （現住所以外...） ← col2+col3+col4結合
      new TableRow({
        children: [
          labelCell("連 絡 先", CL),
          valueCell(["〒　　　（現住所以外に連絡を希望する場合のみ記入）"], CV + CR + CP, {
            colSpan: 3,
          }),
        ],
      }),
    ],
  });

  // 学歴・職歴テーブル
  const careerTable = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CY, CM_W, CC],
    rows: [
      // ヘッダー
      new TableRow({
        children: [
          new TableCell({ width: { size: CY, type: WidthType.DXA }, children: [p("年", { align: AlignmentType.CENTER })], borders }),
          new TableCell({ width: { size: CM_W, type: WidthType.DXA }, children: [p("月", { align: AlignmentType.CENTER })], borders }),
          new TableCell({ width: { size: CC, type: WidthType.DXA }, children: [p("学歴・職歴（各別にまとめて書く）", { align: AlignmentType.CENTER })], borders }),
        ],
      }),
      // 学歴 セクション見出し
      new TableRow({
        children: [
          new TableCell({ width: { size: CY, type: WidthType.DXA }, children: [emptyP()], borders }),
          new TableCell({ width: { size: CM_W, type: WidthType.DXA }, children: [emptyP()], borders }),
          new TableCell({ width: { size: CC, type: WidthType.DXA }, children: [p("学歴", { align: AlignmentType.CENTER })], borders }),
        ],
      }),
      // 学歴行
      ...data.education.map(
        (e) =>
          new TableRow({
            children: [
              new TableCell({ width: { size: CY, type: WidthType.DXA }, children: [p(e.year, { align: AlignmentType.CENTER })], borders }),
              new TableCell({ width: { size: CM_W, type: WidthType.DXA }, children: [p(e.month, { align: AlignmentType.CENTER })], borders }),
              new TableCell({ width: { size: CC, type: WidthType.DXA }, children: [p(e.content)], borders }),
            ],
          })
      ),
      // 職歴 セクション見出し
      new TableRow({
        children: [
          new TableCell({ width: { size: CY, type: WidthType.DXA }, children: [emptyP()], borders }),
          new TableCell({ width: { size: CM_W, type: WidthType.DXA }, children: [emptyP()], borders }),
          new TableCell({ width: { size: CC, type: WidthType.DXA }, children: [p("職歴", { align: AlignmentType.CENTER })], borders }),
        ],
      }),
      // 職歴行
      ...data.career.map(
        (e) =>
          new TableRow({
            children: [
              new TableCell({ width: { size: CY, type: WidthType.DXA }, children: [p(e.year, { align: AlignmentType.CENTER })], borders }),
              new TableCell({ width: { size: CM_W, type: WidthType.DXA }, children: [p(e.month, { align: AlignmentType.CENTER })], borders }),
              new TableCell({ width: { size: CC, type: WidthType.DXA }, children: [p(e.content)], borders }),
            ],
          })
      ),
      // 以上
      new TableRow({
        children: [
          new TableCell({ width: { size: CY, type: WidthType.DXA }, children: [emptyP()], borders }),
          new TableCell({ width: { size: CM_W, type: WidthType.DXA }, children: [emptyP()], borders }),
          new TableCell({ width: { size: CC, type: WidthType.DXA }, children: [p("以上", { align: AlignmentType.RIGHT })], borders }),
        ],
      }),
      // 免許・資格 ヘッダー
      new TableRow({
        children: [
          new TableCell({ width: { size: CY, type: WidthType.DXA }, children: [p("年", { align: AlignmentType.CENTER })], borders }),
          new TableCell({ width: { size: CM_W, type: WidthType.DXA }, children: [p("月", { align: AlignmentType.CENTER })], borders }),
          new TableCell({ width: { size: CC, type: WidthType.DXA }, children: [p("免許・資格", { align: AlignmentType.CENTER })], borders }),
        ],
      }),
      // 資格行
      ...data.qualifications.map(
        (e) =>
          new TableRow({
            children: [
              new TableCell({ width: { size: CY, type: WidthType.DXA }, children: [p(e.year, { align: AlignmentType.CENTER })], borders }),
              new TableCell({ width: { size: CM_W, type: WidthType.DXA }, children: [p(e.month, { align: AlignmentType.CENTER })], borders }),
              new TableCell({ width: { size: CC, type: WidthType.DXA }, children: [p(e.content)], borders }),
            ],
          })
      ),
      // 以上
      new TableRow({
        children: [
          new TableCell({ width: { size: CY, type: WidthType.DXA }, children: [emptyP()], borders }),
          new TableCell({ width: { size: CM_W, type: WidthType.DXA }, children: [emptyP()], borders }),
          new TableCell({ width: { size: CC, type: WidthType.DXA }, children: [p("以上", { align: AlignmentType.RIGHT })], borders }),
        ],
      }),
    ],
  });

  // テキストブロック（特技・志望動機・希望欄）共通ヘルパー
  function textBlockTable(label: string, body: string): Table {
    return new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                p(label, { bold: true, size: 20 }),
                emptyP(),
                ...body.split("\n").map((l) => p(l, { size: 20 })),
              ],
              borders,
            }),
          ],
        }),
      ],
    });
  }

  // 通勤・家族 テーブル（5列）
  const C1 = 1400, C2 = 2800, C3 = 2066, C4 = 1700, C5 = 2500;
  const familyTable = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [C1, C2, C3, C4, C5],
    rows: [
      new TableRow({
        children: [
          new TableCell({ width: { size: C1, type: WidthType.DXA }, children: [p("通勤時間")], borders }),
          new TableCell({ width: { size: C2, type: WidthType.DXA }, children: [p(`約 ${data.commute_time}`)], borders }),
          new TableCell({ width: { size: C3, type: WidthType.DXA }, children: [p("扶養家族数", { align: AlignmentType.CENTER })], borders }),
          new TableCell({ width: { size: C4, type: WidthType.DXA }, children: [p("配偶者", { align: AlignmentType.CENTER })], borders }),
          new TableCell({ width: { size: C5, type: WidthType.DXA }, children: [p("配偶者の扶養義務", { align: AlignmentType.CENTER })], borders }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ width: { size: C1, type: WidthType.DXA }, children: [p("最寄り駅")], borders }),
          new TableCell({ width: { size: C2, type: WidthType.DXA }, children: [p(data.nearest_station || "　線　駅")], borders }),
          new TableCell({ width: { size: C3, type: WidthType.DXA }, children: [p(`（配偶者を除く）${data.dependents}人`, { align: AlignmentType.CENTER })], borders }),
          new TableCell({ width: { size: C4, type: WidthType.DXA }, children: [p(data.spouse, { align: AlignmentType.CENTER })], borders }),
          new TableCell({ width: { size: C5, type: WidthType.DXA }, children: [p(data.spouse_support, { align: AlignmentType.CENTER })], borders }),
        ],
      }),
    ],
  });

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: { font: "游明朝", size: 20 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN },
          },
        },
        children: [
          // タイトル
          new Paragraph({
            children: [new TextRun({ text: "履歴書", bold: true, size: 48, font: "游明朝" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: dateStr, size: 20, font: "游明朝" })],
            alignment: AlignmentType.RIGHT,
          }),

          // 個人情報テーブル
          personalTable,

          emptyP(),

          // 学歴・職歴テーブル
          careerTable,

          emptyP(),

          // 特技・趣味
          textBlockTable("特技・趣味・得意科目など", data.skills_hobbies),

          emptyP(),

          // 志望動機
          textBlockTable("志望動機", data.motivation),

          emptyP(),

          // 本人希望
          textBlockTable(
            "本人希望記入欄（特に給料・職種・勤務時間・勤務地・その他についての希望などがあれば記入）",
            data.preferred_conditions
          ),

          emptyP(),

          // 通勤・家族
          familyTable,
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

// ─── 職務経歴書 Word 生成 ────────────────────────────────────────

export async function generateWorkHistoryDocx(data: GeneratedData["work_history"]): Promise<Buffer> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日現在`;

  // 職務経験テーブル
  const EXP_PERIOD = 1800;
  const EXP_CONTENT = 8666;

  function sectionHeading(text: string): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({ text, bold: true, size: 22, underline: {}, font: "游明朝" }),
      ],
      spacing: { before: 200, after: 100 },
    });
  }

  function bodyText(text: string, indent = false): Paragraph {
    return new Paragraph({
      children: [new TextRun({ text: (indent ? "　" : "") + text, size: 20, font: "游明朝" })],
    });
  }

  function boldLabel(label: string, value: string): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({ text: label, bold: true, size: 20, font: "游明朝" }),
        new TextRun({ text: value, size: 20, font: "游明朝" }),
      ],
    });
  }

  const experienceRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: EXP_PERIOD, type: WidthType.DXA },
          children: [p("期間", { align: AlignmentType.CENTER })],
          borders,
          shading: { fill: "F5F5F5" },
        }),
        new TableCell({
          width: { size: EXP_CONTENT, type: WidthType.DXA },
          children: [p("業務内容", { align: AlignmentType.CENTER })],
          borders,
          shading: { fill: "F5F5F5" },
        }),
      ],
    }),
  ];

  for (const exp of data.experiences) {
    const bodyLines: Paragraph[] = [
      boldLabel("法人名称：", exp.company_name),
      ...(exp.business_type ? [boldLabel("事業内容：", exp.business_type)] : []),
      ...(exp.established ? [boldLabel("設立年：", exp.established)] : []),
      emptyP(),
      boldLabel("【概要】：", ""),
      ...exp.overview.split("\n").map((l) => bodyText(l, true)),
      emptyP(),
      boldLabel("【所属・役職】：", exp.position),
      emptyP(),
      boldLabel("【職務内容】：", ""),
      ...exp.duties.split("\n").map((l) => bodyText(l, true)),
      ...(exp.achievements
        ? [emptyP(), boldLabel("実績・取り組み：", ""), ...exp.achievements.split("\n").map((l) => bodyText(l, true))]
        : []),
    ];

    experienceRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: EXP_PERIOD, type: WidthType.DXA },
            children: [
              p(exp.period_start, { align: AlignmentType.CENTER }),
              p("｜", { align: AlignmentType.CENTER }),
              p(exp.period_end, { align: AlignmentType.CENTER }),
            ],
            borders,
            verticalAlign: VerticalAlign.TOP,
          }),
          new TableCell({
            width: { size: EXP_CONTENT, type: WidthType.DXA },
            children: bodyLines,
            borders,
          }),
        ],
      })
    );
  }

  const CW = 11200; // 職務経歴書は少し広いマージン

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: { font: "游明朝", size: 20 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, bottom: 1080, left: 1440, right: 1440 },
          },
        },
        children: [
          // タイトル
          new Paragraph({
            children: [new TextRun({ text: "職務経歴書", bold: true, size: 32, font: "游明朝" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),

          // 日付・氏名（右寄せ）
          new Paragraph({
            children: [new TextRun({ text: `${dateStr}　氏名　${data.name}`, size: 20, font: "游明朝" })],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 300 },
          }),

          // ■職務要約
          sectionHeading("■職務要約"),
          ...data.summary.split("\n").map((l) => bodyText(l)),

          emptyP(),

          // ■活かせる経験・資格・スキル
          sectionHeading("■活かせる経験・資格・スキル"),
          new Paragraph({
            children: [new TextRun({ text: "活かせる経験・知識：", bold: true, size: 20, font: "游明朝" })],
          }),
          ...data.skills.experience.split("\n").map((l) => bodyText(l, true)),
          emptyP(),
          boldLabel("保有資格：", ""),
          bodyText(data.skills.qualifications, true),
          emptyP(),
          boldLabel("PCスキル：", data.skills.pc_skills),

          emptyP(),

          // ■職務経験
          sectionHeading("■職務経験"),
          new Table({
            width: { size: CW, type: WidthType.DXA },
            columnWidths: [EXP_PERIOD, EXP_CONTENT],
            rows: experienceRows,
          }),

          emptyP(),

          // ■自己PR
          sectionHeading("■自己PR"),
          ...data.self_pr.split("\n").map((l) => bodyText(l)),

          emptyP(),

          // 以上
          new Paragraph({
            children: [new TextRun({ text: "以上", size: 20, font: "游明朝" })],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 200 },
          }),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
