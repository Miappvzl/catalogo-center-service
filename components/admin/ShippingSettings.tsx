'use client'

import { useState, useEffect } from 'react'
import { Truck, MapPin, Save, Loader2, AlertTriangle, Plus, Trash2, DollarSign, Store, Activity, AlertCircle } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { motion } from 'framer-motion'
import { revalidateStoreCache } from '@/app/admin/actions'
import Swal from 'sweetalert2'
import { NumberInput } from '../NumberInput'

interface ShippingSettingsProps {
  storeId: string
  initialData: any
}

// FlatToggle Premium (Optimizada contra Flexbox Blowout)
const FlatToggle = ({ active, label, subtitle, onClick }: { active: boolean, label: string, subtitle?: string, onClick: () => void }) => (
    <div 
        onClick={onClick}
        className={`cursor-pointer p-4 rounded-xl border transition-all flex items-center justify-between active:scale-[0.98] ${active ? 'border-transparent bg-neutral-950 text-white shadow-xs' : 'border-neutral-200/50 bg-neutral-50/50 hover:bg-neutral-50 text-neutral-800'}`}
    >
        <div className="flex flex-col min-w-0 pr-4 flex-1">
            <span className="font-bold uppercase text-xs break-words whitespace-normal leading-tight tracking-wider">{label}</span>
            {subtitle && <span className={`text-[10px] font-medium uppercase tracking-wider mt-1 break-words whitespace-normal leading-snug ${active ? 'text-neutral-400' : 'text-neutral-400'}`}>{subtitle}</span>}
        </div>
        <div className={`w-10 h-5.5 rounded-full border flex items-center px-0.5 shrink-0 transition-colors duration-200 ${active ? 'bg-white border-white justify-end' : 'bg-neutral-100 border-neutral-200/50 justify-start'}`}>
            <motion.div layout transition={{ type: "spring", stiffness: 600, damping: 30 }} className={`w-4 h-4 rounded-full ${active ? 'bg-neutral-950' : 'bg-neutral-300'}`}/>
        </div>
    </div>
)

