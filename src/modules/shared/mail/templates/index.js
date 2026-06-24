import { MAIL_TYPES } from '../mail.constants.js';
import { otpVerificationTemplate } from './otp-verification.template.js';
import { accountCreatedTemplate } from './account-created.template.js';
import { defaultPasswordTemplate } from './default-password.template.js';
import { documentSharedTemplate } from './document-shared.template.js';
import { documentInviteTemplate } from './document-invite.template.js';
import { passwordResetTemplate } from './password-reset.template.js';

const TEMPLATE_RENDERERS = {
  [MAIL_TYPES.OTP_VERIFICATION]: otpVerificationTemplate,
  [MAIL_TYPES.ACCOUNT_CREATED]: accountCreatedTemplate,
  [MAIL_TYPES.DEFAULT_PASSWORD]: defaultPasswordTemplate,
  [MAIL_TYPES.DOCUMENT_SHARED]: documentSharedTemplate,
  [MAIL_TYPES.DOCUMENT_INVITE]: documentInviteTemplate,
  [MAIL_TYPES.PASSWORD_RESET]: passwordResetTemplate,
};

export function renderMailTemplate(type, data = {}) {
  const renderer = TEMPLATE_RENDERERS[type];
  if (!renderer) {
    throw new Error(`Unknown mail template type: ${type}`);
  }
  return renderer(data);
}

export {
  otpVerificationTemplate,
  accountCreatedTemplate,
  defaultPasswordTemplate,
  documentSharedTemplate,
  documentInviteTemplate,
  passwordResetTemplate,
};
