// app/api/ai/banner-scene/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabaseServer'

export const runtime = 'nodejs'
export const maxDuration = 45

interface BannerSceneRequest {
  prompt: string
  stylePreset: 'obsidian_studio' | 'minimal_daylight' | 'warm_editorial' | 'urban_neon'
  viewport: 'desktop' | 'mobile'
  storeType: 'retail' | 'restaurant' | string
  ctaAlignment: 'left' | 'center' | 'right'
  hasRealProducts: boolean
  ctaEnabled: boolean
}

const STYLE_PRESET_PROMPTS: Record<BannerSceneRequest['stylePreset'], string> = {
  obsidian_studio:
    'luxury dark obsidian stone studio environment, subtle volumetric rim lighting, soft warm gold and silver reflections, deep matte black shadows, architectural minimalism, high-end commercial photography, 8k resolution, shot on Hasselblad H6D 80mm f/2.8',
  minimal_daylight:
    'ultra-clean minimalist architectural studio, soft natural morning sunlight casting gentle organic window shadows on warm travertine marble and off-white plaster, Aesop and Jacquemus editorial aesthetic, airy luxury atmosphere, 8k',
  warm_editorial:
    'warm artisanal luxury setting, rich dark walnut wood texture, soft golden hour bokeh lights in background, cinematic shallow depth of field f/1.4, cozy Michelin-star editorial atmosphere, photorealistic',
  urban_neon:
    'contemporary high-fashion brutalist concrete studio, brushed titanium metallic surfaces, subtle cool cyan and warm amber studio edge lighting, sleek modern commercial lookbook background, 8k'
}

/**
 * Compila un prompt fotográfico en inglés con conciencia geométrica del botón CTA
 * y del espacio reservado para los productos reales del comerciante.
 */
