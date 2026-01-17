'use client'

import { useState } from 'react'
import { 
  ShoppingCart, X, ChevronRight, Check, 
  CreditCard, Smartphone, Banknote, Landmark, 
  Bitcoin, Copy, ArrowRight
} from 'lucide-react'
import { useCart } from '@/app/store/useCart'
import Swal from 'sweetalert2'

export default function FloatingCheckout({ rate, currency, phone, storeName, paymentMethods }: any) {
  const { items, removeItem } = useCart()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1) // 1: Carrito, 2: Pago
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)

  if (!items || items.length === 0) return null

  // --- LÓGICA DE PRECIOS ---
  const isDiscountMethod = (methodKey: string | null) => {
    if (!methodKey) return false 
    const k = methodKey.toLowerCase()
    return k.includes('zelle') || k.includes('cash') || k.includes('efectivo') || k.includes('binance') || k.includes('divisa')
  }

  const applyDiscount = isDiscountMethod(selectedMethod)

  const totalUSD = items.reduce((acc, item) => {
    const priceToUse = applyDiscount ? item.basePrice : (item.basePrice + item.penalty)
    return acc + (priceToUse * item.quantity)
  }, 0)

  const totalBs = items.reduce((acc, item) => {
    const priceToUse = applyDiscount ? item.basePrice : (item.basePrice + item.penalty)
    return acc + (priceToUse * rate * item.quantity)
  }, 0)

  const activeMethods = paymentMethods 
    ? Object.entries(paymentMethods).filter(([_, val]: any) => val && val.active === true) 
    : []

  // --- GENERADOR DE MENSAJE WHATSAPP (SIN EMOJIS) ---
  const handleCheckout = () => {
    // Cabecera tipo factura
    let message = `PEDIDO - ${storeName.toUpperCase()}\n`
    message += `--------------------------------\n`
    
    items.forEach(item => {
      const finalItemPrice = applyDiscount ? item.basePrice : (item.basePrice + item.penalty)
      // Formato: 2 x PRODUCTO ... $20.00
      message += `${item.quantity} x ${item.name.toUpperCase()} ($${finalItemPrice.toFixed(2)})\n`
    })

    message += `--------------------------------\n`
    message += `TOTAL USD: $${totalUSD.toFixed(2)}\n`
    
    if (rate > 0) message += `REF BS: Bs ${new Intl.NumberFormat('es-VE').format(totalBs)}\n`

    if (selectedMethod) {
        // Limpiar nombre del método (ej: pago_movil -> PAGO MOVIL)
        const methodNiceName = selectedMethod.replace(/_/g, ' ').toUpperCase();
        message += `\nMETODO DE PAGO: ${methodNiceName}`
        if(applyDiscount) message += ` [DESCUENTO APLICADO]`
    }

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    setIsOpen(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // Alerta minimalista negra
    const Toast = Swal.mixin({
      toast: true,
      position: 'top',
      showConfirmButton: false,
      timer: 1500,
      customClass: {
        popup: 'bg-black text-white rounded-none border border-gray-800'
      }
    })
    Toast.fire({ icon: 'success', title: 'COPIADO' })
  }

  // --- ICONOS TÉCNICOS ---
  const getMethodIcon = (key: string) => {
    const lower = key.toLowerCase()
    if (lower.includes('movil')) return <Smartphone size={18} />
    if (lower.includes('zelle')) return <Landmark size={18} /> // Icono de Banco
    if (lower.includes('binance') || lower.includes('usdt')) return <Bitcoin size={18} />
    if (lower.includes('cash') || lower.includes('efectivo')) return <Banknote size={18} />
    return <CreditCard size={18} />
  }

  return (
    <>
      {/* BOTÓN FLOTANTE (ESTILO TARJETA NEGRA) */}
     <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-50">
  <button 
    onClick={() => setIsOpen(true)}
    /* 1. Reducido md:w de 350px a 280px y p-5 a p-3 */
    className="w-full md:w-[280px] bg-[#0f0f0f] text-white p-3 rounded-lg shadow-2xl shadow-black/20 flex items-center justify-between gap-3 hover:-translate-y-1 transition-transform duration-300 border border-white/10 group"
  >
    <div className="flex items-center gap-3">
    
      <div className="bg-white/10 p-1.5 rounded-md group-hover:bg-white group-hover:text-black transition-colors">
         
          <ShoppingCart size={18} />
      </div>
      <div className="text-left flex flex-col">
        
          <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">{items.length} ITEMS</span>
          
          <span className="font-bold text-xs tracking-wide">VER PEDIDO</span>
      </div>
    </div>
    
    
    <div className="font-mono text-base font-bold tracking-tight">
      ${totalUSD.toFixed(2)}
    </div>
  </button>
</div>

      {/* MODAL / DRAWER */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full md:max-w-md md:rounded-xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200">
            
            {/* CABECERA INDUSTRIAL */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
                <div>
                    <h3 className="font-black text-lg uppercase tracking-tighter text-black leading-none">
                        {step === 1 ? 'Tu Pedido' : 'Pago / Envio'}
                    </h3>
                    <p className="text-[10px] font-mono text-gray-400 mt-1">PASO {step}/2</p>
                </div>
                <button onClick={() => { setIsOpen(false); setStep(1); }} className="p-2 hover:bg-black hover:text-white transition-colors rounded-md text-gray-400">
                    <X size={20} />
                </button>
            </div>

            {/* CONTENIDO SCROLLABLE */}
            <div className="overflow-y-auto p-5 flex-1 bg-gray-50/50">
                {step === 1 ? (
                    // --- VISTA CARRITO (TABLA TÉCNICA) ---
                    <div className="space-y-3">
                        {items.map((item) => {
                            const currentPrice = applyDiscount ? item.basePrice : (item.basePrice + item.penalty)
                            return (
                              <div key={item.id} className="group bg-white border border-gray-200 p-3 rounded-lg flex gap-4 items-start hover:border-black transition-colors">
                                  {/* FOTO MINI */}
                                  <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center">
                                      {item.image ? (
                                        <img src={item.image} className="w-full h-full object-contain mix-blend-multiply"/>
                                      ) : (
                                        <span className="text-xs font-bold text-gray-300">P.</span>
                                      )}
                                  </div>
                                  
                                  {/* DATOS */}
                                  <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start mb-1">
                                          <h4 className="font-bold text-sm text-gray-900 truncate pr-2 uppercase tracking-tight">{item.name}</h4>
                                          <span className="font-mono text-sm font-bold text-black">${(currentPrice * item.quantity).toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between items-end">
                                          <div className="flex flex-col">
                                              <span className="text-[10px] font-bold text-gray-400 uppercase">CANT: {item.quantity}</span>
                                              {item.penalty > 0 && applyDiscount && (
                                                <span className="text-[9px] bg-black text-white px-1.5 py-0.5 rounded-sm uppercase font-bold mt-1 inline-block w-fit">
                                                    Promo Divisa
                                                </span>
                                              )}
                                          </div>
                                          <button onClick={() => removeItem(item.id)} className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wide border-b border-red-200 pb-0.5">
                                              Remover
                                          </button>
                                      </div>
                                  </div>
                              </div>
                            )
                        })}
                    </div>
                ) : (
                    // --- VISTA PAGO (GRID SELECCIÓN) ---
                    <div className="space-y-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Seleccione Método</p>
                        
                        <div className="grid grid-cols-1 gap-3">
                            {activeMethods.map(([key, data]: any) => {
                                const isSelected = selectedMethod === key
                                const methodHasDiscount = isDiscountMethod(key)

                                return (
                                    <div 
                                        key={key} 
                                        onClick={() => setSelectedMethod(key)} 
                                        className={`relative p-4 rounded-lg border transition-all cursor-pointer ${isSelected ? 'bg-white border-black shadow-md ring-1 ring-black' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-md ${isSelected ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                    {getMethodIcon(key)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm uppercase tracking-wide text-gray-900">
                                                        {key.replace(/_/g, ' ')}
                                                    </span>
                                                    {methodHasDiscount && (
                                                        <span className="text-[9px] font-bold text-green-600 uppercase tracking-wider">
                                                            Aplica Descuento
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {isSelected && <div className="w-4 h-4 bg-black rounded-full flex items-center justify-center"><Check size={10} className="text-white"/></div>}
                                        </div>
                                        
                                        {/* DETALLES DE PAGO EXPANDIBLES */}
                                        {isSelected && (
                                            <div className="mt-4 pt-4 border-t border-dashed border-gray-200 space-y-3 animate-in fade-in">
                                                {Object.entries(data).map(([fieldKey, fieldValue]: any) => {
                                                    if(fieldKey === 'active') return null
                                                    if(!fieldValue) return null
                                                    return (
                                                        <div key={fieldKey} className="flex justify-between items-center group">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{fieldKey}</span>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(fieldValue) }} 
                                                                className="flex items-center gap-2 text-xs font-mono font-medium hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                                                            >
                                                                {fieldValue} <Copy size={10} className="text-gray-400 group-hover:text-black"/>
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* FOOTER ACCIONES */}
            <div className="p-5 bg-white border-t border-gray-200">
                <div className="flex justify-between items-end mb-5">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Estimado</span>
                    <div className="text-right flex flex-col items-end">
                        <div className="text-2xl font-black text-black tracking-tighter leading-none">
                          ${totalUSD.toFixed(2)}
                        </div>
                        {rate > 0 && (
                            <div className="text-xs font-mono text-gray-500 font-medium mt-1 bg-gray-100 px-2 py-0.5 rounded-sm">
                                Ref: Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(totalBs)}
                            </div>
                        )}
                    </div>
                </div>

                {step === 1 ? (
                    <button 
                        onClick={() => setStep(2)}
                        className="w-full bg-black text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-900 transition-all uppercase tracking-widest text-xs shadow-lg"
                    >
                        Continuar <ArrowRight size={16} />
                    </button>
                ) : (
                    <button 
                        onClick={handleCheckout}
                        disabled={!selectedMethod}
                        className={`w-full font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-xs shadow-lg ${selectedMethod ? 'bg-black text-white hover:bg-gray-900' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                        Enviar Pedido
                    </button>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}