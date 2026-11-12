// types/theme.ts

export type ButtonShapeOption = 'sharp' | 'rounded' | 'pill';
export type SearchBarShapeOption = 'sharp' | 'rounded' | 'pill' | 'minimal_underlined';
export type LineWeightOption = 'none' | 'hairline' | 'thin' | 'bold';
export type ShadowLevelOption = 'none' | 'soft' | 'medium' | 'hard_brutalist' | 'crisp_app';
export type InfoLayoutOption = 'accordion' | 'expanded'; // 🚀 NUEVO: Densidad de Información

export interface ThemeColors {
    primary: string;
    primary_text: string;
    background: string;
    text_main: string;
    surface: string;
    surface_text: string;
    border: string;
    incentive: string;
    // 🚀 NUEVAS VARIABLES: Etiquetas y Micro-interacciones
    badge_discount_bg: string;
    badge_discount_text: string;
    badge_soldout_bg: string;
    badge_soldout_text: string;
    action_favorite: string;
}

export interface ThemeShapes {
    button_shape: ButtonShapeOption;      // Forma de los botones de acción
    search_bar_shape: SearchBarShapeOption; // Forma exclusiva del buscador
    line_weight: LineWeightOption;        // Grosor de los bordes estructurales
    ui_shadows: ShadowLevelOption;        // Sombras de tarjetas, modales e inputs
    info_layout?: InfoLayoutOption;       // 🚀 Opcional con fallback seguro en themeAdapter
}

export interface ThemeTypography {
    heading_font: string;  // Para Títulos grandes (H1, H2, Nombres de producto)
    body_font: string;     // Para Subtítulos, descripciones y textos largos
    price_font: string;    // Para los números y precios (Ej: JetBrains Mono, Space Grotesk)
}

// types/theme.ts
// (Modifica únicamente la interfaz ThemeLayout para agregar estas 3 propiedades opcionales)

// types/theme.ts
// (Modifica únicamente la interfaz ThemeLayout agregando esta propiedad)

export type AspectRatioOption = 'aspect-square' | 'aspect-[4/5]' | 'aspect-[4/3]';
export type ObjectFitOption = 'cover' | 'contain';

export interface CardMediaConfig {
    ratio: AspectRatioOption;
    fit: ObjectFitOption;
    bg_color: string;
}
export interface TrustBadge {
    id: string;
    title: string;
    description: string;
    icon: string;
}

export type HeroCtaActionType = 'catalog' | 'product';
export type HeroCtaAlignment = 'left' | 'center' | 'right';
export type HeroButtonFillStyle = 'outline_pill' | 'solid' | 'glass' | 'minimal_underline';
export type HeroButtonRadius = 'pill' | 'rounded' | 'sharp';
export type HeroShadowLevel = 'none' | 'subtle' | 'crisp';
export type HeroBorderWidth = '0px' | '1px' | '1.5px' | '2px';
export interface HeroButtonItemConfig {
    text: string;
    action_type: HeroCtaActionType;
    target_product_id?: string | number | null;
    fill_style: HeroButtonFillStyle;
    bg_color: string;
    text_color: string;
    border_color: string;
    border_width: HeroBorderWidth;
    radius: HeroButtonRadius;
    font_family: string;
    shadow: HeroShadowLevel;
    shadow_color?: string;
}

export interface HeroCtaConfig {
    enabled: boolean;
    // Descripción Editorial (Sin etiquetas que estorben)
    description_text?: string;
    description_font?: string;
    description_color?: string;
    description_size?: 'sm' | 'md' | 'lg';
    description_shadow?: HeroShadowLevel;
    description_shadow_color?: string;
    // Posición en el Hero
    alignment: HeroCtaAlignment;
    vertical_alignment?: 'bottom' | 'center';
    // Botón 1 ("Comprar Ahora")
    primary_button: HeroButtonItemConfig;
    // Botón 2 Opcional
    secondary_button_enabled?: boolean;
    secondary_button?: HeroButtonItemConfig;
}

export interface ThemeLayout {
    header_style: 'classic' | 'dense_search' | 'minimal' | 'brutalist' | 'pill_nav' | 'modular_tech' | 'restaurant_flow';
    card_style: 'standard' | 'dense_hardware' | 'editorial' | 'brutalist' | 'food_menu' | 'modular_tech' | 'restaurant_horizontal';
    logo_type?: 'standard' | 'png_transparent';
    category_style?: 'pills' | 'thumbnails'; 
    hero_desktop_url?: string;
    hero_mobile_url?: string;
    logo_url?: string;
    hero_subtitle?: string;
    trust_badges?: TrustBadge[];
    greeting_text?: string;
    slogan_text?: string;
    hero_button_text?: string;
    card_media?: CardMediaConfig;
    hero_cta?: HeroCtaConfig;
}

export interface ThemeConfig {
    template_id: string;
    version: number;
    colors: ThemeColors;
    shapes: ThemeShapes;
    typography: ThemeTypography;
    layout: ThemeLayout;
}