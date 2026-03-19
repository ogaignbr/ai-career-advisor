/**
 * app.js
 * AIキャリアアドバイザー - メインアプリケーションコントローラー
 */

// ============================================
// State Management
// ============================================
const state = {
  apiKey: '',
  photoFile: null,
  photoDataUrl: null,
  resumePdfFile: null,
  cvPdfFile: null,
  transcript: '',
  targetCompany: '',
  targetPosition: '',
  generatedData: null,
  loading: false,
  error: null,
  activeTab: 'resume',
  resumeBlob: null,
  cvBlob: null,
};

const API_KEY_STORAGE = 'career_advisor_api_key';

// ============================================
// Init
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // APIキーをlocalStorageから読み込む
  state.apiKey = localStorage.getItem(API_KEY_STORAGE) || '';

  // PDF.js ワーカーの設定
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  // API設定状態の表示更新
  updateApiKeyStatus();

  // イベントリスナーをバインド
  bindEventListeners();
  initChatPanels();

  // 生成ボタンの状態更新
  updateGenerateButton();
}

// ============================================
// Event Listeners
// ============================================
function bindEventListeners() {
  // 設定ボタン
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettingsModal);
  }

  // 設定モーダル
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeSettingsModal();
    });
  }

  const closeModalBtn = document.getElementById('closeModalBtn');
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeSettingsModal);

  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  if (saveApiKeyBtn) saveApiKeyBtn.addEventListener('click', saveApiKey);

  const apiKeyInput = document.getElementById('apiKeyInput');
  if (apiKeyInput) {
    apiKeyInput.addEventListener('input', () => {
      updateSaveButtonState();
    });
    apiKeyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveApiKey();
    });
    // 既存の値を設定
    apiKeyInput.value = state.apiKey || '';
  }

  // パスワード表示切替
  const toggleApiKeyBtn = document.getElementById('toggleApiKeyBtn');
  if (toggleApiKeyBtn) toggleApiKeyBtn.addEventListener('click', toggleApiKeyVisibility);

  // 応募情報
  const targetCompanyInput = document.getElementById('targetCompany');
  if (targetCompanyInput) {
    targetCompanyInput.addEventListener('input', (e) => {
      state.targetCompany = e.target.value;
    });
  }

  const targetPositionInput = document.getElementById('targetPosition');
  if (targetPositionInput) {
    targetPositionInput.addEventListener('input', (e) => {
      state.targetPosition = e.target.value;
    });
  }

  // 面談テキスト
  const transcriptInput = document.getElementById('transcriptInput');
  if (transcriptInput) {
    transcriptInput.addEventListener('input', (e) => {
      state.transcript = e.target.value;
      updateGenerateButton();
    });
  }

  // 証明写真アップロード
  const photoUploadArea = document.getElementById('photoUploadArea');
  const photoFileInput = document.getElementById('photoFileInput');
  if (photoUploadArea && photoFileInput) {
    photoUploadArea.addEventListener('click', () => photoFileInput.click());
    photoFileInput.addEventListener('change', handlePhotoUpload);
    setupDragAndDrop(photoUploadArea, handlePhotoDropped, ['image/png', 'image/jpeg', 'image/jpg']);
  }

  // 履歴書PDFアップロード
  const resumePdfArea = document.getElementById('resumePdfArea');
  const resumePdfInput = document.getElementById('resumePdfInput');
  if (resumePdfArea && resumePdfInput) {
    resumePdfArea.addEventListener('click', () => resumePdfInput.click());
    resumePdfInput.addEventListener('change', handleResumePdfUpload);
    setupDragAndDrop(resumePdfArea, (file) => {
      state.resumePdfFile = file;
      updatePdfAreaDisplay('resumePdfArea', file.name);
      updateGenerateButton();
    }, ['application/pdf']);
  }

  // 職務経歴書PDFアップロード
  const cvPdfArea = document.getElementById('cvPdfArea');
  const cvPdfInput = document.getElementById('cvPdfInput');
  if (cvPdfArea && cvPdfInput) {
    cvPdfArea.addEventListener('click', () => cvPdfInput.click());
    cvPdfInput.addEventListener('change', handleCvPdfUpload);
    setupDragAndDrop(cvPdfArea, (file) => {
      state.cvPdfFile = file;
      updatePdfAreaDisplay('cvPdfArea', file.name);
      updateGenerateButton();
    }, ['application/pdf']);
  }

  // 生成ボタン
  const generateBtn = document.getElementById('generateBtn');
  if (generateBtn) {
    generateBtn.addEventListener('click', handleGenerate);
  }

  // タブ切替
  document.querySelectorAll('.tab-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  // ダウンロードボタン
  const downloadResumeBtn = document.getElementById('downloadResumeBtn');
  if (downloadResumeBtn) {
    downloadResumeBtn.addEventListener('click', downloadResume);
  }

  const downloadCvBtn = document.getElementById('downloadCvBtn');
  if (downloadCvBtn) {
    downloadCvBtn.addEventListener('click', downloadCv);
  }
}

// ============================================
// Settings Modal
// ============================================
function openSettingsModal() {
  const modal = document.getElementById('modalOverlay');
  if (modal) {
    modal.classList.remove('hidden');
    const input = document.getElementById('apiKeyInput');
    if (input) {
      input.value = state.apiKey || '';
      input.focus();
    }
    updateSaveButtonState();
  }
}

