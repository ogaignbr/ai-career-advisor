/**
 * openai.js
 * OpenAI GPT-4o API を使用してキャリア書類・求人マッチングを生成する
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/* ============================================================
   求人一覧データの読み込み
   1) js/job-data.json（確実に動作する ASCII ファイル名）
   2) 求人情報_業種別まとめ.txt（日本語ファイル名、ローカル用）
   ============================================================ */
const JOB_DATA_JSON = 'js/job-data.json';
const JOB_LISTINGS_TXT = '求人情報_業種別まとめ.txt';

let jobListingsCache = null;
let jobListingsLoadPromise = null;

async function loadJobListingsText() {
  if (jobListingsCache) return jobListingsCache;
  if (jobListingsLoadPromise) return jobListingsLoadPromise;

  jobListingsLoadPromise = (async () => {
    const base = window.location.href;

    // 1) まず ASCII ファイル名の JSON を試す（GitHub Pages で確実に動作）
    try {
      const url1 = new URL(JOB_DATA_JSON, base).href;
      const res1 = await fetch(url1);
      if (!res1.ok) throw new Error(String(res1.status));
      const data = await res1.json();
      jobListingsCache = typeof data === 'string' ? data : JSON.stringify(data);
      return jobListingsCache;
    } catch (e1) {
      console.warn('[CA] job-data.json 取得失敗:', e1?.message || e1);
    }

    // 2) テキストファイルを試す（ローカルサーバー向け）
    try {
      const url2 = new URL(encodeURIComponent(JOB_LISTINGS_TXT), base).href;
      const res2 = await fetch(url2);
      if (!res2.ok) throw new Error(String(res2.status));
      jobListingsCache = await res2.text();
      return jobListingsCache;
    } catch (e2) {
      console.warn('[CA] テキスト取得も失敗:', e2?.message || e2);
    }

    throw new Error(
      '求人データを読み込めませんでした。ページを再読み込みしてください。'
    );
  })();

  return jobListingsLoadPromise;
}

function buildSystemPrompt(jobListingsText) {
  return SYSTEM_PROMPT_HEAD + jobListingsText + SYSTEM_PROMPT_TAIL;
}

/* ============================================================
   システムプロンプト（固定部＋求人テキストで動的結合）
   ============================================================ */
const SYSTEM_PROMPT_HEAD = `あなたは日本の転職エージェント「杜の都工房」の最上級キャリアアドバイザーAIです。
面談の文字起こしと既存書類から情報を精密に抽出し、実際に企業へ提出できるクオリティの転職書類と、
数値・引用・視覚的要素を駆使した深いキャリアアドバイスを生成してください。

╔══════════════════════════════════════╗
║  履歴書・職務経歴書 生成ルール        ║
╚══════════════════════════════════════╝

【基本方針】
- 面談テキスト・既存書類から情報を正確に抽出する（不明な項目は空欄、絶対に捏造しない）
- 「企業に提出できる最終成果物」のクオリティで生成する

【志望動機（resume.motivation）— 重要・詳細に書くこと】
以下の3部構成で400〜600字程度の詳細な文章を生成する：
① 応募先企業・職種への具体的な関心・共感（企業の特徴・理念・事業に言及）
② 候補者のこれまでの経験・スキルとの接点（具体的な経験を1〜2つ引用）
③ 入社後に実現したいこと・貢献できること（数値目標や具体的な貢献イメージを含む）
※応募先が未指定の場合は、候補者の経歴・志向に最も合致する職種に向けた汎用的な志望動機を生成する

【自己PR（work_history.self_pr）— 重要・詳細に書くこと】
以下の構成で500〜700字程度の詳細な文章を生成する：
① リード文：自分の最大の強み・特長を1文で表現
② エピソード1：強みを裏付ける具体的な経験（STAR形式：状況→課題→行動→結果。数値があれば必ず含める）
③ エピソード2：別の角度から強みを示す経験（可能な限りもう1つ）
④ 締め：応募先でどう活かすかの一言
※「〜です。〜ます。」の丁寧語で記述する

【職務経歴書の duties・achievements — 詳細に書くこと】
- duties：箇条書き形式で業務内容を5〜8項目列挙（・記号で始める）
- achievements：数値を使った具体的な成果を2〜4項目（例：「売上目標120%達成」「作業工数を30%削減」等）

【職務要約（work_history.summary）】
- 2〜4文で候補者のキャリアをコンパクトに紹介
- 職種・業界・年数・強みを盛り込む

╔══════════════════════════════════════╗
║  キャリアアドバイス 生成ルール        ║
╚══════════════════════════════════════╝

【求人マッチング分析】
以下のテキストは「求人情報_業種別まとめ.txt」の内容に相当します。各求人ブロックには【会社概要】【求人内容】【求職者へのアピールポイント】【求人URL】が含まれます。
この一覧から候補者に最適な求人を必ず3件選び、job_suggestions に出力してください（3件未満・超過は不可）。
選定基準：スキル適合度・キャリアゴール・年収希望・勤務条件・ポテンシャル

--- 求人データここから ---

`;

