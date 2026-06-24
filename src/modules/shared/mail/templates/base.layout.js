const BRAND = {
  name: 'SyncDoc',
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  text: '#111827',
  muted: '#6b7280',
  bg: '#f9fafb',
  card: '#ffffff',
  border: '#e5e7eb',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};

export function baseLayout({ preheader, title, bodyHtml, footerNote }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <!--[if mso]><style>table{border-collapse:collapse;}td{font-family:Arial,sans-serif;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader || ''}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${BRAND.bg};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${BRAND.card};border-radius:12px;border:1px solid ${BRAND.border};overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND.primary} 0%,${BRAND.primaryDark} 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">📄 ${BRAND.name}</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px;">Local-first collaborative documents</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:${BRAND.text};line-height:1.3;">${title}</h1>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid ${BRAND.border};background:#fafafa;">
              <p style="margin:0;font-size:12px;color:${BRAND.muted};line-height:1.6;text-align:center;">
                ${footerNote || `© ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.`}
                <br />
                <a href="${BRAND.appUrl}" style="color:${BRAND.primary};text-decoration:none;">${BRAND.appUrl.replace(/^https?:\/\//, '')}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function primaryButton(href, label) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:8px;background:${BRAND.primary};">
        <a href="${href}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

export function codeBox(code, label = 'Verification code') {
  return `<div style="margin:20px 0;padding:20px;background:#f3f4f6;border-radius:8px;text-align:center;border:1px dashed ${BRAND.border};">
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:${BRAND.muted};margin-bottom:8px;">${label}</div>
    <div style="font-size:32px;font-weight:700;letter-spacing:0.25em;color:${BRAND.primary};font-family:monospace;">${code}</div>
  </div>`;
}

export function infoRow(label, value) {
  return `<tr>
    <td style="padding:8px 0;font-size:14px;color:${BRAND.muted};width:120px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;font-size:14px;color:${BRAND.text};font-weight:500;">${value}</td>
  </tr>`;
}

export { BRAND };
