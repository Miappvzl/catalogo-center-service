import Link from 'next/link'
import { ShoppingBag, Zap, DollarSign, MessageCircle, ArrowRight, CheckCircle, ShieldCheck, BarChart3, Globe, Smartphone } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-black selection:text-white">
      
      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter cursor-pointer">
            <div className="bg-black text-white p-1.5 rounded-lg shadow-lg">
                <ShoppingBag size={20} />
            </div>
            <span>Qatalog<span className="text-green-500">.</span></span>
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

      {/* --- HERO SECTION --- */}
      <section className="relative pt-12 pb-20 md:pt-32 md:pb-40 overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150vw] h-[800px] bg-gradient-to-b from-gray-50 via-white to-white rounded-[100%] blur-3xl -z-10 opacity-60"></div>
        
        <div className="max-w-5xl mx-auto px-4 text-center">
            
            {/* Badge de Novedad */}
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 mb-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 hover:border-gray-300 transition-colors cursor-default">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">SaaS Beta</span>
            </div>
            
            {/* Título Principal */}
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight mb-6 md:mb-8 leading-[1.1] md:leading-[1]">
              Tu Tienda que <br className="hidden md:block"/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900">Calcula el Dólar Sola.</span>
            </h1>
            
            {/* Subtítulo */}
            <p className="text-lg md:text-2xl text-gray-500 max-w-3xl mx-auto mb-10 md:mb-12 leading-relaxed font-medium">
              Olvídate de cambiar precios manuales cada mañana. <span className="text-gray-900 font-semibold">Qatalog</span> actualiza tu inventario con la tasa del día y gestiona tus pedidos de WhatsApp en automático.
            </p>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4">
                <Link href="/login" className="w-full sm:w-auto bg-black text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-900 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2">
                   Comenzar Prueba Gratis <ArrowRight size={20} />
                </Link>
                <Link href="#features" className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-50 transition-all hover:border-gray-300">
                   Ver cómo funciona
                </Link>
            </div>
            
            <p className="mt-6 text-xs text-gray-400 font-bold uppercase tracking-wider">
                Sin tarjeta de crédito • 7 Días Gratis • Cancela cuando quieras
            </p>
        </div>
      </section>

      {/* --- PROBLEM / SOLUTION (FEATURES) --- */}
      <section id="features" className="py-20 md:py-32 bg-gray-50 border-y border-gray-200 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
                {/* Feature 1 */}
                <div className="bg-white p-8 md:p-10 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-6 text-green-600 border border-green-100">
                        <Globe size={28} />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 tracking-tight">Tasa BCV Automática</h3>
                    <p className="text-gray-500 leading-relaxed font-medium">
                        Conectado directamente a las tasas oficiales. Tú fijas el precio en Dólares ($) y el sistema calcula los Bolívares al instante. Si el dólar sube, tu tienda se actualiza sola sin que muevas un dedo.
                    </p>
                </div>

                {/* Feature 2 */}
                <div className="bg-white p-8 md:p-10 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600 border border-blue-100">
                        <Zap size={28} />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 tracking-tight">Descuentos Inteligentes</h3>
                    <p className="text-gray-500 leading-relaxed font-medium">
                        El sistema detecta cómo paga tu cliente. ¿Zelle, Efectivo o Binance? Aplica el descuento automáticamente. ¿Pago Móvil? Mantiene el precio en Bs. Todo calculado al centavo.
                    </p>
                </div>

                {/* Feature 3 */}
                <div className="bg-white p-8 md:p-10 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                    <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 text-purple-600 border border-purple-100">
                        <MessageCircle size={28} />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 tracking-tight">Pedidos a WhatsApp</h3>
                    <p className="text-gray-500 leading-relaxed font-medium">
                        Olvídate de "Precio al DM". El cliente arma su carrito visualmente y te llega un mensaje de WhatsApp perfectamente formateado con el pedido, los totales y los datos del cliente.
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* --- SHOWCASE (VISUAL) --- */}
      <section className="py-24 overflow-hidden">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            
            {/* Texto */}
            <div className="flex-1 space-y-10">
                <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-[1]">
                    Tu negocio,<br/> <span className="text-gray-400">nivel Elite.</span>
                </h2>
                <div className="space-y-6">
                    <div className="flex gap-5 group">
                        <div className="mt-1 w-10 h-10 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <Smartphone size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-xl mb-1">Catálogo Móvil Nativo</h4>
                            <p className="text-gray-500 font-medium">Tus clientes sentirán que navegan en una App de talla mundial. Rápida, limpia y fácil de usar.</p>
                        </div>
                    </div>
                    <div className="flex gap-5 group">
                        <div className="mt-1 w-10 h-10 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-xl mb-1">Links con Presencia</h4>
                            <p className="text-gray-500 font-medium">Al compartir tu tienda, aparece tu Logo, tu Nombre y tu Descripción. Genera confianza antes del clic.</p>
                        </div>
                    </div>
                    <div className="flex gap-5 group">
                        <div className="mt-1 w-10 h-10 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <BarChart3 size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-xl mb-1">Control Total</h4>
                            <p className="text-gray-500 font-medium">Panel de administración para subir productos, cambiar precios y ajustar tasas desde cualquier lugar.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Placeholder Visual */}
            <div className="flex-1 w-full relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-green-400 to-blue-500 rounded-[3rem] transform rotate-6 blur-2xl opacity-20"></div>
                <div className="relative bg-gray-900 rounded-[2.5rem] border border-gray-800 p-4 shadow-2xl aspect-square md:aspect-[4/3] flex items-center justify-center overflow-hidden group">
                    <div className="text-center transform transition-transform group-hover:scale-105 duration-500">
                         <div className="bg-gray-800 p-6 rounded-3xl mb-4 inline-block">
                             <BarChart3 className="text-green-400" size={64} />
                         </div>
                         <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">Panel de Administración</p>
                         <p className="text-gray-600 text-xs mt-2">Vista previa de la interfaz</p>
                    </div>
                </div>
            </div>
         </div>
      </section>

      {/* --- PRICING --- */}
      <section className="py-24 md:py-32 bg-black text-white relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">Precio Simple.<br/>Sin letras pequeñas.</h2>
            <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto">
                Todo lo que necesitas para automatizar tu negocio por menos de lo que cuesta un almuerzo ejecutivo.
            </p>
            
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-14 border border-gray-800 max-w-md mx-auto relative overflow-hidden group hover:border-gray-600 transition-all duration-300 shadow-2xl">
                
                <div className="absolute top-0 right-0 bg-green-500 text-black text-[10px] md:text-xs font-black uppercase px-4 py-2 rounded-bl-2xl">
                    Oferta de Lanzamiento
                </div>

                <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-6xl md:text-7xl font-black tracking-tighter">$10</span>
                    <span className="text-xl text-gray-500 font-medium">/mes</span>
                </div>
                <p className="text-gray-400 mb-10 text-sm font-medium">Suscripción mensual cancelable.</p>

                <ul className="space-y-5 text-left mb-10 pl-4">
                    <li className="flex items-center gap-4 text-gray-200 font-medium">
                        <div className="bg-green-500/20 p-1 rounded-full"><CheckCircle className="text-green-500" size={16} /></div> 
                        Productos Ilimitados
                    </li>
                    <li className="flex items-center gap-4 text-gray-200 font-medium">
                        <div className="bg-green-500/20 p-1 rounded-full"><CheckCircle className="text-green-500" size={16} /></div> 
                        Automatización de Tasa 24/7
                    </li>
                    <li className="flex items-center gap-4 text-gray-200 font-medium">
                        <div className="bg-green-500/20 p-1 rounded-full"><CheckCircle className="text-green-500" size={16} /></div> 
                        Soporte Técnico Prioritario
                    </li>
                    <li className="flex items-center gap-4 text-gray-200 font-medium">
                        <div className="bg-green-500/20 p-1 rounded-full"><CheckCircle className="text-green-500" size={16} /></div> 
                        0% Comisiones por venta
                    </li>
                </ul>

                <Link href="/login" className="block w-full bg-white text-black py-4 rounded-2xl font-black text-lg hover:bg-gray-200 hover:scale-[1.02] transition-all shadow-lg shadow-white/10">
                    Empezar 7 Días Gratis
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
                Qatalog.
             </div>
             
             <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm font-medium text-gray-600">
                <Link href="/login" className="hover:text-black">Iniciar Sesión</Link>
                <Link href="/login" className="hover:text-black">Crear Cuenta</Link>
                <a href="#" className="hover:text-black">Soporte</a>
             </div>

             <div className="h-px w-12 bg-gray-300 mb-8"></div>

             <p className="text-gray-400 text-xs font-medium">
                © {new Date().getFullYear()} <span className="text-gray-900 font-bold">Quanzosai Inc.</span> Todos los derechos reservados.
                <br/>Hecho con pasión en Venezuela.
             </p>
         </div>
      </footer>
    </div>
  )
}