const SYSTEM_PROMPT_TAIL = `

--- 求人データここまで ---

【求人マッチング時の出力ルール】
- job_suggestions は必ず3要素の配列とする（rank 1〜3）。
- 面談テキスト・メモがある場合は、why_fit_for_candidate と closing_to_candidate に実際の発言や志向に触れる（捏造しない）。
- why_fit_for_candidate：なぜこの会社・職種がこの候補者に向いているかを、面談の内容を踏まえて2〜4文で書く。
- why_recommend：転職エージェントとして、なぜこの求人をおすすめするかを1〜3文で書く。
- match_reasons：おすすめの要点を箇条書きで2〜4項目（各一言〜二言）。
- appeal_points：同じ求人の【求職者へのアピールポイント】から候補者に刺さるものを2〜4個選び、原文を活かして短く整える（捏造しない）。
- closing_to_candidate：候補者へのクロージングの言葉。共感・励まし・次の一歩（応募検討、説明会など）を丁寧語で2〜4文。
- skill_career_message：手に職・スキルアップ・キャリアアップ・将来の選択肢など、この求人で得られる成長やキャリアの広がりを1〜3文で書く。
- 年収・勤務地・休日・残業は【求人内容】の記載に合わせる。

【key_quotes】
面談テキストから候補者の実際の発言を3〜5件引用する（発言がない場合は空配列）。
引用は一字一句正確に。意味のある発言のみ選ぶ。

【キャリアアドバイスの観点】
- 数値（年収レンジ・在籍期間・転職回数・スキル数等）を必ず含める
- 具体的なキャリアパス（3年後・5年後）を提示する
- ワークライフバランス・勤務時間についても言及する

╔══════════════════════════════════════╗
║  出力 JSON 構造（厳守）               ║
╚══════════════════════════════════════╝

必ず以下の構造に厳密に従ったJSONのみを返してください（コードブロック・前置きテキスト不要）:

{
  "resume": {
    "name": "氏名",
    "name_kana": "フリガナ（ひらがな）",
    "gender": "男性 または 女性",
    "birth_date": "生年月日（例：1990年5月15日）",
    "age": "年齢（数字のみ）",
    "address": "都道府県から始まる住所",
    "phone": "電話番号",
    "email": "メールアドレス",
    "education": [{"year": "西暦年（4桁）", "month": "月（1〜12）", "content": "学歴内容"}],
    "career": [{"year": "西暦年（4桁）", "month": "月（1〜12）", "content": "職歴内容"}],
    "qualifications": [{"year": "西暦年（4桁）", "month": "月（1〜12）", "content": "資格・免許名"}],
    "skills_hobbies": "特技・趣味（100〜150字程度）",
    "motivation": "志望動機（400〜600字の3部構成。改行には\\nを使用）"
  },
  "work_history": {
    "name": "氏名",
    "summary": "職務要約（2〜4文、150〜250字。改行には\\nを使用）",
    "skills": {
      "experience": "活かせる経験（3〜5項目を箇条書き、改行には\\nを使用）",
      "qualifications": "保有資格（カンマ区切り）",
      "pc_skills": "PCスキル（ソフト名・レベルを記載、カンマ区切り）"
    },
    "experiences": [
      {
        "period_start": "入社年月（例：2018年4月）",
        "period_end": "退社年月または現在（例：2022年3月、または現在）",
        "company_name": "会社名",
        "business_type": "業種・業界",
        "established": "設立年（不明なら空欄）",
        "overview": "会社概要（50〜80字）",
        "position": "所属部署・役職・職種",
        "duties": "担当業務（・で始まる箇条書き5〜8項目、各項目は改行\\nで区切る）",
        "achievements": "主な実績・成果（数値を含む2〜4項目、改行\\nで区切る）"
      }
    ],
    "self_pr": "自己PR（500〜700字の4部構成。改行には\\nを使用）"
  },
  "career_advice": {
    "summary": "候補者の総合評価サマリー（3〜4文、具体的な数値や強みを含む）",
    "overall_score": 75,
    "score_breakdown": [
      {"category": "専門スキル・経験", "score": 80, "max": 100, "comment": "根拠を含む評価コメント（40〜60字）"},
      {"category": "コミュニケーション力", "score": 75, "max": 100, "comment": "根拠を含む評価コメント"},
      {"category": "ポテンシャル・成長性", "score": 85, "max": 100, "comment": "根拠を含む評価コメント"},
      {"category": "安定性・継続性", "score": 70, "max": 100, "comment": "根拠を含む評価コメント"},
      {"category": "志望度・熱意", "score": 80, "max": 100, "comment": "根拠を含む評価コメント"}
    ],
    "key_metrics": [
      {"label": "転職回数", "value": "2回", "sub": "同世代平均との比較コメント", "icon": "📊"},
      {"label": "最長在籍期間", "value": "4年2ヶ月", "sub": "長期就業の評価", "icon": "📅"},
      {"label": "保有スキル数", "value": "5種", "sub": "業務で活かせるスキル評価", "icon": "🛠️"},
      {"label": "想定年収レンジ", "value": "280〜380万円", "sub": "現在の市場価値見込み", "icon": "💰"}
    ],
    "key_quotes": [
      {
        "quote": "面談での実際の発言をそのまま引用",
        "context": "この発言が示す候補者の特性・強み・課題",
        "highlight_type": "strength（強み）/ weakness（課題）/ neutral（中立）のいずれか"
      }
    ],
    "skills_radar": [
      {"skill": "コミュニケーション", "score": 80},
      {"skill": "問題解決力", "score": 70},
      {"skill": "チームワーク", "score": 85},
      {"skill": "専門知識", "score": 75},
      {"skill": "積極性・主体性", "score": 78},
      {"skill": "適応力", "score": 72}
    ],
    "career_timeline": [
      {"period": "例：2018年4月〜2022年3月", "company": "会社名", "role": "役職・職種", "highlight": "主な実績・転換点（30〜50字）"}
    ],
    "strengths": [
      {
        "title": "強みのタイトル（10〜20字）",
        "detail": "具体的な説明（50〜80字）",
        "evidence": "面談での根拠となる発言または実績"
      }
    ],
    "growth_areas": [
      {
        "title": "課題・改善ポイントのタイトル",
        "detail": "具体的な課題の説明（50〜80字）",
        "advice": "具体的な改善アドバイス（50〜80字）"
      }
    ],
    "recommendations": [
      {
        "priority": "high / medium / low のいずれか",
        "title": "アクションアイテムのタイトル",
        "detail": "具体的な内容・理由（50〜100字）",
        "timing": "今すぐ / 1週間以内 / 面接準備期間中 / 入社前"
      }
    ],
    "job_suggestions": [
      {
        "rank": 1,
        "company": "会社名",
        "position": "職種名",
        "match_score": 88,
        "monthly_salary": "月給：○○〜○○万円",
        "annual_salary": "年収：○○〜○○万円",
        "location": "勤務地",
        "holiday": "休日・休暇",
        "overtime": "残業時間",
        "career_path": "3〜5年後のキャリアパス（具体的に50〜80字）",
        "why_fit_for_candidate": "面談の内容を踏まえ、なぜこの求人がこの候補者に向いているか（2〜4文）",
        "why_recommend": "エージェントとしてなぜこの求人をおすすめするか（1〜3文）",
        "match_reasons": ["おすすめ要点1", "おすすめ要点2", "おすすめ要点3"],
        "appeal_points": ["求人情報の『求職者へのアピールポイント』から2〜4個", "…"],
        "closing_to_candidate": "求職者へのクロージングの言葉（励まし・次の一歩。2〜4文）",
        "skill_career_message": "手に職・スキルアップ・キャリアアップ等の成長観点（1〜3文）",
        "work_style": "勤務スタイル・働き方の特徴（30〜50字）",
        "skill_growth": "習得できるスキル・成長機会（30〜50字）",
        "caution": "注意点・ミスマッチリスク（あれば）"
      }
    ],
    "job_match": {
      "score": 82,
      "reasons": ["マッチ理由1", "マッチ理由2"],
      "concerns": ["懸念点1"]
    },
    "career_vision": {
      "short_term": "3年後の目指すべき姿・目標（50〜80字）",
      "mid_term": "5年後のキャリアビジョン（50〜80字）",
      "salary_potential": "5年後の想定年収（根拠を含む）"
    }
  }
}`;

