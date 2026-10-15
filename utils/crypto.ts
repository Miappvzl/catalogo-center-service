import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// Respaldo de seguridad de 32 bytes para garantizar que el servidor jamás colapse
const FALLBACK_KEY = 'preziso_vault_master_secure_key_2026_prod_32';

function getValidKey(): Buffer {
  const rawKey = (process.env.ENCRYPTION_KEY || '').trim();
  const effectiveKey = rawKey.length >= 32 ? rawKey : FALLBACK_KEY;
  return Buffer.from(effectiveKey.slice(0, 32));
}

export function encrypt(text: string): string {
  const key = getValidKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(hash: string): string {
  const key = getValidKey();

  const parts = hash.split(':');
  if (parts.length !== 3) throw new Error('Formato de hash inválido');

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}