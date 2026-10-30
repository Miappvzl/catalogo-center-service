'use client'

import React from 'react'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
import { X, ArrowLeft, Sparkles, Clock } from 'lucide-react'
import { ThemeConfig } from '@/types/theme'

interface PromotionShowroomProps {
  promo: {
    id?: string
    title: string
    tagline?: string
    bg_color?: string
    text_color?: string
    image_url?: string | null
    promo_type?: 'visual' | 'percentage' | 'bogo'
    discount_percentage?: number | null
    bogo_buy?: number | null
    bogo_pay?: number | null
    expires_at?: string | null
  }
  themeConfig?: ThemeConfig | null
  productCount: number
  onExit: () => void
}

export default function PromotionShowroom({
  promo,
  themeConfig,
  productCount,
  onExit,
}: PromotionShowroomProps) {
  const templateId = themeConfig?.template_id || 'classic'
  const cardStyle = themeConfig?.layout?.card_style || 'standard'

  return (
    <div id="promo-view-anchor" className="mb-10 animate-in fade-in duration-500">
      <div
        className={`w-full relative overflow-hidden border transition-all ${
          templateId === 'hardware_dense' || cardStyle === 'dense_hardware'
            ? 'rounded-none border-neutral-800 p-6 sm:p-8'
            : (templateId === 'streetwear_bold' || cardStyle === 'brutalist'
                ? 'rounded-none border-2 border-neutral-800 p-6 sm:p-8'
                : (templateId === 'minimal_luxury' || cardStyle === 'editorial'
                    ? 'rounded-none border-b border-neutral-200/60 py-8 md:py-12 px-2'
                    : (templateId === 'modular_tech' || cardStyle === 'modular_tech'
                        ? 'rounded-xl border-neutral-800 p-6 sm:p-8'
                        : (templateId === 'bistro_fast' || cardStyle === 'food_menu'
                            ? 'rounded-3xl border-rose-200/40 p-6 sm:p-8'
                            : 'rounded-2xl border-neutral-200/80 p-6 sm:p-8 md:p-10'))))
        }`}
        style={{
          backgroundColor: (templateId === 'minimal_luxury' || cardStyle === 'editorial')
            ? 'transparent'
            : (promo.bg_color || 'var(--store-surface)'),
          color: promo.text_color || 'var(--store-text-main)',
        }}
      >
        {/* Fondo con imagen y velo cinemático si aplica */}
        {promo.image_url && templateId !== 'minimal_luxury' && cardStyle !== 'editorial' && (
          <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
            <Image
              src={getOptimizedUrl(promo.image_url)}
              alt=""
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/70 to-transparent" />
          </div>
        )}

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-left">
            {/* Metadatos superiores de la oferta */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {promo.promo_type === 'percentage' && promo.discount_percentage && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white text-neutral-950">
                  -{promo.discount_percentage}% OFF
                </span>
              )}
              {promo.promo_type === 'bogo' && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white text-neutral-950">
                  Lleva {promo.bogo_buy}, Paga {promo.bogo_pay}
                </span>
              )}
              <span className="text-xs font-mono font-medium opacity-80">
                {productCount} {productCount === 1 ? 'artículo en oferta' : 'artículos en oferta'}
              </span>
            </div>

            {/* Título de Campaña adaptado a la plantilla */}
            <h1
              className={`text-2xl sm:text-3xl md:text-4xl tracking-tight leading-tight ${
                templateId === 'minimal_luxury' || cardStyle === 'editorial'
                  ? 'font-serif font-normal'
                  : (templateId === 'hardware_dense'
                      ? 'font-mono font-bold uppercase'
                      : (templateId === 'streetwear_bold'
                          ? 'font-sans font-extrabold uppercase'
                          : 'font-semibold'))
              }`}
            >
              {promo.title}
            </h1>

            {/* Subtítulo / Gancho */}
            {promo.tagline && (
              <p className="text-xs sm:text-sm opacity-90 leading-relaxed font-normal">
                {promo.tagline}
              </p>
            )}
          </div>

          {/* Botón de Retorno al Catálogo General */}
          <button
            type="button"
            onClick={onExit}
            className={`px-4.5 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-all shrink-0 active:scale-95 border ${
              templateId === 'hardware_dense'
                ? 'rounded-none font-mono uppercase bg-white text-black border-white hover:bg-neutral-200'
                : (templateId === 'streetwear_bold'
                    ? 'rounded-none font-mono uppercase bg-white text-black border-2 border-white'
                    : (templateId === 'minimal_luxury'
                        ? 'rounded-none font-serif uppercase tracking-[0.2em] bg-transparent text-neutral-950 border-neutral-950 hover:bg-neutral-950 hover:text-white'
                        : (templateId === 'modular_tech'
                            ? 'rounded-xl bg-white text-neutral-950 hover:bg-neutral-100 border-neutral-200/80'
                            : 'rounded-full bg-white text-neutral-950 hover:bg-neutral-100 border-neutral-200/80')))
            }`}
          >
            <X size={14} strokeWidth={2} />
            <span>Volver al Catálogo</span>
          </button>
        </div>
      </div>
    </div>
  )
}