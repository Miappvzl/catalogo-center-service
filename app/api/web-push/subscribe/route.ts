import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        // 🚀 INYECCIÓN EN RUNTIME: Cliente Supabase protegido ADENTRO
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { subscription, storeId } = await request.json();

        if (!subscription || !subscription.endpoint || !storeId) {
            return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        // Insertamos o actualizamos la suscripción usando el endpoint como llave única
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                store_id: storeId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth
            }, { onConflict: 'store_id, endpoint' });

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Suscripción guardada' });

    } catch (error: any) {
        // 🚀 INYECCIÓN DE DEBUGGER: Esto imprimirá el error real en tu TERMINAL de Vercel/VS Code
        console.error('🔥 ERROR CRÍTICO EN SUPABASE:', error.message || error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}