'use client'

import { useState } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowUpRight, Menu, X, Plus,
  Smartphone, Layers, RefreshCw,
  Check, Instagram, Twitter, Facebook, Mail, Phone
} from 'lucide-react'
import Image from 'next/image';

// =========================================
// 1. ESTILOS GLOBALES (TECH EDITORIAL / REFINED CLEAN LOOK)
// =========================================
const globalStyles = `
  html {
    scroll-behavior: smooth;
  }

  body {
    background-color: #FAFAFA; /* Un blanco roto muy premium */
    color: #111111;
  }
  
  /* EL TOQUE MAESTRO: Selección de texto */
  ::selection {
    background-color: #00cd61;
    color: #000000;
  }
  
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  
  /* Sistema de Elevación Refinado (Clean Look) */
  .editorial-shadow {
    box-shadow: 0 20px 40px -15px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.05);
  }
  .editorial-shadow-hover:hover {
    box-shadow: 0 30px 60px -20px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05);
    transform: translateY(-2px);
  }
  .editorial-press:active {
    transform: scale(0.98);
  }

  /* Textura de Plano de Ingeniería ultra sutil (opcional, al 2% de opacidad) */
  .blueprint-bg {
    background-image: linear-gradient(to right, rgba(0,0,0,0.02) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(0,0,0,0.02) 1px, transparent 1px);
    background-size: 40px 40px;
  }

  /* Tipografía outline refinada */
  .text-outline {
    color: transparent;
    -webkit-text-stroke: 1px #111111;
  }
  @media (min-width: 768px) {
    .text-outline {
      -webkit-text-stroke: 1.5px #111111;
    }
  }

  /* Animación Carrusel */
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(calc(-50% - 1rem)); }
  }
  .animate-marquee {
    animation: marquee 35s linear infinite;
    will-change: transform;
  }
  .animate-marquee:hover {
    animation-play-state: paused;
  }
  
  .fade-edges {
    mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
    -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
  }
`

// =========================================
// 2. FÍSICA DE INTERFAZ (Suave y Precisa)
// =========================================
// Cambiamos el rebote agresivo por una transición sedosa pero rápida
const elegantUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 250, damping: 25, mass: 0.8 } 
  }
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

