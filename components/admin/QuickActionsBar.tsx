// components/admin/QuickActionsBar.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    Package,
    Calculator,
    Plus,
    Palette,
    ShoppingBag,
    Wallet,
    Layers,
    UtensilsCrossed,
    Tag,
    FileText,
    Barcode,
    Zap,
    LineChart,
    User,
    Copy,
    Check,
    Users,
    Settings,
    ArrowUpRight,
    X,
    RotateCcw,
    Pin,
    MoreHorizontal
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { useQuickCheckout } from '@/app/store/useQuickCheckout'

type PlanType = 'retail' | 'digital' | 'pro'
type StoreType = 'retail' | 'restaurant' | 'services'

interface QuickActionItem {
    id: string
    label: string
    shortLabel: string
    description: string
    category: 'Operación Diaria' | 'Catálogo y Ventas' | 'Negocio y Configuración'
    icon: any
    href?: string
    actionType?: 'quick_checkout' | 'copy_link'
    allowedPlans: PlanType[]
    allowedStoreTypes?: StoreType[]
}

interface QuickActionsBarProps {
    store: any
    isCompact?: boolean
}

const DEFAULT_RETAIL_SHORTCUTS = ['inventory', 'pos', 'customization', 'new_product']
const DEFAULT_DIGITAL_SHORTCUTS = ['customization', 'orders', 'quick_charge', 'analytics']
const MAX_PINNED_SHORTCUTS = 4