function buildSpatialAwarePrompt(body: BannerSceneRequest): string {
  const baseStyle = STYLE_PRESET_PROMPTS[body.stylePreset] || STYLE_PRESET_PROMPTS.obsidian_studio
  const userConcept = (body.prompt || '').trim()

  const domainHint =
    body.storeType === 'restaurant'
      ? 'gourmet culinary photography environment, appetizing textures, clean tabletop surface'
      : 'high-end retail brand campaign environment, luxury display surface'

  // Reglas espaciales para que el fondo de la IA respete el botón CTA y el producto real
  let spatialDirective = ''

  if (body.viewport === 'desktop') {
    if (body.hasRealProducts) {
      if (body.ctaAlignment === 'right') {
        spatialDirective =
          'asymmetric wide banner composition: empty luxury display surface on the LEFT side, clean dark uncluttered negative space on the RIGHT side for web typography overlay'
      } else {
        spatialDirective =
          'asymmetric wide banner composition: clean uncluttered atmospheric negative space on the LEFT side for web typography overlay, empty luxury pedestal surface on the RIGHT side'
      }
    } else {
      // Sin producto real: la IA genera el sujeto principal pero lejos del botón CTA
      if (body.ctaAlignment === 'left') {
        spatialDirective =
          'asymmetric widescreen hero banner: main visual subject positioned on the RIGHT third, wide clean uncluttered negative space on the LEFT half for web button overlay'
      } else if (body.ctaAlignment === 'right') {
        spatialDirective =
          'asymmetric widescreen hero banner: main visual subject positioned on the LEFT third, wide clean uncluttered negative space on the RIGHT half for web button overlay'
      } else {
        spatialDirective =
          'wide cinematic hero banner composition with balanced depth and clean center focal area'
      }
    }
  } else {
    // Mobile (Vertical 4:5 o 3:2)
    if (body.hasRealProducts) {
      spatialDirective =
        'vertical mobile portrait background: clean studio lighting in the upper-center area, smooth dark atmospheric gradient in the bottom third for mobile button overlay'
    } else {
      spatialDirective =
        'vertical mobile hero composition: main subject framed in the upper two-thirds, clean uncluttered negative space in the bottom third for mobile CTA button overlay'
    }
  }

  const subjectDirective = body.hasRealProducts
    ? `empty background stage and environment inspired by (${userConcept || domainHint}), no central object clutter, ready for product placement`
    : `${userConcept || domainHint}, commercial hero photography`

  return `${subjectDirective}. ${spatialDirective}. ${baseStyle}. STRICTLY NO TEXT, NO LETTERS, NO TYPOGRAPHY, NO LOGOS, NO WATERMARKS, NO BORDERS.`
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verificación de sesión autenticada (Evita abuso público del endpoint)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = (await req.json()) as BannerSceneRequest
    const compiledPrompt = buildSpatialAwarePrompt(body)

    // Dimensiones nativas múltiplos exactos de 32 para modelos FLUX
    const width = body.viewport === 'desktop' ? 1344 : 864
    const height = body.viewport === 'desktop' ? 448 : 1088
    const seed = Math.floor(Math.random() * 9999999)

    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const cfApiToken = process.env.CLOUDFLARE_API_TOKEN
    const hfToken = process.env.HUGGINGFACE_API_KEY

    // ========================================================================
    // ORÁCULO 1 (PRIMARIO): CLOUDFLARE WORKERS AI (@cf/black-forest-labs/flux-1-schnell)
    // Costo: $0.00 (10,000 Neurons/día gratis = ~150 banners/día gratis)
    // ========================================================================
    if (cfAccountId && cfApiToken) {
      try {
        const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`
        const cfRes = await fetch(cfUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cfApiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: compiledPrompt,
            num_steps: 4,
            width,
            height,
            seed
          })
        })

        if (cfRes.ok) {
          const contentType = cfRes.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            const json = await cfRes.json()
            const base64Img = json?.result?.image
            if (base64Img) {
              return NextResponse.json({
                success: true,
                imageDataUrl: `data:image/jpeg;base64,${base64Img}`,
                provider: 'cloudflare-flux-1-schnell'
              })
            }
          } else {
            const arrayBuffer = await cfRes.arrayBuffer()
            const base64Img = Buffer.from(arrayBuffer).toString('base64')
            return NextResponse.json({
              success: true,
              imageDataUrl: `data:image/jpeg;base64,${base64Img}`,
              provider: 'cloudflare-flux-1-schnell-binary'
            })
          }
        }
      } catch (cfErr) {
        console.warn('⚠️ Oráculo 1 (Cloudflare AI) falló, pasando a Oráculo 2:', cfErr)
      }
    }

    // ========================================================================
    // ORÁCULO 2 (RESPALDO #1): HUGGING FACE SERVERLESS INFERENCE (FLUX.1-schnell)
    // Costo: $0.00 (Free Tier con token de Hugging Face)
    // ========================================================================
    if (hfToken) {
      try {
        const hfRes = await fetch(
          'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${hfToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              inputs: compiledPrompt,
              parameters: {
                width,
                height,
                num_inference_steps: 4,
                seed
              }
            })
          }
        )

        if (hfRes.ok) {
          const arrayBuffer = await hfRes.arrayBuffer()
          const base64Img = Buffer.from(arrayBuffer).toString('base64')
          return NextResponse.json({
            success: true,
            imageDataUrl: `data:image/jpeg;base64,${base64Img}`,
            provider: 'huggingface-flux-1-schnell'
          })
        }
      } catch (hfErr) {
        console.warn('⚠️ Oráculo 2 (HuggingFace) falló, pasando a Oráculo 3:', hfErr)
      }
    }

    // ========================================================================
    // ORÁCULO 3 (ZERO-CONFIG FALLBACK): FLUX EDGE STREAM
    // Funciona al instante sin requerir API Keys configuradas
    // ========================================================================
    try {
      const encodedPrompt = encodeURIComponent(compiledPrompt)
      const fluxUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true&enhance=false`
      const pollRes = await fetch(fluxUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      })

      if (pollRes.ok) {
        const arrayBuffer = await pollRes.arrayBuffer()
        const base64Img = Buffer.from(arrayBuffer).toString('base64')
        return NextResponse.json({
          success: true,
          imageDataUrl: `data:image/jpeg;base64,${base64Img}`,
          provider: 'flux-edge-fallback'
        })
      }
    } catch (pollErr) {
      console.warn('⚠️ Oráculo 3 falló:', pollErr)
    }

    // Si todos los servicios externos están temporalmente saturados, devolvemos señal
    // para que el cliente active el sintetizador procedural de estudio 3D en Canvas (0 fallos)
    return NextResponse.json({
      success: true,
      imageDataUrl: null,
      provider: 'procedural-studio-engine'
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error generando escena de banner' },
      { status: 500 }
    )
  }
}