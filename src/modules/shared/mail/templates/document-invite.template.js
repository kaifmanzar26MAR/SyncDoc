import { baseLayout, primaryButton, infoRow, BRAND } from './base.layout.js';

export function documentInviteTemplate({
  recipientName,
  invitedByName,
  documentTitle,
  inviteUrl,
  role = 'EDITOR',
  message,
}) {
  const title = 'You\'re invited to collaborate';
  const url = inviteUrl || `${BRAND.appUrl}/register`;

  const html = baseLayout({
    preheader: `${invitedByName} invited you to collaborate on "${documentTitle}".`,
    title,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;color:${BRAND.muted};line-height:1.6;">
        Hi ${recipientName || 'there'},
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:${BRAND.text};line-height:1.6;">
        <strong>${invitedByName}</strong> has invited you to collaborate on a document in SyncDoc.
      </p>
      ${message ? `<blockquote style="margin:0 0 20px;padding:12px 16px;border-left:4px solid ${BRAND.primary};background:#f5f3ff;font-size:14px;color:${BRAND.text};font-style:italic;">"${message}"</blockquote>` : ''}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#f9fafb;border-radius:8px;border:1px solid ${BRAND.border};">
        <tr><td style="padding:16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${infoRow('Document', documentTitle)}
            ${infoRow('Role', role)}
            ${infoRow('Invited by', invitedByName)}
          </table>
        </td></tr>
      </table>
      ${primaryButton(url, 'Accept Invitation')}
      <p style="margin:0;font-size:13px;color:${BRAND.muted};line-height:1.6;">
        Don't have a SyncDoc account yet? Click the button above to register — it only takes a minute.
      </p>
    `,
  });

  const text = `Hi ${recipientName || 'there'},\n\n${invitedByName} invited you to collaborate on "${documentTitle}" as ${role}.\n\nAccept: ${url}`;

  return { html, text };
}
