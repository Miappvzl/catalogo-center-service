import Link from 'next/link'
import { ShoppingBag, Zap, DollarSign, MessageCircle, ArrowRight, CheckCircle, ShieldCheck, BarChart3, RefreshCw } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      
      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
            <div className="bg-black text-white p-1.5 rounded-lg">
                <ShoppingBag size={20} />
            </div>
            Qatalog.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-black hidden md:block">
              Iniciar Sesión
            </Link>
            <Link href="/login" className="bg-black text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              Prueba Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-gray-100 to-white rounded-full blur-3xl -z-10 opacity-60"></div>
        
        <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Nuevo: Actualización Tasa BCV Automática</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.1]">
              Tu Tienda Online que <br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">Calcula el Dólar Sola.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
              Olvídate de cambiar precios manuales o pelear por la tasa. Qatalog crea tu catálogo digital, actualiza los precios en Bs automáticamente y recibe pedidos listos por WhatsApp.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                <Link href="/login" className="w-full md:w-auto bg-black text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-900 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2">
                   Comenzar Prueba Gratis <ArrowRight size={20} />
                </Link>
                <Link href="#demo" className="w-full md:w-auto bg-white border border-gray-200 text-gray-700 px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-50 transition-all">
                   Ver Demo
                </Link>
            </div>
            
            <p className="mt-4 text-xs text-gray-400 font-medium">No requiere tarjeta de crédito • 7 Días de Prueba Gratis</p>
        </div>
      </section>

      {/* --- PROBLEM / SOLUTION --- */}
      <section className="py-20 bg-gray-50 border-y border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
                {/* Feature 1 */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mb-6 text-green-600">
                        <RefreshCw size={24} />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Tasa BCV Automática</h3>
                    <p className="text-gray-500 leading-relaxed">
                        Conectado al Banco Central. Tú pones el precio en $ y el sistema calcula los Bolívares al día. Si la tasa sube, tu tienda se actualiza sola.
                    </p>
                </div>
                {/* Feature 2 */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
                        <Zap size={24} />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Descuentos Inteligentes</h3>
                    <p className="text-gray-500 leading-relaxed">
                        ¿Pagan en Zelle o Efectivo? El sistema detecta el método de pago y aplica el descuento automáticamente en el carrito.
                    </p>
                </div>
                {/* Feature 3 */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 text-purple-600">
                        <MessageCircle size={24} />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Pedidos a WhatsApp</h3>
                    <p className="text-gray-500 leading-relaxed">
                        Nada de carritos complicados. El cliente arma su pedido y te llega un mensaje de WhatsApp limpio con el total calculado.
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* --- SHOWCASE (Muestra visual de la App) --- */}
      <section id="demo" className="py-24">
         <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-8">
                <h2 className="text-3xl md:text-5xl font-black tracking-tight">
                    Tu negocio, <br/> más profesional.
                </h2>
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <CheckCircle className="text-green-500 flex-shrink-0 mt-1" />
                        <div>
                            <h4 className="font-bold text-lg">Catálogo tipo App</h4>
                            <p className="text-gray-500">Tus clientes sentirán que usan una App nativa. Buscador rápido, categorías y fotos grandes.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <CheckCircle className="text-green-500 flex-shrink-0 mt-1" />
                        <div>
                            <h4 className="font-bold text-lg">Links con Presencia</h4>
                            <p className="text-gray-500">Al compartir tu tienda en WhatsApp, aparece tu Logo y el nombre de tu marca. 100% Pro.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <CheckCircle className="text-green-500 flex-shrink-0 mt-1" />
                        <div>
                            <h4 className="font-bold text-lg">Panel de Control Total</h4>
                            <p className="text-gray-500">Sube productos, cambia precios y gestiona tu tasa desde tu celular o computadora.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* MOCKUP VISUAL (Aquí iría una captura real de tu SaaS) */}
            <div className="flex-1 relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-3xl transform rotate-3 blur-lg opacity-20"></div>
                <div className="relative bg-gray-900 rounded-3xl border border-gray-800 p-2 shadow-2xl aspect-[4/3] flex items-center justify-center overflow-hidden">
                    {/* Placeholder para captura */}
                    <div className="text-center">
                        <BarChart3 className="text-gray-700 mx-auto mb-4" size={48} />
                        <p className="text-gray-500 font-mono text-sm">Captura de Pantalla del Admin</p>
                    </div>
                </div>
            </div>
         </div>
      </section>

      {/* --- PRICING --- */}
      <section className="py-24 bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-5xl font-black mb-6">Precio Simple. Sin sorpresas.</h2>
            <p className="text-gray-400 text-lg mb-12">Todo lo que necesitas para vender más, por menos de lo que cuesta un almuerzo.</p>
            
            <div className="bg-gray-900 rounded-3xl p-8 md:p-12 border border-gray-800 max-w-md mx-auto relative overflow-hidden group hover:border-gray-700 transition-colors">
                <div className="absolute top-0 right-0 bg-green-500 text-black text-xs font-bold px-3 py-1 rounded-bl-xl">
                    OFERTA LANZAMIENTO
                </div>

                <div className="text-5xl font-black mb-2">$10<span className="text-lg font-medium text-gray-500">/mes</span></div>
                <p className="text-gray-400 mb-8 text-sm">Cancela cuando quieras.</p>

                <ul className="space-y-4 text-left mb-10">
                    <li className="flex items-center gap-3"><ShieldCheck className="text-green-500" size={18} /> Productos Ilimitados</li>
                    <li className="flex items-center gap-3"><ShieldCheck className="text-green-500" size={18} /> Automatización de Tasa</li>
                    <li className="flex items-center gap-3"><ShieldCheck className="text-green-500" size={18} /> Soporte Prioritario</li>
                    <li className="flex items-center gap-3"><ShieldCheck className="text-green-500" size={18} /> Sin comisiones por venta</li>
                </ul>

                <Link href="/login" className="block w-full bg-white text-black py-4 rounded-xl font-bold hover:bg-gray-200 transition-all">
                    Empezar 7 Días Gratis
                </Link>
                <p className="mt-4 text-xs text-gray-500">Después $10/mes. Pago vía Pago Móvil o Binance.</p>
            </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 border-t border-gray-100 text-center">
         <div className="flex items-center justify-center gap-2 font-bold text-xl mb-4">
            <div className="bg-black text-white p-1 rounded">
                <ShoppingBag size={16} />
            </div>
            Qatalog.
         </div>
         <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Desarrollado por Quanzosai. Hecho con ❤️ en Venezuela.</p>
      </footer>
    </div>
  )
}