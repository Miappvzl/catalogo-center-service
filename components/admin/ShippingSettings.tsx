'use client'

import { useState, useEffect } from 'react'
import { Truck, MapPin, Save, Loader2, AlertTriangle, Plus, Trash2, DollarSign } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { motion } from 'framer-motion'
import Swal from 'sweetalert2'

interface ShippingSettingsProps {
  storeId: string
  initialData: any
}

// FlatToggle Soft UI
const FlatToggle = ({ active, label, subtitle, onClick }: { active: boolean, label: string, subtitle?: string, onClick: () => void }) => (
    <div 
        onClick={onClick}
        className={`cursor-pointer p-4 rounded-[var(--radius-btn)] border transition-all flex items-center justify-between active:scale-[0.98] ${active ? 'border-transparent bg-black text-white shadow-subtle' : 'border-transparent bg-gray-50 hover:bg-gray-100 text-gray-900'}`}
    >
        <div className="flex flex-col min-w-0 pr-4">
            <span className="font-bold uppercase text-xs sm:text-sm truncate">{label}</span>
            {subtitle && <span className={`text-[10px] font-medium uppercase tracking-widest mt-0.5 ${active ? 'text-gray-300' : 'text-gray-500'}`}>{subtitle}</span>}
        </div>
        <div className={`w-10 h-6 rounded-full border flex items-center px-1 shrink-0 transition-colors duration-300 ${active ? 'bg-white border-white justify-end' : 'bg-white border-transparent justify-start shadow-sm'}`}>
            <motion.div layout className={`w-4 h-4 rounded-full ${active ? 'bg-black' : 'bg-gray-300'}`}/>
        </div>
    </div>
)

