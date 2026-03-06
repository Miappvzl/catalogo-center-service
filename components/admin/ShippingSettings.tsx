'use client'

import { useState, useEffect } from 'react'
import { Truck, MapPin, Save, Loader2, Info } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { motion } from 'framer-motion'
import Swal from 'sweetalert2'

export default function ShippingSettings({ storeId }: { storeId: string }) {
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState({
    methods: {
      mrw: false,
      zoom: false,
      tealca: false,
      delivery: false,
      pickup: true
    },
    pickup_locations: [] as string[],
    delivery_zones: [] as string[]
  })
  
  const [newLocation, setNewLocation] = useState('')

  const supabase = getSupabase()
  
  useEffect(() => {
    const fetchConfig = async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('shipping_config')
        .eq('id', storeId)
        .single()
      
      if (data?.shipping_config) {
        setConfig(prev => ({
            ...prev,
            ...data.shipping_config,
            methods: { ...prev.methods, ...data.shipping_config.methods }
        }))
      }
    }
    if (storeId) fetchConfig()
  }, [storeId])

  const handleSave = async () => {
    if (!storeId) return

    setLoading(true)

    const { error } = await supabase
      .from('stores')
      .update({ shipping_config: config })
      .eq('id', storeId)
    
    setLoading(false)
    
    if (error) {
       console.error(error)
       Swal.fire('Error', 'No se pudo guardar la configuración', 'error')
    } else {
       const Toast = Swal.mixin({
          toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
          customClass: { popup: 'bg-black text-white rounded-xl' }
       })
       Toast.fire({ icon: 'success', title: 'Logística Actualizada' })
    }
  }

  const toggleMethod = (key: keyof typeof config.methods) => {
    setConfig(prev => ({
      ...prev,
      methods: { ...prev.methods, [key]: !prev.methods[key] }
    }))
  }

  const addLocation = () => {
    if (!newLocation.trim()) return
    setConfig(prev => ({
      ...prev,
      pickup_locations: [...prev.pickup_locations, newLocation.trim()]
    }))
    setNewLocation('')
  }

  const removeLocation = (index: number) => {
    setConfig(prev => ({
        ...prev,
        pickup_locations: prev.pickup_locations.filter((_, i) => i !== index)
    }))
  }

  return (
    /* OPTIMIZACIÓN 1: Paddings adaptativos (p-4 en móvil, p-6 en PC) */
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 sm:space-y-8">
        
        {/* CABECERA (Stacking en móvil) */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4">
            <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <Truck size={20} /> Logística de Envíos
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Define cómo entregas tus productos.</p>
            </div>
            <button 
                onClick={handleSave}
                disabled={loading}
                // w-full en móvil para que sea fácil de tocar, auto en PC
                className="w-full sm:w-auto bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-800 active:scale-95 transition-all shadow-md shadow-black/10 disabled:opacity-70"
            >
                {loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                Guardar Cambios
            </button>
        </div>

        {/* 1. MÉTODOS DE ENVÍO NACIONAL */}
        <div className="space-y-3 sm:space-y-4">
            <h4 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Envíos Nacionales</h4>
            {/* Grid adaptativo: 2 columnas en móviles medianos, 3 en PC */}
            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {['mrw', 'zoom', 'tealca'].map((method) => (
                    <div 
                        key={method}
                        onClick={() => toggleMethod(method as any)}
                        className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center justify-between active:scale-[0.98] ${config.methods[method as keyof typeof config.methods] ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                        <span className="font-bold uppercase text-sm">{method}</span>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${config.methods[method as keyof typeof config.methods] ? 'bg-black border-black' : 'border-gray-300'}`}>
                            {config.methods[method as keyof typeof config.methods] && <div className="w-2 h-2 bg-white rounded-full animate-in zoom-in duration-200"/>}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* 2. DELIVERY & PICKUP */}
        <div className="space-y-4 pt-4 sm:pt-6 border-t border-gray-100">
            <h4 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Entregas Locales</h4>
            
            {/* DELIVERY TOGGLE */}
            <div 
                onClick={() => toggleMethod('delivery')}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center justify-between active:scale-[0.98] ${config.methods.delivery ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-200'}`}
            >
                {/* min-w-0 previene desbordamiento si el texto crece */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="font-bold uppercase text-xs sm:text-sm truncate">Delivery</span>
                    <span className="text-[10px] sm:text-xs text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-200 shrink-0">Local</span>
                </div>
                <div className={`w-10 h-6 rounded-full border flex items-center px-1 shrink-0 transition-colors duration-300 ${config.methods.delivery ? 'bg-black border-black justify-end' : 'bg-gray-100 border-gray-200 justify-start'}`}>
                    <motion.div layout className="w-3.5 h-3.5 bg-white rounded-full shadow-sm"/>
                </div>
            </div>

            {/* PICKUP LOCATIONS */}
            <div className={`p-4 rounded-xl border-2 transition-all space-y-4 overflow-hidden ${config.methods.pickup ? 'border-black bg-white' : 'border-gray-100 opacity-60'}`}>
                 <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleMethod('pickup')}>
                    <span className="font-bold uppercase text-xs sm:text-sm flex items-center gap-2">
                        <MapPin size={16} className="shrink-0"/> Retiro Personal
                    </span>
                    <div className={`w-10 h-6 rounded-full border flex items-center px-1 shrink-0 transition-colors duration-300 ${config.methods.pickup ? 'bg-black border-black justify-end' : 'bg-gray-100 border-gray-200 justify-start'}`}>
                        <motion.div layout className="w-3.5 h-3.5 bg-white rounded-full shadow-sm"/>
                    </div>
                 </div>

                 {config.methods.pickup && (
                    <div className="pl-2 sm:pl-4 border-l-2 border-gray-100 space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed">
                            Agrega las direcciones donde el cliente puede buscar su pedido.
                        </p>
                        
                        {/* INPUT CREADOR: Blindado con min-w-0 y shrink-0 */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input 
                                type="text" 
                                placeholder="Ej: C.C. Free Market, Local B-20..."
                                className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs sm:text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                value={newLocation}
                                onChange={(e) => setNewLocation(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addLocation()}
                            />
                            <button 
                                onClick={addLocation} 
                                className="shrink-0 bg-black text-white px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-gray-800 active:scale-95 transition-all"
                            >
                                Agregar
                            </button>
                        </div>

                        {/* LISTA DE DIRECCIONES: Blindada con flex-1 truncate y shrink-0 */}
                        {config.pickup_locations.length > 0 && (
                            <ul className="space-y-2 mt-4">
                                {config.pickup_locations.map((loc, idx) => (
                                    <li key={idx} className="flex justify-between items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100 text-xs sm:text-sm animate-in fade-in zoom-in-95 duration-200">
                                        <span className="flex-1 min-w-0 truncate font-medium text-gray-700" title={loc}>
                                            {loc}
                                        </span>
                                        <button 
                                            onClick={() => removeLocation(idx)} 
                                            className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md font-bold text-[10px] sm:text-xs transition-colors"
                                        >
                                            ELIMINAR
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                 )}
            </div>
        </div>
    </div>
  )
}