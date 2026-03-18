/**
 * charts.js
 * Chart.js と CSS を使用してキャリア分析グラフを描画する
 */

// レーダーチャートのインスタンス管理
let radarChartInstance = null;

/**
 * スキルレーダーチャートを描画する
 * @param {string} canvasId - canvasのID
 * @param {Array} skillsData - [{skill: string, score: number}]
 */
function renderSkillsRadar(canvasId, skillsData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.warn(`Canvas #${canvasId} が見つかりません`);
    return;
  }

  // 既存のチャートを破棄
  if (radarChartInstance) {
    radarChartInstance.destroy();
    radarChartInstance = null;
  }

  if (!skillsData || skillsData.length === 0) {
    return;
  }

  const labels = skillsData.map(item => item.skill || '');
  const scores = skillsData.map(item => Math.min(100, Math.max(0, item.score || 0)));

  const ctx = canvas.getContext('2d');

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'スキル評価',
          data: scores,
          backgroundColor: 'rgba(139, 92, 246, 0.18)',
          borderColor: 'rgba(139, 92, 246, 0.85)',
          borderWidth: 2.5,
          pointBackgroundColor: 'rgba(139, 92, 246, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(236, 72, 153, 1)',
          pointRadius: 5,
          pointHoverRadius: 7,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: {
        duration: 800,
        easing: 'easeOutQuart',
      },
      scales: {
        r: {
          beginAtZero: true,
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            font: { size: 10 },
            color: '#94a3b8',
            backdropColor: 'transparent',
            display: true,
            callback: function(value) {
              return value;
            }
          },
          grid: {
            color: 'rgba(167, 139, 250, 0.22)',
          },
          angleLines: {
            color: 'rgba(167, 139, 250, 0.22)',
          },
          pointLabels: {
            font: {
              size: 11,
              family: "'Zen Maru Gothic', 'Noto Sans JP', 'Meiryo', sans-serif",
            },
            color: '#5b21b6',
          },
        }
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` ${context.label}: ${context.raw}点`;
            }
          },
          backgroundColor: 'rgba(91, 33, 182, 0.9)',
          titleFont: { family: "'Noto Sans JP', 'Meiryo', sans-serif" },
          bodyFont: { family: "'Noto Sans JP', 'Meiryo', sans-serif" },
        }
      }
    }
  });
}

/**
 * スコアブレークダウンをバー形式で描画する
 * @param {string} containerId - コンテナのID
 * @param {Array} scoreBreakdown - [{category, score, max, comment}]
 */
function renderScoreBreakdown(containerId, scoreBreakdown) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container #${containerId} が見つかりません`);
    return;
  }

  if (!scoreBreakdown || scoreBreakdown.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400">データがありません</p>';
    return;
  }

  container.innerHTML = '';

  scoreBreakdown.forEach((item, index) => {
    const score = Math.min(100, Math.max(0, item.score || 0));
    const max = item.max || 100;
    const percentage = Math.round((score / max) * 100);

    // スコアに応じてカラークラスを決定
    let colorClass = 'blue';
    if (score >= 80) {
      colorClass = 'green';
    } else if (score < 65) {
      colorClass = 'orange';
    }

    const row = document.createElement('div');
    row.className = 'score-row';

    row.innerHTML = `
      <span class="score-label">${escapeHtml(item.category || '')}</span>
      <div class="score-bar-track">
        <div class="score-bar-fill ${colorClass}"
             style="width: 0%; --score-width: ${percentage}%"
             data-target="${percentage}">
        </div>
      </div>
      <span class="score-value">${score}</span>
    `;

    container.appendChild(row);

    // コメントがある場合は追加
    if (item.comment) {
      const commentEl = document.createElement('div');
      commentEl.style.cssText = 'font-size: 0.75rem; color: #64748b; margin-bottom: 0.5rem; margin-left: 150px; padding-left: 0.75rem;';
      commentEl.textContent = item.comment;
      container.appendChild(commentEl);
    }
  });

  // アニメーション付きでバーを表示
  requestAnimationFrame(() => {
    const bars = container.querySelectorAll('.score-bar-fill');
    bars.forEach((bar, i) => {
      setTimeout(() => {
        const target = bar.getAttribute('data-target');
        bar.style.width = target + '%';
        bar.style.transition = 'width 0.8s ease-out';
      }, i * 120);
    });
  });
}

