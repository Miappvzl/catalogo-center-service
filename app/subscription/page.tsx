'use client'

import { MessageCircle, CheckCircle, Lock, Copy } from 'lucide-react'
import Link from 'next/link'
import Swal from 'sweetalert2'

export default function SubscriptionPage() {
  const price = "10$"
  const pagoMovil = {
    banco: "Venezuela",
    telefono: "0414-580-9864", // <--- TU NÚMERO
    cedula: "V-34.075.886"     // <--- TU CÉDULA
  }

  const handleReportPayment = () => {
    const message = `Hola, mi periodo de prueba en Preziso venció. Ya realicé el pago de la suscripción (${price}).\n\nAdjunto comprobante:`
    const url = `https://wa.me/584145811936?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'Copiado', timer: 1000, showConfirmButton: false })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans py-10">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
        
        {/* Header Rojo */}
        <div className="bg-black text-white p-6 md:p-8 text-center relative overflow-hidden flex-shrink-0">
            <div className="absolute top-0 left-0 w-full h-full bg-white/10 rotate-12 scale-150 transform origin-bottom-left"></div>
            <div className="relative z-10 flex flex-col items-center">
                <div className="bg-white/20 p-3 md:p-4 rounded-full mb-3 backdrop-blur-sm shadow-lg">
                    <Lock size={28} className="text-white"/>
                </div>
                <h1 className="text-xl md:text-2xl font-bold mb-1">Suscripción Requerida</h1>
                <p className="text-gray-300 text-xs md:text-sm px-4">Tu periodo de prueba gratuito ha finalizado.</p>
            </div>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 flex-1 flex flex-col">
            <div className="text-center mb-6">
                <p className="text-gray-600 mb-2 text-sm md:text-base">Reactiva tu tienda y sigue vendiendo sin límites.</p>
                <div className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">{price}<span className="text-sm text-gray-400 font-medium ml-1">/mes</span></div>
            </div>

            {/* Beneficios */}
            <ul className="space-y-3 mb-6 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <li className="flex items-center gap-3 text-sm text-gray-700">
                    <CheckCircle size={16} className="text-green-500 flex-shrink-0"/> Panel de Control Ilimitado
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-700">
                    <CheckCircle size={16} className="text-green-500 flex-shrink-0"/> Catálogo Público Activo
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-700">
                    <CheckCircle size={16} className="text-green-500 flex-shrink-0"/> Actualizaciones BCV
                </li>
            </ul>

            {/* Datos de Pago */}
            <div className="mb-6 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Datos para Pago Móvil</p>
                <div className="bg-gray-100 p-4 rounded-xl text-sm font-mono text-gray-600 border border-gray-200 relative group">
                    <div className="space-y-1">
                        <p className="flex justify-between"><span>Banco:</span> <b className="text-black">{pagoMovil.banco}</b></p>
                        <p className="flex justify-between"><span>Tlf:</span> <b className="text-black">{pagoMovil.telefono}</b></p>
                        <p className="flex justify-between"><span>CI:</span> <b className="text-black">{pagoMovil.cedula}</b></p>
                    </div>
                    {/* Botón flotante para copiar todo */}
                    <button 
                        onClick={() => copyToClipboard(`${pagoMovil.banco}\n${pagoMovil.telefono}\n${pagoMovil.cedula}`)}
                        className="absolute top-2 right-2 p-1.5 bg-white rounded-md shadow-sm opacity-50 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
                        title="Copiar datos"
                    >
                        <Copy size={14} className="text-gray-500"/>
                    </button>
                </div>
            </div>

            {/* Botón */}
            <div className="mt-auto">
                <button 
                    onClick={handleReportPayment}
                    className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold text-base md:text-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200 active:scale-95"
                >
                    <MessageCircle size={20} />
                    Reportar Pago
                </button>

                <div className="mt-4 text-center">
                    <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 underline">Volver al inicio</Link>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}