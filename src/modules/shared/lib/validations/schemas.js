import { z } from 'zod';

export const MAX_SYNC_PAYLOAD_BYTES = 256 * 1024;
export const MAX_YJS_UPDATE_BYTES = 64 * 1024;
export const MAX_OPS_PER_BATCH = 50;

export const registerSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().max(255).toLowerCase(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email().toLowerCase(),
  otp: z.string().length(6).regex(/^\d+$/),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(128),
});

export const documentCreateSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  workspaceId: z.string().min(1),
  content: z.string().max(500_000).optional().default(''),
});

export const documentUpdateSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  content: z.string().max(500_000).optional(),
});

export const documentShareEmailSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  role: z.enum(['EDITOR', 'VIEWER']),
});

export const documentShareLinkSchema = z.object({
  linkEnabled: z.boolean(),
});

export const documentShareUpdateSchema = z.object({
  targetType: z.enum(['member', 'invite']),
  targetId: z.string().min(1),
  role: z.enum(['EDITOR', 'VIEWER']),
});

export const documentShareRemoveSchema = z.object({
  targetType: z.enum(['member', 'invite']),
  targetId: z.string().min(1),
});

export const syncOperationSchema = z.object({
  clientId: z.string().uuid(),
  operationType: z.enum(['CONTENT_UPDATE', 'TITLE_UPDATE', 'YJS_UPDATE', 'SNAPSHOT', 'RESTORE']),
  payload: z.record(z.unknown()),
  logicalClock: z.number().int().nonnegative(),
  idempotencyKey: z.string().min(8).max(128),
});

export const syncBatchSchema = z.object({
  operations: z.array(syncOperationSchema).min(1).max(MAX_OPS_PER_BATCH),
  lastPullClock: z.number().int().nonnegative().default(0),
  sessionId: z.string().optional(),
});

export const versionCreateSchema = z.object({
  label: z.string().max(200).optional().default(''),
});

export function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '');
}

export function validateBodySize(body, maxBytes = MAX_SYNC_PAYLOAD_BYTES) {
  const size = Buffer.byteLength(JSON.stringify(body), 'utf8');
  if (size > maxBytes) {
    throw new Error(`Payload exceeds ${maxBytes} bytes`);
  }
}