function closeSettingsModal() {
  const modal = document.getElementById('modalOverlay');
  if (modal) modal.classList.add('hidden');
}

function saveApiKey() {
  const input = document.getElementById('apiKeyInput');
  if (!input) return;

  const key = input.value.trim();
  if (!key) {
    showModalError('APIキーを入力してください。');
    return;
  }

  if (!key.startsWith('sk-')) {
    showModalError('APIキーの形式が正しくありません（"sk-"で始まる必要があります）。');
    return;
  }

  state.apiKey = key;
  localStorage.setItem(API_KEY_STORAGE, key);

  updateApiKeyStatus();
  updateGenerateButton();
  closeSettingsModal();

  showToast('APIキーを保存しました', 'success');
}

function showModalError(message) {
  const errEl = document.getElementById('modalError');
  if (errEl) {
    errEl.textContent = message;
    errEl.classList.remove('hidden');
  }
}

function updateSaveButtonState() {
  const errEl = document.getElementById('modalError');
  if (errEl) errEl.classList.add('hidden');
}

function toggleApiKeyVisibility() {
  const input = document.getElementById('apiKeyInput');
  const btn = document.getElementById('toggleApiKeyBtn');
  if (!input || !btn) return;

  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🔒';
    btn.title = 'パスワードを隠す';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
    btn.title = 'パスワードを表示';
  }
}

function updateApiKeyStatus() {
  const hasKey = !!state.apiKey;

  // ヘッダーの設定ボタンに状態インジケーター
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.title = hasKey ? 'APIキー設定済み ⚙️' : 'APIキーを設定してください ⚙️';
  }

  // 警告バナー
  const warningBanner = document.getElementById('apiKeyWarning');
  if (warningBanner) {
    warningBanner.classList.toggle('hidden', hasKey);
  }

  // 設定モーダルのステータス表示
  const keyStatus = document.getElementById('apiKeyStatus');
  if (keyStatus) {
    if (hasKey) {
      keyStatus.innerHTML = '<span class="text-green-600 text-sm">✅ APIキー設定済み</span>';
    } else {
      keyStatus.innerHTML = '<span class="text-gray-400 text-sm">未設定</span>';
    }
  }
}

// ============================================
// File Upload Handlers
// ============================================
function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  processPhotoFile(file);
}

function handlePhotoDropped(file) {
  processPhotoFile(file);
}

async function processPhotoFile(file) {
  if (!file.type.startsWith('image/')) {
    showError('写真はPNG/JPG形式でアップロードしてください。');
    return;
  }

  try {
    const dataUrl = await readFileAsDataURL(file);
    state.photoFile = file;
    state.photoDataUrl = dataUrl;

    const preview = document.getElementById('photoPreview');
    const placeholder = document.getElementById('photoPlaceholder');
    const photoArea = document.getElementById('photoUploadArea');

    if (preview) {
      preview.src = dataUrl;
      preview.classList.remove('hidden');
    }
    if (placeholder) placeholder.classList.add('hidden');
    if (photoArea) photoArea.classList.add('has-file');

  } catch (err) {
    showError('写真の読み込みに失敗しました。');
  }
}

function handleResumePdfUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  state.resumePdfFile = file;
  updatePdfAreaDisplay('resumePdfArea', file.name);
  updateGenerateButton();
}

function handleCvPdfUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  state.cvPdfFile = file;
  updatePdfAreaDisplay('cvPdfArea', file.name);
  updateGenerateButton();
}

function updatePdfAreaDisplay(areaId, filename) {
  const area = document.getElementById(areaId);
  if (!area) return;

  area.classList.add('has-file');

  const filenameEl = area.querySelector('.pdf-filename');
  const placeholderEl = area.querySelector('.pdf-placeholder');

  if (filenameEl) {
    filenameEl.textContent = `📄 ${filename}`;
    filenameEl.classList.remove('hidden');
  }
  if (placeholderEl) {
    placeholderEl.classList.add('hidden');
  }
}

/**
 * ドラッグアンドドロップの設定
 */
function setupDragAndDrop(element, onDrop, acceptedTypes) {
  element.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.add('drag-over');
  });

  element.addEventListener('dragleave', (e) => {
    e.preventDefault();
    element.classList.remove('drag-over');
  });

  element.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];

    if (acceptedTypes && acceptedTypes.length > 0) {
      const isAccepted = acceptedTypes.some(type => {
        if (type === 'application/pdf') return file.type === 'application/pdf' || file.name.endsWith('.pdf');
        if (type.startsWith('image/')) return file.type.startsWith('image/');
        return file.type === type;
      });

      if (!isAccepted) {
        showError(`対応していないファイル形式です。`);
        return;
      }
    }

    onDrop(file);
  });
}

// ============================================
// Generate Button
// ============================================
function updateGenerateButton() {
  const btn = document.getElementById('generateBtn');
  if (!btn) return;

  const hasInput = !!(
    state.transcript.trim() ||
    state.resumePdfFile ||
    state.cvPdfFile
  );

  const canGenerate = state.apiKey && hasInput && !state.loading;

  btn.disabled = !canGenerate;

  if (!state.apiKey) {
    btn.title = 'APIキーを設定してください';
  } else if (!hasInput) {
    btn.title = '面談テキストまたはPDFファイルを入力してください';
  } else {
    btn.title = '';
  }
}

