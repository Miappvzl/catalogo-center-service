'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Zap, Wand2, Check } from 'lucide-react'
import EliteColorPicker from '@/components/admin/EliteColorPicker'
import { autoGenerateColorwayName } from '@/utils/colorNamer'

interface EliteVariantColorPickerProps {
    useColor: boolean
    onToggleColor: (val: boolean) => void
    colorName: string
    colorHex: string
    onChange: (name: string, hex: string) => void
}

const PRESETS_BICOLOR = [
    { name: 'Negro / Blanco', hex1: '#000000', hex2: '#FFFFFF' },
    { name: 'Azul / Blanco', hex1: '#1E3A8A', hex2: '#FFFFFF' },
    { name: 'Negro / Rojo', hex1: '#000000', hex2: '#DC2626' },
    { name: 'Gris / Negro', hex1: '#9CA3AF', hex2: '#000000' },
    { name: 'Blanco / Azul', hex1: '#FFFFFF', hex2: '#2563EB' },
    { name: 'Rojo / Blanco', hex1: '#DC2626', hex2: '#FFFFFF' },
    { name: 'Beige / Marrón', hex1: '#F5F5DC', hex2: '#78350F' },
    { name: 'Verde / Negro', hex1: '#4D7C0F', hex2: '#000000' }
]

const PRESETS_SOLIDO = [
    { name: 'Negro', hex: '#000000' },
    { name: 'Blanco', hex: '#FFFFFF' },
    { name: 'Gris Plata', hex: '#9CA3AF' },
    { name: 'Gris Plomo', hex: '#4B5563' },
    { name: 'Azul Marino', hex: '#1E3A8A' },
    { name: 'Azul Rey', hex: '#2563EB' },
    { name: 'Rojo Carmesí', hex: '#DC2626' },
    { name: 'Vinotinto', hex: '#7F1D1D' },
    { name: 'Verde Militar', hex: '#4D7C0F' },
    { name: 'Beige', hex: '#F5F5DC' },
    { name: 'Marrón Café', hex: '#78350F' },
    { name: 'Naranja', hex: '#EA580C' }
]

