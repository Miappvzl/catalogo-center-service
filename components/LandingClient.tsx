'use client'
import AmbientBackground from './AmbientBackground'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShoppingBag, Zap, MessageCircle, ArrowRight, CheckCircle2, 
  Globe, RefreshCw, Menu, X, TrendingUp, 
  Layers, AlertTriangle, ChevronDown, Lock, Instagram, Mail, User,
  Moon, Sun
} from 'lucide-react'

// --- 0. ESTILOS GLOBALES Y LOGICA DE MODO OSCURO ---
// Asegúrate de que en tu tailwind.config.js tengas: darkMode: 'class'

// --- 1. COMPONENTES PEQUEÑOS ---

const BcvTicker = () => (
  <div className="bg-gray-50 dark:bg-zinc-900/50 border-b border-gray-200 dark:border-zinc-800 py-2 overflow-hidden relative z-50 backdrop-blur-sm">
    <div className="whitespace-nowrap flex animate-ticker w-max">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-8 mx-6 text-[10px] font-mono tracking-widest">
          <span className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold">
             <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            BCV: EN VIVO
          </span>
          <span className="text-gray-400 dark:text-zinc-500">|</span>
          <span className="text-gray-600 dark:text-gray-300 font-medium">CUPO LIMITADO</span>
          <span className="text-gray-400 dark:text-zinc-500">|</span>
          <span className="text-gray-600 dark:text-gray-300 font-medium">ACCESO BETA</span>
          <span className="text-gray-400 dark:text-zinc-500">|</span>
          <span className="text-gray-600 dark:text-gray-300 font-medium">VENDE EN $ • COBRA EN BS</span>
        </div>
      ))}
    </div>
    <style jsx>{`
      @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      .animate-ticker { animation: ticker 40s linear infinite; }
    `}</style>
  </div>
)