// ============================================
// Generate Handler
// ============================================
async function handleGenerate() {
  if (state.loading) return;

  // バリデーション
  const hasInput = !!(
    state.transcript.trim() ||
    state.resumePdfFile ||
    state.cvPdfFile
  );

  if (!state.apiKey) {
    showError('OpenAI APIキーが設定されていません。設定ボタンからAPIキーを入力してください。');
    return;
  }

  if (!hasInput) {
    showError('面談テキストまたは既存書類PDFを入力してください。');
    return;
  }

  setLoading(true);
  clearError();

  try {
    // PDFテキストの抽出
    let resumeText = '';
    let cvText = '';

    if (state.resumePdfFile) {
      try {
        resumeText = await extractTextFromPDF(state.resumePdfFile);
      } catch (err) {
        console.warn('履歴書PDFの読み込みエラー:', err);
        resumeText = `（履歴書PDFの読み込みに失敗しました: ${err.message}）`;
      }
    }

    if (state.cvPdfFile) {
      try {
        cvText = await extractTextFromPDF(state.cvPdfFile);
      } catch (err) {
        console.warn('職務経歴書PDFの読み込みエラー:', err);
        cvText = `（職務経歴書PDFの読み込みに失敗しました: ${err.message}）`;
      }
    }

    // OpenAI API呼び出し
    const generatedData = await generateCareerDocuments({
      apiKey: state.apiKey,
      transcript: state.transcript,
      existingResume: resumeText,
      existingCv: cvText,
      targetCompany: state.targetCompany,
      targetPosition: state.targetPosition,
    });

    state.generatedData = generatedData;

    // Wordファイルを生成
    let wordError = null;
    try {
      state.resumeBlob = await generateResumeDocx(generatedData.resume, state.photoDataUrl);
    } catch (err) {
      console.error('履歴書Word生成エラー:', err);
      wordError = err.message || String(err);
      state.resumeBlob = null;
    }

    try {
      state.cvBlob = await generateWorkHistoryDocx(generatedData.work_history);
    } catch (err) {
      console.error('職務経歴書Word生成エラー:', err);
      if (!wordError) wordError = err.message || String(err);
      state.cvBlob = null;
    }

    if (wordError) {
      showError(`Word生成エラー: ${wordError}　※書類のプレビューは表示されます。`);
    }

    // ダウンロードボタンの有効化
    const downloadResumeBtn = document.getElementById('downloadResumeBtn');
    const downloadCvBtn = document.getElementById('downloadCvBtn');
    if (downloadResumeBtn) downloadResumeBtn.disabled = !state.resumeBlob;
    if (downloadCvBtn) downloadCvBtn.disabled = !state.cvBlob;

    // 結果を描画
    renderResults(generatedData);

    // アクティブタブに切り替え
    switchTab(state.activeTab);

    showToast('書類の生成が完了しました！', 'success');

  } catch (err) {
    console.error('生成エラー:', err);
    showError(err.message || '書類の生成中にエラーが発生しました。再度お試しください。');
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading) {
  state.loading = isLoading;
  updateGenerateButton();

  const btn = document.getElementById('generateBtn');
  if (btn) {
    if (isLoading) {
      btn.innerHTML = `
        <span class="spinner-sm mr-2"></span>
        ✨ 生成中（しばらくお待ちください）...
      `;
    } else {
      btn.innerHTML = '✨ 書類を自動生成する';
    }
  }

  // ローディングスピナー
  const outputLoading = document.getElementById('outputLoading');
  const outputEmpty = document.getElementById('outputEmpty');
  const outputContent = document.getElementById('outputContent');

  if (isLoading) {
    if (outputLoading) outputLoading.classList.remove('hidden');
    if (outputEmpty) outputEmpty.classList.add('hidden');
    if (outputContent) outputContent.classList.add('hidden');
  } else {
    if (outputLoading) outputLoading.classList.add('hidden');
  }
}

// ============================================
// Tab Switching
// ============================================
function switchTab(tabName) {
  state.activeTab = tabName;

  // タブボタンの状態更新
  document.querySelectorAll('.tab-pill').forEach(btn => {
    const isActive = btn.getAttribute('data-tab') === tabName;
    btn.classList.toggle('active', isActive);
  });

  // タブコンテンツの表示切替
  const panels = ['resume', 'work_history', 'career_advice'];
  panels.forEach(panel => {
    const el = document.getElementById(`panel-${panel}`);
    if (el) {
      el.classList.toggle('hidden', panel !== tabName);
    }
  });

  // キャリアアドバイスタブ表示時にチャートを再描画
  if (tabName === 'career_advice' && state.generatedData) {
    setTimeout(() => {
      const advice = state.generatedData.career_advice;
      if (advice) {
        renderCharts(advice);
      }
    }, 50);
  }
}

// ============================================
// Render Results
// ============================================
function renderResults(data) {
  const outputEmpty = document.getElementById('outputEmpty');
  const outputContent = document.getElementById('outputContent');

  if (outputEmpty) outputEmpty.classList.add('hidden');
  if (outputContent) outputContent.classList.remove('hidden');

  // 各パネルを描画
  renderResume(data.resume, state.photoDataUrl);
  renderWorkHistory(data.work_history);
  renderCareerAdvice(data.career_advice);
  // チャットパネルを表示
  showChatPanels();
}

/**
 * 履歴書プレビューを描画する
 */
function renderResume(data, photoDataUrl) {
  const container = document.getElementById('resume-content');
  if (!container) return;

  const photoHtml = photoDataUrl
    ? `<img src="${photoDataUrl}" alt="証明写真" class="w-24 h-32 object-cover border border-gray-300 rounded">`
    : `<div class="w-24 h-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-400">写真なし</div>`;

  const educationRows = (data.education || [])
    .map(e => `<tr><td class="border border-gray-300 px-2 py-1 text-center text-sm">${escHtml(e.year)}</td><td class="border border-gray-300 px-2 py-1 text-center text-sm">${escHtml(e.month)}</td><td class="border border-gray-300 px-2 py-1 text-sm">${escHtml(e.content)}</td></tr>`)
    .join('');

  const careerRows = (data.career || [])
    .map(e => `<tr><td class="border border-gray-300 px-2 py-1 text-center text-sm">${escHtml(e.year)}</td><td class="border border-gray-300 px-2 py-1 text-center text-sm">${escHtml(e.month)}</td><td class="border border-gray-300 px-2 py-1 text-sm">${escHtml(e.content)}</td></tr>`)
    .join('');

  const qualRows = (data.qualifications || [])
    .map(e => `<tr><td class="border border-gray-300 px-2 py-1 text-center text-sm">${escHtml(e.year)}</td><td class="border border-gray-300 px-2 py-1 text-center text-sm">${escHtml(e.month)}</td><td class="border border-gray-300 px-2 py-1 text-sm">${escHtml(e.content)}</td></tr>`)
    .join('');

  container.innerHTML = `
    <div class="doc-preview">
      <h2 class="text-xl font-bold text-center mb-1">履　歴　書</h2>
      <p class="text-right text-xs text-gray-500 mb-3">${getCurrentDateJP()}現在</p>

      <div class="flex gap-3 mb-4">
        <div class="flex-1">
          <table class="doc-table w-full">
            <tr>
              <th class="w-24">ふりがな</th>
              <td colspan="3">${escHtml(data.name_kana)}</td>
            </tr>
            <tr>
              <th>氏名</th>
              <td colspan="3" class="text-lg font-bold">${escHtml(data.name)}</td>
            </tr>
            <tr>
              <th>生年月日</th>
              <td>${escHtml(data.birth_date)}${data.age ? ` (${escHtml(data.age)}歳)` : ''}</td>
              <th class="w-12">性別</th>
              <td>${escHtml(data.gender)}</td>
            </tr>
            <tr>
              <th>住所</th>
              <td colspan="3">${escHtml(data.address)}</td>
            </tr>
            <tr>
              <th>電話</th>
              <td>${escHtml(data.phone)}</td>
              <th>メール</th>
              <td>${escHtml(data.email)}</td>
            </tr>
          </table>
        </div>
        <div class="flex-shrink-0">
          ${photoHtml}
        </div>
      </div>

      <div class="doc-section-title">学歴・職歴</div>
      <table class="doc-table w-full">
        <thead>
          <tr>
            <th class="w-12 text-center">年</th>
            <th class="w-10 text-center">月</th>
            <th>内　　容</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td></td><td></td>
            <td class="text-center font-semibold text-sm" style="background:#f5f3ff;color:#5b21b6;">学歴</td>
          </tr>
          ${educationRows || '<tr><td></td><td></td><td></td></tr>'}
          <tr>
            <td></td><td></td>
            <td class="text-center font-semibold text-sm" style="background:#f5f3ff;color:#5b21b6;">職歴</td>
          </tr>
          ${careerRows || '<tr><td></td><td></td><td></td></tr>'}
          <tr>
            <td></td><td></td>
            <td class="text-right text-sm">以上</td>
          </tr>
        </tbody>
      </table>

      ${(data.qualifications || []).length > 0 ? `
        <div class="doc-section-title">免許・資格</div>
        <table class="doc-table w-full">
          <thead>
            <tr>
              <th class="w-12 text-center">年</th>
              <th class="w-10 text-center">月</th>
              <th>免許・資格名</th>
            </tr>
          </thead>
          <tbody>
            ${qualRows}
          </tbody>
        </table>
      ` : ''}

      ${data.skills_hobbies ? `
        <div class="doc-section-title">特技・趣味・自己PR</div>
        <div class="border border-gray-300 p-3 text-sm leading-relaxed">${escHtml(data.skills_hobbies)}</div>
      ` : ''}

      ${data.motivation ? `
        <div class="doc-section-title">志望動機</div>
        <div class="border border-gray-300 p-3 text-sm leading-relaxed">${escHtml(data.motivation)}</div>
      ` : ''}
    </div>
  `;
}

/**
 * 職務経歴書プレビューを描画する
 */
function renderWorkHistory(data) {
  const container = document.getElementById('work-history-content');
  if (!container) return;

  const experiencesHtml = (data.experiences || []).map((exp, i) => {
    const period = exp.period_start
      ? `${escHtml(exp.period_start)}${exp.period_end ? ` 〜 ${escHtml(exp.period_end)}` : ''}`
      : '';

    return `
      <div class="mb-4 p-3 rounded border-l-4" style="background:#f5f3ff;border-left-color:#8b5cf6;">
        <div class="font-bold text-base text-gray-800 mb-1">
          【${i + 1}】${escHtml(exp.company_name)}
          ${period ? `<span class="font-normal text-sm text-gray-500 ml-2">(${period})</span>` : ''}
        </div>
        <table class="doc-table w-full mb-2">
          ${exp.business_type ? `<tr><th class="w-24">業種</th><td>${escHtml(exp.business_type)}</td></tr>` : ''}
          ${exp.overview ? `<tr><th>事業概要</th><td>${escHtml(exp.overview)}</td></tr>` : ''}
          ${exp.position ? `<tr><th>役職・職種</th><td>${escHtml(exp.position)}</td></tr>` : ''}
        </table>
        ${exp.duties ? `
          <div class="mb-2">
            <div class="text-xs font-bold text-gray-600 mb-1">【担当業務】</div>
            <div class="text-sm pl-2 leading-relaxed">${escHtml(exp.duties)}</div>
          </div>
        ` : ''}
        ${exp.achievements ? `
          <div>
            <div class="text-xs font-bold text-gray-600 mb-1">【主な実績・成果】</div>
            <div class="text-sm pl-2 leading-relaxed">${escHtml(exp.achievements)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  const skills = data.skills || {};

  container.innerHTML = `
    <div class="doc-preview">
      <h2 class="text-xl font-bold text-center mb-1">職　務　経　歴　書</h2>
      <p class="text-right text-xs text-gray-500 mb-3">${getCurrentDateJP()}現在</p>

      <table class="doc-table w-full mb-4">
        <tr>
          <th class="w-20">氏名</th>
          <td class="font-bold text-base">${escHtml(data.name)}</td>
        </tr>
      </table>

      ${data.summary ? `
        <div class="doc-section-title">■ 職務要約</div>
        <div class="border border-gray-300 p-3 text-sm leading-relaxed mb-3">${escHtml(data.summary)}</div>
      ` : ''}

      ${(skills.experience || skills.qualifications || skills.pc_skills) ? `
        <div class="doc-section-title">■ 活かせる経験・資格・スキル</div>
        <table class="doc-table w-full mb-3">
          ${skills.experience ? `<tr><th class="w-32">活かせる経験</th><td>${escHtml(skills.experience)}</td></tr>` : ''}
          ${skills.qualifications ? `<tr><th>保有資格</th><td>${escHtml(skills.qualifications)}</td></tr>` : ''}
          ${skills.pc_skills ? `<tr><th>PCスキル</th><td>${escHtml(skills.pc_skills)}</td></tr>` : ''}
        </table>
      ` : ''}

      ${experiencesHtml ? `
        <div class="doc-section-title">■ 職務経歴</div>
        ${experiencesHtml}
      ` : ''}

      ${data.self_pr ? `
        <div class="doc-section-title">■ 自己PR</div>
        <div class="border border-gray-300 p-3 text-sm leading-relaxed">${escHtml(data.self_pr)}</div>
      ` : ''}

      <p class="text-right text-sm text-gray-500 mt-4">以上</p>
    </div>
  `;
}

/**
 * キャリアアドバイスを描画する
 */
function renderCareerAdvice(data) {
  const container = document.getElementById('career-advice-content');
  if (!container) return;

  const score = data.overall_score || 0;

  // 強みカード
  const strengthsHtml = (data.strengths || []).map(s => `
    <div class="strength-card">
      <div class="font-bold text-green-800 text-sm mb-1">✅ ${escHtml(s.title)}</div>
      <div class="text-sm text-gray-700 mb-1">${escHtml(s.detail)}</div>
      ${s.evidence ? `<div class="text-xs text-gray-500 italic border-l-2 border-green-400 pl-2 mt-1">根拠: ${escHtml(s.evidence)}</div>` : ''}
    </div>
  `).join('');

  // 課題カード
  const growthAreasHtml = (data.growth_areas || []).map(g => `
    <div class="growth-card">
      <div class="font-bold text-orange-700 text-sm mb-1">📈 ${escHtml(g.title)}</div>
      <div class="text-sm text-gray-700 mb-1">${escHtml(g.detail)}</div>
      ${g.advice ? `<div class="text-xs pl-2 mt-1" style="color:#7c3aed;border-left:2px solid #a78bfa;">アドバイス: ${escHtml(g.advice)}</div>` : ''}
    </div>
  `).join('');

  // 推奨アクション
  const recsHtml = (data.recommendations || []).map(rec => {
    const priorityLabel = rec.priority === 'high' ? '高' : rec.priority === 'medium' ? '中' : '低';
    const priorityClass = `priority-${rec.priority === 'high' ? 'high' : rec.priority === 'medium' ? 'medium' : 'low'}`;
    return `
      <div class="rec-card ${rec.priority || 'low'}">
        <div class="flex items-center gap-2 mb-1">
          <span class="priority-badge ${priorityClass}">優先度: ${priorityLabel}</span>
          <span class="font-semibold text-sm text-gray-800">${escHtml(rec.title)}</span>
        </div>
        <div class="text-sm text-gray-600">${escHtml(rec.detail)}</div>
        ${rec.timing ? `<div class="text-xs mt-1" style="color:#8b5cf6;">⏰ ${escHtml(rec.timing)}</div>` : ''}
      </div>
    `;
  }).join('');

  // キーコート
  const quotesHtml = (data.key_quotes || []).map(q => {
    const type = q.highlight_type || 'neutral';
    return `
      <div class="quote-card ${type}">
        <div class="quote-text">"${escHtml(q.quote)}"</div>
        ${q.context ? `<div class="quote-context">→ ${escHtml(q.context)}</div>` : ''}
      </div>
    `;
  }).join('');

  const hasJobMatch = state.targetCompany && data.job_match;

  // 求人提案HTML
  const jobSuggestions = data.job_suggestions || [];
  const jobSuggestionsHtml = jobSuggestions.map((job, idx) => {
    const matchColor = job.match_score >= 85 ? '#10b981' : job.match_score >= 70 ? '#8b5cf6' : '#f59e0b';
    const rankColors = ['linear-gradient(135deg,#8b5cf6,#ec4899)', 'linear-gradient(135deg,#06b6d4,#8b5cf6)', 'linear-gradient(135deg,#f59e0b,#ec4899)', 'linear-gradient(135deg,#10b981,#06b6d4)'];
    const rankBg = rankColors[idx % rankColors.length];
    const reasonsList = (job.match_reasons || []).map(r => `<li class="text-xs text-gray-600 mb-0.5">✓ ${escHtml(r)}</li>`).join('');
    return `
      <div style="border:1.5px solid #ede9fe;border-radius:16px;padding:1rem;margin-bottom:0.875rem;background:white;transition:box-shadow .2s;" onmouseover="this.style.boxShadow='0 6px 20px rgba(139,92,246,.14)'" onmouseout="this.style.boxShadow='none'">
        <div style="display:flex;align-items:flex-start;gap:0.875rem;">
          <div style="width:38px;height:38px;border-radius:50%;background:${rankBg};color:white;font-size:.8rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">No.${job.rank || (idx+1)}</div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.375rem;">
              <span style="font-size:.9375rem;font-weight:700;color:#3b0764;">${escHtml(job.company || '')}</span>
              <span style="font-size:.75rem;color:white;background:${matchColor};border-radius:50px;padding:.1rem .55rem;font-weight:700;">マッチ度 ${job.match_score || ''}%</span>
            </div>
            <div style="font-size:.8125rem;font-weight:600;color:#8b5cf6;margin-bottom:.5rem;">${escHtml(job.position || '')}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.25rem .75rem;margin-bottom:.625rem;">
              <div style="font-size:.75rem;color:#374151;"><span style="color:#a78bfa;font-weight:600;">💰 </span>${escHtml(job.annual_salary || job.monthly_salary || '')}</div>
              <div style="font-size:.75rem;color:#374151;"><span style="color:#a78bfa;font-weight:600;">📍 </span>${escHtml(job.location || '')}</div>
              <div style="font-size:.75rem;color:#374151;"><span style="color:#a78bfa;font-weight:600;">📅 </span>${escHtml(job.holiday || '')}</div>
              <div style="font-size:.75rem;color:#374151;"><span style="color:#a78bfa;font-weight:600;">⏰ </span>${escHtml(job.overtime || '')}</div>
            </div>
            ${reasonsList ? `<ul style="margin:0 0 .5rem;padding-left:.25rem;list-style:none;">${reasonsList}</ul>` : ''}
            <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
              ${job.skill_growth ? `<span style="font-size:.7rem;background:#f5f3ff;color:#5b21b6;border:1px solid #ede9fe;border-radius:50px;padding:.1rem .5rem;">📈 ${escHtml(job.skill_growth)}</span>` : ''}
              ${job.career_path ? `<span style="font-size:.7rem;background:#fdf4ff;color:#ec4899;border:1px solid #fce7f3;border-radius:50px;padding:.1rem .5rem;">🚀 ${escHtml(job.career_path)}</span>` : ''}
            </div>
            ${job.caution ? `<div style="font-size:.7rem;color:#b45309;background:#fffbeb;border-radius:8px;padding:.25rem .5rem;margin-top:.375rem;">⚠️ ${escHtml(job.caution)}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // キャリアビジョンHTML
  const vision = data.career_vision || {};
  const visionHtml = (vision.short_term || vision.mid_term || vision.salary_potential) ? `
    <div class="advice-inner-card mb-5">
      <h3 class="text-sm font-bold mb-3" style="color:#5b21b6;">🔭 キャリアビジョン</h3>
      <div style="display:flex;flex-direction:column;gap:.625rem;">
        ${vision.short_term ? `
          <div style="display:flex;gap:.625rem;align-items:flex-start;">
            <div style="min-width:52px;background:linear-gradient(135deg,#8b5cf6,#a78bfa);color:white;font-size:.65rem;font-weight:700;border-radius:6px;padding:.2rem .4rem;text-align:center;">3年後</div>
            <p class="text-sm text-gray-700">${escHtml(vision.short_term)}</p>
          </div>` : ''}
        ${vision.mid_term ? `
          <div style="display:flex;gap:.625rem;align-items:flex-start;">
            <div style="min-width:52px;background:linear-gradient(135deg,#ec4899,#f472b6);color:white;font-size:.65rem;font-weight:700;border-radius:6px;padding:.2rem .4rem;text-align:center;">5年後</div>
            <p class="text-sm text-gray-700">${escHtml(vision.mid_term)}</p>
          </div>` : ''}
        ${vision.salary_potential ? `
          <div style="display:flex;gap:.625rem;align-items:flex-start;">
            <div style="min-width:52px;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:white;font-size:.65rem;font-weight:700;border-radius:6px;padding:.2rem .4rem;text-align:center;">年収</div>
            <p class="text-sm text-gray-700">${escHtml(vision.salary_potential)}</p>
          </div>` : ''}
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    <!-- サマリーセクション -->
    <div class="summary-section flex items-start gap-4 mb-5">
      <div class="overall-score-badge">${score}</div>
      <div class="flex-1">
        <div class="text-xs font-semibold uppercase tracking-wide mb-1" style="color:#8b5cf6;">総合スコア</div>
        <p class="text-sm text-gray-700 leading-relaxed">${escHtml(data.summary)}</p>
      </div>
    </div>

    <!-- キーメトリクス -->
    ${(data.key_metrics || []).length > 0 ? `
      <div id="key-metrics-container" class="mb-5"></div>
    ` : ''}

    <!-- スコアブレークダウン & レーダーチャート -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
      <div class="advice-inner-card">
        <h3 class="text-sm font-bold mb-3" style="color:#5b21b6;">📊 評価スコア詳細</h3>
        <div id="score-breakdown-container"></div>
      </div>
      <div class="advice-inner-card">
        <h3 class="text-sm font-bold mb-3" style="color:#5b21b6;">🕸️ スキルレーダー</h3>
        <div class="radar-container">
          <canvas id="skills-radar-chart"></canvas>
        </div>
      </div>
    </div>

    <!-- 🌟 求人提案（メインセクション） -->
    ${jobSuggestionsHtml ? `
      <div class="advice-inner-card mb-5" style="border-color:rgba(139,92,246,.25);">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:1rem;">
          <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#ec4899);display:flex;align-items:center;justify-content:center;font-size:.875rem;">🌟</div>
          <h3 class="text-sm font-bold" style="color:#5b21b6;">おすすめ求人ピックアップ</h3>
          <span style="font-size:.65rem;background:#f3e8ff;color:#7c3aed;border:1px solid #ddd6fe;border-radius:50px;padding:.1rem .5rem;font-weight:700;">AIマッチング</span>
        </div>
        <p style="font-size:.75rem;color:#94a3b8;margin-bottom:1rem;">候補者のスキル・経歴・キャリア志向をもとにAIが求人一覧から最適な求人を選定しました。</p>
        ${jobSuggestionsHtml}
      </div>
    ` : ''}

    <!-- キャリアビジョン -->
    ${visionHtml}

    <!-- キャリアタイムライン -->
    ${(data.career_timeline || []).length > 0 ? `
      <div class="advice-inner-card mb-5">
        <h3 class="text-sm font-bold mb-3" style="color:#5b21b6;">📅 キャリア年表</h3>
        <div id="career-timeline-container"></div>
      </div>
    ` : ''}

    <!-- 面談での注目発言 -->
    ${quotesHtml ? `
      <div class="advice-inner-card mb-5">
        <h3 class="text-sm font-bold mb-3" style="color:#5b21b6;">💬 面談での注目発言</h3>
        ${quotesHtml}
      </div>
    ` : ''}

    <!-- 強み・課題 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
      ${strengthsHtml ? `
        <div class="advice-inner-card">
          <h3 class="text-sm font-bold mb-3" style="color:#5b21b6;">💪 強み・アピールポイント</h3>
          ${strengthsHtml}
        </div>
      ` : ''}
      ${growthAreasHtml ? `
        <div class="advice-inner-card">
          <h3 class="text-sm font-bold mb-3" style="color:#5b21b6;">📈 成長・改善エリア</h3>
          ${growthAreasHtml}
        </div>
      ` : ''}
    </div>

    <!-- 推奨アクション -->
    ${recsHtml ? `
      <div class="advice-inner-card mb-5">
        <h3 class="text-sm font-bold mb-3" style="color:#5b21b6;">✅ 推奨アクションアイテム</h3>
        ${recsHtml}
      </div>
    ` : ''}

    <!-- 応募先マッチ度（応募先入力時のみ） -->
    ${hasJobMatch ? `
      <div class="advice-inner-card mb-5">
        <h3 class="text-sm font-bold mb-3" style="color:#5b21b6;">🎯 応募先マッチ度分析</h3>
        <div id="job-match-container"></div>
      </div>
    ` : ''}
  `;

  // チャートを描画
  renderCharts(data);
}

/**
 * チャートを描画する（タブ切り替え時にも呼ばれる）
 */
function renderCharts(data) {
  if (!data) return;

  // キーメトリクス
  if (data.key_metrics && data.key_metrics.length > 0) {
    renderKeyMetrics('key-metrics-container', data.key_metrics);
  }

  // スコアブレークダウン
  if (data.score_breakdown) {
    renderScoreBreakdown('score-breakdown-container', data.score_breakdown);
  }

  // レーダーチャート
  if (data.skills_radar) {
    renderSkillsRadar('skills-radar-chart', data.skills_radar);
  }

  // キャリアタイムライン
  if (data.career_timeline && data.career_timeline.length > 0) {
    renderCareerTimeline('career-timeline-container', data.career_timeline);
  }

  // 求人マッチゲージ
  if (data.job_match && state.targetCompany) {
    renderJobMatchGauge('job-match-container', data.job_match, state.targetCompany);
  }
}

// ============================================
// Download Handlers
// ============================================
function downloadResume() {
  if (!state.resumeBlob) return;

  const name = state.generatedData?.resume?.name || '候補者';
  const date = formatDateForFilename(new Date());
  const filename = `履歴書_${name}_${date}.doc`;

  triggerDownload(state.resumeBlob, filename);
}

function downloadCv() {
  if (!state.cvBlob) return;

  const name = state.generatedData?.work_history?.name || '候補者';
  const date = formatDateForFilename(new Date());
  const filename = `職務経歴書_${name}_${date}.doc`;

  triggerDownload(state.cvBlob, filename);
}

function triggerDownload(blob, filename) {
  try {
    // FileSaver.js が読み込まれていればそちらを優先（iOS/Edge対応）
    if (typeof saveAs !== 'undefined') {
      saveAs(blob, filename);
      return;
    }
    // フォールバック: anchor要素によるダウンロード
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (err) {
    alert(`ダウンロードに失敗しました: ${err.message}\nブラウザの設定でポップアップをブロックしていないか確認してください。`);
  }
}

function formatDateForFilename(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// ============================================
// Error / Toast Helpers
// ============================================
function showError(message) {
  state.error = message;
  const errorEl = document.getElementById('errorMessage');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }
}

function clearError() {
  state.error = null;
  const errorEl = document.getElementById('errorMessage');
  if (errorEl) errorEl.classList.add('hidden');
}

function showToast(message, type = 'info') {
  const existingToast = document.getElementById('toast-notification');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.id = 'toast-notification';

  const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-purple-600';
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';

  toast.className = `fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg text-white text-sm font-medium shadow-xl ${bgColor}`;
  toast.style.animation = 'slideUp 0.2s ease';
  toast.innerHTML = `<span>${icon}</span><span>${escHtml(message)}</span>`;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 350);
  }, 3000);
}

// ============================================
// Utility Functions
// ============================================
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getCurrentDateJP() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();

  if (y >= 2019) {
    return `令和${y - 2018}年${m}月${d}日`;
  } else if (y >= 1989) {
    return `平成${y - 1988}年${m}月${d}日`;
  }
  return `${y}年${m}月${d}日`;
}

// ============================================
// Chat Panel (AI修正機能)
// ============================================
function initChatPanels() {
  // クイックアクションボタン
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const ta = document.getElementById(targetId);
      if (ta) { ta.value = btn.textContent; ta.focus(); }
    });
  });

  // Ctrl+Enter で送信
  document.getElementById('resume-chat-input')?.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleRevision('resume');
  });
  document.getElementById('cv-chat-input')?.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleRevision('work_history');
  });

  // 送信ボタン
  document.getElementById('resume-chat-submit')?.addEventListener('click', () => handleRevision('resume'));
  document.getElementById('cv-chat-submit')?.addEventListener('click', () => handleRevision('work_history'));
}

