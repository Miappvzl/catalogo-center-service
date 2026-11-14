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
  RotateCcw,
  Move,
  Copy
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { getSupabase } from '@/lib/supabase-client'
import {
  HeroCtaConfig,
  HeroViewportCtaConfig,
  HeroButtonItemConfig,
  HeroButtonFillStyle,
  HeroButtonRadius,
  HeroShadowLevel,
  HeroBorderWidth,
  HeroCtaAlignment,
  MobileHeroAspectOption
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
 * Extrae R, G, B, A de cualquier string HEX (#FFF, #EF4444, #EF444480) o RGB/RGBA
 */
export function parseColorChannels(colorStr?: string): {
  r: number
  g: number
  b: number
  a: number
} {
  const clean = (colorStr || '#FFFFFF').trim()
  let r = 255,
    g = 255,
    b = 255,
    a = 1

  if (clean === 'transparent') {
    return { r: 255, g: 255, b: 255, a: 0 }
  }

  if (clean.startsWith('#')) {
    const hex = clean.slice(1)
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16)
      g = parseInt(hex[1] + hex[1], 16)
      b = parseInt(hex[2] + hex[2], 16)
    } else if (hex.length >= 6) {
      r = parseInt(hex.slice(0, 2), 16)
      g = parseInt(hex.slice(2, 4), 16)
      b = parseInt(hex.slice(4, 6), 16)
      if (hex.length === 8) {
        a = Number((parseInt(hex.slice(6, 8), 16) / 255).toFixed(2))
      }
    }
  } else if (clean.startsWith('rgb')) {
    const parts = clean.match(/\d+(\.\d+)?/g)
    if (parts && parts.length >= 3) {
      r = Number(parts[0])
      g = Number(parts[1])
      b = Number(parts[2])
      a = parts.length >= 4 ? Number(parts[3]) : 1
    }
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return { r: 255, g: 255, b: 255, a: 1 }
  }

  return { r, g, b, a: isNaN(a) ? 1 : a }
}

export function applyColorOpacity(colorStr: string, targetAlpha: number): string {
  const { r, g, b } = parseColorChannels(colorStr)
  if (targetAlpha >= 1) {
    const toHex = (n: number) =>
      Math.max(0, Math.min(255, Math.round(n)))
        .toString(16)
        .padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
  }
  return `rgba(${r}, ${g}, ${b}, ${Number(targetAlpha.toFixed(2))})`
}

/**
 * Resuelve el color de fondo del botón garantizando que en modo 'glass' (Cristal)
 * siempre conserve su tinte de color real (ej. cristal rojizo) con transparencia.
 */
export function resolveButtonBgForStyle(
  fillStyle: HeroButtonFillStyle,
  rawColor?: string
): string {
  if (fillStyle === 'outline_pill' || fillStyle === 'minimal_underline') {
    return 'transparent'
  }
  if (!rawColor || rawColor === 'transparent') {
    return fillStyle === 'glass' ? 'rgba(255, 255, 255, 0.28)' : '#171717'
  }

  const { r, g, b, a } = parseColorChannels(rawColor)

  if (fillStyle === 'glass') {
    const glassAlpha = a >= 0.88 || a <= 0.02 ? 0.32 : Number(a.toFixed(2))
    return `rgba(${r}, ${g}, ${b}, ${glassAlpha})`
  }

  // Modo sólido
  return a < 0.15 ? applyColorOpacity(rawColor, 1) : rawColor
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
  shadow_color: 'rgba(0, 0, 0, 0.35)',
  scale: 1
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
  shadow_color: 'rgba(0, 0, 0, 0.35)',
  scale: 1
}

function normalizeSingleViewportCta(
  raw?: Partial<HeroViewportCtaConfig> | null,
  fallback?: Partial<HeroViewportCtaConfig> | null
): HeroViewportCtaConfig {
  const src = raw || fallback || {}
  const align = src.alignment ?? 'center'
  const vAlign = src.vertical_alignment ?? 'bottom'

  const defaultX = typeof src.pos_x === 'number' ? src.pos_x : 50
  const defaultY = typeof src.pos_y === 'number' ? src.pos_y : 85

  return {
    enabled: src.enabled ?? false,
    pos_x: typeof src.pos_x === 'number' ? src.pos_x : defaultX,
    pos_y: typeof src.pos_y === 'number' ? src.pos_y : defaultY,
    alignment: align,
    vertical_alignment: vAlign,
    buttons_layout: src.buttons_layout ?? 'row',
    description_text: src.description_text ?? '',
    description_font: src.description_font ?? 'var(--font-inter), sans-serif',
    description_color: src.description_color ?? '#FFFFFF',
    description_size: src.description_size ?? 'md',
    description_shadow: src.description_shadow ?? 'none',
    description_shadow_color: src.description_shadow_color ?? 'rgba(0, 0, 0, 0.55)',
    primary_button: {
      ...DEFAULT_PRIMARY_CTA_BUTTON,
      ...(src.primary_button || {}),
      scale: Number(src.primary_button?.scale || 1)
    },
    secondary_button_enabled: src.secondary_button_enabled ?? false,
    secondary_button: {
      ...DEFAULT_SECONDARY_CTA_BUTTON,
      ...(src.secondary_button || {}),
      scale: Number(src.secondary_button?.scale || 1)
    }
  }
}

