// app/api/admin/payment-credentials/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseServer';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';
import { encrypt } from '@/utils/crypto';

export async function POST(req: Request) {
  try {
    const { storeId, provider, publicKey, secretKey } = await req.json();

    if (!storeId || !provider || !publicKey || !secretKey) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    // 1. Verificación de Seguridad: ¿El usuario actual es dueño de esta tienda?
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: store } = await supabase.from('stores').select('id').eq('user_id', user.id).eq('id', storeId).single();
    if (!store) return NextResponse.json({ error: 'Acceso denegado a esta tienda' }, { status: 403 });

    // 2. Encriptación
    const encryptedSecret = encrypt(secretKey);

    // 3. Guardado en la Bóveda usando permisos de Admin
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('store_payment_credentials')
      .upsert({
        store_id: storeId,
        provider: provider,
        public_key: publicKey,
        secret_key_encrypted: encryptedSecret,
        is_active: true, // Si nos mandan llaves, asumimos que está activo
        updated_at: new Date().toISOString()
      }, { onConflict: 'store_id, provider' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CREDENTIALS API ERROR]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}