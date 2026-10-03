// utils/colorUtils.ts
import React from 'react';

/**
 * Parsea un color_hex (sólido o bicolor) y devuelve el objeto CSS optimizado.
 * Soporta:
 * - Color sólido: "#000000"
 * - Bicolor: "#000000,#FFFFFF" -> linear-gradient 135deg
 * - Transparentes: "transparent", "#transparent"
 */
export function getVariantSwatchStyle(colorHex?: string | null): React.CSSProperties {
  if (!colorHex || colorHex === 'transparent' || colorHex === '#transparent') {
    return { backgroundColor: 'transparent' };
  }

  // Si contiene coma, es una variante Bicolor
  if (colorHex.includes(',')) {
    const [c1, c2] = colorHex.split(',');
    const color1 = c1?.trim() || '#000000';
    const color2 = c2?.trim() || color1;
    return {
      background: `linear-gradient(135deg, ${color1} 50%, ${color2} 50%)`
    };
  }

  // Tono sólido clásico
  return {
    backgroundColor: colorHex
  };
}