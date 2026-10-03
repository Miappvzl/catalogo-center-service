// components/admin/FoodModifierManager.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import {
    Plus, Trash2, ChevronDown, ChevronUp, Sparkles, Layers, ImageIcon,
    Loader2, X, Check, AlertCircle, AlertTriangle, CircleDot, CheckSquare,
    Boxes, Flame, Coffee, Ban, Maximize2, PlusCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { getSupabase } from '@/lib/supabase-client'
import { compressImage } from '@/utils/imageOptimizer'
import { getOptimizedUrl } from '@/utils/cdn'
import { NumberInput } from '../NumberInput'

export interface ModifierOption {
    id: string
    name: string
    price_adjustment_usd: number
    is_available: boolean
    image_url?: string | null // 🚀 SOPORTE FOTOGRÁFICO VISUAL
}

export interface ModifierGroup {
    id: string
    name: string
    is_required: boolean
    min_selections: number
    max_selections: number
    selection_type?: 'single' | 'multiple' | 'quantity' // 🚀 NUEVO: Motor Cuantitativo
    modifier_options: ModifierOption[]
}

interface Props {
    groups: ModifierGroup[]
    onChange: (groups: ModifierGroup[]) => void
    tourStep?: number
    isMission2?: boolean
    onPresetAdded?: (type: 'sizes' | 'extras' | 'meat' | 'drinks' | 'exclusions' | 'fillings') => void // 👈 AÑADIDO 'fillings'
}

// 🚀 COMPONENTE FINANCIERO DE PRECISIÓN (BUFFER DE DECIMALES LATAM)
function PriceInput({
    value,
    onChange,
    placeholder = "0,00",
    className
}: {
    value: number
    onChange: (val: number) => void
    placeholder?: string
    className?: string
}) {
    // Convierte el número entrante a string con coma (si es 0, lo dejamos vacío para ver el placeholder)
    const formatNumberToView = (num: number) => (num === 0 ? '' : num.toString().replace('.', ','))
    const [localText, setLocalText] = useState(() => formatNumberToView(value))
    const isTypingRef = useRef(false)

    // Sincronizar desde la base de datos SOLO si el usuario NO está escribiendo activamente
    useEffect(() => {
        if (!isTypingRef.current) {
            setLocalText(formatNumberToView(value))
        }
    }, [value])

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let raw = e.target.value

        // 1. Si escribe punto, convertirlo a coma al instante
        raw = raw.replace(/\./g, ',')

        // 2. Si escribe coma al inicio (ej: ",5"), auto-completar a "0,"
        if (raw === ',') raw = '0,'

        // 3. Permitir solo números y una única coma
        raw = raw.replace(/[^0-9,]/g, '')
        const parts = raw.split(',')
        if (parts.length > 2) {
            raw = parts[0] + ',' + parts.slice(1).join('')
        }

        // 4. Bloquear a máximo 2 decimales
        if (parts[1] && parts[1].length > 2) {
            raw = parts[0] + ',' + parts[1].slice(0, 2)
        }

        // 5. El texto visual se actualiza SIN INTERRUPCIONES (mantiene "0,", "5,", etc.)
        setLocalText(raw)

        // 6. Enviamos el valor numérico al padre
        const numericVal = parseFloat(raw.replace(',', '.'))
        onChange(isNaN(numericVal) ? 0 : numericVal)
    }

    const handleBlur = () => {
        isTypingRef.current = false
        const numericVal = parseFloat(localText.replace(',', '.'))
        if (isNaN(numericVal) || numericVal === 0) {
            setLocalText('')
            onChange(0)
        } else {
            // Al salir, formateamos limpio (ej: "5" se queda "5" o "5,5")
            setLocalText(numericVal.toString().replace('.', ','))
            onChange(numericVal)
        }
    }

    return (
        <input
            type="text"
            inputMode="decimal"
            value={localText}
            placeholder={placeholder}
            onFocus={() => { isTypingRef.current = true }}
            onBlur={handleBlur}
            onChange={handleTextChange}
            className={className}
        />
    )
}

