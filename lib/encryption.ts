// lib/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

export function encryptSecret(text: string): string {
    const keyString = process.env.PAYMENT_ENCRYPTION_KEY;
    if (!keyString || keyString.length < 32) throw new Error('Llave de encriptación inválida en el servidor');

    const key = Buffer.from(keyString.slice(0, 32), 'utf-8');
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    // Estructura: IV : SALT : TAG : TEXTO ENCRIPTADO
    return `${iv.toString('hex')}:${salt.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decryptSecret(encryptedText: string): string {
    const keyString = process.env.PAYMENT_ENCRYPTION_KEY;
    if (!keyString || keyString.length < 32) throw new Error('Llave de encriptación inválida en el servidor');

    const key = Buffer.from(keyString.slice(0, 32), 'utf-8');
    const parts = encryptedText.split(':');
    
    if (parts.length !== 4) throw new Error('Formato de encriptación corrupto');
    
    const [ivHex, saltHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}