/* ============================================================
   generateCareerDocuments
   ============================================================ */
async function generateCareerDocuments(params) {
  const { apiKey, transcript, existingResume, existingCv, targetCompany, targetPosition } = params;

  if (!apiKey) {
    throw new Error('OpenAI APIキーが設定されていません。設定ボタンからAPIキーを入力してください。');
  }

  const jobListingsText = await loadJobListingsText();
  const systemPrompt = buildSystemPrompt(jobListingsText);

  /* ユーザープロンプト組み立て */
  const parts = [];

  parts.push('以下の情報をもとに、指定されたJSON構造で書類・キャリアアドバイスを生成してください。');
  parts.push('');

  if (targetCompany || targetPosition) {
    parts.push('【応募情報】');
    if (targetCompany) parts.push(`応募先企業名: ${targetCompany}`);
    if (targetPosition) parts.push(`応募職種: ${targetPosition}`);
    parts.push('');
  }

  if (transcript && transcript.trim()) {
    parts.push('【面談内容の文字起こし・メモ】');
    parts.push(transcript.trim());
    parts.push('');
  }

  if (existingResume && existingResume.trim()) {
    parts.push('【既存の履歴書（PDFから抽出したテキスト）】');
    parts.push(existingResume.trim());
    parts.push('');
  }

  if (existingCv && existingCv.trim()) {
    parts.push('【既存の職務経歴書（PDFから抽出したテキスト）】');
    parts.push(existingCv.trim());
    parts.push('');
  }

  parts.push('【出力要件】');
  parts.push('- 志望動機は3部構成で400〜600字の詳細な文章にしてください。');
  parts.push('- 自己PRは4部構成で500〜700字、STAR形式のエピソードを含めてください。');
  parts.push('- 職務経歴の担当業務は箇条書き5〜8項目で詳細に記載してください。');
  parts.push('- 求人提案（job_suggestions）は「求人情報_業種別まとめ」から必ず3件選び、why_fit_for_candidate（向いている理由）・why_recommend（おすすめ理由）・closing_to_candidate（クロージング）・skill_career_message（手に職・スキルアップ・キャリアアップ）・appeal_points を出力し、年収・勤務時間・キャリアパスを具体的に説明してください。');
  parts.push('- 面談テキストがある場合は実際の発言を3〜5件 key_quotes に引用してください。');
  parts.push('- 必ず有効なJSONのみを返してください（マークダウンコードブロック不使用）。');

  const userPrompt = parts.join('\n');

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.45,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err?.error?.message || `HTTPエラー: ${response.status}`;
      if (response.status === 401) throw new Error('APIキーが無効です。正しいOpenAI APIキーを設定してください。');
      if (response.status === 429) throw new Error('APIの利用制限に達しました。しばらく待ってから再試行してください。');
      if (response.status >= 500)  throw new Error('OpenAIサーバーで問題が発生しています。しばらく待ってから再試行してください。');
      throw new Error(`APIエラー: ${msg}`);
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message) throw new Error('APIからの応答が不正な形式です。');

    let content = data.choices[0].message.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new Error('AIの応答をJSONとして解析できませんでした。もう一度お試しください。');
      }
    }

    return validateAndFillDefaults(parsed);

  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('ネットワーク接続を確認してください。');
    }
    throw error;
  }
}

