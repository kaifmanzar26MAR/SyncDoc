export function sendJson(res, status, data) {
  res.status(status).json(data);
}

export function methodNotAllowed(res, methods = ['GET', 'POST']) {
  res.setHeader('Allow', methods);
  res.status(405).json({ error: 'Method not allowed' });
}

export function getClientIpFromReq(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}