// ... (Aquí mantienes tus componentes FaqItem y ScrollFeatureWords intactos por ahora) ...
const FaqItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-gray-200 bg-[#FAFAFA] md:hover:bg-gray-50 transition-colors">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 md:py-8 px-4 md:px-6 flex items-center justify-between text-left group active:scale-[0.99] transition-transform"
      >
        <span className="text-xl md:text-2xl font-black tracking-tight uppercase text-gray-900 pr-6 group-hover:text-[#00cd61] transition-colors">
          {question}
        </span>
        <div className={`w-10 h-10 md:w-12 md:h-12 border border-gray-200 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${isOpen ? 'bg-[#00cd61] border-[#00cd61] text-black' : 'bg-white text-gray-400 group-hover:border-gray-400'}`}>
          <Plus className={`w-5 h-5 md:w-6 md:h-6 transition-transform duration-500 ${isOpen ? 'rotate-45' : 'rotate-0'}`} strokeWidth={2.5} />
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden bg-gray-50"
          >
            <p className="p-4 md:p-6 font-medium text-gray-600 text-sm md:text-base leading-relaxed max-w-4xl">
              {answer}
            </p>
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
          <motion.div
            key={i}
            initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "0px" }}
            transition={{ type: "spring", stiffness: 200, damping: 25, delay: i * 0.1 }}
            className={`w-full px-4 md:px-6 ${item.align}`}
          >
            {item.isHighlight ? (
              <span className="inline-block bg-[#00cd61] text-black px-6 md:px-8 text-[13vw] md:text-[8rem] lg:text-[9.5rem] font-black leading-[0.85] tracking-tighter uppercase whitespace-nowrap editorial-shadow rounded-2xl">
                {item.text}
              </span>
            ) : (
              <span className={`text-[12vw] md:text-[8rem] lg:text-[9.5rem] font-black leading-[0.85] tracking-tighter uppercase whitespace-nowrap ${item.outline ? 'text-outline' : 'text-gray-900'}`}>
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
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-gray-900 overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

      {/* NAVEGACIÓN DESKTOP (CLEAN LOOK) */}
      <header className="hidden md:flex fixed top-0 left-0 w-full bg-white/80 backdrop-blur-xl border-b border-gray-200 z-50 h-[72px] items-center justify-between px-6 lg:px-10 transition-all">
        <Link href="/" className="flex items-center group active:scale-95 transition-transform">
          <Image 
            src="/pezisologo.png" 
            alt="Preziso Logo" 
            width={200} 
            height={90} 
            className="h-10 md:h-15 w-auto object-contain"
            priority
          />
        </Link>

        <nav className="flex items-center gap-8">
          <a href="#solucion" className="text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-colors">Solución</a>
          <a href="#demo" className="text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-colors">Plataforma</a>
          <a href="#faq" className="text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-6">
          <Link href="/login" className="text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-colors">
            Ingresar
          </Link>
          <Link href="/login" className="bg-gray-900 text-white px-5 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-[#00cd61] hover:text-black transition-colors flex items-center gap-1.5 group editorial-press">
            Crear Tienda <ArrowUpRight size={14} strokeWidth={3} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>
      </header>

      {/* NAVEGACIÓN MOBILE (THUMB-ZONE REFINADO) */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] z-50">
        <div className="bg-white/90 backdrop-blur-xl border border-gray-200 editorial-shadow rounded-full p-2 flex items-center justify-between">
          <button 
            className="bg-gray-100 text-gray-900 p-3 rounded-full hover:bg-gray-200 transition-colors" 
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={2.5} />}
          </button>
          <Link href="/login" className="bg-gray-900 text-white px-6 py-3 rounded-full text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 editorial-press transition-transform">
            Crear Tienda <ArrowUpRight size={16} strokeWidth={3} />
          </Link>
        </div>
      </div>

      {/* FULLSCREEN MOBILE MENU (CLEAN) */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-40 bg-white flex flex-col justify-center px-6"
          >
            <div className="flex flex-col gap-6">
              <a href="#solucion" onClick={() => setMenuOpen(false)} className="text-4xl font-black uppercase tracking-tighter text-gray-900 border-b border-gray-100 pb-4 active:text-[#00cd61] transition-colors">Solución.</a>
              <a href="#demo" onClick={() => setMenuOpen(false)} className="text-4xl font-black uppercase tracking-tighter text-gray-900 border-b border-gray-100 pb-4 active:text-[#00cd61] transition-colors">Plataforma.</a>
              <a href="#faq" onClick={() => setMenuOpen(false)} className="text-4xl font-black uppercase tracking-tighter text-gray-900 border-b border-gray-100 pb-4 active:text-[#00cd61] transition-colors">Preguntas.</a>
              
              <Link href="/login" className="text-sm font-bold uppercase tracking-widest text-[#00cd61] mt-6 flex items-center gap-2">
                Ingresar a mi cuenta <ArrowUpRight size={18} strokeWidth={3} />
              </Link>
            </div>
            <div className="absolute top-6 left-6 font-black text-xl tracking-tighter uppercase text-gray-900">
                    <Link href="/" className="flex items-center group active:scale-95 transition-transform">
          <Image 
            src="/pezisologo.png" 
            alt="Preziso Logo" 
            width={200} 
            height={90} 
            className="h-15 md:h-20 w-auto object-contain"
            priority
          />
        </Link>
            </div>
            
          </motion.div>
        )}
      </AnimatePresence>

      <main className="md:pt-[72px]">
        
        {/* HERO SECTION (EDITORIAL B2B) */}
        <section className="relative w-full min-h-[90vh] flex flex-col justify-center border-b border-gray-200 blueprint-bg overflow-hidden pt-12 md:pt-0 pb-32 md:pb-20">
          <div className="max-w-7xl mx-auto px-4 md:px-6 w-full relative z-10">
            
            <motion.div initial="hidden" animate="visible" variants={elegantUp} className="w-full pb-8 md:pb-12 mb-8 md:mb-12 border-b border-gray-200">
              <h1 className="text-[15vw] md:text-[8.5rem] lg:text-[10rem] font-black leading-[0.9] tracking-tighter uppercase text-gray-900">
                TU NEGOCIO <br className="hidden md:block" /> 
                <span className="bg-[#00cd61] px-3 md:px-6 text-black rounded-2xl md:rounded-[2rem] inline-block mt-2 md:mt-0 pb-2">VENDE</span> <br />
                PREZISO <br className="hidden md:block" /> 
                <span className="text-outline">CALCULA.</span>
              </h1>
            </motion.div>

            <div className="flex flex-col lg:flex-row items-start justify-between gap-12 lg:gap-8 w-full">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="max-w-xl w-full shrink-0 flex flex-col gap-8">
                <p className="text-base md:text-xl font-medium text-gray-500 border-l-2 border-[#00cd61] pl-4 md:pl-6 leading-relaxed bg-white/30 backdrop-blur-sm py-1 rounded-r-lg">
                  Olvídate de actualizar tasas a mano y de los errores al cobrar. Automatiza el cambio de divisas de tu tienda y deja que las ventas fluyan sin pausas.
                </p>
                
                <Link href="/login" className="self-start inline-flex items-center justify-center gap-3 bg-gray-900 text-white px-8 py-4 md:px-10 md:py-5 text-sm md:text-base font-bold uppercase tracking-widest rounded-full editorial-shadow editorial-shadow-hover editorial-press transition-all duration-300 group hover:bg-[#00cd61] hover:text-black">
                  Crear Tienda Gratis <ArrowUpRight size={20} strokeWidth={3} className="md:group-hover:translate-x-1 md:group-hover:-translate-y-1 transition-transform" />
                </Link>
              </motion.div>

              {/* MOCKUP DEL DASHBOARD (Clean Mac Window) */}
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 250, damping: 25, delay: 0.2 }} className="w-full lg:w-[55%] relative group mt-4 lg:mt-0">
                <div className="w-full aspect-[4/3] md:aspect-[16/10] bg-white border border-gray-200 rounded-2xl md:rounded-3xl flex flex-col overflow-hidden editorial-shadow transition-transform duration-500 md:hover:-translate-y-2">
                  
                  {/* Barra de Navegador Mac-style */}
                  <div className="h-10 md:h-12 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm flex items-center px-4 gap-2 shrink-0">
                    <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500/20"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400 border border-amber-500/20"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500/20"></div>
                  </div>
                  
                  <div className="relative flex-1 bg-white">
                    <Image src="/dashboardpreview.webp" alt="Dashboard Preview" fill className="object-cover object-left-top transform transition-transform duration-700 md:group-hover:scale-105" />
                  </div>
                </div>
                
                {/* Etiqueta Premium */}
                <div className="absolute -bottom-4 -left-4 md:-bottom-6 md:-left-6 bg-white ml-[12] text-gray-900 border border-gray-200 px-4 py-2 md:px-6 md:py-3 font-bold uppercase tracking-widest text-[10px] md:text-xs rounded-full editorial-shadow z-20 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00cd61] animate-pulse"></div> Dashboard Preview
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* AQUÍ CONTINÚA TU CÓDIGO ACTUAL (ScrollFeatureWords, etc.) ... */}

        {/* ... AQUÍ CONTINÚA TU CÓDIGO ACTUAL DE ScrollFeatureWords ... */}

       {/* SCROLL CINÉTICO */}
        <ScrollFeatureWords />

