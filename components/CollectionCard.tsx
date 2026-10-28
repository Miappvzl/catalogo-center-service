'use client'

import React from 'react'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
import { ArrowRight, ArrowUpRight, Sparkles } from 'lucide-react'
import { ThemeConfig } from '@/types/theme'

interface CollectionCardProps {
  collection: any
  products?: any[]
  themeConfig?: ThemeConfig | null
  onClick: () => void
  index?: number
}

export default function CollectionCard({
  collection,
  themeConfig,
  onClick,
  index = 0,
}: CollectionCardProps) {
  const templateId = themeConfig?.template_id || 'classic'
  const cardStyle = themeConfig?.layout?.card_style || 'standard'
  const itemCount = collection.collection_items?.length || 0
  const formattedIndex = (index + 1).toString().padStart(2, '0')

  // =========================================================================
  // 🛠️ VARIANTE 1: INDUSTRIAL PRO (Ficha Técnica Vertical / Terminal de Ensamble)
  // =========================================================================
  if (templateId === 'hardware_dense' || cardStyle === 'dense_hardware') {
    return (
      <div
        onClick={onClick}
         className="group relative shrink-0 w-[220px] sm:w-[260px] md:w-[280px] h-[320px] sm:h-[360px] md:h-[400px] rounded-none border border-neutral-800 bg-neutral-950 p-4 sm:p-5 flex flex-col justify-between overflow-hidden cursor-pointer select-none transition-all duration-300 hover:border-neutral-500 active:scale-[0.99] snap-start"
      >
        {/* Fondo Técnico con Velo Oscuro */}
        {collection.image_url ? (
          <div className="absolute inset-0 z-0">
            <Image
              src={getOptimizedUrl(collection.image_url)}
              alt=""
              fill
              sizes="(max-width: 768px) 300px, 400px"
              className="object-cover grayscale contrast-125 opacity-40 group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 to-black opacity-95" />
        )}

        {/* Fila Superior: Metadatos Monoespaciados */}
        <div className="relative z-10 flex items-start justify-between gap-2 border-b border-neutral-800/80 pb-3">
          <span className="text-[10px] font-mono font-bold tracking-widest text-neutral-400 uppercase">
            BATCH {formattedIndex}
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-300 bg-neutral-900 border border-neutral-700 px-2 py-0.5">
         {itemCount} {itemCount === 1 ? 'ÍTEM' : 'ÍTEMS'}
          </span>
        </div>

        {/* Bloque Inferior: Jerarquía de Ensamble y Botón de Bloque */}
        <div className="relative z-10 space-y-4">
          <div className="space-y-1.5">
            {collection.settings?.badge_text && (
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-amber-400 block">
                 {collection.settings.badge_text} 
              </span>
            )}
            <h3 className="font-mono font-bold text-xl sm:text-2xl text-white tracking-tight uppercase leading-tight line-clamp-2">
              {collection.name}
            </h3>
            {collection.description && (
              <p className="text-xs font-mono text-neutral-400 line-clamp-2 leading-relaxed pt-1">
                {collection.description}
              </p>
            )}
          </div>

          <div className="pt-2">
            <div className="w-full py-2.5 px-4 font-mono text-xs font-bold uppercase tracking-widest bg-white text-black border border-white group-hover:bg-neutral-200 transition-colors flex items-center justify-between">
              <span>ABRIR ENSAMBLE</span>
              <ArrowRight size={13} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // 💎 VARIANTE 2: MINIMAL LUXURY (Joyería & Alta Gama - Hermès / Byredo)
  // =========================================================================
  if (templateId === 'minimal_luxury' || cardStyle === 'editorial') {
    return (
      <div
        onClick={onClick}
        className="group relative shrink-0 w-[220px] sm:w-[260px] md:w-[280px] h-[320px] sm:h-[360px] md:h-[400px] rounded-none border border-white/15 bg-neutral-950 p-5 sm:p-6 flex flex-col justify-between overflow-hidden cursor-pointer select-none transition-all duration-700 hover:border-white/40 active:scale-[0.99] snap-start"

      >
        {/* Fondo Editorial con Velo Difuminado */}
        {collection.image_url ? (
          <div className="absolute inset-0 z-0">
            <Image
              src={getOptimizedUrl(collection.image_url)}
              alt=""
              fill
              sizes="(max-width: 768px) 300px, 400px"
              className="object-cover object-center opacity-50 group-hover:scale-105 transition-transform duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-neutral-950 to-black pointer-events-none" />
        )}

        {/* Fila Superior: Micro-Serifa Editorial */}
        <div className="relative z-10 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
          <span className="text-[10px] font-serif uppercase tracking-[0.3em] text-neutral-300">
            Nº {formattedIndex}
          </span>
          <span className="text-[9px] font-serif uppercase tracking-[0.25em] text-white/80 border border-white/20 px-2.5 py-0.5">
            {collection.settings?.badge_text || `${itemCount} piezas`}
          </span>
        </div>

        {/* Bloque Inferior: Título en Serifa Cormorant y Botón Rectangular Fino */}
        <div className="relative z-10 space-y-4">
          <div className="space-y-1.5">
            <h3 className="font-serif text-2xl sm:text-3xl font-normal tracking-wide text-white leading-tight line-clamp-2">
              {collection.name}
            </h3>
            {collection.description && (
              <p className="text-xs font-serif text-neutral-300 font-light line-clamp-2 leading-relaxed opacity-90">
                {collection.description}
              </p>
            )}
          </div>

          <div className="pt-2">
            <div className="w-full py-3 px-4 text-[10px] font-serif uppercase tracking-[0.25em] text-white border border-white/30 bg-black/30 backdrop-blur-xs group-hover:bg-white group-hover:text-black transition-all duration-300 flex items-center justify-between">
              <span>DESCUBRIR COLECCIÓN</span>
              <ArrowRight size={12} strokeWidth={1.5} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // 🏴‍☠️ VARIANTE 3: STREETWEAR MODERN (Drop Urbano / Balenciaga & Kith)
  // =========================================================================
  if (templateId === 'streetwear_bold' || cardStyle === 'brutalist') {
    return (
      <div
        onClick={onClick}
       className="group relative shrink-0 w-[220px] sm:w-[260px] md:w-[280px] h-[320px] sm:h-[360px] md:h-[400px] rounded-none border-2 border-neutral-800 bg-black p-4 sm:p-5 flex flex-col justify-between overflow-hidden cursor-pointer select-none transition-all duration-300 hover:border-white active:scale-[0.99] snap-start"
      >
        {/* Fondo Urbano Monocromático Contrastado */}
        {collection.image_url ? (
          <div className="absolute inset-0 z-0">
            <Image
              src={getOptimizedUrl(collection.image_url)}
              alt=""
              fill
              sizes="(max-width: 768px) 300px, 400px"
              className="object-cover grayscale contrast-125 opacity-55 group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-neutral-950 opacity-95" />
        )}

        {/* Fila Superior: Micro-Código de Archivo */}
        <div className="relative z-10 flex items-center justify-between gap-2 border-b-2 border-neutral-800 pb-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
            {formattedIndex}
          </span>
          <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 bg-white text-black">
             {collection.settings?.badge_text || `${itemCount} ITEMS`} 
          </span>
        </div>

        {/* Bloque Inferior: Título de Impacto en Manrope y Botón Afilado */}
        <div className="relative z-10 space-y-4">
          <div className="space-y-1">
            <h3 className="font-sans font-extrabold text-xl sm:text-2xl md:text-3xl text-white tracking-tight uppercase leading-none line-clamp-2">
              {collection.name}
            </h3>
            {collection.description && (
              <p className="text-xs font-mono text-neutral-300 line-clamp-2 leading-relaxed pt-1">
                {collection.description}
              </p>
            )}
          </div>

          <div className="pt-2">
            <div className="w-full py-3 px-4 rounded-none text-xs font-mono font-bold uppercase tracking-wider bg-white text-black border-2 border-white group-hover:bg-neutral-200 transition-all flex items-center justify-between">
              <span>EXPLORAR DROP</span>
              <ArrowRight size={14} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // ⚡ VARIANTE 4: TECH BENTO (Hardware, Gadgets & Audio - Apple / Nothing)
  // =========================================================================
  if (templateId === 'modular_tech' || cardStyle === 'modular_tech') {
    return (
      <div
        onClick={onClick}
        className="group relative shrink-0 w-[220px] sm:w-[260px] md:w-[280px] h-[320px] sm:h-[360px] md:h-[400px] rounded-2xl border border-neutral-800 bg-neutral-950 p-4 sm:p-5 flex flex-col justify-between overflow-hidden cursor-pointer select-none transition-all duration-300 hover:border-neutral-600 active:scale-[0.99] snap-start"

      >
        {/* Fondo Modular con Scrim Oscuro */}
        {collection.image_url ? (
          <div className="absolute inset-0 z-0">
            <Image
              src={getOptimizedUrl(collection.image_url)}
              alt=""
              fill
              sizes="(max-width: 768px) 300px, 400px"
              className="object-cover opacity-45 group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-neutral-900/40" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black opacity-95" />
        )}

        {/* Fila Superior: Chips de Especificaciones Técnicas */}
        <div className="relative z-10 flex items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
          <span className="text-[10px] font-mono font-medium text-neutral-300 bg-neutral-900/90 border border-neutral-700/80 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
           
            <span>MODULE {formattedIndex}</span>
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-tight text-white bg-white/10 border border-white/15 px-2 py-0.5 rounded-md">
            {itemCount} {itemCount === 1 ? 'UNIDAD' : 'UNIDADES'}
          </span>
        </div>

        {/* Bloque Inferior: Jerarquía de Gadget y Botón Curvado Técnico */}
        <div className="relative z-10 space-y-4">
          <div className="space-y-1.5">
            {collection.settings?.badge_text && (
              <span className="text-[9px] font-mono font-semibold uppercase tracking-wider text-indigo-400 block">
                {collection.settings.badge_text}
              </span>
            )}
            <h3 className="font-sans font-semibold text-xl sm:text-2xl text-white tracking-tight leading-tight line-clamp-2">
              {collection.name}
            </h3>
            {collection.description && (
              <p className="text-xs font-sans text-neutral-400 line-clamp-2 leading-relaxed">
                {collection.description}
              </p>
            )}
          </div>

          <div className="pt-2">
            <div className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide bg-white text-neutral-950 group-hover:bg-neutral-100 transition-colors flex items-center justify-between">
              <span>CONFIGURAR PAQUETE</span>
              <ArrowRight size={13} strokeWidth={2} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // 🌸 VARIANTE 5: BEAUTY POP (Cosmética, Skincare & Cuidado - Glossier / Rhode)
  // =========================================================================
  if (templateId === 'bistro_fast' || cardStyle === 'food_menu') {
    return (
      <div
        onClick={onClick}
       className="group relative shrink-0 w-[220px] sm:w-[260px] md:w-[280px] h-[320px] sm:h-[360px] md:h-[400px] rounded-3xl border border-rose-200/20 bg-neutral-950 p-5 sm:p-6 flex flex-col justify-between overflow-hidden cursor-pointer select-none transition-all duration-500 hover:border-rose-300/40 active:scale-[0.99] snap-start"
      >
        {/* Fondo Editorial con Velo Berry Suave */}
        {collection.image_url ? (
          <div className="absolute inset-0 z-0">
            <Image
              src={getOptimizedUrl(collection.image_url)}
              alt=""
              fill
              sizes="(max-width: 768px) 300px, 400px"
              className="object-cover object-center opacity-50 group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-rose-950/30" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-rose-900/30 via-neutral-950 to-black pointer-events-none" />
        )}

        {/* Fila Superior: Micro-Badge de Rutina */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium tracking-wider text-rose-200 bg-rose-500/10 border border-rose-400/25 px-3 py-1 rounded-full">
            {collection.settings?.badge_text || `Set de ${itemCount} pasos`}
          </span>
          <span className="text-[11px] font-mono text-white/60">
            {formattedIndex} 
          </span>
        </div>

        {/* Bloque Inferior: Título Suave y Botón Píldora Glow */}
        <div className="relative z-10 space-y-4">
          <div className="space-y-1.5">
            <h3 className="font-medium text-2xl sm:text-3xl text-white tracking-tight leading-tight line-clamp-2">
              {collection.name}
            </h3>
            {collection.description && (
              <p className="text-xs text-rose-100/80 font-normal line-clamp-2 leading-relaxed">
                {collection.description}
              </p>
            )}
          </div>

          <div className="pt-2">
            <div className="w-full py-3 px-5 rounded-full bg-white text-neutral-950 text-xs font-semibold tracking-wide flex items-center justify-between transition-all group-hover:bg-rose-50">
              <span>Explorar coleccion</span>
              <ArrowRight size={13} strokeWidth={2} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // 🌟 VARIANTE 6: PREZISO UNIVERSAL (Classic - Cápsula Editorial Lookbook / Nike / Apple)
  // =========================================================================
  return (
    <div
      onClick={onClick}
      className="group relative shrink-0 w-[220px] sm:w-[260px] md:w-[280px] h-[320px] sm:h-[360px] md:h-[400px] rounded-3xl border border-neutral-800/80 bg-neutral-950 p-5 sm:p-6 flex flex-col justify-between overflow-hidden cursor-pointer select-none transition-all duration-500 hover:border-neutral-600 active:scale-[0.99] snap-start"
    >
      {/* Fondo Cinemático Editorial a Sangre */}
      {collection.image_url ? (
        <div className="absolute inset-0 z-0">
          <Image
            src={getOptimizedUrl(collection.image_url)}
            alt=""
            fill
            sizes="(max-width: 768px) 300px, 400px"
            className="object-cover object-center scale-100 group-hover:scale-105 transition-transform duration-700 ease-out opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black opacity-95" />
      )}

      {/* Cabecera Flotante: Micro-Index y Badge de Cristal */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono font-medium text-white/60 tracking-wider">
          {formattedIndex} 
        </span>

        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/90 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full">
          {collection.settings?.badge_text || `${itemCount} piezas`}
        </span>
      </div>

      {/* Bloque Inferior: Título Editorial y Botón Magnético */}
      <div className="relative z-10 space-y-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-2xl sm:text-3xl text-white tracking-tight leading-tight line-clamp-2 drop-shadow-sm">
            {collection.name}
          </h3>
          {collection.description && (
            <p className="text-xs text-neutral-300 font-normal line-clamp-2 leading-relaxed opacity-90">
              {collection.description}
            </p>
          )}
        </div>

        {/* Botón Píldora de Revista */}
        <div className="pt-2">
          <div className="w-full py-3 px-5 rounded-full bg-white text-neutral-950 text-xs font-semibold tracking-wide flex items-center justify-between transition-all duration-300 group-hover:bg-neutral-100 group-hover:pl-6 shadow-xs">
            <span>Explorar Selección</span>
            <div className="w-6 h-6 rounded-full bg-neutral-950 text-white flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-0.5">
              <ArrowUpRight size={13} strokeWidth={2} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}