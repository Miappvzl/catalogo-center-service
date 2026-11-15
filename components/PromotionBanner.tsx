'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
import { Clock, ArrowRight, X } from 'lucide-react'
import { ThemeConfig } from '@/types/theme'

interface PromotionBannerProps {
    promo: {
        id?: string
        title: string
        tagline?: string
        bg_color?: string
        text_color?: string
        image_url?: string | null
        expires_at?: string | null
        promo_type?: 'visual' | 'percentage' | 'bogo'
        discount_percentage?: number | null
        bogo_buy?: number | null
        bogo_pay?: number | null
        linked_products?: (string | number)[]
    }
    themeConfig?: ThemeConfig | null
    isActive?: boolean
    onToggle?: () => void
    isPreview?: boolean
}

// Micro-Cápsula de Cuenta Regresiva de Precisión (Cero Ruido Visual)
const BannerCountdown = ({
    expiresAt,
    textColor = '#ffffff',
    variant = 'pill',
}: {
    expiresAt: string
    textColor?: string
    variant?: 'sharp' | 'minimal' | 'pill'
}) => {
    const [timeLeft, setTimeLeft] = useState('')

    useEffect(() => {
        const calculate = () => {
            const now = Date.now()
            const target = new Date(expiresAt).getTime()
            const diff = target - now

            if (diff <= 0) {
                setTimeLeft('Expirado')
                return
            }

            const d = Math.floor(diff / (1000 * 60 * 60 * 24))
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const s = Math.floor((diff % (1000 * 60)) / 1000)

            const totalHours = d * 24 + h
            setTimeLeft(
                `${totalHours.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
            )
        }

        calculate()
        const interval = setInterval(calculate, 1000)
        return () => clearInterval(interval)
    }, [expiresAt])

    if (!timeLeft) return null

    if (variant === 'minimal') {
        return (
            <div
                className="inline-flex items-center gap-1.5 text-[10px] font-mono tabular-nums tracking-[0.12em] uppercase opacity-85"
                style={{ color: textColor }}
            >
                <Clock size={11} strokeWidth={1.5} className="shrink-0 opacity-75" />
                <span>{timeLeft}</span>
            </div>
        )
    }

    return (
        <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-medium tabular-nums tracking-wider border backdrop-blur-md ${
                variant === 'sharp' ? 'rounded-none' : 'rounded-full'
            }`}
            style={{
                color: textColor,
                borderColor: `${textColor}24`,
                backgroundColor: `${textColor}0D`,
            }}
        >
            <Clock size={11} strokeWidth={1.8} className="shrink-0 opacity-80" />
            <span>{timeLeft}</span>
        </div>
    )
}

export default function PromotionBanner({
    promo,
    themeConfig,
    isActive = false,
    onToggle,
    isPreview = false,
}: PromotionBannerProps) {
    const templateId = themeConfig?.template_id || 'classic'
    const cardStyle = themeConfig?.layout?.card_style || 'standard'
    const itemCount = promo.linked_products?.length || 0
    const hasImage = Boolean(promo.image_url)

    // Extractor dinámico de paleta completa (compatible con JSON de AiBannerStudio y HEX clásico)
    const colors = useMemo(() => {
        const rawBg = promo.bg_color || '#09090b'
        const rawText = promo.text_color || '#ffffff'

        let title = rawText
        let tagline = rawText
        let btnBg = '#ffffff'
        let btnText = '#09090b'
        let badgeBg = '#ffffff'
        let badgeText = '#09090b'

        if (typeof rawText === 'string' && rawText.startsWith('{')) {
            try {
                const parsed = JSON.parse(rawText)
                title = parsed.title || '#ffffff'
                tagline = parsed.tagline || title
                btnBg = parsed.btnBg || '#ffffff'
                btnText = parsed.btnText || '#09090b'
                badgeBg = parsed.badgeBg || btnBg
                badgeText = parsed.badgeText || btnText
            } catch {}
        } else {
            // Si el texto principal es oscuro (fondo claro), invertimos el botón por defecto para alto contraste
            const cleanHex = rawText.replace('#', '')
            if (cleanHex.length === 6) {
                const r = parseInt(cleanHex.substring(0, 2), 16)
                const g = parseInt(cleanHex.substring(2, 4), 16)
                const b = parseInt(cleanHex.substring(4, 6), 16)
                const luminance = r * 0.299 + g * 0.587 + b * 0.114
                if (luminance < 128) {
                    btnBg = '#09090b'
                    btnText = '#ffffff'
                    badgeBg = '#09090b'
                    badgeText = '#ffffff'
                }
            }
        }

        return {
            bg: rawBg,
            title,
            tagline,
            btnBg,
            btnText,
            badgeBg,
            badgeText,
        }
    }, [promo.bg_color, promo.text_color])

    // Etiqueta semántica de beneficio comercial
    const offerBadge = useMemo(() => {
        if (promo.promo_type === 'percentage' && promo.discount_percentage) {
            return `-${promo.discount_percentage}% OFF`
        }
        if (promo.promo_type === 'bogo' && promo.bogo_buy && promo.bogo_pay) {
            return `PROMO ${promo.bogo_buy}x${promo.bogo_pay}`
        }
        return null
    }, [promo.promo_type, promo.discount_percentage, promo.bogo_buy, promo.bogo_pay])

    // Copywriting universal, humano y libre de errores de conteo (0)
    const copy = useMemo(() => {
        const hasItems = itemCount > 0

        if (templateId === 'hardware_dense' || cardStyle === 'dense_hardware') {
            return {
                fallbackTitle: 'EDICIÓN ESPECIAL',
                ctaIdle: hasItems ? `VER SELECCIÓN · ${itemCount}` : 'VER DETALLES',
                ctaActive: 'VER CATÁLOGO COMPLETO',
            }
        }

        if (templateId === 'minimal_luxury' || cardStyle === 'editorial') {
            return {
                fallbackTitle: 'Selección Exclusiva',
                ctaIdle: hasItems ? `Descubrir selección (${itemCount})` : 'Descubrir edición',
                ctaActive: 'Volver al catálogo',
            }
        }

        if (templateId === 'streetwear_bold' || cardStyle === 'brutalist') {
            return {
                fallbackTitle: 'EDICIÓN LIMITADA',
                ctaIdle: hasItems ? `EXPLORAR SELECCIÓN · ${itemCount}` : 'EXPLORAR EDICIÓN',
                ctaActive: 'CERRAR VISTA',
            }
        }

        if (templateId === 'modular_tech' || cardStyle === 'modular_tech') {
            return {
                fallbackTitle: 'Selección Destacada',
                ctaIdle: hasItems ? `Explorar oferta · ${itemCount}` : 'Explorar oferta',
                ctaActive: 'Ver todo el catálogo',
            }
        }

        return {
            fallbackTitle: 'Promoción Especial',
            ctaIdle: hasItems ? `Ver selección (${itemCount})` : 'Explorar promoción',
            ctaActive: 'Ver todo el catálogo',
        }
    }, [templateId, cardStyle, itemCount])

    const handleClick = () => {
        if (isPreview || !onToggle) return
        onToggle()
    }

    const hasEyebrow = Boolean(offerBadge || promo.expires_at)

    // Scrim direccional calibrado que preserva la nitidez de la foto en la derecha/arriba y garantiza legibilidad en el texto
    const renderDirectionalBackdrop = (imageExtraClasses = '') => {
        if (!hasImage) {
            return (
                <div
                    className="absolute inset-0 z-0 pointer-events-none"
                    style={{
                        background: `radial-gradient(120% 120% at 100% 0%, ${colors.title}0A 0%, transparent 65%)`,
                    }}
                />
            )
        }

        return (
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <Image
                    src={getOptimizedUrl(promo.image_url!)}
                    alt={promo.title || 'Promoción'}
                    fill
                    sizes="(max-width: 768px) 100vw, 1400px"
                    className={`object-cover object-center scale-100 group-hover:scale-[1.03] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${imageExtraClasses}`}
                />
                {/* Scrim Móvil: Protege la lectura inferior dejando respirar la parte superior/central */}
                <div
                    className="absolute inset-0 md:hidden"
                    style={{
                        background: `linear-gradient(180deg, ${colors.bg}40 0%, ${colors.bg}CC 45%, ${colors.bg}F8 100%)`,
                    }}
                />
                {/* Scrim Desktop: Protege el bloque editorial izquierdo y revela la fotografía con claridad a la derecha */}
                <div
                    className="hidden md:block absolute inset-0"
                    style={{
                        background: `linear-gradient(90deg, ${colors.bg}FA 0%, ${colors.bg}E6 42%, ${colors.bg}73 72%, ${colors.bg}1A 100%)`,
                    }}
                />
            </div>
        )
    }

    // =========================================================================
    // 🛠️ VARIANTE 1: INDUSTRIAL PRO (Ingeniería de Precisión - Braun / Porsche Design)
    // =========================================================================
    if (templateId === 'hardware_dense' || cardStyle === 'dense_hardware') {
        return (
            <div
                onClick={handleClick}
                className={`relative w-full h-full min-h-[148px] rounded-none text-left transition-all duration-300 overflow-hidden select-none group flex flex-col justify-between ${
                    isPreview ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'
                }`}
                style={{
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.title}26`,
                }}
            >
                {renderDirectionalBackdrop('opacity-80')}

                <div className="relative z-10 p-5 sm:p-6 md:px-8 md:py-7 flex flex-col md:flex-row md:items-center justify-between gap-5 my-auto">
                    <div className="space-y-2 min-w-0 flex-1 max-w-2xl">
                        {hasEyebrow && (
                            <div className="flex items-center gap-2 flex-wrap">
                                {offerBadge && (
                                    <span
                                        className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] px-2.5 py-1 leading-none"
                                        style={{
                                            backgroundColor: colors.badgeBg,
                                            color: colors.badgeText,
                                        }}
                                    >
                                        {offerBadge}
                                    </span>
                                )}
                                {promo.expires_at && (
                                    <BannerCountdown
                                        expiresAt={promo.expires_at}
                                        textColor={colors.title}
                                        variant="sharp"
                                    />
                                )}
                            </div>
                        )}

                        <h4
                            className="text-lg sm:text-2xl md:text-[26px] font-mono font-bold tracking-tight uppercase leading-[1.15] line-clamp-2"
                            style={{ color: colors.title }}
                        >
                            {promo.title || copy.fallbackTitle}
                        </h4>

                        {promo.tagline && (
                            <p
                                className="text-xs sm:text-sm font-mono font-normal leading-relaxed line-clamp-2 max-w-xl opacity-85"
                                style={{ color: colors.tagline }}
                            >
                                {promo.tagline}
                            </p>
                        )}
                    </div>

                    <div className="shrink-0 pt-1 md:pt-0">
                        <div
                            className="inline-flex w-full sm:w-auto min-h-[42px] px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] border transition-all duration-300 items-center justify-center gap-2.5"
                            style={{
                                backgroundColor: isActive ? 'transparent' : colors.btnBg,
                                color: isActive ? colors.title : colors.btnText,
                                borderColor: isActive ? `${colors.title}66` : colors.btnBg,
                            }}
                        >
                            <span>{isActive ? copy.ctaActive : copy.ctaIdle}</span>
                            {isActive ? (
                                <X size={13} strokeWidth={2} />
                            ) : (
                                <ArrowRight
                                    size={13}
                                    strokeWidth={2}
                                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // =========================================================================
    // 💎 VARIANTE 2: MINIMAL LUXURY (Editorial Haute-Couture - SSENSE / Céline)
    // =========================================================================
    if (templateId === 'minimal_luxury' || cardStyle === 'editorial') {
        return (
            <div
                onClick={handleClick}
                className={`relative w-full h-full min-h-[160px] rounded-none text-left transition-all duration-500 overflow-hidden select-none group flex flex-col justify-between ${
                    isPreview ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'
                }`}
                style={{
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.title}22`,
                }}
            >
                {renderDirectionalBackdrop('opacity-85')}

                <div className="relative z-10 px-6 py-6 sm:px-8 sm:py-8 md:px-11 md:py-9 flex flex-col md:flex-row md:items-center justify-between gap-6 my-auto">
                    <div className="space-y-2.5 min-w-0 flex-1 max-w-2xl">
                        {hasEyebrow && (
                            <div className="flex items-center gap-3 flex-wrap">
                                {offerBadge && (
                                    <span
                                        className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] px-2.5 py-1 leading-none"
                                        style={{
                                            backgroundColor: colors.badgeBg,
                                            color: colors.badgeText,
                                        }}
                                    >
                                        {offerBadge}
                                    </span>
                                )}
                                {promo.expires_at && (
                                    <BannerCountdown
                                        expiresAt={promo.expires_at}
                                        textColor={colors.title}
                                        variant="minimal"
                                    />
                                )}
                            </div>
                        )}

                        <h4
                            className="font-serif text-2xl sm:text-3xl md:text-[34px] font-normal tracking-tight leading-[1.12] line-clamp-2"
                            style={{ color: colors.title }}
                        >
                            {promo.title || copy.fallbackTitle}
                        </h4>

                        {promo.tagline && (
                            <p
                                className="text-xs sm:text-sm font-sans font-normal tracking-wide leading-relaxed line-clamp-2 max-w-xl opacity-85"
                                style={{ color: colors.tagline }}
                            >
                                {promo.tagline}
                            </p>
                        )}
                    </div>

                    <div className="shrink-0 pt-1 md:pt-0">
                        <div
                            className="inline-flex w-full sm:w-auto min-h-[44px] px-6 py-3 text-[10px] font-sans font-semibold uppercase tracking-[0.22em] border transition-all duration-300 items-center justify-center gap-3"
                            style={{
                                backgroundColor: isActive ? 'transparent' : colors.btnBg,
                                color: isActive ? colors.title : colors.btnText,
                                borderColor: isActive ? `${colors.title}50` : colors.btnBg,
                            }}
                        >
                            <span>{isActive ? copy.ctaActive : copy.ctaIdle}</span>
                            {isActive ? (
                                <X size={13} strokeWidth={1.5} />
                            ) : (
                                <ArrowRight
                                    size={13}
                                    strokeWidth={1.5}
                                    className="transition-transform duration-300 group-hover:translate-x-1"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // =========================================================================
    // 🏴‍☠️ VARIANTE 3: STREETWEAR MODERN (High-Contrast Archive / Brutalist)
    // =========================================================================
    if (templateId === 'streetwear_bold' || cardStyle === 'brutalist') {
        return (
            <div
                onClick={handleClick}
                className={`relative w-full h-full min-h-[152px] rounded-none text-left transition-all duration-300 overflow-hidden select-none group flex flex-col justify-between ${
                    isPreview ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'
                }`}
                style={{
                    backgroundColor: colors.bg,
                    border: `2px solid ${colors.title}33`,
                }}
            >
                {renderDirectionalBackdrop('grayscale contrast-125 opacity-75')}

                <div className="relative z-10 p-5 sm:p-6 md:px-8 md:py-7 flex flex-col md:flex-row md:items-center justify-between gap-5 my-auto">
                    <div className="space-y-2 min-w-0 flex-1 max-w-2xl">
                        {hasEyebrow && (
                            <div className="flex items-center gap-2 flex-wrap">
                                {offerBadge && (
                                    <span
                                        className="text-[10px] font-mono font-black uppercase tracking-[0.15em] px-2.5 py-1 leading-none"
                                        style={{
                                            backgroundColor: colors.badgeBg,
                                            color: colors.badgeText,
                                        }}
                                    >
                                        {offerBadge}
                                    </span>
                                )}
                                {promo.expires_at && (
                                    <BannerCountdown
                                        expiresAt={promo.expires_at}
                                        textColor={colors.title}
                                        variant="sharp"
                                    />
                                )}
                            </div>
                        )}

                        <h4
                            className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tighter uppercase leading-[1.08] line-clamp-2"
                            style={{ color: colors.title }}
                        >
                            {promo.title || copy.fallbackTitle}
                        </h4>

                        {promo.tagline && (
                            <p
                                className="text-xs sm:text-sm font-mono font-normal leading-relaxed line-clamp-2 max-w-xl opacity-85"
                                style={{ color: colors.tagline }}
                            >
                                {promo.tagline}
                            </p>
                        )}
                    </div>

                    <div className="shrink-0 pt-1 md:pt-0">
                        <div
                            className="inline-flex w-full sm:w-auto min-h-[44px] px-6 py-3 rounded-none text-[11px] font-mono font-bold uppercase tracking-[0.15em] border-2 transition-all duration-300 items-center justify-center gap-2.5"
                            style={{
                                backgroundColor: isActive ? 'transparent' : colors.btnBg,
                                color: isActive ? colors.title : colors.btnText,
                                borderColor: isActive ? colors.title : colors.btnBg,
                            }}
                        >
                            <span>{isActive ? copy.ctaActive : copy.ctaIdle}</span>
                            {isActive ? (
                                <X size={14} strokeWidth={2.2} />
                            ) : (
                                <ArrowRight
                                    size={14}
                                    strokeWidth={2.2}
                                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // =========================================================================
    // ⚡ VARIANTE 4: TECH BENTO (Arquitectura Modular - Apple / Linear)
    // =========================================================================
    if (templateId === 'modular_tech' || cardStyle === 'modular_tech') {
        return (
            <div
                onClick={handleClick}
                className={`relative w-full h-full min-h-[152px] rounded-2xl text-left transition-all duration-300 overflow-hidden select-none group flex flex-col justify-between ${
                    isPreview ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'
                }`}
                style={{
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.title}22`,
                }}
            >
                {renderDirectionalBackdrop('opacity-85')}

                <div className="relative z-10 p-5 sm:p-6 md:px-8 md:py-7 flex flex-col md:flex-row md:items-center justify-between gap-5 my-auto">
                    <div className="space-y-2 min-w-0 flex-1 max-w-2xl">
                        {hasEyebrow && (
                            <div className="flex items-center gap-2 flex-wrap">
                                {offerBadge && (
                                    <span
                                        className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md leading-none"
                                        style={{
                                            backgroundColor: colors.badgeBg,
                                            color: colors.badgeText,
                                        }}
                                    >
                                        {offerBadge}
                                    </span>
                                )}
                                {promo.expires_at && (
                                    <BannerCountdown
                                        expiresAt={promo.expires_at}
                                        textColor={colors.title}
                                        variant="pill"
                                    />
                                )}
                            </div>
                        )}

                        <h4
                            className="text-xl sm:text-2xl md:text-[28px] font-semibold tracking-tight leading-[1.14] line-clamp-2"
                            style={{ color: colors.title }}
                        >
                            {promo.title || copy.fallbackTitle}
                        </h4>

                        {promo.tagline && (
                            <p
                                className="text-xs sm:text-sm font-normal leading-relaxed line-clamp-2 max-w-xl opacity-85"
                                style={{ color: colors.tagline }}
                            >
                                {promo.tagline}
                            </p>
                        )}
                    </div>

                    <div className="shrink-0 pt-1 md:pt-0">
                        {/* Radio anidado óptico: Padre rounded-2xl (16px) -> Hijo rounded-xl (12px) */}
                        <div
                            className="inline-flex w-full sm:w-auto min-h-[42px] px-5 py-2.5 rounded-xl text-xs font-semibold tracking-tight border transition-all duration-300 items-center justify-center gap-2"
                            style={{
                                backgroundColor: isActive ? 'transparent' : colors.btnBg,
                                color: isActive ? colors.title : colors.btnText,
                                borderColor: isActive ? `${colors.title}4D` : colors.btnBg,
                            }}
                        >
                            <span>{isActive ? copy.ctaActive : copy.ctaIdle}</span>
                            {isActive ? (
                                <X size={14} strokeWidth={2} />
                            ) : (
                                <ArrowRight
                                    size={14}
                                    strokeWidth={2}
                                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // =========================================================================
    // 🌟 VARIANTE 5 & 6: PREZISO UNIVERSAL & SOFT LIFESTYLE (Classic & Bistro)
    // =========================================================================
    const isSoftLifestyle = templateId === 'bistro_fast' || cardStyle === 'food_menu'

    return (
        <div
            onClick={handleClick}
            className={`relative w-full h-full min-h-[152px] ${
                isSoftLifestyle ? 'rounded-3xl' : 'rounded-2xl'
            } text-left transition-all duration-300 overflow-hidden select-none group flex flex-col justify-between ${
                isPreview ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'
            }`}
            style={{
                backgroundColor: colors.bg,
                border: `1px solid ${colors.title}20`,
            }}
        >
            {renderDirectionalBackdrop('opacity-85')}

            <div className="relative z-10 p-5 sm:p-7 md:px-9 md:py-8 flex flex-col md:flex-row md:items-center justify-between gap-5 my-auto">
                <div className="space-y-2 min-w-0 flex-1 max-w-2xl">
                    {hasEyebrow && (
                        <div className="flex items-center gap-2 flex-wrap">
                            {offerBadge && (
                                <span
                                    className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full leading-none"
                                    style={{
                                        backgroundColor: colors.badgeBg,
                                        color: colors.badgeText,
                                    }}
                                >
                                    {offerBadge}
                                </span>
                            )}
                            {promo.expires_at && (
                                <BannerCountdown
                                    expiresAt={promo.expires_at}
                                    textColor={colors.title}
                                    variant="pill"
                                />
                            )}
                        </div>
                    )}

                    <h4
                        className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight leading-[1.15] line-clamp-2"
                        style={{ color: colors.title }}
                    >
                        {promo.title || copy.fallbackTitle}
                    </h4>

                    {promo.tagline && (
                        <p
                            className="text-xs sm:text-sm font-normal leading-relaxed line-clamp-2 max-w-xl opacity-85"
                            style={{ color: colors.tagline }}
                        >
                            {promo.tagline}
                        </p>
                    )}
                </div>

                <div className="shrink-0 pt-1 md:pt-0">
                    <div
                        className="inline-flex w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-full text-xs font-semibold tracking-tight transition-all duration-300 items-center justify-center gap-2 border"
                        style={{
                            backgroundColor: isActive ? 'transparent' : colors.btnBg,
                            color: isActive ? colors.title : colors.btnText,
                            borderColor: isActive ? `${colors.title}4D` : colors.btnBg,
                        }}
                    >
                        <span>{isActive ? copy.ctaActive : copy.ctaIdle}</span>
                        {isActive ? (
                            <X size={14} strokeWidth={2} />
                        ) : (
                            <ArrowRight
                                size={14}
                                strokeWidth={2}
                                className="transition-transform duration-300 group-hover:translate-x-0.5"
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}