import { baseLayout, codeBox, BRAND } from './base.layout.js';

export function otpVerificationTemplate({ name, otp, expiresInMinutes = 15 }) {
  const title = 'Verify your email address';
  const html = baseLayout({
    preheader: `Your verification code is ${otp}. It expires in ${expiresInMinutes} minutes.`,
    title,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;color:${BRAND.muted};line-height:1.6;">
        Hi ${name || 'there'},
      </p>
      <p style="margin:0 0 8px;font-size:15px;color:${BRAND.text};line-height:1.6;">
        Use the code below to verify your email and complete your SyncDoc registration.
      </p>
      ${codeBox(otp, 'One-time password')}
      <p style="margin:16px 0 0;font-size:13px;color:${BRAND.muted};line-height:1.6;">
        This code expires in <strong>${expiresInMinutes} minutes</strong>. If you didn't request this, you can safely ignore this email.
      </p>
    `,
  });

  const text = `Hi ${name || 'there'},\n\nYour SyncDoc verification code is: ${otp}\n\nThis code expires in ${expiresInMinutes} minutes.\n\nIf you didn't request this, ignore this email.`;

  return { html, text };
}