const WaitlistForm = () => {
    const [form, setForm] = useState({ name: '', instagram: '', email: '' })
    const [loading, setLoading] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setTimeout(() => {
            const message = `🚀 *SOLICITUD PREZISO*\n\nHola, quiero unirme a la lista.\n\n👤 *Nombre:* ${form.name}\n📸 *Instagram:* ${form.instagram}\n📧 *Correo:* ${form.email}`
            const myNumber = "584145811936" 
            const url = `https://wa.me/${myNumber}?text=${encodeURIComponent(message)}`
            window.open(url, '_blank')
            setLoading(false)
        }, 800)
    }

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-2 rounded-2xl shadow-xl dark:shadow-black/50 flex flex-col gap-2 mt-8 relative z-20 transition-colors duration-300">
            <div className="absolute -top-3 left-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-green-200 dark:border-green-800/50">
                Lista de Espera Abierta
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
                <div className="relative">
                    <User size={14} className="absolute top-3.5 left-3 text-gray-400"/>
                    <input 
                        required
                        placeholder="Tu Nombre"
                        value={form.name}
                        onChange={e => setForm({...form, name: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-zinc-950 border border-transparent focus:bg-white dark:focus:bg-zinc-900 focus:border-gray-200 dark:focus:border-zinc-700 rounded-xl pl-9 pr-3 py-3 text-sm outline-none transition-all font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600"
                    />
                </div>
                <div className="relative">
                    <Instagram size={14} className="absolute top-3.5 left-3 text-gray-400"/>
                    <input 
                        required
                        placeholder="@tu_negocio"
                        value={form.instagram}
                        onChange={e => setForm({...form, instagram: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-zinc-950 border border-transparent focus:bg-white dark:focus:bg-zinc-900 focus:border-gray-200 dark:focus:border-zinc-700 rounded-xl pl-9 pr-3 py-3 text-sm outline-none transition-all font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600"
                    />
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 px-2 pb-2">
                 <div className="relative flex-1">
                    <Mail size={14} className="absolute top-3.5 left-3 text-gray-400"/>
                    <input 
                        required
                        type="email"
                        placeholder="tu@correo.com"
                        value={form.email}
                        onChange={e => setForm({...form, email: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-zinc-950 border border-transparent focus:bg-white dark:focus:bg-zinc-900 focus:border-gray-200 dark:focus:border-zinc-700 rounded-xl pl-9 pr-3 py-3 text-sm outline-none transition-all font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600"
                    />
                </div>
                <button 
                    type="submit"
                    disabled={loading}
                    className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-800 dark:hover:bg-gray-200 transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? '...' : <>Unirme <ArrowRight size={14}/></>}
                </button>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500 text-center pb-2 flex items-center justify-center gap-1">
                <Lock size={10}/> Tus datos se envían encriptados a WhatsApp.
            </p>
        </form>
    )
}

const PainAlert = () => (
  <motion.div 
    initial={{ opacity: 0, y: 20, x: 20 }}
    animate={{ opacity: 1, y: 0, x: 0 }}
    transition={{ delay: 1, duration: 0.8 }}
    className="absolute -top-6 -right-6 z-20 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 p-4 rounded-2xl shadow-xl max-w-[200px] hidden md:block backdrop-blur-md"
  >
    <div className="flex items-start gap-3">
      <AlertTriangle size={16} className="text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] font-bold text-red-800 dark:text-red-200 leading-tight mb-1">ALERTA DE MARGEN</p>
        <p className="text-[10px] text-red-600 dark:text-red-300 leading-relaxed">
          Si el dólar sube hoy y tardas 1h en cambiar precios, pierdes el <span className="font-black">5% de tu ganancia</span>.
        </p>
      </div>
    </div>
  </motion.div>
)

const InteractiveDemo = () => {
    const [method, setMethod] = useState('zelle')
    const rate = 60.25
    const price = 45.00
    const penalty = 2.00 
    const finalUSD = method === 'pago_movil' ? price : (price - penalty)
    const finalBs = finalUSD * rate

    return (
        <div className="relative group w-full max-w-[340px] mx-auto perspective-1000">
             <PainAlert />
             {/* Glow */}
            <div className="absolute -inset-1 bg-gradient-to-tr from-gray-200 to-gray-100 dark:from-zinc-800 dark:to-zinc-900 rounded-[2rem] blur-xl opacity-50"></div>
            
            <div className="relative bg-white dark:bg-zinc-900 rounded-[1.8rem] border border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden p-6 transition-colors duration-300">
                {/* Header Mockup */}
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-zinc-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-black dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-black shadow-lg">
                            <ShoppingBag size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-0.5">Checkout</p>
                            <p className="text-sm font-black text-gray-900 dark:text-white">Preziso Store</p>
                        </div>
                    </div>
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                        <RefreshCw size={10} className="animate-spin-slow"/> BCV: {rate}
                    </div>
                </div>

                {/* Producto */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 flex items-center justify-center text-2xl">👟</div>
                    <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Nike Air Force 1</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">Blanco • Talla 42</p>
                    </div>
                    <div className="ml-auto font-black text-sm text-gray-900 dark:text-white">${price}</div>
                </div>

                {/* Selectores */}
                <div className="bg-gray-50 dark:bg-zinc-950 p-1 rounded-xl grid grid-cols-2 gap-1 mb-6 border border-transparent dark:border-zinc-800">
                    <button 
                        onClick={() => setMethod('pago_movil')}
                        className={`py-2 rounded-lg text-[10px] font-bold transition-all ${method === 'pago_movil' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        Pago Móvil (Bs)
                    </button>
                    <button 
                        onClick={() => setMethod('zelle')}
                        className={`py-2 rounded-lg text-[10px] font-bold transition-all ${method === 'zelle' ? 'bg-green-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        Zelle (-${penalty})
                    </button>
                </div>

                {/* Total */}
                <div className="bg-[#0A0A0A] dark:bg-black rounded-2xl p-5 text-white relative overflow-hidden border border-transparent dark:border-zinc-800">
                    <div className="flex justify-between items-end relative z-10">
                        <div>
                             <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Total a Pagar</p>
                             <motion.p 
                                key={finalUSD}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-3xl font-black tracking-tight"
                             >
                                ${finalUSD.toFixed(2)}
                             </motion.p>
                        </div>
                        <div className="text-right">
                             {method === 'pago_movil' ? (
                                <>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Referencia BCV</p>
                                    <p className="text-sm font-mono text-green-400 font-bold border-b border-green-500/30 pb-0.5">
                                        Bs {finalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                                    </p>
                                </>
                             ) : (
                                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-[10px] font-bold">
                                    Descuento Aplicado
                                </span>
                             )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- 2. COMPONENTES ESTRATÉGICOS ---

const VariantShowcase = () => {
    const [color, setColor] = useState('black')
    const [size, setSize] = useState('42')

    return (
        <section className="py-24 bg-white dark:bg-zinc-950 border-t border-gray-100 dark:border-zinc-900 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
                <div className="order-2 lg:order-1">
                    <div className="relative bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-[2.5rem] p-8 md:p-12 overflow-hidden transition-colors duration-300">
                        {/* Fake Browser Header */}
                        <div className="flex gap-2 mb-8">
                            <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                            <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                        </div>

                        <div className="flex gap-8">
                             {/* Product Image Placeholder */}
                            <motion.div 
                                key={color}
                                initial={{ opacity: 0.5, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`w-32 h-32 md:w-48 md:h-48 rounded-2xl flex items-center justify-center text-4xl shadow-inner ${color === 'black' ? 'bg-gray-900 text-white dark:bg-black' : (color === 'green' ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 dark:border-zinc-700 text-black')}`}
                            >
                                👟
                            </motion.div>

                            <div className="flex-1 space-y-6">
                                <div>
                                    <h4 className="font-black text-xl mb-1 dark:text-white">Urban Kicks V2</h4>
                                    <p className="text-sm text-gray-500 dark:text-zinc-400 font-mono">$120.00 USD</p>
                                </div>
                                
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Color</p>
                                    <div className="flex gap-2">
                                        {['black', 'white', 'green'].map(c => (
                                            <button 
                                                key={c} 
                                                onClick={() => setColor(c)}
                                                className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-black dark:border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'} ${c === 'black' ? 'bg-black' : (c === 'green' ? 'bg-green-600' : 'bg-white border-gray-200 dark:border-zinc-700 shadow-sm')}`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Talla</p>
                                    <div className="flex gap-2">
                                        {['40', '41', '42'].map(s => (
                                            <button 
                                                key={s}
                                                onClick={() => setSize(s)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${size === s ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:border-gray-400'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="order-1 lg:order-2">
                    <span className="inline-block px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-black dark:text-white text-[10px] font-bold uppercase tracking-widest mb-6">
                        Gestión de Catálogo V2
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6 dark:text-white">
                        No vendas productos.<br/>
                        <span className="text-gray-400 dark:text-zinc-600">Vende opciones.</span>
                    </h2>
                    <p className="text-lg text-gray-500 dark:text-zinc-400 mb-8 leading-relaxed">
                        El cliente venezolano es exigente. Quiere ver la foto exacta del color que le gusta y saber si hay su talla. 
                        Preziso gestiona <strong>variantes complejas, stock por talla</strong> y categorías ilimitadas.
                    </p>
                    <ul className="space-y-4">
                        <li className="flex items-center gap-3 font-medium dark:text-zinc-300">
                            <CheckCircle2 size={18} className="text-black dark:text-white"/> Control de Stock por Talla/Color
                        </li>
                        <li className="flex items-center gap-3 font-medium dark:text-zinc-300">
                            <CheckCircle2 size={18} className="text-black dark:text-white"/> Fotos específicas por Variante
                        </li>
                        <li className="flex items-center gap-3 font-medium dark:text-zinc-300">
                            <CheckCircle2 size={18} className="text-black dark:text-white"/> Precios distintos según material
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    )
}

const FAQ = () => {
    const [open, setOpen] = useState<number | null>(null)
    const faqs = [
        { q: "¿Cuándo tendré acceso?", a: "Estamos liberando cupos semanalmente para garantizar que la sincronización con el BCV sea perfecta para cada tienda nueva. Al registrarte te notificaremos por WhatsApp." },
        { q: "¿Necesito tarjeta internacional?", a: "No. Preziso está hecho para Venezuela. Podrás pagar tu mensualidad con Pago Móvil o Binance." },
        { q: "¿El dinero pasa por ustedes?", a: "Nunca. Preziso es una herramienta de cálculo y catálogo. El dinero de tus ventas va directo de tu cliente a tu banco." },
        { q: "¿Funciona en teléfonos viejos?", a: "Sí. La tienda que ven tus clientes es ultra ligera y carga rápido incluso con datos móviles inestables." }
    ]

    return (
        <section className="py-24 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-200 dark:border-zinc-800 transition-colors duration-300">
            <div className="max-w-3xl mx-auto px-6">
                <h2 className="text-3xl font-black text-center mb-12 dark:text-white">Preguntas Frecuentes</h2>
                <div className="space-y-4">
                    {faqs.map((faq, i) => (
                        <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden transition-colors duration-300">
                            <button 
                                onClick={() => setOpen(open === i ? null : i)}
                                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                            >
                                <span className="font-bold text-gray-900 dark:text-white">{faq.q}</span>
                                <ChevronDown 
                                    className={`text-gray-400 transition-transform duration-300 ${open === i ? 'rotate-180' : ''}`}
                                />
                            </button>
                            <AnimatePresence>
                                {open === i && (
                                    <motion.div 
                                        initial={{ height: 0 }}
                                        animate={{ height: 'auto' }}
                                        exit={{ height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <p className="p-6 pt-0 text-gray-500 dark:text-zinc-400 leading-relaxed text-sm">
                                            {faq.a}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

const Testimonials = () => (
    <section className="py-24 bg-white dark:bg-zinc-950 border-t border-gray-200 dark:border-zinc-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-black mb-16 dark:text-white">Ya confían en nosotros</h2>
            <div className="grid md:grid-cols-3 gap-8">
                {[
                    { name: "Carlos D.", role: "Tech Store VE", text: "Antes pasaba 2 horas cada mañana cambiando etiquetas. Ahora me levanto y los precios ya están al día." },
                    { name: "Andrea M.", role: "Moda & Calzado", text: "Mis clientes aman que el carrito les diga exactamente cuánto es en Bolívares. Cierro el doble de ventas por WhatsApp." },
                    { name: "Luis R.", role: "Repuestos Auto", text: "Lo mejor es el control de stock. Si vendo una pieza por mostrador, se descuenta de la web al instante." }
                ].map((t, i) => (
                    <div key={i} className="p-8 rounded-[2rem] bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 hover:shadow-xl transition-all duration-300">
                        <div className="flex justify-center mb-4 text-green-500">★★★★★</div>
                        <p className="text-gray-600 dark:text-zinc-300 font-medium mb-6 italic">"{t.text}"</p>
                        <div>
                            <p className="font-black text-gray-900 dark:text-white">{t.name}</p>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t.role}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
)

// --- 3. LANDING PRINCIPAL ---

export default function LandingClient() {
    const [isDarkMode, setIsDarkMode] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)

    // Lógica de Modo Oscuro Manual
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [isDarkMode])

   const scrollToForm = () => {
    const formElement = document.getElementById('formulario-registro') 
    if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
}

    return (
        <div className={`min-h-screen bg-white dark:bg-zinc-950 font-sans text-gray-900 dark:text-zinc-100 selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black overflow-x-hidden transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
            <AmbientBackground />
            <BcvTicker />

            {/* NAVBAR */}
            <nav className="sticky top-0 w-full z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-xl tracking-tighter cursor-pointer dark:text-white">
                        <div className="bg-black dark:bg-white text-white dark:text-black p-2 rounded-xl">
                            <Zap size={18} fill="currentColor" />
                        </div>
                        <span>Preziso.</span>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-xs font-bold text-gray-500 hover:text-black dark:hover:text-white uppercase tracking-wide">Características</a>
                        <a href="#demo" className="text-xs font-bold text-gray-500 hover:text-black dark:hover:text-white uppercase tracking-wide">Demo</a>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Botón Dark Mode */}
                        <button 
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        <button onClick={scrollToForm} className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-lg flex items-center gap-2">
                            Unirse a la Lista <ArrowRight size={14}/>
                        </button>
                    </div>
                </div>
            </nav>

            {/* HERO */}
            <section className="pt-24 pb-20 lg:pt-32 lg:pb-32 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                    {/* Blobs de fondo adaptativos */}
                    <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-gray-100 dark:bg-zinc-900 rounded-full blur-[100px] opacity-70 transition-colors duration-300"></div>
                </div>

                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center">
                    <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
                        <motion.div 
                            id="formulario-registro"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-full px-4 py-1.5 mb-8 shadow-sm transition-colors duration-300"
                        >
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-[10px] font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest">Sistema Operativo para Venezuela</span>
                        </motion.div>

                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[0.9] text-gray-900 dark:text-white transition-colors duration-300"
                        >
                            Vende en Dólares.<br/>
                            <span className="text-gray-300 dark:text-zinc-700">Cobra en Bs.</span><br/>
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-black to-gray-500 dark:from-white dark:to-zinc-500">Automático.</span>
                        </motion.h1>
                        
                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl text-gray-500 dark:text-zinc-400 mb-6 leading-relaxed font-medium max-w-xl"
                        >
                            Olvídate de calcular la tasa cada mañana. Preziso actualiza tus precios con el BCV, organiza tus pedidos de WhatsApp y protege tu margen.
                        </motion.p>
                        
                        {/* AQUI ESTA EL FORMULARIO INTEGRADO */}
                        <motion.div
                             initial={{ opacity: 0, y: 20 }}
                             animate={{ opacity: 1, y: 0 }}
                             transition={{ delay: 0.3 }}
                             className="w-full flex justify-center lg:justify-start"
                        >
                            <WaitlistForm />
                        </motion.div>

                        <p className="mt-4 text-[10px] text-gray-400 dark:text-zinc-600 font-bold uppercase tracking-widest">
                            * Cupos limitados para garantizar estabilidad
                        </p>
                    </div>

                    <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
                        <InteractiveDemo />
                    </div>
                </div>
            </section>

            {/* SECCIÓN NUEVA: VARIANTES (Tallas y Colores) */}
            <VariantShowcase />

            {/* FEATURES GRID (BENTO) */}
            <section id="features" className="py-24 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-200 dark:border-zinc-800 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-black mb-4 dark:text-white">El fin del caos manual.</h2>
                        <p className="text-gray-500 dark:text-zinc-400 text-lg">Reemplazamos tu Excel y tu calculadora.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(200px,auto)]">
                        {/* Card BCV */}
                        <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 border border-gray-100 dark:border-zinc-800 shadow-lg relative overflow-hidden group transition-colors duration-300">
                            <div className="absolute -right-10 -top-10 opacity-5 dark:opacity-[0.02] group-hover:scale-110 transition-transform duration-500">
                                <RefreshCw size={200} />
                            </div>
                            <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mb-6 text-green-600 dark:text-green-400">
                                <TrendingUp size={28} />
                            </div>
                            <h3 className="text-2xl font-black mb-3 dark:text-white">Sincronización BCV Automática</h3>
                            <p className="text-gray-500 dark:text-zinc-400 font-medium max-w-md">
                                Si el dólar sube a las 9:00 AM, tus precios en Bs suben a las 9:01 AM. 
                                Protección total contra la devaluación sin mover un dedo.
                            </p>
                        </div>

                        {/* Card CRM */}
                        <div className="md:row-span-2 bg-[#0A0A0A] dark:bg-black text-white rounded-[2.5rem] p-10 relative overflow-hidden flex flex-col justify-between group shadow-2xl border border-transparent dark:border-zinc-800">
                             <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-green-500/10 to-transparent pointer-events-none"></div>
                             <div>
                                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 text-white border border-white/10">
                                    <Layers size={28} />
                                </div>
                                <h3 className="text-2xl font-black mb-3">CRM de Pedidos</h3>
                                <p className="text-gray-400 text-sm font-medium mb-8">
                                    De "Pendiente" a "Pagado" con un clic. Organiza tus ventas de WhatsApp en un tablero Kanban.
                                </p>
                             </div>
                             {/* Mini UI */}
                             <div className="space-y-2 font-mono text-[10px] opacity-80">
                                <div className="flex justify-between border-b border-white/10 pb-2">
                                    <span>#1044 Angel</span> <span className="text-green-400">PAGADO</span>
                                </div>
                                <div className="flex justify-between border-b border-white/10 pb-2">
                                    <span>#1045 Maria</span> <span className="text-yellow-400">PENDIENTE</span>
                                </div>
                             </div>
                        </div>

                        {/* Card Web */}
                        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 border border-gray-100 dark:border-zinc-800 shadow-lg group hover:-translate-y-1 transition-all duration-300">
                             <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
                                <Globe size={28} />
                            </div>
                            <h3 className="text-xl font-black mb-2 dark:text-white">Tu Web .app</h3>
                            <p className="text-gray-500 dark:text-zinc-400 text-sm font-medium">
                                Tu tienda en <code>preziso.app/tu-marca</code>. Carga instantánea en 4G.
                            </p>
                        </div>

                         {/* Card WhatsApp */}
                         <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 border border-gray-100 dark:border-zinc-800 shadow-lg group hover:-translate-y-1 transition-all duration-300">
                             <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center mb-6 text-purple-600 dark:text-purple-400">
                                <MessageCircle size={28} />
                            </div>
                            <h3 className="text-xl font-black mb-2 dark:text-white">Pedidos a WhatsApp</h3>
                            <p className="text-gray-500 dark:text-zinc-400 text-sm font-medium">
                                El cliente arma el carrito y te llega un mensaje listo con el total y los datos.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* TESTIMONIOS */}
            <Testimonials />

            {/* FAQ */}
            <FAQ />

            {/* CTA FINAL (REEMPLAZADO POR FORMULARIO) */}
            <section id="pricing" className="py-32 bg-white dark:bg-zinc-950 relative overflow-hidden transition-colors duration-300">
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10 flex flex-col items-center">
                    <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 dark:text-white">
                        Únete al club.
                    </h2>
                    <p className="text-gray-500 dark:text-zinc-400 text-xl mb-12 max-w-lg">
                        Estamos abriendo cupos gradualmente. Regístrate ahora para asegurar tu precio de lanzamiento.
                    </p>
                    
                    {/* Reutilizamos el formulario aquí también */}
                    <div className="w-full flex justify-center">
                        <WaitlistForm />
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-12 bg-white dark:bg-zinc-950 border-t border-gray-100 dark:border-zinc-900 text-center transition-colors duration-300">
                 <div className="flex items-center justify-center gap-2 font-black text-xl mb-6 opacity-40 dark:text-white">
                    <Zap size={20} fill="currentColor" />
                    <span>Preziso.</span>
                 </div>
                 <p className="text-gray-400 dark:text-zinc-600 text-xs font-bold uppercase tracking-widest mb-4">
                     Hecho en Venezuela 🇻🇪
                 </p>
                 <p className="text-gray-300 dark:text-zinc-700 text-xs">
                     © {new Date().getFullYear()} Preziso Inc.
                 </p>
            </footer>
        </div>
    )
}