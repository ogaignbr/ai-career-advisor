/**
 * pdf-reader.js
 * PDF.js を使用してクライアントサイドでPDFからテキストを抽出する
 */

// PDF.js ワーカーの設定
const PDF_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/**
 * PDFファイルからテキストを抽出する
 * @param {File} file - PDFファイル
 * @returns {Promise<string>} - 抽出されたテキスト文字列
 */
async function extractTextFromPDF(file) {
  // PDF.js グローバルワーカーの設定
  if (typeof pdfjsLib === 'undefined') {
    throw new Error('PDF.js が読み込まれていません。');
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;

  try {
    // ファイルをArrayBufferとして読み込む
    const arrayBuffer = await readFileAsArrayBuffer(file);

    // PDFドキュメントを読み込む
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;

    const numPages = pdfDocument.numPages;
    const textParts = [];

    // 全ページを処理
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      // テキストアイテムを結合
      const pageText = textContent.items
        .map(item => {
          if (item.str) {
            return item.str;
          }
          return '';
        })
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (pageText) {
        textParts.push(`【ページ ${pageNum}】\n${pageText}`);
      }
    }

    const fullText = textParts.join('\n\n');

    if (!fullText.trim()) {
      return '（PDFからテキストを抽出できませんでした。スキャン画像PDFの可能性があります。）';
    }

    return fullText;

  } catch (error) {
    console.error('PDF読み込みエラー:', error);

    if (error.message && error.message.includes('Invalid PDF')) {
      throw new Error('無効なPDFファイルです。ファイルが破損していないか確認してください。');
    } else if (error.message && error.message.includes('Password')) {
      throw new Error('パスワード保護されたPDFは読み込めません。');
    } else {
      throw new Error(`PDFの読み込みに失敗しました: ${error.message || '不明なエラー'}`);
    }
  }
}

/**
 * ファイルをArrayBufferとして読み込む
 * @param {File} file - 読み込むファイル
 * @returns {Promise<ArrayBuffer>}
 */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      resolve(event.target.result);
    };

    reader.onerror = () => {
      reject(new Error(`ファイルの読み込みに失敗しました: ${file.name}`));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * 画像ファイルをData URLとして読み込む
 * @param {File} file - 画像ファイル
 * @returns {Promise<string>} - Data URL
 */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      resolve(event.target.result);
    };

    reader.onerror = () => {
      reject(new Error(`画像の読み込みに失敗しました: ${file.name}`));
    };

    reader.readAsDataURL(file);
  });
}
