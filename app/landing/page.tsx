'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ShoppingBag, Zap, MessageCircle, ArrowRight, CheckCircle2, 
  ShieldCheck, BarChart3, Globe, Smartphone, RefreshCw, 
  Menu, X, TrendingUp, Layers, AlertTriangle, XCircle, Check
} from 'lucide-react'

// --- ESTILOS DE ANIMACIÓN PERSONALIZADOS (CSS-IN-JS LIGERO) ---
const animStyles = `
  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
  }
  @keyframes ticker {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-float { animation: float 6s ease-in-out infinite; }
  .animate-float-delayed { animation: float 6s ease-in-out 3s infinite; }
  .animate-ticker { animation: ticker 20s linear infinite; }
  .animate-fade-up { animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
  .delay-100 { animation-delay: 0.1s; }
  .delay-200 { animation-delay: 0.2s; }
  .delay-300 { animation-delay: 0.3s; }
  .glass-card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.5); }
`

// --- COMPONENTE: DEMO INTERACTIVO (MEJORADO Y RESPONSIVE) ---
const InteractiveDemo = () => {
    const [method, setMethod] = useState('zelle')
    const rate = 60.25
    const price = 45.00
    const penalty = 2.00 
    const finalUSD = method === 'pago_movil' ? price : (price - penalty)
    const finalBs = finalUSD * rate

    return (
        <div className="relative group w-full max-w-[340px] mx-auto perspective-1000 animate-float">
             {/* Glow Trasero */}
            <div className="absolute -inset-0.5 bg-gradient-to-tr from-green-400 to-blue-500 rounded-[2rem] blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
            
            <div className="relative bg-white/90 backdrop-blur-xl rounded-[1.8rem] border border-white/50 shadow-2xl overflow-hidden p-5 md:p-6 transition-transform duration-500 hover:scale-[1.02]">
                {/* Header Mockup */}
                <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
                            <ShoppingBag size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase leading-none">Checkout</p>
                            <p className="text-xs font-black text-gray-900">Elite Mode</p>
                        </div>
                    </div>
                    <div className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">BCV: {rate}</div>
                </div>

                {/* Producto */}
                <div className="flex items-center gap-3 mb-5 bg-gray-50 p-2 rounded-xl border border-gray-100">
                    <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-xl shadow-sm">👟</div>
                    <div>
                        <p className="text-xs font-bold text-gray-900">Nike Air Force 1</p>
                        <p className="text-[10px] text-gray-500">Blanco • Talla 42</p>
                    </div>
                    <div className="ml-auto font-black text-xs text-gray-900">${price}</div>
                </div>

                {/* Botones Interactivos */}
                <div className="space-y-2 mb-6">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Método de Pago</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => setMethod('pago_movil')}
                            className={`p-2 rounded-lg text-[10px] md:text-xs font-bold border transition-all duration-300 ${method === 'pago_movil' ? 'bg-black text-white border-black shadow-lg scale-[1.02]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                        >
                            Pago Móvil (Bs)
                        </button>
                        <button 
                            onClick={() => setMethod('zelle')}
                            className={`p-2 rounded-lg text-[10px] md:text-xs font-bold border transition-all duration-300 ${method === 'zelle' ? 'bg-green-600 text-white border-green-600 shadow-lg scale-[1.02]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                        >
                            Zelle (-${penalty})
                        </button>
                    </div>
                </div>

                {/* Tarjeta Negra Total */}
                <div className="bg-[#0A0A0A] rounded-2xl p-4 text-white text-center relative overflow-hidden transition-all duration-300 shadow-inner">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-xl -mr-10 -mt-10"></div>
                    
                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Total a Pagar</p>
                    <p className="text-3xl font-black tracking-tight mb-1 transition-all" key={finalUSD}>
                        ${finalUSD.toFixed(2)}
                    </p>
                    
                    <div className="h-6 flex items-center justify-center">
                        {method === 'pago_movil' ? (
                            <div className="bg-white/10 rounded-md px-2 py-0.5 animate-fade-up">
                                <p className="text-[10px] font-mono text-green-400 font-bold">
                                    Ref: Bs {finalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        ) : (
                            <p className="text-[9px] text-green-400 font-bold animate-fade-up flex items-center gap-1">
                                <CheckCircle2 size={10}/> Descuento aplicado
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- TICKER COMPONENT ---
const BcvTicker = () => (
    <div className="bg-black text-white text-[10px] font-bold py-1.5 overflow-hidden border-b border-gray-800">
        <div className="whitespace-nowrap flex animate-ticker w-max">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-8 mx-4">
                    <span className="flex items-center gap-1 text-green-400">BCV EN VIVO <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span></span>
                    <span className="text-gray-400">TASA AUTOMÁTICA ACTIVADA</span>
                    <span>SINCRONIZACIÓN 24/7</span>
                    <span className="text-gray-400">VENDE EN DÓLARES COBRA EN BS</span>
                </div>
            ))}
        </div>
    </div>
)

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-black selection:text-white overflow-x-hidden">
      <style>{animStyles}</style>

      {/* --- TOP BAR (TICKER) --- */}
      <BcvTicker />

      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 font-black text-lg md:text-xl tracking-tighter cursor-pointer hover:scale-105 transition-transform">
            <div className="bg-black text-white p-1.5 md:p-2 rounded-xl shadow-lg shadow-black/20">
                <Zap size={18} fill="currentColor" />
            </div>
            <span>Preziso.</span>
          </div>
          
          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-xs font-bold text-gray-500 hover:text-black uppercase tracking-wide transition-colors">Características</a>
            <a href="#comparison" className="text-xs font-bold text-gray-500 hover:text-black uppercase tracking-wide transition-colors">Vs</a>
            <a href="#pricing" className="text-xs font-bold text-gray-500 hover:text-black uppercase tracking-wide transition-colors">Precios</a>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/login" className="hidden md:block text-xs font-bold text-gray-900 hover:underline">
              ENTRAR
            </Link>
            <Link href="/login" className="bg-black text-white px-5 py-2.5 md:px-6 md:py-3 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2">
              Prueba Gratis <ArrowRight size={14}/>
            </Link>
            <button className="md:hidden p-2 text-gray-900" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? <X/> : <Menu/>}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
            <div className="md:hidden bg-white border-b border-gray-100 p-6 space-y-6 absolute w-full shadow-2xl animate-fade-up z-40">
                <a href="#features" className="block font-black text-2xl" onClick={() => setMenuOpen(false)}>Características</a>
                <a href="#comparison" className="block font-black text-2xl" onClick={() => setMenuOpen(false)}>Comparativa</a>
                <a href="#pricing" className="block font-black text-2xl" onClick={() => setMenuOpen(false)}>Precios</a>
                <div className="h-px bg-gray-100 w-full"></div>
                <Link href="/login" className="block font-bold text-lg text-green-600">Iniciar Sesión</Link>
            </div>
        )}
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-32 overflow-hidden">
        {/* Blobs de Fondo Animados */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-gray-100 rounded-full blur-[100px] animate-float opacity-70"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-green-50 rounded-full blur-[120px] animate-float-delayed opacity-60"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Texto (7/12) */}
            <div className="lg:col-span-7 text-center lg:text-left relative z-10 flex flex-col items-center lg:items-start">
                
                <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 mb-8 shadow-sm animate-fade-up" style={{ animationDelay: '0ms' }}>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sistema Operativo Venezolano</span>
                </div>

                <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5rem] font-black tracking-tighter mb-6 leading-[0.9] text-gray-900 animate-fade-up delay-100">
                    Vende en Dólares.<br/>
                    <span className="text-gray-300">Cobra en Bs.</span><br/>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500">Automático.</span>
                </h1>
                
                <p className="text-lg md:text-xl text-gray-500 mb-10 leading-relaxed font-medium max-w-xl animate-fade-up delay-200">
                    Preziso conecta tu inventario al BCV. Tus precios en Bolívares se actualizan solos cada mañana. Olvídate de la calculadora y los errores humanos.
                </p>

                <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center gap-4 animate-fade-up delay-300">
                    <Link href="/login" className="w-full sm:w-auto bg-black text-white px-8 py-4 rounded-2xl text-base font-bold hover:bg-gray-900 transition-all shadow-xl shadow-black/10 hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2 group">
                       Crear mi Tienda <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                    </Link>
                    <div className="flex items-center gap-3 text-xs font-bold text-gray-400 px-2">
                        <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-green-500"/> Sin tarjeta</span>
                        <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-green-500"/> 7 días gratis</span>
                    </div>
                </div>
            </div>

            {/* Demo (5/12) */}
            <div className="lg:col-span-5 relative w-full flex justify-center lg:justify-end animate-fade-up delay-300">
                <div className="relative w-full max-w-md">
                    {/* Flecha decorativa */}
                    <div className="absolute -bottom-12 -left-8 hidden xl:block animate-float">
                        <img src="https://uploads-ssl.webflow.com/646f65e37fe0275cfb878408/646f66cdeeb4ddfdae25a26e_Arrow%2001.svg" className="w-24 opacity-20 rotate-12" alt="arrow"/>
                        <p className="font-handwriting text-sm text-gray-400 rotate-[-10deg] translate-x-10 -translate-y-2">¡Pruébalo!</p>
                    </div>
                    
                    <InteractiveDemo />
                </div>
            </div>
        </div>
      </section>

      {/* --- FEATURE GRID (BENTO) --- */}
      <section id="features" className="py-24 bg-gray-50 border-t border-gray-200 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">El fin del caos manual.</h2>
                <p className="text-gray-500 text-lg font-medium">Reemplazamos tu Excel, tu calculadora y tus notas de WhatsApp con un solo sistema.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(180px,auto)]">
                
                {/* Feature 1: BCV (Wide) */}
                <div className="md:col-span-2 bg-white rounded-[2.5rem] p-8 md:p-12 border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                    <div className="absolute -right-10 -top-10 text-gray-50 opacity-50 group-hover:scale-110 transition-transform duration-700">
                        <RefreshCw size={200} />
                    </div>
                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-6 text-green-600 relative z-10">
                        <TrendingUp size={28} />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black mb-3">Sincronización BCV Automática</h3>
                        <p className="text-gray-500 font-medium max-w-md">
                            Si el dólar sube a las 9:00 AM, tus precios en Bs suben a las 9:01 AM. Sin mover un dedo. Mantén tu margen de ganancia protegido contra la devaluación.
                        </p>
                    </div>
                </div>

                {/* Feature 2: CRM (Tall/Dark) */}
                <div className="md:row-span-2 bg-[#0A0A0A] text-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden flex flex-col justify-between group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/20 blur-[80px] rounded-full pointer-events-none group-hover:bg-green-500/30 transition-all duration-700"></div>
                    <div>
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 text-white backdrop-blur-md border border-white/5">
                            <Layers size={28} />
                        </div>
                        <h3 className="text-2xl font-black mb-3">CRM de Pedidos</h3>
                        <p className="text-gray-400 font-medium leading-relaxed mb-6 text-sm">
                            Gestiona tus pedidos en un tablero profesional. De "Pendiente" a "Pagado" con un clic.
                        </p>
                    </div>
                    {/* Mini CRM UI */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-[10px] font-mono space-y-3 backdrop-blur-sm transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-gray-400">#001 • Angel</span>
                            <span className="text-yellow-400 bg-yellow-400/10 px-1.5 rounded">Pendiente</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-gray-400">#002 • Maria</span>
                            <span className="text-green-400 bg-green-400/10 px-1.5 rounded">Pagado</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">#003 • Carlos</span>
                            <span className="text-blue-400 bg-blue-400/10 px-1.5 rounded">Enviado</span>
                        </div>
                    </div>
                </div>

                {/* Feature 3: Web */}
                <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600 group-hover:rotate-6 transition-transform">
                        <Globe size={28} />
                    </div>
                    <h3 className="text-xl font-black mb-2">Tu Web Propia</h3>
                    <p className="text-gray-500 font-medium text-sm">
                        Tu tienda en <code>preziso.app/tu-marca</code>. Optimizada para cargar rápido en datos móviles 4G.
                    </p>
                </div>

                {/* Feature 4: WhatsApp */}
                <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                    <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 text-purple-600 group-hover:scale-110 transition-transform">
                        <MessageCircle size={28} />
                    </div>
                    <h3 className="text-xl font-black mb-2">Pedidos a WhatsApp</h3>
                    <p className="text-gray-500 font-medium text-sm">
                        El cliente arma el carrito y te llega un mensaje listo con el total calculado. Cero fricción.
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* --- NUEVA SECCIÓN: CAOS VS CONTROL (LA COMPARATIVA) --- */}
      <section id="comparison" className="py-24 bg-white relative">
         <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
                 <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">La Verdad Incómoda</span>
                 <h2 className="text-3xl md:text-5xl font-black tracking-tight">¿Sigues viviendo en el pasado?</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                
                {/* Lado Izquierdo: CAOS (El pasado) */}
                <div className="bg-red-50/50 rounded-[2.5rem] p-8 md:p-12 border border-red-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 grayscale group-hover:opacity-10 transition-opacity">
                         <AlertTriangle size={150} />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500"><XCircle size={18}/></span>
                        La Forma Antigua
                    </h3>
                    <ul className="space-y-4">
                        <li className="flex gap-4 opacity-60">
                            <X className="text-red-400 shrink-0 mt-1" size={20}/>
                            <span className="font-medium line-through decoration-red-300">Calcular tasa BCV manualmente cada mañana.</span>
                        </li>
                        <li className="flex gap-4 opacity-60">
                            <X className="text-red-400 shrink-0 mt-1" size={20}/>
                            <span className="font-medium line-through decoration-red-300">Enviar fotos sueltas y precios por chat.</span>
                        </li>
                        <li className="flex gap-4 opacity-60">
                            <X className="text-red-400 shrink-0 mt-1" size={20}/>
                            <span className="font-medium line-through decoration-red-300">Perder dinero por cobrar mal en Bs.</span>
                        </li>
                        <li className="flex gap-4 opacity-60">
                            <X className="text-red-400 shrink-0 mt-1" size={20}/>
                            <span className="font-medium line-through decoration-red-300">Excel desordenado o cuaderno de notas.</span>
                        </li>
                    </ul>
                </div>

                {/* Lado Derecho: CONTROL (Preziso) */}
                <div className="bg-gray-900 text-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden transform md:-translate-y-4 border border-gray-800">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/20 blur-[80px] rounded-full pointer-events-none"></div>
                    <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-green-500 text-black flex items-center justify-center"><Check size={18} strokeWidth={3}/></span>
                        La Forma Prezisa
                    </h3>
                    <ul className="space-y-5 relative z-10">
                        <li className="flex gap-4 items-center">
                            <CheckCircle2 className="text-green-500 shrink-0" size={20}/>
                            <span className="font-bold text-lg">Tasa BCV Automática 24/7.</span>
                        </li>
                        <li className="flex gap-4 items-center">
                            <CheckCircle2 className="text-green-500 shrink-0" size={20}/>
                            <span className="font-bold text-lg">Catálogo Profesional Online.</span>
                        </li>
                        <li className="flex gap-4 items-center">
                            <CheckCircle2 className="text-green-500 shrink-0" size={20}/>
                            <span className="font-bold text-lg">Cálculo exacto (Bs vs $).</span>
                        </li>
                        <li className="flex gap-4 items-center">
                            <CheckCircle2 className="text-green-500 shrink-0" size={20}/>
                            <span className="font-bold text-lg">CRM de Ventas Centralizado.</span>
                        </li>
                    </ul>
                    <div className="mt-8 pt-8 border-t border-white/10">
                         <p className="text-sm text-gray-400 italic">"Es como tener un contador y un gerente de ventas en tu bolsillo."</p>
                    </div>
                </div>

            </div>
         </div>
      </section>

      {/* --- PRICING --- */}
      <section id="pricing" className="py-24 md:py-32 bg-gray-50 border-t border-gray-200 overflow-hidden relative">
         <div className="max-w-5xl mx-auto px-4 md:px-6 relative z-10 text-center">
            
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.9] mb-6">
                Inversión mínima.<br/>
                <span className="text-gray-400">Paz mental máxima.</span>
            </h2>
            <p className="text-lg text-gray-500 font-medium mb-12 max-w-xl mx-auto">
                Sin comisiones por venta. Sin costos ocultos. Solo una suscripción plana que se paga sola con tu primera venta organizada.
            </p>

            <div className="bg-white rounded-[3rem] p-2 md:p-3 shadow-2xl max-w-lg mx-auto transform hover:scale-[1.01] transition-transform duration-500 border border-gray-100">
                <div className="bg-black text-white rounded-[2.5rem] px-8 py-12 md:px-12 md:py-16 relative overflow-hidden">
                     {/* Efectos de fondo */}
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 blur-[80px] rounded-full pointer-events-none"></div>
                    
                    <div className="relative z-10">
                        <span className="bg-green-500 text-black px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wide mb-8 inline-block shadow-lg shadow-green-500/50">
                            Oferta de Lanzamiento
                        </span>
                        
                        <div className="flex items-baseline justify-center gap-1 mb-2">
                            <span className="text-7xl md:text-8xl font-black tracking-tighter">$10</span>
                            <span className="text-xl text-gray-500 font-medium">/mes</span>
                        </div>
                        <p className="text-gray-400 text-sm mb-10 font-medium pb-8 border-b border-gray-800">Cancela cuando quieras. 100% libre de riesgo.</p>

                        <ul className="space-y-4 mb-12 text-left mx-auto max-w-xs">
                            {[
                                'Productos Ilimitados',
                                'Tasa BCV Automática',
                                'Panel de Control Elite',
                                'Soporte Prioritario',
                                'Tu propio dominio .app'
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm font-bold text-gray-200">
                                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-500"><Check size={12} strokeWidth={4}/></div> 
                                    {item}
                                </li>
                            ))}
                        </ul>

                        <Link href="/login" className="block w-full bg-white text-black py-5 rounded-2xl font-black text-base uppercase tracking-wider hover:bg-gray-200 hover:scale-[1.02] transition-all shadow-xl">
                            Comenzar Prueba de 7 Días
                        </Link>
                        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-wide">
                            <ShieldCheck size={14} /> Garantía de Satisfacción
                        </div>
                    </div>
                </div>
            </div>

         </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 bg-white border-t border-gray-100">
         <div className="max-w-7xl mx-auto px-6 text-center">
             <div className="flex items-center justify-center gap-2 font-black text-xl mb-6 opacity-40 hover:opacity-100 transition-opacity duration-500 cursor-default">
                <Zap size={20} fill="currentColor" />
                <span>Preziso.</span>
             </div>
             
             <div className="flex justify-center gap-8 mb-8 text-xs font-bold text-gray-400 uppercase tracking-widest">
                 <Link href="#" className="hover:text-black transition-colors">Instagram</Link>
                 <Link href="#" className="hover:text-black transition-colors">Twitter</Link>
                 <Link href="#" className="hover:text-black transition-colors">Términos</Link>
             </div>

             <p className="text-gray-300 text-xs font-medium">
                 © {new Date().getFullYear()} Quanzosai Inc. <br className="md:hidden"/>Hecho para Venezuela.
             </p>
         </div>
      </footer>
    </div>
  )
}