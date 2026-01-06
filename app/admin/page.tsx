'use client'
export const dynamic = 'force-dynamic'; // <--- ESTO ES VITAL


import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js' // Cliente estándar
import { useRouter } from 'next/navigation'
import { Plus, Trash2, LogOut, Copy, ExternalLink, Check, DollarSign, Euro } from 'lucide-react'
import Link from 'next/link'

// Cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminPage() {
  const [phone, setPhone] = useState('') // <--- NUEVO
  const [savingPhone, setSavingPhone] = useState(false) // <--- Para efecto de carga
  const [products, setProducts] = useState<any[]>([])
  const [store, setStore] = useState<any>(null) // Aquí guardamos los datos de la tienda
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('usd') // <--- 1. NUEVO ESTADO PARA MONEDA
  const [copied, setCopied] = useState(false) // Para el efecto del botón "Copiar"
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    // 1. Verificar Usuario
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // 2. NUEVO: BUSCAMOS LA PREFERENCIA DE MONEDA DE LA TIENDA
    const { data: store } = await supabase
      .from('stores')
      .select('currency_type, phone') // <--- AGREGAR phone AQUI
      .eq('user_id', user.id)
      .single()

    if (store) {
      setCurrency(store.currency_type || 'usd')
      setPhone(store.phone || '') // <--- Cargar el teléfono guardado
    }

    // 2. Buscar si ya tiene Tienda configurada
    const { data: storeData } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // SI NO TIENE TIENDA -> Lo mandamos a configurarla
    if (!storeData) {
      router.push('/admin/setup')
      return
    }

    setStore(storeData)


    // 3. Cargar sus productos
    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id) // Solo los de este usuario
      .order('id', { ascending: false })

    if (productsData) setProducts(productsData)
    setLoading(false)
  }

  // --- NUEVA FUNCIÓN PARA GUARDAR EL TELÉFONO ---
  const savePhone = async () => {
    setSavingPhone(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
        const { error } = await supabase
            .from('stores')
            .update({ phone: phone })
            .eq('user_id', user.id)

        if (error) {
            alert("Error al guardar")
        } else {
            alert("¡Teléfono actualizado! Los pedidos llegarán a este número.")
        }
    }
    setSavingPhone(false)
  }


  // 3. NUEVO: FUNCIÓN PARA CAMBIAR LA MONEDA EN VIVO
  const toggleCurrency = async (newCurrency: string) => {
    // 1. Cambio visual inmediato (para que se sienta rápido)
    setCurrency(newCurrency)

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // 2. Intentamos guardar en la base de datos
      const { error } = await supabase
        .from('stores')
        .update({ currency_type: newCurrency })
        .eq('user_id', user.id)

      // 3. SOLO si hay error, avisamos al usuario y revertimos (opcional)
      if (error) {
        console.error("Error guardando cambio:", error.message)
        alert("Hubo un problema de conexión. El cambio no se guardó.")
        // Opcional: Podrías devolver el botón a su estado anterior aquí si quisieras ser muy estricto
      }
    }
  }

  // Función para borrar producto
  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return

    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) {
      setProducts(products.filter(p => p.id !== id))
    }
  }

  // Función para cerrar sesión
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Función para copiar el link
  const copyLink = () => {
    // Construimos la URL completa (detecta si es localhost o vercel)
    const url = `${window.location.origin}/${store?.slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000) // Resetear el icono a los 2 seg
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando tu imperio...</div>

 return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Panel de Control</h1>
            <p className="text-gray-500 text-sm">Gestiona tu tienda {store?.name}</p>
          </div>
          <button 
            onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} 
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>

        {/* --- GRID DE CONFIGURACIÓN (AQUÍ ESTÁ LA MAGIA ✨) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* TARJETA 1: MONEDA */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <DollarSign size={14}/> Moneda Base
                    </h2>
                    <p className="text-sm text-gray-600 mb-6">
                        ¿Con qué tasa quieres calcular tus precios en Bs?
                    </p>
                </div>

                <div className="flex bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                    <button
                        onClick={() => toggleCurrency('usd')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            currency === 'usd' 
                            ? 'bg-white text-green-600 shadow-sm border border-gray-100' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        USD BCV
                    </button>
                    <button
                        onClick={() => toggleCurrency('eur')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            currency === 'eur' 
                            ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        EUR BCV
                    </button>
                </div>
            </div>

            {/* TARJETA 2: WHATSAPP (Ahora separada y limpia) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                         WhatsApp Pedidos
                    </h2>
                    <label className="block text-xs text-gray-500 mb-2">
                        Número Internacional (Sin el +)
                    </label>
                    <input 
                        type="number" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ej: 584121234567"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm font-medium"
                    />
                </div>
                
                <button 
                    onClick={savePhone}
                    disabled={savingPhone}
                    className="mt-4 w-full bg-black text-white py-3 rounded-lg text-sm font-bold hover:bg-gray-800 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                    {savingPhone ? 'Guardando...' : 'Guardar Número'}
                </button>
            </div>
        </div>

        {/* --- TARJETA DE ENLACE --- */}
        <div className="bg-gray-900 rounded-2xl p-6 shadow-lg text-white flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Tu Link Oficial</p>
                <code className="text-blue-400 text-sm md:text-base break-all">
                    http://localhost:3000/tiendawasa
                </code>
            </div>
            <a 
                href="/tiendawasa" 
                target="_blank"
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            >
                Ver Tienda ↗
            </a>
        </div>

        {/* --- LISTA DE PRODUCTOS --- */}
        <div>
            <div className="flex justify-between items-end mb-6">
                <h2 className="text-xl font-bold text-gray-900">Mis Productos</h2>
                <a 
                  href="/admin/product/new" 
                  className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-black/20"
                >
                    <Plus size={18} /> Nuevo
                </a>
            </div>
            
            {/* Grid de Productos */}
            <div className="grid grid-cols-1 gap-4">
                {products.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                        <p className="text-gray-400">No tienes productos aún.</p>
                    </div>
                ) : (
                    products.map((product) => (
                        <div key={product.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                {product.image_url && <img src={product.image_url} className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 truncate">{product.name}</h3>
                                <p className="text-sm text-green-600 font-medium">${product.usd_cash_price}</p>
                            </div>
                            <button 
                                onClick={() => handleDelete(product.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>
    </div>
  )
}