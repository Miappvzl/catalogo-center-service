// components/admin/AchievementBadgeModal.tsx
'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  X,
  Share2,
  Download,
  Award,
  Lock,
  Check,
  Sparkles,
  Smartphone,
  Square,
  MessageCircle,
  Loader2,
  ArrowLeft,
  Copy,
  ChevronRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { toast } from 'sonner'
import { getOptimizedUrl } from '@/utils/cdn'

export type BadgeThemeId =
  | 'silver_frost'
  | 'cobalt_steel'
  | 'amber_obsidian'
  | 'champagne_gold'
  | 'emerald_chrome'
  | 'royal_platinum'
  | 'imperial_sapphire'
  | 'sovereign_solar'

export interface AchievementDefinition {
  id: string
  category: 'lifetime_traffic'
  threshold: number
  metricDisplay: string
  unitLabel: string
  badgeTitle: string
  eyebrowLabel: string
  customerStoryCopy: string
  vaultDescription: string
  sculpturePath: string
  fallbackSculpturePath?: string
  themeId: BadgeThemeId
  materialLabel: string
  accentHex: string
  glowRgba: string
  cardBgStops: [string, string, string]
}

// ============================================================================
// CATÁLOGO OFICIAL DE LAS 8 INSIGNIAS DE PRESTIGIO EN PREZISO (100% ESPAÑOL)
// ============================================================================
export const PREZISO_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'visits_100',
    category: 'lifetime_traffic',
    threshold: 100,
    metricDisplay: '100',
    unitLabel: 'visitas en nuestra tienda',
    badgeTitle: 'Nuestro Primer Centenar',
    eyebrowLabel: 'LOGRO OFICIAL DE TIENDA',
    customerStoryCopy:
      'Gracias a las primeras 100 personas que entraron a conocer nuestra tienda online. Esto apenas comienza.',
    vaultDescription: 'Las primeras 100 visitas reales en tu catálogo digital.',
    sculpturePath: '/Trofeo-futurista-de-aro-y-esfera-flotante.webp',
    themeId: 'silver_frost',
    materialLabel: 'Esfera de Cristal & Plata',
    accentHex: '#E2E8F0',
    glowRgba: 'rgba(226, 232, 240, 0.25)',
    cardBgStops: ['#16181D', '#0E1014', '#08090C']
  },
  {
    id: 'visits_500',
    category: 'lifetime_traffic',
    threshold: 500,
    metricDisplay: '500',
    unitLabel: 'visitas en nuestra tienda',
    badgeTitle: 'Comunidad en Movimiento',
    eyebrowLabel: 'CRECIMIENTO COMERCIAL',
    customerStoryCopy:
      'Medio millar de visitas en nuestro catálogo digital. Gracias por acompañarnos y confiar en nuestro trabajo.',
    vaultDescription: '500 visitas acumuladas explorando tus productos.',
    sculpturePath: '/Escultura-orbital-de-discos-metálicos-y-vidrio.webp',
    themeId: 'cobalt_steel',
    materialLabel: 'Órbita de Aluminio & Vidrio',
    accentHex: '#93C5FD',
    glowRgba: 'rgba(147, 197, 253, 0.24)',
    cardBgStops: ['#121722', '#0B0E14', '#06080C']
  },
  {
    id: 'visits_1000',
    category: 'lifetime_traffic',
    threshold: 1000,
    metricDisplay: '1.000',
    unitLabel: 'visitas en nuestra tienda',
    badgeTitle: 'Nuestro Primer Millar',
    eyebrowLabel: 'HITO DE CUATRO CIFRAS',
    customerStoryCopy:
      'Superamos las 1.000 visitas en nuestra tienda oficial. Gracias por elegirnos y ser parte de este crecimiento.',
    vaultDescription: 'El hito de las 1.000 visitas en tu plataforma web.',
    sculpturePath: '/Monolito-futurista-de-vidrio-y-titanio.webp',
    themeId: 'amber_obsidian',
    materialLabel: 'Monolito de Vidrio & Titanio',
    accentHex: '#FCD34D',
    glowRgba: 'rgba(251, 191, 36, 0.24)',
    cardBgStops: ['#171310', '#0E0C0A', '#070605']
  },
  {
    id: 'visits_5000',
    category: 'lifetime_traffic',
    threshold: 5000,
    metricDisplay: '5.000',
    unitLabel: 'visitas en nuestra tienda',
    badgeTitle: 'Marca en Tendencia',
    eyebrowLabel: 'TRACCIÓN CONSOLIDADA',
    customerStoryCopy:
      'Cinco mil visitas en nuestra plataforma. Gracias por convertir nuestro catálogo en uno de sus favoritos.',
    vaultDescription: '5.000 visitas reales. Tu tienda ya es tendencia.',
    sculpturePath: '/Trofeo-Escalera-Espiral-Dorada.webp',
    themeId: 'champagne_gold',
    materialLabel: 'Espiral de Oro Champagne',
    accentHex: '#FDE68A',
    glowRgba: 'rgba(234, 179, 8, 0.25)',
    cardBgStops: ['#19150E', '#100D09', '#080604']
  },
  {
    id: 'visits_10000',
    category: 'lifetime_traffic',
    threshold: 10000,
    metricDisplay: '10.000',
    unitLabel: 'visitas en nuestra tienda',
    badgeTitle: 'Referente Comercial',
    eyebrowLabel: 'IMPACTO DE CINCO CIFRAS',
    customerStoryCopy:
      'Diez mil visitas en nuestra tienda online. Gracias a cada cliente que confía en nuestra calidad día tras día.',
    vaultDescription: '10.000 visitas verificadas en tu ecosistema digital.',
    sculpturePath: '/Emblema-cromado-con-gema-esmeralda.webp',
    themeId: 'emerald_chrome',
    materialLabel: 'Cromo & Gema Esmeralda',
    accentHex: '#6EE7B7',
    glowRgba: 'rgba(16, 185, 129, 0.26)',
    cardBgStops: ['#0B1914', '#07100D', '#040806']
  },
  {
    id: 'visits_50000',
    category: 'lifetime_traffic',
    threshold: 50000,
    metricDisplay: '50.000',
    unitLabel: 'visitas en nuestra tienda',
    badgeTitle: 'Ícono Digital Consolidado',
    eyebrowLabel: 'AUTORIDAD COMERCIAL',
    customerStoryCopy:
      'Cincuenta mil visitas en nuestra tienda oficial. Gracias por construir junto a nosotros esta historia.',
    vaultDescription: '50.000 visitas reales en tu plataforma oficial.',
    sculpturePath: '/Corona-futurista-de-obsidiana-y-cromo.webp',
    themeId: 'royal_platinum',
    materialLabel: 'Corona de Obsidiana & Cromo',
    accentHex: '#F4F4F5',
    glowRgba: 'rgba(255, 255, 255, 0.25)',
    cardBgStops: ['#18181C', '#0D0D10', '#050507']
  },
  {
    id: 'visits_200000',
    category: 'lifetime_traffic',
    threshold: 200000,
    metricDisplay: '200.000',
    unitLabel: 'visitas en nuestra tienda',
    badgeTitle: 'Dinastía Comercial',
    eyebrowLabel: 'HITO DE SEIS CIFRAS',
    customerStoryCopy:
      'Doscientas mil visitas en nuestra tienda oficial. Gracias por hacer de nuestra marca parte de su día a día.',
    vaultDescription: '200.000 visitas verificadas. Dominio nacional.',
    sculpturePath: '/Escultura-200k-zafiro-titanio.webp',
    fallbackSculpturePath: '/Obelisco-futurista-de-cristal-azul-y-metal.webp',
    themeId: 'imperial_sapphire',
    materialLabel: 'Zafiro Imperial & Titanio',
    accentHex: '#7DD3FC',
    glowRgba: 'rgba(56, 189, 248, 0.30)',
    cardBgStops: ['#0B1528', '#070D19', '#03060C']
  },
  {
    id: 'visits_500000',
    category: 'lifetime_traffic',
    threshold: 500000,
    metricDisplay: '500.000',
    unitLabel: 'visitas en nuestra tienda',
    badgeTitle: 'Leyenda Digital',
    eyebrowLabel: 'MEDIO MILLÓN DE VISITAS',
    customerStoryCopy:
      'Medio millón de visitas en nuestra plataforma oficial. Gracias a toda nuestra comunidad por hacer historia con nosotros.',
    vaultDescription: 'Medio millón de visitas. La cumbre máxima de Preziso.',
    sculpturePath: '/Escultura-500k-leyenda-solar.webp',
    fallbackSculpturePath: '/Esfera-orbital-dorada-futurista.webp',
    themeId: 'sovereign_solar',
    materialLabel: 'Aureola Solar & Obsidiana Real',
    accentHex: '#FDBA74',
    glowRgba: 'rgba(251, 146, 60, 0.30)',
    cardBgStops: ['#1C100B', '#110906', '#060302']
  }
]

