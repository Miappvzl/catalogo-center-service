'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import Link from 'next/link'
import { 
  Zap, ArrowRight, CheckCircle2, 
  Globe, RefreshCw, Menu, X, TrendingUp, 
  Layers, AlertTriangle, ChevronDown, Lock, Instagram, User,
  Smartphone, Check, Activity
} from 'lucide-react'

// --- ESTILOS VISUALES (DOT MATRIX & WEBILD UI) ---
const globalStyles = `
  body {
    background-color: #000000;
  }
  
  /* Fondo de Puntitos (Dot Matrix) Elegante */
  .bg-dot-matrix {
    background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px);
    background-size: 24px 24px;
    mask-image: radial-gradient(ellipse at 50% 0%, black 50%, transparent 100%);
    -webkit-mask-image: radial-gradient(ellipse at 50% 0%, black 50%, transparent 100%);
  }
  
  /* Tarjetas Cristalinas Premium */
  .webild-card {
    background: #050505;
    background-image: radial-gradient(ellipse at top, rgba(255,255,255,0.03) 0%, transparent 80%);
    border: 1px solid #1A1A1A;
    border-top: 1px solid #222; 
    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.8);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .webild-card:hover {
    border-color: #333;
    background-image: radial-gradient(ellipse at top, rgba(34,197,94,0.04) 0%, transparent 80%);
  }

  /* Animaciones Suaves */
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }
  .animate-float { animation: float 6s ease-in-out infinite; }

  @keyframes ticker {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .animate-ticker { animation: ticker 40s linear infinite; }

  /* Inputs Fantasma */
  .webild-input {
    background: #0A0A0A;
    border: 1px solid #1A1A1A;
    color: #fff;
    transition: all 0.2s ease;
  }
  .webild-input:focus {
    border-color: #444;
    background: #111;
  }
`

// --- VARIANTES DE ANIMACIÓN PARA SCROLL (CORREGIDAS PARA TYPESCRIPT) ---
const fadeUpVariant: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
        opacity: 1, 
        y: 0, 
        transition: { 
            type: "spring",
            damping: 25,
            stiffness: 120
        } 
    }
};

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.15 }
    }
};

// --- TICKER DE AUTORIDAD ---
const BcvTicker = () => (
  <div className="bg-black border-b border-[#1A1A1A] py-2 overflow-hidden relative z-50">
    <div className="whitespace-nowrap flex animate-ticker w-max will-change-transform">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-10 mx-5 text-[10px] font-mono tracking-widest uppercase">
          <span className="flex items-center gap-2 text-green-500 font-semibold">
             <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
            </span>
            TASA BCV CONECTADA
          </span>
          <span className="text-[#333]">|</span>
          <span className="text-[#888] font-medium">CATÁLOGO MULTIMONEDA</span>
          <span className="text-[#333]">|</span>
          <span className="text-[#888] font-medium">PEDIDOS POR WHATSAPP</span>
        </div>
      ))}
    </div>
  </div>
)

// --- CONTADOR DE COMUNIDAD ---
const LiveCounter = () => {
    const [count, setCount] = useState(0)
    
    useEffect(() => {
        let start = 80
        const end = 124 
        const duration = 2000
        const incrementTime = duration / (end - start)

        const timer = setInterval(() => {
            start += 1
            setCount(start)
            if (start >= end) clearInterval(timer)
        }, incrementTime)

        return () => clearInterval(timer)
    }, [])

    return (
        <div className="inline-flex items-center gap-2 bg-[#0A0A0A] border border-[#222] rounded-full pl-3 pr-4 py-1.5 mb-8 shadow-sm">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-50"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </div>
            <span className="text-[#888] text-xs font-medium tracking-wide">
                <span className="text-white font-mono font-bold">{count}</span> tiendas en lista de espera
            </span>
        </div>
    )
}

