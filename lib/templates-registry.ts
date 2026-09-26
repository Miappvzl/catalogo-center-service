import { ThemeConfig } from '@/types/theme';

export interface TemplateDefinition {
    id: string;
    name: string;
    store_type: 'retail' | 'restaurant' | 'all'; // Contrato de segregación estricto
    // 🚀 AÑADIR 'beauty' A LA UNIÓN DE NICHOS PERMITIDOS:
    niche: 'general' | 'hardware' | 'streetwear' | 'food' | 'luxury' | 'tech' | 'beauty';
    niche_label: string;
    description: string;
    badge?: string;
    is_premium: boolean;
    thumbnail_url: string;
    default_config: ThemeConfig;
    tags: string[];
}

export const TEMPLATES_REGISTRY: TemplateDefinition[] = [
       // --- PLANTILLA INSIGNIA GASTRONOMICA (FOODTECH EXCLUSIVA) ---
    {
        id: 'gourmet_flow',
        name: 'Gourmet Flow',
        store_type: 'restaurant',
        niche: 'food',
        niche_label: 'Gastronomía & Restaurantes',
        description: 'Estructura vertical líquida con scroll-spy automático por categorías, integración nativa de horarios y apertura modal de modificadores sin paginación.',
        badge: 'FoodTech',
        is_premium: false,
        thumbnail_url: '/interfaz-tienda.png',
        tags: ['restaurante', 'comida', 'menu', 'scroll-spy', 'hamburguesas', 'dark-kitchen'],
        default_config: {
            template_id: 'gourmet_flow',
            version: 3,
            colors: {
                primary: '#111827',
                primary_text: '#ffffff',
                background: '#fafafa',
                text_main: '#09090b',
                surface: '#ffffff',
                surface_text: '#71717a',
                border: '#e4e4e7',
                incentive: '#059669',
                badge_discount_bg: '#ef4444',
                badge_discount_text: '#ffffff',
                badge_soldout_bg: '#18181b',
                badge_soldout_text: '#ffffff',
                action_favorite: '#ef4444',
            },
            // 🚀 GEOMETRÍA NATIVA FOODTECH POR DEFECTO:
            shapes: {
                button_shape: 'pill',        // 1. Botones en Píldora (999px)
                search_bar_shape: 'pill',    // Buscador en Píldora
                line_weight: 'none',         // 2. Sin Borde (0px)
                ui_shadows: 'crisp_app',     // 3. Sombra App Nativa (Crisp)
                info_layout: 'expanded',     // Modal de producto desplegado
            },
            typography: {
                heading_font: 'var(--font-inter), sans-serif',
                body_font: 'var(--font-inter), sans-serif',
                price_font: 'var(--font-inter), sans-serif',
            },
            layout: {
                header_style: 'restaurant_flow',
                card_style: 'restaurant_horizontal',
                logo_type: 'png_transparent',
                category_style: 'pills',
            },
        },
    },



   // --- PLANTILLAS DE RETAIL TRADICIONAL (COMERCIO GENERAL) ---
    {
        id: 'classic',
        name: 'Preziso Universal',
        store_type: 'retail',
        niche: 'general',
        niche_label: 'General / Retail',
        description: 'Diseño limpio y moderno con botones en píldora, fondo blanco puro y estética flat de alta conversión.',
        badge: 'Predeterminado',
        is_premium: false,
        thumbnail_url: '/base-ui.png',
        tags: ['universal', 'limpio', 'flat', 'pill'],
        default_config: {
            template_id: 'classic',
            version: 3,
            colors: {
                primary: '#000000',
                primary_text: '#ffffff',
                background: '#ffffff', // 🚀 Blanco puro
                text_main: '#000000',  // 🚀 Negro puro
                surface: '#ffffff',
                surface_text: '#71717a',
                border: '#e4e4e7',
                incentive: '#059669',
                badge_discount_bg: '#ef4444',
                badge_discount_text: '#ffffff',
                badge_soldout_bg: '#18181b',
                badge_soldout_text: '#ffffff',
                action_favorite: '#ef4444',
            },
            shapes: {
                button_shape: 'pill',       // 🚀 Botones en pastilla siempre
                search_bar_shape: 'pill',   // 🚀 Buscador en pastilla
                line_weight: 'thin',
                ui_shadows: 'none',
                info_layout: 'accordion',
            },
            typography: {
                heading_font: 'var(--font-inter), sans-serif',
                body_font: 'var(--font-inter), sans-serif',
                price_font: 'var(--font-inter), sans-serif',
            },
            layout: {
                header_style: 'classic',
                card_style: 'standard',
                logo_type: 'png_transparent',
            },
        },
    },
    {
        id: 'hardware_dense',
        name: 'Industrial Pro',
        store_type: 'retail',
        niche: 'hardware',
        niche_label: 'Ferretería & Repuestos',
        description: 'Estructura técnica de esquinas rectas y buscador gigante para ferreterías y repuestos.',
        badge: 'Popular',
        is_premium: false,
        thumbnail_url: '/interfaz-tienda.png',
        tags: ['ferreteria', 'repuestos', 'automotriz', 'herramientas', 'denso'],
        default_config: {
            template_id: 'hardware_dense',
            version: 3,
            colors: {
                primary: '#ffbb00',
                primary_text: '#1f1f1f',
                background: '#1f1f1f',
                text_main: '#ffbb00',
                surface: '#1f1f1f',
                surface_text: '#a6a6a6',
                border: '#424242',
                incentive: '#f5f5f5',
                badge_discount_bg: '#dc2626',
                badge_discount_text: '#ffffff',
                badge_soldout_bg: '#171717',
                badge_soldout_text: '#ffffff',
                action_favorite: '#ef4444',
            },
            shapes: {
                button_shape: 'sharp',
                search_bar_shape: 'sharp',
                line_weight: 'thin',
                ui_shadows: 'none',
                info_layout: 'accordion',
            },
            typography: {
                heading_font: 'var(--font-space), system-ui, sans-serif',
                body_font: 'var(--font-sans), system-ui, sans-serif',
                price_font: 'var(--font-space), monospace, sans-serif',
            },
            layout: {
                header_style: 'dense_search',
                card_style: 'dense_hardware',
                logo_type: 'png_transparent',
            },
        },
    },
    {
        id: 'streetwear_bold',
        name: 'Streetwear Modern',
        store_type: 'retail',
        niche: 'streetwear',
        niche_label: 'Moda Urbana & Ropa',
        description: 'Estética urbana moderna, tipografía geométrica Manrope de alta conversión y contrastes puros.',
        badge: 'Exclusivo',
        is_premium: false,
        thumbnail_url: '/hoodietitanio.webp',
        tags: ['streetwear', 'moda', 'ropa', 'moderno', 'dark'],
        default_config: {
            template_id: 'streetwear_bold',
            version: 3,
            colors: {
                primary: '#FFFFFF',
                primary_text: '#000000',
                background: '#0D0D0D',
                text_main: '#F5F5F5',
                surface: '#171717',
                surface_text: '#A3A3A3',
                border: '#2E2E2E',
                incentive: '#10B981',
                badge_discount_bg: '#dc2626',
                badge_discount_text: '#ffffff',
                badge_soldout_bg: '#171717',
                badge_soldout_text: '#ffffff',
                action_favorite: '#ef4444',
            },
            shapes: {
                button_shape: 'sharp',
                search_bar_shape: 'sharp',
                line_weight: 'bold',
                ui_shadows: 'hard_brutalist',
                info_layout: 'accordion',
            },
            typography: {
                heading_font: 'var(--font-manrope), "Manrope Fallback", system-ui, sans-serif',
                body_font: 'var(--font-manrope), "Manrope Fallback", system-ui, sans-serif',
                price_font: 'var(--font-manrope), "Manrope Fallback", system-ui, sans-serif',
            },
            layout: {
                header_style: 'brutalist',
                card_style: 'brutalist',
                logo_type: 'png_transparent',
            },
        },
    },
     {
        id: 'bistro_fast',
        name: 'Beauty Pop',
        store_type: 'retail',
        niche: 'beauty',
        niche_label: 'Cosmética & Skincare',
        description: 'Estética vibrante y fresca con botones en píldora, tonos rosados y tipografía amigable diseñada para maquillaje y cuidado de la piel.',
        badge: 'Popular',
        is_premium: false,
        thumbnail_url: '/minimalcargo.webp',
        tags: ['belleza', 'skincare', 'cosmetica', 'maquillaje', 'glow'],
          default_config: {
            template_id: 'bistro_fast',
            version: 3,
            colors: {
                primary: '#E11D48',
                primary_text: '#FFFFFF',
                background: '#FFF1F2',
                text_main: '#1C1917',
                surface: '#FFFFFF',
                surface_text: '#78716C',
                border: '#FECDD3',
                incentive: '#16A34A',
                badge_discount_bg: '#dc2626',
                badge_discount_text: '#ffffff',
                badge_soldout_bg: '#171717',
                badge_soldout_text: '#ffffff',
                action_favorite: '#ef4444',
            },
            shapes: {
                button_shape: 'pill',
                search_bar_shape: 'pill',
                line_weight: 'none',
                ui_shadows: 'soft',
                info_layout: 'accordion',
            },
            typography: {
                heading_font: 'var(--font-fredoka), system-ui, sans-serif',
                body_font: 'var(--font-quicksand), system-ui, sans-serif',
                price_font: 'var(--font-fredoka), sans-serif',
            },
           layout: {
                header_style: 'pill_nav',    // Cabecera tipo App con menú hamburguesa
                card_style: 'food_menu',     // 🚀 RECUPERA EL BOTÓN (+) FLOTANTE SOBRE LA FOTO
                logo_type: 'png_transparent',
                hero_subtitle: '— Fórmulas limpias, glow natural y cuidado diario para tu piel —',
            },
        },
    },



    {
        id: 'minimal_luxury',
        name: 'Minimal Luxury',
        store_type: 'retail',
        niche: 'luxury',
        niche_label: 'Joyería, Perfumes & Lujo',
        description: 'Espacios aireados, contrastes tenues y tipografía serifa editorial de alta gama.',
        badge: 'Pro',
        is_premium: false,
        thumbnail_url: '/shipping-badge-preview.webp',
        tags: ['lujo', 'joyeria', 'perfumes', 'cosmeticos'],
        default_config: {
            template_id: 'minimal_luxury',
            version: 3,
            colors: {
                primary: '#18181B',
                primary_text: '#FFFFFF',
                background: '#FAFAFA',
                text_main: '#18181B',
                surface: '#FFFFFF',
                surface_text: '#71717A',
                border: '#E4E4E7',
                incentive: '#059669',
                badge_discount_bg: '#dc2626',
                badge_discount_text: '#ffffff',
                badge_soldout_bg: '#171717',
                badge_soldout_text: '#ffffff',
                action_favorite: '#ef4444',
            },
            shapes: {
                button_shape: 'rounded',
                search_bar_shape: 'minimal_underlined',
                line_weight: 'hairline',
                ui_shadows: 'none',
                info_layout: 'accordion',
            },
            typography: {
                heading_font: 'var(--font-cormorant), Georgia, serif',
                body_font: 'var(--font-montserrat), system-ui, sans-serif',
                price_font: 'var(--font-outfit), sans-serif',
            },
            layout: {
                header_style: 'minimal',
                card_style: 'editorial',
                logo_type: 'png_transparent',
            },
        },
    },
    {
        id: 'modular_tech',
        name: 'Tech Bento',
        store_type: 'retail',
        niche: 'tech',
        niche_label: 'Tecnología & Gadgets',
        description: 'Diseño modular de alto rendimiento (Zero-Lag). Cuadrículas visuales, cero desenfoques y enfoque absoluto en especificaciones.',
        badge: 'Premium',
        is_premium: false,
        thumbnail_url: '/tech-bento.webp',
        tags: ['tech', 'tecnologia', 'moderno', 'grid', 'bento', 'apple'],
        default_config: {
            template_id: 'modular_tech',
            version: 3,
            colors: {
                primary: '#5438f5',
                primary_text: '#FFFFFF',
                background: '#F8FAFC',
                text_main: '#0F172A',
                surface: '#FFFFFF',
                surface_text: '#64748B',
                border: 'transparent',
                incentive: '#000604',
                badge_discount_bg: '#EF4444',
                badge_discount_text: '#FFFFFF',
                badge_soldout_bg: '#1E293B',
                badge_soldout_text: '#FFFFFF',
                action_favorite: '#EF4444',
            },
            shapes: {
                button_shape: 'rounded',
                search_bar_shape: 'rounded',
                line_weight: 'thin',
                ui_shadows: 'none',
                info_layout: 'expanded',
            },
            typography: {
                heading_font: 'var(--font-inter), sans-serif',
                body_font: 'var(--font-inter), sans-serif',
                price_font: 'var(--font-inter), sans-serif',
            },
            layout: {
                header_style: 'modular_tech',
                card_style: 'modular_tech',
                logo_type: 'png_transparent',
                category_style: 'thumbnails',
            },
        },
    },
];