'use client'

import { useState } from 'react'
import { ShoppingCart, X, MessageCircle, ChevronRight, Copy, Check } from 'lucide-react'
import { useCart } from '@/app/store/useCart' // <--- CORREGIDO: Importamos useCart
import Swal from 'sweetalert2'

export default function FloatingCheckout({ rate, currency, phone, storeName, paymentMethods }: any) {
  // CORREGIDO: Usamos 'items' y 'removeItem' que son los que existen en tu store
  const { items, removeItem } = useCart() 
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1) // 1: Carrito, 2: Pago
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)

  // Si no hay items, no mostramos nada
  if (items.length === 0) return null

  // CORREGIDO: Tu store ya guarda el precio final (Base + Penalty) en 'item.price'
  const totalUSD = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  
  // Calculamos Bs usando ese precio total
  const totalBs = items.reduce((acc, item) => {
    return acc + (item.price * rate * item.quantity)
  }, 0)

  const activeMethods = paymentMethods ? Object.entries(paymentMethods).filter(([_, val]: any) => val.active) : []

  const handleCheckout = () => {
    let message = `*Hola ${storeName}, quiero realizar el siguiente pedido:*\n\n`
    
    items.forEach(item => {
      // CORREGIDO: Usamos item.name y item.quantity. 
      // Nota: Tu useCart actual no guarda 'sizes', por lo que no lo incluimos en el mensaje.
      message += `▪️ ${item.quantity}x ${item.name}\n`
    })

    message += `\n*Total a Pagar:*`
    message += `\n💵 $${totalUSD.toFixed(2)}`
    if (rate > 0) message += `\n🇻🇪 Bs ${new Intl.NumberFormat('es-VE').format(totalBs)}`

    if (selectedMethod) {
        message += `\n\n💳 *Método de Pago:* ${selectedMethod.toUpperCase().replace('_', ' ')}`
    }

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    
    window.open(whatsappUrl, '_blank')
    setIsOpen(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'Copiado', timer: 1000, showConfirmButton: false })
  }

  return (
    <>
      {/* BOTÓN FLOTANTE */}
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
                {/* CORREGIDO: Usamos items.length */}
                <p className="text-xs font-medium text-gray-300">{items.length} productos</p>
                <p className="font-bold text-sm">Ver Carrito</p>
            </div>
          </div>
          <div className="bg-white text-black px-3 py-1 rounded-full font-bold text-sm">
            ${totalUSD.toFixed(2)}
          </div>
        </button>
      </div>

      {/* MODAL CHECKOUT */}
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
                    // LISTA DE PRODUCTOS
                    <div className="space-y-4">
                        {/* CORREGIDO: Iteramos sobre 'items' */}
                        {items.map((item) => (
                            <div key={item.id} className="flex gap-4 items-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                    {/* CORREGIDO: Usamos item.image (no image_url) */}
                                    {item.image && <img src={item.image} className="w-full h-full object-cover"/>}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm">{item.name}</h4>
                                    <p className="text-xs text-gray-500">Cant: {item.quantity}</p>
                                </div>
                                <div className="text-right">
                                    {/* CORREGIDO: Usamos item.price */}
                                    <p className="font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                                    {/* CORREGIDO: Usamos removeItem */}
                                    <button onClick={() => removeItem(item.id)} className="text-xs text-red-500 underline mt-1">Eliminar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // SELECCIÓN DE PAGO (Esto se mantiene igual)
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500 mb-2">Selecciona cómo deseas pagar para ver los datos:</p>
                        
                        {activeMethods.length === 0 && <p className="text-sm text-center p-4 bg-gray-50 rounded-lg">Acordar pago por WhatsApp</p>}

                        {activeMethods.map(([key, data]: any) => (
                            <div key={key} onClick={() => setSelectedMethod(key)} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedMethod === key ? 'border-black bg-gray-50 ring-1 ring-black' : 'border-gray-200 hover:border-gray-300'}`}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold capitalize flex items-center gap-2">
                                        {key === 'pago_movil' && '📱 Pago Móvil'}
                                        {key === 'zelle' && '🟣 Zelle'}
                                        {key === 'cash' && '💵 Efectivo'}
                                        {key === 'binance' && '🟡 Binance'}
                                    </span>
                                    {selectedMethod === key && <Check size={18} className="text-black"/>}
                                </div>
                                
                                {selectedMethod === key && (
                                    <div className="mt-3 pt-3 border-t border-gray-200 text-sm space-y-2 text-gray-600 animate-in slide-in-from-top-2">
                                        {key === 'pago_movil' && (
                                            <>
                                                <p className="flex justify-between"><span>Banco:</span> <b onClick={(e) => { e.stopPropagation(); copyToClipboard(data.bank) }} className="hover:bg-gray-200 px-1 rounded cursor-copy">{data.bank}</b></p>
                                                <p className="flex justify-between"><span>Tel:</span> <b onClick={(e) => { e.stopPropagation(); copyToClipboard(data.phone) }} className="hover:bg-gray-200 px-1 rounded cursor-copy">{data.phone}</b></p>
                                                <p className="flex justify-between"><span>ID:</span> <b onClick={(e) => { e.stopPropagation(); copyToClipboard(data.id) }} className="hover:bg-gray-200 px-1 rounded cursor-copy">{data.id}</b></p>
                                            </>
                                        )}
                                        {key === 'zelle' && (
                                            <p className="flex justify-between"><span>Email:</span> <b onClick={(e) => { e.stopPropagation(); copyToClipboard(data.email) }} className="hover:bg-gray-200 px-1 rounded cursor-copy">{data.email}</b></p>
                                        )}
                                        {key === 'binance' && (
                                             <p className="flex justify-between"><span>Pay ID:</span> <b onClick={(e) => { e.stopPropagation(); copyToClipboard(data.email) }} className="hover:bg-gray-200 px-1 rounded cursor-copy">{data.email}</b></p>
                                        )}
                                        {key === 'cash' && <p>Pagas al recibir o retirar en tienda.</p>}
                                        
                                        {key !== 'cash' && <p className="text-xs text-center text-gray-400 mt-2">(Toca los datos para copiar)</p>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between items-end mb-4">
                    <span className="text-gray-500 text-sm">Total a Pagar</span>
                    <div className="text-right">
                        <div className="text-2xl font-black text-black">${totalUSD.toFixed(2)}</div>
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
                        disabled={activeMethods.length > 0 && !selectedMethod}
                        className="w-full bg-green-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <MessageCircle size={18} /> Enviar Pedido por WhatsApp
                    </button>
                )}
            </div>

          </div>
        </div>
      )}
    </>
  )
}