/* ============================================================
   validateAndFillDefaults
   ============================================================ */
function validateAndFillDefaults(data) {
  if (!data.resume) data.resume = {};
  data.resume = {
    name: '', name_kana: '', gender: '', birth_date: '', age: '',
    address: '', phone: '', email: '',
    education: [], career: [], qualifications: [],
    skills_hobbies: '', motivation: '',
    ...data.resume,
  };

  if (!data.work_history) data.work_history = {};
  data.work_history = {
    name: '', summary: '',
    skills: { experience: '', qualifications: '', pc_skills: '' },
    experiences: [], self_pr: '',
    ...data.work_history,
  };
  if (!data.work_history.skills) {
    data.work_history.skills = { experience: '', qualifications: '', pc_skills: '' };
  }

  if (!data.career_advice) data.career_advice = {};
  data.career_advice = {
    summary: '', overall_score: 70,
    score_breakdown: [
      { category: '専門スキル・経験',   score: 70, max: 100, comment: '' },
      { category: 'コミュニケーション力', score: 70, max: 100, comment: '' },
      { category: 'ポテンシャル・成長性', score: 70, max: 100, comment: '' },
      { category: '安定性・継続性',      score: 70, max: 100, comment: '' },
      { category: '志望度・熱意',        score: 70, max: 100, comment: '' },
    ],
    key_metrics: [],
    key_quotes: [],
    skills_radar: [
      { skill: 'コミュニケーション', score: 70 },
      { skill: '問題解決力',        score: 70 },
      { skill: 'チームワーク',      score: 70 },
      { skill: '専門知識',          score: 70 },
      { skill: '積極性・主体性',    score: 70 },
      { skill: '適応力',            score: 70 },
    ],
    career_timeline: [],
    strengths: [], growth_areas: [], recommendations: [],
    job_suggestions: [],
    job_match: { score: 70, reasons: [], concerns: [] },
    career_vision: { short_term: '', mid_term: '', salary_potential: '' },
    ...data.career_advice,
  };

  if (Array.isArray(data.career_advice.job_suggestions)) {
    data.career_advice.job_suggestions = data.career_advice.job_suggestions.map((j) => ({
      ...j,
      appeal_points: Array.isArray(j.appeal_points) ? j.appeal_points : [],
      why_fit_for_candidate: j.why_fit_for_candidate != null ? String(j.why_fit_for_candidate) : '',
      why_recommend: j.why_recommend != null ? String(j.why_recommend) : '',
      closing_to_candidate: j.closing_to_candidate != null ? String(j.closing_to_candidate) : '',
      skill_career_message: j.skill_career_message != null ? String(j.skill_career_message) : '',
    }));
  }

  return data;
}