/**
 * キャリアタイムラインを描画する
 * @param {string} containerId - コンテナのID
 * @param {Array} timelineData - [{period, company, role, highlight}]
 */
function renderCareerTimeline(containerId, timelineData) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container #${containerId} が見つかりません`);
    return;
  }

  if (!timelineData || timelineData.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400">キャリアデータがありません</p>';
    return;
  }

  container.className = 'timeline-container';
  container.innerHTML = '';

  timelineData.forEach((item, index) => {
    const timelineItem = document.createElement('div');
    timelineItem.className = 'timeline-item';

    const periodHtml = item.period
      ? `<div class="timeline-period">${escapeHtml(item.period)}</div>`
      : '';

    const companyHtml = item.company
      ? `<div class="timeline-company">${escapeHtml(item.company)}</div>`
      : '';

    const roleHtml = item.role
      ? `<div class="timeline-role">${escapeHtml(item.role)}</div>`
      : '';

    const highlightHtml = item.highlight
      ? `<div class="timeline-highlight">${escapeHtml(item.highlight)}</div>`
      : '';

    timelineItem.innerHTML = `
      ${periodHtml}
      ${companyHtml}
      ${roleHtml}
      ${highlightHtml}
    `;

    container.appendChild(timelineItem);
  });
}

/**
 * キーメトリクスカードを描画する
 * @param {string} containerId - コンテナのID
 * @param {Array} metricsData - [{label, value, sub, icon}]
 */
function renderKeyMetrics(containerId, metricsData) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container #${containerId} が見つかりません`);
    return;
  }

  if (!metricsData || metricsData.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = '';
  container.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;';

  const cardColors = ['purple', 'pink', 'cyan', 'amber'];
  metricsData.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = `metric-card ${cardColors[idx % cardColors.length]}`;

    card.innerHTML = `
      <div class="metric-icon">${escapeHtml(item.icon || '📊')}</div>
      <div class="metric-label">${escapeHtml(item.label || '')}</div>
      <div class="metric-value">${escapeHtml(item.value || '-')}</div>
      <div class="metric-sub">${escapeHtml(item.sub || '')}</div>
    `;

    container.appendChild(card);
  });
}

/**
 * 求人マッチスコアゲージを描画する
 * @param {string} containerId - コンテナのID
 * @param {Object} jobMatchData - {score, reasons, concerns}
 * @param {string} targetCompany - 応募先企業名
 */
function renderJobMatchGauge(containerId, jobMatchData, targetCompany) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const score = Math.min(100, Math.max(0, jobMatchData.score || 0));
  const pct = `${score}%`;

  let scoreColor = '#3b82f6';
  if (score >= 80) scoreColor = '#22c55e';
  else if (score < 60) scoreColor = '#f97316';

  const reasonsHtml = (jobMatchData.reasons || [])
    .map(r => `<li class="text-sm text-gray-700 flex items-start gap-1"><span class="text-green-500 flex-shrink-0">✓</span><span>${escapeHtml(r)}</span></li>`)
    .join('');

  const concernsHtml = (jobMatchData.concerns || [])
    .map(c => `<li class="text-sm text-gray-700 flex items-start gap-1"><span class="text-orange-400 flex-shrink-0">△</span><span>${escapeHtml(c)}</span></li>`)
    .join('');

  container.innerHTML = `
    <div class="gauge-container">
      <div class="gauge-circle" style="--gauge-pct: ${pct}; background: conic-gradient(${scoreColor} ${pct}, #e2e8f0 ${pct});">
        <div class="gauge-inner">
          <span class="gauge-score" style="color: ${scoreColor};">${score}</span>
          <span class="gauge-label-text">/ 100</span>
        </div>
      </div>
      <p class="text-sm font-semibold text-gray-700 mt-2">
        ${targetCompany ? `${escapeHtml(targetCompany)}への` : ''}マッチ度
      </p>
    </div>
    <div class="mt-3 grid grid-cols-1 gap-3">
      ${reasonsHtml ? `
        <div>
          <p class="text-xs font-semibold text-green-700 mb-1">マッチする点</p>
          <ul class="space-y-1">${reasonsHtml}</ul>
        </div>` : ''}
      ${concernsHtml ? `
        <div>
          <p class="text-xs font-semibold text-orange-600 mb-1">懸念点</p>
          <ul class="space-y-1">${concernsHtml}</ul>
        </div>` : ''}
    </div>
  `;
}

/**
 * HTMLエスケープ
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