interface AchievementBadgeModalProps {
  isOpen: boolean
  onClose: () => void
  store: {
    id: string
    name: string
    slug: string
    logo_url?: string | null
    phone?: string | null
    owner_whatsapp?: string | null
  }
  todayUniqueVisits: number
  monthlyUniqueVisits: number
  totalProducts: number
  initialAchievementId?: string | null
}

function drawCenteredWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ')
  let line = ''
  let currentY = y

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' '
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY)
      line = words[n] + ' '
      currentY += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line.trim(), x, currentY)
  return currentY
}

/**
 * Desvanecido radial ultra-suave para fundir la escultura 3D con el fondo
 * eliminando por completo cualquier línea o borde cuadrado superior/inferior.
 */
function createSeamlessSculptureCanvas(img: HTMLImageElement, size: number): HTMLCanvasElement {
  const off = document.createElement('canvas')
  off.width = size
  off.height = size
  const octx = off.getContext('2d')
  if (!octx) return off

  octx.imageSmoothingEnabled = true
  octx.imageSmoothingQuality = 'high'

  const scale = Math.min(size / img.width, size / img.height) * 0.94
  const dw = img.width * scale
  const dh = img.height * scale
  octx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh)

  // Máscara radial progresiva desde el 20% hasta el 45% (cero bordes rectos)
  octx.globalCompositeOperation = 'destination-in'
  const maskGrad = octx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.2,
    size / 2,
    size / 2,
    size * 0.455
  )
  maskGrad.addColorStop(0, 'rgba(0,0,0,1)')
  maskGrad.addColorStop(0.55, 'rgba(0,0,0,0.98)')
  maskGrad.addColorStop(0.78, 'rgba(0,0,0,0.65)')
  maskGrad.addColorStop(0.92, 'rgba(0,0,0,0.18)')
  maskGrad.addColorStop(1, 'rgba(0,0,0,0)')
  octx.fillStyle = maskGrad
  octx.fillRect(0, 0, size, size)

  return off
}

