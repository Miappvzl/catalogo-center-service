'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

interface StoreTrackerProps {
  storeId: string
  productId?: number // Opcional: si el usuario está viendo un producto específico
}

export default function StoreTracker({ storeId, productId }: StoreTrackerProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    // Reiniciamos el contador cada vez que cambia la ruta
    startTimeRef.current = Date.now()
    const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    const eventType = productId ? 'product_view' : 'page_view'

    const sendEvent = (dwellTime: number) => {
      const payload = {
        store_id: storeId,
        event_type: eventType,
        product_id: productId || null,
        url: currentUrl,
        referrer: document.referrer,
        dwell_time: dwellTime,
      }

      // Usamos keepalive para garantizar que el evento llegue a Next.js 
      // incluso si el usuario cierra la pestaña abruptamente.
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {}) // Ignoramos errores de red silenciosamente para no afectar la UI
    }

    // 1. Enviamos el evento de vista inicial (Dwell time = 0)
    sendEvent(0)

    // 2. Escuchamos cuando el usuario abandona la página o cambia de pestaña
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const dwellTimeSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000)
        // Solo enviamos actualización de tiempo si duró más de 3 segundos
        if (dwellTimeSeconds > 3) {
          sendEvent(dwellTimeSeconds)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pathname, searchParams, storeId, productId])

  return null // Es un componente 100% invisible
}