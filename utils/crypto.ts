// utils/crypto.ts
import crypto from 'crypto';

// Debes añadir ENCRYPTION_KEY en tu .env (debe ser una cadena aleatoria de 32 bytes en hex o base64)
// Ejemplo de generación en consola: openssl rand -hex 32
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ''; 
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    throw new Error('Variables de entorno de encriptación mal configuradas.');
  }
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Guardamos: IV + AuthTag + EncryptedText separados por ':'
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(hash: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    throw new Error('Variables de entorno de encriptación mal configuradas.');
  }

  const parts = hash.split(':');
  if (parts.length !== 3) throw new Error('Formato de hash inválido');

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}