function analyzeLogoPixels(img: HTMLImageElement): {
  hasTransparency: boolean
  isDarkLogo: boolean
} {
  try {
    const sampleSize = 48
    const canvas = document.createElement('canvas')
    canvas.width = sampleSize
    canvas.height = sampleSize
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return { hasTransparency: false, isDarkLogo: false }

    ctx.drawImage(img, 0, 0, sampleSize, sampleSize)
    const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data

    let transparentPixels = 0
    let visiblePixels = 0
    let luminanceSum = 0
    const totalPixels = sampleSize * sampleSize

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]

      if (a < 210) {
        transparentPixels++
      }
      if (a > 50) {
        visiblePixels++
        luminanceSum += 0.299 * r + 0.587 * g + 0.114 * b
      }
    }

    const hasTransparency = transparentPixels / totalPixels > 0.08
    const avgLuminance = visiblePixels > 0 ? luminanceSum / visiblePixels : 255
    const isDarkLogo = avgLuminance < 130

    return { hasTransparency, isDarkLogo }
  } catch {
    return { hasTransparency: false, isDarkLogo: false }
  }
}

export default function AchievementBadgeModal({
  isOpen,
  onClose,
  store,
  todayUniqueVisits,
  monthlyUniqueVisits,
  initialAchievementId
}: AchievementBadgeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [viewMode, setViewMode] = useState<'vault' | 'stage'>('vault')
  const [exportFormat, setExportFormat] = useState<'story_9_16' | 'post_4_5'>('story_9_16')
  const [selectedAchId, setSelectedAchId] = useState<string>('visits_100')

  const [storeLogoImg, setStoreLogoImg] = useState<HTMLImageElement | null>(null)
  const [logoAnalysis, setLogoAnalysis] = useState<{
    hasTransparency: boolean
    isDarkLogo: boolean
  }>({ hasTransparency: false, isDarkLogo: false })

  const [sculptureImg, setSculptureImg] = useState<HTMLImageElement | null>(null)
  const [loadingSculpture, setLoadingSculpture] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [copiedStoreLink, setCopiedStoreLink] = useState(false)

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const totalRealVisits = useMemo(
    () => Math.max(monthlyUniqueVisits || 0, todayUniqueVisits || 0),
    [monthlyUniqueVisits, todayUniqueVisits]
  )

  const unlockedIds = useMemo(() => {
    const set = new Set<string>()
    PREZISO_ACHIEVEMENTS.forEach((ach) => {
      if (totalRealVisits >= ach.threshold) {
        set.add(ach.id)
      }
    })
    return set
  }, [totalRealVisits])

  const nextTargetAchievement = useMemo(() => {
    return (
      PREZISO_ACHIEVEMENTS.find((ach) => totalRealVisits < ach.threshold) ||
      PREZISO_ACHIEVEMENTS[PREZISO_ACHIEVEMENTS.length - 1]
    )
  }, [totalRealVisits])

  const progressToNextPct = useMemo(() => {
    if (!nextTargetAchievement) return 100
    const pct = Math.min(100, Math.round((totalRealVisits / nextTargetAchievement.threshold) * 100))
    return Math.max(4, pct)
  }, [totalRealVisits, nextTargetAchievement])

  const remainingVisitsToNext = useMemo(() => {
    return Math.max(0, nextTargetAchievement.threshold - totalRealVisits)
  }, [nextTargetAchievement, totalRealVisits])

  useEffect(() => {
    if (!isOpen) return
    if (initialAchievementId) {
      const found = PREZISO_ACHIEVEMENTS.find(
        (a) =>
          a.id === initialAchievementId ||
          String(a.threshold) === String(initialAchievementId)
      )
      if (found) {
        setSelectedAchId(found.id)
        setViewMode('stage')
        return
      }
    }
    setViewMode('vault')
  }, [isOpen, initialAchievementId])

  const activeAchievement = useMemo(
    () =>
      PREZISO_ACHIEVEMENTS.find((a) => a.id === selectedAchId) ||
      PREZISO_ACHIEVEMENTS[0],
    [selectedAchId]
  )

  const isSelectedUnlocked = unlockedIds.has(activeAchievement.id)

  useEffect(() => {
    if (!isOpen) return
    if (store?.logo_url) {
      const sImg = new window.Image()
      sImg.crossOrigin = 'anonymous'
      sImg.onload = () => {
        setStoreLogoImg(sImg)
        setLogoAnalysis(analyzeLogoPixels(sImg))
      }
      sImg.onerror = () => setStoreLogoImg(null)
      sImg.src = getOptimizedUrl(store.logo_url)
    } else {
      setStoreLogoImg(null)
    }
  }, [isOpen, store?.logo_url])

  // Cargar escultura 3D activa (con fallback automático si las de 200k o 500k aún no se han subido)
  useEffect(() => {
    if (!isOpen || viewMode !== 'stage') return
    setLoadingSculpture(true)
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setSculptureImg(img)
      setLoadingSculpture(false)
    }
    img.onerror = () => {
      if (activeAchievement.fallbackSculpturePath) {
        const fbImg = new window.Image()
        fbImg.crossOrigin = 'anonymous'
        fbImg.onload = () => {
          setSculptureImg(fbImg)
          setLoadingSculpture(false)
        }
        fbImg.onerror = () => {
          setSculptureImg(null)
          setLoadingSculpture(false)
        }
        fbImg.src = encodeURI(activeAchievement.fallbackSculpturePath)
      } else {
        setSculptureImg(null)
        setLoadingSculpture(false)
      }
    }
    img.src = encodeURI(activeAchievement.sculpturePath)
  }, [isOpen, viewMode, activeAchievement.sculpturePath, activeAchievement.fallbackSculpturePath])

  // ==========================================================================
  // COMPOSITOR FOTOGRÁFICO DE ESTUDIO EN CANVAS HD (1080x1920 y 1080x1350)
  // ==========================================================================
  const renderStudioCardCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const W = 1080
    const H = exportFormat === 'story_9_16' ? 1920 : 1350
    canvas.width = W
    canvas.height = H

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    const isStory = exportFormat === 'story_9_16'
    const [bgTop, bgMid, bgBot] = activeAchievement.cardBgStops

    // 1. FONDO EXTERIOR
    ctx.fillStyle = '#040406'
    ctx.fillRect(0, 0, W, H)

    const cardMargin = isStory ? 64 : 52
    const cardX = cardMargin
    const cardY = isStory ? 110 : 54
    const cardW = W - cardMargin * 2
    const cardH = H - cardY * 2
    const cardRadius = 56

    ctx.save()
    ctx.beginPath()
    ctx.roundRect(cardX, cardY + 20, cardW, cardH, cardRadius)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)'
    ctx.filter = 'blur(48px)'
    ctx.fill()
    ctx.restore()

    // 2. SUPERFICIE DE LA TARJETA
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius)

    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH)
    cardGrad.addColorStop(0, bgTop)
    cardGrad.addColorStop(0.5, bgMid)
    cardGrad.addColorStop(1, bgBot)
    ctx.fillStyle = cardGrad
    ctx.fill()
    ctx.clip()

    // Resplandor volumétrico continuo en toda la tarjeta (Sin cortes horizontales)
    const sculptureCenterY = cardY + (isStory ? 575 : 430)
    const studioGlow = ctx.createRadialGradient(
      W / 2,
      sculptureCenterY,
      20,
      W / 2,
      sculptureCenterY,
      isStory ? 540 : 440
    )
    studioGlow.addColorStop(0, activeAchievement.glowRgba)
    studioGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)')
    studioGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = studioGlow
    ctx.fillRect(cardX, cardY, cardW, cardH)

    // Luz cenital plateada pintada sobre cardH completo (Elimina el corte horizontal de raíz)
    const topLight = ctx.createRadialGradient(W / 2, cardY, 5, W / 2, cardY, 520)
    topLight.addColorStop(0, 'rgba(255, 255, 255, 0.11)')
    topLight.addColorStop(0.65, 'rgba(255, 255, 255, 0.02)')
    topLight.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = topLight
    ctx.fillRect(cardX, cardY, cardW, cardH)

    // Destellos sutiles de alta joyería para las ediciones de 200.000 y 500.000
    if (
      activeAchievement.themeId === 'imperial_sapphire' ||
      activeAchievement.themeId === 'sovereign_solar'
    ) {
      const secondaryHalo = ctx.createRadialGradient(
        W / 2,
        sculptureCenterY,
        140,
        W / 2,
        sculptureCenterY,
        580
      )
      secondaryHalo.addColorStop(0, 'rgba(255,255,255,0.06)')
      secondaryHalo.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = secondaryHalo
      ctx.fillRect(cardX, cardY, cardW, cardH)
    }

 // ========================================================================
    // A. CABECERA: LOGO INTELIGENTE (Oculta marca real si la tarjeta está bloqueada)
    // ========================================================================
    const headerY = cardY + (isStory ? 84 : 62)
    const storeNameClean = isSelectedUnlocked
      ? store.name || 'Nuestra Tienda'
      : 'Tu tienda'
    ctx.font = '600 25px sans-serif'
    const nameWidth = ctx.measureText(storeNameClean).width
    const badgePillW = Math.min(cardW - 100, nameWidth + 132)
    const badgePillH = 74
    const badgePillX = (W - badgePillW) / 2

    ctx.beginPath()
    ctx.roundRect(badgePillX, headerY, badgePillW, badgePillH, 999)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.055)'
    ctx.fill()
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)'
    ctx.stroke()

    const avatarSize = 50
    const avatarX = badgePillX + 14
    const avatarY = headerY + (badgePillH - avatarSize) / 2
    const avatarCenterX = avatarX + avatarSize / 2
    const avatarCenterY = avatarY + avatarSize / 2

    if (isSelectedUnlocked && storeLogoImg) {
      if (logoAnalysis.hasTransparency && logoAnalysis.isDarkLogo) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2)
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()
        ctx.clip()

        const pad = 8
        const s = Math.min(
          (avatarSize - pad * 2) / storeLogoImg.width,
          (avatarSize - pad * 2) / storeLogoImg.height
        )
        const sw = storeLogoImg.width * s
        const sh = storeLogoImg.height * s
        ctx.drawImage(
          storeLogoImg,
          avatarX + (avatarSize - sw) / 2,
          avatarY + (avatarSize - sh) / 2,
          sw,
          sh
        )
        ctx.restore()
      } else if (!logoAnalysis.hasTransparency) {
        ctx.save()
        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
        ctx.shadowBlur = 14
        ctx.shadowOffsetY = 4
        ctx.beginPath()
        ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2)
        ctx.fillStyle = '#18181B'
        ctx.fill()
        ctx.restore()

        ctx.save()
        ctx.beginPath()
        ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2)
        ctx.clip()
        const s = Math.max(avatarSize / storeLogoImg.width, avatarSize / storeLogoImg.height)
        const sw = storeLogoImg.width * s
        const sh = storeLogoImg.height * s
        ctx.drawImage(
          storeLogoImg,
          avatarX + (avatarSize - sw) / 2,
          avatarY + (avatarSize - sh) / 2,
          sw,
          sh
        )
        ctx.restore()

        ctx.save()
        ctx.beginPath()
        ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2)
        ctx.lineWidth = 1.25
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)'
        ctx.stroke()
        ctx.restore()
      } else {
        ctx.save()
        ctx.beginPath()
        ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
        ctx.fill()
        ctx.clip()
        const pad = 7
        const s = Math.min(
          (avatarSize - pad * 2) / storeLogoImg.width,
          (avatarSize - pad * 2) / storeLogoImg.height
        )
        const sw = storeLogoImg.width * s
        const sh = storeLogoImg.height * s
        ctx.drawImage(
          storeLogoImg,
          avatarX + (avatarSize - sw) / 2,
          avatarY + (avatarSize - sh) / 2,
          sw,
          sh
        )
        ctx.restore()

        ctx.save()
        ctx.beginPath()
        ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2)
        ctx.lineWidth = 1
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'
        ctx.stroke()
        ctx.restore()
      }
    } else {
      ctx.save()
      ctx.beginPath()
      ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2)
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
      ctx.fillStyle = '#09090B'
      ctx.font = '700 20px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        storeNameClean.substring(0, 2).toUpperCase(),
        avatarCenterX,
        avatarCenterY
      )
      ctx.restore()
    }

    ctx.fillStyle = '#FFFFFF'
    ctx.font = '600 25px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      storeNameClean.length > 24 ? storeNameClean.slice(0, 24) + '...' : storeNameClean,
      avatarX + avatarSize + 18,
      headerY + badgePillH / 2 + 1
    )

    // ========================================================================
    // B. PIEZA CENTRAL: LA ESCULTURA 3D
    // ========================================================================
    const sculptureSize = isStory ? 590 : 435
    if (sculptureImg) {
      const seamlessSculpture = createSeamlessSculptureCanvas(sculptureImg, sculptureSize)

      ctx.save()
      ctx.beginPath()
      ctx.ellipse(
        W / 2,
        sculptureCenterY + sculptureSize * 0.37,
        sculptureSize * 0.26,
        22,
        0,
        0,
        Math.PI * 2
      )
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
      ctx.filter = 'blur(20px)'
      ctx.fill()
      ctx.restore()

      ctx.save()
      ctx.shadowColor = activeAchievement.glowRgba
      ctx.shadowBlur = 40
      ctx.drawImage(
        seamlessSculpture,
        (W - sculptureSize) / 2,
        sculptureCenterY - sculptureSize / 2,
        sculptureSize,
        sculptureSize
      )
      ctx.restore()
    }

    // ========================================================================
    // C. JERARQUÍA TIPOGRÁFICA EDITORIAL MEJORADA (MÁS LEGIBLE Y PROPORCIONADA)
    // ========================================================================
    const textSectionY = sculptureCenterY + (isStory ? 310 : 225)

    // 1. Sobretítulo
    ctx.fillStyle = activeAchievement.accentHex
    ctx.font = '600 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(activeAchievement.eyebrowLabel, W / 2, textSectionY)

    // 2. Cifra principal con peso 500 elegante y auto-escalado para "200.000 Visitas" / "500.000 Visitas"
    const fullMetricStr = `${activeAchievement.metricDisplay} Visitas`
    const maxAllowedMetricWidth = cardW - 140
    let metricFontSize = isStory ? 98 : 82
    ctx.font = `500 ${metricFontSize}px sans-serif`

    while (ctx.measureText(fullMetricStr).width > maxAllowedMetricWidth && metricFontSize > 50) {
      metricFontSize -= 3
      ctx.font = `500 ${metricFontSize}px sans-serif`
    }

    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(fullMetricStr, W / 2, textSectionY + (isStory ? 96 : 80))

    // 3. Subtítulo Editorial más grande y nítido
    ctx.fillStyle = '#F4F4F5'
    ctx.font = `400 ${isStory ? 42 : 35}px Georgia, "Playfair Display", serif`
    ctx.fillText(
      activeAchievement.badgeTitle,
      W / 2,
      textSectionY + (isStory ? 162 : 136)
    )

    // 4. Filamento Divisor Óptico de Estudio (Conecta el título con la dedicatoria)
    const dividerY = textSectionY + (isStory ? 196 : 162)
    const divGrad = ctx.createLinearGradient(W / 2 - 44, dividerY, W / 2 + 44, dividerY)
    divGrad.addColorStop(0, 'rgba(255,255,255,0)')
    divGrad.addColorStop(0.5, activeAchievement.accentHex)
    divGrad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = divGrad
    ctx.fillRect(W / 2 - 44, dividerY, 88, 2)

    // 5. Dedicatoria con mejor escalado (+25% más legible y luminosa)
    ctx.fillStyle = '#D4D4D8'
    ctx.font = `400 ${isStory ? 29 : 25}px sans-serif`
    drawCenteredWrappedText(
      ctx,
      activeAchievement.customerStoryCopy,
      W / 2,
      textSectionY + (isStory ? 252 : 206),
      cardW - 135,
      isStory ? 42 : 36
    )

    // ========================================================================
    // D. PIE DE TARJETA: CÁPSULA DE DOMINIO CON HALO + "www.preziso.shop"
    // ========================================================================
 const footerBottomY = cardY + cardH - (isStory ? 66 : 44)

    const domainText = isSelectedUnlocked
      ? `${(store.slug || 'mitienda').toLowerCase()}.preziso.shop`
      : 'tutienda.preziso.shop'
    ctx.font = '600 25px sans-serif'
    const domainW = Math.max(380, ctx.measureText(domainText).width + 104)
    const domainH = isStory ? 72 : 60
    const domainX = (W - domainW) / 2
    const domainY = footerBottomY - (isStory ? 142 : 114)

    // Halo de cristal exterior alrededor del botón de la tienda
    ctx.beginPath()
    ctx.roundRect(domainX - 7, domainY - 7, domainW + 14, domainH + 14, 999)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
    ctx.fill()

    ctx.beginPath()
    ctx.roundRect(domainX, domainY, domainW, domainH, 999)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()

    ctx.fillStyle = '#09090B'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(domainText, W / 2, domainY + domainH / 2 + 1)

    // Firma inferior: Tienda oficial impulsada por www.preziso.shop
    const sealY = footerBottomY - 12
    const prefixStr = 'Tienda oficial impulsada por '
    const brandUrlStr = 'www.preziso.shop'

    ctx.font = '400 23px sans-serif'
    const prefixW = ctx.measureText(prefixStr).width
    ctx.font = '600 23px sans-serif'
    const brandW = ctx.measureText(brandUrlStr).width
    const totalFooterW = prefixW + brandW
    const startFooterX = (W - totalFooterW) / 2

    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.font = '400 23px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.52)'
    ctx.fillText(prefixStr, startFooterX, sealY)

    ctx.font = '600 23px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)'
    ctx.fillText(brandUrlStr, startFooterX + prefixW, sealY)

    ctx.restore()

    // Borde exterior de cristal biselado
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius)
    ctx.lineWidth = 2
    const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH)
    borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)')
    borderGrad.addColorStop(0.25, 'rgba(255, 255, 255, 0.10)')
    borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.14)')
    ctx.strokeStyle = borderGrad
    ctx.stroke()
    ctx.restore()
}, [
    activeAchievement,
    exportFormat,
    store.name,
    store.slug,
    storeLogoImg,
    logoAnalysis,
    sculptureImg,
    isSelectedUnlocked
  ])

  useEffect(() => {
    if (!isOpen || viewMode !== 'stage') return
    const timer = setTimeout(() => {
      renderStudioCardCanvas()
    }, 35)
    return () => clearTimeout(timer)
  }, [isOpen, viewMode, renderStudioCardCanvas])

  const getCanvasPngFile = (): Promise<File> => {
    return new Promise((resolve, reject) => {
      if (!canvasRef.current) return reject(new Error('Canvas no disponible'))
      canvasRef.current.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Error generando imagen'))
          const fileName = `preziso-${store.slug}-${activeAchievement.id}.png`
          resolve(
            new File([blob], fileName, {
              type: 'image/png',
              lastModified: Date.now()
            })
          )
        },
        'image/png',
        1.0
      )
    })
  }

  const handleNativeShareImage = async () => {
    if (!isSelectedUnlocked) {
      toast.error(
        `Esta insignia se desbloquea al alcanzar ${activeAchievement.metricDisplay} visitas.`
      )
      return
    }
    setIsSharing(true)
    try {
      renderStudioCardCanvas()
      const file = await getCanvasPngFile()

      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `${store.name} — ${activeAchievement.badgeTitle}`,
          text: `${activeAchievement.customerStoryCopy} Visítanos en https://${store.slug}.preziso.shop`
        })
        toast.success('Tarjeta lista para publicar en tu Historia o Estado')
      } else {
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Imagen HD descargada lista para subir a tus redes')
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error('No se pudo abrir el menú de compartir')
      }
    } finally {
      setIsSharing(false)
    }
  }

  const handleDownloadHd = async () => {
    if (!isSelectedUnlocked) {
      toast.error(
        `Alcanza ${activeAchievement.metricDisplay} visitas para descargar esta insignia.`
      )
      return
    }
    try {
      renderStudioCardCanvas()
      const file = await getCanvasPngFile()
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Tarjeta descargada en alta definición')
    } catch {
      toast.error('Error al descargar la tarjeta')
    }
  }

  const handleSendToWhatsApp = () => {
    if (!isSelectedUnlocked) {
      toast.error(
        `Alcanza ${activeAchievement.metricDisplay} visitas para enviar esta tarjeta.`
      )
      return
    }
    const rawPhone = store.owner_whatsapp || store.phone || ''
    const cleanPhone = String(rawPhone).replace(/\D/g, '')
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://preziso.shop'

    const ogCardUrl = `${origin}/api/og/achievement?store=${encodeURIComponent(
      store.name || 'Nuestra Tienda'
    )}&slug=${encodeURIComponent(store.slug || 'tienda')}&metric=${encodeURIComponent(
      activeAchievement.metricDisplay
    )}&title=${encodeURIComponent(
      activeAchievement.badgeTitle
    )}&copy=${encodeURIComponent(
      activeAchievement.customerStoryCopy
    )}&sculpture=${encodeURIComponent(
      activeAchievement.fallbackSculpturePath || activeAchievement.sculpturePath
    )}`

    const text = `🏆 *${store.name} — ${activeAchievement.badgeTitle}*\n\nHemos superado las *${activeAchievement.metricDisplay} visitas* en nuestra tienda online.\n\n${activeAchievement.customerStoryCopy}\n\nCatálogo oficial: https://${store.slug}.preziso.shop\n\n${ogCardUrl}`

    const waTarget = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`

    window.open(waTarget, '_blank')
  }

  const handleShareStoreLinkToGrow = async () => {
    if (!store?.slug) return
    const url = `https://${store.slug}.preziso.shop`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: store.name,
          text: `Explora el catálogo oficial de ${store.name} y haz tu pedido en línea:`,
          url
        })
        return
      } catch {}
    }
    navigator.clipboard.writeText(url)
    setCopiedStoreLink(true)
    toast.success('Enlace copiado. Compártelo en tus redes para sumar visitas.')
    setTimeout(() => setCopiedStoreLink(false), 2500)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-2.5 sm:p-5">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="absolute inset-0 bg-neutral-950/60 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.99 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-5xl max-h-[90dvh] bg-white rounded-2xl border border-neutral-200 flex flex-col overflow-hidden"
        >
          {/* CABECERA SUPERIOR */}
          <div className="px-4 sm:px-6 py-3.5 border-b border-neutral-100 flex items-center justify-between gap-3 shrink-0 bg-white">
            <div className="flex items-center gap-2.5 min-w-0">
              {viewMode === 'stage' ? (
                <button
                  type="button"
                  onClick={() => setViewMode('vault')}
                  className="px-3 py-1.5 rounded-full border border-neutral-200 hover:border-neutral-900 text-xs font-medium text-neutral-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Volver a la Vitrina</span>
                </button>
              ) : (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-neutral-950 text-white flex items-center justify-center shrink-0">
                    <Award size={15} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-sm font-semibold text-neutral-900 tracking-tight truncate">
                      Vitrina de Logros • {store.name}
                    </h2>
                    <p className="text-[11px] text-neutral-500 truncate">
                      Esculturas oficiales desbloqueadas por el tráfico de tu tienda
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-600 text-[11px] font-medium">
                <span>Colección:</span>
                <span className="font-mono font-semibold text-neutral-950">
                  {unlockedIds.size}/{PREZISO_ACHIEVEMENTS.length}
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-neutral-200/80 hover:border-neutral-900 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ================================================================
              VISTA 1: LA VITRINA COLECCIONABLE (8 ESCULTURAS)
          ================================================================ */}
          {viewMode === 'vault' ? (
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-5 bg-[#F8F9FA] no-scrollbar">
              {/* TARJETA NEGRA DE PROGRESO CON FILAMENTO PLATEADO SUPERIOR */}
              <div className="relative p-4 sm:p-5 rounded-2xl bg-[#0C0D0E] text-white border border-neutral-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[340px] h-[120px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.12),transparent_70%)] blur-xl" />

                <div className="space-y-2.5 flex-1 w-full min-w-0 relative z-10">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-white/15 via-white/5 to-transparent text-[10px] font-mono font-medium uppercase tracking-wider text-neutral-300">
                      <Sparkles size={10} className="text-neutral-200" />
                      {remainingVisitsToNext > 0
                        ? `Próxima meta: ${nextTargetAchievement.metricDisplay} visitas`
                        : 'Colección completada'}
                    </span>

                    <span className="text-[11px] font-mono text-neutral-400">
                      Tráfico real:{' '}
                      <span className="text-white font-medium">
                        {totalRealVisits.toLocaleString('es-VE')} visitas
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-medium tracking-tight text-white truncate">
                        {remainingVisitsToNext > 0
                          ? `A ${remainingVisitsToNext.toLocaleString('es-VE')} visitas de "${nextTargetAchievement.badgeTitle}"`
                          : 'Has desbloqueado todas las esculturas de Preziso'}
                      </h3>
                      <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                        Comparte tu tienda en redes para sumar tráfico y desbloquear la siguiente pieza.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleShareStoreLinkToGrow}
                      className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[11px] font-medium tracking-tight inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer self-start sm:self-center"
                    >
                      {copiedStoreLink ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedStoreLink ? 'Enlace copiado' : 'Copiar link de tienda'}</span>
                    </button>
                  </div>

                  <div className="space-y-1 pt-0.5">
                    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        style={{ width: `${progressToNextPct}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-neutral-300 to-white transition-all duration-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CUADRÍCULA DE LAS 8 ESCULTURAS COLECCIONABLES */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {PREZISO_ACHIEVEMENTS.map((ach) => {
                  const isUnlocked = unlockedIds.has(ach.id)
                  const cardProgress = Math.min(
                    100,
                    Math.round((totalRealVisits / ach.threshold) * 100)
                  )
                  const displaySculpture =
                    ach.fallbackSculpturePath || ach.sculpturePath

                  return (
                    <div
                      key={ach.id}
                      onClick={() => {
                        setSelectedAchId(ach.id)
                        setViewMode('stage')
                      }}
                      style={{
                        background: `linear-gradient(180deg, ${ach.cardBgStops[0]} 0%, ${ach.cardBgStops[1]} 55%, ${ach.cardBgStops[2]} 100%)`
                      }}
                      className={`group relative rounded-2xl border overflow-hidden flex flex-col justify-between p-3.5 sm:p-4 transition-all duration-300 cursor-pointer ${
                        isUnlocked
                          ? 'border-neutral-800 hover:border-neutral-500 hover:-translate-y-0.5'
                          : 'border-neutral-800/70 opacity-85 hover:opacity-100'
                      }`}
                    >
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                      <div
                        style={{
                          background: `radial-gradient(circle, ${ach.glowRgba} 0%, transparent 70%)`
                        }}
                        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
                          isUnlocked ? 'opacity-100' : 'opacity-25'
                        }`}
                      />

                      <div className="relative z-10 flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-medium text-white tracking-tight truncate">
                          {ach.metricDisplay} Visitas
                        </span>

                        {isUnlocked ? (
                          <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/30 via-emerald-500/12 to-transparent text-emerald-300 text-[9px] font-medium border-0 shrink-0">
                            Desbloqueada
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-white/8 text-neutral-400 flex items-center justify-center shrink-0">
                            <Lock size={10} />
                          </span>
                        )}
                      </div>

                      <div className="relative z-10 my-2.5 sm:my-3.5 h-28 sm:h-36 w-full flex items-center justify-center">
                        <div
                          className={`relative w-full h-full transition-transform duration-500 ${
                            isUnlocked
                              ? 'group-hover:scale-105'
                              : 'grayscale contrast-125 opacity-35 group-hover:opacity-50'
                          }`}
                        >
                          <Image
                            src={displaySculpture}
                            alt={ach.badgeTitle}
                            fill
                            sizes="(max-width: 768px) 45vw, 240px"
                            className="object-contain"
                          />
                        </div>
                      </div>

                      <div className="relative z-10 space-y-1.5">
                        <div>
                          <p
                            style={{ color: isUnlocked ? ach.accentHex : '#A1A1AA' }}
                            className="text-[8.5px] font-mono uppercase tracking-wider truncate opacity-90"
                          >
                            {ach.materialLabel}
                          </p>
                          <h4 className="text-xs font-medium text-white tracking-tight truncate mt-0.5">
                            {ach.badgeTitle}
                          </h4>
                        </div>

                        {isUnlocked ? (
                          <div className="pt-1 flex items-center justify-between text-[10.5px] font-medium text-neutral-300 group-hover:text-white">
                            <span>Abrir tarjeta</span>
                            <ChevronRight
                              size={12}
                              className="group-hover:translate-x-0.5 transition-transform"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1 pt-1">
                            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                              <div
                                style={{ width: `${cardProgress}%` }}
                                className="h-full rounded-full bg-white/40"
                              />
                            </div>
                            <p className="text-[8.5px] text-neutral-400 font-mono truncate">
                              {cardProgress}% ({totalRealVisits.toLocaleString('es-VE')}/{ach.metricDisplay})
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* ================================================================
                VISTA 2: EL ESCENARIO DE COMPARTIDO
            ================================================================ */
            <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row bg-[#F4F4F5] no-scrollbar">
              <div className="flex-1 p-4 sm:p-6 flex flex-col items-center justify-center relative min-h-[380px]">
                <div className="mb-3.5 flex items-center gap-1.5 bg-white p-1 rounded-full border border-neutral-200/80">
                  <button
                    type="button"
                    onClick={() => setExportFormat('story_9_16')}
                    className={`px-3.5 py-1.5 rounded-full text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                      exportFormat === 'story_9_16'
                        ? 'bg-neutral-950 text-white'
                        : 'text-neutral-600 hover:text-neutral-950'
                    }`}
                  >
                    <Smartphone size={12} /> Historia / Estado (9:16)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('post_4_5')}
                    className={`px-3.5 py-1.5 rounded-full text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                      exportFormat === 'post_4_5'
                        ? 'bg-neutral-950 text-white'
                        : 'text-neutral-600 hover:text-neutral-950'
                    }`}
                  >
                    <Square size={12} /> Publicación (4:5)
                  </button>
                </div>

                <div
                  className={`relative rounded-3xl overflow-hidden border border-neutral-300 bg-[#050507] transition-all ${
                    exportFormat === 'story_9_16'
                      ? 'w-[245px] sm:w-[295px] aspect-[9/16]'
                      : 'w-[275px] sm:w-[355px] aspect-[4/5]'
                  }`}
                >
                  {loadingSculpture && (
                    <div className="absolute inset-0 z-20 bg-neutral-950/80 flex items-center justify-center">
                      <Loader2 size={22} className="animate-spin text-white" />
                    </div>
                  )}
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full object-contain block"
                  />
                </div>
              </div>

              <div className="w-full lg:w-[360px] bg-white border-t lg:border-t-0 lg:border-l border-neutral-200/80 p-5 sm:p-6 flex flex-col justify-between gap-5 shrink-0">
                <div className="space-y-3.5">
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium border-0 ${
                      isSelectedUnlocked
                        ? 'bg-gradient-to-r from-emerald-500/20 via-emerald-500/8 to-transparent text-emerald-800'
                        : 'bg-gradient-to-r from-neutral-200/80 via-neutral-100 to-transparent text-neutral-600'
                    }`}
                  >
                    {isSelectedUnlocked ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Insignia Desbloqueada</span>
                      </>
                    ) : (
                      <>
                        <Lock size={11} className="text-neutral-500" />
                        <span>
                          Se desbloquea a las {activeAchievement.metricDisplay} visitas
                        </span>
                      </>
                    )}
                  </div>

                  <div>
                    <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                      {activeAchievement.materialLabel}
                    </p>
                    <h3 className="text-lg font-semibold text-neutral-950 tracking-tight mt-0.5">
                      {activeAchievement.badgeTitle} ({activeAchievement.metricDisplay} Visitas)
                    </h3>
                    <p className="text-xs text-neutral-500 leading-relaxed mt-1.5">
                      {activeAchievement.customerStoryCopy}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-neutral-100">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block mb-2">
                      Cambiar de Insignia (8 Niveles)
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {PREZISO_ACHIEVEMENTS.map((ach) => {
                        const isSel = ach.id === activeAchievement.id
                        const isUnl = unlockedIds.has(ach.id)
                        return (
                          <button
                            key={ach.id}
                            type="button"
                            onClick={() => setSelectedAchId(ach.id)}
                            className={`py-1.5 px-1.5 rounded-xl border text-[11px] font-mono font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer truncate ${
                              isSel
                                ? 'border-neutral-950 bg-neutral-950 text-white'
                                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                            }`}
                          >
                            {!isUnl && <Lock size={9} className="opacity-50 shrink-0" />}
                            <span className="truncate">{ach.metricDisplay}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {isSelectedUnlocked ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleNativeShareImage}
                      disabled={isSharing}
                      className="w-full py-3 px-4 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-medium tracking-wide flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {isSharing ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Share2 size={14} />
                      )}
                      <span>Compartir en Historia o Estado</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSendToWhatsApp}
                      className="w-full py-2.5 px-4 rounded-full border border-neutral-900 bg-transparent hover:bg-neutral-900 text-neutral-900 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <MessageCircle size={14} />
                      <span>Enviarme la Tarjeta a mi WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadHd}
                      className="w-full py-2.5 px-4 rounded-full border border-neutral-200 hover:border-neutral-900 bg-transparent text-neutral-600 hover:text-neutral-950 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Descargar Imagen HD</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2.5">
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      Te faltan{' '}
                      <span className="font-semibold text-neutral-950">
                        {Math.max(0, activeAchievement.threshold - totalRealVisits).toLocaleString(
                          'es-VE'
                        )}{' '}
                        visitas
                      </span>{' '}
                      para desbloquear esta escultura.
                    </p>
                    <button
                      type="button"
                      onClick={handleShareStoreLinkToGrow}
                      className="w-full py-2 px-4 rounded-full bg-neutral-950 text-white text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      <Copy size={12} />
                      <span>Copiar link de mi tienda</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}