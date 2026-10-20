// app/api/checkout/pago-flash/verify/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';
import { decrypt } from '@/utils/crypto';

export async function POST(req: Request) {
  try {
    const { storeId, orderId, pfTransactionId, p2pData, amount } = await req.json();
    const supabaseAdmin = getSupabaseAdmin();

   const { data: credentials } = await supabaseAdmin.from('store_payment_credentials')
      .select('secret_key_encrypted').eq('store_id', storeId).eq('provider', 'pago_flash').single();
    
    // ESCUDO TYPESCRIPT AÑADIDO:
    if (!credentials) {
      return NextResponse.json({ success: false, error: 'Credenciales no encontradas.' }, { status: 400 });
    }
    
    const bearerToken = decrypt(credentials.secret_key_encrypted);


    // ==========================================
    // 🚀 MODO SIMULADOR (BYPASS PARA DESARROLLO)
    // ==========================================
    if (bearerToken === 'MODO_PRUEBA_LOCAL') {
        console.log("⚠️ VALIDANDO PAGO EN MODO SIMULADOR");
        
        // Simulamos validación bancaria de 1.5 segundos
        await new Promise(resolve => setTimeout(resolve, 1500)); 
        
        // Ejecutamos la transición atómica en la BD (pasamos a pagado y cobramos el take-rate)
        await supabaseAdmin.rpc('process_pago_flash_webhook', {
            p_order_id: orderId,
            p_pf_transaction_id: pfTransactionId,
            p_new_status: 'paid',
            p_fee_percentage: 0.0150
        });
        
        return NextResponse.json({ success: true });
    }

    // 1. Ejecutar Endpoint P2P de Pago Flash
    const p2pResponse = await fetch(`https://pagoflash.com/payment-gateway-commerce/order/pay/p2p/${pfTransactionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${bearerToken}` },
      body: JSON.stringify({
        phoneCode: p2pData.phoneCode, // Ej: "414"
        phone: p2pData.phone,         // Ej: "1234567"
        reference: p2pData.reference,
        bankCode: p2pData.bankCode,
        amount: amount, 
        date: new Date().toISOString().split('T')[0], // "2025-05-29"
        documentType: "V", 
        document: p2pData.document
      })
    });

    const pfResult = await p2pResponse.json();

    if (pfResult.hasErrors) {
      return NextResponse.json({ 
        success: false, 
        error: pfResult.errors[0]?.message || 'Validación fallida. Revisa los datos de la transferencia.' 
      }, { status: 400 });
    }

    // 2. Si el pago pasó en vivo, actualizamos la base de datos (Igual que el webhook)
    await supabaseAdmin.rpc('process_pago_flash_webhook', {
      p_order_id: orderId,
      p_pf_transaction_id: pfTransactionId,
      p_new_status: 'paid',
      p_fee_percentage: 0.0150
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: 'Error del Servidor' }, { status: 500 });
  }
}