export default function ShippingSettings({ storeId, initialData }: ShippingSettingsProps) {
  const [loading, setLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  
  const [config, setConfig] = useState({
    methods: { mrw: false, zoom: false, tealca: false, delivery: false, pickup: true },
    main_address: '', 
    pickup_locations: [] as string[],
    delivery_zones: [] as {id: string, name: string, cost: number}[],
    show_badge: true, 
    global_badge_title: '', 
    global_badge_desc: '' 
  })
  
  const [newLocation, setNewLocation] = useState('')
  const supabase = getSupabase()

  useEffect(() => {
    if (initialData) {
        setConfig(prev => ({
            ...prev,
            ...initialData,
            methods: { ...prev.methods, ...initialData.methods },
            main_address: initialData.main_address || '', 
            delivery_zones: initialData.delivery_zones || [],
            pickup_locations: initialData.pickup_locations || [],
            show_badge: initialData.show_badge ?? true, 
            global_badge_title: initialData.global_badge_title || '', 
            global_badge_desc: initialData.global_badge_desc || '' 
        }))
    }
  }, [initialData])

  const handleSave = async () => {
    if (!storeId || !isDirty) return
    setLoading(true)
    
    const { error } = await supabase
      .from('stores')
      .update({ shipping_config: config })
      .eq('id', storeId)
      
    setLoading(false)

    if (error) {
       Swal.fire('Error', 'No se pudo guardar la logística', 'error')
    } else {
       await revalidateStoreCache()
       setIsDirty(false)
       
       const Toast = Swal.mixin({
          toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
          customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold border border-neutral-800' }
       })
       Toast.fire({ icon: 'success', title: 'Logística Actualizada' })
    }
  }

  const toggleMethod = (key: keyof typeof config.methods) => {
    setIsDirty(true)
    setConfig(prev => ({
      ...prev,
      methods: { ...prev.methods, [key]: !prev.methods[key] }
    }))
  }

  const addLocation = () => {
    if (!newLocation.trim()) return
    setIsDirty(true)
    setConfig(prev => ({ ...prev, pickup_locations: [...prev.pickup_locations, newLocation.trim()] }))
    setNewLocation('')
  }

  const removeLocation = (index: number) => {
    setIsDirty(true)
    setConfig(prev => ({ ...prev, pickup_locations: prev.pickup_locations.filter((_, i) => i !== index) }))
  }

  const addDeliveryZone = () => {
    setIsDirty(true)
    setConfig(prev => ({
        ...prev,
        delivery_zones: [...prev.delivery_zones, { id: Date.now().toString(), name: '', cost: 0 }]
    }))
  }

  const updateDeliveryZone = (id: string, field: string, value: string | number) => {
    setIsDirty(true)
    setConfig(prev => ({
        ...prev,
        delivery_zones: prev.delivery_zones.map(z => z.id === id ? { ...z, [field]: field === 'cost' ? Number(value) : value } : z)
    }))
  }

  const removeDeliveryZone = (id: string) => {
    setIsDirty(true)
    setConfig(prev => ({
        ...prev,
        delivery_zones: prev.delivery_zones.filter(z => z.id !== id)
    }))
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col h-full space-y-6">
        
        {/* HEADER DE SECCIÓN */}
        <div>
            <div className="flex items-center gap-2 text-neutral-900">
                <Truck size={18} className="text-neutral-500" /> 
                <h3 className="text-base font-bold tracking-tight">Logística de Despacho</h3>
            </div>
            <p className="text-xs text-neutral-400 mt-1">Configure las opciones de entrega y tarifas de despacho para sus compradores.</p>
        </div>

        <div className="flex-1 space-y-6">
            
            {/* 1. MÉTODOS DE ENVÍO NACIONAL */}
            <div className="space-y-3">
                <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">Empresas de Envío Nacional (COD)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <FlatToggle active={config.methods.mrw} label="MRW" onClick={() => toggleMethod('mrw')} />
                    <FlatToggle active={config.methods.zoom} label="ZOOM" onClick={() => toggleMethod('zoom')} />
                    <FlatToggle active={config.methods.tealca} label="TEALCA" onClick={() => toggleMethod('tealca')} />
                </div>
            </div>

            {/* 2. DELIVERY & PICKUP */}
            <div className="space-y-4 pt-4 border-t border-neutral-100/50">
                <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">Entrega Local en Ciudad</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FlatToggle active={config.methods.pickup} label="Retiro Presencial" subtitle="Entrega en tienda (Sin costo)" onClick={() => toggleMethod('pickup')} />
                    <FlatToggle active={config.methods.delivery} label="Delivery Tarifado" subtitle="Costo variable por zona" onClick={() => toggleMethod('delivery')} />
                </div>

                {/* DIRECCIONES DE PICKUP */}
                {config.methods.pickup && (
                    <div className="pt-2 animate-in slide-in-from-top-2 duration-200">
                        <div className="bg-neutral-50/50 p-4 md:p-5 rounded-lg border border-neutral-200/50 space-y-5">
                            
                            {/* Dirección Principal */}
                            <div>
                                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                    <Store size={14} className="text-neutral-400" /> Dirección de Sede Principal
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Ingrese la ubicación física de su establecimiento comercial"
                                    className="w-full bg-white border border-neutral-200/50 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:border-neutral-400 outline-none transition-all"
                                    value={config.main_address || ''}
                                    onChange={(e) => { setIsDirty(true); setConfig(prev => ({ ...prev, main_address: e.target.value })) }}
                                />
                            </div>

                            {/* Puntos Alternativos */}
                            <div className="pt-4 border-t border-neutral-200/60">
                                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                    <MapPin size={14} className="text-neutral-400" /> Puntos de entrega o pick-up adicionales
                                </label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Ej: C.C. San Ignacio, Nivel Jardín, Chacao"
                                        className="flex-1 min-w-0 bg-white border border-neutral-200/50 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:border-neutral-400 outline-none transition-all"
                                        value={newLocation}
                                        onChange={(e) => setNewLocation(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addLocation()}
                                    />
                                    <button onClick={addLocation} className="shrink-0 bg-neutral-950 text-white px-4 py-2.5 rounded-lg text-xs font-semibold hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-xs">
                                        <Plus size={14}/> 
                                        <span>Agregar</span>
                                    </button>
                                </div>
                                {config.pickup_locations.length > 0 && (
                                    <ul className="space-y-1.5 pt-4">
                                        {config.pickup_locations.map((loc, idx) => (
                                            <li key={idx} className="flex justify-between items-center gap-3 bg-white px-3.5 py-2 rounded-lg border border-neutral-200/50 text-xs animate-in fade-in duration-200 shadow-xs">
                                                <span className="flex-1 min-w-0 truncate font-semibold text-neutral-800">{loc}</span>
                                                <button onClick={() => removeLocation(idx)} className="shrink-0 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-md transition-colors">
                                                    <Trash2 size={14}/>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                        </div>
                    </div>
                )}

                {/* ZONAS DE DELIVERY */}
                {config.methods.delivery && (
                    <div className="pt-2 animate-in slide-in-from-top-2 duration-200">
                        <div className="bg-neutral-50/50 p-4 md:p-5 rounded-lg border border-neutral-200/50 space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Activity size={14} className="text-neutral-400" /> Tarifas de Envío por Zona
                                </label>
                                <button onClick={addDeliveryZone} className="bg-neutral-950 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-black transition-colors flex items-center gap-1 shadow-xs">
                                    <Plus size={13}/> 
                                    <span>Crear Zona</span>
                                </button>
                            </div>
                            
                            <div className="space-y-2">
                                {config.delivery_zones.length === 0 ? (
                                    <div className="text-center py-5 text-neutral-400 text-xs font-medium bg-white rounded-lg border border-dashed border-neutral-200/50">
                                        No hay zonas de entrega configuradas actualmente.
                                    </div>
                                ) : (
                                    config.delivery_zones.map((zone) => (
                                        <div key={zone.id} className="flex items-center gap-2.5 bg-white p-1.5 rounded-lg border border-neutral-200/50 animate-in fade-in transition-colors shadow-xs">
                                            <div className="flex-1">
                                                <input 
                                                    value={zone.name} 
                                                    onChange={(e) => updateDeliveryZone(zone.id, 'name', e.target.value)} 
                                                    placeholder="Escriba la zona geográfica (Ej: Las Mercedes)" 
                                                    className="w-full bg-transparent px-2 py-1.5 text-xs font-bold outline-none text-neutral-900 placeholder:text-neutral-300"
                                                />
                                            </div>
                                            <div className="w-24 relative shrink-0 bg-neutral-50 rounded-md border border-neutral-200/50 focus-within:border-neutral-400 transition-colors">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
                                                    <DollarSign size={12}/>
                                                </span>
                                                <NumberInput
                                                    value={zone.cost} 
                                                    onChangeValue={(val) => updateDeliveryZone(zone.id, 'cost', val)} 
                                                    className="w-full bg-transparent pl-6 pr-2.5 py-1.5 text-xs font-bold outline-none text-neutral-900 text-center font-mono"
                                                />
                                            </div>
                                            <button onClick={() => removeDeliveryZone(zone.id)} className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors shrink-0">
                                                <Trash2 size={15}/>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* 3. MENSAJE GLOBAL DE ENTREGA EN PRODUCTOS */}
        <div className="space-y-3 pt-4 border-t border-neutral-200/50 w-full overflow-hidden">
            <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">Visualización en Ficha de Producto</h4>
            <div className="bg-neutral-50/50 p-4 sm:p-5 rounded-lg border border-neutral-200/50 space-y-4 w-full">
                <FlatToggle 
                    active={config.show_badge} 
                    label="Etiqueta Informativa de Envío" 
                    subtitle="Aparece debajo de la línea de precios en el producto." 
                    onClick={() => { setIsDirty(true); setConfig(prev => ({ ...prev, show_badge: !prev.show_badge })) }} 
                />
                
                {config.show_badge && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200 w-full pt-1">
                        <div className="w-full min-w-0">
                            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block truncate">Encabezado (Máx 20 caracteres)</label>
                            <input 
                                type="text" 
                                maxLength={20}
                                placeholder="Ej: Entrega Express"
                                value={config.global_badge_title}
                                onChange={(e) => { setIsDirty(true); setConfig(prev => ({ ...prev, global_badge_title: e.target.value })) }}
                                className="w-full bg-white border border-neutral-200/50 rounded-lg px-3 py-2 text-xs font-semibold focus:border-neutral-400 outline-none transition-colors placeholder:text-neutral-300"
                            />
                        </div>
                        <div className="w-full min-w-0">
                            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block truncate">Descripción (Máx 50 caracteres)</label>
                            <input 
                                type="text" 
                                maxLength={50}
                                placeholder="Ej: Despacho garantizado en 24 horas"
                                value={config.global_badge_desc}
                                onChange={(e) => { setIsDirty(true); setConfig(prev => ({ ...prev, global_badge_desc: e.target.value })) }}
                                className="w-full bg-white border border-neutral-200/50 rounded-lg px-3 py-2 text-xs font-semibold focus:border-neutral-400 outline-none transition-colors placeholder:text-neutral-300"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* FOOTER DE ACCIÓN */}
        <div className="mt-8 pt-5 border-t border-neutral-200/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-medium">
                {isDirty ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded">
                        <AlertCircle size={12} />
                        Tiene cambios sin guardar en logística
                    </span>
                ) : (
                    <span className="text-neutral-400">La configuración de despacho está consolidada.</span>
                )}
            </div>
            
            <button 
                onClick={handleSave} 
                disabled={loading || !isDirty} 
                className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    isDirty 
                        ? 'bg-neutral-950 text-white hover:bg-black active:scale-[0.98]' 
                        : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                }`}
            >
                {loading ? <Loader2 className="animate-spin" size={13}/> : <Save size={13}/>} 
                Guardar Logística
            </button>
        </div>
    </div>
  )
}