// --- FORMULARIO PERSUASIVO ---
const WaitlistForm = () => {
    const [form, setForm] = useState({ name: '', phone: '', instagram: '' })
    const [loading, setLoading] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setTimeout(() => {
            const message = `🚀 *ACCESO A PREZISO*\n\nHola, quiero dejar de calcular la tasa a mano y unirme a la lista.\n\n👤 *Nombre:* ${form.name}\n📱 *WhatsApp:* ${form.phone}\n📸 *Instagram:* ${form.instagram}\n\nQuedo atento a mi cupo.`
            const myNumber = "584145811936" // TU NÚMERO
            const url = `https://wa.me/${myNumber}?text=${encodeURIComponent(message)}`
            window.open(url, '_blank')
            setLoading(false)
        }, 800)
    }

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-md bg-[#050505] border border-[#1A1A1A] p-4 rounded-2xl shadow-2xl flex flex-col gap-3 mt-8 relative z-20">
            <div className="absolute -top-3 left-6 bg-[#0A0A0A] text-green-500 px-3 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border border-[#222]">
                Acceso Anticipado
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="relative">
                    <User size={14} className="absolute top-1/2 -translate-y-1/2 left-3 text-[#555]"/>
                    <input 
                        required
                        placeholder="Tu Nombre"
                        value={form.name}
                        onChange={e => setForm({...form, name: e.target.value})}
                        className="w-full webild-input rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none font-medium placeholder:text-[#555]"
                    />
                </div>
                <div className="relative">
                    <Instagram size={14} className="absolute top-1/2 -translate-y-1/2 left-3 text-[#555]"/>
                    <input 
                        required
                        placeholder="@tu_tienda"
                        value={form.instagram}
                        onChange={e => setForm({...form, instagram: e.target.value})}
                        className="w-full webild-input rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none font-medium placeholder:text-[#555]"
                    />
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
                 <div className="relative flex-1">
                    <Smartphone size={14} className="absolute top-1/2 -translate-y-1/2 left-3 text-[#555]"/>
                    <input 
                        required
                        type="tel"
                        placeholder="WhatsApp (0412...)"
                        value={form.phone}
                        onChange={e => setForm({...form, phone: e.target.value})}
                        className="w-full webild-input rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none font-medium placeholder:text-[#555]"
                    />
                </div>
                <button 
                    type="submit"
                    disabled={loading}
                    className="bg-white text-black px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-70"
                >
                    {loading ? 'Procesando...' : <>Quiero mi acceso <ArrowRight size={14}/></>}
                </button>
            </div>
            <p className="text-[10px] text-[#555] text-center pt-1 pb-1 flex items-center justify-center gap-1 font-medium">
                <Lock size={10}/> Tus datos viajan directo a nuestro WhatsApp. Sin intermediarios.
            </p>
        </form>
    )
}

// --- ALERTA DE DOLOR (PSICOLOGÍA DE VENTAS) ---
const PainAlert = () => (
  <motion.div 
    initial={{ opacity: 0, y: 20, x: 20 }}
    animate={{ opacity: 1, y: 0, x: 0 }}
    transition={{ delay: 1, duration: 0.8 }}
    className="absolute -top-6 -right-6 z-20 bg-[#0A0A0A] border border-red-900/30 p-4 rounded-2xl shadow-2xl max-w-55 hidden md:block"
  >
    <div className="flex items-start gap-3">
      <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] font-bold text-red-500 leading-tight mb-1 uppercase tracking-widest">Alerta de Margen</p>
        <p className="text-[10px] text-[#888] leading-relaxed font-medium">
          Si la tasa sube y no tienes tiempo de cambiar tus precios manuales, <span className="text-gray-300 font-bold">pierdes dinero en cada venta</span>.
        </p>
      </div>
    </div>
  </motion.div>
)

