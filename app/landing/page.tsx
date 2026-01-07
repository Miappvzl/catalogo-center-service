import Link from 'next/link';
// Importamos los iconos profesionales

// Imports actualizados
import { Infinity, RefreshCw, Image as ImageIcon, ShieldCheck, Sparkles, User, Link2, Share2 } from 'lucide-react';


export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      
      {/* 1) NAV BAR CORREGIDA (Alineación) */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-xl font-bold tracking-tighter">QATALOG.</div>
          {/* Añadido 'items-center' aquí para alinear verticalmente los botones */}
          <div className="flex gap-4 items-center">
            <Link href="/login" className="text-sm font-medium hover:text-gray-600 transition">
              Entrar
            </Link>
            <Link href="/register" className="text-sm font-medium bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition">
              Crear Tienda
            </Link>
          </div>
        </div>
      </nav>

      {/* 2) HERO SECTION (Intacto) */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold tracking-wide uppercase mb-4">
            Para comerciantes en Venezuela 🇻🇪
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
            Tu inventario en un Link. <br />
            <span className="text-gray-400">No en un PDF.</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            La forma profesional de mostrar tus productos. Precios calculados automáticamente en Bolívares. Buscador instantáneo. Deja de enviar fotos por WhatsApp.
          </p>
          <div className="pt-8 flex flex-col md:flex-row justify-center gap-4">
            <Link href="/login" className="bg-black text-white px-8 py-4 rounded-full font-semibold text-lg hover:scale-105 transition transform duration-200">
              Empezar Gratis 
            </Link>
            <Link href="https://catalogo-center-service.vercel.app" target="_blank" className="bg-gray-100 text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-200 transition">
              Ver Demo en Vivo
            </Link>
          </div>
        </div>
      </section>

      {/* 3) COMPARISON SECTION CORREGIDA (Padding móvil) */}
      <section className="py-20 bg-gray-50 border-y border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* The Old Way - Añadido 'p-8' para consistencia visual */}
            <div className="space-y-4 p-8 opacity-50 grayscale hover:grayscale-0 transition duration-500">
              <h3 className="text-2xl font-bold text-gray-400">❌ La forma antigua</h3>
              <ul className="space-y-3 text-gray-500">
                <li className="flex gap-2">🚫 Enviar 20 fotos por WhatsApp al cliente.</li>
                <li className="flex gap-2">🚫 "Precio?" "Precio?" "Precio?".</li>
                <li className="flex gap-2">🚫 Calcular el dólar manual cada mañana.</li>
                <li className="flex gap-2">🚫 El cliente no encuentra lo que busca.</li>
              </ul>
            </div>
            
            {/* The New Way */}
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 transform md:-translate-y-4">
              <h3 className="text-2xl font-bold mb-6">✅ Con Qatalog</h3>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <span className="bg-green-100 text-green-700 p-1 rounded-full text-xs">✓</span>
                  <span className="font-medium">Un solo link para todo tu stock.</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="bg-green-100 text-green-700 p-1 rounded-full text-xs">✓</span>
                  <span className="font-medium">Tasa BCV/Paralelo automática.</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="bg-green-100 text-green-700 p-1 rounded-full text-xs">✓</span>
                  <span className="font-medium">Buscador ultra rápido.</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="bg-green-100 text-green-700 p-1 rounded-full text-xs">✓</span>
                  <span className="font-medium">Panel de Admin privado.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (NUEVA SECCION) */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight mb-4">Tu negocio online en 3 pasos.</h2>
            <p className="text-gray-600 text-lg">Olvídate de contratar programadores. Hazlo tú mismo hoy.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition duration-300">
                <User className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">1. Crea tu cuenta</h3>
              <p className="text-gray-500 leading-relaxed">
                Regístrate en menos de 1 minuto. Define el nombre de tu tienda y configura tu moneda base.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition duration-300">
                <Link2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">2. Obtén tu Link Único</h3>
              <p className="text-gray-500 leading-relaxed">
                Generamos automáticamente una URL profesional para ti: <span className="font-mono text-black bg-gray-100 px-1 rounded">qatalog.com/tu-marca</span>
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition duration-300">
                <Share2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">3. Pégalo en tu Bio</h3>
              <p className="text-gray-500 leading-relaxed">
                Úsalo en tu perfil de Instagram, estados de WhatsApp o anuncios. Tus clientes entran y compran.
              </p>
            </div>
            
          </div>
        </div>
      </section>

      {/* 4) PRICING SECTION CORREGIDA (Texto, Botón Radius, Iconos) */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Simple y Transparente.</h2>
          <p className="text-gray-600">Sin comisiones por venta. Solo una suscripción mensual fija.</p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="border border-black rounded-3xl p-8 hover:shadow-2xl transition duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-black text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase">
              Popular
            </div>
            <div className="text-center mb-8">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Plan Profesional</span>
              <div className="mt-4 flex justify-center items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight">$10</span>
                <span className="text-gray-500">/mes</span>
              </div>
              {/* Texto cambiado */}
              <p className="text-sm font-medium text-gray-800 mt-3">Incrementar tus ventas, nunca fue tan facil.</p>
            </div>

            {/* Lista con Iconos Profesionales (Sin Emojis) */}
            <ul className="space-y-4 mb-8 text-sm">
              <li className="flex items-center gap-3">
                <Infinity className="w-5 h-5 text-black" /> Productos ilimitados
              </li>
              <li className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-black" /> Actualización de Tasa automática
              </li>
              <li className="flex items-center gap-3">
                <ImageIcon className="w-5 h-5 text-black" /> Fotos en Alta Calidad
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-black" /> Panel de Admin Seguro
              </li>
              <li className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-black" /> Soporte Técnico Prioritario
              </li>
            </ul>

            {/* Botón con rounded-full */}
            <Link href="/login" className="block w-full bg-black text-white text-center py-4 rounded-full font-bold hover:bg-gray-800 transition">
              Comenzar Prueba Gratis (7 días)
            </Link>
          </div>
        </div>
      </section>

      {/* 5) FOOTER CORREGIDO */}
      <footer className="py-10 text-center text-gray-400 text-sm border-t border-gray-100">
        <p>© 2026 Quanzos Inc. Hecho con ❤️ en Venezuela.</p>
      </footer>
    </div>
  );
}