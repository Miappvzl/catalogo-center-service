import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/utils/supabaseAdmin'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { store_id, event_type, product_id, url, referrer, dwell_time } = body

    // 1. Filtro Anti-Bots Avanzado (Lighthouse, Pingdom y Scrapers comunes)
    const userAgent = req.headers.get('user-agent') || ''
    const isBot = /bot|crawler|spider|crawling|lighthouse|pingdom|gtmetrix|seo|archive/i.test(userAgent)
    if (isBot) return NextResponse.json({ success: true, note: 'bot ignored' })

    // 2. Extracción de Dispositivo y Ubicación
    const device_type = /mobile|android|iphone|ipad|phone/i.test(userAgent.toLowerCase()) ? 'mobile' : 'desktop'
    const regionCode = req.headers.get('x-vercel-ip-country-region') || 'Desconocido'
    
    // 3. Extracción Inteligente de Canales de Origen
    let referrer_source = 'direct'
    const refLower = (referrer || '').toLowerCase()
    
    if (refLower.includes('instagram') || refLower.includes('ig.me') || refLower.includes('l.instagram')) {
      referrer_source = 'instagram'
    } else if (refLower.includes('tiktok') || refLower.includes('vt.tiktok')) {
      referrer_source = 'tiktok'
    } else if (refLower.includes('wa.me') || refLower.includes('whatsapp') || refLower.includes('web.whatsapp')) {
      referrer_source = 'whatsapp' // Agrupamos clics directos desde WhatsApp
    }

    // 4. Anonimización Legal de la Sesión
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const date = new Date().toISOString().split('T')[0]
    const session_id = crypto
      .createHash('sha256')
      .update(`${ip}-${userAgent}-${date}`)
      .digest('hex')

    // 5. Inserción con Service Role
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('analytics_raw_events').insert({
      store_id,
      session_id,
      event_type,
      product_id: product_id || null,
      url,
      referrer_source,
      device_type,
      location_state: regionCode,
      dwell_time: dwell_time || 0,
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics Track Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}