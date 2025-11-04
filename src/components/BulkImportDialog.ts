import { i18n } from '../scripts/i18n';
import { getDB, saveDB } from '../lib/libraryUtils';
import { getApi, convertSStoHHMMSS } from '../lib/utils';
import { render, html } from 'uhtml';


function showToast(message: string, type: 'success' | 'warning' | 'error' = 'success') {
  const toast = document.createElement('div');
  toast.className = `bulk-import-toast toast-${type}`;
  message.split('<br>').forEach(line => {
    const span = document.createElement('span');
    span.textContent = line.replace(/<strong>(.*?)<\/strong>/g, '$1'); 
    toast.appendChild(span);
    toast.appendChild(document.createElement('br'));
  });

  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 5000);

  toast.onclick = () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  };
}

export default function(dialog: HTMLDialogElement, collectionName: string, options: {
    collection: CollectionItem,
    close: () => void
}) {
  const close = options.close;

  const extractVideoId = (url: string): string | null => {
    const urlCount = (url.match(/https?:\/\//g) || []).length;
    const spaceCount = url.trim().split(/\s+/).length;

    if (urlCount > 1 || (spaceCount > 1 && url.includes('http'))) {
      return 'MULTIPLE_URLS';
    }

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/\s]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const fetchVideoInfo = async (videoId: string): Promise<CollectionItem | null> => {
    try {
      const api = getApi('piped');
      const response = await fetch(`${api}/streams/${videoId}`);

      if (!response.ok) throw new Error('Failed to fetch video info');

      const data = await response.json();

      return {
        id: videoId,
        title: data.title || 'Unknown Title',
        author: data.uploader || 'Unknown Channel',
        channelUrl: data.uploaderUrl || '',
        url: `/watch?v=${videoId}`,
        duration: (data.duration || data.lengthSeconds) > 0 ? convertSStoHHMMSS(data.duration || data.lengthSeconds) : 'LIVE',
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching info for ${videoId}:`, error);
      return null;
    }
  };

  const handleBulkImport = async (textarea: HTMLTextAreaElement) => {
    const urls = textarea.value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (urls.length === 0) {
      showToast(i18n('bulk_import_no_urls'), 'warning');
      return;
    }

    const results = {
      success: [] as string[],
      failed: [] as string[],
      duplicates: [] as string[],
      multipleUrls: [] as string[]
    };

    const progressToast = document.createElement('div');
    progressToast.className = 'bulk-import-toast toast-progress';
    progressToast.innerHTML = `${i18n('bulk_import_processing')}<br><span class="progress">0 / ${urls.length}</span>`;
    document.body.appendChild(progressToast);
    setTimeout(() => progressToast.classList.add('show'), 10);

    const db = getDB();
    if (!db[collectionName]) db[collectionName] = {};

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const videoId = extractVideoId(url);

      const progressSpan = progressToast.querySelector('.progress');
      if (progressSpan) progressSpan.textContent = `${i + 1} / ${urls.length}`;

      if (videoId === 'MULTIPLE_URLS') {
        results.multipleUrls.push(url);
        continue;
      }

      if (!videoId) {
        results.failed.push(url);
        continue;
      }

      if (videoId in db[collectionName]) {
        results.duplicates.push(url);
        continue;
      }

      const videoInfo = await fetchVideoInfo(videoId);
      if (!videoInfo) {
        results.failed.push(url);
        continue;
      }

      db[collectionName][videoInfo.id] = videoInfo;
      results.success.push(url);
    }

    progressToast.classList.remove('show');
    setTimeout(() => progressToast.remove(), 300);

    saveDB(db);

    const messages = [];
    let toastType: 'success' | 'warning' | 'error' = 'success';

    if (results.success.length > 0) {
      messages.push(`<strong>✓ ${results.success.length}</strong> ${i18n('bulk_import_added')}`);
    }
    if (results.duplicates.length > 0) {
      messages.push(`<strong>⚠ ${results.duplicates.length}</strong> ${i18n('bulk_import_duplicates')}`);
      if (results.success.length === 0) toastType = 'warning';
    }
    if (results.multipleUrls.length > 0) {
      messages.push(`<strong>⚠ ${results.multipleUrls.length}</strong> lines with multiple URLs (use one URL per line)`);
      if (results.success.length === 0) toastType = 'warning';
    }
    if (results.failed.length > 0) {
      messages.push(`<strong>✗ ${results.failed.length}</strong> ${i18n('bulk_import_failed')}`);
      if (results.success.length === 0) toastType = 'error';
    }

    showToast(messages.join('<br>'), toastType);
    textarea.value = '';

    if (results.success.length > 0) {
      setTimeout(() => location.reload(), 2000);
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const textarea = form.querySelector('textarea') as HTMLTextAreaElement;

    if (!textarea || !textarea.value.trim()) {
      showToast(i18n('bulk_import_no_urls'), 'warning');
      return;
    }

    handleBulkImport(textarea);
  };

  dialog.id = 'bulkImportDialog';
  dialog.onclick = (e) => {
    if (e.target === dialog) close();
  };

  render(dialog, html`
    <div class="bulk-import-dialog" @click=${(e: Event) => e.stopPropagation()}>
      <h2>
        <i class="ri-upload-line"></i>
        ${i18n('bulk_import_title')} - ${collectionName}
      </h2>

      <form @submit=${handleSubmit}>
        <div class="form-group">
          <label for="bulkUrlInput">
            <i class="ri-links-line"></i>
            ${i18n('bulk_import_urls_label')}
          </label>
          <textarea
            id="bulkUrlInput"
            placeholder="${i18n('bulk_import_placeholder')}"
            rows="10"
            required
          ></textarea>
          <small>${i18n('bulk_import_help_text')}</small>
        </div>

        <div class="button-group">
          <button type="button" @click=${close} class="btn-secondary">
            ${i18n('cancel')}
          </button>
          <button type="submit" class="btn-primary">
            <i class="ri-upload-line"></i>
            ${i18n('bulk_import_submit_button')}
          </button>
        </div>
      </form>

      <style>
        #bulkImportDialog {
          background: transparent;
          border: none;
          padding: 0;
        }

        .bulk-import-dialog {
          background: var(--bg-primary, #fff);
          padding: 24px;
          border-radius: 12px;
          max-width: 600px;
          width: 90vw;
          color: var(--text-primary, #000);
        }

        .bulk-import-dialog h2 {
          margin: 0 0 24px 0;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .form-group textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 6px;
          font-family: monospace;
          font-size: 13px;
          resize: vertical;
          background: var(--bg-secondary, #f9f9f9);
          color: var(--text-primary, #000);
        }

        .form-group textarea:focus {
          outline: none;
          border-color: #3ea6ff;
        }

        .form-group small {
          display: block;
          margin-top: 6px;
          color: var(--text-secondary, #666);
          font-size: 12px;
        }

        .button-group {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
          font-family: inherit;
        }

        .btn-primary {
          background: #3ea6ff;
          color: white;
        }

        .btn-primary:hover {
          background: #2d8fd8;
        }

        .btn-secondary {
          background: var(--bg-secondary, #f1f1f1);
          color: var(--text-primary, #333);
        }

        .btn-secondary:hover {
          background: var(--bg-hover, #e1e1e1);
        }

        /* Toast Notifications */
        .bulk-import-toast {
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 16px 20px;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          line-height: 1.5;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 10000;
          max-width: 400px;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .bulk-import-toast.show {
          opacity: 1;
          transform: translateY(0);
        }

        .toast-success {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .toast-warning {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .toast-error {
          background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
        }

        .toast-progress {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        .bulk-import-toast strong {
          font-weight: 600;
        }

        .bulk-import-toast .progress {
          font-weight: 600;
          font-size: 16px;
        }
      </style>
    </div>
  `);

  const handlePopState = () => { if (dialog.open) close(); };
  window.addEventListener('popstate', handlePopState, { once: true });
  history.pushState({ dialog: 'bulkImport' }, '');
  dialog.addEventListener('close', () => {
    window.removeEventListener('popstate', handlePopState);
    if (history.state?.dialog === 'bulkImport') history.back();
  }, { once: true });

  dialog.showModal();
}
