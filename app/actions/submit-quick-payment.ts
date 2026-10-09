'use server';

import { createClient } from '@/utils/supabaseServer';

export interface SubmitQuickPaymentInput {
  linkId: string;
  storeSlug: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  amountPaidUsd: number;
  referenceNumber?: string;
  receiptUrl?: string;
}

export interface SubmitQuickPaymentResponse {
  success: boolean;
  orderNumber?: number;
  orderId?: string;
  whatsappConfirmationUrl?: string;
  error?: string;
}

export async function submitQuickPayment(
  input: SubmitQuickPaymentInput
): Promise<SubmitQuickPaymentResponse> {
  try {
    const supabase = await createClient();

    // 1. Validaciones básicas de entrada
    if (!input.customerName.trim() || !input.customerPhone.trim()) {
      return { success: false, error: 'Por favor ingresa tu nombre y número de teléfono.' };
    }

    if (input.amountPaidUsd <= 0) {
      return { success: false, error: 'El monto a reportar debe ser mayor a cero.' };
    }

    // 2. Obtener el enlace de cobro de forma segura
    const { data: link, error: linkError } = await supabase
      .from('payment_links')
      .select('*, stores!inner(id, slug, name, phone, owner_whatsapp)')
      .eq('id', input.linkId)
      .single();

    if (linkError || !link) {
      return { success: false, error: 'El enlace de pago no existe o ha sido cancelado.' };
    }

    // 3. Validar si ya está pagado o expirado
    if (link.status === 'paid') {
      return { success: false, error: 'Este enlace ya ha sido pagado en su totalidad.' };
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return { success: false, error: 'Este enlace de pago ha expirado.' };
    }

    const store = link.stores;

    // 4. Obtener la tasa de cambio oficial de app_config
    const { data: config } = await supabase
      .from('app_config')
      .select('usd_rate')
      .eq('id', 1)
      .single();

    const activeRate = Number(config?.usd_rate || 1);

    // 5. Calcular número correlativo de la orden para la tienda
    const { data: lastOrder } = await supabase
      .from('orders')
      .select('order_number')
      .eq('store_id', store.id)
      .order('order_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrderNumber = (lastOrder?.order_number || 0) + 1;

    // 6. Determinar nuevo saldo del enlace y su estado
    const totalLinkAmount = Number(link.total_amount_usd);
    const newPaidAmount = Number((Number(link.paid_amount_usd || 0) + input.amountPaidUsd).toFixed(2));
    const isFullyPaid = newPaidAmount >= totalLinkAmount - 0.01;
    const newStatus = isFullyPaid ? 'paid' : 'partially_paid';

    // 7. Preparar registro de la orden principal en public.orders
    const deliveryInfo = input.referenceNumber
      ? `Cobro Rápido | Ref: ${input.referenceNumber.trim()}`
      : 'Cobro Rápido';

    const orderPayload = {
      store_id: store.id,
      customer_name: input.customerName.trim(),
      customer_phone: input.customerPhone.trim(),
      order_number: nextOrderNumber,
      total_usd: totalLinkAmount,
      total_bs: Number((totalLinkAmount * activeRate).toFixed(2)),
      exchange_rate: activeRate,
      currency_type: 'usd',
      status: 'pending',
      payment_method: input.paymentMethod,
      source: 'quick_link',
      delivery_info: deliveryInfo,
      receipt_url: input.receiptUrl || null,
      subtotal_usd: totalLinkAmount,
      shipping_cost: 0,
      fulfillment_type: 'pickup',
    };

    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select('id, order_number')
      .single();

    if (orderError || !insertedOrder) {
      return { success: false, error: 'Hubo un error al registrar el pedido.' };
    }

    // 8. Si el link vino de catálogo, registramos los ítems en order_items
    if (link.mode === 'catalog' && Array.isArray(link.items) && link.items.length > 0) {
      const itemsPayload = link.items.map((item: any) => ({
        order_id: insertedOrder.id,
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        price_at_purchase: item.price,
        variant_info: item.variantLabel || 'N/A',
        variant_id: item.variantId || null,
      }));

      await supabase.from('order_items').insert(itemsPayload);
    }

    // 9. Actualizar el enlace de cobro con el order_id y su nuevo estatus
    await supabase
      .from('payment_links')
      .update({
        status: newStatus,
        paid_amount_usd: newPaidAmount,
        order_id: insertedOrder.id,
      })
      .eq('id', link.id);

    // 10. Disparar notificación interna para el vendedor
    await supabase.from('notifications').insert({
      store_id: store.id,
      title: `Pago recibido (#${insertedOrder.order_number})`,
      message: `${input.customerName} reportó un pago de $${input.amountPaidUsd.toFixed(2)} vía ${input.paymentMethod}.`,
      type: 'order',
      link: `/admin/orders?id=${insertedOrder.id}`,
    });

    // 11. Generar enlace de confirmación por WhatsApp para el cliente
    const sellerPhone = store.owner_whatsapp || store.phone || '';
    const cleanPhone = sellerPhone.replace(/[^\d]/g, '');

    const waMessage = `Hola *${store.name}*, acabo de reportar mi pago por el pedido *#${insertedOrder.order_number}*.\n\n` +
      `*Monto:* $${input.amountPaidUsd.toFixed(2)} USD\n` +
      `*Método:* ${input.paymentMethod}\n` +
      (input.referenceNumber ? `*Referencia:* ${input.referenceNumber}\n` : '') +
      `*Cliente:* ${input.customerName}\n\n` +
      `Quedo atento a la confirmación.`;

    const whatsappConfirmationUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`
      : undefined;

    return {
      success: true,
      orderNumber: insertedOrder.order_number,
      orderId: insertedOrder.id,
      whatsappConfirmationUrl,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error interno al procesar el pago.';
    return { success: false, error: msg };
  }
}