import { RateLimiterMemory } from 'rate-limiter-flexible';

const limiter = new RateLimiterMemory({
  points: 100,
  duration: 60,
});

export async function rateLimit(identifier) {
  try {
    await limiter.consume(identifier);
    return { success: true };
  } catch {
    return { success: false, retryAfter: 60 };
  }
}

export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}
