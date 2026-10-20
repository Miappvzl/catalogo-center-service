// app/api/checkout/pago-flash/init/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';
import { decrypt } from '@/utils/crypto';

export async function POST(req: Request) {
  try {
    console.log("\n==========================================");
    console.log("🚀 [PAGO FLASH INIT] INICIANDO SECUENCIA");
    
    const body = await req.json();
    const { storeId, clientData, orderData, items } = body;

    const supabaseAdmin = getSupabaseAdmin();
    const { data: credentials, error: credError } = await supabaseAdmin.from('store_payment_credentials')
      .select('secret_key_encrypted').eq('store_id', storeId).eq('provider', 'pago_flash').single();

    if (credError || !credentials) {
        return NextResponse.json({ error: 'Comercio sin Pago Flash' }, { status: 400 });
    }

    const bearerToken = decrypt(credentials.secret_key_encrypted);

    // 1. CREAR LA ORDEN EN SUPABASE PRIMERO (Obligatorio para que exista newOrder)
    const { data: newOrder, error: orderError } = await supabaseAdmin.from('orders').insert({
      store_id: storeId,
      customer_name: clientData.name,
      customer_phone: clientData.phone,
      total_usd: orderData.total_usd,
      total_bs: orderData.total_bs,
      exchange_rate: orderData.exchange_rate,
      currency_type: orderData.currency_type,
      status: 'pending',
      payment_method: 'Pago Flash Automatizado',
      pf_payment_status: 'pending'
    }).select('id, order_number').single();

    if (orderError) {
       console.error("❌ ERROR BD:", orderError);
       return NextResponse.json({ error: 'Error al registrar orden' }, { status: 500 });
    }

    // 2. INSERTAR LOS ITEMS DEL CARRITO
    const itemsPayload = items.map((item: any) => ({
      order_id: newOrder.id,
      product_id: item.productId,
      product_name: item.name,
      quantity: item.quantity,
      price_at_purchase: item.basePrice,
    }));
    await supabaseAdmin.from('order_items').insert(itemsPayload);

    // ==========================================
    // 🚀 MODO SIMULADOR (BYPASS PARA DESARROLLO)
    // ==========================================
    if (bearerToken === 'MODO_PRUEBA_LOCAL') {
        console.log("⚠️ EJECUTANDO EN MODO SIMULADOR (BYPASS PAGO FLASH)");
        const mockPfId = `PF-MOCK-${Date.now()}`;
        
        // Simulamos latencia de red
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await supabaseAdmin.from('orders').update({ pf_transaction_id: mockPfId }).eq('id', newOrder.id);
        console.log("✅ SIMULACIÓN INIT EXITOSA");
        // Cambia esto:
        return NextResponse.json({ success: true, pf_transaction_id: mockPfId, order_id: newOrder.id, order_number: newOrder.order_number });
    }

    // ==========================================
    // 🌍 CONEXIÓN REAL A PAGO FLASH
    // ==========================================
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    console.log(`👉 4. Conectando con API de Pago Flash (Endpoint: /order)...`);
    
    const pfResponse = await fetch('https://pagoflash.com/payment-gateway-commerce/order', {
      method: 'POST',
      redirect: 'manual', 
      headers: { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json',
        'Authorization': `Bearer ${bearerToken}` 
      },
      body: JSON.stringify({
        amount: orderData.total_usd, 
        currency: 'USD',
        description: `Pedido #${newOrder.order_number}`,
        orderId: newOrder.id,
        payerName: clientData.name,
        payerDocument: clientData.identityCard || 'V00000000',
        payerPhone: clientData.phone,
        payerEmail: 'cliente@preziso.shop',
        successRedirectUrl: `${baseUrl}/checkout/success`,
        errorRedirectUrl: `${baseUrl}/checkout/error`,
        successCallbackUrl: `${baseUrl}/api/webhooks/pago-flash?token=${process.env.PAGO_FLASH_WEBHOOK_SECRET || 'dev'}`,
        errorCallbackUrl: `${baseUrl}/api/webhooks/pago-flash?token=${process.env.PAGO_FLASH_WEBHOOK_SECRET || 'dev'}`
      })
    });

    if (pfResponse.status >= 300 && pfResponse.status < 400) {
        console.error("❌ PAGO FLASH REDIRIGIÓ LA PETICIÓN.");
        await supabaseAdmin.from('orders').update({ status: 'failed' }).eq('id', newOrder.id);
        return NextResponse.json({ error: 'Credenciales inválidas. Pago Flash rechazó la conexión.' }, { status: 401 });
    }

    const responseText = await pfResponse.text();

    if (!pfResponse.ok) {
       await supabaseAdmin.from('orders').update({ status: 'failed' }).eq('id', newOrder.id);
       return NextResponse.json({ error: `Pago Flash devolvió error ${pfResponse.status}` }, { status: 502 });
    }

    let pfData;
    try {
        pfData = JSON.parse(responseText);
    } catch (e) {
        return NextResponse.json({ error: 'Pago Flash devolvió data corrupta' }, { status: 502 });
    }

    if (pfData.hasErrors || !pfData.result?.id) {
       await supabaseAdmin.from('orders').update({ status: 'failed' }).eq('id', newOrder.id);
       return NextResponse.json({ error: pfData.errors?.[0]?.message || 'Pago Flash rechazó la orden' }, { status: 502 });
    }

    await supabaseAdmin.from('orders').update({ pf_transaction_id: pfData.result.id }).eq('id', newOrder.id);
    
    console.log("✅ FIN DE LA SECUENCIA: ÉXITO");
    // Cambia esto:
    return NextResponse.json({ success: true, pf_transaction_id: pfData.result.id, order_id: newOrder.id, order_number: newOrder.order_number });

  } catch (error: any) {
    console.error('💥 CRASH FATAL:', error.message);
    return NextResponse.json({ error: 'Error del Servidor' }, { status: 500 });
  }
}