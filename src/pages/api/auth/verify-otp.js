import { verifyOtpSchema } from '@shared/lib/validations/schemas';
import { verifyOtpAndSendPassword } from '@shared/lib/auth/registration';
import { rateLimit } from '@shared/lib/security/rate-limit';
import { getClientIpFromReq, sendJson, methodNotAllowed } from '@shared/utils/api-response';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const limit = await rateLimit(getClientIpFromReq(req));
  if (!limit.success) return sendJson(res, 429, { error: 'Rate limit exceeded' });

  try {
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) return sendJson(res, 400, { error: parsed.error.flatten() });
    const result = await verifyOtpAndSendPassword(parsed.data);
    return sendJson(res, 200, result);
  } catch (err) {
    return sendJson(res, 400, { error: err.message });
  }
}
