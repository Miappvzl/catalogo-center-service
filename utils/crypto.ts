import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const FALLBACK_KEY = 'preziso_vault_master_secure_key_2026_prod_32';

function getCandidateKeys(): Buffer[] {
  const rawKey = (process.env.ENCRYPTION_KEY || '').trim().replace(/^["']|["']$/g, ''); // Remueve comillas accidentales
  const keys: Buffer[] = [];

  // 1. Si mide 64 caracteres (típico de openssl hex), probar decodificación hexadecimal
  if (rawKey.length === 64) {
    try {
      keys.push(Buffer.from(rawKey, 'hex'));
    } catch {}
  }

  // 2. Probar como cadena UTF-8 directa de 32 bytes
  if (rawKey.length >= 32) {
    keys.push(Buffer.from(rawKey.slice(0, 32), 'utf8'));
  }

  // 3. Clave maestra de respaldo garantizada (32 bytes)
  keys.push(Buffer.from(FALLBACK_KEY.slice(0, 32), 'utf8'));

  return keys;
}

export function encrypt(text: string): string {
  // Para encriptar siempre usamos la clave principal disponible
  const keys = getCandidateKeys();
  const key = keys[0];
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(hash: string): string {
  if (!hash) return '';

  // Si por alguna razón la llave ya es la API Key en texto plano (64 hex chars sin colons)
  if (!hash.includes(':') && hash.length === 64) {
    return hash;
  }

  const parts = hash.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato de hash inválido');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = parts[2];

  const candidateKeys = getCandidateKeys();

  // Probar cada clave candidata hasta que una desencripte exitosamente
  for (const key of candidateKeys) {
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      if (decrypted) {
        return decrypted;
      }
    } catch {
      // Si la clave no coincide, continuamos silenciosamente con la siguiente
      continue;
    }
  }

  throw new Error('No se pudo autenticar la llave con ninguna de las credenciales de cifrado del servidor.');
}