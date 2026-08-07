'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

interface StoreTrackerProps {
  storeId: string
  productId?: number
}

export default function StoreTracker({ storeId, productId }: StoreTrackerProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    startTimeRef.current = Date.now()
    const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    const eventType = productId ? 'product_view' : 'page_view'

    // 🚀 OPTIMIZACIÓN: Generamos el session_id en el cliente una sola vez por sesión
    let sessionId = sessionStorage.getItem('preziso_session_id')
    if (!sessionId) {
      sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)
      sessionStorage.setItem('preziso_session_id', sessionId)
    }

    const sendEvent = (dwellTime: number) => {
      const payload = {
        store_id: storeId,
        session_id: sessionId, // 🚀 Enviamos el ID ya computado
        event_type: eventType,
        product_id: productId || null,
        url: currentUrl,
        referrer: document.referrer,
        dwell_time: dwellTime,
      }

      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {})
    }

    sendEvent(0)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const dwellTimeSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000)
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

  return null
}