export default function QuickActionsBar({ store, isCompact = false }: QuickActionsBarProps) {
    const router = useRouter()
    const { openQuickCheckout } = useQuickCheckout()

    const isRestaurant = store?.store_type === 'restaurant'
    const currentPlan = (store?.plan_type || 'retail') as PlanType
    const currentStoreType = (store?.store_type || 'retail') as StoreType
    const storageKey = `preziso_quick_shortcuts_v1_${store?.id || 'default'}`

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [copiedLink, setCopiedLink] = useState(false)

    // Catálogo completo de acciones adaptado dinámicamente según Retail / Restaurante / Plan
    const allActionsCatalog: QuickActionItem[] = useMemo(
        () => [
            // Operación Diaria
            {
                id: 'inventory',
                label: 'Inventario',
                shortLabel: 'Inventario',
                description: isRestaurant ? 'Platos y disponibilidad' : 'Existencias y productos',
                category: 'Operación Diaria',
                icon: Package,
                href: '/admin/inventory',
                allowedPlans: ['retail', 'pro']
            },
            {
                id: 'pos',
                label: 'POS / Cotizar',
                shortLabel: 'POS',
                description: 'Terminal de punto de venta',
                category: 'Operación Diaria',
                icon: Calculator,
                href: '/admin/pos',
                allowedPlans: ['retail', 'pro']
            },
            {
                id: 'new_product',
                label: isRestaurant ? 'Nuevo Plato' : 'Nuevo Producto',
                shortLabel: isRestaurant ? 'Crear Plato' : 'Crear',
                description: isRestaurant ? 'Agregar plato al menú' : 'Subir artículo al catálogo',
                category: 'Operación Diaria',
                icon: Plus,
                href: '/admin/product/new',
                allowedPlans: ['retail', 'pro']
            },
            {
                id: 'quick_charge',
                label: 'Cobro Rápido',
                shortLabel: 'Cobrar',
                description: 'Generar link de cobro inmediato',
                category: 'Operación Diaria',
                icon: Zap,
                actionType: 'quick_checkout',
                allowedPlans: ['retail', 'digital', 'pro']
            },
            {
                id: 'orders',
                label: 'Pedidos',
                shortLabel: 'Pedidos',
                description: 'Órdenes recibidas y despachos',
                category: 'Operación Diaria',
                icon: ShoppingBag,
                href: '/admin/orders',
                allowedPlans: ['retail', 'digital', 'pro']
            },
            {
                id: 'cash',
                label: 'Control de Caja',
                shortLabel: 'Caja',
                description: 'Arqueo, ingresos y cierres',
                category: 'Operación Diaria',
                icon: Wallet,
                href: '/admin/cash',
                allowedPlans: ['retail', 'pro']
            },

            // Catálogo y Ventas
            {
                id: 'collections',
                label: isRestaurant ? 'Combos y Menús' : 'Colecciones',
                shortLabel: isRestaurant ? 'Combos' : 'Colecciones',
                description: isRestaurant ? 'Agrupar menús especiales' : 'Drops y pasillos destacados',
                category: 'Catálogo y Ventas',
                icon: isRestaurant ? UtensilsCrossed : Layers,
                href: '/admin/collections',
                allowedPlans: ['retail', 'pro']
            },
            {
                id: 'promotions',
                label: 'Promociones',
                shortLabel: 'Promos',
                description: 'Descuentos, 2x1 y campañas',
                category: 'Catálogo y Ventas',
                icon: Tag,
                href: '/admin/promotions',
                allowedPlans: ['retail', 'pro']
            },
            {
                id: 'quotes',
                label: 'Presupuestos',
                shortLabel: 'Cotizaciones',
                description: 'Cotizaciones activas por cobrar',
                category: 'Catálogo y Ventas',
                icon: FileText,
                href: '/admin/quotes',
                allowedPlans: ['retail', 'pro']
            },
            {
                id: 'skus',
                label: 'Matriz de SKUs',
                shortLabel: 'SKUs',
                description: 'Códigos y control de variantes',
                category: 'Catálogo y Ventas',
                icon: Barcode,
                href: '/admin/inventory/skus',
                allowedPlans: ['retail', 'pro'],
                allowedStoreTypes: ['retail']
            },
            {
                id: 'customers',
                label: 'Clientes',
                shortLabel: 'Clientes',
                description: 'Directorio y vuelto digital',
                category: 'Catálogo y Ventas',
                icon: User,
                href: '/admin/customers',
                allowedPlans: ['retail', 'digital', 'pro']
            },

            // Negocio y Configuración
            {
                id: 'customization',
                label: 'Diseño de Tienda',
                shortLabel: 'Diseño',
                description: 'Portadas, colores y plantillas',
                category: 'Negocio y Configuración',
                icon: Palette,
                href: '/admin/customization',
                allowedPlans: ['retail', 'digital', 'pro']
            },
            {
                id: 'copy_store_link',
                label: 'Copiar Link Tienda',
                shortLabel: 'Mi Link',
                description: 'Copiar URL pública al portapapeles',
                category: 'Negocio y Configuración',
                icon: copiedLink ? Check : Copy,
                actionType: 'copy_link',
                allowedPlans: ['retail', 'digital', 'pro']
            },
            {
                id: 'analytics',
                label: 'Inteligencia',
                shortLabel: 'Métricas',
                description: 'Tráfico, estados y conversión',
                category: 'Negocio y Configuración',
                icon: LineChart,
                href: '/admin/analytics',
                allowedPlans: ['retail', 'digital', 'pro']
            },
            {
                id: 'commissions',
                label: 'Comisiones',
                shortLabel: 'Promotores',
                description: 'Gestión de promotores y ventas',
                category: 'Negocio y Configuración',
                icon: Users,
                href: '/admin/commissions',
                allowedPlans: ['retail', 'digital', 'pro']
            },
            {
                id: 'settings',
                label: 'Ajustes',
                shortLabel: 'Ajustes',
                description: 'Pagos, envíos, horarios y perfil fiscal',
                category: 'Negocio y Configuración',
                icon: Settings,
                href: '/admin/settings',
                allowedPlans: ['retail', 'digital', 'pro']
            }
        ],
        [isRestaurant, copiedLink]
    )

    // Filtrar acciones permitidas según el plan y tipo de tienda
    const availableActions = useMemo(() => {
        return allActionsCatalog.filter((item) => {
            const planOk = item.allowedPlans.includes(currentPlan)
            const typeOk =
                !item.allowedStoreTypes || item.allowedStoreTypes.includes(currentStoreType)
            return planOk && typeOk
        })
    }, [allActionsCatalog, currentPlan, currentStoreType])

    const defaultIds = useMemo(() => {
        const base =
            currentPlan === 'digital' ? DEFAULT_DIGITAL_SHORTCUTS : DEFAULT_RETAIL_SHORTCUTS
        return base.filter((id) => availableActions.some((a) => a.id === id)).slice(0, MAX_PINNED_SHORTCUTS)
    }, [currentPlan, availableActions])

    const [pinnedIds, setPinnedIds] = useState<string[]>(defaultIds)

    // Hidratar selección personalizada desde localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey)
            if (saved) {
                const parsed = JSON.parse(saved)
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const validIds = parsed.filter((id) =>
                        availableActions.some((a) => a.id === id)
                    )
                    if (validIds.length > 0) {
                        setPinnedIds(validIds.slice(0, MAX_PINNED_SHORTCUTS))
                        return
                    }
                }
            }
            setPinnedIds(defaultIds)
        } catch {
            setPinnedIds(defaultIds)
        }
    }, [storageKey, availableActions, defaultIds])

    // Bloquear scroll del body cuando el modal está activo (Sincroniza con AdminHeader y MobileBottomBar)
    useEffect(() => {
        if (typeof document === 'undefined') return
        if (isModalOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
            setIsEditMode(false)
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isModalOpen])

    const savePinnedShortcuts = (nextIds: string[]) => {
        setPinnedIds(nextIds)
        try {
            localStorage.setItem(storageKey, JSON.stringify(nextIds))
        } catch { }
    }

    const togglePinAction = (actionId: string) => {
        if (pinnedIds.includes(actionId)) {
            if (pinnedIds.length <= 1) {
                toast.error('Debes mantener al menos 1 acceso directo activo')
                return
            }
            savePinnedShortcuts(pinnedIds.filter((id) => id !== actionId))
        } else {
            if (pinnedIds.length >= MAX_PINNED_SHORTCUTS) {
                // Reemplaza el último slot o informa al usuario
                const updated = [...pinnedIds.slice(0, MAX_PINNED_SHORTCUTS - 1), actionId]
                savePinnedShortcuts(updated)
                toast.success('Acceso fijado en la cuarta posición')
            } else {
                savePinnedShortcuts([...pinnedIds, actionId])
            }
        }
    }

    const handleResetDefaults = () => {
        savePinnedShortcuts(defaultIds)
        toast.success('Accesos directos restablecidos')
    }

    const executeAction = (item: QuickActionItem) => {
        if (item.actionType === 'quick_checkout') {
            setIsModalOpen(false)
            setTimeout(() => openQuickCheckout(), 60)
            return
        }

        if (item.actionType === 'copy_link') {
            if (!store?.slug) return
            const host = window.location.host.replace('www.', '')
            const url = `${window.location.protocol}//${store.slug}.${host}`
            navigator.clipboard.writeText(url)
            setCopiedLink(true)
            toast.success('Enlace de tu tienda copiado al portapapeles')
            setTimeout(() => setCopiedLink(false), 2000)
            return
        }

        if (item.href) {
            setIsModalOpen(false)
            router.push(item.href)
        }
    }

    // Resolver los objetos de los accesos fijados
    const pinnedActions = useMemo(() => {
        return pinnedIds
            .map((id) => availableActions.find((a) => a.id === id))
            .filter(Boolean) as QuickActionItem[]
    }, [pinnedIds, availableActions])

    const categoriesList: QuickActionItem['category'][] = [
        'Operación Diaria',
        'Catálogo y Ventas',
        'Negocio y Configuración'
    ]

    return (
        <>
            {/* ====================================================================
          BARRA SUPERIOR DE ACCESOS DIRECTOS (3 EN MÓVIL + '+', 4 EN PC + 'MÁS')
      ==================================================================== */}
           <section
        aria-label="Accesos directos rápidos"
        className={`w-full ${isCompact ? 'max-w-5xl mx-auto' : ''}`}
      >
        {/* ==================================================================
            1. VISTA MÓVIL (< md): Icono Superior + Texto Debajo + 3 Puntos
        ================================================================== */}
        <div className="grid grid-cols-4 gap-2 md:hidden pt-0.5 pb-1">
          {pinnedActions.slice(0, 3).map((item) => {
            const IconCmp = item.icon
            return (
              <button
                key={`mob-${item.id}`}
                type="button"
                onClick={() => executeAction(item)}
                className="group flex flex-col items-center justify-start gap-1.5 active:scale-95 transition-transform cursor-pointer min-w-0 outline-none"
              >
                <div className="w-12 h-12 rounded-2xl  border border-[#1d1f2141] group-active:border-[#0C0D0E] group-active:bg-[#0C0D0E] text-[#0C0D0E] group-active:text-white flex items-center justify-center transition-colors">
                  <IconCmp size={18} strokeWidth={1.9} />
                </div>
                <span className="text-[11px] font-medium text-[#0C0D0E] tracking-tight leading-none truncate max-w-full px-0.5">
                  {item.shortLabel}
                </span>
              </button>
            )
          })}

          {/* Botón Móvil 'Más' con Icono de 3 Puntos */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            aria-label="Más accesos directos"
            className="group flex flex-col items-center justify-start gap-1.5 active:scale-95 transition-transform cursor-pointer min-w-0 outline-none"
          >
            <div className="w-12 h-12 rounded-2xl  border border-[#1d1f2169] group-active:border-[#0C0D0E] group-active:bg-[#0C0D0E] text-[#0C0D0E] group-active:text-white flex items-center justify-center transition-colors">
              <MoreHorizontal size={18} strokeWidth={2} />
            </div>
            <span className="text-[11px] font-medium text-[#0C0D0E] tracking-tight leading-none">
              Más
            </span>
          </button>
        </div>

        {/* ==================================================================
            2. VISTA DESKTOP (>= md): Pastillas Sin Fondo en Negro Obsidiana
            Agrupadas a la Izquierda + Espacio al Centro + 3 Puntos a la Derecha
        ================================================================== */}
        <div className="hidden md:flex items-center justify-between gap-4 w-full">
          {/* Grupo Izquierdo: 4 Pastillas Compactas Sin Fondo */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {pinnedActions.slice(0, 4).map((item) => {
              const IconCmp = item.icon
              return (
                <button
                  key={`desk-${item.id}`}
                  type="button"
                  onClick={() => executeAction(item)}
                  className="group px-4 py-2 rounded-full bg-transparent hover:bg-[#0C0D0E] border border-[#1d1f2195] text-[#0C0D0E] hover:text-white inline-flex items-center gap-2 transition-colors duration-200 active:scale-95 cursor-pointer shrink-0"
                >
                  <IconCmp size={14} strokeWidth={2} className="shrink-0" />
                  <span className="text-xs font-medium tracking-tight whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Esquina Derecha: Botón de 3 Puntos en Pastilla Sin Fondo */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            title="Ver más accesos y personalizar"
            aria-label="Más accesos directos"
            className="px-3.5 py-2 rounded-full bg-transparent hover:bg-[#0C0D0E] border border-[#1d1f2195] text-[#0C0D0E] hover:text-white inline-flex items-center gap-1.5 transition-colors duration-200 active:scale-95 cursor-pointer shrink-0"
          >
            <MoreHorizontal size={15} strokeWidth={2} />
            <span className="text-xs font-medium tracking-tight">Más</span>
          </button>
        </div>
      </section>

            {/* ====================================================================
          MODAL ULTRA-OPTIMIZADO: CENTRO DE ACCESOS Y PERSONALIZACIÓN
      ==================================================================== */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-neutral-950/35 backdrop-blur-[2px]"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 6 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="relative z-10 w-full max-w-2xl max-h-[88dvh] bg-white rounded-2xl border border-neutral-200 flex flex-col overflow-hidden"
                        >
                            {/* Cabecera del Modal */}
                            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-3 shrink-0">
                                <div>
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                                        Centro de Accesos Rápidos
                                    </h2>
                                    <p className="text-[11px] text-neutral-500 mt-0.5">
                                        {isEditMode
                                            ? 'Toca cualquier herramienta para fijarla o quitarla de tu barra de inicio.'
                                            : 'Salta a cualquier módulo en un toque o personaliza tu barra.'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditMode(!isEditMode)}
                                        className={`px-3.5 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-colors cursor-pointer ${isEditMode
                                                ? 'border-neutral-900 bg-neutral-900 text-white'
                                                : 'border-neutral-200/90 bg-transparent text-neutral-700 hover:border-neutral-900'
                                            }`}
                                    >
                                        {isEditMode ? 'Listo' : 'Editar fijados'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="w-8 h-8 rounded-full border border-neutral-200/80 hover:border-neutral-900 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Barra Visual de los 4 Accesos Fijados Actualmente */}
                            <div className="px-5 py-3.5 bg-neutral-50/70 border-b border-neutral-100 shrink-0 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400">
                                        Accesos Fijados en tu Inicio ({pinnedActions.length}/4)
                                    </span>

                                    {isEditMode && (
                                        <button
                                            type="button"
                                            onClick={handleResetDefaults}
                                            className="text-[10px] font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
                                        >
                                            <RotateCcw size={11} /> Restaurar sugeridos
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[0, 1, 2, 3].map((slotIdx) => {
                                        const slotItem = pinnedActions[slotIdx]
                                        const isDesktopOnlySlot = slotIdx === 3

                                        if (!slotItem) {
                                            return (
                                                <div
                                                    key={`empty-slot-${slotIdx}`}
                                                    onClick={() => setIsEditMode(true)}
                                                    className="h-12 px-3 rounded-xl border border-dashed border-neutral-300 bg-white/60 flex flex-col justify-center items-center text-center cursor-pointer hover:border-neutral-500 transition-colors"
                                                >
                                                    <span className="text-[10px] font-medium text-neutral-400">
                                                        + Ranura {slotIdx + 1}
                                                    </span>
                                                    <span className="text-[8px] font-mono uppercase text-neutral-400">
                                                        {isDesktopOnlySlot ? 'Solo PC' : 'Móvil y PC'}
                                                    </span>
                                                </div>
                                            )
                                        }

                                        const SlotIcon = slotItem.icon
                                        return (
                                            <div
                                                key={`slot-${slotItem.id}`}
                                                onClick={() =>
                                                    isEditMode ? togglePinAction(slotItem.id) : executeAction(slotItem)
                                                }
                                                className="group relative h-12 px-2.5 rounded-xl bg-white border border-neutral-200/90 hover:border-neutral-900 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-6 h-6 rounded-lg bg-neutral-100 text-neutral-900 flex items-center justify-center shrink-0">
                                                        <SlotIcon size={12} strokeWidth={2.2} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-semibold text-neutral-900 truncate leading-none">
                                                            {slotItem.shortLabel}
                                                        </p>
                                                        <p className="text-[8px] font-mono uppercase text-neutral-400 mt-1 leading-none">
                                                            #{slotIdx + 1} • {isDesktopOnlySlot ? 'Solo PC' : 'Móvil y PC'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {isEditMode && (
                                                    <span className="w-5 h-5 rounded-full bg-neutral-100 group-hover:bg-rose-50 text-neutral-400 group-hover:text-rose-600 flex items-center justify-center shrink-0 transition-colors">
                                                        <X size={11} strokeWidth={2.5} />
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Directorio Completo de Módulos y Acciones */}
                            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 no-scrollbar">
                                {categoriesList.map((categoryName) => {
                                    const itemsInCat = availableActions.filter(
                                        (a) => a.category === categoryName
                                    )
                                    if (itemsInCat.length === 0) return null

                                    return (
                                        <div key={categoryName} className="space-y-2">
                                            <h3 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400">
                                                {categoryName}
                                            </h3>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {itemsInCat.map((item) => {
                                                    const IconCmp = item.icon
                                                    const pinIndex = pinnedIds.indexOf(item.id)
                                                    const isPinned = pinIndex !== -1

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            onClick={() =>
                                                                isEditMode ? togglePinAction(item.id) : executeAction(item)
                                                            }
                                                            className={`group p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors cursor-pointer ${isEditMode && isPinned
                                                                    ? 'border-neutral-900 bg-neutral-50/80'
                                                                    : 'border-neutral-200/80 bg-white hover:border-neutral-900'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div
                                                                    className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${isPinned
                                                                            ? 'bg-neutral-900 text-white border-neutral-900'
                                                                            : 'bg-[#F6F6F6] text-neutral-800 border-neutral-100 group-hover:bg-neutral-900 group-hover:text-white'
                                                                        }`}
                                                                >
                                                                    <IconCmp size={15} strokeWidth={2} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-semibold text-neutral-900 truncate leading-tight">
                                                                        {item.label}
                                                                    </p>
                                                                    <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                                                                        {item.description}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Botón de Fijar directo o Flecha de Navegación */}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    togglePinAction(item.id)
                                                                }}
                                                                title={
                                                                    isPinned
                                                                        ? 'Quitar de mis accesos fijados'
                                                                        : 'Fijar en mi barra de inicio'
                                                                }
                                                                className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-semibold uppercase border transition-colors shrink-0 cursor-pointer flex items-center gap-1 ${isPinned
                                                                        ? 'border-neutral-900 bg-neutral-900 text-white'
                                                                        : 'border-neutral-200 bg-transparent text-neutral-400 hover:border-neutral-900 hover:text-neutral-900'
                                                                    }`}
                                                            >
                                                                <Pin size={10} />
                                                                <span>{isPinned ? `#${pinIndex + 1}` : 'Fijar'}</span>
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Pie del Modal */}
                            <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50/40 flex items-center justify-between text-[10px] font-mono text-neutral-400 shrink-0">
                                <span>Los primeros 3 accesos se muestran en Móvil y los 4 en PC</span>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-neutral-700 hover:text-neutral-950 font-semibold uppercase cursor-pointer"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}