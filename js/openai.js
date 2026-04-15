/**
 * openai.js
 * OpenAI GPT-4o API を使用して履歴書・職務経歴書を生成する
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/* ============================================================
   システムプロンプト
   ============================================================ */
const SYSTEM_PROMPT = `あなたは日本の転職エージェントの最上級キャリアアドバイザーAIです。
面談の文字起こしと既存書類から情報を精密に抽出し、実際に企業へ提出できるクオリティの転職書類を生成してください。

╔══════════════════════════════════════╗
║  履歴書・職務経歴書 生成ルール        ║
╚══════════════════════════════════════╝

【基本方針】
- 面談テキスト・既存書類から情報を正確に抽出する（不明な項目は空欄、絶対に捏造しない）
- 「企業に提出できる最終成果物」のクオリティで生成する
- 応募職種が指定されている場合、その職種に最適化された志望動機・自己PR・職務経歴を生成する

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

【職種別の最適化ルール】
応募職種に応じて以下を意識する：
- 施工管理・建設：安全管理、工程管理、資格（施工管理技士等）を強調
- 営業：売上実績、顧客対応、新規開拓の成果を数値で表現
- 事務・経理：正確性、効率化、使用ソフト（Excel等）のスキルを強調
- IT・エンジニア：使用言語・フレームワーク、プロジェクト規模、技術スキルを詳述
- 製造・工場：品質管理、改善提案、生産性向上の実績
- 医療・介護：資格、患者/利用者対応、チーム連携の実績
- 接客・販売：顧客満足度、売上貢献、リピート率
- その他の職種：業界特有のキーワードと求められるスキルを反映

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

  const parts = [];
  parts.push('以下の情報をもとに、指定されたJSON構造で履歴書・職務経歴書を生成してください。');
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
  parts.push('- 必ず有効なJSONのみを返してください（マークダウンコードブロック不使用）。');

  const userPrompt = parts.join('\n');

  try {
    const requestBody = {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.45,
      max_tokens: 6000,
    };

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
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
