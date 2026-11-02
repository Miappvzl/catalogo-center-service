'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { X, Plus, Minus, Check, ShoppingBag, AlertCircle, Utensils, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
import { FoodSelectedModifier } from '@/app/store/useCart'

const currencyFormatter = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 })

export interface ModifierOption {
  id: string
  name: string
  price_adjustment_usd: number
  is_available: boolean
  image_url?: string | null
}

export interface ModifierGroup {
  id: string
  name: string
  is_required: boolean
  min_selections: number
  max_selections: number
  modifier_options: ModifierOption[]
  selection_type?: 'single' | 'multiple' | 'quantity'
}

interface ComboCustomizerModalProps {
  isOpen: boolean
  onClose: () => void
  combo: any
  products: any[]
  activeRate?: number
  onConfirm: (configuredItems: any[], totalExtraCost: number) => void
  themeVariables?: React.CSSProperties
}

const QUICK_KITCHEN_TAGS = ['Sin cebolla', 'Salsas aparte', 'Bien cocido', 'Sin salsas', 'Poco condimento']

// Animación idéntica a ProductFoodModal: Drawer en Desktop / Sheet en Móvil
const sheetVariants: Variants = {
  hidden: (isDesktop: boolean) => ({
    y: isDesktop ? '0%' : '100%',
    x: isDesktop ? '100%' : '0%',
    opacity: 1,
  }),
  visible: {
    y: '0%',
    x: '0%',
    opacity: 1,
    transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] },
  },
  exit: (isDesktop: boolean) => ({
    y: isDesktop ? '0%' : '100%',
    x: isDesktop ? '100%' : '0%',
    opacity: 1,
    transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] },
  }),
}

