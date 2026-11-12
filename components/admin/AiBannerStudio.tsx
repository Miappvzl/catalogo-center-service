// components/admin/AiBannerStudio.tsx
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  Sparkles,
  Check,
  Loader2,
  Upload,
  Monitor,
  Smartphone,
  MousePointerClick,
  Crop,
  Type,
  Plus,
  Trash2,
  ArrowRight,
  Construction,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { getSupabase } from '@/lib/supabase-client'
import {
  HeroCtaConfig,
  HeroButtonItemConfig,
  HeroButtonFillStyle,
  HeroButtonRadius,
  HeroShadowLevel,
  HeroBorderWidth,
  HeroCtaAlignment
} from '@/types/theme'
import { resizeImageToExactDimensions } from '@/utils/imageOptimizer'
import EliteColorPicker from '@/components/admin/EliteColorPicker'

export const HERO_FONT_OPTIONS = [
  { value: 'var(--font-inter), sans-serif', label: 'Inter — Sans Limpia' },
  { value: '"Plus Jakarta Sans", sans-serif', label: 'Jakarta — Geométrica' },
  { value: 'Georgia, "Playfair Display", serif', label: 'Playfair — Editorial Serif' },
  { value: '"Cormorant Garamond", Georgia, serif', label: 'Cormorant — Alta Costura' },
  { value: '"Instrument Serif", Georgia, serif', label: 'Instrument — Minimal Luxury' },
  { value: 'var(--font-mono), monospace', label: 'JetBrains Mono — Técnica' },
  { value: 'system-ui, -apple-system, sans-serif', label: 'Sistema — Nativa Pura' }
] as const

/**
 * Extrae los canales RGB de cualquier string HEX (#FFF, #FFFFFF) o RGB/RGBA
 * y devuelve el color con la opacidad exacta solicitada para diferenciar Sólido vs Cristal.
 */
export function applyColorOpacity(colorStr: string, targetAlpha: number): string {
  const clean = (colorStr || '#FFFFFF').trim()
  let r = 255,
    g = 255,
    b = 255

  if (clean.startsWith('#')) {
    const hex = clean.replace('#', '')
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16)
      g = parseInt(hex[1] + hex[1], 16)
      b = parseInt(hex[2] + hex[2], 16)
    } else if (hex.length >= 6) {
      r = parseInt(hex.substring(0, 2), 16)
      g = parseInt(hex.substring(2, 4), 16)
      b = parseInt(hex.substring(4, 6), 16)
    }
  } else if (clean.startsWith('rgb')) {
    const parts = clean.match(/\d+(\.\d+)?/g)
    if (parts && parts.length >= 3) {
      r = Number(parts[0])
      g = Number(parts[1])
      b = Number(parts[2])
    }
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    r = 255
    g = 255
    b = 255
  }

  if (targetAlpha >= 1) {
    const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
  }

  return `rgba(${r}, ${g}, ${b}, ${targetAlpha})`
}

/**
 * Detecta la opacidad actual de un color (0 a 1)
 */
export function getColorAlpha(colorStr: string): number {
  if (!colorStr || colorStr === 'transparent') return 0
  const clean = colorStr.trim()
  if (clean.startsWith('rgba')) {
    const parts = clean.match(/\d+(\.\d+)?/g)
    if (parts && parts.length >= 4) return Number(parts[3])
  }
  if (clean.startsWith('#') && clean.length === 9) {
    return parseInt(clean.substring(7, 9), 16) / 255
  }
  return 1
}
export const DEFAULT_PRIMARY_CTA_BUTTON: HeroButtonItemConfig = {
  text: 'Comprar Ahora',
  action_type: 'catalog',
  target_product_id: null,
  fill_style: 'outline_pill',
  bg_color: 'transparent',
  text_color: '#FFFFFF',
  border_color: '#FFFFFF',
  border_width: '1px',
  radius: 'pill',
  font_family: 'var(--font-inter), sans-serif',
  shadow: 'none',
  shadow_color: 'rgba(0, 0, 0, 0.35)'
}

export const DEFAULT_SECONDARY_CTA_BUTTON: HeroButtonItemConfig = {
  text: 'Ver Destacado',
  action_type: 'product',
  target_product_id: null,
  fill_style: 'outline_pill',
  bg_color: 'transparent',
  text_color: '#FFFFFF',
  border_color: 'rgba(255, 255, 255, 0.65)',
  border_width: '1px',
  radius: 'pill',
  font_family: 'var(--font-inter), sans-serif',
  shadow: 'none',
  shadow_color: 'rgba(0, 0, 0, 0.35)'
}

export function getNormalizedHeroCta(
  raw?: Partial<HeroCtaConfig> | null
): HeroCtaConfig {
  return {
    enabled: raw?.enabled ?? false,
    description_text: raw?.description_text ?? '',
    description_font: raw?.description_font ?? 'var(--font-inter), sans-serif',
    description_color: raw?.description_color ?? '#FFFFFF',
    description_size: raw?.description_size ?? 'md',
    description_shadow: raw?.description_shadow ?? 'none',
    description_shadow_color: raw?.description_shadow_color ?? 'rgba(0, 0, 0, 0.55)',
    alignment: raw?.alignment ?? 'left',
    vertical_alignment: raw?.vertical_alignment ?? 'bottom',
    primary_button: {
      ...DEFAULT_PRIMARY_CTA_BUTTON,
      ...(raw?.primary_button || {})
    },
    secondary_button_enabled: raw?.secondary_button_enabled ?? false,
    secondary_button: {
      ...DEFAULT_SECONDARY_CTA_BUTTON,
      ...(raw?.secondary_button || {})
    }
  }
}

interface AiBannerStudioModalProps {
  isOpen: boolean
  onClose: () => void
  storeId: string
  storeName: string
  storeType: 'retail' | 'restaurant' | string
  primaryColor: string
  currentDesktopUrl?: string
  currentMobileUrl?: string
  currentCtaConfig?: HeroCtaConfig
  initialSection?: 'cta_builder' | 'smart_resizer'
  onPublishBanners: (payload: {
    desktopFile?: File | null
    mobileFile?: File | null
    updatedCtaConfig: HeroCtaConfig
  }) => Promise<void>
}

type StudioTab = 'cta_builder' | 'smart_resizer' | 'ai_generator'

// Mapa visual de las 6 posiciones disponibles en el banner
const BANNER_POSITIONS: {
  label: string
  h: HeroCtaAlignment
  v: 'center' | 'bottom'
}[] = [
  { label: 'Centro Izq', h: 'left', v: 'center' },
  { label: 'Centro', h: 'center', v: 'center' },
  { label: 'Centro Der', h: 'right', v: 'center' },
  { label: 'Abajo Izq', h: 'left', v: 'bottom' },
  { label: 'Abajo Centro', h: 'center', v: 'bottom' },
  { label: 'Abajo Der', h: 'right', v: 'bottom' }
]

