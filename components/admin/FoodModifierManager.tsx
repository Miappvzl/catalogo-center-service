'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Sparkles, Circle, CheckSquare, Layers } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { NumberInput } from '../NumberInput'

export interface ModifierOption {
    id: string
    name: string
    price_adjustment_usd: number
    is_available: boolean
}

export interface ModifierGroup {
    id: string
    name: string
    is_required: boolean
    min_selections: number
    max_selections: number
    modifier_options: ModifierOption[]
}

interface Props {
    groups: ModifierGroup[]
    onChange: (groups: ModifierGroup[]) => void
    tourStep?: number
    isMission2?: boolean
    onPresetAdded?: (type: 'sizes' | 'extras' | 'meat' | 'drinks' | 'exclusions') => void
}

export default function FoodModifierManager({ groups, onChange, tourStep, isMission2, onPresetAdded }: Props) {
    const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)

    // --- PLANTILLAS PREDEFINIDAS ---
    const addPreset = (type: 'sizes' | 'meat' | 'extras' | 'drinks' | 'exclusions') => {
        let newGroup: ModifierGroup

        if (type === 'sizes') {
            newGroup = {
                id: `temp-group-sizes-${Date.now()}`,
                name: 'Tamaño de la Pizza / Porción',
                is_required: true,
                min_selections: 1,
                max_selections: 1,
                modifier_options: [
                    { id: `temp-opt-s1`, name: 'Mediana (8 Porciones)', price_adjustment_usd: 0, is_available: true },
                    { id: `temp-opt-s2`, name: 'Grande (10 Porciones)', price_adjustment_usd: 3.5, is_available: true },
                    { id: `temp-opt-s3`, name: 'Familiar (12 Porciones)', price_adjustment_usd: 6.0, is_available: true },
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
                    { id: `temp-opt-e1`, name: 'Extra Queso Mozzarella', price_adjustment_usd: 1.5, is_available: true },
                    { id: `temp-opt-e2`, name: 'Tocineta Ahumada', price_adjustment_usd: 2.0, is_available: true },
                    { id: `temp-opt-e3`, name: 'Borde Relleno de Queso', price_adjustment_usd: 2.5, is_available: true },
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
                    { id: `temp-opt-m1`, name: 'Término Medio', price_adjustment_usd: 0, is_available: true },
                    { id: `temp-opt-m2`, name: 'Tres Cuartos', price_adjustment_usd: 0, is_available: true },
                    { id: `temp-opt-m3`, name: 'Bien Cocido', price_adjustment_usd: 0, is_available: true },
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
                    { id: `temp-opt-d1`, name: 'Coca-Cola Clásica', price_adjustment_usd: 0, is_available: true },
                    { id: `temp-opt-d2`, name: 'Té Frío de la Casa', price_adjustment_usd: 0, is_available: true },
                    { id: `temp-opt-d3`, name: 'Cerveza Nacional (+ $1.50)', price_adjustment_usd: 1.5, is_available: true },
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
                    { id: `temp-opt-x1`, name: 'Sin Cebolla', price_adjustment_usd: 0, is_available: true },
                    { id: `temp-opt-x2`, name: 'Sin Pepinillos', price_adjustment_usd: 0, is_available: true },
                    { id: `temp-opt-x3`, name: 'Salsas Aparte', price_adjustment_usd: 0, is_available: true },
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
            is_available: true
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
                            Preguntas que el comensal responderá al pedir (ej. tamaños de pizza, salsas, extras).
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

                {/* BOTONES DE 1-CLIC */}
                <div id="tour-modifier-presets" className="pt-3 border-t border-neutral-200/70 scroll-mt-28 md:scroll-mt-32">
                    <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-2 font-mono">
                        ⚡ Plantillas Rápidas (Haz clic para insertar):
                    </span>
                    <div className="flex flex-wrap gap-2.5 items-center">
                        {/* 1. TAMAÑO / PORCIÓN */}
                        <button
                            type="button"
                            id="tour-preset-sizes-btn"
                            onClick={() => addPreset('sizes')}
                            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 bg-white border scroll-mt-28 md:scroll-mt-32 ${
                                isMission2 && tourStep === 1
                                    ? 'relative z-[60] border-neutral-900 text-neutral-950 shadow-[0_0_0_2px_rgba(0,0,0,0.8),0_12px_30px_rgba(0,0,0,0.25)] scale-105 pointer-events-auto cursor-pointer ring-4 ring-neutral-900/15'
                                    : 'border-neutral-200/90 text-neutral-800 shadow-2xs hover:border-neutral-900 hover:bg-neutral-50'
                            }`}
                        >
                            <span>🍕</span>
                            <span>Tamaño / Porción</span>
                        </button>

                        {/* 2. EXTRAS / TOPPINGS */}
                        <button
                            type="button"
                            id="tour-preset-extras-btn"
                            onClick={() => addPreset('extras')}
                            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 bg-white border scroll-mt-28 md:scroll-mt-32 ${
                                isMission2 && tourStep === 3
                                    ? 'relative z-[60] border-neutral-900 text-neutral-950 shadow-[0_0_0_2px_rgba(0,0,0,0.8),0_12px_30px_rgba(0,0,0,0.25)] scale-105 pointer-events-auto cursor-pointer ring-4 ring-neutral-900/15'
                                    : 'border-neutral-200/90 text-neutral-800 shadow-2xs hover:border-neutral-900 hover:bg-neutral-50'
                            }`}
                        >
                            <span>🧀</span>
                            <span>Extras / Toppings</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => addPreset('meat')}
                            className="bg-white border border-neutral-200/80 hover:border-neutral-900 px-3.5 py-2 rounded-lg text-xs font-bold text-neutral-800 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                        >
                            🥩 Término de Carne
                        </button>

                        <button
                            type="button"
                            onClick={() => addPreset('drinks')}
                            className="bg-white border border-neutral-200/80 hover:border-neutral-900 px-3.5 py-2 rounded-lg text-xs font-bold text-neutral-800 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                        >
                            🥤 Bebida del Combo
                        </button>

                        <button
                            type="button"
                            onClick={() => addPreset('exclusions')}
                            className="bg-white border border-neutral-200/80 hover:border-neutral-900 px-3.5 py-2 rounded-lg text-xs font-bold text-neutral-800 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                        >
                            🚫 Sin Cebolla / Sin Pepinillos
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
                                Haz clic en una de las plantillas rápidas de arriba para crear tus primeros tamaños o ingredientes.
                            </p>
                        </div>
                    ) : (
                        groups.map((group, idx) => {
                            const isSingleChoice = group.max_selections === 1;

                            // 🚀 IDENTIFICACIÓN SEMÁNTICA: Distinguimos qué grupo es cuál sin importar el orden
                            const isSizesGroup = group.name.toLowerCase().includes('tamaño') || group.id.includes('sizes');
                            const isExtrasGroup = group.name.toLowerCase().includes('extras') || group.id.includes('extras');

                            // Auto-expande el grupo de Tamaños en el paso 2, o el de Extras en el paso 4
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
                                                        {group.name || <span className="text-neutral-400 italic">Escribe el nombre del grupo...</span>}
                                                    </span>
                                                    {group.is_required ? (
                                                        <span className="bg-rose-100 text-rose-800 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                                                            Obligatorio
                                                        </span>
                                                    ) : (
                                                        <span className="bg-neutral-100 text-neutral-600 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                                                            Opcional
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-neutral-500 font-medium mt-0.5 truncate">
                                                    {isSingleChoice ? '🔘 Selección Única' : `☑️ Múltiple (Hasta ${group.max_selections})`} • {group.modifier_options.length} opciones
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
                                                    <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider block mb-1">
                                                        Título de la pregunta para el cliente *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={group.name}
                                                        onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                                                        placeholder="Ej: ¿Qué tamaño deseas?, Elige tus extras..."
                                                        className="w-full bg-white border border-neutral-300 focus:border-neutral-950 rounded-lg px-3.5 py-2 text-xs font-bold text-neutral-900 outline-none transition-all shadow-xs"
                                                    />
                                                </div>

                                                {/* 2. REGLAS VISUALES CLARAS */}
                                                <div 
                                                    id={isExtrasGroup ? 'tour-modifier-rules-extras' : `tour-modifier-rules-${idx}`} 
                                                    className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-white p-3.5 rounded-xl border border-neutral-200/80 transition-all scroll-mt-28 md:scroll-mt-32 ${
                                                        isMission2 && tourStep === 4 && isExtrasGroup 
                                                            ? 'relative z-[60] shadow-[0_0_0_2px_rgba(0,0,0,0.8),0_12px_30px_rgba(0,0,0,0.25)] ring-4 ring-neutral-900/15 pointer-events-auto' 
                                                            : ''
                                                    }`}
                                                >
                                                    {/* Selector: Único vs Múltiple */}
                                                    <div className="space-y-1.5">
                                                        <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block">
                                                            ¿Cómo debe elegir el cliente?
                                                        </span>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateGroup(group.id, { 
                                                                    max_selections: 1, 
                                                                    min_selections: group.is_required ? 1 : 0 
                                                                })}
                                                                className={`flex-1 py-1.5 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                                                    isSingleChoice 
                                                                        ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs' 
                                                                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                                                                }`}
                                                            >
                                                                <Circle size={13} className={isSingleChoice ? 'fill-current' : ''} />
                                                                Solo 1 opción
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => updateGroup(group.id, { 
                                                                    max_selections: 5, 
                                                                    min_selections: group.is_required ? 1 : 0 
                                                                })}
                                                                className={`flex-1 py-1.5 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                                                    !isSingleChoice 
                                                                        ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs' 
                                                                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                                                                }`}
                                                            >
                                                                <CheckSquare size={13} />
                                                                Varias opciones
                                                            </button>
                                                        </div>

                                                        {!isSingleChoice && (
                                                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-100">
                                                                <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider font-mono">
                                                                    Máximo a elegir:
                                                                </span>
                                                                <NumberInput 
                                                                    value={group.max_selections} 
                                                                    onChangeValue={(v) => updateGroup(group.id, { max_selections: Math.max(1, Number(v)) })} 
                                                                    className="w-14 bg-neutral-50 border border-neutral-200 rounded px-2 py-0.5 text-xs font-mono font-bold text-center" 
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Switch Obligatorio */}
                                                    <div className="space-y-1.5">
                                                        <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block">
                                                            ¿Es obligatorio responder?
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const willBeRequired = !group.is_required;
                                                                updateGroup(group.id, {
                                                                    is_required: willBeRequired,
                                                                    min_selections: willBeRequired ? 1 : 0
                                                                });
                                                            }}
                                                            className={`w-full py-1.5 px-3 rounded-lg border text-xs font-bold flex items-center justify-between transition-all ${
                                                                group.is_required 
                                                                    ? 'bg-rose-50 border-rose-300 text-rose-900' 
                                                                    : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                                                            }`}
                                                        >
                                                            <span>{group.is_required ? '⚠️ Sí, es obligatorio' : 'Opcional (Puede saltarlo)'}</span>
                                                            <div className={`w-8 h-4 rounded-full border flex items-center px-0.5 transition-colors ${group.is_required ? 'bg-rose-600 border-rose-600 justify-end' : 'bg-neutral-300 border-neutral-300 justify-start'}`}>
                                                                <div className="w-3 h-3 rounded-full bg-white shadow-xs" />
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* 3. LISTADO DE OPCIONES / INGREDIENTES */}
                                                <div 
                                                    id={isSizesGroup ? 'tour-modifier-options-sizes' : `tour-modifier-options-${idx}`} 
                                                    className={`space-y-2.5 pt-1 transition-all scroll-mt-28 md:scroll-mt-32 ${
                                                        isMission2 && tourStep === 2 && isSizesGroup 
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
                                                        {group.modifier_options.map((opt, optIdx) => (
                                                            <div 
                                                                key={opt.id} 
                                                                className={`p-2.5 rounded-xl border transition-all space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3 ${
                                                                    opt.is_available 
                                                                        ? 'bg-white border-neutral-200/90 shadow-2xs hover:border-neutral-300' 
                                                                        : 'bg-neutral-100/70 border-neutral-200 opacity-60'
                                                                }`}
                                                            >
                                                                {/* FILA 1 (Móvil) / LADO IZQUIERDO (Desktop): Estado + Nombre */}
                                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateOption(group.id, opt.id, { is_available: !opt.is_available })}
                                                                        className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-colors shrink-0 ${
                                                                            opt.is_available 
                                                                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60' 
                                                                                : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
                                                                        }`}
                                                                        title="Disponibilidad"
                                                                    >
                                                                        {opt.is_available ? 'Activo' : 'Agotado'}
                                                                    </button>

                                                                    <input
                                                                        type="text"
                                                                        value={opt.name}
                                                                        onChange={(e) => updateOption(group.id, opt.id, { name: e.target.value })}
                                                                        placeholder={`Opción ${optIdx + 1} (Ej: Extra Queso...)`}
                                                                        className="flex-1 min-w-0 bg-transparent border-none text-xs font-bold text-neutral-900 outline-none px-1 placeholder:text-neutral-400"
                                                                    />
                                                                </div>

                                                                {/* FILA 2 (Móvil) / LADO DERECHO (Desktop): Precio + Papelera */}
                                                                <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-neutral-100 shrink-0">
                                                                    <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 px-2.5 py-1 rounded-lg shrink-0 focus-within:border-neutral-900 focus-within:bg-white transition-colors">
                                                                        <span className="text-[10px] font-bold text-neutral-400 font-mono">+$</span>
                                                                        <NumberInput
                                                                            value={opt.price_adjustment_usd}
                                                                            onChangeValue={(v) => updateOption(group.id, opt.id, { price_adjustment_usd: Number(v) })}
                                                                            placeholder="0.00"
                                                                            className="w-14 bg-transparent border-none text-xs font-mono font-bold text-neutral-900 outline-none text-right"
                                                                        />
                                                                        <span className="text-[9px] font-mono text-neutral-400 font-semibold">USD</span>
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeOption(group.id, opt.id)}
                                                                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                                                                        title="Eliminar opción"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}

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