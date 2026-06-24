export const MAIL_TYPES = {
  OTP_VERIFICATION: 'otp-verification',
  ACCOUNT_CREATED: 'account-created',
  DEFAULT_PASSWORD: 'default-password',
  DOCUMENT_SHARED: 'document-shared',
  DOCUMENT_INVITE: 'document-invite',
  PASSWORD_RESET: 'password-reset',
};

export const MAIL_SUBJECTS = {
  [MAIL_TYPES.OTP_VERIFICATION]: 'Verify your email — SyncDoc',
  [MAIL_TYPES.ACCOUNT_CREATED]: 'Welcome to SyncDoc — Account created',
  [MAIL_TYPES.DEFAULT_PASSWORD]: 'Your SyncDoc temporary password',
  [MAIL_TYPES.DOCUMENT_SHARED]: 'A document was shared with you — SyncDoc',
  [MAIL_TYPES.DOCUMENT_INVITE]: 'You\'re invited to collaborate — SyncDoc',
  [MAIL_TYPES.PASSWORD_RESET]: 'Reset your SyncDoc password',
};