export default function AiBannerStudioModal({
  isOpen,
  onClose,
  storeId,
  storeType,
  currentDesktopUrl,
  currentMobileUrl,
  currentCtaConfig,
  initialSection = 'cta_builder',
  onPublishBanners
}: AiBannerStudioModalProps) {
  const supabase = getSupabase()
  const isRestaurant = storeType === 'restaurant'
  const desktopTarget = { width: 1920, height: 600 }
  const mobileTarget = { width: 1080, height: isRestaurant ? 720 : 1350 }

  const [activeTab, setActiveTab] = useState<StudioTab>(initialSection)
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('mobile')
  const [editingButtonSlot, setEditingButtonSlot] = useState<'primary' | 'secondary'>('primary')
  const [showAdvancedBtnStyle, setShowAdvancedBtnStyle] = useState(false)

  // Catálogo de productos reales
  const [storeProducts, setStoreProducts] = useState<any[]>([])
  const [ctaConfig, setCtaConfig] = useState<HeroCtaConfig>(() =>
    getNormalizedHeroCta(currentCtaConfig)
  )

  // Estado explícito para mostrar u ocultar la descripción sin perder lo escrito
  const [hasDescription, setHasDescription] = useState<boolean>(
    () => Boolean(currentCtaConfig?.description_text && currentCtaConfig.description_text.trim().length > 0)
  )

  // Estados independientes de encuadre para PC y Móvil
  const [desktopSourceImg, setDesktopSourceImg] = useState<HTMLImageElement | null>(null)
  const [mobileSourceImg, setMobileSourceImg] = useState<HTMLImageElement | null>(null)
  const [fitMode, setFitMode] = useState<'cover' | 'contain_blur'>('cover')

  const [desktopFocal, setDesktopFocal] = useState<{ x: number; y: number }>({ x: 50, y: 50 })
  const [mobileFocal, setMobileFocal] = useState<{ x: number; y: number }>({ x: 50, y: 50 })

  const [hasNewDesktopImage, setHasNewDesktopImage] = useState(false)
  const [hasNewMobileImage, setHasNewMobileImage] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const desktopCanvasRef = useRef<HTMLCanvasElement>(null)
  const mobileCanvasRef = useRef<HTMLCanvasElement>(null)
  const desktopInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const dualInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      const norm = getNormalizedHeroCta(currentCtaConfig)
      setCtaConfig(norm)
      setHasDescription(Boolean(norm.description_text && norm.description_text.trim().length > 0))
      setActiveTab(initialSection)
    }
  }, [isOpen, currentCtaConfig, initialSection])

  useEffect(() => {
    if (!isOpen || !storeId) return
    const fetchProds = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, usd_cash_price, usd_penalty, category')
        .eq('store_id', storeId)
        .eq('status', 'active')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) setStoreProducts(data)
    }
    fetchProds()
  }, [isOpen, storeId, supabase])

  useEffect(() => {
    if (!isOpen) return
    if (currentDesktopUrl && !hasNewDesktopImage) {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => setDesktopSourceImg(img)
      img.src = currentDesktopUrl
    }
    if (currentMobileUrl && !hasNewMobileImage) {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => setMobileSourceImg(img)
      img.src = currentMobileUrl
    }
  }, [isOpen, currentDesktopUrl, currentMobileUrl, hasNewDesktopImage, hasNewMobileImage])

  const drawCanvas = useCallback(
    (
      canvas: HTMLCanvasElement | null,
      sourceImg: HTMLImageElement | null,
      targetW: number,
      targetH: number,
      focal: { x: number; y: number }
    ) => {
      if (!canvas) return
      canvas.width = targetW
      canvas.height = targetH
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      if (!sourceImg) {
        ctx.fillStyle = '#18181B'
        ctx.fillRect(0, 0, targetW, targetH)
        return
      }

      if (fitMode === 'contain_blur') {
        ctx.save()
        ctx.filter = 'blur(36px) brightness(0.72)'
        const bgScale = Math.max(targetW / sourceImg.width, targetH / sourceImg.height) * 1.12
        const bgW = sourceImg.width * bgScale
        const bgH = sourceImg.height * bgScale
        ctx.drawImage(sourceImg, (targetW - bgW) / 2, (targetH - bgH) / 2, bgW, bgH)
        ctx.restore()

        const fgScale = Math.min(targetW / sourceImg.width, targetH / sourceImg.height)
        const fgW = sourceImg.width * fgScale
        const fgH = sourceImg.height * fgScale
        ctx.drawImage(sourceImg, (targetW - fgW) / 2, (targetH - fgH) / 2, fgW, fgH)
      } else {
        const scale = Math.max(targetW / sourceImg.width, targetH / sourceImg.height)
        const drawW = sourceImg.width * scale
        const drawH = sourceImg.height * scale
        const offsetX = (targetW - drawW) * (focal.x / 100)
        const offsetY = (targetH - drawH) * (focal.y / 100)
        ctx.drawImage(sourceImg, offsetX, offsetY, drawW, drawH)
      }
    },
    [fitMode]
  )

  useEffect(() => {
    if (!isOpen) return
    drawCanvas(
      desktopCanvasRef.current,
      desktopSourceImg,
      desktopTarget.width,
      desktopTarget.height,
      desktopFocal
    )
    drawCanvas(
      mobileCanvasRef.current,
      mobileSourceImg,
      mobileTarget.width,
      mobileTarget.height,
      mobileFocal
    )
  }, [
    isOpen,
    drawCanvas,
    desktopSourceImg,
    mobileSourceImg,
    desktopTarget.width,
    desktopTarget.height,
    mobileTarget.width,
    mobileTarget.height,
    desktopFocal,
    mobileFocal
  ])

  const handleSelectImageForTarget = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'desktop' | 'mobile' | 'both'
  ) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      if (target === 'desktop' || target === 'both') {
        setDesktopSourceImg(img)
        setHasNewDesktopImage(true)
        if (target === 'desktop') setPreviewViewport('desktop')
      }
      if (target === 'mobile' || target === 'both') {
        setMobileSourceImg(img)
        setHasNewMobileImage(true)
        if (target === 'mobile') setPreviewViewport('mobile')
      }
      toast.success('Imagen adaptada al lienzo. Ajusta su posición si lo deseas.')
    }
    img.src = url
  }

  const activeBtnConfig: HeroButtonItemConfig =
    editingButtonSlot === 'primary'
      ? ctaConfig.primary_button
      : ctaConfig.secondary_button || DEFAULT_SECONDARY_CTA_BUTTON

  const updateActiveButton = (patch: Partial<HeroButtonItemConfig>) => {
    setCtaConfig((prev) => {
      if (editingButtonSlot === 'primary') {
        return {
          ...prev,
          primary_button: { ...prev.primary_button, ...patch }
        }
      }
      return {
        ...prev,
        secondary_button: {
          ...(prev.secondary_button || DEFAULT_SECONDARY_CTA_BUTTON),
          ...patch
        }
      }
    })
  }

  /**
   * Cambio inteligente entre Pastilla sin Fondo, Cristal, Sólido y Subrayado:
   * Ajusta automáticamente la opacidad del color de fondo para que la diferencia
   * entre Cristal (22% opacidad + blur) y Sólido (100% opacidad) sea inmediata.
   */
  const handleSelectFillStyle = (newStyle: HeroButtonFillStyle) => {
    const currentBg = activeBtnConfig.bg_color || '#FFFFFF'
    const currentText = activeBtnConfig.text_color || '#FFFFFF'
    const currentBorder = activeBtnConfig.border_color || '#FFFFFF'

    if (newStyle === 'outline_pill') {
      updateActiveButton({
        fill_style: 'outline_pill',
        bg_color: 'transparent',
        border_width: activeBtnConfig.border_width === '0px' ? '1px' : activeBtnConfig.border_width
      })
      return
    }

    if (newStyle === 'glass') {
      // Forzamos una opacidad translúcida real (0.22) para que el efecto cristal se aprecie de inmediato
      const glassBg =
        currentBg === 'transparent'
          ? 'rgba(255, 255, 255, 0.22)'
          : applyColorOpacity(currentBg, 0.22)

      updateActiveButton({
        fill_style: 'glass',
        bg_color: glassBg,
        border_width: activeBtnConfig.border_width === '0px' ? '1px' : activeBtnConfig.border_width,
        border_color:
          currentBorder === 'transparent' ? 'rgba(255, 255, 255, 0.45)' : currentBorder
      })
      return
    }

    if (newStyle === 'solid') {
      // Forzamos 100% de opacidad (alpha = 1) para que el botón se vuelva sólido al instante
      const baseColor =
        currentBg === 'transparent' ? '#FFFFFF' : applyColorOpacity(currentBg, 1)

      // Si el fondo sólido resultante es blanco y el texto también era blanco, pasamos el texto a negro
      const isWhiteBg =
        baseColor.toUpperCase() === '#FFFFFF' || baseColor.toUpperCase() === '#FAFAFA'
      const isWhiteText =
        currentText.toUpperCase() === '#FFFFFF' || currentText.toUpperCase() === '#FAFAFA'

      updateActiveButton({
        fill_style: 'solid',
        bg_color: baseColor,
        text_color: isWhiteBg && isWhiteText ? '#09090B' : currentText
      })
      return
    }

    if (newStyle === 'minimal_underline') {
      updateActiveButton({
        fill_style: 'minimal_underline',
        bg_color: 'transparent'
      })
    }
  }

  // Aplicar un diseño rápido preconfigurado en 1 clic
  const applyQuickButtonPreset = (
    preset: 'white_pill' | 'dark_pill' | 'frost_glass' | 'solid_white' | 'solid_dark'
  ) => {
    if (preset === 'white_pill') {
      updateActiveButton({
        fill_style: 'outline_pill',
        bg_color: 'transparent',
        text_color: '#FFFFFF',
        border_color: '#FFFFFF',
        border_width: '1px',
        radius: 'pill',
        shadow: 'none'
      })
    } else if (preset === 'dark_pill') {
      updateActiveButton({
        fill_style: 'outline_pill',
        bg_color: 'transparent',
        text_color: '#111111',
        border_color: '#111111',
        border_width: '1px',
        radius: 'pill',
        shadow: 'none'
      })
    } else if (preset === 'frost_glass') {
      updateActiveButton({
        fill_style: 'glass',
        bg_color: 'rgba(255, 255, 255, 0.22)',
        text_color: '#FFFFFF',
        border_color: 'rgba(255, 255, 255, 0.55)',
        border_width: '1px',
        radius: 'pill',
        shadow: 'none'
      })
    } else if (preset === 'solid_white') {
      updateActiveButton({
        fill_style: 'solid',
        bg_color: '#FFFFFF',
        text_color: '#09090B',
        border_color: '#FFFFFF',
        border_width: '1px',
        radius: 'pill',
        shadow: 'none'
      })
    } else if (preset === 'solid_dark') {
      updateActiveButton({
        fill_style: 'solid',
        bg_color: '#09090B',
        text_color: '#FFFFFF',
        border_color: '#09090B',
        border_width: '1px',
        radius: 'pill',
        shadow: 'none'
      })
    }
  }

  const handleSaveAndApply = async () => {
    setIsSaving(true)
    try {
      let desktopFile: File | null = null
      let mobileFile: File | null = null

      const desktopNeedsExport =
        hasNewDesktopImage || desktopFocal.x !== 50 || desktopFocal.y !== 50 || fitMode !== 'cover'
      const mobileNeedsExport =
        hasNewMobileImage || mobileFocal.x !== 50 || mobileFocal.y !== 50 || fitMode !== 'cover'

      if (desktopNeedsExport && desktopSourceImg) {
        desktopFile = await resizeImageToExactDimensions(
          desktopSourceImg,
          desktopTarget.width,
          desktopTarget.height,
          {
            mode: fitMode,
            focalX: desktopFocal.x,
            focalY: desktopFocal.y,
            fileName: 'hero-desktop'
          }
        )
      }

      if (mobileNeedsExport && mobileSourceImg) {
        mobileFile = await resizeImageToExactDimensions(
          mobileSourceImg,
          mobileTarget.width,
          mobileTarget.height,
          {
            mode: fitMode,
            focalX: mobileFocal.x,
            focalY: mobileFocal.y,
            fileName: 'hero-mobile'
          }
        )
      }

      const finalCta: HeroCtaConfig = {
        ...ctaConfig,
        description_text: hasDescription ? ctaConfig.description_text : ''
      }

      await onPublishBanners({
        desktopFile,
        mobileFile,
        updatedCtaConfig: finalCta
      })
      onClose()
    } catch {
      toast.error('No se pudieron aplicar los cambios')
    } finally {
      setIsSaving(false)
    }
  }

