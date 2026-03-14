'use client'

import { useState } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import Link from 'next/link'
import { 
  ArrowUpRight, Menu, X, Plus, 
  Smartphone, Layers, RefreshCw, 
  Image as ImageIcon, Check
} from 'lucide-react'

// --- ESTILOS GLOBALES (EDITORIAL NEO-BRUTALISM + ACCENT COLOR) ---
const globalStyles = `
  body {
    background-color: #FFFFFF;
    color: #000000;
  }
  
  /* EL TOQUE MAESTRO: Selección de texto en Preziso Green (#00cd61) */
  ::selection {
    background-color: #00cd61;
    color: #000000;
  }
  
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  
  .text-outline {
    color: transparent;
    -webkit-text-stroke: 1.5px #000000;
  }
  @media (min-width: 768px) {
    .text-outline {
      -webkit-text-stroke: 2px #000000;
    }
  }
  .text-outline-white {
    color: transparent;
    -webkit-text-stroke: 1px #333333;
  }

  /* Animación para el Carrusel de Testimonios */
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(calc(-50% - 12px)); }
  }
  .animate-marquee {
    animation: marquee 40s linear infinite;
    will-change: transform;
  }
  .animate-marquee:hover {
    animation-play-state: paused;
  }
  
  /* Máscara de Desvanecimiento Lateral (Fade Edges) */
  .fade-edges {
    mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
    -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
  }
`

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

