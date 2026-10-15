import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';

// Adaptado al Payload real que enviará Pago Flash de regreso a tu URL
interface PagoFlashWebhookPayload {
  id: string; // ID de la transacción en Pago Flash
  orderId: string; // NUESTRO UUID de Supabase que le mandamos
  status: 'paid' | 'pending' | 'canceled' | string; // Su máquina de estados
  amount: number;
}

export async function POST(req: Request) {
  try {
    // 1. VALIDACIÓN DE AUTENTICIDAD VÍA QUERY STRING
    // Como Pago Flash no permite inyectar headers dinámicos en el callback,
    // usamos una firma en la URL: /api/webhooks/pago-flash?token=SEC_123
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    
    if (token !== process.env.PAGO_FLASH_WEBHOOK_SECRET) {
      console.error('[WEBHOOK] Intento de acceso no autorizado. Token inválido o ausente.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: PagoFlashWebhookPayload = await req.json();

    // 2. VERIFICACIÓN DEL CORDÓN UMBILICAL (Nuestro UUID)
    if (!payload.orderId || !payload.id) {
      return NextResponse.json({ error: 'Payload malformado (faltan IDs)' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const prezisoTakeRate = 0.0150; // 1.5%

    // Adaptamos el estatus de PF al nuestro
    const targetStatus = payload.status === 'paid' ? 'paid' : 'failed';

    // 3. EJECUCIÓN ATÓMICA DE LA BASE DE DATOS
    const { data, error } = await supabaseAdmin.rpc('process_pago_flash_webhook', {
      p_order_id: payload.orderId,
      p_pf_transaction_id: payload.id,
      p_new_status: targetStatus,
      p_fee_percentage: prezisoTakeRate
    });

    if (error) {
      console.error('[WEBHOOK DB ERROR]', error);
      return NextResponse.json({ error: 'Fallo al procesar transacción interna' }, { status: 500 });
    }

    if (!data.success) {
      return NextResponse.json({ error: data.error }, { status: 404 });
    }

    // 4. RETORNO EXITOSO (200 OK obliga a Pago Flash a no reintentar)
    return NextResponse.json({ received: true, message: 'Pago contabilizado' }, { status: 200 });

  } catch (error) {
    console.error('[WEBHOOK CRASH]', error);
    return NextResponse.json({ error: 'Error Interno del Servidor' }, { status: 500 });
  }
}

