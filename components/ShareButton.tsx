'use client'

import { Share2, Check } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Props {
  productName: string
  price: number
  slug: string // <--- El ID o Slug del producto
  imageUrl?: string // <--- Agregamos la imagen (Opcional)
}

export default function ShareButton({ productName, price, slug, imageUrl }: Props) {
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUrl(window.location.href)
    }
  }, [])

  const handleShare = async () => {
    if (!url) return

    const shareData = {
      title: `Mira este producto: ${productName}`,
      text: `¡Hola! Vi este ${productName} en $${price} y pensé que te gustaría.`,
      url: url
    }

    // 1. Intenta usar el Compartir Nativo del Celular (iPhone/Android)
    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
        return
      } catch (err) {
        console.log('Error compartiendo o cancelado', err)
      }
    }

    // 2. Si está en PC o falla el nativo, copiamos al portapapeles o abrimos WhatsApp
    // Opción A: Abrir WhatsApp Web
    const whatsappText = `${shareData.text} ${url}`
    window.open(`whatsapp://send?text=${encodeURIComponent(whatsappText)}`, '_blank')
  }

  return (
    <button 
      onClick={handleShare}
      className="p-3.5 bg-gray-100 hover:bg-gray-200 text-black rounded-xl transition-all active:scale-90 flex items-center justify-center min-w-[50px]"
      title="Compartir"
    >
      {copied ? <Check size={20} className="text-green-600"/> : <Share2 size={20} />}
    </button>
  )
}