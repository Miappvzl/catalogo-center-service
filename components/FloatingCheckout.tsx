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

  // Totales
  const totalUSD = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  const totalBs = items.reduce((acc, item) => acc + (item.price * rate * item.quantity), 0)

  // --- 🧠 LÓGICA BLINDADA DE FILTRADO ---
  // 1. Convertimos el JSON en array
  // 2. Filtramos solo los que tengan active == true
  const activeMethods = paymentMethods 
    ? Object.entries(paymentMethods).filter(([_, val]: any) => val && val.active === true) 
    : []

  const handleCheckout = () => {
    let message = `*Hola ${storeName}, quiero realizar el siguiente pedido:*\n\n`
    
    items.forEach(item => {
      message += `▪️ ${item.quantity}x ${item.name}\n`
    })

    message += `\n*Total a Pagar:*`
    message += `\n💵 $${totalUSD.toFixed(2)}`
    if (rate > 0) message += `\n🇻🇪 Bs ${new Intl.NumberFormat('es-VE').format(totalBs)}`

    if (selectedMethod) {
        // Formateamos el nombre del método para que se vea bonito en WhatsApp
        const methodNiceName = selectedMethod.charAt(0).toUpperCase() + selectedMethod.slice(1).replace(/_/g, ' ');
        message += `\n\n💳 *Método de Pago:* ${methodNiceName}`
    }

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    setIsOpen(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'Copiado', timer: 1000, showConfirmButton: false })
  }

  // Helper para detectar iconos y nombres bonitos
  const getMethodInfo = (key: string) => {
    const lower = key.toLowerCase()
    if (lower.includes('movil')) return { label: '📱 Pago Móvil', color: 'bg-blue-50 border-blue-200' }
    if (lower.includes('zelle')) return { label: '🟣 Zelle', color: 'bg-purple-50 border-purple-200' }
    if (lower.includes('binance')) return { label: '🟡 Binance', color: 'bg-yellow-50 border-yellow-200' }
    if (lower.includes('cash') || lower.includes('efectivo')) return { label: '💵 Efectivo', color: 'bg-green-50 border-green-200' }
    return { label: `💳 ${key.replace(/_/g, ' ')}`, color: 'bg-gray-50 border-gray-200' } // Fallback genérico
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
                    // PASO 1: LISTA DE PRODUCTOS
                    <div className="space-y-4">
                        {items.map((item) => (
                            <div key={item.id} className="flex gap-4 items-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                    {item.image && <img src={item.image} className="w-full h-full object-cover"/>}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm">{item.name}</h4>
                                    <p className="text-xs text-gray-500">Cant: {item.quantity}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                                    <button onClick={() => removeItem(item.id)} className="text-xs text-red-500 underline mt-1">Eliminar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // PASO 2: SELECCIÓN DE PAGO (MEJORADO)
                    <div className="space-y-3">
                        <p className="text-sm text-gray-500 mb-2">Selecciona cómo deseas pagar:</p>
                        
                        {activeMethods.length === 0 && (
                            <div className="text-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                <p className="text-gray-500 text-sm">No hay métodos configurados.</p>
                                <p className="text-xs text-gray-400 mt-1">Se acordará por WhatsApp.</p>
                            </div>
                        )}

                        {activeMethods.map(([key, data]: any) => {
                            const info = getMethodInfo(key)
                            const isSelected = selectedMethod === key

                            return (
                                <div 
                                    key={key} 
                                    onClick={() => setSelectedMethod(key)} 
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-black bg-gray-50 ring-1 ring-black' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold capitalize flex items-center gap-2 text-gray-800">
                                            {info.label}
                                        </span>
                                        {isSelected && <Check size={18} className="text-black"/>}
                                    </div>
                                    
                                    {isSelected && (
                                        <div className="mt-3 pt-3 border-t border-gray-200 text-sm space-y-2 text-gray-600 animate-in slide-in-from-top-2">
                                            {/* Renderizado dinámico de campos */}
                                            {Object.entries(data).map(([fieldKey, fieldValue]: any) => {
                                                if(fieldKey === 'active') return null // Ignorar campo 'active'
                                                if(!fieldValue) return null // Ignorar vacíos
                                                
                                                return (
                                                    <p key={fieldKey} className="flex justify-between items-center">
                                                        <span className="capitalize text-gray-400 text-xs">{fieldKey}:</span> 
                                                        <b onClick={(e) => { e.stopPropagation(); copyToClipboard(fieldValue) }} className="hover:bg-gray-200 px-2 py-0.5 rounded cursor-copy text-gray-800">
                                                            {fieldValue}
                                                        </b>
                                                    </p>
                                                )
                                            })}
                                            <p className="text-[10px] text-center text-gray-400 mt-2">(Toca los datos para copiar)</p>
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
                        // Permitimos enviar aunque no elija método (por si acaso falla algo)
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