import { sanitizeHtml } from '@shared/lib/validations/schemas';

const EMPTY_HTML = '<p><br></p>';

export function normalizeEditorHtml(html) {
  if (!html || html === EMPTY_HTML) return '';
  return sanitizeHtml(html);
}

export function isEmptyEditorHtml(html) {
  return !html || html === '' || html === EMPTY_HTML;
}

export function isSameEditorContent(quill, html) {
  const nextHtml = normalizeEditorHtml(html);
  const currentHtml = quill.root.innerHTML;

  if (currentHtml === nextHtml) return true;
  if (isEmptyEditorHtml(nextHtml) && isEmptyEditorHtml(currentHtml)) return true;

  const currentDelta = quill.clipboard.convert({
    html: isEmptyEditorHtml(currentHtml) ? EMPTY_HTML : currentHtml,
  });
  const nextDelta = quill.clipboard.convert({
    html: isEmptyEditorHtml(nextHtml) ? EMPTY_HTML : nextHtml,
  });

  return JSON.stringify(currentDelta.ops) === JSON.stringify(nextDelta.ops);
}

export function applyEditorHtml(quill, html, source = 'silent') {
  const safeHtml = normalizeEditorHtml(html);

  if (isEmptyEditorHtml(safeHtml)) {
    quill.setText('');
    return;
  }

  const delta = quill.clipboard.convert({ html: safeHtml });
  quill.setContents(delta, source);
}
