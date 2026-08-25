// types/theme.ts

export type ButtonShapeOption = 'sharp' | 'rounded' | 'pill';
export type SearchBarShapeOption = 'sharp' | 'rounded' | 'pill' | 'minimal_underlined';
export type LineWeightOption = 'none' | 'hairline' | 'thin' | 'bold';
export type ShadowLevelOption = 'none' | 'soft' | 'medium' | 'hard_brutalist';

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

export interface ThemeLayout {
    header_style: 'classic' | 'dense_search' | 'minimal';
    card_style: 'standard' | 'dense_hardware' | 'editorial';
    logo_type?: 'standard' | 'png_transparent';
    hero_desktop_url?: string;
    hero_mobile_url?: string;
    logo_url?: string;
    hero_subtitle?: string;
}

export interface ThemeConfig {
    template_id: string;
    version: number;
    colors: ThemeColors;
    shapes: ThemeShapes;
    typography: ThemeTypography;
    layout: ThemeLayout;
}