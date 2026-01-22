'use client'

import { useState, useEffect } from 'react'
import { 
  ShoppingCart, X, Check, 
  Smartphone, CreditCard, Banknote, Landmark, Bitcoin,
  ArrowRight, Loader2, Truck, MapPin, User, FileText
} from 'lucide-react'
import { useCart } from '@/app/store/useCart'
import Swal from 'sweetalert2'
import { supabase } from '@/lib/supabase'

// Corrección 1: Eliminé 'props' de los argumentos (era basura/typo)
export default function FloatingCheckout({ 
    rate, currency, phone, storeName, paymentMethods, storeId, 
    shippingConfig // <--- La prop que viene de la DB
}: any) {
  const { items, removeItem, clearCart, totalItems } = useCart()
  
  // --- CORRECCIÓN: Asegurar que config existe aunque venga null ---
  const config = shippingConfig || { methods: {}, pickup_locations: [] }
  const methods = config.methods || {} // Shortcut seguro
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1) // 1: Cart, 2: Form & Shipping, 3: Payment
  const [isSubmitting, setIsSubmitting] = useState(false)

  // --- ESTADO DEL USUARIO (Smart Form) ---
  const [formData, setFormData] = useState({
    name: '',
    dni: '', 
    phone: '',
    shippingMethod: '', 
    shippingDetails: '' 
  })

  // Estado para hidratación
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 1. CARGAR DATOS GUARDADOS (Memoria Elite)
  // Corrección 2: Este Hook ahora se ejecuta SIEMPRE (Regla de Oro de React)
  useEffect(() => {
    if (isOpen) {
        const saved = localStorage.getItem('preziso_user_data')
        if (saved) {
            const parsed = JSON.parse(saved)
            setFormData(prev => ({ ...prev, ...parsed })) 
        }
    }
  }, [isOpen])

  // --- LÓGICA DE PRECIOS ---
  // Corrección 3: Estos Hooks estaban debajo del return condicional. Ahora están seguros.
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null)
  
  const isDiscountMethod = (key: string | null) => {
     if(!key) return false
     const k = key.toLowerCase()
     return k.includes('zelle') || k.includes('cash') || k.includes('efectivo') || k.includes('binance') || k.includes('usdt')
  }
  const applyDiscount = isDiscountMethod(selectedPayment)

  const totalUSD = items.reduce((acc, item) => acc + ((applyDiscount ? item.basePrice : (item.basePrice + item.penalty)) * item.quantity), 0)
  const totalBs = items.reduce((acc, item) => acc + ((applyDiscount ? item.basePrice : (item.basePrice + item.penalty)) * rate * item.quantity), 0)

  // --- MANEJADORES ---
  const handleNextStep = () => {
    if (step === 2) {
        // Validar Formulario
        if (!formData.name || !formData.phone || !formData.dni) return Swal.fire('Faltan Datos', 'Por favor completa tu información', 'warning')
        if (!formData.shippingMethod) return Swal.fire('Envío', 'Selecciona cómo quieres recibir tu pedido', 'warning')
        if (formData.shippingMethod !== 'pickup' && !formData.shippingDetails) return Swal.fire('Dirección', 'Ingresa la dirección o oficina de envío', 'warning')
        
        // Guardar en memoria
        localStorage.setItem('preziso_user_data', JSON.stringify({ 
            name: formData.name, dni: formData.dni, phone: formData.phone 
        }))
    }
    setStep(prev => prev + 1)
  }

  const handleCheckout = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    // 1. SHADOW LOG (Guardar Orden)
    try {
        if (storeId) {
            const { data: order, error } = await supabase.from('orders').insert({
                store_id: storeId,
                customer_name: formData.name,
                customer_phone: formData.phone,
                customer_dni: formData.dni,
                shipping_method: formData.shippingMethod,
                shipping_details: { address: formData.shippingDetails }, // Guardamos como JSON válido
                payment_method: selectedPayment,
                total_usd: totalUSD,
                total_bs: totalBs,
                exchange_rate: rate,
                status: 'pending'
            }).select().single()

            if (order) {
                const itemsData = items.map(item => ({
                    order_id: order.id,
                    product_id: item.productId,
                    variant_id: item.variantId || null, 
                    product_name: item.name,
                    quantity: item.quantity,
                    price_at_purchase: applyDiscount ? item.basePrice : (item.basePrice + item.penalty),
                    variant_info: item.variantInfo
                }))
                await supabase.from('order_items').insert(itemsData)
            }
        }
    } catch (e) { console.error(e) }

    // 2. CONSTRUIR WHATSAPP
    let msg = `*NUEVO PEDIDO - ${storeName.toUpperCase()}*\n`
    msg += `--------------------------------\n`
    msg += `👤 *Cliente:* ${formData.name} (${formData.dni})\n`
    msg += `📦 *Envío:* ${formData.shippingMethod.toUpperCase()}\n`
    if(formData.shippingDetails) msg += `📍 *Detalle:* ${formData.shippingDetails}\n`
    msg += `--------------------------------\n`
    
    items.forEach(item => {
        const price = applyDiscount ? item.basePrice : (item.basePrice + item.penalty)
        msg += `${item.quantity}x ${item.name} `
        if(item.variantInfo) msg += `[${item.variantInfo}] `
        msg += `- $${price.toFixed(2)}\n`
    })

    msg += `--------------------------------\n`
    msg += `*TOTAL: $${totalUSD.toFixed(2)}*\n`
    if(rate > 0) msg += `Ref: Bs ${new Intl.NumberFormat('es-VE').format(totalBs)}\n`
    
    if(selectedPayment) {
        msg += `\n💳 Método: ${selectedPayment.replace(/_/g, ' ').toUpperCase()}`
        if(applyDiscount) msg += ` (Descuento Aplicado)`
    }

    // 3. ENVIAR
    setTimeout(() => {
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
        clearCart()
        setIsOpen(false)
        setStep(1)
        setIsSubmitting(false)
    }, 800)
  }

  // Corrección 4: EL RETORNO CONDICIONAL VA AL FINAL, DESPUÉS DE TODOS LOS HOOKS
  if (!isMounted || totalItems() === 0) return null