export default function EliteVariantColorPicker({
    useColor,
    onToggleColor,
    colorName,
    colorHex,
    onChange
}: EliteVariantColorPickerProps) {
    const isBicolor = colorHex.includes(',')
    const [hex1, setHex1] = useState(colorHex.split(',')[0] || '#000000')
    const [hex2, setHex2] = useState(colorHex.split(',')[1] || '#FFFFFF')
    const [isCustomName, setIsCustomName] = useState(false)
    const [isPresetsOpen, setIsPresetsOpen] = useState(false)
    const presetsRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const parts = colorHex.split(',')
        setHex1(parts[0] || '#000000')
        if (parts[1]) setHex2(parts[1])
    }, [colorHex])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
                setIsPresetsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleHex1 = (newHex: string) => {
        setHex1(newHex)
        const updatedHex = isBicolor ? `${newHex},${hex2}` : newHex
        const finalName = isCustomName && colorName ? colorName : autoGenerateColorwayName(updatedHex)
        onChange(finalName, updatedHex)
    }

    const handleHex2 = (newHex: string) => {
        setHex2(newHex)
        const updatedHex = `${hex1},${newHex}`
        const finalName = isCustomName && colorName ? colorName : autoGenerateColorwayName(updatedHex)
        onChange(finalName, updatedHex)
    }

    const toggleMode = (bicolor: boolean) => {
        const updatedHex = bicolor ? `${hex1},${hex2}` : hex1
        const finalName = isCustomName && colorName ? colorName : autoGenerateColorwayName(updatedHex)
        onChange(finalName, updatedHex)
    }

    const handleRegenerateName = () => {
        setIsCustomName(false)
        const autoName = autoGenerateColorwayName(colorHex)
        onChange(autoName, colorHex)
    }

    // 🚀 FIX: Vaciado limpio al pasar a "Sin Color" y auto-recuperación al activar
    const handleToggleUseColor = () => {
        const nextState = !useColor
        onToggleColor(nextState)
        if (!nextState) {
            setIsCustomName(false)
            onChange('', colorHex) // Deja el input limpio para ver el placeholder
        } else {
            const autoName = autoGenerateColorwayName(colorHex)
            onChange(autoName, colorHex) // Regenera el nombre al vuelo
        }
    }

    return (
        <div className="bg-white p-3 rounded-2xl border border-neutral-200/70 shadow-xs space-y-2.5 w-full min-w-0">
            {/* 1. CABECERA CON ALINEACIÓN PERFECTA (ITEMS-CENTER ESTRICTO) */}
            <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-neutral-100 w-full min-h-[28px]">
                {/* Izquierda: Icono + Label */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <Palette size={13} className="text-neutral-800 shrink-0" />
                    <span className="text-[11px] font-bold text-neutral-900 leading-none">
                        Color
                    </span>
                </div>

                {/* Centro: Segmented 1 Tono / Bicolor */}
                {useColor ? (
                    <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/60 shrink-0">
                        <button
                            type="button"
                            onClick={() => toggleMode(false)}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition-all cursor-pointer leading-none ${
                                !isBicolor 
                                    ? 'bg-white text-neutral-950 shadow-xs' 
                                    : 'text-neutral-500 hover:text-neutral-900'
                            }`}
                        >
                            1 Tono
                        </button>
                        <button
                            type="button"
                            onClick={() => toggleMode(true)}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition-all cursor-pointer leading-none ${
                                isBicolor 
                                    ? 'bg-white text-neutral-950 shadow-xs' 
                                    : 'text-neutral-500 hover:text-neutral-900'
                            }`}
                        >
                            Bicolor
                        </button>
                    </div>
                ) : (
                    <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider">
                        Opción Textual
                    </span>
                )}

                {/* 🚀 FIX: CHECKBOX SUAVE CUSTOMIZADO (ZERO-ESTILO NATIVO) */}
                <button
                    type="button"
                    onClick={handleToggleUseColor}
                    className="flex items-center gap-1.5 cursor-pointer select-none group/chk py-0.5 shrink-0 outline-none"
                    title={useColor ? "Desactivar color visual" : "Activar color visual"}
                >
                    <div className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center transition-all ${
                        useColor 
                            ? 'bg-neutral-950 border-neutral-950 text-white shadow-2xs' 
                            : 'bg-white border-neutral-300 group-hover/chk:border-neutral-400'
                    }`}>
                        {useColor && <Check size={10} strokeWidth={3.5} className="animate-in zoom-in-50 duration-150" />}
                    </div>
                    <span className="text-[10px] font-bold text-neutral-800 leading-none whitespace-nowrap">
                        Con color
                    </span>
                </button>
            </div>

            {/* 2. FILA ÚNICA INTELIGENTE DE CONFIGURACIÓN (~34px) */}
            {useColor ? (
                <div className="flex items-center gap-1.5 w-full">
                    {/* 🚀 FIX: INPUT ANTI-TRUNCADO CON PADDING RECALIBRADO */}
                    <div className="flex-1 min-w-0 relative flex items-center h-8.5">
                        <input
                            type="text"
                            value={colorName}
                            onChange={e => {
                                setIsCustomName(true)
                                onChange(e.target.value, colorHex)
                            }}
                            placeholder={isBicolor ? "Ej: Negro / Blanco" : "Ej: Naranja"}
                            className="w-full h-full bg-neutral-50/70 border border-neutral-200/80 focus:border-neutral-900 focus:bg-white rounded-xl pl-2.5 pr-6 text-[11px] sm:text-xs font-bold text-neutral-900 outline-none transition-all placeholder:text-neutral-400 placeholder:font-normal truncate leading-none"
                        />
                        <button
                            type="button"
                            onClick={handleRegenerateName}
                            className="absolute right-1.5 text-neutral-400 hover:text-neutral-950 transition-colors p-0.5 cursor-pointer"
                            title="Bautizar automáticamente"
                        >
                            <Wand2 size={11} className={isCustomName ? "text-amber-500 animate-pulse" : "text-neutral-300"} />
                        </button>
                    </div>

                    {/* 🚀 FIX: CÁPSULA DE SWATCHES MATEMÁTICAMENTE BALANCEADA Y CENTRADA */}
                    <div className="inline-flex items-center justify-center gap-1.5 px-1.5 py-1 bg-neutral-100/90 rounded-full border border-neutral-200/70 shrink-0">
                        <div title="Tono Primario (clic para editar)" className="shrink-0 flex items-center justify-center">
                            <EliteColorPicker 
                                label={isBicolor ? "Tono 1" : "Color"} 
                                value={hex1} 
                                onChange={handleHex1} 
                                minimal={true} 
                            />
                        </div>

                        {isBicolor && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.5 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                className="shrink-0 flex items-center justify-center"
                                title="Tono Secundario (clic para editar)"
                            >
                                <EliteColorPicker 
                                    label="Tono 2" 
                                    value={hex2} 
                                    onChange={handleHex2} 
                                    minimal={true} 
                                />
                            </motion.div>
                        )}
                    </div>

                    {/* BOTÓN DESPLEGABLE CON RAYO (AJUSTADO A W-7.5) */}
                    <div className="relative shrink-0" ref={presetsRef}>
                        <button
                            type="button"
                            onClick={() => setIsPresetsOpen(!isPresetsOpen)}
                            className="h-8.5 w-7.5 bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 rounded-xl flex items-center justify-center transition-colors border border-neutral-200/60 cursor-pointer shadow-2xs active:scale-95"
                            title="Colores rápidos sugeridos"
                        >
                            <Zap size={11} className="fill-amber-500 text-amber-500" />
                        </button>

                        <AnimatePresence>
                            {isPresetsOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 4 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 top-10 z-50 w-52 p-1.5 bg-white rounded-xl shadow-xl border border-neutral-200/80 grid grid-cols-2 gap-1 max-h-52 overflow-y-auto no-scrollbar"
                                >
                                    {(isBicolor ? PRESETS_BICOLOR : PRESETS_SOLIDO).map((preset: any) => (
                                        <button
                                            key={preset.name}
                                            type="button"
                                            onClick={() => {
                                                setIsCustomName(false)
                                                if (isBicolor) {
                                                    onChange(preset.name, `${preset.hex1},${preset.hex2}`)
                                                } else {
                                                    onChange(preset.name, preset.hex)
                                                }
                                                setIsPresetsOpen(false)
                                            }}
                                            className="flex items-center gap-1.5 p-1 rounded-md hover:bg-neutral-50 text-left transition-colors cursor-pointer"
                                        >
                                            {isBicolor ? (
                                                <span 
                                                    className="w-2.5 h-2.5 rounded-full border border-neutral-300 shrink-0"
                                                    style={{ background: `linear-gradient(135deg, ${preset.hex1} 50%, ${preset.hex2} 50%)` }}
                                                />
                                            ) : (
                                                <span 
                                                    className="w-2.5 h-2.5 rounded-full border border-neutral-300 shrink-0"
                                                    style={{ backgroundColor: preset.hex }}
                                                />
                                            )}
                                            <span className="text-[10px] font-bold text-neutral-800 truncate">
                                                {preset.name}
                                            </span>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            ) : (
                /* 🚀 FIX: ESTADO LIMPIO PARA "SIN COLOR" (EL PLACEHOLDER SE VE DIRECTO) */
                <div className="space-y-1 animate-in fade-in duration-150">
                    <input
                        type="text"
                        value={colorName}
                        onChange={e => onChange(e.target.value, colorHex)}
                        placeholder="Ej: Licencia Estándar, Pack x3, Tapa Dura..."
                        className="w-full h-8.5 bg-neutral-50/70 border border-neutral-200/80 focus:border-neutral-900 focus:bg-white rounded-xl px-3 text-[11px] sm:text-xs font-bold text-neutral-900 outline-none transition-all placeholder:text-neutral-400 placeholder:font-normal leading-none"
                    />
                    <p className="text-[9px] text-neutral-400 font-medium px-1 leading-snug">
                        Asigna un nombre a la variante sin vincularle muestras de color visual.
                    </p>
                </div>
            )}
        </div>
    )
}