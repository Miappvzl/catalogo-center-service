import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabaseServer' // Usando tu archivo existente

export async function POST(request: Request) {
    try {
        // 1. Verificación de Seguridad: Solo 'quanzosinc' puede ejecutar esto
        const supabaseUser = await createClient()
        const { data: { user } } = await supabaseUser.auth.getUser()

        if (!user || user.email !== 'quanzosinc@gmail.com') {
            return NextResponse.json({ error: 'Acceso Denegado. Se ha registrado el intento.' }, { status: 403 })
        }

        const { userId } = await request.json()
        if (!userId) return NextResponse.json({ error: 'Falta el ID del usuario' }, { status: 400 })

        // 2. Inicializar Cliente Admin (Bypass de RLS)
        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

      // 3. Obtener el usuario desde Auth
    const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (userError || !targetUser.user) {
      return NextResponse.json({ error: 'Usuario no encontrado en la base de autenticación.' }, { status: 404 })
    }

    // VALIDACIÓN CRÍTICA PARA TYPESCRIPT: Asegurar que el email existe
    if (!targetUser.user.email) {
      return NextResponse.json({ error: 'Este usuario no tiene un correo electrónico válido asociado.' }, { status: 400 })
    }

    // 4. Generar el Magic Link interceptado
    // Utilizamos lógica dinámica para soportar Localhost y Producción (preziso.shop)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.NODE_ENV === 'production' ? 'https://preziso.shop' : 'http://localhost:3000')
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.user.email,
      options: {
        // Redirigimos a un componente cliente para que procese el #access_token
        redirectTo: `${siteUrl}/auth/impersonate` 
      }
    })

    if (linkError) throw linkError

    return NextResponse.json({ url: linkData.properties.action_link })
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
    }
}