console.log("DEBUG ENVÍOS:", shippingConfig);
  return (
    <>
      {/* BOTÓN FLOTANTE */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-50">
        <button onClick={() => setIsOpen(true)} className="w-full md:w-[300px] bg-black text-white p-4 rounded-xl shadow-2xl flex items-center justify-between hover:scale-105 transition-transform">
           <div className="flex items-center gap-3">
               <div className="bg-white/20 p-2 rounded-lg relative">
                   <ShoppingCart size={20} />
                   <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold">{totalItems()}</span>
               </div>
               <div className="flex flex-col text-left">
                   <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Tu Pedido</span>
                   <span className="font-bold text-sm">Ver Carrito</span>
               </div>
           </div>
           <span className="font-mono text-lg font-bold">${totalUSD.toFixed(2)}</span>
        </button>
      </div>

      {/* MODAL */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in">
           <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
               
               {/* HEADER */}
               <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                   <div>
                       <h2 className="font-black text-xl uppercase tracking-tight">
                           {step === 1 ? 'Tu Carrito' : step === 2 ? 'Datos y Envío' : 'Método de Pago'}
                       </h2>
                       <p className="text-xs text-gray-400 font-bold">PASO {step} DE 3</p>
                   </div>
                   <button onClick={() => setIsOpen(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={18}/></button>
               </div>

               {/* BODY */}
               <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                   
                   {/* PASO 1: LISTA DE PRODUCTOS */}
                   {step === 1 && (
                       <div className="space-y-3">
                           {items.map(item => {
                               const price = applyDiscount ? item.basePrice : (item.basePrice + item.penalty)
                               return (
                                   <div key={item.id} className="bg-white p-3 rounded-xl border border-gray-200 flex gap-3 items-center">
                                       <div className="w-14 h-14 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden">
                                           {item.image ? <img src={item.image} className="w-full h-full object-contain"/> : <span className="text-xs text-gray-300">P.</span>}
                                       </div>
                                       <div className="flex-1">
                                           <h4 className="font-bold text-sm text-gray-900 leading-tight">{item.name}</h4>
                                           {item.variantInfo && <p className="text-[10px] font-bold text-gray-400 uppercase bg-gray-100 inline-block px-1.5 rounded mt-1">{item.variantInfo}</p>}
                                           <div className="flex justify-between mt-2">
                                               <span className="text-xs font-mono font-bold">${price.toFixed(2)} x {item.quantity}</span>
                                               <button onClick={() => removeItem(item.id)} className="text-[10px] text-red-500 font-bold underline">ELIMINAR</button>
                                           </div>
                                       </div>
                                   </div>
                               )
                           })}
                       </div>
                   )}

                   {/* PASO 2: DATOS Y ENVÍO */}
                   {step === 2 && (
                       <div className="space-y-6">
                           {/* DATOS PERSONALES */}
                           <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                               <h3 className="text-xs font-black text-gray-400 uppercase flex items-center gap-2"><User size={14}/> Tus Datos</h3>
                               <div className="grid grid-cols-2 gap-3">
                                   <input type="text" placeholder="Tu Nombre" className="col-span-2 input-elite" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                   <input type="tel" placeholder="Teléfono" className="input-elite" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                   <input type="text" placeholder="Cédula/ID" className="input-elite" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} />
                               </div>
                           </div>

                           {/* MÉTODO DE ENVÍO */}
                           <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                               <h3 className="text-xs font-black text-gray-400 uppercase flex items-center gap-2"><Truck size={14}/> Método de Entrega</h3>
                               
                               <div className="grid grid-cols-2 gap-2">
                                 {/* PICKUP */}
{methods.pickup && (
    <button 
        onClick={() => setFormData({...formData, shippingMethod: 'pickup', shippingDetails: ''})}
        className={`p-3 rounded-lg border text-left text-xs font-bold transition-all ${formData.shippingMethod === 'pickup' ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
    >
        Retiro Personal
    </button>
)}

{/* NACIONALES */}
{['mrw', 'zoom', 'tealca'].map(m => (
    methods[m] && ( // <--- USAR LA VARIABLE SEGURA
        <button 
            key={m}
            onClick={() => setFormData({...formData, shippingMethod: m, shippingDetails: ''})}
            className={`p-3 rounded-lg border text-left text-xs font-bold uppercase transition-all ${formData.shippingMethod === m ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
        >
            Envío {m}
        </button>
    )
))}

{/* DELIVERY */}
{methods.delivery && (
    <button 
        onClick={() => setFormData({...formData, shippingMethod: 'delivery', shippingDetails: ''})}
        className={`p-3 rounded-lg border text-left text-xs font-bold transition-all ${formData.shippingMethod === 'delivery' ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
    >
        Delivery Moto
    </button>
)}
                               </div>

                               {/* DETALLE SEGÚN SELECCIÓN */}
                               {formData.shippingMethod === 'pickup' && shippingConfig?.pickup_locations?.length > 0 && (
                                   <div className="mt-3 animate-in fade-in">
                                       <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Sede de Retiro</label>
                                       <select 
                                            className="w-full input-elite" 
                                            value={formData.shippingDetails}
                                            onChange={(e) => setFormData({...formData, shippingDetails: e.target.value})}
                                        >
                                            <option value="">Selecciona una sede...</option>
                                            {shippingConfig.pickup_locations.map((loc: string) => (
                                                <option key={loc} value={loc}>{loc}</option>
                                            ))}
                                       </select>
                                   </div>
                               )}

                               {['mrw', 'zoom', 'tealca', 'delivery'].includes(formData.shippingMethod) && (
                                   <div className="mt-3 animate-in fade-in">
                                       <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Dirección Exacta / Oficina</label>
                                       <textarea 
                                            placeholder="Ej: Estado Carabobo, Valencia. Oficina MRW Av. Bolívar..."
                                            className="w-full input-elite h-20 resize-none"
                                            value={formData.shippingDetails}
                                            onChange={(e) => setFormData({...formData, shippingDetails: e.target.value})}
                                       />
                                   </div>
                               )}
                           </div>
                       </div>
                   )}

                   {/* PASO 3: PAGO Y CONFIRMACIÓN */}
                   {step === 3 && (
                       <div className="space-y-4">
                           <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-xs text-orange-800 font-medium">
                               <InfoIcon className="inline mr-1 w-4 h-4"/> Selecciona el método de pago para calcular el total final.
                           </div>
                           <div className="grid grid-cols-1 gap-2">
                               {paymentMethods && Object.entries(paymentMethods).map(([key, val]: any) => {
                                   if (!val.active) return null
                                   return (
                                       <button
                                            key={key}
                                            onClick={() => setSelectedPayment(key)}
                                            className={`p-4 rounded-xl border flex items-center justify-between transition-all ${selectedPayment === key ? 'bg-black text-white border-black shadow-lg' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                                       >
                                           <div className="flex items-center gap-3">
                                               {key.includes('movil') ? <Smartphone size={18}/> : <Banknote size={18}/>}
                                               <span className="font-bold text-sm uppercase">{key.replace(/_/g, ' ')}</span>
                                           </div>
                                           {selectedPayment === key && <Check size={16}/>}
                                       </button>
                                   )
                               })}
                           </div>
                       </div>
                   )}
               </div>

               {/* FOOTER */}
               <div className="p-5 border-t border-gray-100 bg-white">
                   <div className="flex justify-between items-end mb-4">
                       <span className="text-xs font-bold text-gray-400 uppercase">Total a Pagar</span>
                       <div className="text-right">
                           <div className="text-2xl font-black text-black leading-none">${totalUSD.toFixed(2)}</div>
                           {rate > 0 && <div className="text-xs font-mono font-bold text-gray-500 mt-1">Bs {new Intl.NumberFormat('es-VE').format(totalBs)}</div>}
                       </div>
                   </div>

                   {step < 3 ? (
                       <button onClick={handleNextStep} className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-gray-800 transition-all flex justify-center gap-2">
                           Continuar <ArrowRight size={18}/>
                       </button>
                   ) : (
                       <button 
                            onClick={handleCheckout} 
                            disabled={!selectedPayment || isSubmitting}
                            className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm flex justify-center gap-2 transition-all ${selectedPayment && !isSubmitting ? 'bg-green-600 text-white hover:bg-green-700 shadow-xl shadow-green-200' : 'bg-gray-200 text-gray-400'}`}
                        >
                           {isSubmitting ? <Loader2 className="animate-spin"/> : 'Finalizar Pedido en WhatsApp'}
                       </button>
                   )}
               </div>
           </div>
        </div>
      )}

      <style jsx global>{`
        .input-elite {
            @apply w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all placeholder:text-gray-400;
        }
      `}</style>
    </>
  )
}

function InfoIcon({className}: any) {
    return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
}