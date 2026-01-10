'use client'

import { useState } from 'react'
import { ShoppingCart, X, MessageCircle, ChevronRight, Check } from 'lucide-react'
import { useCart } from '@/app/store/useCart'
import Swal from 'sweetalert2'

export default function FloatingCheckout({ rate, currency, phone, storeName, paymentMethods }: any) {
  const { items, removeItem } = useCart()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1) // 1: Carrito, 2: Pago
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)

  if (!items || items.length === 0) return null

  // --- LÓGICA DE PRECIOS DINÁMICOS ---
  // Detecta si el método seleccionado merece descuento (Base Price)
  // Si es NULL (no seleccionado) o PAGO MÓVIL -> Se cobra Penalty.
  // Si es ZELLE, CASH, BINANCE -> Se cobra Base.
  const isDiscountMethod = (methodKey: string | null) => {
    if (!methodKey) return false // Por defecto (sin seleccionar) mostramos precio alto
    const k = methodKey.toLowerCase()
    return k.includes('zelle') || k.includes('cash') || k.includes('efectivo') || k.includes('binance') || k.includes('divisa')
  }

  const applyDiscount = isDiscountMethod(selectedMethod)

  // Calcular totales dinámicos
  const totalUSD = items.reduce((acc, item) => {
    // Si aplica descuento, usamos basePrice. Si no, sumamos penalty.
    const priceToUse = applyDiscount ? item.basePrice : (item.basePrice + item.penalty)
    return acc + (priceToUse * item.quantity)
  }, 0)

  const totalBs = items.reduce((acc, item) => {
    // Para Bs, siempre usamos la referencia completa (Base + Penalty) por defecto para la tasa,
    // o ajustamos según la lógica que prefieras.
    // Usualmente en Bs se paga el "precio completo" si es pago móvil.
    const priceToUse = applyDiscount ? item.basePrice : (item.basePrice + item.penalty)
    return acc + (priceToUse * rate * item.quantity)
  }, 0)

  // Filtrar métodos activos
  const activeMethods = paymentMethods 
    ? Object.entries(paymentMethods).filter(([_, val]: any) => val && val.active === true) 
    : []

  const handleCheckout = () => {
    let message = `*Hola ${storeName}, quiero realizar el siguiente pedido:*\n\n`
    
    items.forEach(item => {
      // Precio individual en el mensaje
      const finalItemPrice = applyDiscount ? item.basePrice : (item.basePrice + item.penalty)
      message += `▪️ ${item.quantity}x ${item.name} ($${finalItemPrice})\n`
    })

    message += `\n*Total a Pagar:*`
    message += `\n💵 $${totalUSD.toFixed(2)}`
    
    // Solo mostramos Bs si hay tasa y NO es un método puramente divisa (como Zelle)
    // Aunque para referencia siempre es bueno dejarlo.
    if (rate > 0) message += `\n🇻🇪 Bs ${new Intl.NumberFormat('es-VE').format(totalBs)}`

    if (selectedMethod) {
        const methodNiceName = selectedMethod.charAt(0).toUpperCase() + selectedMethod.slice(1).replace(/_/g, ' ');
        message += `\n\n💳 *Método de Pago:* ${methodNiceName}`
        if(applyDiscount) message += ` (Descuento aplicado ✅)`
    }

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    setIsOpen(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'Copiado', timer: 1000, showConfirmButton: false })
  }

  const getMethodInfo = (key: string) => {
    const lower = key.toLowerCase()
    if (lower.includes('movil')) return { label: '📱 Pago Móvil', color: 'bg-blue-50 border-blue-200' }
    if (lower.includes('zelle')) return { label: '🟣 Zelle', color: 'bg-purple-50 border-purple-200' }
    if (lower.includes('binance')) return { label: '🟡 Binance', color: 'bg-yellow-50 border-yellow-200' }
    if (lower.includes('cash') || lower.includes('efectivo')) return { label: '💵 Efectivo', color: 'bg-green-50 border-green-200' }
    return { label: `💳 ${key.replace(/_/g, ' ')}`, color: 'bg-gray-50 border-gray-200' }
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-50">
        <button 
          onClick={() => setIsOpen(true)}
          className="w-full md:w-auto bg-black text-white p-4 rounded-full shadow-2xl flex items-center justify-between gap-4 hover:scale-105 transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
                <ShoppingCart size={20} />
            </div>
            <div className="text-left">
                <p className="text-xs font-medium text-gray-300">{items.length} productos</p>
                <p className="font-bold text-sm">Ver Carrito</p>
            </div>
          </div>
          <div className="bg-white text-black px-3 py-1 rounded-full font-bold text-sm">
            ${totalUSD.toFixed(2)}
          </div>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full md:max-w-md md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg">
                    {step === 1 ? 'Tu Pedido' : 'Método de Pago'}
                </h3>
                <button onClick={() => { setIsOpen(false); setStep(1); }} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
                    <X size={20} />
                </button>
            </div>

            <div className="overflow-y-auto p-4 flex-1">
                {step === 1 ? (
                    <div className="space-y-4">
                        {items.map((item) => {
                            // En la vista de lista, mostramos el precio "máximo" (con penalty) como referencia inicial,
                            // o mostramos el precio según el descuento actual si ya seleccionó algo (aunque step es 1).
                            // Para no confundir, mostramos el precio base + penalty y aclaramos si hay descuento.
                            const currentPrice = applyDiscount ? item.basePrice : (item.basePrice + item.penalty)

                            return (
                              <div key={item.id} className="flex gap-4 items-center">
                                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                      {item.image && <img src={item.image} className="w-full h-full object-cover"/>}
                                  </div>
                                  <div className="flex-1">
                                      <h4 className="font-bold text-sm">{item.name}</h4>
                                      <p className="text-xs text-gray-500">Cant: {item.quantity}</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="font-bold text-sm transition-all">${(currentPrice * item.quantity).toFixed(2)}</p>
                                      {item.penalty > 0 && applyDiscount && (
                                        <span className="text-[10px] text-green-600 font-bold">Descuento aplicado</span>
                                      )}
                                      <button onClick={() => removeItem(item.id)} className="text-xs text-red-500 underline mt-1 block ml-auto">Eliminar</button>
                                  </div>
                              </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-500 mb-2">Selecciona cómo deseas pagar:</p>
                        
                        {activeMethods.map(([key, data]: any) => {
                            const info = getMethodInfo(key)
                            const isSelected = selectedMethod === key
                            const methodHasDiscount = isDiscountMethod(key)

                            return (
                                <div 
                                    key={key} 
                                    onClick={() => setSelectedMethod(key)} 
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-black bg-gray-50 ring-1 ring-black' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold capitalize flex items-center gap-2 text-gray-800">
                                            {info.label}
                                            {methodHasDiscount && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full">Mejor Precio</span>}
                                        </span>
                                        {isSelected && <Check size={18} className="text-black"/>}
                                    </div>
                                    
                                    {isSelected && (
                                        <div className="mt-3 pt-3 border-t border-gray-200 text-sm space-y-2 text-gray-600 animate-in slide-in-from-top-2">
                                            {Object.entries(data).map(([fieldKey, fieldValue]: any) => {
                                                if(fieldKey === 'active') return null
                                                if(!fieldValue) return null
                                                return (
                                                    <p key={fieldKey} className="flex justify-between items-center">
                                                        <span className="capitalize text-gray-400 text-xs">{fieldKey}:</span> 
                                                        <b onClick={(e) => { e.stopPropagation(); copyToClipboard(fieldValue) }} className="hover:bg-gray-200 px-2 py-0.5 rounded cursor-copy text-gray-800">
                                                            {fieldValue}
                                                        </b>
                                                    </p>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between items-end mb-4">
                    <span className="text-gray-500 text-sm">Total a Pagar</span>
                    <div className="text-right">
                        {/* PRECIO CON ANIMACIÓN SI CAMBIA */}
                        <div className="text-2xl font-black text-black transition-all duration-300">
                          ${totalUSD.toFixed(2)}
                        </div>
                        {rate > 0 && <div className="text-xs text-gray-500 font-medium">~ Bs {new Intl.NumberFormat('es-VE').format(totalBs)}</div>}
                    </div>
                </div>

                {step === 1 ? (
                    <button 
                        onClick={() => setStep(2)}
                        className="w-full bg-black text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    >
                        Continuar <ChevronRight size={18} />
                    </button>
                ) : (
                    <button 
                        onClick={handleCheckout}
                        className={`w-full text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors ${selectedMethod ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 hover:bg-gray-500'}`}
                    >
                        <MessageCircle size={18} /> 
                        {selectedMethod ? 'Enviar Pedido por WhatsApp' : 'Selecciona un método'}
                    </button>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}