// --- DEMO INTERACTIVO: EL CORAZÓN DE LA LANDING ---
const InteractiveDemo = () => {
    const [method, setMethod] = useState('pago_movil')
    const rate = 60.25
    const price = 45.00
    const penalty = 2.00 
    const finalUSD = method === 'pago_movil' ? price : (price - penalty)
    const finalBs = finalUSD * rate

    return (
        <div className="relative group w-full max-w-85 mx-auto animate-float z-10">
             <PainAlert />
            
            <div className="absolute -inset-1 bg-linear-to-b from-green-500/10 to-transparent rounded-4xl blur-2xl opacity-50"></div>
            
            <div className="relative bg-[#050505] rounded-3xl border border-[#1A1A1A] shadow-2xl overflow-hidden p-6 transition-colors duration-300">
                <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-[#333] to-transparent"></div>

                <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#1A1A1A]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#0A0A0A] border border-[#222] rounded-lg flex items-center justify-center text-gray-500">
                            <span className="font-bold text-white text-xs">P.</span>
                        </div>
                        <div>
                            <p className="text-[9px] font-semibold text-[#666] uppercase tracking-wider mb-0.5">Vista del Cliente</p>
                            <p className="text-xs font-semibold text-white">Tu Tienda Online</p>
                        </div>
                    </div>
                    <div className="bg-[#0A0A0A] border border-[#222] text-green-500 px-2 py-1 rounded-md text-[9px] font-mono font-bold flex items-center gap-1.5">
                        <Activity size={10} className="animate-pulse"/> BCV {rate}
                    </div>
                </div>

                <div className="flex items-center gap-4 mb-6 p-2 -mx-2 rounded-xl bg-[#0A0A0A]/50 border border-transparent hover:border-[#1A1A1A] transition-colors">
                    <div className="w-10 h-10 bg-[#111] rounded-lg border border-[#222] flex items-center justify-center text-xl shadow-sm">👟</div>
                    <div>
                        <p className="text-xs font-semibold text-white">Nike Air Force 1</p>
                        <p className="text-[10px] text-[#666] font-medium">Blanco • Talla 42</p>
                    </div>
                    <div className="ml-auto font-semibold text-xs text-white">${price}</div>
                </div>

                <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-1 rounded-lg grid grid-cols-2 gap-1 mb-6">
                    <button 
                        onClick={() => setMethod('pago_movil')}
                        className={`py-2 px-2 rounded-md text-[10px] font-semibold transition-all ${method === 'pago_movil' ? 'bg-[#1A1A1A] text-white shadow-sm border border-[#333]' : 'text-[#666] hover:text-[#888]'}`}
                    >
                        Pago Móvil
                    </button>
                    <button 
                        onClick={() => setMethod('zelle')}
                        className={`py-2 px-2 rounded-md text-[10px] font-semibold transition-all ${method === 'zelle' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'text-[#666] hover:text-[#888]'}`}
                    >
                        Divisas (-${penalty})
                    </button>
                </div>

                <div className="bg-[#0A0A0A] rounded-xl p-5 relative overflow-hidden border border-[#1A1A1A]">
                    <div className="flex justify-between items-end relative z-10">
                        <div>
                             <p className="text-[9px] text-[#666] font-medium mb-1 uppercase tracking-widest">A pagar</p>
                             <motion.p 
                                key={finalUSD}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-3xl font-semibold text-white tracking-tighter"
                             >
                                ${finalUSD.toFixed(2)}
                             </motion.p>
                        </div>
                        <div className="text-right">
                             {method === 'pago_movil' ? (
                                <>
                                    <p className="text-[9px] text-[#666] font-medium mb-1 uppercase tracking-widest">En Bolívares</p>
                                    <p className="text-xs font-mono text-green-400 font-medium border-b border-[#333] pb-0.5 inline-block">
                                        Bs {finalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                                    </p>
                                </>
                             ) : (
                                <span className="bg-[#111] border border-[#222] text-[#888] px-2 py-1 rounded text-[9px] font-medium">
                                    Monto Exacto
                                </span>
                             )}
                        </div>
                    </div>
                </div>
                
                <p className="text-center text-[9px] text-[#555] mt-4 font-medium">
                    Así de fácil compran en tu tienda. Sin preguntar precios.
                </p>
            </div>
        </div>
    )
}

// --- LANDING PRINCIPAL ---

export default function LandingClient() {
    const [menuOpen, setMenuOpen] = useState(false)

    const scrollToForm = () => {
        const formElement = document.getElementById('formulario-registro') 
        if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }

    return (
        <div className="min-h-screen bg-black font-sans text-gray-300 selection:bg-[#222] selection:text-white overflow-x-hidden">
            <style>{globalStyles}</style>
            
            {/* FONDO DOT MATRIX */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-dot-matrix opacity-60"></div>
            {/* Brillo suave de fondo */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-200 h-125 bg-green-500/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

            <div className="relative z-10">
                <BcvTicker />

                {/* NAVBAR */}
                <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-[#1A1A1A]">
                    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative z-50">
                        
                        <div className="flex items-center gap-2 cursor-pointer">
                            <img 
                                src="/pezisologow.png" 
                                alt="Preziso Logo" 
                                className="h-10 w-auto object-contain block" 
                            />
                        </div>
                                    
                        <div className="hidden md:flex items-center gap-8">
                            <a href="#solucion" className="text-[12px] font-medium text-[#888] hover:text-white transition-colors">La Solución</a>
                            <a href="#beneficios" className="text-[12px] font-medium text-[#888] hover:text-white transition-colors">Beneficios</a>
                            <a href="#faq" className="text-[12px] font-medium text-[#888] hover:text-white transition-colors">Preguntas</a>
                        </div>

                        <div className="flex items-center gap-4">
                           
                            <button onClick={scrollToForm} className="bg-white text-black px-4 py-2 rounded-lg text-[11px] font-bold hover:bg-gray-200 transition-all flex items-center gap-2">
                                Solicitar Acceso
                            </button>
                            <button className="md:hidden text-white" onClick={() => setMenuOpen(!menuOpen)}>
                                {menuOpen ? <X size={20}/> : <Menu size={20}/>}
                            </button>
                        </div>
                    </div>

                    {/* MENÚ MÓVIL ANIMADO */}
                    <AnimatePresence>
                        {menuOpen && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} 
                                className="absolute top-16 left-0 w-full bg-[#050505]/95 backdrop-blur-xl border-b border-[#1A1A1A] md:hidden overflow-hidden"
                            >
                                <div className="flex flex-col px-6 py-8 gap-6">
                                    <a 
                                        href="#solucion" 
                                        onClick={() => setMenuOpen(false)} 
                                        className="text-base font-medium text-[#888] hover:text-white transition-colors"
                                    >
                                        La Solución
                                    </a>
                                    <a 
                                        href="#beneficios" 
                                        onClick={() => setMenuOpen(false)} 
                                        className="text-base font-medium text-[#888] hover:text-white transition-colors"
                                    >
                                        Beneficios
                                    </a>
                                    <a 
                                        href="#faq" 
                                        onClick={() => setMenuOpen(false)} 
                                        className="text-base font-medium text-[#888] hover:text-white transition-colors"
                                    >
                                        Preguntas
                                    </a>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </nav>

                {/* HERO SECTION */}
                <section className="pt-16 pb-24 lg:pt-24 lg:pb-32 relative overflow-hidden min-h-[calc(100vh-100px)] flex items-center">
                    <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full">
                        <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left relative z-10">
                            
                            <motion.div id="formulario-registro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <LiveCounter />
                            </motion.div>

                            <motion.h1 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-5xl md:text-6xl lg:text-[5rem] font-semibold tracking-tighter mb-6 leading-[1.05] text-white"
                            >
                                Vende en dólares.<br/>
                                <span className="text-[#888]">Cobra en bolívares.</span><br/>
                                Cero estrés.
                            </motion.h1>
                            
                            <motion.p 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-base md:text-lg text-[#888] mb-8 leading-relaxed font-medium max-w-xl"
                            >
                                Preziso conecta tu catálogo al Banco Central de Venezuela. Tus clientes compran sin preguntar, tú recibes el pedido exacto en WhatsApp. <strong className="text-gray-300 font-medium">Adiós a la calculadora.</strong>
                            </motion.p>
                            
                            <motion.div
                                 initial={{ opacity: 0, y: 20 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 transition={{ delay: 0.3 }}
                                 className="w-full flex justify-center lg:justify-start"
                            >
                                <WaitlistForm />
                            </motion.div>
                        </div>

                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4, duration: 0.6 }}
                            className="lg:col-span-5 relative flex justify-center lg:justify-end mt-8 lg:mt-0 w-full"
                        >
                            <InteractiveDemo />
                        </motion.div>
                    </div>
                </section>

                {/* EL PROBLEMA VS LA SOLUCIÓN */}
                <section id="solucion" className="py-24 border-t border-[#1A1A1A] relative">
                    <div className="max-w-7xl mx-auto px-6">
                        <motion.div 
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-50px" }}
                            variants={fadeUpVariant}
                            className="mb-16 text-center lg:text-left"
                        >
                            <h2 className="text-3xl font-semibold tracking-tight text-white mb-4">¿Por qué necesitas Preziso hoy?</h2>
                            <p className="text-[#888] text-base max-w-2xl">Vender en Venezuela tiene reglas únicas. Las herramientas tradicionales no entienden nuestro mercado. Nosotros sí.</p>
                        </motion.div>

                        <motion.div 
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-50px" }}
                            variants={staggerContainer}
                            className="grid md:grid-cols-3 gap-6"
                        >
                            {/* Card 1 */}
                            <motion.div variants={fadeUpVariant} className="webild-card rounded-2xl p-8">
                                <div className="w-10 h-10 rounded-lg bg-[#111] border border-[#222] flex items-center justify-center mb-6 text-white">
                                    <RefreshCw size={18} />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-3">Tasa BCV Automática</h3>
                                <p className="text-sm text-[#888] leading-relaxed">
                                    Tu inventario se guarda en dólares, pero el cliente siempre ve el precio exacto en bolívares actualizado en tiempo real. Proteges tu ganancia automáticamente.
                                </p>
                            </motion.div>

                            {/* Card 2 */}
                            <motion.div variants={fadeUpVariant} className="webild-card rounded-2xl p-8">
                                <div className="w-10 h-10 rounded-lg bg-[#111] border border-[#222] flex items-center justify-center mb-6 text-white">
                                    <Smartphone size={18} />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-3">Pedidos Limpios por WhatsApp</h3>
                                <p className="text-sm text-[#888] leading-relaxed">
                                    Se acabaron los chats de horas respondiendo "precio y disponibilidad". El cliente arma su carrito web y te envía el pedido listo para despachar.
                                </p>
                            </motion.div>

                            {/* Card 3 */}
                            <motion.div variants={fadeUpVariant} className="webild-card rounded-2xl p-8">
                                <div className="w-10 h-10 rounded-lg bg-[#111] border border-[#222] flex items-center justify-center mb-6 text-white">
                                    <Layers size={18} />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-3">Control de Variantes</h3>
                                <p className="text-sm text-[#888] leading-relaxed">
                                    ¿Vendes zapatos o ropa? Gestiona fácilmente tallas, colores y fotos específicas. Si se acaba la talla 42 en negro, desaparece de la web al instante.
                                </p>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                {/* SOCIAL PROOF / TESTIMONIOS */}
                <section id="beneficios" className="py-24 border-t border-[#1A1A1A] relative bg-[#020202]">
                    <div className="max-w-7xl mx-auto px-6">
                        <motion.div 
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-50px" }}
                            variants={fadeUpVariant}
                            className="mb-16 text-center"
                        >
                            <h2 className="text-3xl font-semibold tracking-tight text-white mb-4">Diseñado para el comerciante venezolano</h2>
                            <p className="text-[#888] text-base">La plataforma que convierte tu Instagram en un negocio ordenado.</p>
                        </motion.div>

                        <motion.div 
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-50px" }}
                            variants={staggerContainer}
                            className="grid md:grid-cols-2 gap-6"
                        >
                            <motion.div variants={fadeUpVariant} className="webild-card rounded-4xl p-10 flex flex-col justify-between">
                                <div>
                                    <div className="flex text-[#444] mb-6"><Zap size={20} fill="currentColor"/></div>
                                    <p className="text-lg text-gray-300 font-medium leading-relaxed mb-8">
                                        "Antes de Preziso, pasaba 2 horas cada mañana calculando precios y cambiando historias de Instagram. Ahora me levanto y mi tienda ya está vendiendo con la tasa correcta."
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 border-t border-[#1A1A1A] pt-6">
                                    <div className="w-10 h-10 rounded-full bg-[#111] flex items-center justify-center text-sm font-medium text-[#888]">C</div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Carlos Domínguez</p>
                                        <p className="text-[11px] text-[#666] tracking-widest uppercase">Dueño de Tech Store</p>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div variants={fadeUpVariant} className="webild-card rounded-4xl p-10 flex flex-col justify-between">
                                <div>
                                    <div className="flex text-[#444] mb-6"><Zap size={20} fill="currentColor"/></div>
                                    <p className="text-lg text-gray-300 font-medium leading-relaxed mb-8">
                                        "El hecho de que el cliente vea exactamente cuánto debe pagar en Pago Móvil o Zelle ha reducido mis tiempos de atención a la mitad. Cierro ventas mucho más rápido."
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 border-t border-[#1A1A1A] pt-6">
                                    <div className="w-10 h-10 rounded-full bg-[#111] flex items-center justify-center text-sm font-medium text-[#888]">A</div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Andrea Martínez</p>
                                        <p className="text-[11px] text-[#666] tracking-widest uppercase">Boutique de Moda</p>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                {/* FAQ */}
                <section id="faq" className="py-24 border-t border-[#1A1A1A] relative">
                    <div className="max-w-3xl mx-auto px-6">
                        <motion.h2 
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-50px" }}
                            variants={fadeUpVariant}
                            className="text-2xl font-semibold tracking-tight text-center mb-12 text-white"
                        >
                            Preguntas Frecuentes
                        </motion.h2>
                        <motion.div 
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-50px" }}
                            variants={staggerContainer}
                            className="space-y-4"
                        >
                            {[
                                { q: "¿Necesito tarjeta de crédito en dólares?", a: "No. Sabemos cómo funcionan las cosas aquí. Podrás pagar tu suscripción mensual en Bolívares (Pago Móvil) o USDT (Binance)." },
                                { q: "¿El dinero de mis ventas pasa por Preziso?", a: "Nunca. Nosotros solo organizamos tu catálogo y calculamos los totales. El cliente te paga directamente a tus cuentas bancarias o Zelle." },
                                { q: "¿Cuándo podré usar la plataforma?", a: "Estamos dando acceso por lotes a los inscritos en la lista de espera para garantizar que la conexión con el BCV sea perfecta. Si te anotas hoy, asegurarás prioridad y precio de lanzamiento." }
                            ].map((faq, i) => (
                                <motion.div variants={fadeUpVariant} key={i} className="bg-[#050505] rounded-2xl border border-[#1A1A1A] overflow-hidden">
                                    <div className="p-6 text-left">
                                        <h4 className="font-medium text-sm text-white mb-2">{faq.q}</h4>
                                        <p className="text-[#888] text-sm leading-relaxed">{faq.a}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* CTA FINAL */}
                <section className="py-32 border-t border-[#1A1A1A] relative overflow-hidden bg-black">
                    <motion.div 
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={fadeUpVariant}
                        className="max-w-3xl mx-auto px-6 text-center relative z-10 flex flex-col items-center"
                    >
                        <h2 className="text-4xl md:text-5xl font-semibold text-white mb-6 tracking-tighter">
                            El momento es ahora.
                        </h2>
                        <p className="text-[#888] text-lg mb-10 max-w-lg">
                            Deja que tu competencia siga usando calculadoras de bolsillo. Profesionaliza tu negocio hoy mismo.
                        </p>
                        
                        <div className="bg-[#0A0A0A] border border-[#222] inline-flex flex-col sm:flex-row items-center gap-6 px-8 py-5 rounded-2xl mb-8 shadow-2xl">
                            <div className="text-center sm:text-left">
                                <p className="text-[10px] text-[#666] uppercase font-semibold tracking-widest mb-1">Precio de Lanzamiento</p>
                                <div className="flex items-baseline justify-center sm:justify-start gap-1">
                                    <span className="text-3xl font-mono font-medium text-white">$10</span>
                                    <span className="text-sm text-[#666]">/mensual</span>
                                </div>
                            </div>
                            <div className="h-px w-full sm:w-px sm:h-10 bg-[#222]"></div>
                            <div className="text-center sm:text-left">
                                <ul className="text-left space-y-1.5">
                                    <li className="flex items-center gap-2 text-xs text-[#888] font-medium"><Check size={12} className="text-green-500"/> Productos ilimitados</li>
                                    <li className="flex items-center gap-2 text-xs text-[#888] font-medium"><Check size={12} className="text-green-500"/> Sin contratos</li>
                                </ul>
                            </div>
                        </div>

                        <div className="w-full flex justify-center">
                            <button onClick={scrollToForm} className="bg-white text-black px-8 py-3 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                                Quiero asegurar mi acceso
                            </button>
                        </div>
                    </motion.div>
                </section>

                {/* FOOTER */}
                <footer className="border-t border-[#1A1A1A] py-12 bg-black">
                    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
                        <div className="flex items-center gap-2 cursor-pointer">
                            <img 
                                src="/pezisologow.png" 
                                alt="Preziso Logo" 
                                className="h-8 w-auto object-contain block opacity-80" 
                            />
                        </div>
                        <p className="text-[11px] text-[#555] font-medium max-w-xs">
                            Construido con tecnología moderna para resolver problemas reales del comercio en Venezuela.
                        </p>
                        <p className="text-[10px] text-[#444] font-mono">
                            &copy; {new Date().getFullYear()} PREZISO INC.
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    )
}