{/* =========================================
            4. BENTO GRID (LA SOLUCIÓN - TECH EDITORIAL)
        ========================================= */}
        <section id="solucion" className="py-24 md:py-32 w-full border-b border-gray-200 bg-[#FAFAFA] relative overflow-hidden">
          {/* Blueprint sutil */}
          <div className="absolute inset-0 blueprint-bg pointer-events-none opacity-50"></div>

          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "0px" }} variants={elegantUp} className="mb-12 md:mb-20 px-4 md:px-6">
              <h2 className="text-[12vw] md:text-[5rem] lg:text-[7rem] font-black leading-[0.85] tracking-tighter uppercase text-gray-900">
                Diseñado <br className="hidden md:block" /> 
                <span className="bg-gray-900 text-white px-4 md:px-6 rounded-2xl md:rounded-[2rem] inline-block mt-2 md:mt-0 pb-1 md:pb-3">para la realidad.</span>
              </h2>
              <p className="text-base md:text-xl font-medium text-gray-500 mt-6 md:mt-8 max-w-2xl border-l-2 border-[#00cd61] pl-4">
                Las plataformas gringas no entienden cómo se vende en Venezuela. Nosotros sí. Esto es lo que resuelve Preziso.
              </p>
            </motion.div>

            {/* CONTENEDOR HÍBRIDO: Scroll Horizontal en Móvil, Grid en PC */}
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "0px" }} variants={staggerContainer} 
              className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 px-4 md:px-6 md:grid md:grid-cols-2 md:gap-8 md:overflow-visible md:snap-none md:pb-0 no-scrollbar"
            >
              {/* Tarjeta 1 */}
              <motion.article variants={elegantUp} className="w-[85vw] shrink-0 md:w-auto snap-center md:col-span-2 bg-white rounded-[2rem] md:rounded-[3rem] p-8 md:p-14 border border-gray-200 editorial-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-8 md:gap-20 group transition-all duration-500 md:hover:-translate-y-2 md:hover:editorial-shadow-hover">
                <div className="flex-1 flex flex-col items-start gap-6 md:gap-8 w-full">
                  <div className="px-4 py-2 border border-gray-100 rounded-full text-xs font-bold uppercase tracking-widest text-[#00cd61] bg-green-50/50">
                    01 // Automatización
                  </div>
                  <div>
                    <h3 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9] mb-4 text-gray-900">
                      Tasa BCV <br /> En Vivo.
                    </h3>
                    <p className="text-gray-500 text-base md:text-xl font-medium leading-relaxed max-w-xl group-hover:text-gray-700 transition-colors">
                      Guarda tu inventario en dólares. El cliente ve el precio exacto en bolívares actualizado en tiempo real. Protege tu margen de ganancia sin mover un dedo.
                    </p>
                  </div>
                </div>
                <div className="w-20 h-20 md:w-40 md:h-40 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center shrink-0 md:group-hover:bg-[#00cd61] transition-all duration-500">
                  <RefreshCw className="w-8 h-8 md:w-16 md:h-16 text-gray-400 md:group-hover:text-black transition-colors" strokeWidth={2} />
                </div>
              </motion.article>

              {/* Tarjeta 2 */}
              <motion.article variants={elegantUp} className="w-[85vw] shrink-0 md:w-auto snap-center bg-white rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 border border-gray-200 editorial-shadow flex flex-col justify-between group transition-all duration-500 md:hover:-translate-y-2 md:hover:editorial-shadow-hover min-h-[350px] md:min-h-[450px]">
                <div className="flex justify-between items-start mb-8">
                  <div className="px-4 py-2 border border-gray-100 rounded-full text-xs font-bold uppercase tracking-widest text-gray-600 bg-gray-50">
                    02 // Fricción Cero
                  </div>
                  <div className="w-12 h-12 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm md:group-hover:-translate-y-2 transition-transform">
                    <Smartphone className="w-5 h-5 text-gray-900" strokeWidth={2} />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-[0.9] mb-4 text-gray-900">Pedidos <br /> Directos.</h3>
                  <p className="text-gray-500 text-sm md:text-lg font-medium leading-relaxed">
                    Se acabaron los chats interminables. El cliente arma su carrito y te envía un ticket limpio y formateado directo a tu WhatsApp.
                  </p>
                </div>
              </motion.article>

              {/* Tarjeta 3 (Alto Contraste Premium) */}
              <motion.article variants={elegantUp} className="w-[85vw] shrink-0 md:w-auto snap-center bg-gray-900 rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 border border-gray-800 editorial-shadow flex flex-col justify-between group transition-all duration-500 md:hover:-translate-y-2 md:hover:editorial-shadow-hover min-h-[350px] md:min-h-[450px]">
                <div className="flex justify-between items-start mb-8">
                  <div className="px-4 py-2 border border-gray-700 rounded-full text-xs font-bold uppercase tracking-widest text-white bg-gray-800">
                    03 // Control Total
                  </div>
                  <div className="w-12 h-12 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center shadow-sm md:group-hover:-translate-y-2 transition-transform">
                    <Layers className="w-5 h-5 text-[#00cd61]" strokeWidth={2} />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-[0.9] mb-4 text-white">Gestión de <br /> Variantes.</h3>
                  <p className="text-gray-400 text-sm md:text-lg font-medium leading-relaxed">
                    Tallas, colores y existencias precisas. Si se agota un modelo, desaparece de tu catálogo al instante sin tocar código.
                  </p>
                </div>
              </motion.article>
            </motion.div>
          </div>
        </section>

        {/* =========================================
            5. DEMO VISUAL (CRISTAL & MOCKUPS)
        ========================================= */}
        <section id="demo" className="py-20 md:py-32 px-4 md:px-6 w-full border-b border-gray-200 blueprint-bg relative overflow-hidden">
          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "0px" }} variants={elegantUp} className="mb-16 md:mb-24 text-center">
              <h2 className="text-[12vw] md:text-[5rem] lg:text-[7rem] font-black leading-[0.85] tracking-tighter uppercase text-gray-900">
                La Experiencia.
              </h2>
              <p className="text-base md:text-xl font-medium text-gray-600 mt-4 md:mt-6 max-w-2xl mx-auto">
                Diseñado para que tu cliente compre rápido, y tú administres en paz.
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-12 gap-8 md:gap-10 items-stretch">
              
              {/* Celular Mockup */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={elegantUp} className="group lg:col-span-5 bg-white border border-gray-200 editorial-shadow transition-all duration-500 rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 flex flex-col gap-10 relative z-10 md:hover:-translate-y-2">
                <div className="border-b border-gray-100 pb-6">
                  <div className="bg-gray-50 border border-black text-gray-600 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest px-3 py-1 inline-block mb-4">Interfaz Móvil</div>
                  <h3 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none mb-2 text-gray-900">Lo que ve <br />tu cliente.</h3>
                  <p className="text-sm md:text-base text-gray-500 font-medium">Tu tienda online ultrarrápida y sin fricción.</p>
                </div>
                
                <div className="flex-1 flex items-end justify-center">
                  <div className="w-full max-w-[260px] relative">
                    <div className="relative w-full aspect-[9/16] rounded-[2.5rem] md:rounded-[3rem] border-7 border-black bg-white overflow-hidden shadow-2xl transition-transform duration-700 md:group-hover:-translate-y-4">
                      {/* Notch Isla Dinámica */}
                      <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20">
                        <div className="w-24 h-[5px] bg-black rounded-b-xl"></div>
                      </div>
                      <div className="relative w-full h-full">
                        <Image src="/imgtienda.webp" alt="Vista de la app móvil" fill className="object-cover object-top" sizes="(max-width: 768px) 100vw, 260px" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Dashboard Mockup */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={elegantUp} className="group lg:col-span-7 bg-white border border-gray-200 editorial-shadow transition-all duration-500 rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 flex flex-col gap-10 relative z-10 md:hover:-translate-y-2">
                <div className="border-b border-gray-100 pb-6">
                  <div className="bg-gray-50 border border-[#00cd61]/20 text-[#00cd61] rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest px-3 py-1 inline-block mb-4">Back-Office</div>
                  <h3 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none mb-2 text-gray-900">Lo que <br />controlas tú.</h3>
                  <p className="text-sm md:text-base text-gray-500 font-medium">Panel de administración web robusto y analítico.</p>
                </div>
                
                <div className="flex-1 w-full flex items-center justify-center">
                  <div className="w-full relative">
                    <div className="relative w-full aspect-[16/10] rounded-2xl md:rounded-3xl border border-black border-5 bg-white overflow-hidden shadow-2xl flex flex-col transition-transform duration-700 md:group-hover:-translate-y-4">
                      
                      
                      
                      <div className="relative flex-1 w-full bg-gray-50">
                        <Image src="/dashboardpreview.webp" alt="Panel web" fill className="object-cover object-left-top" sizes="(max-width: 768px) 100vw, 60vw" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* =========================================
            6. SOCIAL PROOF (TARJETAS PREMIUM)
        ========================================= */}
        <section className="py-24 md:py-40 bg-white border-b border-gray-200 overflow-hidden relative">
          <div className="max-w-7xl mx-auto px-4 md:px-6 mb-16 md:mb-24 relative z-10">
            <h2 className="text-[12vw] md:text-[6rem] lg:text-[8rem] font-black leading-[0.85] tracking-tighter uppercase text-gray-900">
              Ellos ya <br className="hidden md:block" /> 
              <span className="bg-[#00cd61] text-black px-4 md:px-6 rounded-2xl md:rounded-[2rem] inline-block mt-2 md:mt-0 pb-1 md:pb-3">lo probaron.</span>
            </h2>
          </div>

          <div className="w-full fade-edges pb-12 relative z-10">
            <div className="flex w-max gap-6 md:gap-8 animate-marquee px-6 items-center">
              {[
                { q: "Lo de la tasa BCV automática es un salvavidas. Antes perdía clientes por tardar en sacar la cuenta o daba el precio mal. Ahora compran solos.", name: "María P.", store: "Tienda de Ropa", initial: "M" },
                { q: "Los clientes me mandan el capture y el pedido llega al WhatsApp como un recibo de supermercado. Cero enredos de '¿qué talla querías?'.", name: "Jose D.", store: "Repuestos de Moto", initial: "J" },
                { q: "Creé la tienda el viernes en la noche, el sábado ya estaba vendiendo con las zonas de delivery configuradas. Súper intuitivo.", name: "Luis C.", store: "Electrónica", initial: "L" },
                { q: "Manejar las tallas era un caos en Instagram. Con el catálogo, si no hay talla 40, no la pueden pedir y punto. Te ahorra dolores de cabeza.", name: "Ana F.", store: "Calzado Deportivo", initial: "A" },
                { q: "Pagar $18.99 al mes se recupera con la primera venta que cierras rápido porque el cliente no tuvo que esperar a que le dieras el precio en bolívares.", name: "Carlos M.", store: "Minimarket", initial: "C" },
                // Duplicados perfectos para el scroll infinito
                { q: "Lo de la tasa BCV automática es un salvavidas. Antes perdía clientes por tardar en sacar la cuenta o daba el precio mal. Ahora compran solos.", name: "María P.", store: "Tienda de Ropa", initial: "M" },
                { q: "Los clientes me mandan el capture y el pedido llega al WhatsApp como un recibo de supermercado. Cero enredos de '¿qué talla querías?'.", name: "Jose D.", store: "Repuestos de Moto", initial: "J" },
                { q: "Creé la tienda el viernes en la noche, el sábado ya estaba vendiendo con las zonas de delivery configuradas. Súper intuitivo.", name: "Luis C.", store: "Electrónica", initial: "L" },
              ].map((testimonial, i) => (
                <div key={i} className={`w-[300px] md:w-[420px] shrink-0 bg-[#FAFAFA] border border-gray-200 rounded-[2rem] p-8 md:p-10 flex flex-col justify-between transition-all duration-300 md:hover:-translate-y-2 md:hover:bg-white md:hover:editorial-shadow min-h-[300px]`}>
                  <p className="text-base md:text-lg font-medium text-gray-700 leading-relaxed mb-8">
                    "{testimonial.q}"
                  </p>
                  <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
                    <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center font-bold text-white text-lg">
                      {testimonial.initial}
                    </div>
                    <div>
                      <p className="font-black text-sm uppercase tracking-widest text-gray-900">{testimonial.name}</p>
                      <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">{testimonial.store}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================
            7. FAQ SECCIÓN (ACORDEÓN SEDOSO)
        ========================================= */}
        <section id="faq" className="py-24 md:py-40 bg-[#FAFAFA] relative">
          <div className="max-w-7xl mx-auto px-4  bg-[#FAFAFA]md:px-6">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              <div className="lg:col-span-5 lg:sticky lg:top-32">
                <div className="inline-block bg-[#FAFAFA] text-gray-600 border border-gray-200 rounded-full px-4 py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-6 editorial-shadow">
                  Transparencia Total
                </div>
                <h2 className="text-[12vw] md:text-[5rem] lg:text-[6.5rem] font-black leading-[0.85] tracking-tighter uppercase text-gray-900">
                  Dudas. <br /> Resueltas.
                </h2>
                <p className="text-base md:text-xl font-medium text-gray-500 mt-6 md:mt-8 max-w-sm">
                  Sin letras pequeñas ni condiciones engañosas. Las reglas claras conservan las ventas.
                </p>
              </div>

              <div className="lg:col-span-7 flex flex-col bg-[#FAFAFA] border-t border-gray-200 mt-8 md:mt-0">
                <FaqItem question="¿Necesito tarjeta internacional?" answer="No. Sabemos cómo funciona el mercado venezolano. Puedes pagar tu suscripción mensual de $18.99 en Bolívares (Pago Móvil) o usando USDT (Binance)." />
                <FaqItem question="¿Cobran comisión por venta?" answer="Cero comisiones. Jamás tocaremos tu dinero. Pagas una tarifa plana al mes y puedes vender 10 o 10.000 productos. El 100% de la ganancia va directo a tus cuentas bancarias." />
                <FaqItem question="¿El dinero pasa por Preziso?" answer="Nunca. El cliente arma el carrito en nuestra plataforma, y el pedido se envía a tu WhatsApp. El cliente te paga directamente a ti (a tu Pago Móvil o tu Zelle)." />
                <FaqItem question="¿Hay límite de productos?" answer="No. Carga todo tu inventario, con todas sus variantes, tallas y colores. No te cobraremos extra por crecer." />
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* =========================================
          8. FOOTER POSTER (DARK MODE PREMIUM)
      ========================================= */}
      <footer className="bg-gray-950 text-white pt-5 md:pt-32 pb-8 px-4 md:px-6 relative mt-0 overflow-hidden">
        {/* Patrón sutil en fondo oscuro */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "0px" }} variants={elegantUp} className="flex flex-col items-center w-full">
            
            <p className="text-sm md:text-base font-bold text-[#00cd61] uppercase tracking-widest mb-8">
              ¿Listo para el siguiente nivel?
            </p>
            
            {/* BOTÓN CTA FINAL */}
            <Link href="/login" className="inline-flex items-center justify-center gap-3 bg-[#00cd61] text-gray-950 px-8 py-5 md:px-12 md:py-6 text-base md:text-xl font-bold uppercase tracking-widest rounded-full md:hover:bg-white transition-colors duration-300 editorial-press group shadow-[0_0_40px_rgba(0,205,97,0.3)] hover:shadow-[0_0_60px_rgba(0,205,97,0.5)] max-w-full text-center">
              Empezar por $18.99/mes <ArrowUpRight size={24} strokeWidth={3} className="md:group-hover:translate-x-1 md:group-hover:-translate-y-1 transition-transform" />
            </Link>

            <ul className="mt-12 flex flex-wrap justify-center items-center gap-6 md:gap-10">
              <li className="flex items-center gap-2 text-xs md:text-sm text-gray-400 font-bold uppercase tracking-widest"><Check size={16} strokeWidth={3} className="text-[#00cd61]" /> Sin Contratos</li>
              <li className="flex items-center gap-2 text-xs md:text-sm text-gray-400 font-bold uppercase tracking-widest"><Check size={16} strokeWidth={3} className="text-[#00cd61]" /> Productos Ilimitados</li>
              <li className="flex items-center gap-2 text-xs md:text-sm text-gray-400 font-bold uppercase tracking-widest"><Check size={16} strokeWidth={3} className="text-[#00cd61]" /> Cancela cuando quieras</li>
            </ul>
          </motion.div>
        </div>

        {/* =========================================
            NUEVA SECCIÓN: CONTACTO Y REDES SOCIALES
        ========================================= */}
        <div className="max-w-7xl mx-auto w-full relative z-10 mt-20 md:mt-28 flex flex-col md:flex-row items-center justify-between gap-10 border-t border-gray-900 pt-10">
          
          {/* Contacto Directo (Soporte y Teléfono) */}
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
            <a href="mailto:quanzosinc@gmail.com" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group">
              <div className="w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center group-hover:border-[#00cd61] transition-colors">
                <Mail size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[11px] md:text-xs font-bold uppercase tracking-widest">quanzosinc@gmail.com</span>
            </a>
            <a href="tel:+584145811936" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group">
              <div className="w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center group-hover:border-[#00cd61] transition-colors">
                <Phone size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[11px] md:text-xs font-bold uppercase tracking-widest">+58 (414) 581-1936</span>
            </a>
          </div>

          {/* Iconos de Redes Sociales */}
          <div className="flex items-center gap-4">
            <a href="#" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-950 hover:bg-[#00cd61] hover:border-[#00cd61] transition-all duration-300 editorial-press">
              <Instagram size={18} strokeWidth={2.5} />
            </a>
            <a href="#" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-950 hover:bg-[#00cd61] hover:border-[#00cd61] transition-all duration-300 editorial-press">
              <Twitter size={18} strokeWidth={2.5} />
            </a>
            <a href="#" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-950 hover:bg-[#00cd61] hover:border-[#00cd61] transition-all duration-300 editorial-press">
              <Facebook size={18} strokeWidth={2.5} />
            </a>
          </div>
        </div>

        {/* LOGO GIGANTE Y LEGALES */}
        <div className="mt-10 md:mt-24 border-t border-gray-900 pt-8 md:pt-12 w-full flex flex-col items-center relative z-10 overflow-hidden">
          
          {/* 🚀 NUEVO LOGO GIGANTE (IMAGE) */}
          <div className="w-[90vw] md:w-[80vw] max-w-[1400px] flex items-center justify-center opacity-20 md:hover:opacity-30 transition-opacity duration-500 select-none pointer-events-none mb-4 md:mb-8">
            <Image 
              src="/pezisologow.png" 
              alt="Preziso Logo Gigante" 
              width={1400} 
              height={400} 
              className="w-full h-auto object-contain"
            />
          </div>
          
          <div className="flex flex-col md:flex-row justify-between w-full max-w-7xl mt-5 mb-20 px-4 md:px-0 gap-6 text-center md:text-left text-gray-600">
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest">
              &copy; {new Date().getFullYear()} PREZISO INC. TODOS LOS DERECHOS RESERVADOS.
            </p>
            <div className="flex justify-center md:justify-end gap-8">
              <a href="#" className="text-[10px] md:text-xs font-bold uppercase tracking-widest md:hover:text-white transition-colors">Términos</a>
              <a href="#" className="text-[10px] md:text-xs font-bold uppercase tracking-widest md:hover:text-white transition-colors">Privacidad</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}