import { baseLayout, primaryButton, codeBox, BRAND } from './base.layout.js';

export function defaultPasswordTemplate({ name, password }) {
  const title = 'Your temporary password';
  const loginUrl = `${BRAND.appUrl}/login`;

  const html = baseLayout({
    preheader: 'Your SyncDoc account is ready. Use this temporary password to sign in.',
    title,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;color:${BRAND.muted};line-height:1.6;">
        Hi ${name || 'there'},
      </p>
      <p style="margin:0 0 8px;font-size:15px;color:${BRAND.text};line-height:1.6;">
        Your email has been verified. Use the temporary password below to sign in for the first time.
      </p>
      ${codeBox(password, 'Temporary password')}
      <div style="margin:16px 0;padding:14px 16px;background:#fffbeb;border-radius:8px;border-left:4px solid #f59e0b;">
        <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
          <strong>Important:</strong> You will be prompted to set a new password on your first login. Do not share this password with anyone.
        </p>
      </div>
      ${primaryButton(loginUrl, 'Sign in to SyncDoc')}
    `,
    footerNote: 'For security, this password is single-use for initial access. Please reset it immediately after signing in.',
  });

  const text = `Hi ${name || 'there'},\n\nYour temporary SyncDoc password is: ${password}\n\nSign in at: ${loginUrl}\n\nYou will be asked to set a new password on first login.`;

  return { html, text };
}
