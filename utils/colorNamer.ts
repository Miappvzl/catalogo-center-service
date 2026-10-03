// utils/colorNamer.ts

interface ColorEntry {
  name: string
  r: number
  g: number
  b: number
}

// 🚀 DICCIONARIO CURADO DE ALTA CONVERSIÓN EN ESPAÑOL RETAIL
const COMMERCIAL_PALETTE: ColorEntry[] = [
  // Blancos y Neutros Claros
  { name: 'Blanco Puro', r: 255, g: 255, b: 255 },
  { name: 'Blanco Hueso', r: 248, g: 249, b: 250 },
  { name: 'Marfil', r: 255, g: 255, b: 240 },
  { name: 'Crema', r: 253, g: 245, b: 230 },
  { name: 'Perla', r: 234, g: 234, b: 234 },

  // Negros, Carbón y Grises
  { name: 'Negro', r: 0, g: 0, b: 0 },
  { name: 'Negro Azabache', r: 18, g: 18, b: 18 },
  { name: 'Carbón', r: 38, g: 38, b: 38 },
  { name: 'Grafito', r: 55, g: 65, b: 81 },
  { name: 'Gris Plomo', r: 75, g: 85, b: 99 },
  { name: 'Gris Ratón', r: 107, g: 114, b: 128 },
  { name: 'Gris Ceniza', r: 156, g: 163, b: 175 },
  { name: 'Gris Plata', r: 209, g: 213, b: 219 },
  { name: 'Gris Claro', r: 229, g: 231, b: 235 },

  // Azules
  { name: 'Azul Marino', r: 26, g: 36, b: 86 },
  { name: 'Azul Noche', r: 15, g: 23, b: 42 },
  { name: 'Azul Petróleo', r: 22, g: 78, b: 99 },
  { name: 'Azul Rey', r: 29, g: 78, b: 216 },
  { name: 'Azul Cobalto', r: 0, g: 71, b: 171 },
  { name: 'Azul Francia', r: 37, g: 99, b: 235 },
  { name: 'Azul Eléctrico', r: 0, g: 102, b: 255 },
  { name: 'Azul Índigo', r: 79, g: 70, b: 229 },
  { name: 'Azul Denim', r: 59, g: 130, b: 246 },
  { name: 'Azul Acero', r: 70, g: 130, b: 180 },
  { name: 'Azul Celeste', r: 56, g: 189, b: 248 },
  { name: 'Azul Cielo', r: 125, g: 211, b: 252 },
  { name: 'Azul Bebé', r: 186, g: 230, b: 253 },
  { name: 'Turquesa', r: 20, g: 184, b: 166 },
  { name: 'Aguamarina', r: 45, g: 212, b: 191 },

  // Rojos y Vinos
  { name: 'Rojo Carmesí', r: 220, g: 38, b: 38 },
  { name: 'Rojo Escarlata', r: 239, g: 68, b: 68 },
  { name: 'Rojo Pasión', r: 185, g: 28, b: 28 },
  { name: 'Rojo Rubí', r: 155, g: 17, b: 30 },
  { name: 'Vinotinto', r: 107, g: 15, b: 26 },
  { name: 'Borgoña', r: 128, g: 0, b: 32 },
  { name: 'Granate', r: 90, g: 10, b: 20 },
  { name: 'Ladrillo', r: 180, g: 60, b: 40 },
  { name: 'Terracota', r: 204, g: 78, b: 44 },
  { name: 'Coral', r: 244, g: 63, b: 94 },

  // Verdes
  { name: 'Verde Militar', r: 77, g: 124, b: 15 },
  { name: 'Verde Oliva', r: 101, g: 130, b: 30 },
  { name: 'Verde Musgo', r: 60, g: 80, b: 40 },
  { name: 'Verde Botella', r: 10, g: 60, b: 30 },
  { name: 'Verde Pino', r: 20, g: 83, b: 45 },
  { name: 'Verde Bosque', r: 22, g: 101, b: 52 },
  { name: 'Verde Esmeralda', r: 5, g: 150, b: 105 },
  { name: 'Verde Selva', r: 16, g: 185, b: 129 },
  { name: 'Verde Manzana', r: 132, g: 204, b: 22 },
  { name: 'Verde Lima', r: 163, g: 230, b: 53 },
  { name: 'Verde Menta', r: 110, g: 231, b: 183 },
  { name: 'Verde Salvia', r: 156, g: 175, b: 136 },
  { name: 'Caqui', r: 163, g: 147, b: 92 },

  // Rosados y Púrpuras
  { name: 'Rosado', r: 244, g: 114, b: 182 },
  { name: 'Palo de Rosa', r: 219, g: 139, b: 154 },
  { name: 'Rosado Bebé', r: 251, g: 207, b: 232 },
  { name: 'Fucsia', r: 217, g: 70, b: 239 },
  { name: 'Magenta', r: 192, g: 38, b: 211 },
  { name: 'Morado', r: 126, g: 34, b: 206 },
  { name: 'Púrpura', r: 147, g: 51, b: 234 },
  { name: 'Violeta', r: 109, g: 40, b: 217 },
  { name: 'Lila', r: 196, g: 181, b: 253 },
  { name: 'Lavanda', r: 224, g: 215, b: 247 },
  { name: 'Uva', r: 88, g: 28, b: 135 },

  // Tierras, Marrones y Nudes
  { name: 'Marrón Chocolate', r: 66, g: 32, b: 6 },
  { name: 'Marrón Café', r: 88, g: 47, b: 14 },
  { name: 'Marrón Cuero', r: 120, g: 53, b: 15 },
  { name: 'Marrón Caramelo', r: 180, g: 83, b: 9 },
  { name: 'Habano', r: 138, g: 90, b: 43 },
  { name: 'Canela', r: 160, g: 82, b: 45 },
  { name: 'Nude', r: 226, g: 186, b: 160 },
  { name: 'Beige', r: 245, g: 245, b: 220 },
  { name: 'Arena', r: 227, g: 213, b: 184 },
  { name: 'Camel', r: 193, g: 154, b: 107 },

  // Amarillos y Naranjas
  { name: 'Amarillo', r: 234, g: 179, b: 8 },
  { name: 'Amarillo Mostaza', r: 202, g: 138, b: 4 },
  { name: 'Amarillo Pastel', r: 254, g: 240, b: 138 },
  { name: 'Ocre', r: 180, g: 130, b: 20 },
  { name: 'Naranja', r: 249, g: 115, b: 22 },
  { name: 'Mandarina', r: 251, g: 146, b: 60 },
  { name: 'Melocotón', r: 253, g: 186, b: 116 },

  // Metálicos Visuales
  { name: 'Dorado', r: 212, g: 175, b: 55 },
  { name: 'Oro Rosa', r: 183, g: 110, b: 121 },
  { name: 'Bronce', r: 140, g: 80, b: 30 }
]

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '').trim()
  if (clean.length < 6) return null
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16)
  }
}

