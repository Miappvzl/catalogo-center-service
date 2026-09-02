// utils/themeAdapter.ts
import { 
    ThemeConfig, 
    ButtonShapeOption, 
    SearchBarShapeOption, 
    LineWeightOption, 
    ShadowLevelOption 
} from '@/types/theme';

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
    template_id: 'classic',
    version: 3,
   colors: {
        primary: '#000000',
        primary_text: '#ffffff',
        background: '#ffffff',
        text_main: '#111111',
        surface: '#ffffff',
        surface_text: '#6b7280',
        border: '#e5e7eb',
        incentive: '#059669',
        badge_discount_bg: '#dc2626', // red-600
        badge_discount_text: '#ffffff',
        badge_soldout_bg: '#171717', // neutral-900
        badge_soldout_text: '#ffffff',
        action_favorite: '#ef4444', // red-500
    },
  shapes: {
        button_shape: 'pill',
        search_bar_shape: 'pill',
        line_weight: 'thin',
        ui_shadows: 'none',
        info_layout: 'accordion', // 🚀 Valor por defecto seguro
    },
    typography: {
        heading_font: 'var(--font-inter), system-ui, -apple-system, sans-serif',
        body_font: 'var(--font-inter), system-ui, -apple-system, sans-serif',
        price_font: 'var(--font-inter), system-ui, -apple-system, sans-serif',
    },
   layout: {
        header_style: 'classic',
        card_style: 'standard',
        logo_type: 'standard',
        hero_desktop_url: '',
        hero_mobile_url: '',
        hero_subtitle: '— Diseños atemporales y fragancias exclusivas creadas para perdurar —', // 🚀 Default
    }
};

export const BUTTON_SHAPE_MAP: Record<ButtonShapeOption, string> = {
    sharp: '0px',
    rounded: '10px',
    pill: '9999px',
};

export const SEARCH_BAR_SHAPE_MAP: Record<SearchBarShapeOption, string> = {
    sharp: '0px',
    rounded: '12px',
    pill: '9999px',
    minimal_underlined: '0px',
};

export const LINE_WEIGHT_MAP: Record<LineWeightOption, string> = {
    none: '0px',
    hairline: '0.5px',
    thin: '1px',
    bold: '2px',
};

export const SHADOW_MAP: Record<ShadowLevelOption, string> = {
    none: 'none',
    soft: '0 4px 14px 0 rgba(0, 0, 0, 0.05)',
    medium: '0 10px 30px -5px rgba(0, 0, 0, 0.12)',
    hard_brutalist: '3px 3px 0px 0px #000000',
};

export const AVAILABLE_FONTS = {
    headings: [
        { label: 'Inter (Estándar de Oro / Ultra Legible)', value: 'var(--font-inter), sans-serif' },
        { label: 'Montserrat (Geométrica / Universal)', value: 'var(--font-montserrat), sans-serif' },
        { label: 'Outfit (Moderna / Circular)', value: 'var(--font-outfit), sans-serif' },
        { label: 'Space Grotesk (Técnica / Industrial)', value: 'var(--font-space), sans-serif' },
        { label: 'Bebas Neue (Display / Streetwear)', value: 'var(--font-bebas-neue), sans-serif' },
        { label: 'Fredoka (Redondeada / Comida)', value: 'var(--font-fredoka), sans-serif' },
        { label: 'Cormorant (Serifa / Lujo)', value: 'var(--font-cormorant), Georgia, serif' },
    ],
    body: [
        { label: 'Inter (Estándar de Oro / Ultra Legible)', value: 'var(--font-inter), sans-serif' },
        { label: 'Montserrat (Espaciada / Elegante)', value: 'var(--font-montserrat), sans-serif' },
        { label: 'Manrope (Equilibrada / Moderna)', value: 'var(--font-manrope), sans-serif' },
        { label: 'Quicksand (Suave / Amigable)', value: 'var(--font-quicksand), sans-serif' },
        { label: 'DM Sans (Limpia / Minimalista)', value: 'var(--font-dm-sans), sans-serif' },
    ],
    prices: [
        { label: 'Inter (Neutral / Ultra Clara)', value: 'var(--font-inter), sans-serif' },
        { label: 'Space Grotesk (Tabular / Precisa)', value: 'var(--font-space), monospace, sans-serif' },
        { label: 'Montserrat (Pura / Coherente)', value: 'var(--font-montserrat), sans-serif' },
        { label: 'Bebas Neue (Imponente / Brutal)', value: 'var(--font-bebas-neue), sans-serif' },
    ],
};

