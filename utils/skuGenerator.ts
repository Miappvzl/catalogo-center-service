/**
 * Genera un SKU inteligente basado en categoría, nombre y un hash único.
 * Ejemplo de salida: CAM-Ove-A1B2 (Camisa - Oversize - Hash)
 */
export const generateSmartSKU = (category?: string, name?: string): string => {
  // Limpiar y extraer 3 letras de categoría y nombre
  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '').trim().toUpperCase();
  
  const catPart = category && category.length > 0 ? sanitize(category).substring(0, 3) : 'GEN';
  const namePart = name && name.length > 0 ? sanitize(name).substring(0, 3) : 'PRD';
  
  // Generar un hash corto de 4 caracteres alfanuméricos
  const hashPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `${catPart}-${namePart}-${hashPart}`;
};