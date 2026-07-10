'use server'

import { createClient } from '@supabase/supabase-js'

// Inicializamos cliente con Service Role para saltar RLS y manejar Auth Admin de forma segura en servidor
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function issueStoreCredit(data: {
  orderId: string;
  storeId: string;
  amount: number;
  note: string;
  email?: string;
  existingCustomerId?: string | null;
}) {
  try {
    // 1. Verificación de Idempotencia: ¿Ya existe un ledger para esta orden?
    const { data: existingLedger } = await supabaseAdmin
      .from('store_credit_ledger')
      .select('id')
      .eq('order_id', data.orderId)
      .maybeSingle();

    if (existingLedger) {
      throw new Error('Este pedido ya posee un vuelto virtual procesado en el historial contable.');
    }

    let finalCustomerId = data.existingCustomerId;

    // FASE A: RESOLUCIÓN DE IDENTIDAD (De Invitado a Cliente Unificado)
    if (!finalCustomerId && data.email) {
      const emailLower = data.email.toLowerCase().trim();
      
      // Verificar si el usuario ya existe por email
      const { data: searchId } = await supabaseAdmin.rpc('get_user_id_by_email', { p_email: emailLower });
      
      if (searchId) {
        finalCustomerId = searchId;
      } else {
        // Si no existe, lo creamos en background
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: emailLower,
          email_confirm: true,
          user_metadata: { source: 'guest_to_customer_conversion' }
        });

        if (createErr) throw new Error(`Error creando cliente: ${createErr.message}`);
        if (!newUser.user) throw new Error('No se generó el UUID del usuario');
        
        finalCustomerId = newUser.user.id;

        // Crear el registro obligatorio en public.customers
        await supabaseAdmin.from('customers').upsert({
          id: finalCustomerId,
          full_name: emailLower.split('@')[0],
        }, { onConflict: 'id' });
      }

      // Vincular permanentemente la orden a este cliente
      await supabaseAdmin.from('orders')
        .update({ customer_id: finalCustomerId })
        .eq('id', data.orderId);
    }

    if (!finalCustomerId) {
      throw new Error('Fallo crítico: No se pudo resolver la identidad del cliente.');
    }

    // FASE B: TRANSACCIÓN FINANCIERA (RPC)
    const { error: rpcError } = await supabaseAdmin.rpc('process_store_credit', {
      p_customer_id: finalCustomerId,
      p_store_id: data.storeId,
      p_amount_usd: data.amount,
      p_description: data.note,
      p_order_id: data.orderId
    });

    if (rpcError) throw new Error(`Error en RPC: ${rpcError.message}`);

    // FASE C: ACTUALIZACIÓN DE ESTADO EN LA ORDEN
    const { error: updateOrderError } = await supabaseAdmin
      .from('orders')
      .update({ vuelto_processed: true })
      .eq('id', data.orderId);

    if (updateOrderError) {
      console.error('Alerta contable: Vuelto emitido pero falló marcar orden como procesada:', updateOrderError.message);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 🚀 NUEVA ACCIÓN: Activa/Desactiva el Vuelto Inteligente en el JSONB de la Tienda
export async function toggleStoreCreditStatus(storeId: string, active: boolean) {
  try {
    // 1. Obtener la configuración de pago actual para no sobreescribir otros métodos
    const { data: store, error: fetchErr } = await supabaseAdmin
      .from('stores')
      .select('payment_config')
      .eq('id', storeId)
      .single();

    if (fetchErr) throw fetchErr;

    const currentConfig = store.payment_config || {};
    const updatedConfig = { ...currentConfig, store_credit_active: active };

    // 2. Persistir síncronamente la aceptación legal y activación en la base de datos
    const { error: updateErr } = await supabaseAdmin
      .from('stores')
      .update({ payment_config: updatedConfig })
      .eq('id', storeId);

    if (updateErr) throw updateErr;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}