const renderPreviewButton = (btn: HeroButtonItemConfig) => {
    const radiusClass =
      btn.radius === 'pill'
        ? 'rounded-full'
        : btn.radius === 'rounded'
        ? 'rounded-[10px]'
        : 'rounded-none'

    const sColor = btn.shadow_color || 'rgba(0, 0, 0, 0.35)'
    const shadowStyle =
      btn.shadow === 'crisp'
        ? `0 6px 20px -2px ${sColor}, 0 2px 6px -1px ${sColor}`
        : btn.shadow === 'subtle'
        ? `0 3px 10px -1px ${sColor}`
        : 'none'

    if (btn.fill_style === 'minimal_underline') {
      return (
        <span
          style={{
            color: btn.text_color || '#FFFFFF',
            borderColor: btn.border_color || '#FFFFFF',
            fontFamily: btn.font_family,
            textShadow: btn.shadow !== 'none' ? `0 2px 8px ${sColor}` : 'none'
          }}
          className="inline-flex items-center gap-2 pb-1 border-b text-xs font-medium tracking-wider uppercase"
        >
          <span>{btn.text || 'Comprar Ahora'}</span>
          <ArrowRight size={13} strokeWidth={1.75} />
        </span>
      )
    }

    let resolvedBg = 'transparent'
    if (btn.fill_style === 'glass') {
      const alpha = getColorAlpha(btn.bg_color)
      resolvedBg =
        alpha === 0 || alpha > 0.75
          ? applyColorOpacity(btn.bg_color || '#FFFFFF', 0.22)
          : btn.bg_color
    } else if (btn.fill_style === 'solid') {
      const alpha = getColorAlpha(btn.bg_color)
      resolvedBg =
        alpha < 0.5 ? applyColorOpacity(btn.bg_color || '#FFFFFF', 1) : btn.bg_color
    }

    return (
      <span
        style={{
          backgroundColor: resolvedBg,
          color: btn.text_color || '#FFFFFF',
          borderColor: btn.border_color || '#FFFFFF',
          borderWidth: btn.border_width || '1px',
          borderStyle: btn.border_width === '0px' ? 'none' : 'solid',
          fontFamily: btn.font_family,
          boxShadow: shadowStyle,
          backdropFilter:
            btn.fill_style === 'glass' ? 'blur(14px) saturate(160%)' : undefined,
          WebkitBackdropFilter:
            btn.fill_style === 'glass' ? 'blur(14px) saturate(160%)' : undefined
        }}
        className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-medium tracking-wide transition-all ${radiusClass}`}
      >
        <span>{btn.text || 'Comprar Ahora'}</span>
      </span>
    )
  }

  const activeFocal = previewViewport === 'desktop' ? desktopFocal : mobileFocal
  const setActiveFocal = previewViewport === 'desktop' ? setDesktopFocal : setMobileFocal

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 lg:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[2px]"
        />

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-6xl h-[92dvh] bg-white rounded-2xl border border-neutral-200 flex flex-col lg:flex-row overflow-hidden"
        >
          {/* ================================================================
              COLUMNA IZQUIERDA: FLUJO GUIADO PASO A PASO (INTUITIVO Y LIMPIO)
          ================================================================ */}
          <div className="w-full lg:w-[440px] xl:w-[470px] border-b lg:border-b-0 lg:border-r border-neutral-200/80 flex flex-col h-full bg-white shrink-0 overflow-hidden">
            {/* Cabecera */}
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-900">
                  Editor de Portada y Botones
                </h2>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Personaliza los botones de acción o ajusta el encuadre de tu foto.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-neutral-200/80 hover:border-neutral-900 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            {/* Pestañas Superiores Numeradas y Claras */}
            <div className="px-5 py-3 border-b border-neutral-100 grid grid-cols-3 gap-1.5 shrink-0 bg-neutral-50/40">
              <button
                type="button"
                onClick={() => setActiveTab('cta_builder')}
                className={`py-2 px-2.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'cta_builder'
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200/90 bg-white text-neutral-600 hover:border-neutral-400'
                }`}
              >
                <MousePointerClick size={12} /> 1. Botones
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('smart_resizer')}
                className={`py-2 px-2.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'smart_resizer'
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200/90 bg-white text-neutral-600 hover:border-neutral-400'
                }`}
              >
                <Crop size={12} /> 2. Encuadre
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ai_generator')}
                className={`py-2 px-2.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'ai_generator'
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200/90 bg-white text-neutral-400 hover:border-neutral-300'
                }`}
              >
                <Sparkles size={11} /> 3. IA
              </button>
            </div>

            {/* Contenido Scrolleable */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 no-scrollbar">
              {/* ============================================================
                  SECCIÓN 1: BOTONES DE ACCIÓN (CTA) Y FRASE DESCRIPTIVA
              ============================================================ */}
              {activeTab === 'cta_builder' && (
                <div className="space-y-5">
                  {/* Interruptor Principal */}
                  <div className="p-4 rounded-xl border border-neutral-200/80 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-900">
                        Botones Interactivos en Portada
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Permite que el cliente toque el banner para ir a comprar.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCtaConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
                      }
                      className={`px-4 py-1.5 rounded-full text-[10px] font-mono font-semibold uppercase border transition-colors cursor-pointer shrink-0 ${
                        ctaConfig.enabled
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-transparent text-neutral-500 hover:border-neutral-400'
                      }`}
                    >
                      {ctaConfig.enabled ? 'Activado' : 'Desactivado'}
                    </button>
                  </div>

                  {ctaConfig.enabled && (
                    <>
                      {/* PASO A: MAPA VISUAL DE POSICIÓN EN 1 CLIC */}
                      <div className="p-4 rounded-xl border border-neutral-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-neutral-900">
                            ¿En qué parte del banner quieres el botón?
                          </span>
                          <span className="text-[9px] font-mono uppercase text-neutral-400">
                            1 Clic
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-neutral-50 border border-neutral-200/60">
                          {BANNER_POSITIONS.map((pos) => {
                            const isSelected =
                              ctaConfig.alignment === pos.h &&
                              (ctaConfig.vertical_alignment || 'bottom') === pos.v
                            return (
                              <button
                                key={`${pos.v}-${pos.h}`}
                                type="button"
                                onClick={() =>
                                  setCtaConfig((prev) => ({
                                    ...prev,
                                    alignment: pos.h,
                                    vertical_alignment: pos.v
                                  }))
                                }
                                className={`py-2 px-2 rounded-lg text-[10px] font-medium border transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'border-neutral-900 bg-neutral-900 text-white font-semibold'
                                    : 'border-neutral-200/80 bg-white text-neutral-500 hover:border-neutral-400'
                                }`}
                              >
                                {pos.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* PASO B: CONFIGURAR BOTÓN 1 Y BOTÓN 2 OPCIONAL */}
                      <div className="p-4 rounded-xl border border-neutral-200/80 space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-neutral-900">
                            Configuración de Botones
                          </span>

                          {!ctaConfig.secondary_button_enabled ? (
                            <button
                              type="button"
                              onClick={() => {
                                setCtaConfig((prev) => ({
                                  ...prev,
                                  secondary_button_enabled: true
                                }))
                                setEditingButtonSlot('secondary')
                              }}
                              className="px-3 py-1 rounded-full border border-neutral-200 hover:border-neutral-900 text-[10px] font-medium text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Plus size={11} /> Añadir 2do Botón
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setCtaConfig((prev) => ({
                                  ...prev,
                                  secondary_button_enabled: false
                                }))
                                setEditingButtonSlot('primary')
                              }}
                              className="px-2.5 py-1 rounded-full border border-neutral-200 hover:border-rose-600 text-[10px] font-medium text-neutral-500 hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 size={11} /> Quitar 2do Botón
                            </button>
                          )}
                        </div>

                        {/* Conmutador entre Botón 1 y Botón 2 */}
                        {ctaConfig.secondary_button_enabled && (
                          <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100 rounded-full">
                            <button
                              type="button"
                              onClick={() => setEditingButtonSlot('primary')}
                              className={`py-1.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${
                                editingButtonSlot === 'primary'
                                  ? 'bg-neutral-900 text-white'
                                  : 'text-neutral-500 hover:text-neutral-900'
                              }`}
                            >
                               Editando: Botón 1
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingButtonSlot('secondary')}
                              className={`py-1.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${
                                editingButtonSlot === 'secondary'
                                  ? 'bg-neutral-900 text-white'
                                  : 'text-neutral-500 hover:text-neutral-900'
                              }`}
                            >
                              Editando: Botón 2
                            </button>
                          </div>
                        )}

                        {/* 1. Texto y Acción del Botón */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-medium text-neutral-500 block mb-1">
                              Texto del botón
                            </label>
                            <input
                              type="text"
                              maxLength={28}
                              value={activeBtnConfig.text}
                              onChange={(e) => updateActiveButton({ text: e.target.value })}
                              placeholder="Comprar Ahora"
                              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 outline-none focus:border-neutral-900"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-medium text-neutral-500 block mb-1">
                              ¿A dónde lleva al tocarlo?
                            </label>
                            <select
                              value={activeBtnConfig.action_type}
                              onChange={(e) =>
                                updateActiveButton({
                                  action_type: e.target.value as 'catalog' | 'product'
                                })
                              }
                              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 outline-none focus:border-neutral-900"
                            >
                              <option value="catalog">Al inicio de los productos</option>
                              <option value="product">A un producto en específico</option>
                            </select>
                          </div>
                        </div>

                        {activeBtnConfig.action_type === 'product' && (
                          <div>
                            <label className="text-[10px] font-medium text-neutral-500 block mb-1">
                              Elige el producto que se abrirá
                            </label>
                            <select
                              value={String(activeBtnConfig.target_product_id || '')}
                              onChange={(e) =>
                                updateActiveButton({
                                  target_product_id: e.target.value || null
                                })
                              }
                              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 outline-none focus:border-neutral-900"
                            >
                              <option value="">Selecciona un producto de tu tienda...</option>
                              {storeProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                    {/* 2. MUESTRAS VISUALES DE ESTILOS RÁPIDOS (1 CLIC) */}
                        <div className="space-y-2 pt-1">
                          <label className="text-[10px] font-medium text-neutral-500 block">
                            Preajustes visuales en 1 clic
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {/* Muestra 1: Pastilla Blanca sobre fondo oscuro */}
                            <button
                              type="button"
                              onClick={() => applyQuickButtonPreset('white_pill')}
                              className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-500 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                              title="Pastilla transparente con borde blanco"
                            >
                              <span className="px-3 py-1 rounded-full border border-white text-white text-[10px] font-medium">
                                Sin Fondo Bco
                              </span>
                            </button>

                            {/* Muestra 2: Pastilla Negra sobre fondo claro */}
                            <button
                              type="button"
                              onClick={() => applyQuickButtonPreset('dark_pill')}
                              className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 hover:border-neutral-900 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                              title="Pastilla transparente con borde negro"
                            >
                              <span className="px-3 py-1 rounded-full border border-neutral-900 text-neutral-900 text-[10px] font-medium">
                                Sin Fondo Neg
                              </span>
                            </button>

                            {/* Muestra 3: Cristal Translúcido */}
                            <button
                              type="button"
                              onClick={() => applyQuickButtonPreset('frost_glass')}
                              className="p-2.5 rounded-xl bg-[linear-gradient(135deg,#27272a_0%,#52525b_100%)] border border-neutral-300 hover:border-neutral-900 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                              title="Cristal esmerilado translúcido"
                            >
                              <span className="px-3 py-1 rounded-full border border-white/60 bg-white/25 backdrop-blur-md text-white text-[10px] font-medium">
                                Cristal Blur
                              </span>
                            </button>

                            {/* Muestra 4: Blanco Sólido */}
                            <button
                              type="button"
                              onClick={() => applyQuickButtonPreset('solid_white')}
                              className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-500 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                              title="Botón blanco sólido con texto negro"
                            >
                              <span className="px-3 py-1 rounded-full bg-white text-neutral-950 text-[10px] font-semibold">
                                Blanco Sólido
                              </span>
                            </button>

                            {/* Muestra 5: Negro Sólido */}
                            <button
                              type="button"
                              onClick={() => applyQuickButtonPreset('solid_dark')}
                              className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 hover:border-neutral-900 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                              title="Botón negro sólido con texto blanco"
                            >
                              <span className="px-3 py-1 rounded-full bg-neutral-950 text-white text-[10px] font-semibold">
                                Negro Sólido
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* 3. ACABADO DEL BOTÓN (DEMOSTRACIÓN VISUAL DE CADA ACABADO) */}
                        <div className="space-y-2 pt-2">
                          <label className="text-[10px] font-medium text-neutral-500 block">
                            Tipo de acabado del botón
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {/* Sin Fondo */}
                            <button
                              type="button"
                              onClick={() => handleSelectFillStyle('outline_pill')}
                              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                                activeBtnConfig.fill_style === 'outline_pill'
                                  ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                                  : 'border-neutral-200 bg-white hover:border-neutral-400'
                              }`}
                            >
                              <div className="w-full py-2 rounded-lg bg-neutral-900 flex items-center justify-center">
                                <span className="px-3 py-1 rounded-full border border-white bg-transparent text-white text-[10px] font-medium">
                                  Comprar
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold text-neutral-800">
                                Pastilla sin Fondo
                              </span>
                            </button>

                            {/* Cristal */}
                            <button
                              type="button"
                              onClick={() => handleSelectFillStyle('glass')}
                              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                                activeBtnConfig.fill_style === 'glass'
                                  ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                                  : 'border-neutral-200 bg-white hover:border-neutral-400'
                              }`}
                            >
                              <div className="w-full py-2 rounded-lg bg-[linear-gradient(90deg,#18181b_0%,#71717a_50%,#18181b_100%)] flex items-center justify-center">
                                <span className="px-3 py-1 rounded-full border border-white/50 bg-white/25 backdrop-blur-md text-white text-[10px] font-medium">
                                  Comprar
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold text-neutral-800">
                                Cristal Translúcido
                              </span>
                            </button>

                            {/* Sólido */}
                            <button
                              type="button"
                              onClick={() => handleSelectFillStyle('solid')}
                              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                                activeBtnConfig.fill_style === 'solid'
                                  ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                                  : 'border-neutral-200 bg-white hover:border-neutral-400'
                              }`}
                            >
                              <div className="w-full py-2 rounded-lg bg-neutral-100 flex items-center justify-center">
                                <span className="px-3 py-1 rounded-full bg-neutral-900 text-white text-[10px] font-medium">
                                  Comprar
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold text-neutral-800">
                                Relleno Sólido
                              </span>
                            </button>

                            {/* Subrayado Editorial */}
                            <button
                              type="button"
                              onClick={() => handleSelectFillStyle('minimal_underline')}
                              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                                activeBtnConfig.fill_style === 'minimal_underline'
                                  ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                                  : 'border-neutral-200 bg-white hover:border-neutral-400'
                              }`}
                            >
                              <div className="w-full py-2 rounded-lg bg-neutral-900 flex items-center justify-center">
                                <span className="pb-0.5 border-b border-white text-white text-[10px] font-medium uppercase tracking-wider flex items-center gap-1">
                                  Comprar <ArrowRight size={10} />
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold text-neutral-800">
                                Subrayado Editorial
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* 4. PERSONALIZACIÓN VISUAL DE ESQUINAS, BORDES, SOMBRAS, FUENTES Y COLORES */}
                        <div className="pt-2 border-t border-neutral-100">
                          <button
                            type="button"
                            onClick={() => setShowAdvancedBtnStyle(!showAdvancedBtnStyle)}
                            className="w-full py-2 px-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/70 flex items-center justify-between text-[11px] font-semibold text-neutral-800 cursor-pointer transition-colors"
                          >
                            <span>Personalizar forma, bordes, sombra, fuente y colores</span>
                            {showAdvancedBtnStyle ? (
                              <ChevronUp size={15} />
                            ) : (
                              <ChevronDown size={15} />
                            )}
                          </button>

                          {showAdvancedBtnStyle && (
                            <div className="space-y-5 pt-4">
                              {/* A. ESQUINAS DEL BOTÓN (MUESTRA VISUAL DE LA FORMA REAL) */}
                              <div className="space-y-2">
                                <label className="text-[10px] font-medium text-neutral-500 block">
                                  Forma de las esquinas
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                  {(
                                    [
                                      { id: 'pill', label: 'Pastilla', radius: '9999px' },
                                      { id: 'rounded', label: 'Suave 10px', radius: '10px' },
                                      { id: 'sharp', label: 'Recto 0px', radius: '0px' }
                                    ] as { id: HeroButtonRadius; label: string; radius: string }[]
                                  ).map((item) => {
                                    const isSel = activeBtnConfig.radius === item.id
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => updateActiveButton({ radius: item.id })}
                                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                                          isSel
                                            ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                                            : 'border-neutral-200 bg-white hover:border-neutral-400'
                                        }`}
                                      >
                                        <span
                                          style={{ borderRadius: item.radius }}
                                          className={`w-full py-1.5 border text-[10px] font-medium text-center ${
                                            isSel
                                              ? 'border-neutral-900 bg-neutral-900 text-white'
                                              : 'border-neutral-400 bg-transparent text-neutral-700'
                                          }`}
                                        >
                                          Botón
                                        </span>
                                        <span className="text-[10px] font-medium text-neutral-600">
                                          {item.label}
                                        </span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>

                              {/* B. GROSOR DEL BORDE (MUESTRA VISUAL DEL GROSOR REAL) */}
                              <div className="space-y-2">
                                <label className="text-[10px] font-medium text-neutral-500 block">
                                  Grosor del borde
                                </label>
                                <div className="grid grid-cols-4 gap-1.5">
                                  {(
                                    [
                                      { id: '0px', label: 'Sin Borde', px: 0 },
                                      { id: '1px', label: '1px Fino', px: 1 },
                                      { id: '1.5px', label: '1.5px Medio', px: 1.5 },
                                      { id: '2px', label: '2px Grueso', px: 2 }
                                    ] as { id: HeroBorderWidth; label: string; px: number }[]
                                  ).map((b) => {
                                    const isSel = activeBtnConfig.border_width === b.id
                                    return (
                                      <button
                                        key={b.id}
                                        type="button"
                                        onClick={() => updateActiveButton({ border_width: b.id })}
                                        className={`p-2 rounded-xl border flex flex-col items-center justify-between gap-2 h-16 transition-all cursor-pointer ${
                                          isSel
                                            ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                                            : 'border-neutral-200 bg-white hover:border-neutral-400'
                                        }`}
                                      >
                                        <div className="w-full my-auto flex items-center justify-center">
                                          {b.px === 0 ? (
                                            <span className="w-full py-1 rounded-full bg-neutral-100 text-[9px] text-neutral-400 font-mono">
                                              0px
                                            </span>
                                          ) : (
                                            <span
                                              style={{ borderWidth: `${b.px}px` }}
                                              className="w-full h-5 rounded-full border-neutral-900 block"
                                            />
                                          )}
                                        </div>
                                        <span className="text-[9px] font-medium text-neutral-700 whitespace-nowrap">
                                          {b.label}
                                        </span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>

                              {/* C. SOMBRA DEL BOTÓN CON VISTA PREVIA REAL + COLOR DE SOMBRA */}
                              <div className="space-y-3">
                                <label className="text-[10px] font-medium text-neutral-500 block">
                                  Efecto de sombra del botón
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                  {(
                                    [
                                      { id: 'none', label: 'Sin Sombra' },
                                      { id: 'subtle', label: 'Sombra Sutil' },
                                      { id: 'crisp', label: 'Sombra Intensa' }
                                    ] as { id: HeroShadowLevel; label: string }[]
                                  ).map((sh) => {
                                    const isSel = activeBtnConfig.shadow === sh.id
                                    const sColor =
                                      activeBtnConfig.shadow_color || 'rgba(0, 0, 0, 0.35)'
                                    const sampleShadow =
                                      sh.id === 'crisp'
                                        ? `0 6px 16px -1px ${sColor}, 0 2px 5px -1px ${sColor}`
                                        : sh.id === 'subtle'
                                        ? `0 3px 8px -1px ${sColor}`
                                        : 'none'

                                    return (
                                      <button
                                        key={sh.id}
                                        type="button"
                                        onClick={() => updateActiveButton({ shadow: sh.id })}
                                        className={`p-3 rounded-xl border flex flex-col items-center gap-2.5 transition-all cursor-pointer ${
                                          isSel
                                            ? 'border-neutral-900 bg-neutral-50/80 ring-1 ring-neutral-900'
                                            : 'border-neutral-200 bg-white hover:border-neutral-400'
                                        }`}
                                      >
                                        <span
                                          style={{ boxShadow: sampleShadow }}
                                          className="px-3 py-1 rounded-full bg-white border border-neutral-300 text-[10px] font-medium text-neutral-800"
                                        >
                                          Muestra
                                        </span>
                                        <span className="text-[10px] font-medium text-neutral-700">
                                          {sh.label}
                                        </span>
                                      </button>
                                    )
                                  })}
                                </div>

                                {/* Picker de Color de la Sombra (Aparece cuando la sombra está activa) */}
                                {activeBtnConfig.shadow !== 'none' && (
                                  <div className="pt-1">
                                    <EliteColorPicker
                                      label="Color de la Sombra del Botón"
                                      value={
                                        activeBtnConfig.shadow_color || 'rgba(0, 0, 0, 0.35)'
                                      }
                                      description="Elige negro para sombra clásica o un color vivo para efecto resplandor (glow)."
                                      enableAlpha={true}
                                      onChange={(val) =>
                                        updateActiveButton({ shadow_color: val })
                                      }
                                    />
                                  </div>
                                )}
                              </div>

                              {/* D. TIPOGRAFÍA DEL BOTÓN (MUESTRA VISUAL CON LA FUENTE REAL) */}
                              <div className="space-y-2">
                                <label className="text-[10px] font-medium text-neutral-500 block">
                                  Tipografía del botón
                                </label>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {HERO_FONT_OPTIONS.map((f) => {
                                    const isSel = activeBtnConfig.font_family === f.value
                                    return (
                                      <button
                                        key={f.value}
                                        type="button"
                                        onClick={() =>
                                          updateActiveButton({ font_family: f.value })
                                        }
                                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                                          isSel
                                            ? 'border-neutral-900 bg-neutral-900 text-white'
                                            : 'border-neutral-200 bg-white hover:border-neutral-400 text-neutral-800'
                                        }`}
                                      >
                                        <span
                                          style={{ fontFamily: f.value }}
                                          className="text-xs truncate"
                                        >
                                          {f.label.split('—')[0].trim()}
                                        </span>
                                        <span
                                          style={{ fontFamily: f.value }}
                                          className={`text-xs opacity-70 ${
                                            isSel ? 'text-neutral-300' : 'text-neutral-400'
                                          }`}
                                        >
                                          Aa
                                        </span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>

                              {/* E. COLORES DEL BOTÓN */}
                              <div className="space-y-2 pt-2 border-t border-neutral-100">
                                <EliteColorPicker
                                  label="Color del Texto del Botón"
                                  value={activeBtnConfig.text_color}
                                  description="Color de las letras dentro del botón."
                                  onChange={(val) => updateActiveButton({ text_color: val })}
                                />

                                {activeBtnConfig.border_width !== '0px' && (
                                  <EliteColorPicker
                                    label="Color del Borde"
                                    value={activeBtnConfig.border_color}
                                    description="Color de la línea que contornea el botón."
                                    enableAlpha={true}
                                    onChange={(val) => updateActiveButton({ border_color: val })}
                                  />
                                )}

                                {(activeBtnConfig.fill_style === 'solid' ||
                                  activeBtnConfig.fill_style === 'glass') && (
                                  <EliteColorPicker
                                    label={
                                      activeBtnConfig.fill_style === 'glass'
                                        ? 'Color y Transparencia del Cristal'
                                        : 'Color de Fondo Sólido'
                                    }
                                    value={activeBtnConfig.bg_color}
                                    description={
                                      activeBtnConfig.fill_style === 'glass'
                                        ? 'Tinte translúcido con desenfoque de fondo.'
                                        : 'Color de relleno 100% sólido.'
                                    }
                                    enableAlpha={activeBtnConfig.fill_style === 'glass'}
                                    onChange={(val) =>
                                      updateActiveButton({
                                        bg_color:
                                          activeBtnConfig.fill_style === 'solid'
                                            ? applyColorOpacity(val, 1)
                                            : val
                                      })
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* PASO C: FRASE O DESCRIPCIÓN OPCIONAL CON MUESTRAS VISUALES */}
                      <div className="p-4 rounded-xl border border-neutral-200/80 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Type size={13} className="text-neutral-500" />
                            <span className="text-[11px] font-semibold text-neutral-900">
                              Descripción sobre el Botón
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setHasDescription(!hasDescription)}
                            className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase border transition-colors cursor-pointer ${
                              hasDescription
                                ? 'border-neutral-900 bg-neutral-900 text-white'
                                : 'border-neutral-200 text-neutral-500 bg-transparent'
                            }`}
                          >
                            {hasDescription ? 'Visible' : 'Opcional (Oculta)'}
                          </button>
                        </div>

                        {hasDescription && (
                          <div className="space-y-4 pt-1">
                            <textarea
                              rows={2}
                              maxLength={120}
                              value={ctaConfig.description_text || ''}
                              onChange={(e) =>
                                setCtaConfig((prev) => ({
                                  ...prev,
                                  description_text: e.target.value
                                }))
                              }
                              placeholder="Escribe una breve descripción para acompañar al botón..."
                              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 outline-none resize-none"
                            />

                            {/* Selector Visual de Fuentes para la Descripción */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-medium text-neutral-500 block">
                                Tipografía de la descripción
                              </label>
                              <div className="grid grid-cols-2 gap-1.5">
                                {HERO_FONT_OPTIONS.map((f) => {
                                  const isSel = ctaConfig.description_font === f.value
                                  return (
                                    <button
                                      key={f.value}
                                      type="button"
                                      onClick={() =>
                                        setCtaConfig((prev) => ({
                                          ...prev,
                                          description_font: f.value
                                        }))
                                      }
                                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                                        isSel
                                          ? 'border-neutral-900 bg-neutral-900 text-white'
                                          : 'border-neutral-200 bg-white hover:border-neutral-400 text-neutral-800'
                                      }`}
                                    >
                                      <span
                                        style={{ fontFamily: f.value }}
                                        className="text-xs truncate"
                                      >
                                        {f.label.split('—')[0].trim()}
                                      </span>
                                      <span
                                        style={{ fontFamily: f.value }}
                                        className="text-xs opacity-70"
                                      >
                                        Aa
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Tamaño y Sombra de la Descripción con Muestra Visual */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-medium text-neutral-500 block mb-1.5">
                                  Tamaño de letra
                                </label>
                                <div className="grid grid-cols-3 gap-1">
                                  {(
                                    [
                                      { id: 'sm', label: 'A', sizeClass: 'text-[10px]' },
                                      { id: 'md', label: 'A', sizeClass: 'text-xs' },
                                      { id: 'lg', label: 'A', sizeClass: 'text-sm font-semibold' }
                                    ] as const
                                  ).map((sz) => (
                                    <button
                                      key={sz.id}
                                      type="button"
                                      onClick={() =>
                                        setCtaConfig((prev) => ({
                                          ...prev,
                                          description_size: sz.id
                                        }))
                                      }
                                      className={`h-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                                        sz.sizeClass
                                      } ${
                                        ctaConfig.description_size === sz.id
                                          ? 'border-neutral-900 bg-neutral-900 text-white'
                                          : 'border-neutral-200 text-neutral-600 bg-white'
                                      }`}
                                    >
                                      {sz.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] font-medium text-neutral-500 block mb-1.5">
                                  Sombra del texto
                                </label>
                                <div className="grid grid-cols-3 gap-1">
                                  {(
                                    [
                                      { id: 'none', label: 'Sin' },
                                      { id: 'subtle', label: 'Suave' },
                                      { id: 'crisp', label: 'Fuerte' }
                                    ] as const
                                  ).map((sh) => (
                                    <button
                                      key={sh.id}
                                      type="button"
                                      onClick={() =>
                                        setCtaConfig((prev) => ({
                                          ...prev,
                                          description_shadow: sh.id
                                        }))
                                      }
                                      className={`h-9 rounded-lg text-[10px] font-medium border transition-colors cursor-pointer ${
                                        ctaConfig.description_shadow === sh.id
                                          ? 'border-neutral-900 bg-neutral-900 text-white'
                                          : 'border-neutral-200 text-neutral-600 bg-white'
                                      }`}
                                    >
                                      {sh.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <EliteColorPicker
                              label="Color del Texto de la Descripción"
                              value={ctaConfig.description_color || '#FFFFFF'}
                              description="Color de la frase sobre la portada."
                              onChange={(val) =>
                                setCtaConfig((prev) => ({
                                  ...prev,
                                  description_color: val
                                }))
                              }
                            />

                            {ctaConfig.description_shadow &&
                              ctaConfig.description_shadow !== 'none' && (
                                <EliteColorPicker
                                  label="Color de la Sombra del Texto"
                                  value={
                                    ctaConfig.description_shadow_color ||
                                    'rgba(0, 0, 0, 0.55)'
                                  }
                                  description="Color del sombreado detrás de las letras."
                                  enableAlpha={true}
                                  onChange={(val) =>
                                    setCtaConfig((prev) => ({
                                      ...prev,
                                      description_shadow_color: val
                                    }))
                                  }
                                />
                              )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ============================================================
                  SECCIÓN 2: ENCUADRE Y REDIMENSIONAMIENTO DE IMAGEN INTUITIVO
              ============================================================ */}
              {activeTab === 'smart_resizer' && (
                <div className="space-y-5">
                  {/* Selector de qué formato se está encuadrando */}
                  <div className="p-3.5 rounded-xl border border-neutral-200/80 space-y-2.5">
                    <label className="text-[11px] font-semibold text-neutral-900 block">
                      1. ¿Qué portada deseas ajustar o subir?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewViewport('mobile')}
                        className={`py-2.5 px-3 rounded-xl border text-left transition-colors cursor-pointer flex items-center gap-2 ${
                          previewViewport === 'mobile'
                            ? 'border-neutral-900 bg-neutral-900 text-white'
                            : 'border-neutral-200 bg-white text-neutral-700'
                        }`}
                      >
                        <Smartphone size={15} />
                        <div>
                          <p className="text-[11px] font-semibold leading-none">Portada Móvil</p>
                          <p className="text-[9px] font-mono opacity-75 mt-0.5">
                            {mobileTarget.width}x{mobileTarget.height} px
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewViewport('desktop')}
                        className={`py-2.5 px-3 rounded-xl border text-left transition-colors cursor-pointer flex items-center gap-2 ${
                          previewViewport === 'desktop'
                            ? 'border-neutral-900 bg-neutral-900 text-white'
                            : 'border-neutral-200 bg-white text-neutral-700'
                        }`}
                      >
                        <Monitor size={15} />
                        <div>
                          <p className="text-[11px] font-semibold leading-none">Banner PC</p>
                          <p className="text-[9px] font-mono opacity-75 mt-0.5">1920x600 px</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Inputs de archivo ocultos */}
                  <input
                    type="file"
                    ref={dualInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleSelectImageForTarget(e, 'both')}
                  />
                  <input
                    type="file"
                    ref={desktopInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleSelectImageForTarget(e, 'desktop')}
                  />
                  <input
                    type="file"
                    ref={mobileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleSelectImageForTarget(e, 'mobile')}
                  />

                  {/* Subida clara */}
                  <div className="p-4 rounded-xl border border-neutral-200/80 space-y-2.5">
                    <label className="text-[11px] font-semibold text-neutral-900 block">
                      2. Cambiar fotografía (Acepta cualquier tamaño)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        previewViewport === 'mobile'
                          ? mobileInputRef.current?.click()
                          : desktopInputRef.current?.click()
                      }
                      className="w-full py-3.5 px-4 rounded-xl border border-dashed border-neutral-300 hover:border-neutral-900 bg-neutral-50/50 flex items-center justify-center gap-2 text-xs font-semibold text-neutral-900 transition-colors cursor-pointer"
                    >
                      <Upload size={15} />
                      <span>
                        Subir foto para {previewViewport === 'mobile' ? 'Móvil' : 'Escritorio'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => dualInputRef.current?.click()}
                      className="w-full py-2 rounded-full border border-neutral-200 hover:border-neutral-900 text-[10px] font-medium text-neutral-600 hover:text-neutral-900 bg-transparent transition-colors cursor-pointer"
                    >
                      O subir 1 sola foto y aplicarla a PC y Móvil a la vez
                    </button>
                  </div>

                  {/* Modo de Ajuste y Posición en lenguaje humano */}
                  <div className="p-4 rounded-xl border border-neutral-200/80 space-y-4">
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-900 block mb-2">
                        3. ¿Cómo quieres que se adapte la foto?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFitMode('cover')}
                          className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                            fitMode === 'cover'
                              ? 'border-neutral-900 bg-neutral-900 text-white'
                              : 'border-neutral-200 bg-white text-neutral-700'
                          }`}
                        >
                          <p className="text-[11px] font-semibold">Llenar todo el espacio</p>
                          <p className="text-[9px] opacity-75 mt-0.5">Sin bordes sobrantes</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFitMode('contain_blur')}
                          className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                            fitMode === 'contain_blur'
                              ? 'border-neutral-900 bg-neutral-900 text-white'
                              : 'border-neutral-200 bg-white text-neutral-700'
                          }`}
                        >
                          <p className="text-[11px] font-semibold">Ver foto entera</p>
                          <p className="text-[9px] opacity-75 mt-0.5">Con bordes difuminados</p>
                        </button>
                      </div>
                    </div>

                    {fitMode === 'cover' && (
                      <div className="space-y-3 pt-2 border-t border-neutral-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-neutral-900">
                            Mover encuadre de la foto ({previewViewport === 'mobile' ? 'Móvil' : 'PC'})
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveFocal({ x: 50, y: 50 })}
                            className="text-[10px] font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw size={10} /> Centrar
                          </button>
                        </div>

                        {/* Atajos rápidos Arriba / Centro / Abajo */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              { label: 'Enfocar Arriba', y: 0 },
                              { label: 'Enfocar Centro', y: 50 },
                              { label: 'Enfocar Abajo', y: 100 }
                            ] as const
                          ).map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() =>
                                setActiveFocal((prev) => ({ ...prev, y: preset.y }))
                              }
                              className={`py-1.5 rounded-full text-[10px] font-medium border transition-colors cursor-pointer ${
                                activeFocal.y === preset.y
                                  ? 'border-neutral-900 bg-neutral-900 text-white'
                                  : 'border-neutral-200 text-neutral-600 bg-white'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-2.5 pt-1">
                          <div>
                            <div className="flex justify-between text-[10px] text-neutral-500 mb-1">
                              <span>Mover Arriba ↔ Abajo</span>
                              <span className="font-mono">{activeFocal.y}%</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={activeFocal.y}
                              onChange={(e) =>
                                setActiveFocal((prev) => ({
                                  ...prev,
                                  y: Number(e.target.value)
                                }))
                              }
                              className="w-full accent-neutral-900 cursor-pointer"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-[10px] text-neutral-500 mb-1">
                              <span>Mover Izquierda ↔ Derecha</span>
                              <span className="font-mono">{activeFocal.x}%</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={activeFocal.x}
                              onChange={(e) =>
                                setActiveFocal((prev) => ({
                                  ...prev,
                                  x: Number(e.target.value)
                                }))
                              }
                              className="w-full accent-neutral-900 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================
                  SECCIÓN 3: GENERADOR IA (EN CONSTRUCCIÓN / PRÓXIMAMENTE)
              ============================================================ */}
              {activeTab === 'ai_generator' && (
                <div className="py-12 px-5 rounded-2xl border border-neutral-200/80 bg-neutral-50/40 flex flex-col items-center text-center space-y-3">
                  <div className="w-10 h-10 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-700">
                    <Construction size={16} strokeWidth={1.75} />
                  </div>

                  <span className="px-3 py-1 rounded-full border border-neutral-200 bg-white text-[9px] font-mono font-semibold uppercase tracking-widest text-neutral-500">
                    En Construcción • Próximamente
                  </span>

                  <h4 className="text-sm font-semibold text-neutral-900 tracking-tight max-w-xs">
                    Generador de Escenarios con IA
                  </h4>

                  <p className="text-xs text-neutral-500 leading-relaxed max-w-xs">
                    Este apartado se encuentra en construcción. Muy pronto podrás generar fondos fotográficos de estudio para tus productos reales desde aquí.
                  </p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('cta_builder')}
                      className="px-4 py-2 rounded-full border border-neutral-900 bg-transparent hover:bg-neutral-900 text-neutral-900 hover:text-white text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Volver a Botones de Portada
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer de Guardado */}
            <div className="px-5 py-4 border-t border-neutral-100 bg-white flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-full border border-neutral-200 hover:border-neutral-400 bg-transparent text-neutral-600 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={handleSaveAndApply}
                disabled={isSaving}
                className="flex-1 py-2.5 px-5 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white text-[11px] font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Aplicando...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Aplicar Cambios a la Portada</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ================================================================
              COLUMNA DERECHA: PREVISUALIZACIÓN EN TIEMPO REAL FIEL AL 100%
          ================================================================ */}
          <div className="flex-1 bg-[#F7F7F8] flex flex-col items-center justify-between p-4 sm:p-6 overflow-y-auto relative">
            <div className="w-full flex items-center justify-between gap-2 z-20">
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                Vista Previa Real (Sin Recortes ni Degradados)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewViewport('mobile')}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    previewViewport === 'mobile'
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
                  }`}
                >
                  <Smartphone size={12} /> Móvil ({mobileTarget.width}x{mobileTarget.height})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('desktop')}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    previewViewport === 'desktop'
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
                  }`}
                >
                  <Monitor size={12} /> PC (1920x600)
                </button>
              </div>
            </div>

            <div className="my-auto w-full flex items-center justify-center py-4">
            {/* VISTA DESKTOP */}
              <div
                className={`${
                  previewViewport === 'desktop' ? 'block' : 'hidden'
                } relative w-full max-w-[860px] aspect-[16/5] rounded-xl overflow-hidden border border-neutral-200 bg-neutral-900`}
              >
                <canvas ref={desktopCanvasRef} className="w-full h-full object-cover block" />

                {ctaConfig.enabled && (
                  <div
                    className={`absolute inset-0 z-20 p-6 sm:p-10 flex flex-col pointer-events-none ${
                      ctaConfig.vertical_alignment === 'center'
                        ? 'justify-center'
                        : 'justify-end'
                    } ${
                      ctaConfig.alignment === 'right'
                        ? 'items-end text-right'
                        : ctaConfig.alignment === 'center'
                        ? 'items-center text-center'
                        : 'items-start text-left'
                    }`}
                  >
                    <div className="max-w-lg space-y-3.5">
                      {hasDescription &&
                        ctaConfig.description_text &&
                        ctaConfig.description_text.trim().length > 0 && (
                          <p
                            style={{
                              fontFamily: ctaConfig.description_font,
                              color: ctaConfig.description_color || '#FFFFFF',
                              textShadow:
                                ctaConfig.description_shadow === 'crisp'
                                  ? `0 2px 12px ${ctaConfig.description_shadow_color || 'rgba(0,0,0,0.55)'}, 0 1px 3px ${ctaConfig.description_shadow_color || 'rgba(0,0,0,0.55)'}`
                                  : ctaConfig.description_shadow === 'subtle'
                                  ? `0 1px 6px ${ctaConfig.description_shadow_color || 'rgba(0,0,0,0.35)'}`
                                  : 'none'
                            }}
                            className={`font-normal leading-relaxed ${
                              ctaConfig.description_size === 'lg'
                                ? 'text-base sm:text-xl'
                                : ctaConfig.description_size === 'sm'
                                ? 'text-xs'
                                : 'text-sm sm:text-base'
                            }`}
                          >
                            {ctaConfig.description_text}
                          </p>
                        )}

                      <div
                        className={`flex items-center gap-2.5 flex-wrap ${
                          ctaConfig.alignment === 'right'
                            ? 'justify-end'
                            : ctaConfig.alignment === 'center'
                            ? 'justify-center'
                            : 'justify-start'
                        }`}
                      >
                        {renderPreviewButton(ctaConfig.primary_button)}
                        {ctaConfig.secondary_button_enabled &&
                          ctaConfig.secondary_button &&
                          renderPreviewButton(ctaConfig.secondary_button)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* VISTA MÓVIL (100% Proporción 4:5 o 3:2 sin recortes) */}
              <div
                className={`${
                  previewViewport === 'mobile' ? 'block' : 'hidden'
                } relative w-full max-w-[330px] ${
                  isRestaurant ? 'aspect-[3/2]' : 'aspect-[4/5]'
                } rounded-xl overflow-hidden border border-neutral-200 bg-neutral-900`}
              >
                <canvas ref={mobileCanvasRef} className="w-full h-full object-cover block" />

                {ctaConfig.enabled && (
                  <div
                    className={`absolute inset-0 z-20 p-5 flex flex-col pointer-events-none ${
                      ctaConfig.vertical_alignment === 'center'
                        ? 'justify-center'
                        : 'justify-end'
                    } ${
                      ctaConfig.alignment === 'right'
                        ? 'items-end text-right'
                        : ctaConfig.alignment === 'center'
                        ? 'items-center text-center'
                        : 'items-start text-left'
                    }`}
                  >
                    <div className="w-full space-y-3">
                      {hasDescription &&
                        ctaConfig.description_text &&
                        ctaConfig.description_text.trim().length > 0 && (
                          <p
                            style={{
                              fontFamily: ctaConfig.description_font,
                              color: ctaConfig.description_color || '#FFFFFF',
                              textShadow:
                                ctaConfig.description_shadow === 'crisp'
                                  ? `0 2px 12px ${ctaConfig.description_shadow_color || 'rgba(0,0,0,0.55)'}, 0 1px 3px ${ctaConfig.description_shadow_color || 'rgba(0,0,0,0.55)'}`
                                  : ctaConfig.description_shadow === 'subtle'
                                  ? `0 1px 6px ${ctaConfig.description_shadow_color || 'rgba(0,0,0,0.35)'}`
                                  : 'none'
                            }}
                            className={`font-normal leading-relaxed ${
                              ctaConfig.description_size === 'lg'
                                ? 'text-base'
                                : ctaConfig.description_size === 'sm'
                                ? 'text-[11px]'
                                : 'text-xs'
                            }`}
                          >
                            {ctaConfig.description_text}
                          </p>
                        )}

                      <div
                        className={`flex items-center gap-2 flex-wrap ${
                          ctaConfig.alignment === 'right'
                            ? 'justify-end'
                            : ctaConfig.alignment === 'center'
                            ? 'justify-center'
                            : 'justify-start'
                        }`}
                      >
                        {renderPreviewButton(ctaConfig.primary_button)}
                        {ctaConfig.secondary_button_enabled &&
                          ctaConfig.secondary_button &&
                          renderPreviewButton(ctaConfig.secondary_button)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[10px] font-mono text-neutral-400 text-center">
              Lo que ves en este lienzo es exactamente cómo se verá en la tienda en vivo.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}