export function getNormalizedHeroCta(
  raw?: Partial<HeroCtaConfig> | null
): HeroCtaConfig {
  const desktopNorm = normalizeSingleViewportCta(raw?.desktop, raw)
  const mobileNorm = normalizeSingleViewportCta(raw?.mobile, raw)

  return {
    ...mobileNorm,
    mobile_banner_ratio: raw?.mobile_banner_ratio || 'aspect-[9/10]',
    desktop: desktopNorm,
    mobile: mobileNorm
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

const QUICK_SNAP_POSITIONS: {
  label: string
  x: number
  y: number
  h: HeroCtaAlignment
}[] = [
    { label: 'Arriba Izq', x: 12, y: 18, h: 'left' },
    { label: 'Arriba Centro', x: 50, y: 18, h: 'center' },
    { label: 'Arriba Der', x: 88, y: 18, h: 'right' },
    { label: 'Centro Izq', x: 12, y: 50, h: 'left' },
    { label: 'Centro', x: 50, y: 50, h: 'center' },
    { label: 'Centro Der', x: 88, y: 50, h: 'right' },
    { label: 'Abajo Izq', x: 12, y: 84, h: 'left' },
    { label: 'Abajo Centro', x: 50, y: 84, h: 'center' },
    { label: 'Abajo Der', x: 88, y: 84, h: 'right' }
  ]

const MOBILE_RATIO_OPTIONS: {
  id: MobileHeroAspectOption
  label: string
  desc: string
  heightPx: number
}[] = [
    {
      id: 'aspect-[9/10]',
      label: 'Equilibrada (9:10)',
      desc: 'Cabe todo el flyer y deja ver productos abajo',
      heightPx: 1200
    },
    {
      id: 'aspect-square',
      label: 'Cuadrada (1:1)',
      desc: 'Formato Instagram 1080×1080 px',
      heightPx: 1080
    },
    {
      id: 'aspect-[4/5]',
      label: 'Vertical Alta (4:5)',
      desc: 'Formato póster completo 1080×1350 px',
      heightPx: 1350
    },
    {
      id: 'aspect-[3/2]',
      label: 'Compacta Baja (3:2)',
      desc: 'Franja horizontal 1080×720 px',
      heightPx: 720
    }
  ]

export default function AiBannerStudioModal({
  isOpen,
  onClose,
  storeId,
  currentDesktopUrl,
  currentMobileUrl,
  currentCtaConfig,
  initialSection = 'cta_builder',
  onPublishBanners
}: AiBannerStudioModalProps) {
  const supabase = getSupabase()

  const [activeTab, setActiveTab] = useState<StudioTab>(initialSection)
  // El viewport activo controla de forma 100% independiente si estamos editando MÓVIL o PC
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('mobile')
  const [editingButtonSlot, setEditingButtonSlot] = useState<'primary' | 'secondary' | 'both'>('primary')
  const [showAdvancedBtnStyle, setShowAdvancedBtnStyle] = useState(false)

  const [storeProducts, setStoreProducts] = useState<any[]>([])
  const [ctaConfig, setCtaConfig] = useState<HeroCtaConfig>(() =>
    getNormalizedHeroCta(currentCtaConfig)
  )

  // Configuración activa según el lienzo que el usuario está viendo (Móvil o PC independientes)
  const activeVpConfig: HeroViewportCtaConfig =
    previewViewport === 'mobile'
      ? ctaConfig.mobile || ctaConfig
      : ctaConfig.desktop || ctaConfig

  const [hasDescriptionMobile, setHasDescriptionMobile] = useState<boolean>(
    () =>
      Boolean(
        (currentCtaConfig?.mobile?.description_text ?? currentCtaConfig?.description_text)
          ?.trim()
          .length
      )
  )
  const [hasDescriptionDesktop, setHasDescriptionDesktop] = useState<boolean>(
    () =>
      Boolean(
        (currentCtaConfig?.desktop?.description_text ?? currentCtaConfig?.description_text)
          ?.trim()
          .length
      )
  )

  const hasDescription =
    previewViewport === 'mobile' ? hasDescriptionMobile : hasDescriptionDesktop
  const setHasDescription = (val: boolean) => {
    if (previewViewport === 'mobile') setHasDescriptionMobile(val)
    else setHasDescriptionDesktop(val)
  }

  // Dimensiones objetivo según la proporción móvil elegida
  const currentMobileRatioObj =
    MOBILE_RATIO_OPTIONS.find((r) => r.id === (ctaConfig.mobile_banner_ratio || 'aspect-[9/10]')) ||
    MOBILE_RATIO_OPTIONS[0]

  const desktopTarget = { width: 1920, height: 600 }
  const mobileTarget = { width: 1080, height: currentMobileRatioObj.heightPx }

  // Estados independientes de imagen y encuadre para PC y Móvil
  const [desktopSourceImg, setDesktopSourceImg] = useState<HTMLImageElement | null>(null)
  const [mobileSourceImg, setMobileSourceImg] = useState<HTMLImageElement | null>(null)
  const [desktopFitMode, setDesktopFitMode] = useState<'cover' | 'contain_blur'>('cover')
  const [mobileFitMode, setMobileFitMode] = useState<'cover' | 'contain_blur'>('cover')

  const [desktopFocal, setDesktopFocal] = useState<{ x: number; y: number }>({ x: 50, y: 50 })
  const [mobileFocal, setMobileFocal] = useState<{ x: number; y: number }>({ x: 50, y: 50 })

  const [hasNewDesktopImage, setHasNewDesktopImage] = useState(false)
  const [hasNewMobileImage, setHasNewMobileImage] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  type BoxInteractionMode =
    | 'move'
    | 'stretch_x_left'
    | 'stretch_x_right'
    | 'stretch_y'
    | 'scale_nw'
    | 'scale_ne'
    | 'scale_sw'
    | 'scale_se'
    | null

  const [interactionMode, setInteractionMode] = useState<BoxInteractionMode>(null)
  const dragOriginRef = useRef<{
    clientX: number
    clientY: number
    startPosX: number
    startPosY: number
    startScale: number
  }>({
    clientX: 0,
    clientY: 0,
    startPosX: 12,
    startPosY: 84,
    startScale: 1
  })

  const desktopContainerRef = useRef<HTMLDivElement>(null)
  const mobileContainerRef = useRef<HTMLDivElement>(null)

  const desktopCanvasRef = useRef<HTMLCanvasElement>(null)
  const mobileCanvasRef = useRef<HTMLCanvasElement>(null)
  const desktopInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      const norm = getNormalizedHeroCta(currentCtaConfig)
      setCtaConfig(norm)
      setHasDescriptionMobile(
        Boolean(norm.mobile?.description_text && norm.mobile.description_text.trim().length > 0)
      )
      setHasDescriptionDesktop(
        Boolean(norm.desktop?.description_text && norm.desktop.description_text.trim().length > 0)
      )
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

  const updateActiveViewportCta = useCallback(
    (patch: Partial<HeroViewportCtaConfig>) => {
      setCtaConfig((prev) => {
        const key = previewViewport === 'mobile' ? 'mobile' : 'desktop'
        const currentVp = prev[key] || normalizeSingleViewportCta(prev)
        const updatedVp = { ...currentVp, ...patch }

        return {
          ...prev,
          ...(previewViewport === 'mobile' ? updatedVp : {}),
          [key]: updatedVp
        }
      })
    },
    [previewViewport]
  )

  const handleCopyConfigToOtherViewport = () => {
    const targetName = previewViewport === 'mobile' ? 'PC (Escritorio)' : 'Móvil'
    setCtaConfig((prev) => {
      const sourceCfg =
        previewViewport === 'mobile'
          ? prev.mobile || normalizeSingleViewportCta(prev)
          : prev.desktop || normalizeSingleViewportCta(prev)

      const cloned: HeroViewportCtaConfig = JSON.parse(JSON.stringify(sourceCfg))
      if (previewViewport === 'mobile') {
        setHasDescriptionDesktop(hasDescriptionMobile)
        return { ...prev, desktop: cloned }
      } else {
        setHasDescriptionMobile(hasDescriptionDesktop)
        return { ...prev, ...cloned, mobile: cloned }
      }
    })
    toast.success(`Diseño copiado a la vista de ${targetName}`)
  }

  // Mayor libertad de escala (0.65x a 1.32x en fila móvil, y hasta 1.65x en PC o apilados)
  const getSafeMaxScale = useCallback(
    (vpCfg: HeroViewportCtaConfig, isMob: boolean) => {
      const hasTwoInRow =
        vpCfg.secondary_button_enabled && (vpCfg.buttons_layout || 'row') === 'row'
      if (isMob && hasTwoInRow) {
        return 1.32
      }
      if (isMob) {
        return 1.5
      }
      return 1.65
    },
    []
  )
  const startBoxInteraction = (
    e: React.PointerEvent<HTMLElement>,
    mode: BoxInteractionMode
  ) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragOriginRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startPosX: typeof activeVpConfig.pos_x === 'number' ? activeVpConfig.pos_x : 50,
      startPosY: typeof activeVpConfig.pos_y === 'number' ? activeVpConfig.pos_y : 84,
      startScale: Number(activeVpConfig.primary_button?.scale || 1)
    }
    setInteractionMode(mode)
  }

  const handlePointerMoveOnStage = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactionMode) return
      const container =
        previewViewport === 'desktop'
          ? desktopContainerRef.current
          : mobileContainerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const deltaX = e.clientX - dragOriginRef.current.clientX
      const deltaY = e.clientY - dragOriginRef.current.clientY

      // 1. MOVER EL RECUADRO COMPLETO RESPETANDO MÁRGENES
      if (interactionMode === 'move') {
        let nextX = dragOriginRef.current.startPosX + (deltaX / rect.width) * 100
        let nextY = dragOriginRef.current.startPosY + (deltaY / rect.height) * 100

        if (Math.abs(nextX - 50) < 3) nextX = 50
        if (Math.abs(nextY - 50) < 3) nextY = 50

        const clampedX = Math.max(8, Math.min(92, Math.round(nextX)))
        const clampedY = Math.max(10, Math.min(90, Math.round(nextY)))

        const autoAlign: HeroCtaAlignment =
          clampedX > 66 ? 'right' : clampedX >= 34 ? 'center' : 'left'

        updateActiveViewportCta({
          pos_x: clampedX,
          pos_y: clampedY,
          alignment: autoAlign
        })
        return
      }

      // 2. TIRADORES LATERALES (↔): Achicar hacia el centro apila (column); estirar hacia afuera pone en fila (row)
      if (interactionMode === 'stretch_x_right' || interactionMode === 'stretch_x_left') {
        const effectiveStretchX =
          interactionMode === 'stretch_x_right' ? deltaX : -deltaX
        if (effectiveStretchX < -18 && activeVpConfig.buttons_layout !== 'column') {
          updateActiveViewportCta({ buttons_layout: 'column' })
        } else if (effectiveStretchX > 18 && activeVpConfig.buttons_layout !== 'row') {
          updateActiveViewportCta({ buttons_layout: 'row' })
        }
        return
      }

      // 3. TIRADOR INFERIOR (↕): Estirar hacia abajo apila (column); empujar hacia arriba pone en fila (row)
      if (interactionMode === 'stretch_y') {
        if (deltaY > 16 && activeVpConfig.buttons_layout !== 'column') {
          updateActiveViewportCta({ buttons_layout: 'column' })
        } else if (deltaY < -16 && activeVpConfig.buttons_layout !== 'row') {
          updateActiveViewportCta({ buttons_layout: 'row' })
        }
        return
      }

      // 4. ESCALAR DESDE CUALQUIERA DE LAS 4 ESQUINAS (↖ ↗ ↙ ↘) RESPETANDO PROPORCIONES
      if (interactionMode.startsWith('scale_')) {
        const dirX = interactionMode.endsWith('e') ? 1 : -1
        const dirY = interactionMode.startsWith('scale_s') ? 1 : -1

        const diagonalDelta = deltaX * dirX + deltaY * dirY
        const rawScale = dragOriginRef.current.startScale + diagonalDelta / 160
        const maxAllowed = getSafeMaxScale(
          activeVpConfig,
          previewViewport === 'mobile'
        )
        const clampedScale = Number(
          Math.max(0.75, Math.min(maxAllowed, rawScale)).toFixed(2)
        )

        const secBtn =
          activeVpConfig.secondary_button || DEFAULT_SECONDARY_CTA_BUTTON

        updateActiveViewportCta({
          primary_button: {
            ...activeVpConfig.primary_button,
            scale: clampedScale
          },
          secondary_button: {
            ...secBtn,
            scale: clampedScale
          }
        })
      }
    },
    [
      interactionMode,
      previewViewport,
      activeVpConfig,
      updateActiveViewportCta,
      getSafeMaxScale
    ]
  )

  const drawCanvas = useCallback(
    (
      canvas: HTMLCanvasElement | null,
      sourceImg: HTMLImageElement | null,
      targetW: number,
      targetH: number,
      focal: { x: number; y: number },
      mode: 'cover' | 'contain_blur'
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

      if (mode === 'contain_blur') {
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
    []
  )

  useEffect(() => {
    if (!isOpen) return
    drawCanvas(
      desktopCanvasRef.current,
      desktopSourceImg,
      desktopTarget.width,
      desktopTarget.height,
      desktopFocal,
      desktopFitMode
    )
    drawCanvas(
      mobileCanvasRef.current,
      mobileSourceImg,
      mobileTarget.width,
      mobileTarget.height,
      mobileFocal,
      mobileFitMode
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
    mobileFocal,
    desktopFitMode,
    mobileFitMode
  ])

  // Subida independiente para Móvil o para PC (sin mezclarlos)
  const handleSelectImageForTarget = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'desktop' | 'mobile'
  ) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      if (target === 'desktop') {
        setDesktopSourceImg(img)
        setHasNewDesktopImage(true)
        setPreviewViewport('desktop')
        toast.success('Imagen de PC cargada de forma independiente')
      } else {
        setMobileSourceImg(img)
        setHasNewMobileImage(true)
        setPreviewViewport('mobile')
        toast.success('Portada Móvil cargada de forma independiente')
      }
    }
    img.src = url
  }
  const activeBtnConfig: HeroButtonItemConfig =
    editingButtonSlot === 'secondary'
      ? activeVpConfig.secondary_button || DEFAULT_SECONDARY_CTA_BUTTON
      : activeVpConfig.primary_button

  // Actualiza un botón específico (usado para textos y destinos individuales)
  const updateSpecificButton = (
    slot: 'primary' | 'secondary',
    patch: Partial<HeroButtonItemConfig>
  ) => {
    if (slot === 'primary') {
      updateActiveViewportCta({
        primary_button: { ...activeVpConfig.primary_button, ...patch }
      })
    } else {
      updateActiveViewportCta({
        secondary_button: {
          ...(activeVpConfig.secondary_button || DEFAULT_SECONDARY_CTA_BUTTON),
          ...patch
        }
      })
    }
  }

  // Actualiza el estilo visual (en modo 'both' aplica colores, bordes, fondo, escala, fuente y sombra a AMBOS botones sin pisar sus textos)
  const updateActiveButton = (patch: Partial<HeroButtonItemConfig>) => {
    if (editingButtonSlot === 'both' && activeVpConfig.secondary_button_enabled) {
      // Excluimos texto y destino para que nunca se sobreescriban entre sí en modo simultáneo
      const { text, action_type, target_product_id, ...visualStylePatch } = patch
      const currentSecondary =
        activeVpConfig.secondary_button || DEFAULT_SECONDARY_CTA_BUTTON

      updateActiveViewportCta({
        primary_button: {
          ...activeVpConfig.primary_button,
          ...patch
        },
        secondary_button: {
          ...currentSecondary,
          ...visualStylePatch
        }
      })
      return
    }

    if (editingButtonSlot === 'secondary') {
      updateSpecificButton('secondary', patch)
    } else {
      updateSpecificButton('primary', patch)
    }
  }

  const handleSelectFillStyle = (newStyle: HeroButtonFillStyle) => {
    const currentBg = activeBtnConfig.bg_color || '#FFFFFF'
    const currentText = activeBtnConfig.text_color || '#FFFFFF'
    const currentBorder = activeBtnConfig.border_color || '#FFFFFF'

    if (newStyle === 'outline_pill') {
      updateActiveButton({
        fill_style: 'outline_pill',
        bg_color: 'transparent',
        border_width:
          activeBtnConfig.border_width === '0px' ? '1px' : activeBtnConfig.border_width
      })
      return
    }

    if (newStyle === 'glass') {
      const glassBg =
        currentBg === 'transparent'
          ? 'rgba(255, 255, 255, 0.28)'
          : resolveButtonBgForStyle('glass', currentBg)

      updateActiveButton({
        fill_style: 'glass',
        bg_color: glassBg,
        border_width:
          activeBtnConfig.border_width === '0px' ? '1px' : activeBtnConfig.border_width,
        border_color:
          currentBorder === 'transparent' ? 'rgba(255, 255, 255, 0.45)' : currentBorder
      })
      return
    }

    if (newStyle === 'solid') {
      const solidColor =
        currentBg === 'transparent' ? '#FFFFFF' : applyColorOpacity(currentBg, 1)

      const isWhiteBg =
        solidColor.toUpperCase() === '#FFFFFF' || solidColor.toUpperCase() === '#FAFAFA'
      const isWhiteText =
        currentText.toUpperCase() === '#FFFFFF' || currentText.toUpperCase() === '#FAFAFA'

      updateActiveButton({
        fill_style: 'solid',
        bg_color: solidColor,
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
        bg_color: 'rgba(255, 255, 255, 0.28)',
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

      if (hasNewDesktopImage && desktopSourceImg) {
        desktopFile = await resizeImageToExactDimensions(
          desktopSourceImg,
          desktopTarget.width,
          desktopTarget.height,
          {
            mode: desktopFitMode,
            focalX: desktopFocal.x,
            focalY: desktopFocal.y,
            fileName: 'hero-desktop'
          }
        )
      }

      // En móvil guardamos la proporción completa (1080x1350) cuando se sube una imagen nueva
      // para que cambiar entre 9:10, 4:5, 1:1 o 3:2 jamás recorte ni pierda partes de la foto
      if (hasNewMobileImage && mobileSourceImg) {
        mobileFile = await resizeImageToExactDimensions(
          mobileSourceImg,
          1080,
          1350,
          {
            mode: mobileFitMode,
            focalX: mobileFocal.x,
            focalY: mobileFocal.y,
            fileName: 'hero-mobile'
          }
        )
      }

      const finalMobileCfg: HeroViewportCtaConfig = {
        ...(ctaConfig.mobile || ctaConfig),
        description_text: hasDescriptionMobile
          ? ctaConfig.mobile?.description_text || ''
          : ''
      }

      const finalDesktopCfg: HeroViewportCtaConfig = {
        ...(ctaConfig.desktop || ctaConfig),
        description_text: hasDescriptionDesktop
          ? ctaConfig.desktop?.description_text || ''
          : ''
      }

      const finalCta: HeroCtaConfig = {
        ...finalMobileCfg,
        mobile_banner_ratio: ctaConfig.mobile_banner_ratio || 'aspect-[9/10]',
        mobile_focal_x: mobileFocal.x,
        mobile_focal_y: mobileFocal.y,
        desktop_focal_x: desktopFocal.x,
        desktop_focal_y: desktopFocal.y,
        mobile: finalMobileCfg,
        desktop: finalDesktopCfg
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
  const renderPreviewButton = (
    btn: HeroButtonItemConfig,
    vpCfg: HeroViewportCtaConfig,
    isMob: boolean
  ) => {
    const maxAllowed = getSafeMaxScale(vpCfg, isMob)
    const scale = Math.min(maxAllowed, Math.max(0.65, Number(btn.scale || 1)))
    const hasTwoInRow =
      vpCfg.secondary_button_enabled && (vpCfg.buttons_layout || 'row') === 'row'

    const basePadX = isMob && hasTwoInRow ? 13 : isMob ? 18 : 22
    const basePadY = isMob && hasTwoInRow ? 7.5 : isMob ? 9.5 : 10.5
    const baseFont = isMob && hasTwoInRow ? 10.5 : 12

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
            textShadow: btn.shadow !== 'none' ? `0 2px 8px ${sColor}` : 'none',
            fontSize: `${Number((baseFont * scale).toFixed(1))}px`
          }}
          className="inline-flex items-center gap-1.5 pb-1 border-b font-medium tracking-wider uppercase select-none whitespace-nowrap"
        >
          <span>{btn.text || 'Comprar Ahora'}</span>
          <ArrowRight size={Math.round(13 * scale)} strokeWidth={1.75} />
        </span>
      )
    }

    const resolvedBg = resolveButtonBgForStyle(btn.fill_style, btn.bg_color)

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
          paddingLeft: `${Math.round(basePadX * scale)}px`,
          paddingRight: `${Math.round(basePadX * scale)}px`,
          paddingTop: `${Math.round(basePadY * scale)}px`,
          paddingBottom: `${Math.round(basePadY * scale)}px`,
          fontSize: `${Number((baseFont * scale).toFixed(1))}px`,
          backdropFilter:
            btn.fill_style === 'glass' ? 'blur(14px) saturate(160%)' : undefined,
          WebkitBackdropFilter:
            btn.fill_style === 'glass' ? 'blur(14px) saturate(160%)' : undefined
        }}
        className={`inline-flex items-center justify-center gap-1.5 font-medium tracking-wide leading-none transition-all select-none whitespace-nowrap ${radiusClass}`}
      >
        <span>{btn.text || 'Comprar Ahora'}</span>
      </span>
    )
  }

  const renderDraggableStageOverlay = (
    vpCfg: HeroViewportCtaConfig,
    showDesc: boolean,
    isMobileStage: boolean
  ) => {
    if (!vpCfg.enabled) return null

    const posX = Math.max(8, Math.min(92, typeof vpCfg.pos_x === 'number' ? vpCfg.pos_x : 50))
    const posY = Math.max(10, Math.min(90, typeof vpCfg.pos_y === 'number' ? vpCfg.pos_y : 78))
    const isStacked = vpCfg.buttons_layout === 'column'

    const textAlignClass =
      posX > 64 ? 'items-end text-right' : posX >= 36 ? 'items-center text-center' : 'items-start text-left'

    const buttonsAlignClass = isStacked
      ? posX > 64
        ? 'flex-col items-end'
        : posX >= 36
          ? 'flex-col items-center'
          : 'flex-col items-start'
      : posX > 64
        ? 'flex-row flex-nowrap items-center justify-end'
        : posX >= 36
          ? 'flex-row flex-nowrap items-center justify-center'
          : 'flex-row flex-nowrap items-center justify-start'

    const sColor = vpCfg.description_shadow_color || 'rgba(0,0,0,0.55)'
    const textShadow =
      vpCfg.description_shadow === 'crisp'
        ? `0 2px 12px ${sColor}, 0 1px 3px ${sColor}`
        : vpCfg.description_shadow === 'subtle'
          ? `0 1px 6px ${sColor}`
          : 'none'

    const hudPositionClass = posY < 22 ? '-bottom-9' : '-top-9'

    return (
      <div className="@container absolute inset-0 z-20 pointer-events-none overflow-hidden">
        {/* Guías magnéticas al pasar por el centro */}
        {interactionMode === 'move' && posX === 50 && (
          <div className="absolute inset-y-0 left-1/2 w-px border-l border-dashed border-white/80 pointer-events-none" />
        )}
        {interactionMode === 'move' && posY === 50 && (
          <div className="absolute inset-x-0 top-1/2 h-px border-t border-dashed border-white/80 pointer-events-none" />
        )}

        {/* CAJA CON COORDENADAS IDÉNTICAS A STOREHEADER (inset-0 + translate(-50%, -50%) + 0px padding) */}
        <div
          onPointerDown={(e) => startBoxInteraction(e, 'move')}
          onPointerUp={(e) => {
            e.stopPropagation()
            setInteractionMode(null)
          }}
          style={{
            left: `${posX}%`,
            top: `${posY}%`,
            transform: 'translate(-50%, -50%)',
            touchAction: 'none'
          }}
          className={`pointer-events-auto absolute w-max max-w-[94cqw] flex flex-col ${textAlignClass} gap-2 cursor-grab active:cursor-grabbing`}
        >
          {/* MARCO PUNTEADO FLOTANTE (No altera en 0px el tamaño ni el margen inferior real) */}
          <div
            className={`absolute -inset-2 rounded-2xl border border-dashed pointer-events-none transition-colors ${interactionMode
                ? 'border-white bg-black/15'
                : 'border-white/85'
              }`}
          />

          {/* BARRA FLOTANTE EXTERNA */}
          <div
            className={`absolute ${hudPositionClass} left-1/2 -translate-x-1/2 flex items-center gap-1 whitespace-nowrap z-30`}
          >
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-950/90 text-white text-[8px] font-mono uppercase tracking-wider border border-white/20 pointer-events-none">
              <Move size={9} /> Arrastrar
            </span>

            {vpCfg.secondary_button_enabled && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  updateActiveViewportCta({
                    buttons_layout: isStacked ? 'row' : 'column'
                  })
                }}
                className="px-2 py-0.5 rounded-full bg-white text-neutral-950 text-[8px] font-mono font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer border border-neutral-300"
              >
                {isStacked ? '↕ Apilados (Pasar a ↔)' : '↔ En Fila (Pasar a ↕)'}
              </button>
            )}
          </div>

          {showDesc &&
            vpCfg.description_text &&
            vpCfg.description_text.trim().length > 0 && (
              <p
                style={{
                  fontFamily: vpCfg.description_font,
                  color: vpCfg.description_color || '#FFFFFF',
                  textShadow
                }}
                className={`relative z-10 font-normal leading-relaxed select-none max-w-[86cqw] sm:max-w-md whitespace-normal ${isMobileStage
                    ? vpCfg.description_size === 'lg'
                      ? 'text-base'
                      : vpCfg.description_size === 'sm'
                        ? 'text-[11px]'
                        : 'text-xs'
                    : vpCfg.description_size === 'lg'
                      ? 'text-base sm:text-xl'
                      : vpCfg.description_size === 'sm'
                        ? 'text-xs'
                        : 'text-sm sm:text-base'
                  }`}
              >
                {vpCfg.description_text}
              </p>
            )}

          <div className={`relative z-10 flex gap-2 sm:gap-2.5 items-center justify-center ${buttonsAlignClass}`}>
            {renderPreviewButton(vpCfg.primary_button, vpCfg, isMobileStage)}
            {vpCfg.secondary_button_enabled &&
              vpCfg.secondary_button &&
              renderPreviewButton(vpCfg.secondary_button, vpCfg, isMobileStage)}
          </div>

          {/* 4 NODOS DE ESQUINA */}
          <div
            onPointerDown={(e) => startBoxInteraction(e, 'scale_nw')}
            onPointerUp={(e) => {
              e.stopPropagation()
              setInteractionMode(null)
            }}
            className="absolute -top-3.5 -left-3.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-neutral-950 cursor-nwse-resize hover:scale-125 transition-transform z-30"
          />
          <div
            onPointerDown={(e) => startBoxInteraction(e, 'scale_ne')}
            onPointerUp={(e) => {
              e.stopPropagation()
              setInteractionMode(null)
            }}
            className="absolute -top-3.5 -right-3.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-neutral-950 cursor-nesw-resize hover:scale-125 transition-transform z-30"
          />
          <div
            onPointerDown={(e) => startBoxInteraction(e, 'scale_sw')}
            onPointerUp={(e) => {
              e.stopPropagation()
              setInteractionMode(null)
            }}
            className="absolute -bottom-3.5 -left-3.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-neutral-950 cursor-nesw-resize hover:scale-125 transition-transform z-30"
          />
          <div
            onPointerDown={(e) => startBoxInteraction(e, 'scale_se')}
            onPointerUp={(e) => {
              e.stopPropagation()
              setInteractionMode(null)
            }}
            className="absolute -bottom-3.5 -right-3.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-neutral-950 cursor-nwse-resize hover:scale-125 transition-transform z-30"
          />

          {/* TIRADORES LATERALES E INFERIOR */}
          {vpCfg.secondary_button_enabled && (
            <>
              <div
                onPointerDown={(e) => startBoxInteraction(e, 'stretch_x_left')}
                onPointerUp={(e) => {
                  e.stopPropagation()
                  setInteractionMode(null)
                }}
                className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-2 h-6 rounded-full bg-white border border-neutral-900 cursor-ew-resize hover:scale-110 transition-transform z-20"
              />
              <div
                onPointerDown={(e) => startBoxInteraction(e, 'stretch_x_right')}
                onPointerUp={(e) => {
                  e.stopPropagation()
                  setInteractionMode(null)
                }}
                className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-2 h-6 rounded-full bg-white border border-neutral-900 cursor-ew-resize hover:scale-110 transition-transform z-20"
              />
              <div
                onPointerDown={(e) => startBoxInteraction(e, 'stretch_y')}
                onPointerUp={(e) => {
                  e.stopPropagation()
                  setInteractionMode(null)
                }}
                className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 h-2 w-6 rounded-full bg-white border border-neutral-900 cursor-ns-resize hover:scale-110 transition-transform z-20"
              />
            </>
          )}
        </div>
      </div>
    )
  }

  const activeFocal = previewViewport === 'desktop' ? desktopFocal : mobileFocal
  const setActiveFocal = previewViewport === 'desktop' ? setDesktopFocal : setMobileFocal
  const activeFitMode = previewViewport === 'desktop' ? desktopFitMode : mobileFitMode
  const setActiveFitMode =
    previewViewport === 'desktop' ? setDesktopFitMode : setMobileFitMode

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
              COLUMNA IZQUIERDA: CONTROLES INDEPENDIENTES POR DISPOSITIVO
          ================================================================ */}
          <div className="w-full lg:w-[440px] xl:w-[470px] border-b lg:border-b-0 lg:border-r border-neutral-200/80 flex flex-col h-full bg-white shrink-0 overflow-hidden">
            {/* Cabecera con Selector de Dispositivo Independiente */}
            <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between gap-2 shrink-0">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-900">
                  Editor de Portada ({previewViewport === 'mobile' ? 'Móvil' : 'PC'})
                </h2>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Móvil y PC son independientes entre sí.
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewViewport('mobile')}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase border transition-colors flex items-center gap-1 cursor-pointer ${previewViewport === 'mobile'
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 bg-white text-neutral-600'
                    }`}
                >
                  <Smartphone size={11} /> Móvil
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('desktop')}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase border transition-colors flex items-center gap-1 cursor-pointer ${previewViewport === 'desktop'
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 bg-white text-neutral-600'
                    }`}
                >
                  <Monitor size={11} /> PC
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 rounded-full border border-neutral-200/80 hover:border-neutral-900 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer ml-1"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Pestañas */}
            <div className="px-5 py-2.5 border-b border-neutral-100 grid grid-cols-3 gap-1.5 shrink-0 bg-neutral-50/40">
              <button
                type="button"
                onClick={() => setActiveTab('cta_builder')}
                className={`py-2 px-2.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'cta_builder'
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200/90 bg-white text-neutral-600 hover:border-neutral-400'
                  }`}
              >
                <MousePointerClick size={12} /> 1. Botones
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('smart_resizer')}
                className={`py-2 px-2.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'smart_resizer'
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200/90 bg-white text-neutral-600 hover:border-neutral-400'
                  }`}
              >
                <Crop size={12} /> 2. Encuadre
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ai_generator')}
                className={`py-2 px-2.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-colors cursor-pointer flex items-center justify-center gap-1 ${activeTab === 'ai_generator'
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200/90 bg-white text-neutral-400 hover:border-neutral-300'
                  }`}
              >
                <Sparkles size={11} /> 3. IA
              </button>
            </div>

            {/* Cuerpo de Controles */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 no-scrollbar">
              {activeTab === 'cta_builder' && (
                <div className="space-y-5">
                  {/* Switch de Activación independiente para el dispositivo actual */}
                  <div className="p-3.5 rounded-xl border border-neutral-200/80 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-900">
                        Botones en Portada ({previewViewport === 'mobile' ? 'Móvil' : 'PC'})
                      </h4>
                      <p className="text-[10px] text-neutral-500 mt-0.5">
                        Arrastra el botón en la vista previa para moverlo libremente.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveViewportCta({ enabled: !activeVpConfig.enabled })
                      }
                      className={`px-3.5 py-1.5 rounded-full text-[10px] font-mono font-semibold uppercase border transition-colors cursor-pointer shrink-0 ${activeVpConfig.enabled
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 bg-transparent text-neutral-500 hover:border-neutral-400'
                        }`}
                    >
                      {activeVpConfig.enabled ? 'Visible' : 'Oculto'}
                    </button>
                  </div>

                  {activeVpConfig.enabled && (
                    <>

                    {/* 1. ASISTENCIA DE CENTRADO REVERSIBLE (Tocar de nuevo desactiva el centrado) */}
                      <div className="p-3.5 rounded-xl border border-neutral-200/80 bg-neutral-50/40 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Move size={13} className="text-neutral-500 shrink-0" />
                          <span className="text-[11px] font-medium text-neutral-700 truncate">
                            Arrastra el recuadro en la imagen
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const isCurrentlyCenteredX = (activeVpConfig.pos_x ?? 50) === 50
                              updateActiveViewportCta({
                                pos_x: isCurrentlyCenteredX ? 28 : 50,
                                alignment: isCurrentlyCenteredX ? 'left' : 'center'
                              })
                            }}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors cursor-pointer ${
                              (activeVpConfig.pos_x ?? 50) === 50
                                ? 'border-neutral-900 bg-neutral-900 text-white'
                                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-900'
                            }`}
                            title="Toca para centrar horizontalmente o vuelve a tocar para desactivar"
                          >
                            Centrar ↔
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const isCurrentlyMiddleY = (activeVpConfig.pos_y ?? 78) === 50
                              updateActiveViewportCta({
                                pos_y: isCurrentlyMiddleY ? 78 : 50
                              })
                            }}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors cursor-pointer ${
                              (activeVpConfig.pos_y ?? 78) === 50
                                ? 'border-neutral-900 bg-neutral-900 text-white'
                                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-900'
                            }`}
                            title="Toca para poner en el medio o vuelve a tocar para bajarlo"
                          >
                            Medio ↕
                          </button>
                        </div>
                      </div>
                      {/* 2. CONFIGURACIÓN Y TAMAÑO DEL BOTÓN (INDIVIDUAL O SIMULTÁNEO) */}
                      <div className="p-4 rounded-xl border border-neutral-200/80 space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-neutral-900">
                            Diseño y Tamaño de Botones
                          </span>

                          {!activeVpConfig.secondary_button_enabled ? (
                            <button
                              type="button"
                              onClick={() => {
                                updateActiveViewportCta({
                                  secondary_button_enabled: true
                                })
                                setEditingButtonSlot('both')
                              }}
                              className="px-3 py-1 rounded-full border border-neutral-200 hover:border-neutral-900 text-[10px] font-medium text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Plus size={11} /> Añadir 2do Botón
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                updateActiveViewportCta({
                                  secondary_button_enabled: false
                                })
                                setEditingButtonSlot('primary')
                              }}
                              className="px-2.5 py-1 rounded-full border border-neutral-200 hover:border-rose-600 text-[10px] font-medium text-neutral-500 hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 size={11} /> Quitar 2do Botón
                            </button>
                          )}


                        </div>

                        {activeVpConfig.secondary_button_enabled && (
                          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-2">
                            <label className="text-[10px] font-semibold text-neutral-800 block">
                              Disposición de los 2 botones
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  updateActiveViewportCta({ buttons_layout: 'row' })
                                }
                                className={`py-2 px-2.5 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${(activeVpConfig.buttons_layout || 'row') === 'row'
                                  ? 'border-neutral-900 bg-neutral-900 text-white'
                                  : 'border-neutral-200 bg-white text-neutral-600'
                                  }`}
                              >
                                ↔ Uno al lado del otro
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateActiveViewportCta({ buttons_layout: 'column' })
                                }
                                className={`py-2 px-2.5 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${activeVpConfig.buttons_layout === 'column'
                                  ? 'border-neutral-900 bg-neutral-900 text-white'
                                  : 'border-neutral-200 bg-white text-neutral-600'
                                  }`}
                              >
                                ↕ Uno encima del otro
                              </button>
                            </div>
                            <p className="text-[9.5px] text-neutral-500 leading-snug">
                              💡 <strong>Tip en el lienzo:</strong> También puedes achicar el tirador lateral <strong>↔</strong> o estirar hacia abajo el tirador <strong>↕</strong> del recuadro guiador para apilarlos automáticamente.
                            </p>
                          </div>
                        )}


                        {/* Conmutador de 3 Modos: Botón 1 | Botón 2 | Ambos a la vez */}
                        {activeVpConfig.secondary_button_enabled && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-medium text-neutral-500 block">
                              ¿Qué botón deseas estilizar?
                            </label>
                            <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-100 rounded-full">
                              <button
                                type="button"
                                onClick={() => setEditingButtonSlot('primary')}
                                className={`py-1.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${editingButtonSlot === 'primary'
                                  ? 'bg-neutral-900 text-white'
                                  : 'text-neutral-500 hover:text-neutral-900'
                                  }`}
                              >
                                Solo Botón 1
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingButtonSlot('secondary')}
                                className={`py-1.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${editingButtonSlot === 'secondary'
                                  ? 'bg-neutral-900 text-white'
                                  : 'text-neutral-500 hover:text-neutral-900'
                                  }`}
                              >
                                Solo Botón 2
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingButtonSlot('both')}
                                className={`py-1.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${editingButtonSlot === 'both'
                                  ? 'bg-neutral-900 text-white'
                                  : 'text-neutral-500 hover:text-neutral-900'
                                  }`}
                              >
                                Ambos a la vez
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Control para AGRANDAR O ACHICAR EL BOTÓN (Aplica a 1 o a Ambos según selección) */}
                        <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-semibold text-neutral-800">
                              Tamaño {editingButtonSlot === 'both' && activeVpConfig.secondary_button_enabled ? 'de Ambos Botones' : 'del Botón'} ({Math.round(Number(activeBtnConfig.scale || 1) * 100)}%)
                            </label>
                            <div className="flex items-center gap-1">
                              {[
                                { label: 'S', val: 0.85 },
                                { label: 'M', val: 1.0 },
                                { label: 'L', val: 1.2 },
                                { label: 'XL', val: 1.4 },
                                { label: 'XXL', val: 1.6 }
                              ].map((sz) => (
                                <button
                                  key={sz.label}
                                  type="button"
                                  onClick={() => updateActiveButton({ scale: sz.val })}
                                  className={`px-2 py-0.5 rounded text-[9px] font-mono font-semibold border cursor-pointer ${Math.abs(Number(activeBtnConfig.scale || 1) - sz.val) < 0.05
                                    ? 'border-neutral-900 bg-neutral-900 text-white'
                                    : 'border-neutral-200 bg-white text-neutral-600'
                                    }`}
                                >
                                  {sz.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <input
                            type="range"
                            min={65}
                            max={165}
                            step={5}
                            value={Math.round(Number(activeBtnConfig.scale || 1) * 100)}
                            onChange={(e) =>
                              updateActiveButton({ scale: Number(e.target.value) / 100 })
                            }
                            className="w-full accent-neutral-900 cursor-pointer"
                          />
                        </div>

                        {/* Textos y Destinos (Siempre independientes para cada botón) */}
                        {editingButtonSlot === 'both' && activeVpConfig.secondary_button_enabled ? (
                          <div className="space-y-3 pt-1">
                            {/* Texto y Destino del Botón 1 */}
                            <div className="p-3 rounded-xl border border-neutral-200/80 bg-neutral-50/40 space-y-2.5">
                              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-500 block">
                                Texto y Destino — Botón 1
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <input
                                  type="text"
                                  maxLength={28}
                                  value={activeVpConfig.primary_button.text}
                                  onChange={(e) =>
                                    updateSpecificButton('primary', { text: e.target.value })
                                  }
                                  placeholder="Comprar Ahora"
                                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 outline-none focus:border-neutral-900"
                                />
                                <select
                                  value={activeVpConfig.primary_button.action_type}
                                  onChange={(e) =>
                                    updateSpecificButton('primary', {
                                      action_type: e.target.value as 'catalog' | 'product'
                                    })
                                  }
                                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 outline-none focus:border-neutral-900"
                                >
                                  <option value="catalog">Ir a los productos</option>
                                  <option value="product">Abrir un producto</option>
                                </select>
                              </div>
                              {activeVpConfig.primary_button.action_type === 'product' && (
                                <select
                                  value={String(activeVpConfig.primary_button.target_product_id || '')}
                                  onChange={(e) =>
                                    updateSpecificButton('primary', {
                                      target_product_id: e.target.value || null
                                    })
                                  }
                                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 outline-none focus:border-neutral-900"
                                >
                                  <option value="">Selecciona el producto para Botón 1...</option>
                                  {storeProducts.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>

                            {/* Texto y Destino del Botón 2 */}
                            <div className="p-3 rounded-xl border border-neutral-200/80 bg-neutral-50/40 space-y-2.5">
                              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-500 block">
                                Texto y Destino — Botón 2
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <input
                                  type="text"
                                  maxLength={28}
                                  value={
                                    (activeVpConfig.secondary_button || DEFAULT_SECONDARY_CTA_BUTTON)
                                      .text
                                  }
                                  onChange={(e) =>
                                    updateSpecificButton('secondary', { text: e.target.value })
                                  }
                                  placeholder="Ver Destacado"
                                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 outline-none focus:border-neutral-900"
                                />
                                <select
                                  value={
                                    (activeVpConfig.secondary_button || DEFAULT_SECONDARY_CTA_BUTTON)
                                      .action_type
                                  }
                                  onChange={(e) =>
                                    updateSpecificButton('secondary', {
                                      action_type: e.target.value as 'catalog' | 'product'
                                    })
                                  }
                                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 outline-none focus:border-neutral-900"
                                >
                                  <option value="catalog">Ir a los productos</option>
                                  <option value="product">Abrir un producto</option>
                                </select>
                              </div>
                              {(activeVpConfig.secondary_button || DEFAULT_SECONDARY_CTA_BUTTON)
                                .action_type === 'product' && (
                                  <select
                                    value={String(
                                      (activeVpConfig.secondary_button || DEFAULT_SECONDARY_CTA_BUTTON)
                                        .target_product_id || ''
                                    )}
                                    onChange={(e) =>
                                      updateSpecificButton('secondary', {
                                        target_product_id: e.target.value || null
                                      })
                                    }
                                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 outline-none focus:border-neutral-900"
                                  >
                                    <option value="">Selecciona el producto para Botón 2...</option>
                                    {storeProducts.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name}
                                      </option>
                                    ))}
                                  </select>
                                )}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-medium text-neutral-500 block mb-1">
                                  Texto del {editingButtonSlot === 'secondary' ? 'Botón 2' : 'Botón 1'}
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
                          </>
                        )}

                        {/* Preajustes Visuales en 1 Clic */}
                        <div className="space-y-2 pt-1">
                          <label className="text-[10px] font-medium text-neutral-500 block">
                            Preajustes visuales en 1 clic
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => applyQuickButtonPreset('white_pill')}
                              className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-500 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                            >
                              <span className="px-3 py-1 rounded-full border border-white text-white text-[10px] font-medium">
                                Sin Fondo Bco
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => applyQuickButtonPreset('dark_pill')}
                              className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 hover:border-neutral-900 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                            >
                              <span className="px-3 py-1 rounded-full border border-neutral-900 text-neutral-900 text-[10px] font-medium">
                                Sin Fondo Neg
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => applyQuickButtonPreset('frost_glass')}
                              className="p-2.5 rounded-xl bg-[linear-gradient(135deg,#27272a_0%,#52525b_100%)] border border-neutral-300 hover:border-neutral-900 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                            >
                              <span className="px-3 py-1 rounded-full border border-white/60 bg-white/25 backdrop-blur-md text-white text-[10px] font-medium">
                                Cristal Blur
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => applyQuickButtonPreset('solid_white')}
                              className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-500 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                            >
                              <span className="px-3 py-1 rounded-full bg-white text-neutral-950 text-[10px] font-semibold">
                                Blanco Sólido
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => applyQuickButtonPreset('solid_dark')}
                              className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 hover:border-neutral-900 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                            >
                              <span className="px-3 py-1 rounded-full bg-neutral-950 text-white text-[10px] font-semibold">
                                Negro Sólido
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Acabado del Botón */}
                        <div className="space-y-2 pt-2">
                          <label className="text-[10px] font-medium text-neutral-500 block">
                            Tipo de acabado del botón
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleSelectFillStyle('outline_pill')}
                              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${activeBtnConfig.fill_style === 'outline_pill'
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

                            <button
                              type="button"
                              onClick={() => handleSelectFillStyle('glass')}
                              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${activeBtnConfig.fill_style === 'glass'
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

                            <button
                              type="button"
                              onClick={() => handleSelectFillStyle('solid')}
                              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${activeBtnConfig.fill_style === 'solid'
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

                            <button
                              type="button"
                              onClick={() => handleSelectFillStyle('minimal_underline')}
                              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${activeBtnConfig.fill_style === 'minimal_underline'
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

                        {/* Pickers de Color Directos (Siempre visibles cuando es Cristal o Sólido) */}
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
                              description="Color de la línea que rodea el botón."
                              enableAlpha={true}
                              onChange={(val) => updateActiveButton({ border_color: val })}
                            />
                          )}

                          {(activeBtnConfig.fill_style === 'solid' ||
                            activeBtnConfig.fill_style === 'glass') && (
                              <EliteColorPicker
                                label={
                                  activeBtnConfig.fill_style === 'glass'
                                    ? 'Color del Cristal (Ej: Cristal Rojizo)'
                                    : 'Color de Fondo Sólido'
                                }
                                value={activeBtnConfig.bg_color}
                                description={
                                  activeBtnConfig.fill_style === 'glass'
                                    ? 'Conserva tu color elegido con efecto cristal translúcido.'
                                    : 'Color de relleno 100% sólido.'
                                }
                                enableAlpha={activeBtnConfig.fill_style === 'glass'}
                                onChange={(val) =>
                                  updateActiveButton({
                                    bg_color:
                                      activeBtnConfig.fill_style === 'glass'
                                        ? resolveButtonBgForStyle('glass', val)
                                        : applyColorOpacity(val, 1)
                                  })
                                }
                              />
                            )}
                        </div>

                        {/* Acordeón de Forma, Bordes, Sombra y Tipografía */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setShowAdvancedBtnStyle(!showAdvancedBtnStyle)}
                            className="w-full py-2 px-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/70 flex items-center justify-between text-[11px] font-semibold text-neutral-800 cursor-pointer transition-colors"
                          >
                            <span>Forma de esquinas, grosor, sombra y fuente</span>
                            {showAdvancedBtnStyle ? (
                              <ChevronUp size={15} />
                            ) : (
                              <ChevronDown size={15} />
                            )}
                          </button>

                          {showAdvancedBtnStyle && (
                            <div className="space-y-5 pt-4">
                              {/* Esquinas */}
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
                                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${isSel
                                          ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                                          : 'border-neutral-200 bg-white hover:border-neutral-400'
                                          }`}
                                      >
                                        <span
                                          style={{ borderRadius: item.radius }}
                                          className={`w-full py-1.5 border text-[10px] font-medium text-center ${isSel
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

                              {/* Grosor del borde */}
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
                                        className={`p-2 rounded-xl border flex flex-col items-center justify-between gap-2 h-16 transition-all cursor-pointer ${isSel
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

                              {/* Sombra y Color de Sombra */}
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
                                        className={`p-3 rounded-xl border flex flex-col items-center gap-2.5 transition-all cursor-pointer ${isSel
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

                                {activeBtnConfig.shadow !== 'none' && (
                                  <EliteColorPicker
                                    label="Color de la Sombra del Botón"
                                    value={
                                      activeBtnConfig.shadow_color || 'rgba(0, 0, 0, 0.35)'
                                    }
                                    description="Color del resplandor o sombra detrás del botón."
                                    enableAlpha={true}
                                    onChange={(val) =>
                                      updateActiveButton({ shadow_color: val })
                                    }
                                  />
                                )}
                              </div>

                              {/* Tipografía del botón */}
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
                                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${isSel
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
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3. DESCRIPCIÓN OPCIONAL INDEPENDIENTE POR DISPOSITIVO */}
                      <div className="p-4 rounded-xl border border-neutral-200/80 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Type size={13} className="text-neutral-500" />
                            <span className="text-[11px] font-semibold text-neutral-900">
                              Descripción ({previewViewport === 'mobile' ? 'Móvil' : 'PC'})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setHasDescription(!hasDescription)}
                            className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase border transition-colors cursor-pointer ${hasDescription
                              ? 'border-neutral-900 bg-neutral-900 text-white'
                              : 'border-neutral-200 text-neutral-500 bg-transparent'
                              }`}
                          >
                            {hasDescription ? 'Visible' : 'Oculta'}
                          </button>
                        </div>

                        {hasDescription && (
                          <div className="space-y-4 pt-1">
                            <textarea
                              rows={2}
                              maxLength={120}
                              value={activeVpConfig.description_text || ''}
                              onChange={(e) =>
                                updateActiveViewportCta({
                                  description_text: e.target.value
                                })
                              }
                              placeholder="Escribe una breve descripción sobre el botón..."
                              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 outline-none resize-none"
                            />

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-medium text-neutral-500 block">
                                Tipografía de la descripción
                              </label>
                              <div className="grid grid-cols-2 gap-1.5">
                                {HERO_FONT_OPTIONS.map((f) => {
                                  const isSel = activeVpConfig.description_font === f.value
                                  return (
                                    <button
                                      key={f.value}
                                      type="button"
                                      onClick={() =>
                                        updateActiveViewportCta({
                                          description_font: f.value
                                        })
                                      }
                                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${isSel
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
                                        updateActiveViewportCta({
                                          description_size: sz.id
                                        })
                                      }
                                      className={`h-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${sz.sizeClass
                                        } ${activeVpConfig.description_size === sz.id
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
                                        updateActiveViewportCta({
                                          description_shadow: sh.id
                                        })
                                      }
                                      className={`h-9 rounded-lg text-[10px] font-medium border transition-colors cursor-pointer ${activeVpConfig.description_shadow === sh.id
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
                              value={activeVpConfig.description_color || '#FFFFFF'}
                              description="Color de la frase sobre la portada."
                              onChange={(val) =>
                                updateActiveViewportCta({ description_color: val })
                              }
                            />

                            {activeVpConfig.description_shadow &&
                              activeVpConfig.description_shadow !== 'none' && (
                                <EliteColorPicker
                                  label="Color de la Sombra del Texto"
                                  value={
                                    activeVpConfig.description_shadow_color ||
                                    'rgba(0, 0, 0, 0.55)'
                                  }
                                  description="Color del sombreado detrás de las letras."
                                  enableAlpha={true}
                                  onChange={(val) =>
                                    updateActiveViewportCta({
                                      description_shadow_color: val
                                    })
                                  }
                                />
                              )}
                          </div>
                        )}
                      </div>

                      {/* Botón Opcional para Clonar Diseño al otro Dispositivo */}
                      <button
                        type="button"
                        onClick={handleCopyConfigToOtherViewport}
                        className="w-full py-2 px-3 rounded-full border border-neutral-200 hover:border-neutral-900 text-[10px] font-medium text-neutral-600 hover:text-neutral-900 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Copy size={11} />
                        <span>
                          Copiar este diseño de botones a{' '}
                          {previewViewport === 'mobile' ? 'PC (Escritorio)' : 'Móvil'}
                        </span>
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* ============================================================
                  SECCIÓN 2: ENCUADRE Y ALTURA DE PORTADA INDEPENDIENTE
              ============================================================ */}
              {activeTab === 'smart_resizer' && (
                <div className="space-y-5">
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

                  {/* Subida estrictamente separada para Móvil vs PC */}
                  <div className="p-4 rounded-xl border border-neutral-200/80 space-y-2.5">
                    <label className="text-[11px] font-semibold text-neutral-900 block">
                      1. Subir fotografía solo para{' '}
                      {previewViewport === 'mobile' ? 'Portada Móvil' : 'Banner PC'}
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
                        Elegir imagen para {previewViewport === 'mobile' ? 'Móvil' : 'PC'}
                      </span>
                    </button>
                  </div>

                  {/* Selector de Altura de Portada Móvil */}
                  {previewViewport === 'mobile' && (
                    <div className="p-4 rounded-xl border border-neutral-200/80 space-y-2.5">
                      <label className="text-[11px] font-semibold text-neutral-900 block">
                        2. Altura de la Portada Móvil
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {MOBILE_RATIO_OPTIONS.map((opt) => {
                          const isSel =
                            (ctaConfig.mobile_banner_ratio || 'aspect-[9/10]') === opt.id
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                setCtaConfig((prev) => ({
                                  ...prev,
                                  mobile_banner_ratio: opt.id
                                }))
                              }
                              className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${isSel
                                ? 'border-neutral-900 bg-neutral-900 text-white'
                                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                                }`}
                            >
                              <p className="text-[11px] font-semibold">{opt.label}</p>
                              <p className="text-[9px] opacity-75 mt-0.5 leading-snug">
                                {opt.desc}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Modo de Ajuste y Posición */}
                  <div className="p-4 rounded-xl border border-neutral-200/80 space-y-4">
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-900 block mb-2">
                        ¿Cómo deseas encuadrar la imagen en{' '}
                        {previewViewport === 'mobile' ? 'Móvil' : 'PC'}?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveFitMode('cover')}
                          className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${activeFitMode === 'cover'
                            ? 'border-neutral-900 bg-neutral-900 text-white'
                            : 'border-neutral-200 bg-white text-neutral-700'
                            }`}
                        >
                          <p className="text-[11px] font-semibold">Llenar Lienzo</p>
                          <p className="text-[9px] opacity-75 mt-0.5">Sin bordes sobrantes</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveFitMode('contain_blur')}
                          className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${activeFitMode === 'contain_blur'
                            ? 'border-neutral-900 bg-neutral-900 text-white'
                            : 'border-neutral-200 bg-white text-neutral-700'
                            }`}
                        >
                          <p className="text-[11px] font-semibold">Sin Recortar Nada</p>
                          <p className="text-[9px] opacity-75 mt-0.5">
                            Muestra el 100% de la foto
                          </p>
                        </button>
                      </div>
                    </div>

                    {activeFitMode === 'cover' && (
                      <div className="space-y-3 pt-2 border-t border-neutral-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-neutral-900">
                            Mover foto ({previewViewport === 'mobile' ? 'Móvil' : 'PC'})
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveFocal({ x: 50, y: 50 })}
                            className="text-[10px] font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw size={10} /> Centrar
                          </button>
                        </div>

                        <div className="space-y-2.5">
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
                    Este apartado se encuentra en construcción. Muy pronto podrás generar fondos fotográficos de estudio para tus productos reales.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
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
              COLUMNA DERECHA: LIENZO INTERACTIVO CON DRAG & DROP LIBRE
          ================================================================ */}
          <div className="flex-1 bg-[#F7F7F8] flex flex-col items-center justify-between p-4 sm:p-6 overflow-y-auto relative">
            <div className="w-full flex items-center justify-between gap-2 z-20">
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 flex items-center gap-1.5">
                <Move size={12} /> Arrastra el botón sobre la imagen para ubicarlo
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewViewport('mobile')}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-colors flex items-center gap-1.5 cursor-pointer ${previewViewport === 'mobile'
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
                    }`}
                >
                  <Smartphone size={12} /> Editando Móvil
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('desktop')}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-colors flex items-center gap-1.5 cursor-pointer ${previewViewport === 'desktop'
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
                    }`}
                >
                  <Monitor size={12} /> Editando PC
                </button>
              </div>
            </div>

            <div className="my-auto w-full flex items-center justify-center py-4">
              {/* VISTA DESKTOP */}
              <div
                ref={desktopContainerRef}
                onPointerMove={handlePointerMoveOnStage}
                onPointerUp={() => setInteractionMode(null)}
                className={`${previewViewport === 'desktop' ? 'block' : 'hidden'
                  } relative w-full max-w-[860px] aspect-[16/5] rounded-xl overflow-hidden border border-neutral-200 bg-neutral-900 select-none`}
              >
                <canvas ref={desktopCanvasRef} className="w-full h-full object-cover block" />
                {renderDraggableStageOverlay(
                  ctaConfig.desktop || ctaConfig,
                  hasDescriptionDesktop,
                  false
                )}
              </div>

              {/* VISTA MÓVIL (Con proporción equilibrada 9:10 por defecto) */}
              <div
                ref={mobileContainerRef}
                onPointerMove={handlePointerMoveOnStage}
                onPointerUp={() => setInteractionMode(null)}
                className={`${previewViewport === 'mobile' ? 'block' : 'hidden'
                  } relative w-full max-w-[340px] ${ctaConfig.mobile_banner_ratio || 'aspect-[9/10]'
                  } rounded-xl overflow-hidden border border-neutral-200 bg-neutral-900 select-none`}
              >
                <canvas ref={mobileCanvasRef} className="w-full h-full object-cover block" />
                {renderDraggableStageOverlay(
                  ctaConfig.mobile || ctaConfig,
                  hasDescriptionMobile,
                  true
                )}
              </div>
            </div>

            <p className="text-[10px] font-mono text-neutral-400 text-center">
              Los ajustes en Móvil no alteran tu banner de PC y viceversa.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