/**
 * 🚀 ALGORITMO REDMEAN (Aproximación perceptual al ojo humano)
 * Mucho más preciso que la simple distancia euclidiana en RGB
 */
function getPerceptualDistance(c1: { r: number; g: number; b: number }, c2: ColorEntry): number {
  const rmean = (c1.r + c2.r) / 2
  const r = c1.r - c2.r
  const g = c1.g - c2.g
  const b = c1.b - c2.b
  return Math.sqrt(
    (((512 + rmean) * r * r) >> 8) +
    4 * g * g +
    (((767 - rmean) * b * b) >> 8)
  )
}

/**
 * Retorna el nombre comercial más cercano para un código Hex individual
 */
export function getSingleColorName(hex: string): string {
  if (!hex || hex === 'transparent' || hex === '#transparent') return 'Transparente'
  const rgb = hexToRgb(hex)
  if (!rgb) return 'Personalizado'

  let closestColor = COMMERCIAL_PALETTE[0]
  let minDistance = Infinity

  for (let i = 0; i < COMMERCIAL_PALETTE.length; i++) {
    const distance = getPerceptualDistance(rgb, COMMERCIAL_PALETTE[i])
    if (distance < minDistance) {
      minDistance = distance
      closestColor = COMMERCIAL_PALETTE[i]
    }
  }

  return closestColor.name
}

/**
 * 🚀 MOTOR MAESTRO AUTO-NOMBRADOR (Soporta Unicolor y Bicolor)
 * Resuelve colisiones como "Azul Marino / Azul Marino" convirtiéndolo en "Bicolor Azul"
 */
export function autoGenerateColorwayName(hexString: string): string {
  if (!hexString) return ''

  if (hexString.includes(',')) {
    const [h1, h2] = hexString.split(',')
    const name1 = getSingleColorName(h1)
    const name2 = getSingleColorName(h2)

    // Si ambos tonos caen en la misma familia de color (ej. Azul Marino / Azul Rey)
    if (name1 === name2) {
      return `${name1} Tonal`
    }

    return `${name1} / ${name2}`
  }

  return getSingleColorName(hexString)
}