/**
 * openai.js
 * OpenAI GPT-4o API を使用してキャリア書類・求人マッチングを生成する
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/* ============================================================
   求人一覧データ（杜の都工房 取り扱い求人）
   ============================================================ */
const JOB_LISTINGS = `
【取り扱い求人一覧】

■ 事務・オフィスワーク系

1. マンパワーグループ株式会社【事務職】
   月給：16〜21万円 / 年収：200〜350万円
   勤務地：全国（自宅60分圏内）
   休日：土日祝休み / 年休120日
   残業：月5時間程度
   業務：データ入力・資料作成・電話対応・ファイリング
   特徴：未経験から事務職デビュー可。配属先の約8割が大手企業。

2. 株式会社リクルートスタッフィング【キャリアウィンク】事務職
   月給：20〜32.8万円 / 年収：280〜400万円
   勤務地：東京・神奈川・埼玉・千葉・愛知・大阪・兵庫・京都・宮城・福岡
   休日：土日祝休み / 年休120日以上
   残業：月20時間以内
   業務：データ入力・集計・資料作成・電話/メール対応・受発注業務
   特徴：リクルートグループ基盤。研修制度・キャリア支援あり。

3. アデコ株式会社【事務職（バックオフィス）】
   月給：非公開（要確認）
   勤務地：全国
   業務：一般事務・バックオフィス業務全般
   特徴：選考1回。未経験歓迎。個別研修＆初日有給あり。

■ 総合職・販売・接客系

4. 株式会社GREEN RIBBON STAFFING【総合職】
   月給：18.5〜30万円 / 年収：250〜400万円
   勤務地：全国（希望エリア考慮）
   休日：完全週休2日制 / 年休120日
   残業：月10時間程度
   業務：販売・事務・ホテルフロント・カスタマーサポートなど（適性に応じて選択）
   特徴：未経験歓迎。ジョブチェンジ可。社宅制度（家具家電付き）あり。

■ 施工管理系

5. 株式会社BREXA Engineering（旧：共同エンジニアリング）【施工管理】
   月給：22万円〜（想定月収28.5万円以上）/ 年収：350〜540万円
   勤務地：全国
   休日：土日祝休み / 年休120日
   残業：月20〜40時間
   業務：建設プロジェクトの進捗管理・現場写真・書類作成・CAD図面修正
   特徴：未経験から施工管理スキルを習得。国家資格取得サポートあり。定着率91%。

6. 日研トータルソーシング株式会社【施工管理】
   月給：32〜40万円（未経験21万円〜）/ 年収：400〜850万円
   勤務地：北海道・東北等の全国プロジェクト先
   休日：土日休み / 年休120日
   残業：現場による（残業手当100%支給）
   業務：建設プロジェクト進行管理・書類作成・職人への指示・スケジュール調整
   特徴：未経験可。大手ゼネコン案件（鹿島建設・大林組等）多数。研修施設・社宅あり。

7. 株式会社アーキ・ジャパン【施工管理】
   月給：21〜24万円 / 年収：350〜400万円
   勤務地：全国のプロジェクト先
   休日：土日休み / 年休120日
   残業：月20時間程度
   業務：建設プロジェクト進捗管理・スケジュール作成・CADサポート・打ち合わせ
   特徴：東京タワー・大型商業施設等の実績あり。研修制度・資格取得支援。

8. 株式会社オープンアップコンストラクション【施工管理】
   月給：26〜36万円 / 年収：330〜550万円
   勤務地：全国
   休日：土日祝休み / 年休120日
   残業：月20時間以内
   業務：建設プロジェクト進行サポート・スケジュール管理・安全チェック・書類作成
   特徴：ホワイト企業認定「GOLD」。大手上場グループで安定環境。

9. 株式会社コプロコンストラクション【施工管理】
   月給：26〜30万円 / 年収：350〜450万円
   勤務地：全国（通勤圏内のプロジェクト）
   休日：土日祝休み / 年休125日
   残業：月10時間程度
   業務：建設プロジェクトのスケジュール管理・現場スタッフ指示・品質・安全管理
   特徴：大手ゼネコン案件多数。研修制度充実。

■ 営業・販売系

10. 株式会社IDOM（ガリバー）【中古車営業】
    月給：30〜35万円 / 年収：360〜420万円
    勤務地：全国のガリバー店舗
    休日：シフト制 / 年休120日
    残業：月20時間以内
    業務：中古車提案（完全反響営業）・買取査定・自動車保険・保証サービス提案
    特徴：飛び込み営業なし。インセンティブ制度あり。東証プライム上場。最短1年で正社員登用可。

11. 株式会社はなまる【買取営業（法人）】
    月給：27.5〜29.5万円 / 年収：330〜400万円
    勤務地：東京・大阪・神奈川・埼玉・愛知・宮城・福岡ほか全国
    休日：土日祝休み / 年休120日以上
    残業：月20〜40時間
    業務：自動車修理工場・ディーラーへの訪問営業・事故車・災害車の査定・買取
    特徴：約1ヶ月研修あり。法人営業で営業しやすい環境。入社1年で月収50万円以上の可能性。

12. 株式会社翔陽【買取営業（個人）】
    月給：20〜100万円 / 年収：240〜2000万円
    勤務地：東京・神奈川・愛知・福岡・宮城・広島・愛媛
    休日：土日休み / 年休115日
    残業：月20時間以内
    業務：個人宅訪問・ブランド品・アクセサリー等の査定依頼受付・査定員としての査定業務
    特徴：未経験90%以上。高インセンティブ（年間平均250万円）。入社2ヶ月で月収49万円の実績あり。
`;

/* ============================================================
   システムプロンプト
   ============================================================ */
const SYSTEM_PROMPT = `あなたは日本の転職エージェント「杜の都工房」の最上級キャリアアドバイザーAIです。
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
以下の求人一覧から候補者に最適な求人を2〜4件選んで job_suggestions に出力する。
選定基準：スキル適合度・キャリアゴール・年収希望・勤務条件・ポテンシャル

${JOB_LISTINGS}

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
        "match_reasons": ["マッチ理由1（候補者のスキル・経験との接点）", "マッチ理由2", "マッチ理由3"],
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
  parts.push('- 求人提案（job_suggestions）は求人一覧から2〜4件選び、各求人の年収・勤務時間・キャリアパスを具体的に説明してください。');
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
          { role: 'system', content: SYSTEM_PROMPT },
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
