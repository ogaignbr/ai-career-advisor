"use client";

import { useState, useRef } from "react";

interface Experience {
  period_start: string;
  period_end: string;
  company_name: string;
  business_type: string;
  established: string;
  overview: string;
  position: string;
  duties: string;
  achievements: string;
}

interface GeneratedData {
  resume: {
    name: string;
    name_kana: string;
    gender: string;
    birth_date: string;
    age: string;
    address: string;
    phone: string;
    email: string;
    education: Array<{ year: string; month: string; content: string }>;
    career: Array<{ year: string; month: string; content: string }>;
    qualifications: Array<{ year: string; month: string; content: string }>;
    skills_hobbies: string;
    motivation: string;
  };
  work_history: {
    name: string;
    summary: string;
    skills: { experience: string; qualifications: string; pc_skills: string };
    experiences: Experience[];
    self_pr: string;
  };
}

export default function Home() {
  // Settings
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Inputs
  const [transcript, setTranscript] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [targetPosition, setTargetPosition] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState<GeneratedData | null>(null);
  const [resumeDocxB64, setResumeDocxB64] = useState("");
  const [cvDocxB64, setCvDocxB64] = useState("");
  const [activeTab, setActiveTab] = useState<"resume" | "cv">("resume");

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (file: File | null) => {
    setPhotoFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    } else {
      setPhotoPreview("");
    }
  };

  const handleGenerate = async () => {
    if (!apiKey) { setError("Anthropic APIキーを設定してください"); return; }
    if (!transcript && !resumeFile && !cvFile) {
      setError("文字起こしテキスト、または既存書類（PDF）を入力してください");
      return;
    }
    setLoading(true);
    setError("");
    setGenerated(null);

    try {
      const fd = new FormData();
      fd.append("apiKey", apiKey);
      fd.append("transcript", transcript);
      fd.append("targetCompany", targetCompany);
      fd.append("targetPosition", targetPosition);
      if (resumeFile) fd.append("resumeFile", resumeFile);
      if (cvFile) fd.append("cvFile", cvFile);
      if (photoFile) fd.append("photoFile", photoFile);

      const res = await fetch("/api/generate", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setGenerated(data.generated);
      setResumeDocxB64(data.resumeDocx);
      setCvDocxB64(data.cvDocx);
    } catch (e) {
      setError(`生成エラー: ${e instanceof Error ? e.message : e}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadDocx = (b64: string, filename: string) => {
    const blob = new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const name = generated?.resume.name || "氏名";
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">📄 書類作成アシスタント</h1>
          <p className="text-sm text-gray-500">キャリアアドバイザー向け 履歴書・職務経歴書 自動生成</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          ⚙️ API設定
        </button>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">API設定</h2>
          <div className="max-w-sm">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Anthropic API Key <span className="text-red-500">（必須）</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowSettings(false)}
            className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            保存して閉じる
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">📥 入力情報</h2>

          {/* Target info */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-600">応募情報（任意）</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">応募先企業名</label>
                <input
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="○○株式会社"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">応募職種</label>
                <input
                  type="text"
                  value={targetPosition}
                  onChange={(e) => setTargetPosition(e.target.value)}
                  placeholder="事務職"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          </div>

          {/* Transcript */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-600">📝 面談内容テキスト</h3>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="面談の文字起こしテキストをここに貼り付けてください..."
              rows={8}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          {/* Existing docs + Photo */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-600">📎 添付ファイル（任意）</h3>

            {/* Photo upload */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">🖼️ 証明写真（PNG / JPG）</label>
              <div className="flex items-center gap-4">
                {/* Preview */}
                <div
                  onClick={() => photoInputRef.current?.click()}
                  className="w-20 h-28 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition overflow-hidden flex-shrink-0"
                >
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
                  />
                  {photoPreview ? (
                    <img src={photoPreview} alt="証明写真" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-gray-400">
                      <p className="text-2xl">+</p>
                      <p className="text-xs">写真</p>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>クリックして写真を選択</p>
                  <p className="text-gray-400">履歴書の右上に<br />適切なサイズで挿入されます</p>
                  {photoFile && (
                    <p className="text-blue-600">✅ {photoFile.name}</p>
                  )}
                  {photoFile && (
                    <button
                      onClick={() => handlePhotoChange(null)}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      削除
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-3">
              {/* Existing resume */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">既存の履歴書（PDF）</label>
                <div
                  onClick={() => resumeInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
                >
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  />
                  {resumeFile ? (
                    <p className="text-sm text-blue-600">✅ {resumeFile.name}</p>
                  ) : (
                    <p className="text-sm text-gray-400">クリックしてPDFを選択</p>
                  )}
                </div>
              </div>

              {/* Existing CV */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">既存の職務経歴書（PDF）</label>
                <div
                  onClick={() => cvInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
                >
                  <input
                    ref={cvInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                  />
                  {cvFile ? (
                    <p className="text-sm text-blue-600">✅ {cvFile.name}</p>
                  ) : (
                    <p className="text-sm text-gray-400">クリックしてPDFを選択</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              ⚠️ {error}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !apiKey}
            className="w-full py-3 text-base font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            {loading ? "✨ 生成中（1〜2分）..." : "✨ 書類を自動生成する"}
          </button>
          {!apiKey && (
            <p className="text-xs text-center text-gray-400">
              ⬆️ 右上の「API設定」からAnthropicのAPIキーを入力してください
            </p>
          )}
        </div>

        {/* Right: Output */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">📤 生成された書類</h2>

          {loading && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500 text-sm">Claude AIが書類を生成しています...</p>
              <p className="text-gray-400 text-xs mt-1">通常1〜2分かかります</p>
            </div>
          )}

          {!loading && !generated && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">📄</p>
              <p className="text-sm">左側から情報を入力して<br />「書類を自動生成する」を押してください</p>
            </div>
          )}

          {generated && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("resume")}
                  className={`flex-1 py-3 text-sm font-medium transition ${
                    activeTab === "resume"
                      ? "bg-blue-50 text-blue-600 border-b-2 border-blue-500"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  📋 履歴書
                </button>
                <button
                  onClick={() => setActiveTab("cv")}
                  className={`flex-1 py-3 text-sm font-medium transition ${
                    activeTab === "cv"
                      ? "bg-blue-50 text-blue-600 border-b-2 border-blue-500"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  📑 職務経歴書
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                {activeTab === "resume" && (
                  <>
                    <div className="flex gap-4">
                      {photoPreview && (
                        <img src={photoPreview} alt="証明写真" className="w-16 h-20 object-cover rounded border border-gray-200 flex-shrink-0" />
                      )}
                      <div className="grid grid-cols-2 gap-3 text-sm flex-1">
                        <InfoItem label="氏名" value={`${generated.resume.name}（${generated.resume.name_kana}）`} />
                        <InfoItem label="生年月日" value={`${generated.resume.birth_date}（${generated.resume.age}歳）`} />
                        <InfoItem label="住所" value={generated.resume.address} />
                        <InfoItem label="電話" value={generated.resume.phone} />
                        <InfoItem label="Email" value={generated.resume.email} className="col-span-2" />
                      </div>
                    </div>

                    <Section title="学歴">
                      {generated.resume.education.map((e, i) => (
                        <p key={i} className="text-sm text-gray-700">{e.year}年{e.month}月　{e.content}</p>
                      ))}
                    </Section>

                    <Section title="職歴">
                      {generated.resume.career.map((e, i) => (
                        <p key={i} className="text-sm text-gray-700">{e.year}年{e.month}月　{e.content}</p>
                      ))}
                    </Section>

                    <Section title="免許・資格">
                      {generated.resume.qualifications.map((e, i) => (
                        <p key={i} className="text-sm text-gray-700">{e.year}年{e.month}月　{e.content}</p>
                      ))}
                    </Section>

                    <Section title="特技・趣味">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{generated.resume.skills_hobbies}</p>
                    </Section>

                    <Section title="志望動機">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{generated.resume.motivation}</p>
                    </Section>
                  </>
                )}

                {activeTab === "cv" && (
                  <>
                    <Section title="■職務要約">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{generated.work_history.summary}</p>
                    </Section>

                    <Section title="■活かせる経験・資格・スキル">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{generated.work_history.skills.experience}</p>
                      <p className="text-sm text-gray-700 mt-2"><span className="font-medium">保有資格：</span>{generated.work_history.skills.qualifications}</p>
                      <p className="text-sm text-gray-700"><span className="font-medium">PCスキル：</span>{generated.work_history.skills.pc_skills}</p>
                    </Section>

                    <Section title="■職務経験">
                      {generated.work_history.experiences.map((exp, i) => (
                        <div key={i} className="border border-gray-200 rounded-lg p-3 mb-2">
                          <p className="text-sm font-semibold text-gray-800">
                            {exp.company_name}
                            <span className="ml-2 text-xs font-normal text-gray-500">{exp.period_start}〜{exp.period_end}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">事業内容：{exp.business_type}</p>
                          <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">【概要】{exp.overview}</p>
                          <p className="text-sm text-gray-700 mt-1">【所属・役職】{exp.position}</p>
                          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">【職務内容】{exp.duties}</p>
                          {exp.achievements && (
                            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">実績・取り組み：{exp.achievements}</p>
                          )}
                        </div>
                      ))}
                    </Section>

                    <Section title="■自己PR">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{generated.work_history.self_pr}</p>
                    </Section>
                  </>
                )}
              </div>

              {/* Download buttons */}
              <div className="border-t border-gray-100 p-4 flex gap-3">
                <button
                  onClick={() => downloadDocx(resumeDocxB64, `履歴書_${name}_${dateStr}.docx`)}
                  className="flex-1 py-2.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  ⬇️ 履歴書 (Word)
                </button>
                <button
                  onClick={() => downloadDocx(cvDocxB64, `職務経歴書_${name}_${dateStr}.docx`)}
                  className="flex-1 py-2.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  ⬇️ 職務経歴書 (Word)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value || "—"}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-100 pt-3">
      <h4 className="text-xs font-semibold text-gray-500 mb-2">{title}</h4>
      {children}
    </div>
  );
}
