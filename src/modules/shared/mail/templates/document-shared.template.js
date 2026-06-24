import { baseLayout, primaryButton, infoRow, BRAND } from './base.layout.js';

export function documentSharedTemplate({
  recipientName,
  sharedByName,
  documentTitle,
  documentUrl,
  role = 'EDITOR',
  workspaceName,
}) {
  const title = 'A document was shared with you';
  const url = documentUrl || BRAND.appUrl;

  const html = baseLayout({
    preheader: `${sharedByName} shared "${documentTitle}" with you on SyncDoc.`,
    title,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;color:${BRAND.muted};line-height:1.6;">
        Hi ${recipientName || 'there'},
      </p>
      <p style="margin:0 0 20px;font-size:15px;color:${BRAND.text};line-height:1.6;">
        <strong>${sharedByName}</strong> has shared a document with you on SyncDoc.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#f9fafb;border-radius:8px;border:1px solid ${BRAND.border};">
        <tr><td style="padding:16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${infoRow('Document', documentTitle)}
            ${workspaceName ? infoRow('Workspace', workspaceName) : ''}
            ${infoRow('Your role', role)}
            ${infoRow('Shared by', sharedByName)}
          </table>
        </td></tr>
      </table>
      ${primaryButton(url, 'Open Document')}
      <p style="margin:0;font-size:13px;color:${BRAND.muted};line-height:1.6;">
        You can view and edit this document based on the role assigned to you. Changes sync automatically across all collaborators.
      </p>
    `,
  });

  const text = `Hi ${recipientName || 'there'},\n\n${sharedByName} shared "${documentTitle}" with you (${role}).\n\nOpen: ${url}`;

  return { html, text };
}