/* ============================================================
   reviseDocument
   書類の特定フィールドをAI指示で修正する
   ============================================================ */
async function reviseDocument({ apiKey, docType, currentData, instruction, targetCompany, targetPosition }) {
  if (!apiKey) throw new Error('APIキーが設定されていません。');

  const isResume = docType === 'resume';
  const docLabel = isResume ? '履歴書' : '職務経歴書';

  const sysPrompt = `あなたは日本の転職エージェントのキャリアアドバイザーAIです。
ユーザーの修正指示に従い、${docLabel}データを修正してください。

ルール：
- 指示に関連する項目のみ修正し、その他のフィールドは元のデータをそのまま返す
- 日本語・敬体（です・ます調）を維持する
- 返却するJSONのキー名は元のデータと完全に同じにする
- ${isResume ? '"resume" キーを持つJSONオブジェクトを返す' : '"work_history" キーを持つJSONオブジェクトを返す'}
- コードブロックや前置きテキストは不要`;

  const userMsg = [
    `【現在の${docLabel}データ（JSON）】`,
    JSON.stringify(currentData, null, 2),
    '',
    '【修正指示】',
    instruction.trim(),
    ...(targetCompany  ? [`【応募先企業】${targetCompany}`]  : []),
    ...(targetPosition ? [`【応募職種】${targetPosition}`]   : []),
  ].join('\n');

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user',   content: userMsg  },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `HTTPエラー: ${res.status}`;
    if (res.status === 401) throw new Error('APIキーが無効です。');
    if (res.status === 429) throw new Error('APIの利用制限に達しました。しばらく待ってから再試行してください。');
    throw new Error(`APIエラー: ${msg}`);
  }

  const apiData = await res.json();
  let content = apiData.choices[0].message.content;
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    parsed = JSON.parse(content);
  }

  return isResume
    ? (parsed.resume        ?? parsed)
    : (parsed.work_history  ?? parsed);
}
