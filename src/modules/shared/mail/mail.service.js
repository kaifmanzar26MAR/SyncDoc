import nodemailer from "nodemailer";
import { MAIL_TYPES, MAIL_SUBJECTS } from "./mail.constants.js";
import { renderMailTemplate } from "./templates/index.js";

class MailService {
  constructor() {
    this._transporter = null;
  }

  getTransporter() {
    if (this._transporter) return this._transporter;

    this._transporter = nodemailer.createTransport({
      service: "gmail",
      auth: process.env.MAIL_USER
        ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD }
        : undefined,
    });

    return this._transporter;
  }

  getFromAddress() {
    return process.env.SMTP_FROM || "SyncDoc <noreply@syncdoc.app>";
  }

  async send({ to, type, data = {}, subject, attachments }) {
    if (!to) throw new Error("Mail recipient (to) is required");

    const { html, text } = renderMailTemplate(type, data);
    const mailSubject =
      subject || MAIL_SUBJECTS[type] || "SyncDoc Notification";

    const payload = {
      from: this.getFromAddress(),
      to,
      subject: mailSubject,
      html,
      text,
      attachments,
    };

    // if (process.env.NODE_ENV === "development") {
    //   console.log("[MailService] Dev mode — email not sent:", {
    //     to,
    //     type,
    //     subject: mailSubject,
    //   });
    //   console.log("[MailService] Text preview:", text);
    //   return { messageId: "dev-mode-skipped", accepted: [to] };
    // }

    const result = await this.getTransporter().sendMail(payload);
    console.log(
      `[MailService] Sent ${type} to ${to} — id: ${result.messageId}`,
    );
    return result;
  }

  async sendOtpVerification({ to, name, otp, expiresInMinutes = 15 }) {
    return this.send({
      to,
      type: MAIL_TYPES.OTP_VERIFICATION,
      data: { name, otp, expiresInMinutes },
    });
  }

  async sendAccountCreated({ to, name, email }) {
    return this.send({
      to,
      type: MAIL_TYPES.ACCOUNT_CREATED,
      data: { name, email },
    });
  }

  async sendDefaultPassword({ to, name, password }) {
    return this.send({
      to,
      type: MAIL_TYPES.DEFAULT_PASSWORD,
      data: { name, password },
    });
  }

  async sendDocumentShared({
    to,
    recipientName,
    sharedByName,
    documentTitle,
    documentId,
    workspaceId,
    role,
    workspaceName,
  }) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const documentUrl =
      workspaceId && documentId
        ? `${appUrl}/workspace/${workspaceId}/document/${documentId}`
        : appUrl;

    return this.send({
      to,
      type: MAIL_TYPES.DOCUMENT_SHARED,
      data: {
        recipientName,
        sharedByName,
        documentTitle,
        documentUrl,
        role,
        workspaceName,
      },
    });
  }

  async sendDocumentInvite({
    to,
    recipientName,
    invitedByName,
    documentTitle,
    role,
    message,
    inviteToken,
  }) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = inviteToken
      ? `${appUrl}/register?invite=${inviteToken}`
      : `${appUrl}/register`;

    return this.send({
      to,
      type: MAIL_TYPES.DOCUMENT_INVITE,
      data: {
        recipientName,
        invitedByName,
        documentTitle,
        inviteUrl,
        role,
        message,
      },
    });
  }

  async sendPasswordReset({ to, name, resetUrl, otp, expiresInMinutes = 30 }) {
    return this.send({
      to,
      type: MAIL_TYPES.PASSWORD_RESET,
      data: { name, resetUrl, otp, expiresInMinutes },
    });
  }
}

export const mailService = new MailService();
export default mailService;
