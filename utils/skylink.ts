import crypto from 'crypto';

/**
 * Genera la firma HMAC-SHA256 exigida por SkylinkPay
 * REGLA ESTRICTA: payload debe estar con las llaves ordenadas alfabéticamente (A-Z) y sin espacios.
 */
export function generateSkylinkSignature(
  method: 'POST' | 'GET',
  path: string,
  payload: Record<string, any>,
  apiKey: string
): { timestamp: string; signature: string; bodyString: string } {
  const timestamp = Date.now().toString();

  // 1. Ordenamiento estricto A-Z del JSON
  const sortedPayload = Object.keys(payload)
    .sort()
    .reduce((acc: Record<string, any>, key) => {
      acc[key] = payload[key];
      return acc;
    }, {});

  // 2. Creación del JSON compacto (sin espacios)
  const bodyString = Object.keys(sortedPayload).length > 0 
    ? JSON.stringify(sortedPayload) 
    : '';

  // 3. Cadena Canónica: METHOD\npath\ntimestamp\nbody
  const rawString = [method.toUpperCase(), path, timestamp, bodyString].join('\n');

  // 4. Firma HMAC-SHA256
  const signature = crypto
    .createHmac('sha256', apiKey)
    .update(rawString)
    .digest('hex');

  return { timestamp, signature, bodyString };
}