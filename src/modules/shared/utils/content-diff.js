/**
 * Client-side HTML content diff for compare view.
 * Highlights changes between a snapshot and current content with optional user attribution.
 */

function stripTags(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

function parseBlocks(html) {
  const safe = html?.trim() || '<p><br></p>';
  const doc = new DOMParser().parseFromString(safe, 'text/html');
  const blocks = [];

  doc.body.childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      blocks.push({
        html: node.outerHTML,
        text: (node.textContent || '').replace(/\s+/g, ' ').trim(),
        tag: node.tagName.toLowerCase(),
      });
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      blocks.push({
        html: `<p>${node.textContent}</p>`,
        text: node.textContent.replace(/\s+/g, ' ').trim(),
        tag: 'p',
      });
    }
  });

  if (!blocks.length) {
    blocks.push({ html: '<p><br></p>', text: '', tag: 'p' });
  }

  return blocks;
}

function diffWords(oldText, newText) {
  const oldWords = oldText ? oldText.split(/\s+/).filter(Boolean) : [];
  const newWords = newText ? newText.split(/\s+/).filter(Boolean) : [];

  const m = oldWords.length;
  const n = newWords.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const ops = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      ops.unshift({ type: 'equal', text: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: 'insert', text: newWords[j - 1] });
      j--;
    } else {
      ops.unshift({ type: 'delete', text: oldWords[i - 1] });
      i--;
    }
  }

  return ops;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function findUserForText(text, changeLogs, snapshotCreatedAt) {
  if (!text?.trim() || !changeLogs?.length) return null;

  const snippet = text.trim().slice(0, 80).toLowerCase();
  const relevant = changeLogs.filter((log) => {
    if (!snapshotCreatedAt) return true;
    return new Date(log.createdAt) > new Date(snapshotCreatedAt);
  });

  for (let i = relevant.length - 1; i >= 0; i--) {
    const log = relevant[i];
    const preview = (log.payload?.preview || log.payload?.title || '').toLowerCase();
    if (preview && (preview.includes(snippet) || snippet.includes(preview.slice(0, 40)))) {
      return log.userName || log.userEmail || null;
    }
  }

  const last = relevant[relevant.length - 1];
  return last?.userName || last?.userEmail || null;
}

function wrapInlineDiff(oldText, newText, userName) {
  const ops = diffWords(oldText, newText);
  let html = '';
  let pendingInsert = [];
  let hasChange = false;

  const flushInserts = () => {
    if (!pendingInsert.length) return;
    hasChange = true;
    const inserted = pendingInsert.join(' ');
    html += `<span class="diff-added">${escapeHtml(inserted)}</span>`;
    if (userName) {
      html += `<span class="diff-user-tag">${escapeHtml(userName)}</span>`;
    }
    pendingInsert = [];
  };

  ops.forEach((op) => {
    if (op.type === 'equal') {
      flushInserts();
      html += `${escapeHtml(op.text)} `;
    } else if (op.type === 'insert') {
      pendingInsert.push(op.text);
    } else if (op.type === 'delete') {
      flushInserts();
      hasChange = true;
      html += `<span class="diff-removed">${escapeHtml(op.text)}</span> `;
    }
  });

  flushInserts();
  return { html: html.trim() || '<br>', hasChange };
}

/**
 * Build annotated HTML showing current content with diff highlights vs snapshot.
 */
export function buildCompareHtml(snapshotContent, currentContent, changeLogs = [], snapshotCreatedAt) {
  const oldBlocks = parseBlocks(snapshotContent);
  const newBlocks = parseBlocks(currentContent);
  const result = [];
  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < oldBlocks.length || newIdx < newBlocks.length) {
    const oldB = oldBlocks[oldIdx];
    const newB = newBlocks[newIdx];

    if (oldB && newB && oldB.text === newB.text) {
      result.push(newB.html);
      oldIdx++;
      newIdx++;
      continue;
    }

    if (oldB && newB && oldB.tag === newB.tag) {
      const userName = findUserForText(newB.text, changeLogs, snapshotCreatedAt);
      const { html, hasChange } = wrapInlineDiff(oldB.text, newB.text, userName);
      if (hasChange) {
        result.push(`<${newB.tag} class="diff-block-modified">${html}</${newB.tag}>`);
      } else {
        result.push(newB.html);
      }
      oldIdx++;
      newIdx++;
      continue;
    }

    if (!oldB || (newB && oldIdx > newIdx)) {
      const userName =
        findUserForText(newB.text, changeLogs, snapshotCreatedAt) ||
        changeLogs[changeLogs.length - 1]?.userName;
      result.push(
        `<${newB.tag} class="diff-block-added"><span class="diff-added">${escapeHtml(newB.text || '')}</span>${
          userName ? `<span class="diff-user-tag">${escapeHtml(userName)}</span>` : ''
        }</${newB.tag}>`,
      );
      newIdx++;
      continue;
    }

    const userName = findUserForText(oldB.text, changeLogs, snapshotCreatedAt);
    result.push(
      `<p class="diff-block-removed"><span class="diff-removed">${escapeHtml(stripTags(oldB.html))}</span>${
        userName ? `<span class="diff-user-tag">${escapeHtml(userName)}</span>` : ''
      }</p>`,
    );
    oldIdx++;
  }

  return result.join('') || currentContent || '<p><br></p>';
}

export function formatSnapshotDate(date) {
  if (!date) return 'Unknown date';
  const d = new Date(date);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