export default function ComboCustomizerModal({
  isOpen,
  onClose,
  combo,
  products,
  activeRate = 0,
  onConfirm,
  themeVariables,
}: ComboCustomizerModalProps) {
  const [isDesktop, setIsDesktop] = useState(false)
  const [shakeError, setShakeError] = useState(false)

  // 1. Desglose en Slots Inteligentes (Si el combo tiene 2 hamburguesas, genera slot 1 y slot 2)
  const configurableSlots = useMemo(() => {
    if (!combo || !Array.isArray(combo.collection_items)) return []
    const qtyMap = combo.settings?.items_quantities || {}

    const slots: Array<{
      slotKey: string
      product: any
      slotTitle: string
      dishIndex: number
      unitIndex: number
      totalUnits: number
      modifierGroups: ModifierGroup[]
      ratio: number
    }> = []

    combo.collection_items
      .filter((it: any) => it.item_type === 'product' && it.product_id)
      .forEach((it: any, dishIdx: number) => {
        const prod = products.find((p: any) => String(p.id) === String(it.product_id))
        if (!prod) return

        const rawGroups: ModifierGroup[] = prod.product_modifier_groups
          ? [...prod.product_modifier_groups]
              .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
              .map((pmg: any) => pmg.modifier_groups)
              .filter(Boolean)
          : []

        const units = Number(qtyMap[String(it.product_id)] || 1)

        // Si el plato tiene extras configurables y son <= 4 unidades, desglosamos slots independientes
        if (rawGroups.length > 0 && units <= 4) {
          for (let u = 0; u < units; u++) {
            slots.push({
              slotKey: `${prod.id}_slot_${u}`,
              product: prod,
              slotTitle: units > 1 ? `${prod.name} (${u + 1} de ${units})` : prod.name,
              dishIndex: dishIdx,
              unitIndex: u,
              totalUnits: units,
              modifierGroups: rawGroups,
              ratio: 1,
            })
          }
        } else {
          // Si son muchas unidades o no tiene modificadores, se mantiene en lote
          slots.push({
            slotKey: `${prod.id}_batch`,
            product: prod,
            slotTitle: units > 1 ? `${units}x ${prod.name}` : prod.name,
            dishIndex: dishIdx,
            unitIndex: 0,
            totalUnits: units,
            modifierGroups: rawGroups,
            ratio: units,
          })
        }
      })

    return slots
  }, [combo, products])

  // 2. Estado de selecciones: { [slotKey]: { selectedOptions: Record<groupId, ModifierOption[]>, notes: string } }
  const [slotStates, setSlotStates] = useState<
    Record<string, { selectedOptions: Record<string, ModifierOption[]>; notes: string }>
  >({})

  // Interceptor nativo para botón atrás de Android / iOS
  useEffect(() => {
    if (!isOpen) return
    const modalId = `combo-modal-${Date.now()}`
    window.history.pushState({ modalId }, '')
    const handlePopState = () => onClose()
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (window.history.state?.modalId === modalId) window.history.go(-1)
    }
  }, [isOpen, onClose])

  // Bloqueo de scroll de fondo
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
    } else {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768)
    handleResize()
    window.addEventListener('resize', handleResize, { passive: true })
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Inicialización limpia al abrir
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, { selectedOptions: Record<string, ModifierOption[]>; notes: string }> = {}
      configurableSlots.forEach((slot) => {
        initial[slot.slotKey] = { selectedOptions: {}, notes: '' }
      })
      setSlotStates(initial)
      setShakeError(false)
    }
  }, [isOpen, configurableSlots])

  // 3. Controladores de Selección (Copia Fiel de ProductFoodModal)
  const handleToggleOption = useCallback((slotKey: string, group: ModifierGroup, option: ModifierOption) => {
    if (!option.is_available) return

    setSlotStates((prev) => {
      const currentSlot = prev[slotKey] || { selectedOptions: {}, notes: '' }
      const currentSelected = currentSlot.selectedOptions[group.id] || []
      const isAlreadySelected = currentSelected.some((o) => o.id === option.id)

      if (group.max_selections === 1) {
        return {
          ...prev,
          [slotKey]: {
            ...currentSlot,
            selectedOptions: {
              ...currentSlot.selectedOptions,
              [group.id]: [option],
            },
          },
        }
      }

      if (isAlreadySelected) {
        return {
          ...prev,
          [slotKey]: {
            ...currentSlot,
            selectedOptions: {
              ...currentSlot.selectedOptions,
              [group.id]: currentSelected.filter((o) => o.id !== option.id),
            },
          },
        }
      }

      if (currentSelected.length < group.max_selections) {
        return {
          ...prev,
          [slotKey]: {
            ...currentSlot,
            selectedOptions: {
              ...currentSlot.selectedOptions,
              [group.id]: [...currentSelected, option],
            },
          },
        }
      }

      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40)
      return prev
    })
  }, [])

  // Modo Cuantitativo: Incrementador
  const handleIncrementOption = useCallback((slotKey: string, group: ModifierGroup, option: ModifierOption) => {
    if (!option.is_available) return

    setSlotStates((prev) => {
      const currentSlot = prev[slotKey] || { selectedOptions: {}, notes: '' }
      const currentSelected = currentSlot.selectedOptions[group.id] || []

      if (currentSelected.length < group.max_selections) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15)
        return {
          ...prev,
          [slotKey]: {
            ...currentSlot,
            selectedOptions: {
              ...currentSlot.selectedOptions,
              [group.id]: [...currentSelected, option],
            },
          },
        }
      }
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([20, 40, 20])
      return prev
    })
  }, [])

  // Modo Cuantitativo: Decrementador
  const handleDecrementOption = useCallback((slotKey: string, group: ModifierGroup, option: ModifierOption) => {
    setSlotStates((prev) => {
      const currentSlot = prev[slotKey] || { selectedOptions: {}, notes: '' }
      const currentSelected = currentSlot.selectedOptions[group.id] || []
      const indexToRemove = currentSelected.findLastIndex((o) => o.id === option.id)

      if (indexToRemove > -1) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10)
        const updated = [...currentSelected]
        updated.splice(indexToRemove, 1)

        return {
          ...prev,
          [slotKey]: {
            ...currentSlot,
            selectedOptions: {
              ...currentSlot.selectedOptions,
              [group.id]: updated,
            },
          },
        }
      }
      return prev
    })
  }, [])

  // Tags Rápidos de Cocina
  const handleAddQuickTag = (slotKey: string, tag: string) => {
    setSlotStates((prev) => {
      const current = prev[slotKey]?.notes || ''
      const updated = current.includes(tag) ? current : current ? `${current}, ${tag}` : tag
      return {
        ...prev,
        [slotKey]: {
          ...(prev[slotKey] || { selectedOptions: {} }),
          notes: updated,
        },
      }
    })
  }

  // 4. Validación de Requeridos y Suma de Recargos
  const { isValid, totalExtraCost, missingGroups } = useMemo(() => {
    let valid = true
    let extraCost = 0
    const missing: string[] = []

    configurableSlots.forEach((slot) => {
      const slotData = slotStates[slot.slotKey]
      const selectedMap = slotData?.selectedOptions || {}

      slot.modifierGroups.forEach((group) => {
        const selectedCount = selectedMap[group.id]?.length || 0

        if (group.is_required && selectedCount < group.min_selections) {
          valid = false
          missing.push(`${slot.slotTitle} ➔ ${group.name}`)
        }

        if (selectedMap[group.id]) {
          selectedMap[group.id].forEach((opt) => {
            // El recargo se multiplica por el ratio del slot si es un lote
            extraCost += Number(opt.price_adjustment_usd || 0) * slot.ratio
          })
        }
      })
    })

    return { isValid: valid, totalExtraCost: extraCost, missingGroups: missing }
  }, [configurableSlots, slotStates])

  // Precios Consolidados
  const baseComboPrice = Number(combo?.settings?.combo_price_usd || 0)
  const grandTotalComboUSD = baseComboPrice + totalExtraCost
  const grandTotalComboBs = activeRate > 0 ? grandTotalComboUSD * activeRate : 0

  // 5. Despacho y Empaquetado de Modificadores (Agrupación x2, x3 para WhatsApp y cocina)
  const handleConfirm = () => {
    if (!isValid) {
      setShakeError(true)
      setTimeout(() => setShakeError(false), 500)
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([40, 80, 40])
      return
    }

    const configuredBundleItems = configurableSlots.map((slot) => {
      const slotData = slotStates[slot.slotKey] || { selectedOptions: {}, notes: '' }

      // Agrupa duplicados cuantitativos: [Opt, Opt] ➔ "2x Opt"
      const flatModifiers: FoodSelectedModifier[] = Object.values(slotData.selectedOptions)
        .flat()
        .reduce((acc: any[], opt) => {
          const existing = acc.find((m) => m.optionId === opt.id)
          if (existing) {
            existing.qty += 1
            existing.priceAdjustment += Number(opt.price_adjustment_usd || 0)
            existing.name = `${existing.qty}x ${existing.baseName}`
          } else {
            acc.push({
              optionId: opt.id,
              qty: 1,
              baseName: opt.name,
              name: opt.name,
              priceAdjustment: Number(opt.price_adjustment_usd || 0),
            })
          }
          return acc
        }, [])
        .map((m) => ({
          optionId: m.optionId,
          name: m.name,
          priceAdjustment: m.priceAdjustment,
        }))

      return {
        product: slot.product,
        quantity: slot.ratio,
        variant: null,
        foodModifiers: flatModifiers,
        foodNotes: slotData.notes.trim() !== '' ? slotData.notes : null,
      }
    })

    onConfirm(configuredBundleItems, totalExtraCost)
    onClose()
  }

  if (!isOpen || !combo) return null

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="combo-modal-portal-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="fixed inset-0 z-99999 flex items-end md:items-stretch justify-end bg-neutral-950/50 backdrop-blur-xs transform-gpu font-sans select-none"
          style={themeVariables}
        >
          {/* Backdrop */}
          <div onClick={onClose} className="absolute inset-0 z-0" aria-hidden="true" />

          {/* CAJÓN LATERAL DERECHO (Idéntico a ProductFoodModal) */}
          <motion.div
            key="combo-modal-sheet-panel"
            custom={isDesktop}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              backgroundColor: 'var(--store-surface, #ffffff)',
              color: 'var(--store-text-main, #000000)',
              borderTopLeftRadius: 'var(--radius-card, 32px)',
              borderBottomLeftRadius: isDesktop ? 'var(--radius-card, 32px)' : '0px',
              borderTopRightRadius: isDesktop ? '0px' : 'var(--radius-card, 32px)',
              borderBottomRightRadius: '0px',
            }}
            className={`relative overflow-hidden shadow-2xl z-10 border-l border-[var(--store-border)]/40 will-change-transform flex flex-col ${
              isDesktop ? 'w-full md:w-[680px] lg:w-[740px] xl:w-[780px] h-full' : 'w-full h-[100dvh] max-h-[100dvh]'
            }`}
          >
            {/* Cabecera Estática */}
            <div className="p-5 sm:p-6 pb-4 border-b border-[var(--store-border)]/40 flex items-start justify-between gap-4 shrink-0">
              <div className="min-w-0 flex-1 space-y-1 text-left">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--store-surface-text)] block">
                  Personalización de Paquete / Combo
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-[var(--store-text-main)] tracking-tight leading-tight truncate">
                  {combo.name}
                </h2>
                <div className="flex items-baseline gap-2 pt-0.5">
                  <span className="text-lg sm:text-xl font-mono font-black text-[var(--store-text-main)]">
                    Base: ${baseComboPrice.toFixed(2)}
                  </span>
                  {activeRate > 0 && (
                    <span className="text-xs font-mono text-[var(--store-surface-text)] tabular-nums">
                      Bs. {currencyFormatter.format(baseComboPrice * activeRate)}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar ventana"
                className="w-8 h-8 rounded-full bg-[var(--store-bg)] hover:bg-neutral-200 text-[var(--store-text-main)] flex items-center justify-center transition-transform active:scale-90 shrink-0 cursor-pointer"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Cuerpo con Scroll (Slots de Platos Desglosados) */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-5 sm:p-6 space-y-8 text-left">
              {configurableSlots.map((slot, sIdx) => {
                const slotData = slotStates[slot.slotKey] || { selectedOptions: {}, notes: '' }
                const hasModifiers = slot.modifierGroups.length > 0

                return (
                  <div
                    key={slot.slotKey}
                    className="p-4 sm:p-5 rounded-2xl border transition-all space-y-5"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--store-bg) 40%, var(--store-surface))',
                      borderColor: 'color-mix(in srgb, var(--store-border) 60%, transparent)',
                    }}
                  >
                    {/* Encabezado del Slot / Plato */}
                    <div className="flex items-center gap-3.5">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[var(--store-bg)] border border-[var(--store-border)]/50 shrink-0 shadow-2xs">
                        {slot.product.image_url ? (
                          <Image src={getOptimizedUrl(slot.product.image_url)} alt="" fill sizes="48px" className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-40 text-[var(--store-surface-text)]">
                            <Utensils size={18} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-black text-[var(--store-text-main)] tracking-tight block truncate">
                          {slot.slotTitle}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--store-surface-text)] mt-0.5 block">
                          {hasModifiers ? 'Elige tus preferencias abajo' : 'Componente estándar incluido'}
                        </span>
                      </div>
                    </div>

                    {/* Grupos de Modificadores (Idéntico a ProductFoodModal) */}
                    {hasModifiers && (
                      <div className="space-y-5 pt-2 border-t border-[var(--store-border)]/40">
                        {slot.modifierGroups.map((group, gIdx) => {
                          const currentSelected = slotData.selectedOptions[group.id] || []
                          const selectedCount = currentSelected.length
                          const isSatisfied = !group.is_required || selectedCount >= group.min_selections

                          const isSingleChoice = group.selection_type === 'single' || (!group.selection_type && group.max_selections === 1)
                          const isQuantity = group.selection_type === 'quantity'

                          return (
                            <div key={group.id} className="space-y-3">
                              <div className="flex items-center justify-between border-b border-[var(--store-border)]/30 pb-2 gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-[var(--store-text-main)] text-[var(--store-bg)] flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                                      {gIdx + 1}
                                    </span>
                                    <h4 className="font-bold text-xs sm:text-sm text-[var(--store-text-main)] tracking-tight truncate">
                                      {group.name}
                                    </h4>
                                  </div>

                                  <span className="text-[10px] text-[var(--store-surface-text)] font-medium mt-1 block pl-7">
                                    {isQuantity
                                      ? `Selecciona ${group.min_selections === group.max_selections ? `exactamente ${group.max_selections}` : `hasta ${group.max_selections}`} (Llevas ${selectedCount})`
                                      : isSingleChoice
                                      ? 'Selecciona 1 opción'
                                      : `Selecciona hasta ${group.max_selections} opciones`}
                                  </span>
                                </div>

                                <span
                                  className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 font-mono transition-colors"
                                  style={{
                                    backgroundColor: group.is_required
                                      ? isSatisfied
                                        ? 'color-mix(in srgb, #10b981 12%, var(--store-surface))'
                                        : 'color-mix(in srgb, #f43f5e 12%, var(--store-surface))'
                                      : selectedCount > 0
                                      ? 'color-mix(in srgb, var(--store-primary) 10%, var(--store-surface))'
                                      : 'color-mix(in srgb, var(--store-border) 40%, var(--store-surface))',
                                    color: group.is_required
                                      ? isSatisfied
                                        ? '#059669'
                                        : '#e11d48'
                                      : selectedCount > 0
                                      ? 'var(--store-primary)'
                                      : 'var(--store-surface-text)',
                                  }}
                                >
                                  {group.is_required
                                    ? isSatisfied
                                      ? 'Listo'
                                      : 'Requerido'
                                    : selectedCount > 0
                                    ? `${selectedCount} añadido${selectedCount > 1 ? 's' : ''}`
                                    : 'Opcional'}
                                </span>
                              </div>

                              {/* Opciones con Soporte Cuantitativo y Fotos */}
                              <div className="space-y-2">
                                {group.modifier_options.map((option) => {
                                  const optCount = currentSelected.filter((o) => o.id === option.id).length
                                  const isSelected = isQuantity ? optCount > 0 : Boolean(currentSelected.some((o) => o.id === option.id))
                                  const canIncrement = selectedCount < group.max_selections
                                  const isDisabled = (!isQuantity && !isSelected && !canIncrement) || (isQuantity && !canIncrement && optCount === 0)
                                  const priceExtra = Number(option.price_adjustment_usd || 0)

                                  const handleClickRow = () => {
                                    if (!option.is_available) return
                                    if (isQuantity) {
                                      if (canIncrement) handleIncrementOption(slot.slotKey, group, option)
                                      else if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([20, 40, 20])
                                    } else {
                                      if (!isDisabled) handleToggleOption(slot.slotKey, group, option)
                                    }
                                  }

                                  return (
                                    <div
                                      key={option.id}
                                      onClick={handleClickRow}
                                      className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all select-none ${
                                        !option.is_available
                                          ? 'opacity-40 cursor-not-allowed border-[var(--store-border)]/30 bg-[var(--store-bg)]/40'
                                          : isDisabled && !isSelected
                                          ? 'opacity-60 cursor-not-allowed border-[var(--store-border)]/30 bg-[var(--store-bg)]/20'
                                          : 'cursor-pointer hover:border-[var(--store-primary)]/50 active:scale-[0.99]'
                                      }`}
                                      style={{
                                        backgroundColor: isSelected
                                          ? 'color-mix(in srgb, var(--store-primary) 6%, var(--store-surface))'
                                          : 'var(--store-surface)',
                                        borderColor: isSelected
                                          ? 'var(--store-primary)'
                                          : 'color-mix(in srgb, var(--store-border) 60%, transparent)',
                                      }}
                                    >
                                      <div className="flex items-center gap-3 min-w-0 pr-3">
                                        {!isQuantity && (
                                          <div
                                            className={`w-5 h-5 flex items-center justify-center shrink-0 transition-colors ${
                                              isSingleChoice ? 'rounded-full' : 'rounded-md'
                                            }`}
                                            style={{
                                              borderWidth: '2px',
                                              borderColor: isSelected ? 'var(--store-primary)' : 'var(--store-border)',
                                              backgroundColor: isSelected ? 'var(--store-primary)' : 'transparent',
                                            }}
                                          >
                                            {isSelected &&
                                              (isSingleChoice ? (
                                                <span className="w-2 h-2 rounded-full bg-[var(--store-primary-text)]" />
                                              ) : (
                                                <Check size={12} strokeWidth={3} className="text-[var(--store-primary-text)]" />
                                              ))}
                                          </div>
                                        )}

                                        {option.image_url && (
                                          <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-[var(--store-bg)] border border-[var(--store-border)]/50 shrink-0 shadow-2xs">
                                            <Image src={getOptimizedUrl(option.image_url)} alt={option.name} fill sizes="44px" className="object-cover" />
                                          </div>
                                        )}

                                        <span
                                          className={`text-xs sm:text-sm font-semibold leading-snug truncate ${
                                            isSelected ? 'text-[var(--store-text-main)] font-bold' : 'text-[var(--store-text-main)]/90'
                                          }`}
                                        >
                                          {option.name}
                                        </span>
                                      </div>

                                      {/* Stepper Cuantitativo vs Badge de Precio */}
                                      {isQuantity ? (
                                        <div className="shrink-0 flex items-center gap-2.5 pl-2" onClick={(e) => e.stopPropagation()}>
                                          {priceExtra > 0 && optCount === 0 && (
                                            <span className="text-xs font-bold font-mono text-[var(--store-text-main)]/70">
                                              +${priceExtra.toFixed(2)} c/u
                                            </span>
                                          )}

                                          {optCount > 0 ? (
                                            <div className="flex items-center bg-[var(--store-bg)] border border-[var(--store-border)]/60 rounded-xl p-0.5 shadow-sm">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleDecrementOption(slot.slotKey, group, option)
                                                }}
                                                className="w-8 h-8 flex items-center justify-center text-[var(--store-text-main)] hover:bg-[var(--store-surface)] rounded-lg transition-all active:scale-90"
                                              >
                                                <Minus size={14} strokeWidth={2.5} />
                                              </button>
                                              <span className="w-7 text-center text-xs font-black text-[var(--store-text-main)] tabular-nums">
                                                {optCount}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  if (canIncrement) handleIncrementOption(slot.slotKey, group, option)
                                                }}
                                                disabled={!canIncrement}
                                                className="w-8 h-8 flex items-center justify-center text-[var(--store-text-main)] hover:bg-[var(--store-surface)] rounded-lg transition-all active:scale-90 disabled:opacity-30 disabled:hover:bg-transparent"
                                              >
                                                <Plus size={14} strokeWidth={2.5} />
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                if (canIncrement) handleIncrementOption(slot.slotKey, group, option)
                                              }}
                                              disabled={!canIncrement}
                                              className="w-9 h-9 flex items-center justify-center bg-[var(--store-bg)] border border-[var(--store-border)]/60 hover:border-[var(--store-primary)] hover:text-[var(--store-primary)] rounded-xl text-[var(--store-text-main)] transition-all active:scale-90 disabled:opacity-30 shadow-2xs"
                                            >
                                              <Plus size={16} strokeWidth={2.5} />
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        priceExtra > 0 && (
                                          <div className="shrink-0 text-right pl-2">
                                            <span className="text-xs sm:text-sm font-bold font-mono text-[var(--store-text-main)] bg-[var(--store-bg)] px-2.5 py-1 rounded-lg border border-[var(--store-border)]/40 shadow-2xs">
                                              +${priceExtra.toFixed(2)}
                                            </span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Instrucciones de Cocina y Tags Rápidos por Plato */}
                    <div className="space-y-2.5 pt-2 border-t border-[var(--store-border)]/30">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[var(--store-text-main)]">
                          Nota para cocina ({slot.slotTitle})
                        </label>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {QUICK_KITCHEN_TAGS.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleAddQuickTag(slot.slotKey, tag)}
                            className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-[var(--store-border)] bg-[var(--store-bg)] text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] transition-colors active:scale-95"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>

                      <textarea
                        rows={2}
                        value={slotData.notes}
                        onChange={(e) =>
                          setSlotStates((prev) => ({
                            ...prev,
                            [slot.slotKey]: {
                              ...(prev[slot.slotKey] || { selectedOptions: {} }),
                              notes: e.target.value,
                            },
                          }))
                        }
                        placeholder={`Ej: Término 3/4, salsa de ajo aparte...`}
                        className="w-full bg-[var(--store-bg)] border border-[var(--store-border)] focus:border-[var(--store-text-main)] rounded-xl p-2.5 text-xs font-medium text-[var(--store-text-main)] placeholder:text-[var(--store-surface-text)]/50 outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer Fijo con Totales Dinámicos y Animación de Shake */}
            <div className="shrink-0 bg-[var(--store-surface)] border-t border-[var(--store-border)]/50 px-5 py-3.5 pb-[calc(1rem+env(safe-area-inset-bottom))] z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] space-y-2">
              <AnimatePresence>
                {!isValid && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: 6 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200/60 rounded-xl px-3 py-1.5 flex items-center justify-center gap-1.5 font-mono"
                  >
                    <AlertCircle size={13} className="shrink-0" />
                    <span className="truncate">Falta responder: {missingGroups[0]}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--store-surface-text)]">
                    Total Combo {totalExtraCost > 0 && `(+$${totalExtraCost.toFixed(2)} extras)`}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl sm:text-2xl font-mono font-black text-[var(--store-text-main)]">
                      ${grandTotalComboUSD.toFixed(2)}
                    </span>
                    <span className="text-xs font-mono text-[var(--store-surface-text)]">USD</span>
                  </div>
                  {grandTotalComboBs > 0 && (
                    <span className="text-[10px] font-mono text-[var(--store-surface-text)] tabular-nums mt-0.5">
                      Bs. {currencyFormatter.format(grandTotalComboBs)}
                    </span>
                  )}
                </div>

                <motion.button
                  type="button"
                  animate={shakeError ? { x: [-6, 6, -4, 4, 0] } : {}}
                  transition={{ duration: 0.3 }}
                  onClick={handleConfirm}
                  disabled={!isValid}
                  style={{ borderRadius: 'var(--radius-btn, 9999px)' }}
                  className={`h-12 px-6 transition-all flex items-center justify-center gap-2 border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] select-none shrink-0 ${
                    isValid
                      ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[var(--store-primary)] hover:opacity-95 active:scale-[0.98] cursor-pointer'
                      : 'bg-neutral-100 text-neutral-400 border-neutral-200/80 cursor-not-allowed opacity-60'
                  }`}
                >
                  <ShoppingBag size={16} strokeWidth={2.5} className="shrink-0" />
                  <span className="font-bold text-xs sm:text-sm tracking-tight">
                    {isValid ? 'Agregar al Pedido' : 'Elige Requeridos'}
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}