// utils/validations.ts (Usa esta versión genérica para máxima seguridad)
export function isValidUUID(uuid: any): boolean {
  if (typeof uuid !== 'string') return false;
  // Expresión regular estándar RFC 4122 (Acepta cualquier versión de UUID sin riesgo de fallar)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}