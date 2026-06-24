import { baseLayout, primaryButton, codeBox, BRAND } from './base.layout.js';

export function passwordResetTemplate({ name, resetUrl, otp, expiresInMinutes = 30 }) {
  const title = 'Reset your password';
  const useOtp = !!otp && !resetUrl;

  const html = baseLayout({
    preheader: useOtp ? `Your password reset code is ${otp}.` : 'Click the link to reset your SyncDoc password.',
    title,
    bodyHtml: useOtp
      ? `
      <p style="margin:0 0 16px;font-size:15px;color:${BRAND.muted};line-height:1.6;">Hi ${name || 'there'},</p>
      <p style="margin:0 0 8px;font-size:15px;color:${BRAND.text};line-height:1.6;">Use this code to reset your password:</p>
      ${codeBox(otp, 'Reset code')}
      <p style="margin:0;font-size:13px;color:${BRAND.muted};">Expires in ${expiresInMinutes} minutes.</p>
    `
      : `
      <p style="margin:0 0 16px;font-size:15px;color:${BRAND.muted};line-height:1.6;">Hi ${name || 'there'},</p>
      <p style="margin:0 0 16px;font-size:15px;color:${BRAND.text};line-height:1.6;">We received a request to reset your password. Click below to choose a new one.</p>
      ${primaryButton(resetUrl, 'Reset Password')}
      <p style="margin:16px 0 0;font-size:13px;color:${BRAND.muted};">If you didn't request this, ignore this email. The link expires in ${expiresInMinutes} minutes.</p>
    `,
  });

  const text = useOtp
    ? `Hi ${name},\n\nYour password reset code: ${otp}\nExpires in ${expiresInMinutes} minutes.`
    : `Hi ${name},\n\nReset your password: ${resetUrl}`;

  return { html, text };
}
