/**
 * Resuelve una ruta multi-tenant de forma inteligente según el host actual.
 * Evita el doble enrutamiento en subdominios y mantiene el slug en localhost/producción.
 */
export function getTenantHref(path: string, slug: string): string {
  // Fallback seguro de servidor (SSR)
  if (typeof window === 'undefined') {
    return `/${slug}${path}`;
  }

  const hostname = window.location.hostname;
  
  // 🚀 Identificamos si es un subdominio de inquilino (ej: luar-3d.preziso.shop)
  // No debe ser localhost, ni el dominio principal preziso.shop, ni empezar con www.
  const isSubdomain = 
    hostname.includes('.') && 
    !hostname.startsWith('www.') && 
    !hostname.includes('localhost') && 
    !hostname.startsWith('preziso.shop');

  if (isSubdomain) {
    // En subdominios, la ruta raíz ya es el slug. Retornamos la ruta directa (ej: /passport)
    return path;
  }

  // En localhost o dominio principal (preziso.shop/luar-3d), inyectamos el slug (ej: /luar-3d/passport)
  return `/${slug}${path}`;
}