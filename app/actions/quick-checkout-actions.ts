'use server';

import { headers } from 'next/headers';
import { createClient } from '@/utils/supabaseServer';
import { QuickCheckoutItem } from '@/app/store/useQuickCheckout';

export interface CreateQuickLinkInput {
  mode: 'catalog' | 'custom_amount';
  amountUsd: number;
  title?: string;
  items?: QuickCheckoutItem[];
  allowSplitPayments?: boolean;
  minSplitAmountUsd?: number;
  expiresInMinutes?: number | null;
}

export interface CreateQuickLinkResponse {
  success: boolean;
  data?: {
    id: string;
    token: string;
    fullUrl: string;
    totalUsd: number;
    title: string;
    expiresAt: string | null;
    allowSplitPayments: boolean;
    minSplitAmountUsd: number;
    mode: 'catalog' | 'custom_amount';
    storeSlug: string;
  };
  error?: string;
}

export async function createQuickPaymentLink(
  input: CreateQuickLinkInput
): Promise<CreateQuickLinkResponse> {
  try {
    const supabase = await createClient();

    // 1. Verificación de sesión de usuario
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Sesión no autorizada.' };
    }

    // 2. Obtención de la tienda asociada al usuario
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, slug, name')
      .eq('user_id', user.id)
      .single();

    if (storeError || !store) {
      return { success: false, error: 'No se encontró la tienda vinculada a este usuario.' };
    }

    // 3. Validación estricta de montos
    if (typeof input.amountUsd !== 'number' || input.amountUsd <= 0) {
      return { success: false, error: 'El monto total debe ser mayor a cero.' };
    }

    const totalAmount = Number(input.amountUsd.toFixed(2));

    // Validar abonos si están activos
    if (input.allowSplitPayments) {
      if (
        typeof input.minSplitAmountUsd !== 'number' ||
        input.minSplitAmountUsd <= 0 ||
        input.minSplitAmountUsd > totalAmount
      ) {
        return {
          success: false,
          error: 'El monto mínimo de abono no es válido.',
        };
      }
    }

    // 4. Cálculo de tiempo de expiración (UTC)
    let expiresAt: string | null = null;
    if (input.expiresInMinutes && input.expiresInMinutes > 0) {
      const expirationDate = new Date(Date.now() + input.expiresInMinutes * 60 * 1000);
      expiresAt = expirationDate.toISOString();
    }

    // 5. Inserción en la base de datos
    const payload = {
      store_id: store.id,
      mode: input.mode,
      total_amount_usd: totalAmount,
      paid_amount_usd: 0,
      title: input.title?.trim() || (input.mode === 'catalog' ? 'Pedido de catálogo' : 'Cobro rápido'),
      allow_split_payments: Boolean(input.allowSplitPayments),
      min_split_amount_usd: input.allowSplitPayments ? Number(input.minSplitAmountUsd?.toFixed(2)) : 0,
      expires_at: expiresAt,
      items: input.items || [],
      status: 'pending',
      metadata: {
        created_via: 'admin_pos_quick_checkout',
        version: '1.0',
      },
    };

    const { data: newLink, error: insertError } = await supabase
      .from('payment_links')
      .insert(payload)
      .select('id, total_amount_usd, title, expires_at, allow_split_payments, min_split_amount_usd, mode')
      .single();

    if (insertError || !newLink) {
      return {
        success: false,
        error: 'No se pudo generar el enlace en la base de datos.',
      };
    }

      // 6. Construcción de la URL de checkout público con detección dinámica de host
    const headerList = await headers();
    const host = headerList.get('host') || '';
    const proto = headerList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : '');
    const fullUrl = `${baseUrl}/${store.slug}/pay/${newLink.id}`;

    return {
      success: true,
      data: {
        id: newLink.id,
        token: newLink.id,
        fullUrl,
        totalUsd: Number(newLink.total_amount_usd),
        title: newLink.title,
        expiresAt: newLink.expires_at,
        allowSplitPayments: newLink.allow_split_payments,
        minSplitAmountUsd: Number(newLink.min_split_amount_usd || 0),
        mode: newLink.mode,
        storeSlug: store.slug,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor.';
    return { success: false, error: message };
  }
}