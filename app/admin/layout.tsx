import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminNavigation from '@/components/admin/AdminNavigation'
import AdminBackground from '@/components/admin/AdminBackground'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase.from('stores').select('*').eq('user_id', user.id).single()

  return (
    <div className="min-h-screen font-sans text-gray-900">
      <AdminBackground />
      <AdminNavigation store={store} />
      <main className="lg:pl-64 pb-24 min-h-screen relative z-0">
        {children}
      </main>
    </div>
  )
}