// --- COMPONENTE: FAQ ITEM (ACORDEÓN MINIMALISTA) ---
const FaqItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-gray-200">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full py-8 md:py-10 flex items-center justify-between text-left group active:scale-[0.99] transition-transform"
      >
        <span className="text-xl md:text-3xl font-black tracking-tight uppercase group-hover:text-[#00cd61] transition-colors pr-6">
          {question}
        </span>
        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full border border-black flex items-center justify-center shrink-0 transition-all duration-500 ${isOpen ? 'bg-[#00cd61] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black group-hover:bg-gray-100'}`}>
          <Plus className={`w-6 h-6 md:w-8 md:h-8 transition-transform duration-500 ${isOpen ? 'rotate-45' : 'rotate-0'}`} strokeWidth={2} />
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-10 text-gray-500 font-medium text-base md:text-lg leading-relaxed max-w-4xl">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- PASO 3: TIPOGRAFÍA CINÉTICA AL SCROLL ---
const ScrollFeatureWords = () => {
  const words = [
    { text: "CATÁLOGO", outline: false, align: "text-left md:ml-10" },
    { text: "MULTIMONEDA", outline: true, align: "text-left md:ml-20" },
    { text: "TASA BCV", outline: false, align: "text-right md:mr-20", color: "text-[#00cd61]" }, // Inyectamos color
    { text: "AUTOMÁTICA", outline: true, align: "text-right md:mr-10" },
    { text: "CERO", outline: false, align: "text-center md:-ml-32" },
    { text: "COMISIONES", outline: true, align: "text-center md:ml-32" },
  ]

  return (
    <section className="py-24 md:py-48 overflow-hidden">
      <div className="flex flex-col gap-1 md:gap-4 w-full">
        {words.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "0px" }} 
            transition={{ duration: 0.7, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className={`w-full px-4 md:px-6 ${item.align}`}
          >
            <span className={`text-[13vw] md:text-[8rem] lg:text-[9.5rem] font-black leading-[0.85] tracking-tighter uppercase whitespace-nowrap ${item.outline ? 'text-outline' : (item.color || 'text-black')}`}>
              {item.text}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// --- COMPONENTE: PLACEHOLDER DE IMAGEN ---
const ImagePlaceholder = ({ label, aspect = "aspect-[4/3]" }: { label: string, aspect?: string }) => (
  <div className={`w-full ${aspect} bg-gray-50 border border-gray-200 rounded-[2rem] md:rounded-[3rem] flex flex-col items-center justify-center text-gray-400 overflow-hidden relative group`}>
    <ImageIcon size={48} className="mb-3 opacity-30 group-hover:text-[#00cd61] group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" strokeWidth={1.5} />
    <span className="font-mono text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-400 z-10 group-hover:text-black transition-colors">{label}</span>
    <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-[2rem] md:rounded-[3rem] pointer-events-none"></div>
  </div>
)

export default function LandingClient() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white font-sans text-black overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

      {/* NAVBAR */}
      <div className="fixed top-4 md:top-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] md:w-[calc(100%-3rem)] max-w-7xl z-50">
        <header className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-full px-5 py-3 md:px-6 md:py-4 flex items-center justify-between shadow-sm">
          <Link href="/" className="font-black text-lg md:text-xl tracking-tighter uppercase flex items-center gap-1">
            PREZISO<span className="text-[#00cd61]">.</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#solucion" className="text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-[#00cd61] transition-colors">Solución</a>
            <a href="#demo" className="text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-[#00cd61] transition-colors">Plataforma</a>
            <a href="#faq" className="text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-[#00cd61] transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3 md:gap-5">
            <Link href="/login" className="hidden md:block text-[11px] font-bold uppercase tracking-widest text-gray-900 hover:text-[#00cd61] transition-colors">
              Ingresar
            </Link>
            <Link href="/login" className="bg-black text-white px-4 py-2.5 md:px-6 md:py-3 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-widest hover:bg-[#00cd61] hover:text-black transition-colors active:scale-95 flex items-center gap-1.5 group">
              Crear Tienda <ArrowUpRight size={14} strokeWidth={3} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
            <button className="md:hidden text-black p-1 hover:text-[#00cd61] transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>

        {/* MENÚ MÓVIL DESPLEGABLE */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute top-20 left-0 w-full bg-white border border-gray-200 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl"
            >
              <a href="#solucion" onClick={() => setMenuOpen(false)} className="text-3xl font-black uppercase tracking-tighter hover:text-[#00cd61]">Solución</a>
              <a href="#demo" onClick={() => setMenuOpen(false)} className="text-3xl font-black uppercase tracking-tighter hover:text-[#00cd61]">Plataforma</a>
              <a href="#faq" onClick={() => setMenuOpen(false)} className="text-3xl font-black uppercase tracking-tighter hover:text-[#00cd61]">Preguntas</a>
              <Link href="/login" className="text-xs font-bold uppercase tracking-widest text-[#00cd61] pt-6 border-t border-gray-100 mt-2">Ingresar a mi cuenta</Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <main>
        {/* MEGA HERO SECTION */}
        <section className="pt-32 md:pt-48 pb-16 md:pb-20 px-4 md:px-6 max-w-7xl mx-auto flex flex-col gap-10 md:gap-20 min-h-[90vh] justify-center">
          
          <div className="w-full">
            <motion.h1 initial="hidden" animate="visible" variants={fadeUp} className="text-[15vw] md:text-[8.5rem] lg:text-[9.5rem] font-black leading-[0.79] tracking-tighter uppercase text-black md:whitespace-normal">
              TU NEGOCIO <br className="hidden md:block"/> <span className="text-[#00cd61]">VENDE</span> <br/>
              PREZISO<br className="hidden md:block"/> CALCULA.
            </motion.h1>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-10 lg:gap-8 w-full">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="max-w-md w-full shrink-0">
              <p className="text-base md:text-xl font-medium text-gray-600 leading-relaxed mb-6 md:mb-8">
               Olvídate de actualizar tasas a mano y de los errores al cobrar. Automatiza el cambio de divisas de tu tienda y deja que las ventas fluyan sin pausas.
              </p>
              {/* BOTÓN HERO CON EL NUEVO COLOR */}
              <Link href="/login" className="inline-flex items-center justify-center gap-3 bg-[#00cd61] text-black px-6 py-3.5 md:px-8 md:py-5 rounded-full text-sm md:text-base font-black uppercase tracking-widest hover:bg-black hover:text-white border-2 border-black transition-all duration-300 active:scale-95 group shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-1 hover:translate-x-1">
                Crear Tienda Gratis <ArrowUpRight size={20} strokeWidth={3} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"/>
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="w-full lg:w-[55%] aspect-[4/3] md:aspect-[16/10] bg-gray-50 rounded-[2rem] md:rounded-[3rem] border border-gray-200 flex items-center justify-center relative overflow-hidden group">
              <ImageIcon size={48} className="text-gray-300 group-hover:text-[#00cd61] transition-colors duration-700" strokeWidth={1}/>
              <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-[2rem] md:rounded-[3rem] pointer-events-none"></div>
              <span className="absolute bottom-4 left-4 md:bottom-8 md:left-8 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-black bg-[#00cd61] px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Dashboard Preview
              </span>
            </motion.div>
          </div>
        </section>

        {/* SCROLL CINÉTICO */}
        <ScrollFeatureWords />

        {/* BENTO GRID BRUTALISTA (LA SOLUCIÓN) */}
        <section id="solucion" className="py-20 md:py-32 px-4 md:px-6 max-w-7xl mx-auto border-t border-gray-200">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "0px" }} variants={fadeUp} className="mb-12 md:mb-24">
            <h2 className="text-[12vw] md:text-[5rem] lg:text-[7rem] font-black leading-[0.85] tracking-tighter uppercase whitespace-nowrap md:whitespace-normal">
              Diseñado <br className="hidden md:block"/> para la realidad.
            </h2>
            <p className="text-base md:text-xl font-medium text-gray-500 mt-6 md:mt-8 max-w-2xl">
              Las plataformas gringas no entienden cómo se vende aquí. Nosotros sí. Esto es lo que resuelve Preziso.
            </p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "0px" }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            
            <motion.article variants={fadeUp} className="md:col-span-2 bg-gray-50 rounded-[2rem] md:rounded-[3rem] p-6 md:p-14 border border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 md:gap-20 group hover:border-[#00cd61] transition-colors duration-500">
              <div className="flex-1 flex flex-col items-start gap-6 md:gap-8 w-full">
                <div className="px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-black text-[9px] md:text-[10px] font-black uppercase tracking-widest text-black bg-[#00cd61]">
                  01 // Automatización
                </div>
                <div>
                  <h3 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-[0.9] mb-3 md:mb-4">Tasa BCV <br/> En Vivo.</h3>
                  <p className="text-gray-500 text-sm md:text-lg font-medium leading-relaxed max-w-md group-hover:text-black transition-colors">
                    Guarda tu inventario en dólares. El cliente ve el precio exacto en bolívares actualizado en tiempo real. Protege tu margen de ganancia sin mover un dedo.
                  </p>
                </div>
              </div>
              <div className="w-16 h-16 md:w-40 md:h-40 rounded-full bg-white border border-gray-200 group-hover:border-[#00cd61] group-hover:bg-[#00cd61] flex items-center justify-center shrink-0 group-hover:scale-105 transition-all duration-500">
                <RefreshCw className="w-6 h-6 md:w-12 md:h-12 text-black" strokeWidth={1.5} />
              </div>
            </motion.article>

            <motion.article variants={fadeUp} className="bg-gray-50 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 border border-gray-200 flex flex-col justify-between group hover:border-[#00cd61] transition-colors duration-500 min-h-[300px] md:min-h-[400px]">
              <div className="px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-black text-[9px] md:text-[10px] font-black uppercase tracking-widest text-black bg-[#00cd61] w-fit mb-8 md:mb-12">
                02 // Fricción Cero
              </div>
              <div>
                <Smartphone className="w-8 h-8 md:w-10 md:h-10 text-black mb-4 md:mb-6 group-hover:-translate-y-2 group-hover:text-[#00cd61] transition-all duration-500" strokeWidth={1.5} />
                <h3 className="text-2xl md:text-4xl font-black tracking-tighter uppercase leading-[0.9] mb-3 md:mb-4">Pedidos <br/> Directos.</h3>
                <p className="text-gray-500 text-sm md:text-base font-medium leading-relaxed">
                  Se acabaron los chats interminables. El cliente arma su carrito y te envía un ticket limpio y formateado directo a tu WhatsApp.
                </p>
              </div>
            </motion.article>

            <motion.article variants={fadeUp} className="bg-gray-50 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 border border-gray-200 flex flex-col justify-between group hover:border-[#00cd61] transition-colors duration-500 min-h-[300px] md:min-h-[400px]">
              <div className="px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-black text-[9px] md:text-[10px] font-black uppercase tracking-widest text-black bg-[#00cd61] w-fit mb-8 md:mb-12">
                03 // Control Total
              </div>
              <div>
                <Layers className="w-8 h-8 md:w-10 md:h-10 text-black mb-4 md:mb-6 group-hover:-translate-y-2 group-hover:text-[#00cd61] transition-all duration-500" strokeWidth={1.5} />
                <h3 className="text-2xl md:text-4xl font-black tracking-tighter uppercase leading-[0.9] mb-3 md:mb-4">Gestión de <br/> Variantes.</h3>
                <p className="text-gray-500 text-sm md:text-base font-medium leading-relaxed">
                  Tallas, colores y existencias precisas. Si se agota un modelo, desaparece de tu catálogo al instante sin tocar código.
                </p>
              </div>
            </motion.article>

          </motion.div>
        </section>

        {/* PASO 5: DEMO VISUAL */}
        <section id="demo" className="py-20 md:py-32 px-4 md:px-6 max-w-7xl mx-auto border-t border-gray-200">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "0px" }} variants={fadeUp} className="mb-12 md:mb-20 text-center">
            <h2 className="text-[12vw] md:text-[5rem] lg:text-[7rem] font-black leading-[0.85] tracking-tighter uppercase">
              La Experiencia.
            </h2>
            <p className="text-base md:text-xl font-medium text-gray-500 mt-4 md:mt-6">
              Diseñado para que tu cliente compre rápido, y tú administres en paz.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-12 gap-6 md:gap-8">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "0px" }} variants={fadeUp} className="lg:col-span-5 bg-gray-50 border border-gray-200 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 flex flex-col gap-6 md:gap-10">
              <div>
                <h3 className="text-2xl md:text-4xl font-black tracking-tighter uppercase leading-none mb-2">Lo que ve <br/>tu cliente.</h3>
                <p className="text-sm md:text-base text-gray-500 font-medium">Catálogo móvil ultrarrápido y sin fricción.</p>
              </div>
              <div className="flex-1 flex items-end justify-center">
                <div className="w-full max-w-[280px]">
                  <ImagePlaceholder label="App Móvil Cliente" aspect="aspect-[9/16]" />
                </div>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "0px" }} variants={fadeUp} className="lg:col-span-7 bg-gray-50 border border-gray-200 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 flex flex-col gap-6 md:gap-10">
              <div>
                <h3 className="text-2xl md:text-4xl font-black tracking-tighter uppercase leading-none mb-2">Lo que <br/>controlas tú.</h3>
                <p className="text-sm md:text-base text-gray-500 font-medium">Panel de administración web robusto y analítico.</p>
              </div>
              <div className="flex-1 w-full">
                <ImagePlaceholder label="Dashboard PC" aspect="aspect-[16/10]" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* SECCIÓN: SOCIAL PROOF */}
        <section className="py-24 md:py-32 bg-white border-t border-gray-200 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 mb-13 md:mb-20">
            <h2 className="text-[10vw] md:text-[5rem] lg:text-[7rem] font-black leading-[0.85] tracking-tighter uppercase md:whitespace-normal">
              Ellos ya <br className="hidden md:block"/> lo probaron.
            </h2>
          </div>

          <div className="w-full fade-edges pb-10">
            <div className="flex w-max gap-6 animate-marquee px-6">
              {[
                { q: "Lo de la tasa BCV automática es un salvavidas. Antes perdía clientes por tardar en sacar la cuenta o daba el precio mal. Ahora compran solos.", name: "María P.", store: "Tienda de Ropa", initial: "M" },
                { q: "Los clientes me mandan el capture y el pedido llega al WhatsApp como un recibo de supermercado. Cero enredos de '¿qué talla querías?'.", name: "Jose D.", store: "Repuestos de Moto", initial: "J" },
                { q: "Creé la tienda el viernes en la noche, el sábado ya estaba vendiendo con las zonas de delivery configuradas. Súper intuitivo.", name: "Luis C.", store: "Electrónica", initial: "L" },
                { q: "Manejar las tallas era un caos en Instagram. Con el catálogo, si no hay talla 40, no la pueden pedir y punto. Te ahorra dolores de cabeza.", name: "Ana F.", store: "Calzado Deportivo", initial: "A" },
                { q: "Pagar $10 al mes se recupera con la primera venta que cierras rápido porque el cliente no tuvo que esperar a que le dieras el precio en bolívares.", name: "Carlos M.", store: "Minimarket", initial: "C" },
                { q: "Lo de la tasa BCV automática es un salvavidas. Antes perdía clientes por tardar en sacar la cuenta o daba el precio mal. Ahora compran solos.", name: "María P.", store: "Tienda de Ropa", initial: "M" },
                { q: "Los clientes me mandan el capture y el pedido llega al WhatsApp como un recibo de supermercado. Cero enredos de '¿qué talla querías?'.", name: "Jose D.", store: "Repuestos de Moto", initial: "J" },
                { q: "Creé la tienda el viernes en la noche, el sábado ya estaba vendiendo con las zonas de delivery configuradas. Súper intuitivo.", name: "Luis C.", store: "Electrónica", initial: "L" },
                { q: "Manejar las tallas era un caos en Instagram. Con el catálogo, si no hay talla 40, no la pueden pedir y punto. Te ahorra dolores de cabeza.", name: "Ana F.", store: "Calzado Deportivo", initial: "A" },
                { q: "Pagar $10 al mes se recupera con la primera venta que cierras rápido porque el cliente no tuvo que esperar a que le dieras el precio en bolívares.", name: "Carlos M.", store: "Minimarket", initial: "C" },
              ].map((testimonial, i) => (
                <div 
                  key={i} 
                  className={`w-[320px] md:w-[450px] shrink-0 bg-gray-50 border border-gray-200 rounded-[2rem] p-8 md:p-10 flex flex-col justify-between transition-colors hover:border-[#00cd61] ${i % 2 !== 0 ? 'mt-8 md:mt-16' : ''}`}
                >
                  <p className="text-lg md:text-xl font-medium tracking-tight leading-snug mb-10 text-gray-900">
                    "{testimonial.q}"
                  </p>
                  <div className="flex items-center gap-4">
                    {/* INICIALES CON EL VERDE PREZISO */}
                    <div className="w-12 h-12 rounded-full bg-[#00cd61] border border-black flex items-center justify-center font-black text-black text-lg">
                      {testimonial.initial}
                    </div>
                    <div>
                      <p className="font-black text-sm uppercase tracking-widest text-black">{testimonial.name}</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">{testimonial.store}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECCIÓN: FAQ */}
        <section id="faq" className="py-24 md:py-32 bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-start">
              <div className="lg:col-span-5 sticky top-32">
                <h2 className="text-[10vw] md:text-[5rem] lg:text-[6.5rem] font-black leading-[0.85] tracking-tighter uppercase">
                  Dudas. <br/> Resueltas.
                </h2>
                <p className="text-base md:text-lg font-medium text-gray-500 mt-6 max-w-sm">
                  Transparencia total. Sin letras pequeñas ni condiciones engañosas.
                </p>
              </div>
              
              <div className="lg:col-span-7 flex flex-col border-t border-gray-200">
                <FaqItem question="¿Necesito tarjeta internacional?" answer="No. Sabemos cómo funciona el mercado venezolano. Puedes pagar tu suscripción mensual de $10 en Bolívares (Pago Móvil) o usando USDT (Binance)." />
                <FaqItem question="¿Cobran comisión por venta?" answer="Cero comisiones. Jamás tocaremos tu dinero. Pagas una tarifa plana al mes y puedes vender 10 o 10.000 productos. El 100% de la ganancia va directo a tus cuentas bancarias." />
                <FaqItem question="¿El dinero pasa por Preziso?" answer="Nunca. El cliente arma el carrito en nuestra plataforma, y el pedido se envía a tu WhatsApp. El cliente te paga directamente a ti (a tu Pago Móvil o tu Zelle)." />
                <FaqItem question="¿Hay límite de productos?" answer="No. Carga todo tu inventario, con todas sus variantes, tallas y colores. No te cobraremos extra por crecer." />
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-black text-white pt-24 md:pt-32 pb-8 px-4 md:px-6 mt-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "0px" }} variants={fadeUp}>
            <p className="text-sm md:text-base font-bold text-[#00cd61] uppercase tracking-widest mb-6">¿Listo para el siguiente nivel?</p>
            <Link href="/login" className="inline-flex items-center justify-center gap-3 bg-[#00cd61] text-black px-8 py-4 md:px-12 md:py-6 rounded-full text-base md:text-xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all duration-300 group shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-none">
              Empezar por $10/mes <ArrowUpRight size={24} strokeWidth={3} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"/>
            </Link>
            
            <ul className="mt-8 flex flex-wrap justify-center items-center gap-4 md:gap-8">
              <li className="flex items-center gap-2 text-xs md:text-sm text-gray-400 font-medium"><Check size={14} className="text-[#00cd61]"/> Sin Contratos</li>
              <li className="flex items-center gap-2 text-xs md:text-sm text-gray-400 font-medium"><Check size={14} className="text-[#00cd61]"/> Productos Ilimitados</li>
              <li className="flex items-center gap-2 text-xs md:text-sm text-gray-400 font-medium"><Check size={14} className="text-[#00cd61]"/> Cancela cuando quieras</li>
            </ul>
          </motion.div>
        </div>

       
        {/* LOGO GIGANTE EN EL FOOTER */}
        <div className="mt-24 md:mt-40 border-t border-[#222] pt-8 md:pt-12 w-full flex flex-col items-center">
          <h2 className="footer-logo text-[20vw] font-black leading-none tracking-tighter uppercase w-full text-center overflow-hidden cursor-default">
            PREZISO.
          </h2>
          <div className="flex flex-col md:flex-row justify-between w-full max-w-7xl mt-8 px-4 md:px-0 gap-4 text-center md:text-left">
            <p className="text-[10px] md:text-xs text-gray-600 font-bold uppercase tracking-widest">
              &copy; {new Date().getFullYear()} PREZISO INC. TODOS LOS DERECHOS RESERVADOS.
            </p>
            <div className="flex justify-center md:justify-end gap-6">
              <a href="#" className="text-[10px] md:text-xs text-gray-600 font-bold uppercase tracking-widest hover:text-[#00cd61] transition-colors">Términos</a>
              <a href="#" className="text-[10px] md:text-xs text-gray-600 font-bold uppercase tracking-widest hover:text-[#00cd61] transition-colors">Privacidad</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}