'use client'

import { useState } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowUpRight, Menu, X, Plus,
  Smartphone, Layers, RefreshCw,
  Check, Instagram, Twitter, Facebook, Mail, Phone,
  Calculator, Palette, CheckCircle2 
} from 'lucide-react'
import Image from 'next/image';

// =========================================
// 1. ESTILOS GLOBALES (MINIMALIST DEPARTMENT STORE)
// =========================================
const globalStyles = `
  html { scroll-behavior: smooth; }

  body {
    background-color: #FFFFFF;
    color: #0A0A0A;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  ::selection { background-color: #3600ff; color: #ffffff; }
  
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  
  /* 🚀 Transiciones sedosas y lujo táctil */
  .editorial-hover {
    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }
  
  .btn-luxury {
    position: relative;
    overflow: hidden;
  }
  .btn-luxury::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; w-full; height: 100%;
    background-color: #3600ff;
    transform: translateY(100%);
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: -1;
  }
  .btn-luxury:hover::after {
    transform: translateY(0);
  }
  .btn-luxury:hover {
    color: #ffffff;
    border-color: #3600ff;
  }

  .text-outline { color: transparent; -webkit-text-stroke: 1px #E5E5E5; }
  @media (min-width: 768px) { .text-outline { -webkit-text-stroke: 1.5px #E5E5E5; } }

  @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(calc(-50% - 1rem)); } }
  .animate-marquee { animation: marquee 40s linear infinite; will-change: transform; }
  .animate-marquee:hover { animation-play-state: paused; }
  
  .fade-edges { mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); }
`

const elegantUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20, mass: 1 } }
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const FaqItem = ({ question, answer, index }: { question: string, answer: string, index: string }) => {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="border-b border-gray-200 bg-white group">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full py-8 md:py-10 flex items-start md:items-center justify-between text-left transition-transform">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8 pr-6">
          <span className="text-[10px] font-mono text-gray-400 group-hover:text-[#3600ff] transition-colors">{index}</span>
          <span className="text-xl md:text-3xl font-medium tracking-tight text-gray-900 group-hover:text-[#3600ff] transition-colors">{question}</span>
        </div>
        <div className={`mt-1 md:mt-0 w-8 h-8 flex items-center justify-center shrink-0 transition-transform duration-500 ${isOpen ? 'rotate-45 text-[#3600ff]' : 'text-gray-400 group-hover:text-gray-900'}`}>
          <Plus className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
            <p className="pb-10 md:pl-[3.25rem] font-normal text-gray-500 text-sm md:text-lg leading-relaxed max-w-3xl">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const ScrollFeatureWords = () => {
  const words = [
    { text: "TIENDA ONLINE", outline: false, align: "text-left md:ml-10" },
    { text: "MULTIMONEDA", outline: true, align: "text-left md:ml-20" },
    { text: "TASA BCV", outline: false, align: "text-right md:mr-20", isHighlight: true }, 
    { text: "AUTOMÁTICA", outline: true, align: "text-right md:mr-10" },
    { text: "CERO", outline: false, align: "text-center md:-ml-32" },
    { text: "COMISIONES", outline: true, align: "text-center md:ml-32" },
  ]
  return (
    <section className="py-24 md:py-40 overflow-hidden bg-white border-b border-gray-200">
      <div className="flex flex-col gap-2 md:gap-4 w-full">
        {words.map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "0px" }} transition={{ type: "spring", stiffness: 100, damping: 30, delay: i * 0.1 }} className={`w-full px-4 md:px-6 ${item.align}`}>
            {item.isHighlight ? (
              <span className="inline-block text-[#3600ff] text-[12vw] md:text-[8rem] lg:text-[9.5rem] font-medium leading-[0.85] tracking-tighter uppercase whitespace-nowrap">
                {item.text}
              </span>
            ) : (
              <span className={`text-[12vw] md:text-[8rem] lg:text-[9.5rem] font-medium leading-[0.85] tracking-tighter uppercase whitespace-nowrap ${item.outline ? 'text-outline' : 'text-gray-900'}`}>
                {item.text}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// =========================================
// 3. MAIN LAYOUT
// =========================================
export default function LandingClient() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden selection:bg-[#3600ff] selection:text-white">
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

      {/* HEADER EDITORIAL */}
      <header className="hidden md:flex fixed top-0 left-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-200 z-50 h-[80px] items-center justify-between px-8 lg:px-12 transition-all">
        <Link href="/" className="flex items-center group active:scale-95 transition-transform">
          <Image src="/pezisologo.png" alt="Preziso Logo" width={200} height={90} className="h-8 md:h-10 w-auto object-contain" priority />
        </Link>
        <nav className="flex items-center gap-10">
          <a href="#solucion" className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-[#3600ff] transition-colors">Solución</a>
          <a href="#demo" className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-[#3600ff] transition-colors">Plataforma</a>
          <a href="#pricing" className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-[#3600ff] transition-colors">Precios</a>
          <a href="#faq" className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-[#3600ff] transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-8">
          <Link href="/login" className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-[#3600ff] transition-colors">Ingresar</Link>
          <Link href="/login" className="btn-luxury bg-black text-white px-8 py-3.5 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 transition-all z-10">
            Crear Tienda <ArrowUpRight size={14} strokeWidth={2} />
          </Link>
        </div>
      </header>

      {/* NAVEGACIÓN MOBILE */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-50 p-4 flex items-center justify-between">
        <button className="text-gray-900 p-2 hover:text-[#3600ff] transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
        </button>
        <Link href="/login" className="bg-black text-white px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
          Crear Tienda <ArrowUpRight size={14} strokeWidth={2} />
        </Link>
      </div>

      {/* FULLSCREEN MOBILE MENU */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="fixed inset-0 z-40 bg-white flex flex-col justify-center px-6">
            <div className="flex flex-col gap-6">
              <a href="#solucion" onClick={() => setMenuOpen(false)} className="text-4xl font-medium tracking-tighter text-gray-900 border-b border-gray-200 pb-6 hover:text-[#3600ff] transition-colors">Solución.</a>
              <a href="#demo" onClick={() => setMenuOpen(false)} className="text-4xl font-medium tracking-tighter text-gray-900 border-b border-gray-200 pb-6 hover:text-[#3600ff] transition-colors">Plataforma.</a>
              <a href="#pricing" onClick={() => setMenuOpen(false)} className="text-4xl font-medium tracking-tighter text-gray-900 border-b border-gray-200 pb-6 hover:text-[#3600ff] transition-colors">Precios.</a>
              <a href="#faq" onClick={() => setMenuOpen(false)} className="text-4xl font-medium tracking-tighter text-gray-900 border-b border-gray-200 pb-6 hover:text-[#3600ff] transition-colors">Preguntas.</a>
              <Link href="/login" className="text-xs font-bold uppercase tracking-[0.2em] text-[#3600ff] mt-8 flex items-center gap-2">Ingresar a mi cuenta <ArrowUpRight size={16} strokeWidth={2} /></Link>
            </div>
            <div className="absolute top-8 left-6">
              <Image src="/pezisologo.png" alt="Preziso Logo" width={200} height={90} className="h-8 w-auto object-contain" priority />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="md:pt-[80px]">
        {/* HERO SECTION EDITORIAL */}
        <section className="relative w-full min-h-[85vh] flex flex-col justify-center border-b border-gray-200 overflow-hidden pt-20 md:pt-0 pb-20 bg-white">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12 w-full relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12">
            
            <motion.div initial="hidden" animate="visible" variants={elegantUp} className="w-full lg:w-auto">
              <h1 className="text-[14vw] md:text-[8rem] lg:text-[11rem] font-medium leading-[0.85] tracking-tighter uppercase text-gray-900">
                TU NEGOCIO <br /> 
                <span className="font-black">VENDE</span> <br />
                PREZISO <br className="hidden md:block" /> 
                <span className="text-gray-300">CALCULA.</span>
              </h1>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="w-full lg:w-[400px] shrink-0 flex flex-col gap-10 lg:pb-4">
              <p className="text-sm md:text-base font-normal text-gray-500 leading-relaxed">
                Olvídate de actualizar tasas a mano y de los errores al cobrar. Automatiza el cambio de divisas de tu tienda y deja que las ventas fluyan sin pausas.
              </p>
              <Link href="/login" className="btn-luxury w-full md:w-auto self-start bg-black text-white px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] border border-black flex items-center justify-center gap-3 z-10">
                Crear Tienda Gratis <ArrowUpRight size={16} strokeWidth={2} />
              </Link>
            </motion.div>
          </div>
        </section>

        <ScrollFeatureWords />

        {/* =========================================
            4. EDITORIAL GRID (LA SOLUCIÓN)
        ========================================= */}
        <section id="solucion" className="py-24 md:py-40 w-full border-b border-gray-200 bg-white">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "0px" }} variants={elegantUp} className="mb-16 md:mb-32 max-w-3xl">
              <h2 className="text-[10vw] md:text-[5rem] lg:text-[6rem] font-medium leading-[0.9] tracking-tighter uppercase text-gray-900 mb-8">
                Diseñado para la <span className="text-gray-400">realidad.</span>
              </h2>
              <p className="text-sm md:text-lg font-normal text-gray-500 leading-relaxed">
                Las plataformas extranjeras no entienden cómo se vende en Venezuela. Nosotros sí. Esto es lo que resuelve Preziso.
              </p>
            </motion.div>

            {/* Cuadrícula Arquitectónica (Hairlines) */}
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "0px" }} variants={staggerContainer} 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-l border-gray-200"
            >
              {/* Tarjeta 1 */}
              <motion.article variants={elegantUp} className="border-b border-r border-gray-200 p-8 md:p-12 flex flex-col justify-between group hover:bg-[#FAFAFA] editorial-hover min-h-[400px] md:col-span-2">
                <div className="flex justify-between items-start mb-16">
                  <span className="text-[10px] font-mono text-[#3600ff]">01</span>
                  <RefreshCw className="w-6 h-6 text-gray-300 group-hover:text-gray-900 transition-colors" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-3xl md:text-5xl font-medium tracking-tighter leading-[1] mb-6 text-gray-900">Tasa BCV <br/>En Vivo.</h3>
                  <p className="text-gray-500 text-sm md:text-base leading-relaxed max-w-md">
                    Guarda tu inventario en dólares. El cliente ve el precio exacto en bolívares actualizado en tiempo real. Protege tu margen de ganancia sin mover un dedo.
                  </p>
                </div>
              </motion.article>

              {/* Tarjeta 2 */}
              <motion.article variants={elegantUp} className="border-b border-r border-gray-200 p-8 md:p-12 flex flex-col justify-between group hover:bg-[#FAFAFA] editorial-hover min-h-[400px]">
                <div className="flex justify-between items-start mb-16">
                  <span className="text-[10px] font-mono text-gray-400 group-hover:text-[#3600ff] transition-colors">02</span>
                  <Smartphone className="w-6 h-6 text-gray-300 group-hover:text-gray-900 transition-colors" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-3xl md:text-4xl font-medium tracking-tighter leading-[1] mb-6 text-gray-900">Pedidos Directos.</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Se acabaron los chats interminables. El cliente arma su carrito y te envía un ticket limpio directo a tu WhatsApp.
                  </p>
                </div>
              </motion.article>

              {/* Tarjeta 3 */}
              <motion.article variants={elegantUp} className="border-b border-r border-gray-200 p-8 md:p-12 flex flex-col justify-between group hover:bg-[#FAFAFA] editorial-hover min-h-[400px]">
                <div className="flex justify-between items-start mb-16">
                  <span className="text-[10px] font-mono text-gray-400 group-hover:text-[#3600ff] transition-colors">03</span>
                  <Calculator className="w-6 h-6 text-gray-300 group-hover:text-gray-900 transition-colors" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-3xl md:text-4xl font-medium tracking-tighter leading-[1] mb-6 text-gray-900">Cuadre de Caja.</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    El sistema separa automáticamente cuánto cobraste en dólares y cuánto en bolívares. Olvídate de la calculadora al final del día.
                  </p>
                </div>
              </motion.article>

              {/* Tarjeta 4 */}
              <motion.article variants={elegantUp} className="border-b border-r border-gray-200 p-8 md:p-12 flex flex-col justify-between group hover:bg-[#FAFAFA] editorial-hover min-h-[400px]">
                <div className="flex justify-between items-start mb-16">
                  <span className="text-[10px] font-mono text-gray-400 group-hover:text-[#3600ff] transition-colors">04</span>
                  <Palette className="w-6 h-6 text-gray-300 group-hover:text-gray-900 transition-colors" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-3xl md:text-4xl font-medium tracking-tighter leading-[1] mb-6 text-gray-900">ADN de Marca.</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Tu tienda, tus reglas. Muta los colores, botones y tipografías en 1 clic para que la plataforma respire la identidad de tu negocio.
                  </p>
                </div>
              </motion.article>

              {/* Tarjeta 5 */}
              <motion.article variants={elegantUp} className="border-b border-r border-gray-200 p-8 md:p-12 flex flex-col justify-between group bg-gray-900 min-h-[400px] lg:col-span-1">
                <div className="flex justify-between items-start mb-16">
                  <span className="text-[10px] font-mono text-gray-500">05</span>
                  <Layers className="w-6 h-6 text-[#3600ff]" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-3xl md:text-4xl font-medium tracking-tighter leading-[1] mb-6 text-white">Gestión de Variantes.</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Tallas, colores y existencias precisas. Si se agota un modelo, desaparece de tu catálogo al instante sin tocar código.
                  </p>
                </div>
              </motion.article>

            </motion.div>
          </div>
        </section>

        {/* =========================================
            5. DEMO VISUAL (WIREFRAME EDITORIAL)
        ========================================= */}
        <section id="demo" className="py-24 md:py-40 bg-[#FAFAFA] border-b border-gray-200">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "0px" }} variants={elegantUp} className="mb-20 md:mb-32 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <h2 className="text-[10vw] md:text-[5rem] lg:text-[7rem] font-medium leading-[0.85] tracking-tighter uppercase text-gray-900">
                La <span className="text-gray-400">Experiencia.</span>
              </h2>
              <p className="text-sm md:text-base font-normal text-gray-500 max-w-sm pb-2">
                Diseñado para que tu cliente compre rápido, y tú administres en paz.
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8 md:gap-12">
              {/* Celular Mockup */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={elegantUp} className="bg-white border border-gray-200 p-12 flex flex-col items-center group editorial-hover hover:border-gray-300">
                <div className="w-full mb-12 flex justify-between items-center">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Client-Facing</span>
                  <span className="w-2 h-2 rounded-full bg-[#3600ff] animate-pulse"></span>
                </div>
                <div className="w-full max-w-[280px] aspect-[9/18] border border-gray-200 bg-gray-50 relative overflow-hidden">
                  <Image src="/imgtienda.webp" alt="Vista de la app móvil" fill className="object-cover object-top grayscale group-hover:grayscale-0 transition-all duration-700" sizes="(max-width: 768px) 100vw, 280px" />
                </div>
              </motion.div>

              {/* Dashboard Mockup */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={elegantUp} className="bg-white border border-gray-200 p-12 flex flex-col items-center group editorial-hover hover:border-gray-300">
                <div className="w-full mb-12 flex justify-between items-center">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Back-Office</span>
                  <span className="w-2 h-2 rounded-full bg-gray-900"></span>
                </div>
                <div className="w-full aspect-[4/3] md:aspect-[16/11] border border-gray-200 bg-gray-50 relative overflow-hidden">
                  <Image src="/dashboardpreview.webp" alt="Panel web" fill className="object-cover object-left-top grayscale group-hover:grayscale-0 transition-all duration-700" sizes="(max-width: 768px) 100vw, 60vw" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

         {/* =========================================
            5.5. ECOSISTEMA DE PAGOS (CERO INTERMEDIARIOS)
        ========================================= */}
        <section className="py-24 md:py-32 bg-white border-b border-gray-200">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "0px" }} variants={elegantUp} className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <h2 className="text-[10vw] md:text-[4.5rem] lg:text-[6rem] font-medium leading-[0.85] tracking-tighter uppercase text-gray-900">
                Cero <br /> <span className="text-gray-400">Intermediarios.</span>
              </h2>
              <div className="max-w-md pb-2">
                <p className="text-sm md:text-base font-normal text-gray-500 leading-relaxed mb-6">
                  El dinero va directo a tus cuentas. Ofrece los métodos que tus clientes ya usan, recibe los comprobantes integrados en cada pedido y aprueba la venta con un solo clic.
                </p>
                <div className="inline-flex items-center gap-3 bg-[#FAFAFA] border border-gray-200 px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3600ff] animate-pulse"></span> Verificación manual segura
                </div>
              </div>
            </motion.div>

            {/* Grid de Logos Arquitectónico (3 Columnas con animación de caída) */}
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "0px" }} variants={staggerContainer} 
              className="grid grid-cols-1 md:grid-cols-3 border-t border-l border-gray-200 bg-white"
            >
              {[
                { name: "Pago Móvil", desc: "Directo a tu banco", icon: "Bs." },
                { name: "Binance Pay", desc: "USDT a tu wallet", icon: "USDT" },
                { name: "Zelle", desc: "A tu cuenta externa", icon: "$" }
              ].map((method, i) => (
                <motion.div 
                  key={i} 
                  variants={{
                    hidden: { opacity: 0, y: -50 }, // 🚀 Inicia arriba para el efecto de caída
                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20, mass: 1 } }
                  }} 
                  className="border-b border-r border-gray-200 p-8 md:p-12 flex flex-col items-center justify-center text-center group editorial-hover hover:bg-[#FAFAFA] min-h-[220px]"
                >
                  <span className="text-3xl md:text-4xl font-light tracking-tighter mb-6 text-gray-300 group-hover:text-[#3600ff] transition-colors">{method.icon}</span>
                  <h4 className="text-lg md:text-xl font-medium tracking-tight mb-2 text-gray-900">{method.name}</h4>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 group-hover:text-gray-500 transition-colors">{method.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>


        {/* =========================================
            6. SOCIAL PROOF (CLEAN TYPOGRAPHY)
        ========================================= */}
        <section className="py-24 md:py-40 bg-white border-b border-gray-200 overflow-hidden">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12 mb-20 relative z-10">
            <h2 className="text-[10vw] md:text-[5rem] lg:text-[7rem] font-medium leading-[0.85] tracking-tighter uppercase text-gray-900">
              Ellos ya <span className="text-gray-400">lo probaron.</span>
            </h2>
          </div>

          <div className="w-full fade-edges pb-12 relative z-10">
            <div className="flex w-max gap-12 md:gap-20 animate-marquee px-6 items-center">
              {[
                { q: "Lo de la tasa BCV automática es un salvavidas. Antes perdía clientes por tardar en sacar la cuenta o daba el precio mal. Ahora compran solos.", name: "María P.", store: "Tienda de Ropa" },
                { q: "Los clientes me mandan el capture y el pedido llega al WhatsApp como un recibo de supermercado. Cero enredos de '¿qué talla querías?'.", name: "Jose D.", store: "Repuestos de Moto" },
                { q: "Creé la tienda el viernes en la noche, el sábado ya estaba vendiendo con las zonas de delivery configuradas. Súper intuitivo.", name: "Luis C.", store: "Electrónica" },
                { q: "Manejar las tallas era un caos en Instagram. Con el catálogo, si no hay talla 40, no la pueden pedir y punto. Te ahorra dolores de cabeza.", name: "Ana F.", store: "Calzado Deportivo" },
                { q: "Pagar $18.99 al mes se recupera con la primera venta que cierras rápido porque el cliente no tuvo que esperar a que le dieras el precio en bolívares.", name: "Carlos M.", store: "Minimarket" },
                // Duplicados
                { q: "Lo de la tasa BCV automática es un salvavidas. Antes perdía clientes por tardar en sacar la cuenta o daba el precio mal. Ahora compran solos.", name: "María P.", store: "Tienda de Ropa" },
                { q: "Los clientes me mandan el capture y el pedido llega al WhatsApp como un recibo de supermercado. Cero enredos de '¿qué talla querías?'.", name: "Jose D.", store: "Repuestos de Moto" },
                { q: "Creé la tienda el viernes en la noche, el sábado ya estaba vendiendo con las zonas de delivery configuradas. Súper intuitivo.", name: "Luis C.", store: "Electrónica" },
              ].map((testimonial, i) => (
                <div key={i} className={`w-[320px] md:w-[480px] shrink-0 flex flex-col justify-between group min-h-[250px]`}>
                  <p className="text-lg md:text-2xl font-normal text-gray-900 leading-snug mb-10 tracking-tight">
                    "{testimonial.q}"
                  </p>
                  <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
                    <div>
                      <p className="font-bold text-xs uppercase tracking-[0.2em] text-gray-900">{testimonial.name}</p>
                      <p className="text-[10px] font-mono text-gray-400 mt-1">{testimonial.store}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================
            7. PRICING (THE INVOICE)
        ========================================= */}
        <section id="pricing" className="py-24 md:py-40 w-full bg-white border-b border-gray-200">
            <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex flex-col items-center">
              
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={elegantUp} className="text-center mb-20 w-full">
                <h2 className="text-[10vw] md:text-[5rem] lg:text-[7rem] font-medium leading-[0.85] tracking-tighter uppercase text-gray-900 border-b border-gray-200 pb-10">
                  UN PRECIO. <br className="md:hidden" />
                  <span className="text-gray-300">CERO COMISIONES.</span>
                </h2>
              </motion.div>

              {/* THE RECEIPT */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={elegantUp} 
                className="w-full max-w-4xl border border-gray-200 bg-[#FAFAFA] flex flex-col md:flex-row"
              >
                {/* Lado Izquierdo: Precio */}
                <div className="flex flex-col items-center justify-center text-center w-full md:w-1/2 p-12 md:p-20 border-b md:border-b-0 md:border-r border-gray-200">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#3600ff] mb-6">Plan Ilimitado</span>
                  <h3 className="text-6xl md:text-8xl font-light tracking-tighter text-gray-900 leading-none mb-4">
                    $18<span className="text-3xl md:text-5xl text-gray-400">.99</span>
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                    Al Mes / Sin Contratos
                  </span>
                  
                  <Link href="/login" className="mt-12 btn-luxury w-full bg-black text-white px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] border border-black flex items-center justify-center gap-3 z-10">
                    Crear mi tienda <ArrowUpRight size={14} strokeWidth={2} />
                  </Link>
                </div>

                {/* Lado Derecho: Checklist */}
                <div className="w-full md:w-1/2 p-12 md:p-16 bg-white flex flex-col justify-center">
                  <p className="text-xs text-gray-500 leading-relaxed mb-8 border-b border-gray-200 pb-8">
                    Vende 10 o 10.000 productos. Jamás tocaremos un centavo de tus ganancias. Paga en Bs o USDT.
                  </p>
                  <ul className="flex flex-col gap-4">
                    {[
                      "Productos y Pedidos Ilimitados",
                      "Tasa BCV sincronizada en vivo",
                      "Cierre de caja en USD y BS",
                      "Diseño 100% personalizable",
                      "Pedidos directos a WhatsApp",
                      "Dominio personalizado (.preziso.shop)"
                    ].map((benefit, idx) => (
                      <li key={idx} className="flex items-center gap-4 text-xs md:text-sm font-medium text-gray-900">
                        <Check size={14} className="text-[#3600ff] shrink-0" strokeWidth={2} />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>

            </div>
        </section>

        {/* =========================================
            8. FAQ SECCIÓN (INDEX FORMAT)
        ========================================= */}
        <section id="faq" className="py-24 md:py-40 bg-white">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-start">
              <div className="lg:col-span-5 lg:sticky lg:top-32">
                <h2 className="text-[10vw] md:text-[4rem] lg:text-[5rem] font-medium leading-[0.9] tracking-tighter uppercase text-gray-900 mb-6">
                  Dudas. <br /> <span className="text-gray-400">Resueltas.</span>
                </h2>
                <p className="text-sm md:text-base font-normal text-gray-500 max-w-sm">
                  Sin letras pequeñas ni condiciones engañosas. Las reglas claras conservan las ventas.
                </p>
              </div>

              <div className="lg:col-span-7 flex flex-col border-t border-gray-200 mt-10 md:mt-0">
                <FaqItem index="01" question="¿Necesito tarjeta internacional?" answer="No. Sabemos cómo funciona el mercado venezolano. Puedes pagar tu suscripción mensual de $18.99 en Bolívares (Pago Móvil) o usando USDT (Binance)." />
                <FaqItem index="02" question="¿Cobran comisión por venta?" answer="Cero comisiones. Jamás tocaremos tu dinero. Pagas una tarifa plana al mes y puedes vender 10 o 10.000 productos. El 100% de la ganancia va directo a tus cuentas bancarias." />
                <FaqItem index="03" question="¿El dinero pasa por Preziso?" answer="Nunca. El cliente arma el carrito en nuestra plataforma, y el pedido se envía a tu WhatsApp. El cliente te paga directamente a ti (a tu Pago Móvil o tu Zelle)." />
                <FaqItem index="04" question="¿Hay límite de productos?" answer="No. Carga todo tu inventario, con todas sus variantes, tallas y colores. No te cobraremos extra por crecer." />
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* =========================================
          9. FOOTER POSTER (ARCHITECTURAL)
      ========================================= */}
      <footer className="bg-black text-white pt-24 md:pt-40 pb-10 px-6 md:px-12 relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto relative z-10 flex flex-col w-full">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-800 pb-16 md:pb-24 w-full gap-12">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-6xl font-medium tracking-tighter uppercase mb-8 text-white">¿Listo para el siguiente nivel?</h2>
              <Link href="/login" className="inline-flex items-center justify-center gap-3 bg-white text-black px-10 py-5 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#3600ff] hover:text-white transition-colors duration-500">
                Obtener prueba gratis <ArrowUpRight size={16} strokeWidth={2} />
              </Link>
            </div>

            <ul className="flex flex-col gap-4 text-gray-500">
              <li className="flex items-center gap-3 text-[10px] md:text-xs font-mono uppercase tracking-widest"><span className="w-1.5 h-1.5 bg-[#3600ff]"></span> Sin Contratos</li>
              <li className="flex items-center gap-3 text-[10px] md:text-xs font-mono uppercase tracking-widest"><span className="w-1.5 h-1.5 bg-[#3600ff]"></span> Productos Ilimitados</li>
              <li className="flex items-center gap-3 text-[10px] md:text-xs font-mono uppercase tracking-widest"><span className="w-1.5 h-1.5 bg-[#3600ff]"></span> Cancela cuando quieras</li>
            </ul>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start gap-16 py-16 w-full">
            <div className="flex flex-col gap-6">
              <a href="mailto:quanzosinc@gmail.com" className="text-[10px] md:text-xs font-mono uppercase tracking-widest text-gray-500 hover:text-[#3600ff] transition-colors">quanzosinc@gmail.com</a>
              <a href="tel:+584145811936" className="text-[10px] md:text-xs font-mono uppercase tracking-widest text-gray-500 hover:text-[#3600ff] transition-colors">+58 (414) 581-1936</a>
            </div>

            <div className="flex items-center gap-8">
              <a href="#" className="text-gray-500 hover:text-white transition-colors"><Instagram size={20} strokeWidth={1.5} /></a>
              <a href="#" className="text-gray-500 hover:text-white transition-colors"><Twitter size={20} strokeWidth={1.5} /></a>
              <a href="#" className="text-gray-500 hover:text-white transition-colors"><Facebook size={20} strokeWidth={1.5} /></a>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-10 flex flex-col md:flex-row justify-between items-center gap-6 w-full">
            <p className="text-[9px] font-mono uppercase tracking-widest text-gray-600">
              &copy; {new Date().getFullYear()} PREZISO INC. TODOS LOS DERECHOS RESERVADOS.
            </p>
            <div className="flex gap-8 text-gray-600">
              <a href="#" className="text-[9px] font-mono uppercase tracking-widest hover:text-white transition-colors">Términos</a>
              <a href="#" className="text-[9px] font-mono uppercase tracking-widest hover:text-white transition-colors">Privacidad</a>
            </div>
          </div>
          
        </div>
      </footer>
    </div>
  )
}