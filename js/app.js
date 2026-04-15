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
  state.apiKey = localStorage.getItem(API_KEY_STORAGE) || '';

  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  updateApiKeyStatus();
  bindEventListeners();
  initChatPanels();
  updateGenerateButton();
}

// ============================================
// Event Listeners
// ============================================
function bindEventListeners() {
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettingsModal);
  }

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
    apiKeyInput.value = state.apiKey || '';
  }

  const toggleApiKeyBtn = document.getElementById('toggleApiKeyBtn');
  if (toggleApiKeyBtn) toggleApiKeyBtn.addEventListener('click', toggleApiKeyVisibility);

  // 応募先企業名
  const targetCompanyInput = document.getElementById('targetCompany');
  if (targetCompanyInput) {
    targetCompanyInput.addEventListener('input', (e) => {
      state.targetCompany = e.target.value;
    });
  }

  // 応募職種（ドロップダウン）
  const targetPositionSelect = document.getElementById('targetPosition');
  if (targetPositionSelect) {
    targetPositionSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      const otherWrapper = document.getElementById('otherPositionWrapper');
      if (val === 'other') {
        if (otherWrapper) otherWrapper.classList.remove('hidden');
        state.targetPosition = '';
        const otherInput = document.getElementById('otherPositionInput');
        if (otherInput) otherInput.focus();
      } else {
        if (otherWrapper) otherWrapper.classList.add('hidden');
        state.targetPosition = val;
      }
    });
  }

  // その他（自由入力）
  const otherPositionInput = document.getElementById('otherPositionInput');
  if (otherPositionInput) {
    otherPositionInput.addEventListener('input', (e) => {
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

  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.title = hasKey ? 'APIキー設定済み ⚙️' : 'APIキーを設定してください ⚙️';
  }

  const warningBanner = document.getElementById('apiKeyWarning');
  if (warningBanner) {
    warningBanner.classList.toggle('hidden', hasKey);
  }

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

    const generatedData = await generateCareerDocuments({
      apiKey: state.apiKey,
      transcript: state.transcript,
      existingResume: resumeText,
      existingCv: cvText,
      targetCompany: state.targetCompany,
      targetPosition: state.targetPosition,
    });

    state.generatedData = generatedData;

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

    const downloadResumeBtn = document.getElementById('downloadResumeBtn');
    const downloadCvBtn = document.getElementById('downloadCvBtn');
    if (downloadResumeBtn) downloadResumeBtn.disabled = !state.resumeBlob;
    if (downloadCvBtn) downloadCvBtn.disabled = !state.cvBlob;

    renderResults(generatedData);
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
        生成中（しばらくお待ちください）...
      `;
    } else {
      btn.innerHTML = '書類を自動生成する';
    }
  }

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

  document.querySelectorAll('.tab-pill').forEach(btn => {
    const isActive = btn.getAttribute('data-tab') === tabName;
    btn.classList.toggle('active', isActive);
  });

  const panels = ['resume', 'work_history'];
  panels.forEach(panel => {
    const el = document.getElementById(`panel-${panel}`);
    if (el) {
      el.classList.toggle('hidden', panel !== tabName);
    }
  });
}

// ============================================
// Render Results
// ============================================
function renderResults(data) {
  const outputEmpty = document.getElementById('outputEmpty');
  const outputContent = document.getElementById('outputContent');

  if (outputEmpty) outputEmpty.classList.add('hidden');
  if (outputContent) outputContent.classList.remove('hidden');

  renderResume(data.resume, state.photoDataUrl);
  renderWorkHistory(data.work_history);
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

// ============================================
// Download Handlers
// ============================================
function downloadResume() {
  if (!state.resumeBlob) return;

  const name = state.generatedData?.resume?.name || '候補者';
  const date = formatDateForFilename(new Date());
  const filename = `履歴書_${name}_${date}.xlsx`;

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
    if (typeof saveAs !== 'undefined') {
      saveAs(blob, filename);
      return;
    }
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
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const ta = document.getElementById(targetId);
      if (ta) { ta.value = btn.textContent; ta.focus(); }
    });
  });

  document.getElementById('resume-chat-input')?.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleRevision('resume');
  });
  document.getElementById('cv-chat-input')?.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleRevision('work_history');
  });

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
