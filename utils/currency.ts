/**
 * 💎 PREZISO FINANCIAL ENGINE: Módulo Central de Normalización y Formato Monetario
 * Estándar Contable Hispanoamericano: Coma (,) para decimales y Punto (.) para miles.
 */

// Formateador memoizado único en memoria para alto rendimiento (evita overhead en listas largas)
const numberFormatterVE = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const numberFormatterVESimple = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export type SupportedCurrency = 'usd' | 'ves' | 'eur' | string

interface FormatOptions {
  includeSymbol?: boolean
  spaceBeforeSymbol?: boolean
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

/**
 * Normaliza cualquier valor numérico o string a flotante seguro de JavaScript.
 * Maneja valores nulos, undefined o formatos corruptos devolviendo 0 de forma defensiva.
 */
export function sanitizeNumericValue(val: number | string | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return isNaN(val) ? 0 : val

  // Si viene con formato hispano "1.250,50", lo traduce a "1250.50"
  const cleaned = String(val)
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Formatea un monto en formato estándar hispano con coma decimal (ej. "25,00" o "1.250,50").
 */
export function formatNumberVE(
  amount: number | string | null | undefined,
  minimumFractionDigits: number = 2
): string {
  const safeNum = sanitizeNumericValue(amount)
  if (minimumFractionDigits === 0 && Number.isInteger(safeNum)) {
    return numberFormatterVESimple.format(safeNum)
  }
  return numberFormatterVE.format(safeNum)
}

/**
 * 💵 Formateador Canónico para Dólares Americanos (USD)
 * Resultado: "$25,00" o "$1.250,50"
 */
export function formatUSD(
  amount: number | string | null | undefined,
  includeSymbol: boolean = true
): string {
  const formatted = formatNumberVE(amount, 2)
  return includeSymbol ? `$${formatted}` : formatted
}

/**
 * 🇻🇪 Formateador Canónico para Bolívares Oficiales (VES / Bs)
 * Resultado: "Bs. 22.372,19" o "Bs. 1.250.000,00"
 */
export function formatVES(
  amount: number | string | null | undefined,
  includeSymbol: boolean = true
): string {
  const formatted = formatNumberVE(amount, 2)
  return includeSymbol ? `Bs. ${formatted}` : formatted
}

/**
 * 💶 Formateador Canónico para Euros (EUR)
 * Resultado: "€25,00"
 */
export function formatEUR(
  amount: number | string | null | undefined,
  includeSymbol: boolean = true
): string {
  const formatted = formatNumberVE(amount, 2)
  return includeSymbol ? `€${formatted}` : formatted
}

/**
 * 🌐 Formateador Polimórfico Inteligente según la divisa de la tienda
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: SupportedCurrency = 'usd',
  includeSymbol: boolean = true
): string {
  const curr = String(currency).toLowerCase()
  if (curr === 'ves' || curr === 'bs' || curr === 'bolivares') {
    return formatVES(amount, includeSymbol)
  }
  if (curr === 'eur' || curr === 'euro') {
    return formatEUR(amount, includeSymbol)
  }
  return formatUSD(amount, includeSymbol)
}

/**
 * 📋 Genera el número limpio con coma decimal para pagos bancarios (Pago Móvil / Transferencia)
 * Resultado: "22372,19" (sin puntos de miles que puedan romper el lector del banco)
 */
export function formatBankTransferAmount(amount: number | string | null | undefined): string {
  const safeNum = sanitizeNumericValue(amount)
  return safeNum.toFixed(2).replace('.', ',')
}