import crypto from 'crypto';

/**
 * Generador canónico de firma HMAC-SHA256 para Skylink Pay
 */
export function generateSkylinkSignature(
  method: 'POST' | 'GET',
  path: string,
  payload: Record<string, any>,
  apiKey: string
): { timestamp: string; signature: string; bodyString: string } {
  // 1. Limpieza absoluta de la API Key (sin espacios, comillas ni saltos de línea)
  const cleanApiKey = apiKey.replace(/[\s'"\`]/g, '');
  const timestamp = Date.now().toString();

  // 2. Serialización idéntica al snippet oficial de Skylink
  const bodyString = method === 'GET' || Object.keys(payload).length === 0
    ? ''
    : JSON.stringify(payload, Object.keys(payload).sort());

  // 3. Cadena canónica: METHOD\npath\ntimestamp\nbody
  const rawString = [method.toUpperCase(), path, timestamp, bodyString].join('\n');

  // 4. Firma HMAC-SHA256 en hexadecimal
  const signature = crypto
    .createHmac('sha256', cleanApiKey)
    .update(rawString)
    .digest('hex');

  return { timestamp, signature, bodyString };
}