'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Save, CreditCard, Truck, Loader2, Check, Smartphone, Bitcoin, DollarSign, MapPin, Box } from 'lucide-react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'

export default function SettingsPage() {
  const supabase = getSupabase()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState('')

  // --- ESTADO DE PAGOS ---
  const [payments, setPayments] = useState({
    pago_movil: { active: false, details: '' }, // Tlf + CI + Banco
    zelle: { active: false, details: '' },      // Email
    binance: { active: false, details: '' },    // Pay ID / Email
    zinli: { active: false, details: '' },      // Email
    cash: { active: false, details: '' }        // Instrucciones (Ej: Billete buen estado)
  })

  // --- ESTADO DE ENVÍOS ---
  const [shipping, setShipping] = useState({
    pickup: { active: true, details: '' }, // Dirección de entrega personal
    mrw: { active: false, price: 0 },
    zoom: { active: false, price: 0 },
    tealca: { active: false, price: 0 }
  })

  // 1. CARGAR CONFIGURACIÓN
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: store } = await supabase
            .from('stores')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (store) {
            setStoreId(store.id)
            // Fusionar con defaults para evitar errores si viene null
            if (store.payment_config) setPayments({ ...payments, ...store.payment_config })
            if (store.shipping_config) setShipping({ ...shipping, ...store.shipping_config })
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  // 2. GUARDAR
  const handleSave = async () => {
    setSaving(true)
    try {
        const { error } = await supabase
            .from('stores')
            .update({
                payment_config: payments,
                shipping_config: shipping
            })
            .eq('id', storeId)

        if (error) throw error
        
        const Toast = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 1500,
            customClass: { popup: 'rounded-xl font-bold' }
        })
        Toast.fire({ icon: 'success', title: 'Configuración Guardada' })

    } catch (error) {
        Swal.fire('Error', 'No se pudo guardar', 'error')
    } finally {
        setSaving(false)
    }
  }

  // Helper para toggles
  const togglePayment = (key: keyof typeof payments) => {
    setPayments(prev => ({ ...prev, [key]: { ...prev[key], active: !prev[key].active } }))
  }
  const toggleShipping = (key: keyof typeof shipping) => {
    setShipping(prev => ({ ...prev, [key]: { ...prev[key], active: !prev[key].active } }))
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F8F9FA]"><Loader2 className="animate-spin"/></div>

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20 font-sans text-gray-900">
        
        {/* HEADER */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 px-4 md:px-8 py-4 flex justify-between items-center transition-all">
            <div className="flex items-center gap-4">
                <Link href="/admin" className="p-2 bg-white border border-gray-200 hover:border-black hover:bg-gray-50 rounded-full transition-all group">
                    <ArrowLeft size={18} className="text-gray-500 group-hover:text-black"/>
                </Link>
                <div>
                    <h1 className="font-black text-xl tracking-tight leading-none">Ajustes</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Pagos y Envíos</p>
                </div>
            </div>
            <button onClick={handleSave} disabled={saving} className="bg-black text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg">
                {saving ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> Guardar</>}
            </button>
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">
            
            {/* SECCIÓN 1: MÉTODOS DE PAGO */}
            <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                    <CreditCard className="text-blue-600" size={20}/> Métodos de Pago
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* PAGO MÓVIL */}
                    <div className={`p-4 rounded-2xl border-2 transition-all ${payments.pago_movil.active ? 'border-blue-500 bg-blue-50/30' : 'border-gray-100 bg-gray-50'}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <Smartphone size={18} className={payments.pago_movil.active ? 'text-blue-600' : 'text-gray-400'}/>
                                <span className="font-bold text-sm">Pago Móvil</span>
                            </div>
                            <button onClick={() => togglePayment('pago_movil')} className={`w-10 h-6 rounded-full p-1 transition-colors ${payments.pago_movil.active ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${payments.pago_movil.active ? 'translate-x-4' : ''}`}></div>
                            </button>
                        </div>
                        {payments.pago_movil.active && (
                            <input 
                                value={payments.pago_movil.details}
                                onChange={(e) => setPayments({...payments, pago_movil: {...payments.pago_movil, details: e.target.value}})}
                                placeholder="Ej: 0412-1234567, CI 123456, Banesco"
                                className="w-full text-xs p-2 rounded-lg border border-gray-200 focus:border-blue-500 outline-none"
                            />
                        )}
                    </div>

                    {/* ZELLE */}
                    <div className={`p-4 rounded-2xl border-2 transition-all ${payments.zelle.active ? 'border-purple-500 bg-purple-50/30' : 'border-gray-100 bg-gray-50'}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <DollarSign size={18} className={payments.zelle.active ? 'text-purple-600' : 'text-gray-400'}/>
                                <span className="font-bold text-sm">Zelle</span>
                            </div>
                            <button onClick={() => togglePayment('zelle')} className={`w-10 h-6 rounded-full p-1 transition-colors ${payments.zelle.active ? 'bg-purple-600' : 'bg-gray-300'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${payments.zelle.active ? 'translate-x-4' : ''}`}></div>
                            </button>
                        </div>
                        {payments.zelle.active && (
                            <input 
                                value={payments.zelle.details}
                                onChange={(e) => setPayments({...payments, zelle: {...payments.zelle, details: e.target.value}})}
                                placeholder="Ej: micorreo@gmail.com (Titular)"
                                className="w-full text-xs p-2 rounded-lg border border-gray-200 focus:border-purple-500 outline-none"
                            />
                        )}
                    </div>

                    {/* BINANCE */}
                    <div className={`p-4 rounded-2xl border-2 transition-all ${payments.binance.active ? 'border-yellow-500 bg-yellow-50/30' : 'border-gray-100 bg-gray-50'}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <Bitcoin size={18} className={payments.binance.active ? 'text-yellow-600' : 'text-gray-400'}/>
                                <span className="font-bold text-sm">Binance Pay</span>
                            </div>
                            <button onClick={() => togglePayment('binance')} className={`w-10 h-6 rounded-full p-1 transition-colors ${payments.binance.active ? 'bg-yellow-500' : 'bg-gray-300'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${payments.binance.active ? 'translate-x-4' : ''}`}></div>
                            </button>
                        </div>
                        {payments.binance.active && (
                            <input 
                                value={payments.binance.details}
                                onChange={(e) => setPayments({...payments, binance: {...payments.binance, details: e.target.value}})}
                                placeholder="Ej: Pay ID o Correo"
                                className="w-full text-xs p-2 rounded-lg border border-gray-200 focus:border-yellow-500 outline-none"
                            />
                        )}
                    </div>

                    {/* CASH */}
                    <div className={`p-4 rounded-2xl border-2 transition-all ${payments.cash.active ? 'border-green-500 bg-green-50/30' : 'border-gray-100 bg-gray-50'}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <DollarSign size={18} className={payments.cash.active ? 'text-green-600' : 'text-gray-400'}/>
                                <span className="font-bold text-sm">Efectivo (Divisa)</span>
                            </div>
                            <button onClick={() => togglePayment('cash')} className={`w-10 h-6 rounded-full p-1 transition-colors ${payments.cash.active ? 'bg-green-600' : 'bg-gray-300'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${payments.cash.active ? 'translate-x-4' : ''}`}></div>
                            </button>
                        </div>
                        {payments.cash.active && (
                            <input 
                                value={payments.cash.details}
                                onChange={(e) => setPayments({...payments, cash: {...payments.cash, details: e.target.value}})}
                                placeholder="Ej: Solo billetes en buen estado"
                                className="w-full text-xs p-2 rounded-lg border border-gray-200 focus:border-green-500 outline-none"
                            />
                        )}
                    </div>
                </div>
            </section>

            {/* SECCIÓN 2: MÉTODOS DE ENVÍO */}
            <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                    <Truck className="text-black" size={20}/> Logística y Envíos
                </h2>
                
                <div className="space-y-4">
                    
                    {/* PICKUP */}
                    <div className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl hover:border-black transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="bg-gray-50 p-2 rounded-lg"><MapPin size={20}/></div>
                            <div>
                                <p className="font-bold text-sm">Entrega Personal (Pickup)</p>
                                {shipping.pickup.active && <input 
                                    value={shipping.pickup.details}
                                    onChange={(e) => setShipping({...shipping, pickup: {...shipping.pickup, details: e.target.value}})}
                                    placeholder="Dirección de tu tienda/casa..."
                                    className="mt-1 text-xs border-b border-gray-200 py-2 px-1.5 rounded-lg focus:border-black outline-none w-full md:w-64"
                                />}
                            </div>
                        </div>
                        <button onClick={() => toggleShipping('pickup')} className={`w-10 h-6 shrink-0 rounded-full p-1 transition-colors ${shipping.pickup.active ? 'bg-black' : 'bg-gray-300'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${shipping.pickup.active ? 'translate-x-4' : ''}`}></div>
                        </button>
                    </div>

                    {/* COURIERS */}
                    {['mrw', 'zoom', 'tealca'].map((courier) => (
                        <div key={courier} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl hover:border-black transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Box size={20}/></div>
                                <div>
                                    <p className="font-bold text-sm uppercase">{courier}</p>
                                    <p className="text-xs text-gray-400">Envío nacional cobro en destino</p>
                                </div>
                            </div>
                            <button onClick={() => toggleShipping(courier as any)} className={`w-10 h-6 shrink-0 rounded-full p-1 transition-colors ${shipping[courier as keyof typeof shipping].active ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${shipping[courier as keyof typeof shipping].active ? 'translate-x-4' : ''}`}></div>
                            </button>
                        </div>
                    ))}

                </div>
            </section>
        </div>
    </div>
  )
}