export default function FoodModifierManager({ groups, onChange, tourStep, isMission2, onPresetAdded }: Props) {
    const supabase = getSupabase()
    const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
    const [uploadingOptionId, setUploadingOptionId] = useState<string | null>(null)

    // --- SUBIDA Y COMPRESIÓN DE FOTO DE MODIFICADOR ---
    const handleOptionImageUpload = async (groupId: string, optionId: string, file: File) => {
        if (!file.type.startsWith('image/')) return
        setUploadingOptionId(optionId)
        try {
            // Comprime a 400px en alta resolución (ideal para miniaturas de comida)
            const compressed = await compressImage(file, 400, 0.8)
            const fileName = `mod-opt-${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`
            const { error: uploadError } = await supabase.storage.from('variants').upload(fileName, compressed)
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName)
            updateOption(groupId, optionId, { image_url: publicUrl })
        } catch (err) {
            console.error('Error cargando foto del modificador:', err)
        } finally {
            setUploadingOptionId(null)
        }
    }

    // --- PLANTILLAS PREDEFINIDAS ---
    const addPreset = (type: 'sizes' | 'meat' | 'extras' | 'drinks' | 'exclusions' | 'fillings') => {
        let newGroup: ModifierGroup

        if (type === 'sizes') {
            newGroup = {
                id: `temp-group-sizes-${Date.now()}`,
                name: 'Tamaño de la Pizza / Porción',
                is_required: true,
                min_selections: 1,
                max_selections: 1,
                modifier_options: [
                    { id: `temp-opt-s1`, name: 'Mediana (8 Porciones)', price_adjustment_usd: 0, is_available: true, image_url: null },
                    { id: `temp-opt-s2`, name: 'Grande (10 Porciones)', price_adjustment_usd: 3.5, is_available: true, image_url: null },
                    { id: `temp-opt-s3`, name: 'Familiar (12 Porciones)', price_adjustment_usd: 6.0, is_available: true, image_url: null },
                ]
            }
        }

        // 🚀 NUEVA PLANTILLA: RELLENOS Y SABORES (PRE-CONFIGURADO EN MODO SURTIDO CUANTITATIVO)
        else if (type === 'fillings') {
            newGroup = {
                id: `temp-group-fillings-${Date.now()}`,
                name: 'Elige los Rellenos / Sabores',
                is_required: true,
                selection_type: 'quantity',
                min_selections: 5,
                max_selections: 5,
                modifier_options: [
                    { id: `temp-opt-f1`, name: 'Queso', price_adjustment_usd: 0, is_available: true, image_url: null },
                    { id: `temp-opt-f2`, name: 'Carne Mechada', price_adjustment_usd: 0, is_available: true, image_url: null },
                    { id: `temp-opt-f3`, name: 'Pollo', price_adjustment_usd: 0, is_available: true, image_url: null },
                    { id: `temp-opt-f4`, name: 'Arequipe / Dulce de Leche', price_adjustment_usd: 0.5, is_available: true, image_url: null },
                    { id: `temp-opt-f5`, name: 'Chocolate', price_adjustment_usd: 0.5, is_available: true, image_url: null },
                ]
            }
        } else if (type === 'extras') {
            newGroup = {
                id: `temp-group-extras-${Date.now()}`,
                name: 'Extras y Toppings Adicionales',
                is_required: false,
                min_selections: 0,
                max_selections: 5,
                modifier_options: [
                    { id: `temp-opt-e1`, name: 'Extra Queso Mozzarella', price_adjustment_usd: 1.5, is_available: true, image_url: null },
                    { id: `temp-opt-e2`, name: 'Tocineta Ahumada', price_adjustment_usd: 2.0, is_available: true, image_url: null },
                    { id: `temp-opt-e3`, name: 'Borde Relleno de Queso', price_adjustment_usd: 2.5, is_available: true, image_url: null },
                ]
            }
        } else if (type === 'meat') {
            newGroup = {
                id: `temp-group-meat-${Date.now()}`,
                name: 'Término de la Carne',
                is_required: true,
                min_selections: 1,
                max_selections: 1,
                modifier_options: [
                    { id: `temp-opt-m1`, name: 'Término Medio', price_adjustment_usd: 0, is_available: true, image_url: null },
                    { id: `temp-opt-m2`, name: 'Tres Cuartos', price_adjustment_usd: 0, is_available: true, image_url: null },
                    { id: `temp-opt-m3`, name: 'Bien Cocido', price_adjustment_usd: 0, is_available: true, image_url: null },
                ]
            }
        } else if (type === 'drinks') {
            newGroup = {
                id: `temp-group-drinks-${Date.now()}`,
                name: 'Bebida del Combo',
                is_required: true,
                min_selections: 1,
                max_selections: 1,
                modifier_options: [
                    { id: `temp-opt-d1`, name: 'Coca-Cola Clásica', price_adjustment_usd: 0, is_available: true, image_url: null },
                    { id: `temp-opt-d2`, name: 'Té Frío de la Casa', price_adjustment_usd: 0, is_available: true, image_url: null },
                    { id: `temp-opt-d3`, name: 'Cerveza Nacional (+ $1.50)', price_adjustment_usd: 1.5, is_available: true, image_url: null },
                ]
            }
        } else {
            newGroup = {
                id: `temp-group-exc-${Date.now()}`,
                name: 'Personalización (Remover)',
                is_required: false,
                min_selections: 0,
                max_selections: 10,
                modifier_options: [
                    { id: `temp-opt-x1`, name: 'Sin Cebolla', price_adjustment_usd: 0, is_available: true, image_url: null },
                    { id: `temp-opt-x2`, name: 'Sin Pepinillos', price_adjustment_usd: 0, is_available: true, image_url: null },
                    { id: `temp-opt-x3`, name: 'Salsas Aparte', price_adjustment_usd: 0, is_available: true, image_url: null },
                ]
            }
        }

        onChange([...groups, newGroup])
        setExpandedGroupId(newGroup.id)
        if (onPresetAdded) onPresetAdded(type)
    }

    const addEmptyGroup = () => {
        const newGroup: ModifierGroup = {
            id: `temp-group-${crypto.randomUUID()}`,
            name: '',
            is_required: false,
            min_selections: 0,
            max_selections: 1,
            selection_type: 'single', // 🚀 NUEVO: Valor seguro por defecto
            modifier_options: []
        }
        onChange([...groups, newGroup])
        setExpandedGroupId(newGroup.id)
    }

    const updateGroup = (groupId: string, fields: Partial<ModifierGroup>) => {
        onChange(groups.map(g => g.id === groupId ? { ...g, ...fields } : g))
    }

    const removeGroup = (groupId: string) => {
        onChange(groups.filter(g => g.id !== groupId))
    }

    const addOption = (groupId: string) => {
        const newOption: ModifierOption = {
            id: `temp-opt-${crypto.randomUUID()}`,
            name: '',
            price_adjustment_usd: 0,
            is_available: true,
            image_url: null
        }
        onChange(groups.map(g => {
            if (g.id === groupId) {
                return { ...g, modifier_options: [...g.modifier_options, newOption] }
            }
            return g
        }))
    }

    const updateOption = (groupId: string, optionId: string, fields: Partial<ModifierOption>) => {
        onChange(groups.map(g => {
            if (g.id === groupId) {
                return {
                    ...g,
                    modifier_options: g.modifier_options.map(o => o.id === optionId ? { ...o, ...fields } : o)
                }
            }
            return g
        }))
    }

    const removeOption = (groupId: string, optionId: string) => {
        onChange(groups.map(g => {
            if (g.id === groupId) {
                return { ...g, modifier_options: g.modifier_options.filter(o => o.id !== optionId) }
            }
            return g
        }))
    }

    // 🚀 ELITE: Auditoría estricta en tiempo real de campos indispensables
    const auditGroupIntegrity = (group: ModifierGroup) => {
        const issues: string[] = []
        if (!group.name.trim()) issues.push('Falta el título de la pregunta')
        if (group.modifier_options.length === 0) {
            issues.push('Añade al menos 1 opción')
        } else {
            const emptyOptions = group.modifier_options.filter(o => !o.name.trim()).length
            if (emptyOptions > 0) {
                issues.push(`${emptyOptions} ${emptyOptions === 1 ? 'opción sin nombre' : 'opciones sin nombre'}`)
            }
        }
        return {
            isValid: issues.length === 0,
            primaryIssue: issues[0] || null,
            allIssues: issues
        }
    }

    return (
        <div className="space-y-6">
            {/* CABECERA Y PLANTILLAS RÁPIDAS */}
            <div className="bg-neutral-50/70 border border-neutral-200/80 p-4 sm:p-5 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h4 className="text-xs font-black text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles size={15} className="text-amber-500 fill-amber-500" />
                            <span>Personalizaciones de Comida</span>
                        </h4>
                        <p className="text-xs text-neutral-600 font-medium mt-0.5">
                            Preguntas que el comensal responderá al pedir (ej. rellenos, tamaños, ingredientes extra).
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={addEmptyGroup}
                        className="bg-neutral-950 text-white px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-black transition-all flex items-center justify-center gap-1.5 shadow-xs shrink-0 active:scale-95"
                    >
                        <Plus size={14} strokeWidth={3} />
                        Crear Grupo en Blanco
                    </button>
                </div>

                {/* BOTONES DE 1-CLIC CON ICONOS VECTORIALES (SIN EMOJIS) */}
                <div id="tour-modifier-presets" className="pt-3 border-t border-neutral-200/70 scroll-mt-28 md:scroll-mt-32">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-2 font-mono">
                        Plantillas recomendadas (Haz clic para insertar):
                    </span>
                    <div className="flex flex-wrap gap-2 items-center">
                        {/* 🚀 NUEVO PRESET DE RELLENOS */}
                        <button
                            type="button"
                            onClick={() => addPreset('fillings')}
                            className="bg-white border border-neutral-200 hover:border-neutral-900 px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-800 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                        >
                            <Boxes size={13} className="text-amber-600" />
                            <span>Rellenos / Sabores</span>
                        </button>

                        <button
                            type="button"
                            id="tour-preset-sizes-btn"
                            onClick={() => addPreset('sizes')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 bg-white border cursor-pointer ${isMission2 && tourStep === 1
                                ? 'relative z-60 border-neutral-900 text-neutral-950 shadow-[0_0_0_2px_rgba(0,0,0,0.8),0_12px_30px_rgba(0,0,0,0.25)] scale-105 ring-4 ring-neutral-900/15'
                                : 'border-neutral-200 text-neutral-800 shadow-2xs hover:border-neutral-900 hover:bg-neutral-50'
                                }`}
                        >
                            <Maximize2 size={13} className="text-neutral-600" />
                            <span>Tamaño / Porción</span>
                        </button>

                        <button
                            type="button"
                            id="tour-preset-extras-btn"
                            onClick={() => addPreset('extras')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 bg-white border cursor-pointer ${isMission2 && tourStep === 3
                                ? 'relative z-60 border-neutral-900 text-neutral-950 shadow-[0_0_0_2px_rgba(0,0,0,0.8),0_12px_30px_rgba(0,0,0,0.25)] scale-105 ring-4 ring-neutral-900/15'
                                : 'border-neutral-200 text-neutral-800 shadow-2xs hover:border-neutral-900 hover:bg-neutral-50'
                                }`}
                        >
                            <PlusCircle size={13} className="text-emerald-600" />
                            <span>Extras / Toppings</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => addPreset('meat')}
                            className="bg-white border border-neutral-200 hover:border-neutral-900 px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-800 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                        >
                            <Flame size={13} className="text-rose-600" />
                            <span>Término de Carne</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => addPreset('drinks')}
                            className="bg-white border border-neutral-200 hover:border-neutral-900 px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-800 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                        >
                            <Coffee size={13} className="text-sky-600" />
                            <span>Bebida del Combo</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => addPreset('exclusions')}
                            className="bg-white border border-neutral-200 hover:border-neutral-900 px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-800 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                        >
                            <Ban size={13} className="text-neutral-400" />
                            <span>Remover Ingredientes</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* LISTA DE GRUPOS CONFIGURADOS */}
            <div className="space-y-4">
                <AnimatePresence>
                    {groups.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-xl bg-white flex flex-col items-center justify-center p-6 space-y-2">
                            <Layers size={28} className="text-neutral-300" />
                            <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider">No has añadido opciones a este plato</p>
                            <p className="text-xs text-neutral-500 max-w-sm">
                                Haz clic en una de las plantillas rápidas de arriba para crear tus primeros tamaños, rellenos o ingredientes.
                            </p>
                        </div>
                    ) : (
                        groups.map((group, idx) => {
                            // 🚀 DECLARACIÓN DE VARIABLES DE ESTADO DEL GRUPO
                            const isSingleChoice = group.selection_type === 'single' || (!group.selection_type && group.max_selections === 1);
                            const isQuantity = group.selection_type === 'quantity'; // 👈 ESTA ERA LA VARIABLE QUE FALTABA
                            const isSizesGroup = group.name.toLowerCase().includes('tamaño') || group.id.includes('sizes');
                            const isExtrasGroup = group.name.toLowerCase().includes('extras') || group.id.includes('extras');

                            const isExpanded = expandedGroupId === group.id ||
                                (isMission2 && ((tourStep === 2 && isSizesGroup) || (tourStep === 4 && isExtrasGroup)));

                            return (
                                <motion.div
                                    key={group.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className="bg-white border-2 border-neutral-200/80 rounded-xl overflow-hidden shadow-xs transition-colors"
                                >
                                    {/* CABECERA DEL GRUPO */}
                                    <div
                                        onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                                        className="p-3.5 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-neutral-50/50 transition-colors select-none"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-bold text-xs sm:text-sm text-neutral-900 truncate">
                                                        {group.name || <span className="text-rose-500 font-semibold italic">¿Qué pregunta harás al comensal?</span>}
                                                    </span>

                                                    {/* 🚀 BADGE DE AUDITORÍA: Guía estricta antes de guardar */}
                                                    {(() => {
                                                        const audit = auditGroupIntegrity(group);
                                                        if (!audit.isValid) {
                                                            return (
                                                                <span className="bg-amber-100 border border-amber-300 text-amber-900 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs animate-pulse">
                                                                    <AlertTriangle size={10} className="text-amber-700" />
                                                                    <span>Incompleto: {audit.primaryIssue}</span>
                                                                </span>
                                                            );
                                                        }
                                                        return group.is_required ? (
                                                            <span className="bg-rose-100 text-rose-800 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                                                                Obligatorio
                                                            </span>
                                                        ) : (
                                                            <span className="bg-neutral-100 text-neutral-600 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                                                                Opcional
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                {/* 🚀 ELITE: Resumen inteligente que incluye el modo Contador */}
                                                <p className="text-[11px] text-neutral-500 font-medium mt-0.5 truncate">
                                                    {group.selection_type === 'quantity'
                                                        ? `🔢 Surtido por cantidad (Min: ${group.min_selections} - Max: ${group.max_selections})`
                                                        : group.selection_type === 'multiple' || (!group.selection_type && !isSingleChoice)
                                                            ? `☑️ Múltiple (Hasta ${group.max_selections})`
                                                            : '🔘 Selección Única'
                                                    } • {group.modifier_options.length} opciones
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); removeGroup(group.id); }}
                                                className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="Eliminar este grupo"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                            <div className="p-1.5 text-neutral-500">
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* PANEL DE EDICIÓN DEL GRUPO */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-neutral-200/80 bg-neutral-50/40 p-4 sm:p-5 space-y-5"
                                            >
                                                {/* 1. NOMBRE DEL GRUPO */}
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider block">
                                                            Título de la pregunta para el cliente *
                                                        </label>
                                                        {!group.name.trim() && (
                                                            <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1 font-mono">
                                                                <AlertCircle size={11} /> Campo obligatorio
                                                            </span>
                                                        )}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={group.name}
                                                        onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                                                        placeholder="Ej: ¿Qué relleno deseas?, Elige tus extras..."
                                                        className={`w-full rounded-lg px-3.5 py-2 text-xs font-bold text-neutral-900 outline-none transition-all shadow-xs ${!group.name.trim()
                                                            ? 'bg-rose-50/30 border-2 border-rose-300 focus:border-rose-500 placeholder:text-rose-300'
                                                            : 'bg-white border border-neutral-300 focus:border-neutral-950'
                                                            }`}
                                                    />
                                                </div>

                                                {/* 🚀 2. REGLAS DE SERVICIO: SELECTOR HORIZONTAL DE 3 VÍAS + BARRA CONTEXTUAL */}
                                                <div
                                                    id={isExtrasGroup ? 'tour-modifier-rules-extras' : `tour-modifier-rules-${idx}`}
                                                    className={`bg-white p-3.5 sm:p-4 rounded-xl border border-neutral-200/80 space-y-3.5 transition-all scroll-mt-28 md:scroll-mt-32 ${isMission2 && tourStep === 4 && isExtrasGroup
                                                        ? 'relative z-60 shadow-[0_0_0_2px_rgba(0,0,0,0.8),0_12px_30px_rgba(0,0,0,0.25)] ring-4 ring-neutral-900/15 pointer-events-auto'
                                                        : ''
                                                        }`}
                                                >
                                                    <div>
                                                        <span className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block font-mono">
                                                            ¿Cómo debe elegir el comensal?
                                                        </span>
                                                        <span className="text-[11px] text-neutral-500 font-medium">
                                                            Selecciona la regla de servicio para este paso del pedido.
                                                        </span>
                                                    </div>

                                                    {/* SELECTOR HORIZONTAL DE 3 TARJETAS CON ICONOS VECTORIALES (SIN EMOJIS) */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                        {/* TARJETA 1: 1 SOLO */}
                                                        <button
                                                            type="button"
                                                            onClick={() => updateGroup(group.id, {
                                                                selection_type: 'single',
                                                                max_selections: 1,
                                                                min_selections: group.is_required ? 1 : 0
                                                            })}
                                                            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${isSingleChoice
                                                                ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs ring-1 ring-neutral-950'
                                                                : 'bg-neutral-50/60 hover:bg-neutral-100/70 border-neutral-200 text-neutral-800'
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between w-full mb-2">
                                                                <span className="text-xs font-bold flex items-center gap-1.5">
                                                                    <CircleDot size={13} className={isSingleChoice ? "text-white" : "text-neutral-700"} />
                                                                    <span>1 Solo</span>
                                                                </span>
                                                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${isSingleChoice
                                                                    ? 'bg-white border-white text-neutral-950 shadow-2xs'
                                                                    : 'bg-white/80 border-neutral-300 text-transparent'
                                                                    }`}>
                                                                    <Check size={11} strokeWidth={3.5} className={isSingleChoice ? 'opacity-100' : 'opacity-0'} />
                                                                </div>
                                                            </div>
                                                            <p className={`text-[10px] leading-snug font-medium ${isSingleChoice ? 'text-neutral-300' : 'text-neutral-500'}`}>
                                                                Elige solo una opción (ej: término de carne, tamaño o bebida).
                                                            </p>
                                                        </button>

                                                        {/* TARJETA 2: VARIOS LIBRES */}
                                                        <button
                                                            type="button"
                                                            onClick={() => updateGroup(group.id, {
                                                                selection_type: 'multiple',
                                                                max_selections: Math.max(2, group.max_selections === 1 ? 5 : group.max_selections),
                                                                min_selections: group.is_required ? 1 : 0
                                                            })}
                                                            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${group.selection_type === 'multiple' || (!group.selection_type && !isSingleChoice && !isQuantity)
                                                                ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs ring-1 ring-neutral-950'
                                                                : 'bg-neutral-50/60 hover:bg-neutral-100/70 border-neutral-200 text-neutral-800'
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between w-full mb-2">
                                                                <span className="text-xs font-bold flex items-center gap-1.5">
                                                                    <CheckSquare size={13} className={group.selection_type === 'multiple' ? "text-white" : "text-neutral-700"} />
                                                                    <span>Varios Libres</span>
                                                                </span>
                                                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${group.selection_type === 'multiple' || (!group.selection_type && !isSingleChoice && !isQuantity)
                                                                    ? 'bg-white border-white text-neutral-950 shadow-2xs'
                                                                    : 'bg-white/80 border-neutral-300 text-transparent'
                                                                    }`}>
                                                                    <Check size={11} strokeWidth={3.5} className={group.selection_type === 'multiple' || (!group.selection_type && !isSingleChoice && !isQuantity) ? 'opacity-100' : 'opacity-0'} />
                                                                </div>
                                                            </div>
                                                            <p className={`text-[10px] leading-snug font-medium ${group.selection_type === 'multiple' || (!group.selection_type && !isSingleChoice && !isQuantity) ? 'text-neutral-300' : 'text-neutral-500'}`}>
                                                                Adicionales acumulables con checkbox (ej: salsas, queso extra).
                                                            </p>
                                                        </button>

                                                        {/* TARJETA 3: SURTIDO / CANTIDADES */}
                                                        <button
                                                            type="button"
                                                            onClick={() => updateGroup(group.id, {
                                                                selection_type: 'quantity',
                                                                max_selections: Math.max(2, group.max_selections === 1 ? 10 : group.max_selections),
                                                                min_selections: group.is_required ? (group.min_selections || 1) : 0
                                                            })}
                                                            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${isQuantity
                                                                ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs ring-1 ring-neutral-950'
                                                                : 'bg-neutral-50/60 hover:bg-neutral-100/70 border-neutral-200 text-neutral-800'
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between w-full mb-2">
                                                                <span className="text-xs font-bold flex items-center gap-1.5">
                                                                    <Boxes size={13} className={isQuantity ? "text-white" : "text-neutral-700"} />
                                                                    <span>Surtido / Cupos</span>
                                                                </span>
                                                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${isQuantity
                                                                    ? 'bg-white border-white text-neutral-950 shadow-2xs'
                                                                    : 'bg-white/80 border-neutral-300 text-transparent'
                                                                    }`}>
                                                                    <Check size={11} strokeWidth={3.5} className={isQuantity ? 'opacity-100' : 'opacity-0'} />
                                                                </div>
                                                            </div>
                                                            <p className={`text-[10px] leading-snug font-medium ${isQuantity ? 'text-neutral-300' : 'text-neutral-500'}`}>
                                                                Reparte unidades con botones [ - 0 + ] (ej: cajas de empanadas o buñuelos).
                                                            </p>
                                                        </button>
                                                    </div>

                                                    {/* BARRA DE REGLAS CONTEXTUALES (CON CHECKBOX SUAVE Y ROJO EDITORIAL) */}
                                                    <div className="bg-neutral-50/80 border border-neutral-200/70 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        {/* REGLA OBLIGATORIA CON CHECKBOX SUAVE */}
                                                        <div className="flex items-center justify-between sm:justify-start gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const willBeRequired = !group.is_required;
                                                                    updateGroup(group.id, {
                                                                        is_required: willBeRequired,
                                                                        min_selections: willBeRequired ? (isQuantity && group.min_selections === group.max_selections ? group.max_selections : 1) : 0
                                                                    });
                                                                }}
                                                                className="flex items-center gap-2 cursor-pointer select-none group/chk py-0.5 outline-none"
                                                            >
                                                                {/* 🚀 CHECKBOX ESTILIZADO (COHERENTE CON EL RESTO DEL SISTEMA) */}
                                                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${group.is_required
                                                                    ? 'bg-neutral-950 border-neutral-950 text-white shadow-2xs'
                                                                    : 'bg-white border-neutral-300 group-hover/chk:border-neutral-400'
                                                                    }`}>
                                                                    {group.is_required && <Check size={11} strokeWidth={3.5} className="animate-in zoom-in-50 duration-150" />}
                                                                </div>
                                                                <span className="text-xs font-bold text-neutral-800 leading-none">
                                                                    Paso obligatorio para ordenar
                                                                </span>
                                                            </button>
                                                            <span className="text-[10px] text-neutral-400 font-medium hidden sm:inline">
                                                                {group.is_required ? '(El comensal no puede saltar este paso)' : '(Opcional)'}
                                                            </span>
                                                        </div>

                                                        {/* REGLAS ESPECÍFICAS SEGÚN MODO */}
                                                        {group.selection_type === 'multiple' && (
                                                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                                                <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider font-mono">
                                                                    Límite máximo:
                                                                </span>
                                                                <NumberInput
                                                                    min="1"
                                                                    value={group.max_selections}
                                                                    onChangeValue={(v) => updateGroup(group.id, { max_selections: Math.max(1, Number(v)) })}
                                                                    className="w-14 bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center shadow-2xs"
                                                                />
                                                            </div>
                                                        )}

                                                        {isQuantity && (
                                                            <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider font-mono">
                                                                        Cupo del Combo:
                                                                    </span>
                                                                    <NumberInput
                                                                        min="1"
                                                                        value={group.max_selections}
                                                                        onChangeValue={(v) => {
                                                                            const newMax = Math.max(1, Number(v));
                                                                            const isExact = group.min_selections === group.max_selections;
                                                                            updateGroup(group.id, {
                                                                                max_selections: newMax,
                                                                                min_selections: isExact ? newMax : group.min_selections
                                                                            });
                                                                        }}
                                                                        className="w-14 bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center shadow-2xs"
                                                                    />
                                                                </div>

                                                                <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1 rounded-lg border border-neutral-200 text-[10px] font-bold text-neutral-700 hover:border-neutral-900 transition-colors">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={group.min_selections === group.max_selections}
                                                                        onChange={(e) => {
                                                                            const forceExact = e.target.checked;
                                                                            updateGroup(group.id, {
                                                                                min_selections: forceExact ? group.max_selections : (group.is_required ? 1 : 0)
                                                                            });
                                                                        }}
                                                                        className="accent-neutral-950 rounded w-3.5 h-3.5"
                                                                    />
                                                                    <span>Caja cerrada ({group.max_selections} exactas)</span>
                                                                </label>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* PREVISUALIZACIÓN CLARA DE LA COMANDA (EL EFECTO AHA!) */}
                                                    <div className="pt-1 px-1 flex items-center gap-1.5 text-[10px] text-neutral-500 font-medium">
                                                        <Sparkles size={12} className="text-amber-500 shrink-0" />
                                                        {isQuantity ? (
                                                            <span>En comanda / WhatsApp saldrá como: <strong className="text-neutral-900 font-mono">1x {group.name || 'Combo'} (4x Opción A, 6x Opción B)</strong></span>
                                                        ) : isSingleChoice ? (
                                                            <span>En comanda / WhatsApp saldrá como: <strong className="text-neutral-900 font-mono">1x {group.name || 'Plato'} ({group.modifier_options[0]?.name || 'Opción elegida'})</strong></span>
                                                        ) : (
                                                            <span>En comanda / WhatsApp saldrá como: <strong className="text-neutral-900 font-mono">+ Extras: {group.modifier_options.slice(0, 2).map(o => o.name).filter(Boolean).join(', ') || 'Extra 1, Extra 2'}</strong></span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 3. LISTADO DE OPCIONES / INGREDIENTES CON SOPORTE VISUAL */}
                                                <div
                                                    id={isSizesGroup ? 'tour-modifier-options-sizes' : `tour-modifier-options-${idx}`}
                                                    className={`space-y-2.5 pt-1 transition-all scroll-mt-28 md:scroll-mt-32 ${isMission2 && tourStep === 2 && isSizesGroup
                                                        ? 'relative z-[60] bg-white shadow-[0_0_0_2px_rgba(0,0,0,0.8),0_12px_30px_rgba(0,0,0,0.25)] ring-4 ring-neutral-900/15 p-3 rounded-xl pointer-events-auto'
                                                        : ''
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider">
                                                            Opciones de este grupo ({group.modifier_options.length})
                                                        </label>
                                                        <span className="text-[10px] text-neutral-500 font-mono">
                                                            Coloca $0 si es gratis
                                                        </span>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {group.modifier_options.map((opt, optIdx) => {
                                                            const isFree = Number(opt.price_adjustment_usd || 0) === 0;

                                                            return (
                                                                <div
                                                                    key={opt.id}
                                                                    className={`p-2 sm:p-2.5 rounded-xl border transition-all space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2.5 ${opt.is_available
                                                                            ? 'bg-white border-neutral-200/90 shadow-2xs hover:border-neutral-300'
                                                                            : 'bg-neutral-100/70 border-neutral-200 opacity-60'
                                                                        }`}
                                                                >
                                                                    {/* LADO IZQUIERDO: Switch Activo + Miniatura + Nombre con Botón 'X' */}
                                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                        {/* Switch Activo / Agotado */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => updateOption(group.id, opt.id, { is_available: !opt.is_available })}
                                                                            className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-colors shrink-0 cursor-pointer ${opt.is_available
                                                                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                                                                                    : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
                                                                                }`}
                                                                        >
                                                                            {opt.is_available ? 'Activo' : 'Agotado'}
                                                                        </button>

                                                                        {/* Miniatura de Foto */}
                                                                        <div className="relative shrink-0">
                                                                            <input
                                                                                type="file"
                                                                                id={`file-opt-${group.id}-${opt.id}`}
                                                                                className="hidden"
                                                                                accept="image/*"
                                                                                onChange={(e) => e.target.files && handleOptionImageUpload(group.id, opt.id, e.target.files[0])}
                                                                            />

                                                                            {opt.image_url ? (
                                                                                <div className="relative w-8 h-8 rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50 group/img shrink-0">
                                                                                    <Image
                                                                                        src={getOptimizedUrl(opt.image_url)}
                                                                                        alt={opt.name || "Opción"}
                                                                                        fill
                                                                                        sizes="32px"
                                                                                        className="object-cover"
                                                                                    />
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => updateOption(group.id, opt.id, { image_url: null })}
                                                                                        className="absolute inset-0 bg-neutral-950/70 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer"
                                                                                        title="Eliminar foto"
                                                                                    >
                                                                                        <X size={12} strokeWidth={2.5} />
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => document.getElementById(`file-opt-${group.id}-${opt.id}`)?.click()}
                                                                                    disabled={uploadingOptionId === opt.id}
                                                                                    className="w-8 h-8 rounded-lg border border-dashed border-neutral-300 hover:border-neutral-900 bg-neutral-50 hover:bg-white flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors shrink-0 cursor-pointer"
                                                                                    title="Añadir foto"
                                                                                >
                                                                                    {uploadingOptionId === opt.id ? (
                                                                                        <Loader2 size={12} className="animate-spin text-neutral-600" />
                                                                                    ) : (
                                                                                        <ImageIcon size={13} strokeWidth={2} />
                                                                                    )}
                                                                                </button>
                                                                            )}
                                                                        </div>

                                                                        {/* 🚀 NOMBRE CON BOTÓN 'X' DE VACIADO RÁPIDO */}
                                                                        <div className="flex-1 min-w-0 relative flex items-center">
                                                                            <input
                                                                                type="text"
                                                                                value={opt.name}
                                                                                onChange={(e) => updateOption(group.id, opt.id, { name: e.target.value })}
                                                                                placeholder={`Escribe el nombre (Ej: Queso, Pollo...) *`}
                                                                                className={`w-full bg-transparent border-none text-xs font-bold outline-none pl-1 pr-6 transition-colors ${!opt.name.trim()
                                                                                        ? 'placeholder:text-rose-300/70 text-rose-800'
                                                                                        : 'text-neutral-900 placeholder:text-neutral-400'
                                                                                    }`}
                                                                            />

                                                                            {/* Botón X para borrar el nombre al instante */}
                                                                            {opt.name.trim() !== '' ? (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => updateOption(group.id, opt.id, { name: '' })}
                                                                                    className="absolute right-1 text-neutral-300 hover:text-neutral-700 p-0.5 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
                                                                                    title="Borrar nombre"
                                                                                >
                                                                                    <X size={12} strokeWidth={2.5} />
                                                                                </button>
                                                                            ) : (
                                                                                <span className="text-[8px] font-bold text-rose-800/80 bg-rose-50/70 border border-rose-200/50 px-1.5 py-0.2 rounded shrink-0 font-mono">
                                                                                    Requerido
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                  {/* LADO DERECHO: Precio con PriceInput Flotante + Reset 'X' + Papelera */}
            <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-neutral-100 shrink-0">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border shrink-0 transition-colors ${
                    isFree
                        ? 'bg-neutral-50/80 border-neutral-200/70 focus-within:bg-white focus-within:border-neutral-900'
                        : 'bg-amber-50/40 border-amber-200/80 focus-within:bg-white focus-within:border-amber-400'
                }`}>
                    <span className="text-[10px] font-bold text-neutral-400 font-mono">+$</span>
                    
                    {/* 🚀 NUEVO MOTOR DE PRECIOS SIN BLOQUEOS */}
                    <PriceInput
                        value={opt.price_adjustment_usd || 0}
                        onChange={(numVal) => updateOption(group.id, opt.id, { price_adjustment_usd: numVal })}
                        placeholder="0,00"
                        className="w-14 bg-transparent border-none text-xs font-mono font-bold text-neutral-900 outline-none text-right placeholder:text-neutral-300"
                    />

                    {/* Botón X para resetear a $0 (Incluido) */}
                    {!isFree && (
                        <button
                            type="button"
                            onClick={() => updateOption(group.id, opt.id, { price_adjustment_usd: 0 })}
                            className="text-neutral-400 hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer"
                            title="Restablecer a Incluido ($0)"
                        >
                            <X size={11} strokeWidth={2.5} />
                        </button>
                    )}

                    <span className={`text-[9px] font-mono font-bold uppercase ${
                        isFree ? 'text-neutral-400' : 'text-amber-800'
                    }`}>
                        {isFree ? 'Incluido' : 'USD'}
                    </span>
                </div>

                {/* Papelera para eliminar toda la fila */}
                <button
                    type="button"
                    onClick={() => removeOption(group.id, opt.id)}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                    title="Eliminar opción"
                >
                    <Trash2 size={13} />
                </button>
            </div>

                                                                </div>
                                                            );
                                                        })}

                                                        <button
                                                            type="button"
                                                            onClick={() => addOption(group.id)}
                                                            className="w-full py-2.5 border-2 border-dashed border-neutral-300 hover:border-neutral-950 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-950 hover:bg-white transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                                                        >
                                                            <Plus size={13} strokeWidth={2.5} />
                                                            Agregar otra opción
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}