'use client'

export const dynamic = 'force-dynamic' // Vital para no ver datos viejos

import { useEffect, useState } from 'react'
import PaymentSettings from '@/components/PaymentSettings'
import { createBrowserClient } from '@supabase/ssr' 
import { useRouter } from 'next/navigation'
import { Plus, Trash2, LogOut, DollarSign, Pencil} from 'lucide-react' // <--- Agrega Pencil
import Link from 'next/link'
import Swal from 'sweetalert2'

export default function AdminPage() {
  const [phone, setPhone] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [store, setStore] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('usd')
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // 1. Buscamos la tienda del usuario
      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      // 2. SI NO TIENE TIENDA -> AL SETUP (Redirección obligatoria)
      if (!storeData) {
        console.log("Usuario sin tienda. Redirigiendo...")
        router.replace('/admin/setup')
        return
      }

      // 3. Si tiene tienda, cargamos todo
      setStore(storeData)
      setCurrency(storeData.currency_type || 'usd')
      setPhone(storeData.phone || '')

      // 4. Productos
      const { data: productsData } = await supabase
        .from('products')
        .select('*, payment_methods(*)')
        .eq('user_id', user.id)
        .order('id', { ascending: false })
        
      setProducts(productsData || [])

    } catch (error) {
      console.error(error)
    } finally {
      // Solo quitamos el loading si NO redirigimos
      // (Si redirigimos, dejamos el loading para que no parpadee la pantalla)
      // Pero como estamos dentro de un async, verificamos si tenemos store antes
      setLoading(false) 
    }
  }

  // --- RESTO DE TUS FUNCIONES (Sin cambios) ---
  const savePhone = async () => {
    setSavingPhone(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { error } = await supabase.from('stores').update({ phone: phone }).eq('user_id', user.id)
        if (error){
          Swal.fire({
            title: '¡Error!',
            text: error.message,
            icon: 'error',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#000000',
            backdrop: true,
            allowOutsideClick: false
          })
        }
        else Swal.fire({
          title: '¡Telefono Guardado!',
          text: 'Tus clientes enviaran los productos seleccionados a ese numero.',
          icon: 'success',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#000000',
          backdrop: true,
          allowOutsideClick: false
        })
    }
    setSavingPhone(false)
  }

  const toggleCurrency = async (newCurrency: string) => {
    setCurrency(newCurrency)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('stores').update({ currency_type: newCurrency }).eq('user_id', user.id)
  }

 
    const handleDelete = async (id: number) => {
    // 1. Preguntamos con SweetAlert en lugar de window.confirm
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "No podrás recuperar este producto después.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#000000', // Tu branding
      cancelButtonColor: '#d33',     // Rojo para cancelar/peligro
      confirmButtonText: 'Sí, borrarlo',
      cancelButtonText: 'Cancelar'
    })

    // 2. Solo si el usuario confirma (da click en "Sí, borrarlo"), procedemos
    if (result.isConfirmed) {
      
      const { error } = await supabase.from('products').delete().eq('id', id)

      if (!error) {
        // Actualizamos la lista visualmente
        setProducts(products.filter(p => p.id !== id))
        
        // Opcional: Una pequeña alerta de éxito que se cierra sola
        Swal.fire({
          title: '¡Borrado!',
          text: 'El producto ha sido eliminado.',
          icon: 'success',
          confirmButtonColor: '#000000',
          timer: 1500, // Se cierra sola en 1.5 segundos
          showConfirmButton: false
        })
      } else {
        // Si falla Supabase
        Swal.fire({
          title: 'Error',
          text: 'No se pudo borrar el producto.',
          icon: 'error',
          confirmButtonColor: '#000000'
        })
      }
    }
  }

  if (loading || (!store && loading === false)) return <div className="min-h-screen flex items-center justify-center">Cargando tu imperio...</div>
  
  // HTML (Tu UI ya estaba bien, solo asegúrate de usar {store.slug} en el link)
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Panel de Control</h1>
            <p className="text-gray-500 text-sm">Gestiona tu tienda: <span className="font-bold">{store?.name}</span></p>
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><LogOut size={20} /></button>
        </div>

        {/* ... (Resto de tu UI, Tarjetas de Moneda, WhatsApp, etc.) ... */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div><h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><DollarSign size={14}/> Moneda Base</h2><p className="text-sm text-gray-600 mb-6">¿Con qué tasa quieres calcular tus precios en Bs?</p></div>
                <div className="flex bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                    <button onClick={() => toggleCurrency('usd')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${currency === 'usd' ? 'bg-white text-green-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}>USD BCV</button>
                    <button onClick={() => toggleCurrency('eur')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${currency === 'eur' ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}>EUR BCV</button>
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div><h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">WhatsApp Pedidos</h2><input type="number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 584121234567" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:border-black text-sm font-medium"/></div>
                <button onClick={savePhone} disabled={savingPhone} className="mt-4 w-full bg-black text-white py-3 rounded-lg text-sm font-bold hover:bg-gray-800 transition-all disabled:opacity-50">{savingPhone ? 'Guardando...' : 'Guardar Número'}</button>
            </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 shadow-lg text-white flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Tu Link Oficial</p>
                <code className="text-blue-400 text-sm md:text-base break-all">
                    https://catalogo-center-service.vercel.app/{store?.slug}
                </code>
            </div>
            <a href={`/${store?.slug}`} target="_blank" className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap">Ver Tienda ↗</a>
        </div>

        <div>
          {/* CONFIGURACIÓN DE PAGOS */}
{store && (
    <PaymentSettings 
        storeId={store.id} 
        initialData={store.payment_methods} 
    />
)}
            <div className="flex justify-between items-end mb-6">
                <h2 className="text-xl font-bold text-gray-900">Mis Productos</h2>
                <a href="/admin/product/new" className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-black/20"><Plus size={18} /> Nuevo</a>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {products.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300"><p className="text-gray-400">No tienes productos aún.</p></div>
                ) : (
                    products.map((product) => (
                        <div key={product.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">{product.image_url && <img src={product.image_url} className="w-full h-full object-cover" />}</div>
                            <div className="flex-1 min-w-0"><h3 className="font-bold text-gray-900 truncate">{product.name}</h3><p className="text-sm text-green-600 font-medium">${product.usd_cash_price}</p></div>
                            
                            {/* ... dentro del map del producto ... */}

<div className="flex items-center gap-2"> {/* Envuelve los botones en un div flex */}

    {/* BOTÓN EDITAR (NUEVO) */}
    <Link 
        href={`/admin/product/edit/${product.id}`}
        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
    >
        <Pencil size={18} />
    </Link>

    {/* BOTÓN BORRAR (EXISTENTE) */}
    <button 
        onClick={() => handleDelete(product.id)}
        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
    >
        <Trash2 size={18} />
    </button>

</div>
                            

                        </div>
                    ))
                )}
            </div>
        </div>

      </div>
    </div>
  )
}