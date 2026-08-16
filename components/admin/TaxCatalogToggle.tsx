'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Receipt, Loader2 } from 'lucide-react'
import { toggleCatalogTaxVisibility } from '@/app/admin/actions'
import Swal from 'sweetalert2'

interface TaxCatalogToggleProps {
  storeId: string;
  initialState: boolean;
  fiscalProfile: string;
}

export default function TaxCatalogToggle({ storeId, initialState, fiscalProfile }: TaxCatalogToggleProps) {
  const [isShowing, setIsShowing] = useState(initialState)
  const [isLoading, setIsLoading] = useState(false)

  // Si es informal, no tiene sentido mostrar esta opción
  if (fiscalProfile === 'informal') return null;

  const handleToggle = async () => {
    setIsLoading(true)
    const newState = !isShowing
    
    // Optimistic UI update
    setIsShowing(newState)

    try {
      const result = await toggleCatalogTaxVisibility(storeId, newState)
      
      if (!result.success) throw new Error(result.message)

      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, customClass: { popup: 'bg-black text-white rounded-xl text-xs font-bold' } })
      Toast.fire({ icon: 'success', title: result.message })
    } catch (error: any) {
      // Revert on error
      setIsShowing(!newState)
      Swal.fire('Error', error.message || 'No se pudo actualizar la configuración.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white p-5 md:p-6 rounded-2xl border border-zinc-100 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.04)] flex items-center justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100 text-zinc-600 shrink-0">
          <Receipt size={20} strokeWidth={1.5} />
        </div>
        <div className="flex flex-col">
          <h3 className="text-sm font-bold text-neutral-900 tracking-tight">
            Mostrar IVA en el Catálogo
          </h3>
          <p className="text-xs font-medium text-zinc-500 mt-1 max-w-sm leading-relaxed">
            Muestra el monto exacto del impuesto debajo del precio base en la página principal de la tienda.
          </p>
        </div>
      </div>

      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`relative w-12 h-7 rounded-full transition-colors duration-300 shrink-0 focus:outline-none ${isShowing ? 'bg-neutral-900' : 'bg-zinc-200'}`}
      >
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm flex items-center justify-center"
          style={{ x: isShowing ? 20 : 0 }}
        >
          {isLoading && <Loader2 size={10} className="animate-spin text-neutral-900" />}
        </motion.div>
      </button>
    </div>
  )
}