import Anthropic from "@anthropic-ai/sdk";

export interface GeneratedData {
  resume: {
    name: string;
    name_kana: string;
    gender: string;
    birth_date: string;
    age: string;
    address_kana: string;
    postal_code: string;
    address: string;
    phone: string;
    email: string;
    education: Array<{ year: string; month: string; content: string }>;
    career: Array<{ year: string; month: string; content: string }>;
    qualifications: Array<{ year: string; month: string; content: string }>;
    commute_time: string;
    nearest_station: string;
    dependents: string;
    spouse: string;
    spouse_support: string;
    skills_hobbies: string;
    motivation: string;
    preferred_conditions: string;
  };
  work_history: {
    name: string;
    summary: string;
    skills: {
      experience: string;
      qualifications: string;
      pc_skills: string;
    };
    experiences: Array<{
      period_start: string;
      period_end: string;
      company_name: string;
      business_type: string;
      established: string;
      overview: string;
      position: string;
      duties: string;
      achievements: string;
    }>;
    self_pr: string;
  };
}

export async function generateDocuments(params: {
  transcript: string;
  existingResume: string;
  existingCv: string;
  toneResumes: string[];
  toneWorkHistories: string[];
  targetCompany: string;
  targetPosition: string;
  apiKey: string;
}): Promise<GeneratedData> {
  const client = new Anthropic({ apiKey: params.apiKey });

  const toneResumeText = params.toneResumes.slice(0, 2).join("\n\n---\n\n");
  const toneCvText = params.toneWorkHistories.slice(0, 2).join("\n\n---\n\n");

  const prompt = `あなたはキャリアアドバイザーのアシスタントです。以下の情報を元に、履歴書と職務経歴書を作成してください。

## トンマナ参考例（履歴書）
${toneResumeText || "（参考例なし）"}

## トンマナ参考例（職務経歴書）
${toneCvText || "（参考例なし）"}

## 求職者情報

### 面接・ヒアリング内容（文字起こし）
${params.transcript || "（提供なし）"}

### 既存の履歴書
${params.existingResume || "（提供なし）"}

### 既存の職務経歴書
${params.existingCv || "（提供なし）"}

${params.targetCompany ? `### 応募先企業：${params.targetCompany}` : ""}
${params.targetPosition ? `### 応募職種：${params.targetPosition}` : ""}

## 出力指示
上記のトンマナ参考例の文体・スタイル・構成を忠実に参考にして、以下をJSON形式のみで出力してください。

\`\`\`json
{
  "resume": {
    "name": "氏名",
    "name_kana": "ふりがな",
    "gender": "女",
    "birth_date": "1998年6月3日",
    "age": "27",
    "address_kana": "住所ふりがな",
    "postal_code": "000-0000",
    "address": "住所",
    "phone": "090-0000-0000",
    "email": "example@email.com",
    "education": [
      {"year": "2015", "month": "3", "content": "○○高等学校 入学"}
    ],
    "career": [
      {"year": "2020", "month": "4", "content": "○○株式会社 入社"},
      {"year": "2020", "month": "9", "content": "○○株式会社 退職"}
    ],
    "qualifications": [
      {"year": "2018", "month": "10", "content": "普通自動車第一種運転免許 取得"}
    ],
    "commute_time": "30分",
    "nearest_station": "",
    "dependents": "0",
    "spouse": "無",
    "spouse_support": "無",
    "skills_hobbies": "参考例のような丁寧な文章で特技・趣味を記述",
    "motivation": "参考例のような詳細で説得力のある志望動機を記述",
    "preferred_conditions": "貴社の規定に従います。"
  },
  "work_history": {
    "name": "氏名",
    "summary": "参考例のような職務要約を記述",
    "skills": {
      "experience": "参考例のような活かせる経験・知識を記述",
      "qualifications": "普通自動車第一種運転免許",
      "pc_skills": "Word、Excel、PowerPoint"
    },
    "experiences": [
      {
        "period_start": "2020年4月",
        "period_end": "2020年9月",
        "company_name": "○○株式会社",
        "business_type": "事業内容",
        "established": "2000年",
        "overview": "【概要】の内容",
        "position": "所属・役職",
        "duties": "【職務内容】の詳細",
        "achievements": "実績・取り組みの内容"
      }
    ],
    "self_pr": "参考例のような自己PRを記述"
  }
}
\`\`\`

重要なルール：
- 参考例のトンマナ（文体・丁寧さ・構成・表現）を忠実に踏襲すること
- 面接内容・既存書類から情報を正確に抽出すること
- 不明な情報は空文字または「XX」にすること
- 志望動機・自己PRは参考例のように詳細で説得力のある文章にすること
- 必ずJSON形式のみで返答すること（説明文は不要）`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = (message.content[0] as { type: string; text: string }).text;

  let jsonStr = responseText;
  if (responseText.includes("```json")) {
    jsonStr = responseText.split("```json")[1].split("```")[0].trim();
  } else if (responseText.includes("```")) {
    jsonStr = responseText.split("```")[1].split("```")[0].trim();
  }

  return JSON.parse(jsonStr) as GeneratedData;
}