export default function ShippingSettings({ storeId, initialData }: ShippingSettingsProps) {
  const [loading, setLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  
  const [config, setConfig] = useState({
    methods: { mrw: false, zoom: false, tealca: false, delivery: false, pickup: true },
    pickup_locations: [] as string[],
    delivery_zones: [] as {id: string, name: string, cost: number}[] 
  })
  
  const [newLocation, setNewLocation] = useState('')
  const supabase = getSupabase()

  useEffect(() => {
    if (initialData) {
        setConfig(prev => ({
            ...prev,
            ...initialData,
            methods: { ...prev.methods, ...initialData.methods },
            delivery_zones: initialData.delivery_zones || []
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
       setIsDirty(false)
       const Toast = Swal.mixin({
          toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
          customClass: { popup: 'bg-black text-white rounded-xl text-sm font-bold' }
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

  const updateDeliveryZone = (id: string, field: string, value: string) => {
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
    <div className="bg-white p-4 md:p-8 rounded-[var(--radius-card)] card-interactive flex flex-col h-full">
        <div className="mb-6">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Truck size={20} className="text-black" /> Logística de Envíos
            </h3>
            <p className="text-sm text-gray-500 mt-1">Define cómo le entregas los productos a tus clientes.</p>
        </div>

        <div className="flex-1 space-y-8">
            {/* 1. MÉTODOS DE ENVÍO NACIONAL */}
            <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Envíos Nacionales (Cobro en Destino)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <FlatToggle active={config.methods.mrw} label="MRW" onClick={() => toggleMethod('mrw')} />
                    <FlatToggle active={config.methods.zoom} label="ZOOM" onClick={() => toggleMethod('zoom')} />
                    <FlatToggle active={config.methods.tealca} label="TEALCA" onClick={() => toggleMethod('tealca')} />
                </div>
            </div>

            {/* 2. DELIVERY & PICKUP */}
            <div className="space-y-4 pt-6 border-t border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Entregas Locales</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FlatToggle active={config.methods.pickup} label="Retiro Personal" subtitle="El cliente lo busca (Gratis)" onClick={() => toggleMethod('pickup')} />
                    <FlatToggle active={config.methods.delivery} label="Delivery Zonal" subtitle="Envío tarifado en tu ciudad" onClick={() => toggleMethod('delivery')} />
                </div>

                {/* GESTIÓN DE DIRECCIONES DE PICKUP */}
                {config.methods.pickup && (
                    <div className="pt-2 animate-in slide-in-from-top-2 duration-300">
                        <div className="bg-[#f6f6f6] p-5 rounded-[var(--radius-card)] border border-transparent space-y-4">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                <MapPin size={14}/> Puntos de entrega físicos
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Ej: C.C. Free Market, Local B-20..."
                                    className="flex-1 min-w-0 bg-white border border-transparent rounded-[var(--radius-btn)] px-4 py-3 text-sm font-medium focus:ring-1 focus:ring-black focus:border-black focus:shadow-subtle outline-none transition-all"
                                    value={newLocation}
                                    onChange={(e) => setNewLocation(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addLocation()}
                                />
                                <button onClick={addLocation} className="shrink-0 bg-black text-white px-5 py-3 rounded-[var(--radius-btn)] text-xs font-bold uppercase tracking-wide hover:bg-gray-800 active:scale-95 shadow-subtle transition-all flex items-center justify-center gap-2">
                                    <Plus size={16}/> Agregar
                                </button>
                            </div>
                            {config.pickup_locations.length > 0 && (
                                <ul className="space-y-2 pt-2">
                                    {config.pickup_locations.map((loc, idx) => (
                                        <li key={idx} className="flex justify-between items-center gap-3 bg-white px-4 py-3 rounded-[var(--radius-btn)] border border-transparent hover:border-gray-200 text-sm animate-in fade-in duration-200">
                                            <span className="flex-1 min-w-0 truncate font-bold text-gray-800">{loc}</span>
                                            <button onClick={() => removeLocation(idx)} className="shrink-0 text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors"><Trash2 size={16}/></button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {/* GESTIÓN DE ZONAS DE DELIVERY */}
                {config.methods.delivery && (
                    <div className="pt-2 animate-in slide-in-from-top-2 duration-300">
                        <div className="bg-[#f6f6f6] p-5 rounded-[var(--radius-card)] border border-transparent space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <Truck size={14}/> Tarifas por Zona
                                </label>
                                <button onClick={addDeliveryZone} className="bg-black text-white px-3 py-1.5 rounded-[var(--radius-btn)] shadow-subtle text-xs font-bold hover:bg-gray-800 transition-colors flex items-center gap-1">
                                    <Plus size={14}/> Crear Zona
                                </button>
                            </div>
                            <div className="space-y-3">
                                {config.delivery_zones.length === 0 ? (
                                    <div className="text-center py-4 text-gray-400 text-xs font-bold bg-white rounded-[var(--radius-btn)] border border-dashed border-gray-200">
                                        No has creado ninguna zona tarifada.
                                    </div>
                                ) : (
                                    config.delivery_zones.map((zone) => (
                                        <div key={zone.id} className="flex items-center gap-3 bg-white p-2 rounded-[var(--radius-btn)] border border-transparent hover:border-gray-200 animate-in fade-in transition-colors">
                                            <div className="flex-1">
                                                <input 
                                                    value={zone.name} 
                                                    onChange={(e) => updateDeliveryZone(zone.id, 'name', e.target.value)} 
                                                    placeholder="Nombre de la zona (Ej: San Diego)" 
                                                    className="w-full bg-transparent px-3 py-2 text-sm font-bold outline-none text-gray-900 placeholder:text-gray-400"
                                                />
                                            </div>
                                            <div className="w-24 relative shrink-0 bg-gray-50 rounded-[var(--radius-badge)] border border-gray-100 focus-within:border-black focus-within:shadow-subtle transition-all">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm"><DollarSign size={14}/></span>
                                                <input 
                                                    type="number" 
                                                    value={zone.cost} 
                                                    onChange={(e) => updateDeliveryZone(zone.id, 'cost', e.target.value)} 
                                                    className="w-full bg-transparent pl-7 pr-3 py-2 text-sm font-black outline-none text-gray-900"
                                                />
                                            </div>
                                            <button onClick={() => removeDeliveryZone(zone.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-[var(--radius-badge)] transition-colors shrink-0">
                                                <Trash2 size={18}/>
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

        {/* FOOTER DE ACCIÓN */}
        <div className="mt-8 pt-5 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${isDirty ? 'text-yellow-600' : 'text-gray-400'}`}>
                {isDirty ? (
                    <>
                        <AlertTriangle size={14} strokeWidth={2.5} />
                        <span>Tienes cambios sin guardar en logística.</span>
                    </>
                ) : (
                    <span>Logística guardada.</span>
                )}
            </div>
            <button 
                onClick={handleSave} 
                disabled={loading || !isDirty} 
                className={`w-full sm:w-auto px-6 py-3 rounded-[var(--radius-btn)] text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    isDirty 
                        ? 'bg-black text-white hover:bg-gray-800 shadow-subtle active:scale-95' 
                        : 'bg-gray-50 border border-transparent text-gray-400 cursor-not-allowed'
                }`}
            >
                {loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} 
                Guardar Logística
            </button>
        </div>
    </div>
  )
}