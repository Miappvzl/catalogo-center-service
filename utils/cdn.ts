/**
 * Interceptor Arquitectónico de CDN
 * Transforma las URLs directas de Supabase hacia el Edge de Cloudflare
 */
export function getOptimizedUrl(originalUrl: string | null | undefined): string {
    if (!originalUrl) return '';

    // Si la URL viene de nuestro Supabase principal, la reescribimos al CDN
    const supabaseCore = 'https://qzeelmmhictsabuwbyjh.supabase.co/storage/v1/object/public';
    const cloudflareCdn = 'https://cdn.preziso.shop';

    if (originalUrl.startsWith(supabaseCore)) {
        return originalUrl.replace(supabaseCore, cloudflareCdn);
    }

    // Si es una URL externa (ej. un logo viejo o de otro lado), la dejamos intacta
    return originalUrl;
}