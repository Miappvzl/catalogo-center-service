'use client'

import { useState, useEffect } from 'react'
import { Truck, MapPin, Save, Loader2, Info } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr' // <--- CAMBIO CLAVE: Usamos el cliente moderno
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

  // INSTANCIAMOS EL CLIENTE CORRECTO (CON SESIÓN)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Cargar Configuración Actual
  useEffect(() => {
    const fetchConfig = async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('shipping_config')
        .eq('id', storeId)
        .single()
      
      // Si existe configuración guardada, la cargamos.
      // Si no, usamos el estado inicial (o mezclamos para evitar perder datos nuevos)
      if (data?.shipping_config) {
        // Hacemos un merge seguro para que si agregaste métodos nuevos no se rompa
        setConfig(prev => ({
            ...prev,
            ...data.shipping_config,
            methods: { ...prev.methods, ...data.shipping_config.methods }
        }))
      }
    }
    if (storeId) fetchConfig()
  }, [storeId])

  // Guardar Cambios
  const handleSave = async () => {
    if (!storeId) return

    setLoading(true)
    console.log("Guardando config con cliente autenticado:", config);

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
          customClass: { popup: 'bg-black text-white' }
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
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-8">
        
        {/* CABECERA */}
        <div className="flex justify-between items-center">
            <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <Truck size={20} /> Logística de Envíos
                </h3>
                <p className="text-sm text-gray-500">Define cómo entregas tus productos.</p>
            </div>
            <button 
                onClick={handleSave}
                disabled={loading}
                className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-all"
            >
                {loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                Guardar Cambios
            </button>
        </div>

        {/* 1. MÉTODOS DE ENVÍO NACIONAL */}
        <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Envíos Nacionales</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['mrw', 'zoom', 'tealca'].map((method) => (
                    <div 
                        key={method}
                        onClick={() => toggleMethod(method as any)}
                        className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center justify-between ${config.methods[method as keyof typeof config.methods] ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                        <span className="font-bold uppercase">{method}</span>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${config.methods[method as keyof typeof config.methods] ? 'bg-black border-black' : 'border-gray-300'}`}>
                            {config.methods[method as keyof typeof config.methods] && <div className="w-2 h-2 bg-white rounded-full"/>}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* 2. DELIVERY & PICKUP */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Entregas Locales</h4>
            
            {/* DELIVERY TOGGLE */}
            <div 
                onClick={() => toggleMethod('delivery')}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center justify-between ${config.methods.delivery ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-200'}`}
            >
                <div className="flex items-center gap-3">
                    <span className="font-bold uppercase">Delivery (Motorizado)</span>
                    <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">Local</span>
                </div>
                <div className={`w-10 h-6 rounded-full border flex items-center px-1 transition-colors ${config.methods.delivery ? 'bg-black border-black justify-end' : 'bg-gray-100 border-gray-200 justify-start'}`}>
                    <div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm"/>
                </div>
            </div>

            {/* PICKUP LOCATIONS */}
            <div className={`p-4 rounded-xl border-2 transition-all space-y-4 ${config.methods.pickup ? 'border-black bg-white' : 'border-gray-100 opacity-60'}`}>
                 <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleMethod('pickup')}>
                    <span className="font-bold uppercase flex items-center gap-2"><MapPin size={18}/> Retiro Personal</span>
                    <div className={`w-10 h-6 rounded-full border flex items-center px-1 transition-colors ${config.methods.pickup ? 'bg-black border-black justify-end' : 'bg-gray-100 border-gray-200 justify-start'}`}>
                        <div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm"/>
                    </div>
                 </div>

                 {config.methods.pickup && (
                    <div className="pl-4 border-l-2 border-gray-100 space-y-3 animate-in fade-in">
                        <p className="text-xs text-gray-500">Agrega las direcciones donde el cliente puede buscar su pedido.</p>
                        
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Ej: C.C. Free Market, Local B-20, Naguanagua"
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-black outline-none"
                                value={newLocation}
                                onChange={(e) => setNewLocation(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addLocation()}
                            />
                            <button onClick={addLocation} className="bg-black text-white px-3 py-2 rounded-lg text-xs font-bold uppercase hover:bg-gray-800">Agregar</button>
                        </div>

                        <ul className="space-y-2">
                            {config.pickup_locations.map((loc, idx) => (
                                <li key={idx} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-md border border-gray-100 text-sm">
                                    <span className="truncate mr-2">{loc}</span>
                                    <button onClick={() => removeLocation(idx)} className="text-red-500 hover:text-red-700 font-bold text-xs">ELIMINAR</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                 )}
            </div>
        </div>
    </div>
  )
}