function showChatPanels() {
  document.getElementById('resume-chat-panel')?.classList.remove('hidden');
  document.getElementById('cv-chat-panel')?.classList.remove('hidden');
}

async function handleRevision(docType) {
  const isResume = docType === 'resume';
  const inputId  = isResume ? 'resume-chat-input'   : 'cv-chat-input';
  const submitId = isResume ? 'resume-chat-submit'   : 'cv-chat-submit';
  const histId   = isResume ? 'resume-chat-history'  : 'cv-chat-history';

  const textarea  = document.getElementById(inputId);
  const submitBtn = document.getElementById(submitId);
  if (!textarea || !submitBtn) return;

  const instruction = textarea.value.trim();
  if (!instruction) { textarea.focus(); return; }

  if (!state.apiKey) {
    showError('APIキーが設定されていません。設定ボタンからAPIキーを入力してください。');
    return;
  }
  if (!state.generatedData) {
    showError('書類が生成されていません。先に書類を生成してください。');
    return;
  }

  // ローディング
  submitBtn.disabled = true;
  submitBtn.textContent = '🔄 修正中...';
  clearError();

  try {
    const currentData = isResume
      ? state.generatedData.resume
      : state.generatedData.work_history;

    const revised = await reviseDocument({
      apiKey: state.apiKey,
      docType,
      currentData,
      instruction,
      targetCompany:  state.targetCompany,
      targetPosition: state.targetPosition,
    });

    if (isResume) {
      state.generatedData.resume = { ...state.generatedData.resume, ...revised };
      try {
        state.resumeBlob = await generateResumeDocx(state.generatedData.resume, state.photoDataUrl);
        const btn = document.getElementById('downloadResumeBtn');
        if (btn) btn.disabled = false;
      } catch (e) { console.warn('Word再生成エラー:', e); }
      renderResume(state.generatedData.resume, state.photoDataUrl);
    } else {
      state.generatedData.work_history = { ...state.generatedData.work_history, ...revised };
      try {
        state.cvBlob = await generateWorkHistoryDocx(state.generatedData.work_history);
        const btn = document.getElementById('downloadCvBtn');
        if (btn) btn.disabled = false;
      } catch (e) { console.warn('Word再生成エラー:', e); }
      renderWorkHistory(state.generatedData.work_history);
    }

    addRevisionHistoryItem(histId, instruction);
    textarea.value = '';
    showToast('✅ 修正が完了しました！', 'success');

  } catch (err) {
    console.error('修正エラー:', err);
    showError(`修正エラー: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '🔄 AIに修正してもらう';
  }
}

function addRevisionHistoryItem(histId, instruction) {
  const container = document.getElementById(histId);
  if (!container) return;

  // 最大5件 (古いものを削除)
  const existing = container.querySelectorAll('.history-item');
  if (existing.length >= 5) existing[existing.length - 1].remove();

  const now  = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const item = document.createElement('div');
  item.className = 'history-item';
  item.innerHTML = `
    <span class="history-instruction">${escHtml(instruction)}</span>
    <span class="history-status">✅ 修正完了</span>
    <span class="history-time">${time}</span>
  `;
  container.insertBefore(item, container.firstChild);
}
