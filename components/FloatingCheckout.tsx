'use client'

import { useState, useMemo } from 'react'
import { ShoppingCart, X, Trash2, ArrowRight, MessageCircle, Loader2, ShoppingBag, Truck, User, Phone, Copy, Check, CreditCard, Wallet } from 'lucide-react'
import { useCart } from '@/app/store/useCart'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'

interface CheckoutProps {
  rate: number
  currency: 'usd' | 'eur'
  phone: string
  storeName: string
  storeId: string 
  storeConfig: any 
}

export default function FloatingCheckout({ rate, currency, phone, storeName, storeId, storeConfig }: CheckoutProps) {
  const { items, removeItem, clearCart, updateQuantity } = useCart()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1) 
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const payments = storeConfig?.payment_config || {}
  const shipping = storeConfig?.shipping_config || {}

  const paymentKeysMap: { [key: string]: string } = {
      'Pago Móvil': 'pago_movil',
      'Zelle': 'zelle',
      'Binance': 'binance',
      'Zinli': 'zinli',
      'Efectivo': 'cash'
  }

  const dollarMethods = ['Zelle', 'Binance', 'Zinli', 'Efectivo']

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

  const [clientData, setClientData] = useState({
    name: '',
    paymentMethod: '',
    deliveryType: 'pickup',
    courier: '', 
    address: '',
    identityCard: '',
    phone: '',
    notes: ''
  })

  // Cálculos
  const totalBaseUSD = useMemo(() => items.reduce((acc, item) => acc + (item.price * item.quantity), 0), [items])
  const totalPenalty = useMemo(() => items.reduce((acc, item) => acc + ((item.penalty || 0) * item.quantity), 0), [items])

  const isDollarPayment = !clientData.paymentMethod || dollarMethods.includes(clientData.paymentMethod)
  
  const finalTotalUSD = isDollarPayment ? totalBaseUSD : (totalBaseUSD + totalPenalty)
  const finalTotalBs = finalTotalUSD * rate

  const supabase = getSupabase()

  const handleCopy = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getSelectedPaymentDetails = () => {
      if (!clientData.paymentMethod) return null
      const key = paymentKeysMap[clientData.paymentMethod]
      if (!key) return null
      // @ts-ignore
      return payments[key]?.details || ''
  }

  const handleCheckout = async () => {
    if (!clientData.name) return Swal.fire('Falta Nombre', 'Por favor dinos tu nombre', 'warning')
    if (!clientData.paymentMethod) return Swal.fire('Método de Pago', 'Selecciona cómo vas a pagar', 'warning')
    
    if (clientData.deliveryType === 'courier') {
        if (!clientData.courier) return Swal.fire('Courier', 'Selecciona una empresa de envío', 'warning')
        if (!clientData.identityCard) return Swal.fire('Falta Cédula', 'Necesaria para la guía de envío', 'warning')
        if (!clientData.phone) return Swal.fire('Falta Teléfono', 'Necesario para contactarte', 'warning')
        if (!clientData.address) return Swal.fire('Dirección', 'Ingresa la dirección de envío', 'warning')
    }

    setLoading(true)

    try {
        const deliveryInfoFull = clientData.deliveryType === 'pickup' 
            ? 'Retiro Personal' 
            : `${clientData.courier} - ${clientData.address} | CI: ${clientData.identityCard} | Tlf: ${clientData.phone}`

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                store_id: storeId,
                customer_name: clientData.name,
                customer_phone: clientData.deliveryType === 'courier' ? clientData.phone : null,
                total_usd: finalTotalUSD,
                total_bs: finalTotalBs,
                exchange_rate: rate,
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
            price_at_purchase: item.price, 
            variant_id: (item.variantId && item.variantId.length === 36) ? item.variantId : null 
        }))

        const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
        if (itemsError) console.error("Error items:", itemsError)

        let message = `*NUEVO PEDIDO #${order.order_number}*\n`
        message += `Cliente: *${clientData.name}*\n\n`
        
        message += `*RESUMEN:*\n`
        items.forEach(item => {
            message += `- ${item.quantity}x ${item.name} ${item.variantInfo ? `(${item.variantInfo})` : ''}\n`
        })
        
        message += `\n*TOTAL: $${finalTotalUSD.toFixed(2)}*\n`
        if (!isDollarPayment) {
            message += `Ref: Bs ${finalTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}\n`
        }
        
        message += `\n*DATOS DE ENTREGA:*\n`
        if (clientData.deliveryType === 'pickup') {
            message += `Tipo: Retiro Personal (Pickup)\n`
        } else {
            message += `Empresa: ${clientData.courier}\n`
            message += `CI: ${clientData.identityCard}\n`
            message += `Tlf: ${clientData.phone}\n`
            message += `Dir: ${clientData.address}\n`
        }
        message += `Pago: ${clientData.paymentMethod}\n`
        if (clientData.notes) message += `Nota: ${clientData.notes}\n`
        
        clearCart()
        setIsOpen(false)
        
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
        window.open(url, '_blank')

    } catch (error: any) {
        console.error("Error Checkout:", error)
        Swal.fire('Error', error.message || 'Error al procesar', 'error')
    } finally {
        setLoading(false)
    }
  }

  if (items.length === 0 && !isOpen) return null

  return (
    <>
        {!isOpen && items.length > 0 && (
            <div className="fixed bottom-6 left-0 right-0 px-4 z-50 flex justify-center animate-in slide-in-from-bottom-10 fade-in duration-500">
                <button onClick={() => setIsOpen(true)} className="bg-black text-white pl-5 pr-6 py-4 rounded-full shadow-2xl shadow-black/40 flex items-center gap-4 hover:scale-105 active:scale-95 transition-all group">
                    <div className="relative">
                        <ShoppingCart size={24} />
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-black">{items.reduce((acc, i) => acc + i.quantity, 0)}</span>
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">Total</span>
                        <span className="text-lg font-black leading-none">${totalBaseUSD.toFixed(2)}</span>
                    </div>
                    <div className="w-px h-8 bg-gray-700 mx-2"></div>
                    <span className="font-bold text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">Ver Carrito <ArrowRight size={16}/></span>
                </button>
            </div>
        )}

        {isOpen && (
            <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4">
                <div className="bg-white w-full md:max-w-md h-[90vh] md:h-auto md:max-h-[85vh] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300">
                    
                    <div className="bg-white border-b border-gray-100 p-5 flex justify-between items-center shrink-0">
                        <div>
                            <h2 className="font-black text-xl text-gray-900">{step === 1 ? 'Tu Carrito' : 'Finalizar'}</h2>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{step === 1 ? `${items.length} Items` : 'Datos de Envío'}</p>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-6">
                        {step === 1 ? (
                            <div className="space-y-4">
                                {items.map((item) => (
                                    <div key={item.id} className="flex gap-4 p-3 border border-gray-100 rounded-2xl bg-gray-50/50">
                                        <div className="w-16 h-16 bg-white rounded-xl border border-gray-200 overflow-hidden shrink-0">
                                            <img src={item.image} className="w-full h-full object-cover mix-blend-multiply" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-sm text-gray-900 line-clamp-1">{item.name}</h3>
                                            <p className="text-xs text-gray-500 font-medium mb-2">{item.variantInfo || 'Estándar'}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="font-black text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                                                <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
                                                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="text-gray-400 hover:text-black disabled:opacity-30" disabled={item.quantity <= 1}>-</button>
                                                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="text-gray-400 hover:text-black">+</button>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 self-start"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">1. Tu Nombre</label>
                                    <input value={clientData.name} onChange={e => setClientData({...clientData, name: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-gray-900 focus:ring-2 focus:ring-black/5 outline-none" placeholder="Nombre completo" />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">2. Entrega</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {shipping.pickup?.active && (
                                            <button onClick={() => setClientData({...clientData, deliveryType: 'pickup', courier: ''})} className={`p-3 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all ${clientData.deliveryType === 'pickup' ? 'border-black bg-black text-white' : 'border-gray-100 text-gray-400'}`}>
                                                <ShoppingBag size={16}/> Retiro
                                            </button>
                                        )}
                                        {activeCouriers.length > 0 && (
                                            <button onClick={() => setClientData({...clientData, deliveryType: 'courier'})} className={`p-3 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all ${clientData.deliveryType === 'courier' ? 'border-black bg-black text-white' : 'border-gray-100 text-gray-400'}`}>
                                                <Truck size={16}/> Envío
                                            </button>
                                        )}
                                    </div>

                                    {clientData.deliveryType === 'courier' && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase block">Empresa de Envío</label>
                                            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mb-2">
                                                {activeCouriers.map(c => (
                                                    <button key={c} onClick={() => setClientData({...clientData, courier: c})} className={`px-4 py-2 rounded-lg text-xs font-bold border whitespace-nowrap ${clientData.courier === c ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200'}`}>{c}</button>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Cédula</label>
                                                    <input value={clientData.identityCard} onChange={e => setClientData({...clientData, identityCard: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg pl-3 py-2 text-xs font-bold focus:border-black outline-none" placeholder="V-12345678" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Teléfono</label>
                                                    <input value={clientData.phone} onChange={e => setClientData({...clientData, phone: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg pl-3 py-2 text-xs font-bold focus:border-black outline-none" placeholder="0412-..." />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Dirección</label>
                                                <textarea value={clientData.address} onChange={e => setClientData({...clientData, address: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 font-medium text-xs text-gray-900 focus:border-black outline-none resize-none h-16" placeholder="Dirección exacta..." />
                                            </div>
                                        </div>
                                    )}

                                    {clientData.deliveryType === 'pickup' && shipping.pickup?.details && (
                                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs text-gray-500">
                                            <span className="font-bold text-gray-900">Dirección de Retiro:</span> {shipping.pickup.details}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">3. Pago</label>
                                    <div className="flex flex-wrap gap-2">
                                        {activePaymentMethods.length > 0 ? activePaymentMethods.map(pm => (
                                            <button key={pm} onClick={() => setClientData({...clientData, paymentMethod: pm})} className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${clientData.paymentMethod === pm ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200'}`}>
                                                {pm}
                                            </button>
                                        )) : <p className="text-xs text-red-400">No hay pagos activos.</p>}
                                    </div>
                                    
                                    {/* --- NUEVO DISEÑO ELITE DE DATOS DE PAGO --- */}
                                    {clientData.paymentMethod && getSelectedPaymentDetails() && (
                                        <div className="mt-4 relative group animate-in fade-in slide-in-from-top-2">
                                            {/* Efecto de resplandor sutil */}
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-200 to-gray-100 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                                            
                                            <div className="relative bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                                {/* Header de la Tarjeta */}
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 bg-gray-50 rounded-lg border border-gray-100">
                                                            <CreditCard size={14} className="text-gray-900"/>
                                                        </div>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                            Datos para Transferir
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Botón Copiar Elite */}
                                                    <button 
                                                        onClick={() => handleCopy(getSelectedPaymentDetails())}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all duration-300 ${
                                                            copied 
                                                                ? 'bg-green-50 text-green-600 border border-green-200 scale-95' 
                                                                : 'bg-black text-white hover:bg-gray-800 shadow-sm hover:shadow-md'
                                                        }`}
                                                    >
                                                        {copied ? <><Check size={12}/> Copiado</> : <><Copy size={12}/> Copiar</>}
                                                    </button>
                                                </div>
                                                
                                                {/* Contenido Monospaced */}
                                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 group-hover:border-gray-200 transition-colors">
                                                    <p className="font-mono text-sm text-gray-800 break-all leading-relaxed tracking-tight">
                                                        {getSelectedPaymentDetails()}
                                                    </p>
                                                </div>

                                                {/* Footer de la Tarjeta */}
                                                <div className="mt-2 flex items-center justify-end">
                                                    <div className="flex items-center gap-1">
                                                        <span className="w-1 h-1 rounded-full bg-green-500"></span>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase">
                                                            {clientData.paymentMethod}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-50 p-5 border-t border-gray-100 shrink-0">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Total</p>
                                <span className="text-3xl font-black text-gray-900 tracking-tight">${finalTotalUSD.toFixed(2)}</span>
                                <div className="text-sm font-bold text-gray-400 mt-1 flex items-center gap-1">
                                    <span className="text-[10px] uppercase">Ref:</span> 
                                    <span className="font-mono text-gray-500">Bs {finalTotalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            
                            {step === 1 ? (
                                <button onClick={() => setStep(2)} className="bg-black text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                                    Continuar <ArrowRight size={16}/>
                                </button>
                            ) : (
                                <button onClick={handleCheckout} disabled={loading} className="bg-green-600 text-white px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 active:scale-95 flex items-center gap-2 disabled:opacity-70">
                                    {loading ? <Loader2 className="animate-spin" size={18}/> : <><MessageCircle size={18}/> Enviar Pedido</>}
                                </button>
                            )}
                        </div>
                        {step === 2 && <button onClick={() => setStep(1)} className="w-full text-center text-xs font-bold text-gray-400 hover:text-black mt-2">Volver</button>}
                    </div>

                </div>
            </div>
        )}
    </>
  )
}