'use client'

import { useState, useMemo } from 'react'
import { 
  ShoppingCart, 
  X, 
  Trash2, 
  ArrowRight, 
  MessageCircle, 
  Loader2, 
  Check, 
  CreditCard, 
  Copy, 
  AlertCircle, 
  ShoppingBag, 
  Truck,
  ChevronRight,
  Minus,
  Plus
} from 'lucide-react'
import { useCart } from '@/app/store/useCart'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'

interface CheckoutProps {
  rates: { usd: number, eur: number }
  currency: 'usd' | 'eur'
  phone: string
  storeName: string
  storeId: string 
  storeConfig: any 
}

export default function FloatingCheckout({ rates, currency, phone, storeName, storeId, storeConfig }: CheckoutProps) {
  const { items, removeItem, clearCart, updateQuantity } = useCart()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1) 
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // 1. CONFIGURACIÓN
  const isEurMode = currency === 'eur'
  const activeRate = isEurMode ? rates.eur : rates.usd
  const currencySymbol = '$' 

  const payments = storeConfig?.payment_config || {}
  const shipping = storeConfig?.shipping_config || {}
  const paymentKeysMap: { [key: string]: string } = { 'Pago Móvil': 'pago_movil', 'Zelle': 'zelle', 'Binance': 'binance', 'Zinli': 'zinli', 'Efectivo': 'cash' }
  
  const hardCurrencyMethods = ['Zelle', 'Binance', 'Zinli', 'Efectivo']

  const activePaymentMethods = useMemo(() => {
      const active = []
      if (payments.pago_movil?.active) active.push('Pago Móvil')
      if (payments.zelle?.active) active.push('Zelle')
      if (payments.binance?.active) active.push('Binance')
      if (payments.zinli?.active) active.push('Zinli')
      if (payments.cash?.active) active.push('Efectivo')
      return active
  }, [payments])

  const activeCouriers = useMemo(() => {
      const active = []
      if (shipping.mrw?.active) active.push('MRW')
      if (shipping.zoom?.active) active.push('Zoom')
      if (shipping.tealca?.active) active.push('Tealca')
      return active
  }, [shipping])

  const [clientData, setClientData] = useState({ name: '', paymentMethod: '', deliveryType: 'pickup', courier: '', address: '', identityCard: '', phone: '', notes: '' })

  // --- CÁLCULOS MATEMÁTICOS ---
  const totalBaseNominal = useMemo(() => items.reduce((acc, item) => acc + (item.basePrice * item.quantity), 0), [items])
  const totalPenaltyNominal = useMemo(() => items.reduce((acc, item) => acc + ((item.penalty || 0) * item.quantity), 0), [items])
  const finalTotalBs = (totalBaseNominal + totalPenaltyNominal) * activeRate
  const isHardCurrencyPayment = clientData.paymentMethod && hardCurrencyMethods.includes(clientData.paymentMethod)
  
  const displayTotalDivisa = totalBaseNominal
  const displayTotalSavings = totalPenaltyNominal

  // --- UI ALERTAS (Clean Look) ---
  const getAlert = () => {
      if (!clientData.paymentMethod) return null
      
      if (isHardCurrencyPayment) {
          if (totalPenaltyNominal > 0) {
              return (
                  <div className="bg-emerald-50/80 border border-emerald-100/50 rounded-xl p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
                      <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-full shrink-0"><Check size={12} strokeWidth={3}/></div>
                      <div>
                          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5">Descuento Aplicado</p>
                          <p className="text-xs text-emerald-600/90 font-medium leading-relaxed">
                            Ahorras <span className="font-bold text-emerald-700">{currencySymbol}{displayTotalSavings.toFixed(2)}</span> por pagar en divisa.
                          </p>
                      </div>
                  </div>
              )
          }
      } else {
          if (totalPenaltyNominal > 0) {
              return (
                  <div className="bg-orange-50/80 border border-orange-100/50 rounded-xl p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
                      <div className="bg-orange-100 text-orange-600 p-1.5 rounded-full shrink-0"><AlertCircle size={12} strokeWidth={3}/></div>
                      <div>
                          <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wider mb-0.5">Sugerencia de Ahorro</p>
                          <p className="text-xs text-orange-600/90 font-medium leading-relaxed">
                              Paga en Efectivo o Zelle y ahorra <span className="font-bold border-b border-orange-200 border-dashed">{currencySymbol}{displayTotalSavings.toFixed(2)}</span> en tu compra.
                          </p>
                      </div>
                  </div>
              )
          }
      }
      return null
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const getSelectedPaymentDetails = () => {
      if (!clientData.paymentMethod) return null
      const key = paymentKeysMap[clientData.paymentMethod]
      // @ts-ignore
      return payments[key]?.details || ''
  }
  
  const [supabase] = useState(() => getSupabase())

  const handleCheckout = async () => {
    if (!clientData.name) return Swal.fire({ title: 'Falta Nombre', text: 'Indícanos tu nombre', icon: 'warning', confirmButtonColor: '#000' })
    if (!clientData.paymentMethod) return Swal.fire({ title: 'Método de Pago', text: 'Selecciona cómo deseas pagar', icon: 'warning', confirmButtonColor: '#000' })
    if (clientData.deliveryType === 'courier' && (!clientData.courier || !clientData.identityCard || !clientData.phone || !clientData.address)) return Swal.fire({ title: 'Datos de Envío', text: 'Completa la información de envío', icon: 'warning', confirmButtonColor: '#000' })

    setLoading(true)

    try {
        const deliveryInfoFull = clientData.deliveryType === 'pickup' ? 'Retiro Personal' : `${clientData.courier} - ${clientData.address} | CI: ${clientData.identityCard} | Tlf: ${clientData.phone}`

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                store_id: storeId,
                customer_name: clientData.name,
                customer_phone: clientData.phone,
                total_usd: isHardCurrencyPayment ? totalBaseNominal : (totalBaseNominal + totalPenaltyNominal), 
                total_bs: finalTotalBs, 
                exchange_rate: activeRate,
                currency_type: currency, 
                status: 'pending',
                payment_method: clientData.paymentMethod,
                shipping_method: clientData.deliveryType === 'pickup' ? 'pickup' : clientData.courier,
                delivery_info: deliveryInfoFull
            })
            .select()
            .single()

        if (orderError) throw orderError

        const orderItems = items.map(item => ({
            order_id: order.id,
            product_id: item.productId,
            product_name: item.name,
            variant_info: item.variantInfo || 'N/A',
            quantity: item.quantity,
            price_at_purchase: item.basePrice, 
            variant_id: (item.variantId && item.variantId.length === 36) ? item.variantId : null 
        }))

        await supabase.from('order_items').insert(orderItems)

        let message = `*PEDIDO #${order.order_number}* 🛍️\n`
        message += `Cliente: *${clientData.name}*\n`
        message += `────────────────\n`
        items.forEach(item => { message += `▪️ ${item.quantity}x ${item.name} ${item.variantInfo ? `(${item.variantInfo})` : ''}\n` })
        
        if (isHardCurrencyPayment) {
            message += `────────────────\n*TOTAL: ${currencySymbol}${totalBaseNominal.toFixed(2)}*\n`
        } else {
            message += `────────────────\n*TOTAL BS: ${finalTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}*\n`
            message += `_Ref: ${currencySymbol}${(totalBaseNominal + totalPenaltyNominal).toFixed(2)}_\n`
        }
        
        message += `\n📦 *ENTREGA:* ${clientData.deliveryType === 'pickup' ? 'Retiro' : clientData.courier}\n`
        if (clientData.deliveryType === 'courier') message += `📍 ${clientData.address}\n🆔 CI ${clientData.identityCard}\n`
        
        message += `💳 *PAGO:* ${clientData.paymentMethod}\n`
        if (clientData.notes) message += `📝 Nota: ${clientData.notes}\n`
        
        clearCart()
        setIsOpen(false)
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')

    } catch (error: any) {
        Swal.fire('Error', error.message, 'error')
    } finally {
        setLoading(false)
    }
  }

  if (items.length === 0 && !isOpen) return null

  return (
    <>
        {/* --- BOTÓN FLOTANTE "ISLA" --- */}
        {!isOpen && items.length > 0 && (
            <div className="fixed bottom-6 left-0 right-0 px-4 z-50 flex justify-center animate-in slide-in-from-bottom-10 fade-in duration-500">
                <button 
                    onClick={() => setIsOpen(true)} 
                    className="bg-black/90 backdrop-blur-md text-white pl-4 pr-5 py-3 rounded-full shadow-2xl shadow-black/20 flex items-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all border border-white/10 group w-full max-w-sm justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="relative bg-white/10 p-2 rounded-full">
                            <ShoppingCart size={20} className="pointer-events-none" strokeWidth={2} />
                            <span className="absolute -top-1 -right-1 bg-white text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-sm pointer-events-none">
                                {items.reduce((acc, i) => acc + i.quantity, 0)}
                            </span>
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-[10px] font-medium text-white/60 uppercase tracking-widest leading-none mb-0.5">Total</span>
                            <span className="text-base font-bold tracking-tight">{currencySymbol}{totalBaseNominal.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                        <span className="text-xs font-semibold tracking-wide">Pagar</span>
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform pointer-events-none"/>
                    </div>
                </button>
            </div>
        )}

        {/* --- MODAL FULLSCREEN / DRAWER --- */}
        {isOpen && (
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)}></div>
                
                <div className="relative bg-white w-full md:max-w-md h-[92vh] md:h-[85vh] rounded-t-[32px] md:rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-16 duration-300 ease-out">
                    
                    {/* Header */}
                    <div className="bg-white px-6 pt-6 pb-4 flex justify-between items-center shrink-0 border-b border-gray-50">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">{step === 1 ? 'Tu Bolsa' : 'Checkout'}</h2>
                            <p className="text-xs text-gray-400 font-medium">{step === 1 ? 'Revisa tus items' : 'Completa tus datos'}</p>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors text-gray-500"><X size={20}/></button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                        {step === 1 ? (
                            <div className="space-y-6">
                                {items.map((item) => {
                                    const itemTotalNominal = item.basePrice * item.quantity
                                    return (
                                        <div key={item.id} className="flex gap-4 group">
                                            <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0 border border-gray-100 relative">
                                                <img src={item.image} className="w-full h-full object-cover mix-blend-multiply" />
                                                {item.penalty > 0 && <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-500"></div>}
                                            </div>
                                            
                                            <div className="flex-1 flex flex-col justify-between py-0.5">
                                                <div>
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-snug">{item.name}</h3>
                                                        <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 p-1 -mr-2"><Trash2 size={16}/></button>
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 mt-0.5">{item.variantInfo || 'Estándar'}</p>
                                                </div>
                                                
                                                <div className="flex items-end justify-between mt-2">
                                                    <span className="font-bold text-sm text-gray-900">{currencySymbol}{itemTotalNominal.toFixed(2)}</span>
                                                    <div className="flex items-center bg-gray-50 rounded-lg p-1 gap-3 border border-gray-100">
                                                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm border border-gray-100 text-gray-500 hover:text-black disabled:opacity-50" disabled={item.quantity <= 1}><Minus size={12}/></button>
                                                        <span className="text-xs font-semibold w-3 text-center">{item.quantity}</span>
                                                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center bg-black text-white rounded-md shadow-sm hover:bg-gray-800"><Plus size={12}/></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-300">
                                {/* PASO 1: Contacto */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-900 uppercase tracking-widest">
                                        <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px]">1</span>
                                        Contacto
                                    </div>
                                    <input 
                                        value={clientData.name} 
                                        onChange={e => setClientData({...clientData, name: e.target.value})} 
                                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-black focus:bg-white focus:ring-0 transition-all outline-none" 
                                        placeholder="Nombre completo" 
                                        autoFocus
                                    />
                                </div>
                                
                                {/* PASO 2: Entrega */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-900 uppercase tracking-widest">
                                        <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px]">2</span>
                                        Método de Entrega
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setClientData({...clientData, deliveryType: 'pickup'})} className={`p-4 rounded-xl border text-sm font-medium flex flex-col items-center justify-center gap-2 transition-all duration-300 ${clientData.deliveryType==='pickup' ? 'border-black bg-black text-white shadow-lg':'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'}`}>
                                            <ShoppingBag size={20} strokeWidth={1.5} className="pointer-events-none"/> 
                                            <span>Retiro</span>
                                        </button>
                                        <button onClick={() => setClientData({...clientData, deliveryType: 'courier'})} className={`p-4 rounded-xl border text-sm font-medium flex flex-col items-center justify-center gap-2 transition-all duration-300 ${clientData.deliveryType==='courier' ? 'border-black bg-black text-white shadow-lg':'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'}`}>
                                            <Truck size={20} strokeWidth={1.5} className="pointer-events-none"/> 
                                            <span>Envío</span>
                                        </button>
                                    </div>

                                    {clientData.deliveryType === 'courier' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-wider">Empresa de Encomiendas</label>
                                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                                    {activeCouriers.map(c => (
                                                        <button key={c} onClick={() => setClientData({...clientData, courier: c})} className={`px-5 py-2.5 rounded-lg text-xs font-bold border whitespace-nowrap transition-all duration-200 ${clientData.courier === c ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>{c}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <input value={clientData.identityCard} onChange={e => setClientData({...clientData, identityCard: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-3 text-xs font-medium focus:border-black outline-none transition-colors" placeholder="Cédula (V-...)" />
                                                <input value={clientData.phone} onChange={e => setClientData({...clientData, phone: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-3 text-xs font-medium focus:border-black outline-none transition-colors" placeholder="Teléfono" />
                                            </div>
                                            <textarea value={clientData.address} onChange={e => setClientData({...clientData, address: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-3 text-xs font-medium text-gray-900 focus:border-black outline-none resize-none h-20 transition-colors" placeholder="Dirección exacta de envío..." />
                                        </div>
                                    )}
                                </div>

                                {/* PASO 3: Pago (REDISEÑADO) */}
                                <div className="space-y-4">
                                   <div className="flex items-center gap-2 text-xs font-bold text-gray-900 uppercase tracking-widest">
                                        <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px]">3</span>
                                        Pago
                                    </div>
                                   
                                   {/* Grilla de Métodos */}
                                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {activePaymentMethods.length > 0 ? activePaymentMethods.map(pm => (
                                         <button 
                                            key={pm} 
                                            onClick={() => setClientData({...clientData, paymentMethod: pm})} 
                                            className={`px-3 py-3 rounded-xl text-[11px] sm:text-xs font-bold border transition-all duration-300 ${
                                                clientData.paymentMethod === pm 
                                                ? 'bg-black text-white border-black shadow-md scale-[1.02]' 
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                         >
                                            {pm}
                                         </button>
                                      )) : <p className="text-xs text-red-400 bg-red-50 px-3 py-2 rounded-lg border border-red-100 col-span-3">No hay métodos activos.</p>}
                                   </div>
                                   
                                   {getAlert()}

                                    {/* Tarjeta de Detalles Premium */}
                                    {clientData.paymentMethod && getSelectedPaymentDetails() && (
                                        <div className="mt-2 relative overflow-hidden rounded-2xl bg-zinc-900 p-6 text-white shadow-xl animate-in zoom-in-95 duration-500">
                                              {/* Decoración de Fondo */}
                                              <div className="absolute top-[-20px] right-[-20px] opacity-10 rotate-12 pointer-events-none">
                                                  <CreditCard size={140} className="text-white"/>
                                              </div>
                                              
                                              <div className="relative z-10">
                                                  <div className="flex justify-between items-start mb-5">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Datos para Transferir</p>
                                                        <span className="text-sm font-bold text-white tracking-wide">{clientData.paymentMethod}</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleCopy(getSelectedPaymentDetails())} 
                                                        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-[10px] font-bold text-white uppercase transition-colors backdrop-blur-md border border-white/5"
                                                    >
                                                        {copied ? <Check size={12} className="pointer-events-none"/> : <Copy size={12} className="pointer-events-none"/>} 
                                                        {copied ? 'Copiado' : 'Copiar'}
                                                    </button>
                                                  </div>
                                                  
                                                  <div className="bg-black/30 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
                                                    <p className="font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{getSelectedPaymentDetails()}</p>
                                                  </div>
                                              </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- FOOTER RESPONSIVE (Fixed for Mobile) --- */}
                    <div className="bg-white px-5 py-4 border-t border-gray-100 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                            
                            {/* Bloque Precio */}
                            <div className="flex justify-between md:block items-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total a Pagar</p>
                                {isHardCurrencyPayment || step === 1 ? (
                                    <span className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tighter">{currencySymbol}{totalBaseNominal.toFixed(2)}</span>
                                ) : (
                                    <div className="flex flex-col items-end md:items-start">
                                        <span className="text-xl md:text-3xl font-bold text-gray-900 tracking-tighter">Bs {finalTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
                                        <span className="text-[10px] text-gray-400 font-semibold line-through">Ref: {currencySymbol}{(totalBaseNominal + totalPenaltyNominal).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Bloque Botones (Full width en mobile) */}
                            <div className="flex gap-3 w-full md:w-auto">
                                {step === 2 && (
                                    <button onClick={() => setStep(1)} className="px-4 py-3.5 text-xs font-bold text-gray-500 hover:text-black bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors md:w-auto shrink-0">
                                        Volver
                                    </button>
                                )}
                                
                                {step === 1 ? (
                                    <button onClick={() => setStep(2)} className="flex-1 md:flex-none bg-black text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-xl shadow-black/10 active:scale-95 flex items-center justify-center gap-2">
                                        Continuar <ChevronRight size={16} className="pointer-events-none"/>
                                    </button>
                                ) : (
                                    <button onClick={handleCheckout} disabled={loading} className="flex-1 md:flex-none bg-emerald-600 text-white px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                                        {loading ? <Loader2 className="animate-spin pointer-events-none" size={18}/> : <><MessageCircle size={18} className="pointer-events-none"/> Confirmar Pedido</>}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        <style jsx global>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
    </>
  )
}