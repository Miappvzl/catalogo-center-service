import Link from 'next/link'
import { 
  ShoppingBag, 
  Zap, 
  MessageCircle, 
  ArrowRight, 
  CheckCircle, 
  ShieldCheck, 
  BarChart3, 
  Globe, 
  Smartphone,
  Calculator,
  Clock
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-green-100 selection:text-green-900">
      
      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter cursor-pointer">
            <div className="bg-black text-white p-1.5 rounded-lg shadow-lg">
                <ShoppingBag size={20} />
            </div>
            <span>Preziso<span className="text-green-600">.</span></span>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
            <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-black transition-colors hidden sm:block">
              Iniciar Sesión
            </Link>
            <Link href="/login" className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-gray-800 transition-all shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 flex items-center gap-2">
              Prueba Gratis <ArrowRight size={14} className="hidden md:block"/>
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION (LA PROMESA) --- */}
      <section className="relative pt-16 pb-20 md:pt-32 md:pb-40 overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150vw] h-[800px] bg-gradient-to-b from-green-50/50 via-white to-white rounded-[100%] blur-3xl -z-10 opacity-60"></div>
        
        <div className="max-w-5xl mx-auto px-4 text-center">
            
            {/* Badge de Autoridad */}
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 mb-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 hover:border-green-200 transition-colors cursor-default">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Blindaje contra el cambio diario</span>
            </div>
            
            {/* Título Principal SEO + Persuasión */}
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight mb-6 md:mb-8 leading-[1.1] md:leading-[1]">
              Deja de ser esclavo <br className="hidden md:block"/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900">de la Tasa del Día.</span>
            </h1>
            
            {/* Subtítulo (El Gancho) */}
            <p className="text-lg md:text-2xl text-gray-500 max-w-3xl mx-auto mb-10 md:mb-12 leading-relaxed font-medium">
              <span className="text-gray-900 font-bold">Preziso</span> actualiza tus precios en Bolívares automáticamente mientras duermes. 
              Vende en dólares, cobra exacto y olvídate de la calculadora.
            </p>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4">
                <Link href="/login" className="w-full sm:w-auto bg-black text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-900 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2">
                   Empezar Prueba Gratis <ArrowRight size={20} />
                </Link>
                <Link href="#features" className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-50 transition-all hover:border-gray-300">
                   Ver Demo en Video
                </Link>
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-gray-400 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1"><CheckCircle size={12}/> Sin Tarjeta de Crédito</span>
                <span className="flex items-center gap-1"><CheckCircle size={12}/> 7 Días Gratis</span>
            </div>
        </div>
      </section>

      {/* --- LOS 4 PILARES (DOLOR vs SOLUCIÓN) --- */}
      <section id="features" className="py-20 md:py-32 bg-gray-50 border-y border-gray-200 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">Tu negocio, blindado.</h2>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">Resolvemos los 3 problemas que te hacen perder dinero todos los días en Venezuela.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
                {/* Pilar 1: Automatización */}
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group">
                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-6 text-green-600 border border-green-100 group-hover:scale-110 transition-transform">
                        <RefreshCw size={28} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 tracking-tight">Tasa Automática 24/7</h3>
                    <p className="text-sm font-bold text-red-500 mb-3 flex items-center gap-1"><Clock size={14}/> El Dolor: "Cambiar precios cada mañana"</p>
                    <p className="text-gray-500 leading-relaxed font-medium">
                        Tú fijas el precio en Dólares ($). Nosotros nos conectamos al BCV y actualizamos los Bolívares al instante. Tu inventario siempre está al precio correcto.
                    </p>
                </div>

                {/* Pilar 2: Lógica Multimoneda */}
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600 border border-blue-100 group-hover:scale-110 transition-transform">
                        <Calculator size={28} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 tracking-tight">Precios Inteligentes</h3>
                    <p className="text-sm font-bold text-red-500 mb-3 flex items-center gap-1"><Zap size={14}/> El Dolor: "¿Cuánto es en Zelle?"</p>
                    <p className="text-gray-500 leading-relaxed font-medium">
                        El sistema detecta el pago: ¿Zelle o Efectivo? Aplica descuento en divisa. ¿Pago Móvil? Mantiene el precio en Bs. Claridad total para tu cliente.
                    </p>
                </div>

                {/* Pilar 3: Cierre WhatsApp */}
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group">
                    <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 text-purple-600 border border-purple-100 group-hover:scale-110 transition-transform">
                        <MessageCircle size={28} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 tracking-tight">Pedidos sin Fricción</h3>
                    <p className="text-sm font-bold text-red-500 mb-3 flex items-center gap-1"><Smartphone size={14}/> El Dolor: "Chats eternos de preguntas"</p>
                    <p className="text-gray-500 leading-relaxed font-medium">
                        Tu cliente arma el carrito visualmente y te envía un WhatsApp con todo calculado. Conviertes una charla de 15 minutos en una venta de 1 minuto.
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* --- SHOWCASE (Marketing Profesional) --- */}
      <section className="py-24 overflow-hidden bg-white">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            
            {/* Texto */}
            <div className="flex-1 space-y-10">
                <div className="inline-block bg-black text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Nivel Elite</div>
                <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-[1]">
                    Vende como una<br/> <span className="text-gray-400">Multinacional.</span>
                </h2>
                <p className="text-lg text-gray-500 font-medium">
                    Deja de enviar fotos sueltas por WhatsApp. Comparte enlaces profesionales que generan confianza.
                </p>

                <div className="space-y-6">
                    <div className="flex gap-5 group">
                        <div className="mt-1 w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 text-gray-900 flex items-center justify-center flex-shrink-0 group-hover:bg-black group-hover:text-white transition-colors">
                            <Globe size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-xl mb-1">Tu Propia Web (Sin Programar)</h4>
                            <p className="text-gray-500 font-medium text-sm">Obtén tu dirección <code>preziso.app/tu-tienda</code> al instante. Optimizada para cargar rápido en datos móviles.</p>
                        </div>
                    </div>
                    <div className="flex gap-5 group">
                        <div className="mt-1 w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 text-gray-900 flex items-center justify-center flex-shrink-0 group-hover:bg-black group-hover:text-white transition-colors">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-xl mb-1">Links que Generan Confianza</h4>
                            <p className="text-gray-500 font-medium text-sm">Al compartir un producto, aparece tu logo, precio y foto. Te ves profesional antes de que el cliente haga clic.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Visual Abstracto */}
            <div className="flex-1 w-full relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-green-200 to-gray-200 rounded-[3rem] transform rotate-6 blur-2xl opacity-40"></div>
                <div className="relative bg-gray-900 rounded-[2.5rem] border border-gray-800 p-8 shadow-2xl aspect-square flex flex-col items-center justify-center overflow-hidden text-center text-white">
                     <BarChart3 className="text-green-500 mb-6 w-20 h-20" />
                     <h3 className="text-2xl font-bold mb-2">Panel de Control</h3>
                     <p className="text-gray-400 text-sm max-w-xs">Gestiona productos, tasas y visualiza métricas desde tu celular.</p>
                </div>
            </div>
         </div>
      </section>

      {/* --- PRICING (LA OFERTA IRRESISTIBLE) --- */}
      <section className="py-24 md:py-32 bg-black text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">Precio Simple.<br/>Sin letras pequeñas.</h2>
            <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto">
                Automatiza tu negocio por menos de lo que cuesta un almuerzo ejecutivo en Caracas.
            </p>
            
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-14 border border-gray-800 max-w-md mx-auto relative overflow-hidden group hover:border-green-500/30 transition-all duration-300 shadow-2xl">
                
                <div className="absolute top-0 right-0 bg-green-500 text-black text-[10px] md:text-xs font-black uppercase px-4 py-2 rounded-bl-2xl">
                    Oferta de Lanzamiento
                </div>

                <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-6xl md:text-7xl font-black tracking-tighter">$10</span>
                    <span className="text-xl text-gray-500 font-medium">/mes</span>
                </div>
                <p className="text-gray-400 mb-10 text-sm font-medium">Cancela cuando quieras. Sin contratos.</p>

                <ul className="space-y-5 text-left mb-10 pl-4">
                    <li className="flex items-center gap-4 text-gray-200 font-medium">
                        <CheckCircle className="text-green-500 shrink-0" size={20} />
                        Productos Ilimitados
                    </li>
                    <li className="flex items-center gap-4 text-gray-200 font-medium">
                        <CheckCircle className="text-green-500 shrink-0" size={20} />
                        <span>Tasa Automática <span className="text-green-500 font-bold">BCV 24/7</span></span>
                    </li>
                    <li className="flex items-center gap-4 text-gray-200 font-medium">
                        <CheckCircle className="text-green-500 shrink-0" size={20} />
                        Dominio Propio (preziso.app/tu-tienda)
                    </li>
                    <li className="flex items-center gap-4 text-gray-200 font-medium">
                        <CheckCircle className="text-green-500 shrink-0" size={20} />
                        0% Comisiones por venta
                    </li>
                </ul>

                <Link href="/login" className="block w-full bg-white text-black py-4 rounded-2xl font-black text-lg hover:bg-gray-200 hover:scale-[1.02] transition-all shadow-lg shadow-white/10">
                    Comenzar Gratis (7 Días)
                </Link>
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
                    <ShieldCheck size={14} /> Pago seguro vía Pago Móvil o Binance
                </div>
            </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 border-t border-gray-100 bg-gray-50">
         <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center text-center">
             <div className="flex items-center gap-2 font-bold text-xl mb-6">
                <div className="bg-black text-white p-1 rounded">
                    <ShoppingBag size={16} />
                </div>
                Preziso.
             </div>
             
             <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm font-medium text-gray-600">
                <Link href="/login" className="hover:text-black">Iniciar Sesión</Link>
                <Link href="/login" className="hover:text-black">Crear Cuenta</Link>
                <a href="#" className="hover:text-black">Soporte</a>
             </div>

             <div className="h-px w-12 bg-gray-300 mb-8"></div>

             <p className="text-gray-400 text-xs font-medium">
                © {new Date().getFullYear()} <span className="text-gray-900 font-bold">Quanzosai Inc.</span> Todos los derechos reservados.
                <br/>Hecho para Venezuela con tecnología Elite.
             </p>
         </div>
      </footer>
    </div>
  )
}

// Icono simple para el grid (se puede reutilizar)
function RefreshCw({ size, className }: any) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
}