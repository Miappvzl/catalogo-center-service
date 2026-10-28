'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
import { Clock, ArrowRight, X, Sparkles, Tag, Check, Zap } from 'lucide-react'
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

// Micro-Cápsula de Cuenta Regresiva de Precisión
const BannerCountdown = ({ expiresAt, isMono = false }: { expiresAt: string, isMono?: boolean }) => {
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

            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const s = Math.floor((diff % (1000 * 60)) / 1000)
            setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
        }

        calculate()
        const interval = setInterval(calculate, 1000)
        return () => clearInterval(interval)
    }, [expiresAt])

    if (!timeLeft) return null

    if (isMono) {
        return (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-mono font-medium text-white/90 tabular-nums">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>{timeLeft}</span>
            </div>
        )
    }

    return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-[10px] font-medium text-white/90">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-mono font-medium tracking-tight">{timeLeft}</span>
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
    const itemCount = promo.linked_products?.length || 0
    const hasImage = Boolean(promo.image_url)

    // Extractor dinámico de paleta completa (compatible con JSON y con HEX legacy)
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
                title = parsed.title || title
                tagline = parsed.tagline || tagline
                btnBg = parsed.btnBg || btnBg
                btnText = parsed.btnText || btnText
                badgeBg = parsed.badgeBg || badgeBg
                badgeText = parsed.badgeText || badgeText
            } catch {}
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

    const bgColor = colors.bg
    const textColor = colors.title

    // Etiqueta semántica de descuento con formato visual
    const offerBadge = useMemo(() => {
        if (promo.promo_type === 'percentage' && promo.discount_percentage) {
            return `-${promo.discount_percentage}%`
        }
        if (promo.promo_type === 'bogo' && promo.bogo_buy && promo.bogo_pay) {
            return `${promo.bogo_buy}x${promo.bogo_pay}`
        }
        return null
    }, [promo.promo_type, promo.discount_percentage, promo.bogo_buy, promo.bogo_pay])

    const handleClick = () => {
        if (isPreview || !onToggle) return
        onToggle()
    }

    // =========================================================================
    // 🛠️ VARIANTE 1: INDUSTRIAL PRO (Ingeniería de Precisión - Porsche Design / Dyson)
    // =========================================================================
    if (templateId === 'hardware_dense') {
        return (
            <div
                onClick={handleClick}
                className={`relative w-full h-full min-h-[140px] text-left transition-all border border-neutral-800 overflow-hidden select-none group flex flex-col justify-between ${
                    isPreview ? 'cursor-default' : 'cursor-pointer hover:border-neutral-500'
                }`}
                style={{ backgroundColor: bgColor }}
            >
                {/* 1. Fondo Cinemático con Velo Técnico */}
                {hasImage && (
                    <div className="absolute inset-0 z-0">
                        <Image
                            src={getOptimizedUrl(promo.image_url!)}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, 1400px"
                            className="object-cover object-center scale-100 group-hover:scale-105 transition-transform duration-700 ease-out opacity-45"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/60" />
                    </div>
                )}

                {/* 2. Contenido Estructurado Técnico */}
                <div className="relative z-10 p-5 sm:p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-2 min-w-0 flex-1">
                        {/* Metadatos de Cabecera */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-400 border border-neutral-700 px-2 py-0.5 bg-black/60">
                               CAMPAÑA ACTIVA
                            </span>

                            {offerBadge && (
                                <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 bg-white text-black">
                                    {offerBadge}
                                </span>
                            )}

                            {promo.expires_at && (
                                <BannerCountdown expiresAt={promo.expires_at} isMono={true} />
                            )}
                        </div>

                        {/* Título Asertivo sin Recortes Rústicos */}
                        <h4 className="text-lg sm:text-2xl md:text-3xl font-mono font-bold tracking-tight text-white uppercase leading-tight line-clamp-2">
                            {promo.title || 'CAMPAÑA INDUSTRIAL'}
                        </h4>

                        {promo.tagline && (
                            <p className="text-xs sm:text-sm font-mono text-neutral-400 font-normal leading-relaxed line-clamp-2 max-w-2xl">
                                {promo.tagline}
                            </p>
                        )}
                    </div>

              
                    {/* Botón Táctil de Precisión */}
                    <div className="shrink-0 pt-2 md:pt-0">
                        <div
                            className={`px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${
                                isActive
                                    ? 'bg-transparent text-white border-white'
                                    : 'bg-white text-black border-white hover:bg-neutral-200'
                            }`}
                        >
                            <span>{isActive ? 'REMOVER FILTRO ✕' : `VER SELECCIÓN (${itemCount})`}</span>
                            {!isActive && <ArrowRight size={13} strokeWidth={2} />}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // =========================================================================
    // 💎 VARIANTE 3: MINIMAL LUXURY (Joyería, Perfumes, Cosmética de Autor - Byredo / Céline)
    // =========================================================================
    if (templateId === 'minimal_luxury' || themeConfig?.layout?.card_style === 'editorial') {
        return (
             <div
                onClick={handleClick}
                className={`relative w-full h-full min-h-[140px] text-left transition-all border border-white/15 overflow-hidden select-none group flex flex-col justify-between ${
                    isPreview ? 'cursor-default' : 'cursor-pointer hover:border-white/40'
                }`}
                style={{ backgroundColor: bgColor }}
            >
                {/* 1. Fondo Cinemático Editorial con Velo Suave */}
                {hasImage ? (
                    <div className="absolute inset-0 z-0">
                        <Image
                            src={getOptimizedUrl(promo.image_url!)}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, 1400px"
                            className="object-cover object-center scale-100 group-hover:scale-105 transition-transform duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] opacity-40"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/95 via-black/70 to-black/30" />
                    </div>
                ) : (
                    <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-black/40 pointer-events-none" />
                )}

                {/* 2. Capa Tipográfica Serifa de Revista */}
                <div className="relative z-10 px-6 py-6 sm:px-8 sm:py-8 md:px-12 md:py-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2.5 min-w-0 flex-1">
                        {/* Metadatos y Micro-Tag de Lujo */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {promo.tagline && (
                                <span className="text-[9px] sm:text-[10px] font-serif uppercase tracking-[0.25em] text-neutral-300">
                                    {promo.tagline}
                                </span>
                            )}

                            {offerBadge && (
                                <span className="text-[10px] font-sans font-semibold tracking-widest uppercase px-2 py-0.5 border border-white/30 text-white bg-black/40">
                                    {offerBadge}
                                </span>
                            )}

                            {promo.expires_at && (
                                <BannerCountdown expiresAt={promo.expires_at} />
                            )}
                        </div>

                        {/* Título Elegante en Serifa Clásica */}
                        <h4 className="font-serif text-2xl sm:text-3xl md:text-4xl font-normal tracking-wide text-white leading-tight line-clamp-2 max-w-2xl">
                            {promo.title || 'Colección Exclusiva'}
                        </h4>
                    </div>

                    {/* Botón Rectangular Sobrio (Estilo Boutique) */}
                    <div className="shrink-0 pt-1 md:pt-0">
                        <div
                            className={`px-6 py-2.5 sm:py-3 text-[11px] font-sans font-semibold uppercase tracking-[0.2em] border transition-all duration-300 flex items-center justify-center gap-2 ${
                                isActive
                                    ? 'bg-white text-neutral-950 border-white'
                                    : 'bg-transparent text-white border-white/40 hover:border-white hover:bg-white/10'
                            }`}
                        >
                            <span>{isActive ? 'Cerrar Colección ✕' : `Descubrir Piezas (${itemCount})`}</span>
                            {!isActive && <ArrowRight size={13} strokeWidth={1.5} />}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // =========================================================================
    // 🏴‍☠️ VARIANTE 4: STREETWEAR MODERN (Drops Urbanos / High-Fashion Archive)
    // =========================================================================
    if (templateId === 'streetwear_bold' || themeConfig?.layout?.card_style === 'brutalist') {
        return (
          <div
                onClick={handleClick}
                className={`relative w-full h-full min-h-[140px] rounded-none text-left transition-all border-2 border-neutral-800 overflow-hidden select-none group flex flex-col justify-between ${
                    isPreview ? 'cursor-default' : 'cursor-pointer hover:border-neutral-500'
                }`}
                style={{ backgroundColor: bgColor }}
            >

                {/* 1. Fondo Cinemático Urbano Monocromático */}
                {hasImage ? (
                    <div className="absolute inset-0 z-0">
                        <Image
                            src={getOptimizedUrl(promo.image_url!)}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, 1400px"
                            className="object-cover object-center grayscale contrast-125 scale-100 group-hover:scale-105 transition-transform duration-700 ease-out opacity-50"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black via-black/85 to-black/50" />
                    </div>
                ) : (
                    <div className="absolute inset-0 z-0 bg-neutral-950 opacity-95" />
                )}

                {/* 2. Capa Estructural Brutalista */}
                <div className="relative z-10 p-5 sm:p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-2 min-w-0 flex-1">
                        {/* Micro-Índice de Drop */}
                        <div className="flex items-center gap-2 flex-wrap">
                     

                            {offerBadge && (
                                <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 bg-white text-black border border-white">
                                    {offerBadge}
                                </span>
                            )}

                            {promo.expires_at && (
                                <BannerCountdown expiresAt={promo.expires_at} isMono={true} />
                            )}
                        </div>

                        {/* Título de Impacto en Manrope Mayúscula */}
                        <h4 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight uppercase text-white leading-tight line-clamp-2 max-w-2xl">
                            {promo.title || 'STREETWEAR CAPSULE'}
                        </h4>

                        {promo.tagline && (
                            <p className="text-xs sm:text-sm font-mono text-neutral-300 font-normal leading-relaxed line-clamp-2 max-w-xl">
                                {promo.tagline}
                            </p>
                        )}
                    </div>

             
                    {/* Botón Afilado de Bloque Monocromático */}
                    <div className="shrink-0 pt-2 md:pt-0">
                        <div
                            className={`px-5 py-2.5 sm:px-6 sm:py-3 rounded-none text-xs font-mono font-bold uppercase tracking-wider border-2 transition-all flex items-center justify-center gap-2 ${
                                isActive
                                    ? 'bg-transparent text-white border-white'
                                    : 'bg-white text-black border-white hover:bg-neutral-200 active:scale-[0.98]'
                            }`}
                        >
                            <span>{isActive ? 'Cerrar Drop ✕' : `Explorar Drop (${itemCount})`}</span>
                            {!isActive && <ArrowRight size={14} strokeWidth={2} />}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // =========================================================================
    // ⚡ VARIANTE 5: TECH BENTO (Tecnología, Gadgets & Audio - Apple / Nothing Tech)
    // =========================================================================
    if (templateId === 'modular_tech' || themeConfig?.layout?.card_style === 'modular_tech') {
        return (
            <div
                onClick={handleClick}
                className={`relative w-full h-full min-h-[140px] rounded-xl text-left transition-all border border-neutral-800 overflow-hidden select-none group flex flex-col justify-between ${
                    isPreview ? 'cursor-default' : 'cursor-pointer hover:border-neutral-600'
                }`}
                style={{ backgroundColor: bgColor }}
            >
                {/* 1. Fondo Cinemático Modular con Scrim Tech */}
                {hasImage ? (
                    <div className="absolute inset-0 z-0">
                        <Image
                            src={getOptimizedUrl(promo.image_url!)}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, 1400px"
                            className="object-cover object-center scale-100 group-hover:scale-105 transition-transform duration-700 ease-out opacity-45"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-neutral-950 via-neutral-950/85 to-neutral-900/50" />
                    </div>
                ) : (
                    <div className="absolute inset-0 z-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black opacity-95" />
                )}

                {/* 2. Arquitectura de Bento Grid */}
                <div className="relative z-10 p-5 sm:p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-2 min-w-0 flex-1">
                        {/* Chips de Especificaciones Técnicas */}
                        <div className="flex items-center gap-2 flex-wrap">
                           

                            {offerBadge && (
                                <span className="text-[10px] font-mono font-bold tracking-tight px-2 py-0.5 rounded-md bg-white text-neutral-950">
                                    {offerBadge}
                                </span>
                            )}

                            {promo.expires_at && (
                                <BannerCountdown expiresAt={promo.expires_at} isMono={true} />
                            )}
                        </div>

                        {/* Título de Dispositivo / Gadget */}
                        <h4 className="text-lg sm:text-2xl md:text-3xl font-semibold tracking-tight text-white leading-tight line-clamp-2 max-w-2xl">
                            {promo.title || 'INNOVACIÓN Y RENDIMIENTO'}
                        </h4>

                        {promo.tagline && (
                            <p className="text-xs sm:text-sm font-normal text-neutral-400 leading-relaxed line-clamp-2 max-w-xl">
                                {promo.tagline}
                            </p>
                        )}
                    </div>

                    {/* Botón Modular de Esquinas Suaves */}
                    <div className="shrink-0 pt-2 md:pt-0">
                        <div
                            className={`px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide border transition-all flex items-center justify-center gap-2 ${
                                isActive
                                    ? 'bg-neutral-800 text-white border-neutral-700'
                                    : 'bg-white text-neutral-950 border-white hover:bg-neutral-100 active:scale-[0.98]'
                            }`}
                        >
                            <span>{isActive ? 'Remover Filtro ✕' : `Ver Hardware (${itemCount})`}</span>
                            {!isActive && <ArrowRight size={13} strokeWidth={2} />}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // =========================================================================
    // 🌸 VARIANTE 6: BEAUTY POP (Cosmética, Skincare & Cuidado Personal - Glossier / Rhode)
    // =========================================================================
    if (templateId === 'bistro_fast' || themeConfig?.layout?.card_style === 'food_menu') {
        return (
            <div
                onClick={handleClick}
                className={`relative w-full rounded-3xl text-left transition-all border border-rose-200/20 overflow-hidden select-none group ${
                    isPreview ? 'cursor-default' : 'cursor-pointer hover:border-rose-300/40'
                }`}
                style={{ backgroundColor: bgColor }}
            >
                {/* 1. Fondo Editorial con Velo Luminous Berry */}
                {hasImage ? (
                    <div className="absolute inset-0 z-0">
                        <Image
                            src={getOptimizedUrl(promo.image_url!)}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, 1400px"
                            className="object-cover object-center scale-100 group-hover:scale-105 transition-transform duration-700 ease-out opacity-50"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-rose-950/30" />
                    </div>
                ) : (
                    <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-rose-900/25 via-neutral-950 to-black pointer-events-none" />
                )}

                {/* 2. Capa Tipográfica Lifestyle */}
                <div className="relative z-10 p-5 sm:p-7 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-2 min-w-0 flex-1">
                        {/* Micro-Pill de Belleza Limpia */}
                        <div className="flex items-center gap-2 flex-wrap">
                        

                            {offerBadge && (
                                <span className="text-[10px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-950">
                                    {offerBadge}
                                </span>
                            )}

                            {promo.expires_at && (
                                <BannerCountdown expiresAt={promo.expires_at} />
                            )}
                        </div>

                        {/* Título Suave de Cosmética */}
                        <h4 className="text-xl sm:text-2xl md:text-3xl font-medium sm:font-semibold tracking-tight text-white leading-tight line-clamp-2 max-w-2xl">
                            {promo.title || 'Fórmulas Limpias y Esenciales'}
                        </h4>

                        {promo.tagline && (
                            <p className="text-xs sm:text-sm text-neutral-300 font-normal leading-relaxed line-clamp-2 max-w-xl">
                                {promo.tagline}
                            </p>
                        )}
                    </div>

                    {/* Botón Píldora Lifestyle */}
                    <div className="shrink-0 pt-1 md:pt-0">
                        <div
                            className={`px-6 py-2.5 sm:py-3 rounded-full text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 ${
                                isActive
                                    ? 'bg-white/20 text-white border border-white/40 backdrop-blur-md'
                                    : 'bg-white text-neutral-950 hover:bg-rose-50 active:scale-95'
                            }`}
                        >
                            <span>{isActive ? 'Quitar Filtro ✕' : `Explorar Fórmulas (${itemCount})`}</span>
                            {!isActive && <ArrowRight size={13} strokeWidth={2} />}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // =========================================================================
    // 🌟 VARIANTE 2: PREZISO UNIVERSAL (Classic - Lujo Accesible / Nike / Apple)
    // =========================================================================
    return (
      <div
            onClick={handleClick}
            className={`relative w-full h-full min-h-[140px] rounded-2xl text-left transition-all border border-neutral-800/60 overflow-hidden select-none group flex flex-col justify-between ${
                isPreview ? 'cursor-default' : 'cursor-pointer hover:border-neutral-600'
            }`}
            style={{ backgroundColor: bgColor }}
        >
            {/* 1. Fondo Cinemático Inmersivo con Scrim de Alto Contraste */}
            {hasImage ? (
                <div className="absolute inset-0 z-0">
                    <Image
                        src={getOptimizedUrl(promo.image_url!)}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 1400px"
                        className="object-cover object-center scale-100 group-hover:scale-105 transition-transform duration-700 ease-out opacity-55"
                    />
                    {/* Gradiente multicapa: oscuro en el texto (izquierda) y aireado en la derecha */}
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/95 via-black/75 to-black/35" />
                </div>
            ) : (
                /* Gradiente sutil ambiental si no hay foto */
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-white/5 via-transparent to-black/30 pointer-events-none" />
            )}

            {/* 2. Capa de Información Editorial */}
            <div className="relative z-10 p-5 sm:p-7 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-2 min-w-0 flex-1">
                       {/* Pills de Estado y Oferta Personalizadas */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {offerBadge && (
                            <span 
                                className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                                style={{ backgroundColor: colors.badgeBg, color: colors.badgeText }}
                            >
                                {offerBadge}
                            </span>
                        )}

                        {promo.tagline && (
                            <span 
                                className="text-[11px] font-medium tracking-tight line-clamp-1 opacity-90"
                                style={{ color: colors.tagline }}
                            >
                                {promo.tagline}
                            </span>
                        )}

                      {promo.expires_at && (
                            <BannerCountdown expiresAt={promo.expires_at} />
                        )}
                    </div>

                    {/* Título Personalizado */}
                    <h4 
                        className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight leading-tight line-clamp-2 max-w-2xl"
                        style={{ color: colors.title }}
                    >
                        {promo.title || 'Título de la Campaña'}
                    </h4>
                </div>

                {/* Botón Personalizado */}
                <div className="shrink-0 pt-1 md:pt-0">
                    <div
                        className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 active:scale-95 border"
                        style={{
                            backgroundColor: isActive ? 'transparent' : colors.btnBg,
                            color: isActive ? colors.title : colors.btnText,
                            borderColor: isActive ? colors.title : colors.btnBg,
                        }}
                    >
                        <span>{isActive ? 'Quitar Filtro ✕' : `Explorar Selección (${itemCount})`}</span>
                        {!isActive && <ArrowRight size={14} strokeWidth={2} />}
                    </div>
                </div>
            </div>
        </div>
    )
}