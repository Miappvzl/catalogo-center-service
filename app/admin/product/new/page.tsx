import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import ProductEditor from '@/components/ProductEditor'

export default async function NewProductPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div>No autorizado</div>

  const [configRes, storeRes] = await Promise.all([
    supabase.from('app_config').select('usd_rate, eur_rate').eq('id', 1).single(),
    supabase.from('stores').select('id, currency_type').eq('user_id', user.id).single()
  ])

  return (
    <ProductEditor 
        rates={{ 
            usd: configRes.data?.usd_rate || 0, 
            eur: configRes.data?.eur_rate || 0 
        }}
        storeSettings={{
            id: storeRes.data?.id || '',
            currency: storeRes.data?.currency_type || 'usd'
        }}
    />
  )
}