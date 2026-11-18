// app/api/og/achievement/route.tsx
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    const { searchParams, origin } = new URL(req.url)
    const storeName = searchParams.get('store') || 'Nuestra Tienda'
    const slug = (searchParams.get('slug') || 'tienda').toLowerCase()
    const metric = searchParams.get('metric') || '100'
    const badgeTitle = searchParams.get('title') || 'Primeras 100 Visitas'
    const copy =
      searchParams.get('copy') ||
      'Gracias por visitar nuestro catálogo oficial y confiar en nuestra marca.'
    const theme = searchParams.get('theme') || 'obsidian'
    const sculpture =
      searchParams.get('sculpture') ||
      '/Cápsula-futurista-sobre-pedestal-flotante.webp'

    const isLight = theme === 'alabaster' || theme === 'silver'
    const bgCard =
      theme === 'alabaster'
        ? '#FAF8F5'
        : theme === 'silver'
        ? '#EEF0F4'
        : theme === 'champagne'
        ? '#141210'
        : theme === 'emerald'
        ? '#09110E'
        : '#0C0D10'

    const textMain = isLight ? '#0C0D0E' : '#FFFFFF'
    const textMuted = isLight ? '#52525B' : '#A1A1AA'
    const accentBg = isLight ? '#0C0D0E' : '#FFFFFF'
    const accentText = isLight ? '#FFFFFF' : '#0C0D0E'
    const borderCol = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)'

    const sculptureFullUrl = sculpture.startsWith('http')
      ? sculpture
      : `${origin}${sculpture}`

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            backgroundColor: '#070709',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '36px',
            fontFamily: 'sans-serif'
          }}
        >
          <div
            style={{
              width: '1128px',
              height: '558px',
              backgroundColor: bgCard,
              border: `1.5px solid ${borderCol}`,
              borderRadius: '36px',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '54px 64px',
              color: textMain,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Columna Izquierda: Mensaje Humano y Marca */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%',
                maxWidth: '650px'
              }}
            >
              {/* Identidad de la tienda */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '999px',
                    backgroundColor: '#10B981'
                  }}
                />
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: textMain,
                    letterSpacing: '-0.01em'
                  }}
                >
                  {storeName}
                </span>
                <span style={{ fontSize: '18px', color: textMuted }}>
                  • Logro Desbloqueado
                </span>
              </div>

              {/* Métrica y Título Cálido */}
              <div style={{ display: 'flex', flexDirection: 'column', margin: 'auto 0' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                  <span
                    style={{
                      fontSize: '96px',
                      fontWeight: 900,
                      letterSpacing: '-0.05em',
                      lineHeight: 1,
                      color: textMain
                    }}
                  >
                    {metric}
                  </span>
                  <span
                    style={{
                      fontSize: '28px',
                      fontWeight: 700,
                      color: textMuted,
                      letterSpacing: '-0.02em'
                    }}
                  >
                    visitas en nuestra tienda
                  </span>
                </div>

                <span
                  style={{
                    fontSize: '32px',
                    fontWeight: 800,
                    color: textMain,
                    marginTop: '14px',
                    letterSpacing: '-0.02em'
                  }}
                >
                  {badgeTitle}
                </span>

                <span
                  style={{
                    fontSize: '21px',
                    color: textMuted,
                    marginTop: '12px',
                    lineHeight: 1.4,
                    fontWeight: 400
                  }}
                >
                  {copy}
                </span>
              </div>

              {/* Pastilla con el link de la tienda + Sello Preziso en Español */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div
                  style={{
                    backgroundColor: accentBg,
                    color: accentText,
                    padding: '12px 28px',
                    borderRadius: '999px',
                    fontSize: '20px',
                    fontWeight: 700
                  }}
                >
                  {slug}.preziso.shop
                </div>
                <span style={{ fontSize: '16px', color: textMuted, fontWeight: 500 }}>
                  Tienda oficial impulsada por Preziso
                </span>
              </div>
            </div>

            {/* Columna Derecha: Escultura 3D de Estudio */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '380px',
                height: '380px'
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sculptureFullUrl}
                alt={badgeTitle}
                width={360}
                height={360}
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630
      }
    )
  } catch {
    return new Response('Error generando tarjeta de logro', { status: 500 })
  }
}