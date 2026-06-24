import { baseLayout, primaryButton, BRAND } from './base.layout.js';

export function accountCreatedTemplate({ name, email }) {
  const title = 'Welcome to SyncDoc!';
  const loginUrl = `${BRAND.appUrl}/login`;

  const html = baseLayout({
    preheader: 'Your account has been successfully created. Sign in to start collaborating.',
    title,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;color:${BRAND.muted};line-height:1.6;">
        Hi ${name || 'there'},
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:${BRAND.text};line-height:1.6;">
        Your SyncDoc account (<strong>${email}</strong>) has been successfully verified and is ready to use.
      </p>
      <div style="margin:20px 0;padding:16px;background:#ecfdf5;border-radius:8px;border-left:4px solid #10b981;">
        <p style="margin:0;font-size:14px;color:#065f46;line-height:1.5;">
          ✓ Email verified &nbsp;·&nbsp; ✓ Workspace ready &nbsp;·&nbsp; ✓ Offline editing enabled
        </p>
      </div>
      <p style="margin:0 0 8px;font-size:15px;color:${BRAND.text};line-height:1.6;">
        Create documents, collaborate in real time, and keep working even when you're offline.
      </p>
      ${primaryButton(loginUrl, 'Go to Dashboard')}
    `,
  });

  const text = `Hi ${name || 'there'},\n\nYour SyncDoc account (${email}) has been successfully created.\n\nSign in at: ${loginUrl}`;

  return { html, text };
}
