'use client'

import { Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Props {
  productName: string
  price: number
}

export default function ShareButton({ productName, price }: Props) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    // Esto solo corre en el navegador, así que tenemos acceso seguro a window
    if (typeof window !== 'undefined') {
      setUrl(window.location.href)
    }
  }, [])

  const handleShare = () => {
    if (!url) return

    const text = `Mira este producto: ${productName} - $${price} ${url}`
    const whatsappLink = `whatsapp://send?text=${encodeURIComponent(text)}`
    
    // Abrimos WhatsApp
    window.open(whatsappLink, '_blank')
  }

  return (
    <button 
      onClick={handleShare}
      className="p-3.5 bg-gray-100 hover:bg-gray-200 text-black rounded-xl transition-all active:scale-90 flex items-center justify-center"
      title="Compartir"
    >
      <Share2 size={20} />
    </button>
  )
}