export const TYPOGRAPHY_PRESETS: Record<string, { heading: string; body: string; label: string }> = {
    default: {
        label: 'Classic Universal (Inter Pura)',
        heading: 'var(--font-inter), sans-serif',
        body: 'var(--font-inter), sans-serif',
    },
    modern_sans: {
        label: 'Industrial Pro (Space Grotesk + Inter)',
        heading: 'var(--font-space), sans-serif',
        body: 'var(--font-inter), sans-serif',
    },
    brutalist: {
        label: 'Streetwear Brutalist (Bebas Neue + Manrope)',
        heading: 'var(--font-bebas-neue), sans-serif',
        body: 'var(--font-manrope), sans-serif',
    },
    friendly_rounded: {
        label: 'Bistro Fast Food (Fredoka + Quicksand)',
        heading: 'var(--font-fredoka), sans-serif',
        body: 'var(--font-quicksand), sans-serif',
    },
    editorial: {
        label: 'Minimal Luxury (Cormorant + Montserrat)',
        heading: 'var(--font-cormorant), Georgia, serif',
        body: 'var(--font-montserrat), sans-serif',
    },
};

export function normalizeThemeConfig(raw: any): ThemeConfig {
    if (!raw || typeof raw !== 'object') {
        return DEFAULT_THEME_CONFIG;
    }

    const rawShapes = raw.shapes || {};
    const rawTypography = raw.typography || {};
    const rawLayout = raw.layout || {};

 const shapes: ThemeConfig['shapes'] = {
        button_shape: rawShapes.button_shape || 'pill',
        search_bar_shape: rawShapes.search_bar_shape || 'pill',
        line_weight: rawShapes.line_weight || 'thin',
        ui_shadows: raw.template_id === 'classic' ? 'none' : (rawShapes.ui_shadows || 'none'),
        info_layout: rawShapes.info_layout || 'accordion', // 🚀 Normalización segura
    };

    const typography: ThemeConfig['typography'] = {
        heading_font: rawTypography.heading_font || DEFAULT_THEME_CONFIG.typography.heading_font,
        body_font: rawTypography.body_font || DEFAULT_THEME_CONFIG.typography.body_font,
        price_font: rawTypography.price_font || DEFAULT_THEME_CONFIG.typography.price_font,
    };

const layout: ThemeConfig['layout'] = {
        header_style: rawLayout.header_style || DEFAULT_THEME_CONFIG.layout.header_style,
        card_style: rawLayout.card_style || DEFAULT_THEME_CONFIG.layout.card_style,
        logo_type: rawLayout.logo_type || 'standard',
        hero_desktop_url: rawLayout.hero_desktop_url || '',
        hero_mobile_url: rawLayout.hero_mobile_url || '',
        logo_url: rawLayout.logo_url || '',
        hero_subtitle: rawLayout.hero_subtitle || DEFAULT_THEME_CONFIG.layout.hero_subtitle, // 🚀 Normalización segura
    };

    return {
        template_id: raw.template_id || DEFAULT_THEME_CONFIG.template_id,
        version: 3,
        colors: {
            ...DEFAULT_THEME_CONFIG.colors,
            ...(raw.colors || {}),
        },
        shapes,
        typography,
        layout,
    };
}

export function generateCssVariables(config: ThemeConfig): React.CSSProperties {
    const btnRadius = BUTTON_SHAPE_MAP[config.shapes.button_shape] || '9999px';
    const searchRadius = SEARCH_BAR_SHAPE_MAP[config.shapes.search_bar_shape] || '9999px';
    const borderWidth = LINE_WEIGHT_MAP[config.shapes.line_weight] || '1px';
    const shadow = config.template_id === 'classic' ? 'none' : (SHADOW_MAP[config.shapes.ui_shadows] || 'none');

    const headingFont = config.typography.heading_font || 'var(--font-inter), sans-serif';
    const bodyFont = config.typography.body_font || 'var(--font-inter), sans-serif';
    const priceFont = config.typography.price_font || 'var(--font-inter), sans-serif';

    return {
        '--pz-primary': config.colors.primary,
        '--pz-primary-text': config.colors.primary_text,
        '--pz-bg': config.colors.background,
        '--pz-text-main': config.colors.text_main,
        '--pz-surface': config.colors.surface,
        '--pz-surface-text': config.colors.surface_text,
        '--pz-border': config.colors.border,
        '--pz-incentive': config.colors.incentive,

        '--store-primary': config.colors.primary,
        '--store-primary-text': config.colors.primary_text,
        '--store-bg': config.colors.background,
        '--store-background': config.colors.background,
        '--store-text-main': config.colors.text_main,
        '--store-surface': config.colors.surface,
      '--store-surface-text': config.colors.surface_text,
        '--store-border': config.colors.border,
        '--store-incentive': config.colors.incentive,
        '--store-badge-discount-bg': config.colors.badge_discount_bg,
        '--store-badge-discount-text': config.colors.badge_discount_text,
        '--store-badge-soldout-bg': config.colors.badge_soldout_bg,
        '--store-badge-soldout-text': config.colors.badge_soldout_text,
        '--store-action-favorite': config.colors.action_favorite,


        // Geometría
        '--radius-btn': btnRadius,
        '--radius-card': config.shapes.button_shape === 'sharp' ? '0px' : '16px',
        '--radius-search': searchRadius,
        '--border-width-ui': borderWidth,
        '--shadow-ui': shadow,

        // Tipografía
        '--font-heading': headingFont,
        '--font-body': bodyFont,
        '--font-price': priceFont,
        '--font-sans': bodyFont,
        fontFamily: bodyFont,
    } as React.CSSProperties;
}