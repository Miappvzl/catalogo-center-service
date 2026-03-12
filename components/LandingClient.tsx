'use client'

import { useState } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import Link from 'next/link'
import { 
  ArrowUpRight, Menu, X, 
  Smartphone, Layers, RefreshCw, 
  Image as ImageIcon, Check
} from 'lucide-react'

// --- ESTILOS GLOBALES (EDITORIAL NEO-BRUTALISM) ---
const globalStyles = `
  body {
    background-color: #FFFFFF;
    color: #000000;
    ::selection {
      background-color: #000000;
      color: #FFFFFF;
    }
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

// --- PASO 3: TIPOGRAFÍA CINÉTICA AL SCROLL (CORREGIDA PARA MÓVIL) ---
const ScrollFeatureWords = () => {
  const words = [
    { text: "CATÁLOGO", outline: false, align: "text-left md:ml-10" },
    { text: "MULTIMONEDA", outline: true, align: "text-left md:ml-20" },
    { text: "TASA BCV", outline: false, align: "text-right md:mr-20" },
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
            viewport={{ once: true, margin: "0px" }} // MARGEN 0 PARA ASEGURAR ANIMACIÓN EN MÓVIL
            transition={{ duration: 0.7, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className={`w-full px-4 md:px-6 ${item.align}`}
          >
            <span className={`text-[13vw] md:text-[8rem] lg:text-[9.5rem] font-black leading-[0.85] tracking-tighter uppercase whitespace-nowrap ${item.outline ? 'text-outline' : 'text-black'}`}>
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
    <ImageIcon size={48} className="mb-3 opacity-30 group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
    <span className="font-mono text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-400 z-10">{label}</span>
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
          <Link href="/" className="font-black text-lg md:text-xl tracking-tighter uppercase">
            PREZISO.
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#solucion" className="text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors">Solución</a>
            <a href="#demo" className="text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors">Plataforma</a>
            <a href="#faq" className="text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3 md:gap-5">
            <Link href="/login" className="hidden md:block text-[11px] font-bold uppercase tracking-widest text-gray-900 hover:text-gray-500 transition-colors">
              Ingresar
            </Link>
            {/* BOTÓN RESPONSIVO: Más pequeño en móvil */}
            <Link href="/register" className="bg-black text-white px-4 py-2.5 md:px-6 md:py-3 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-widest hover:bg-white hover:text-black border-2 border-transparent hover:border-black transition-all active:scale-95 flex items-center gap-1.5 group">
              Crear Tienda <ArrowUpRight size={14} strokeWidth={3} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
            <button className="md:hidden text-black p-1" onClick={() => setMenuOpen(!menuOpen)}>
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
              <a href="#solucion" onClick={() => setMenuOpen(false)} className="text-3xl font-black uppercase tracking-tighter">Solución</a>
              <a href="#demo" onClick={() => setMenuOpen(false)} className="text-3xl font-black uppercase tracking-tighter">Plataforma</a>
              <a href="#faq" onClick={() => setMenuOpen(false)} className="text-3xl font-black uppercase tracking-tighter">Preguntas</a>
              <Link href="/login" className="text-xs font-bold uppercase tracking-widest text-gray-500 pt-6 border-t border-gray-100 mt-2">Ingresar a mi cuenta</Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <main>
        {/* MEGA HERO SECTION */}
        <section className="pt-32 md:pt-48 pb-16 md:pb-20 px-4 md:px-6 max-w-7xl mx-auto flex flex-col gap-10 md:gap-20 min-h-[90vh] justify-center">
          
          <div className="w-full">
            <motion.h1 initial="hidden" animate="visible" variants={fadeUp} className="text-[15vw] md:text-[8.5rem] lg:text-[9.5rem] font-black leading-[0.85] tracking-tighter uppercase text-black md:whitespace-normal">
              VENDE EN <br className="hidden md:block"/> <span className="text-gray-300">DÓLARES.</span> <br/>
              COBRA EN <br className="hidden md:block"/> BOLÍVARES.
            </motion.h1>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-10 lg:gap-8 w-full">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="max-w-md w-full shrink-0">
              <p className="text-base md:text-xl font-medium text-gray-600 leading-relaxed mb-6 md:mb-8">
                El catálogo inteligente diseñado para Venezuela. Conecta tu tienda al BCV y recibe pedidos exactos en WhatsApp.
              </p>
              {/* BOTÓN HERO RESPONSIVO */}
              <Link href="/register" className="inline-flex items-center justify-center gap-3 bg-black text-white px-6 py-3.5 md:px-8 md:py-5 rounded-full text-sm md:text-base font-bold uppercase tracking-widest hover:bg-white hover:text-black border-2 border-transparent hover:border-black transition-all duration-300 active:scale-95 group">
                Crear Tienda Gratis <ArrowUpRight size={20} strokeWidth={3} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"/>
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="w-full lg:w-[55%] aspect-[4/3] md:aspect-[16/10] bg-gray-50 rounded-[2rem] md:rounded-[3rem] border border-gray-200 flex items-center justify-center relative overflow-hidden group">
              <ImageIcon size={48} className="text-gray-300 group-hover:scale-110 transition-transform duration-700" strokeWidth={1}/>
              <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-[2rem] md:rounded-[3rem] pointer-events-none"></div>
              <span className="absolute bottom-4 left-4 md:bottom-8 md:left-8 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-gray-900 bg-white/90 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-gray-200 shadow-sm">
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
            
            <motion.article variants={fadeUp} className="md:col-span-2 bg-gray-50 rounded-[2rem] md:rounded-[3rem] p-6 md:p-14 border border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 md:gap-20 group hover:border-black transition-colors duration-500">
              <div className="flex-1 flex flex-col items-start gap-6 md:gap-8 w-full">
                <div className="px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-gray-300 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-gray-900 bg-white">
                  01 // Automatización
                </div>
                <div>
                  <h3 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-[0.9] mb-3 md:mb-4">Tasa BCV <br/> En Vivo.</h3>
                  <p className="text-gray-500 text-sm md:text-lg font-medium leading-relaxed max-w-md">
                    Guarda tu inventario en dólares. El cliente ve el precio exacto en bolívares actualizado en tiempo real. Protege tu margen de ganancia sin mover un dedo.
                  </p>
                </div>
              </div>
              <div className="w-16 h-16 md:w-40 md:h-40 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-500">
                <RefreshCw className="w-6 h-6 md:w-12 md:h-12 text-black" strokeWidth={1.5} />
              </div>
            </motion.article>

            <motion.article variants={fadeUp} className="bg-gray-50 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 border border-gray-200 flex flex-col justify-between group hover:border-black transition-colors duration-500 min-h-[300px] md:min-h-[400px]">
              <div className="px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-gray-300 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-gray-900 bg-white w-fit mb-8 md:mb-12">
                02 // Fricción Cero
              </div>
              <div>
                <Smartphone className="w-8 h-8 md:w-10 md:h-10 text-black mb-4 md:mb-6 group-hover:-translate-y-2 transition-transform duration-500" strokeWidth={1.5} />
                <h3 className="text-2xl md:text-4xl font-black tracking-tighter uppercase leading-[0.9] mb-3 md:mb-4">Pedidos <br/> Directos.</h3>
                <p className="text-gray-500 text-sm md:text-base font-medium leading-relaxed">
                  Se acabaron los chats interminables. El cliente arma su carrito y te envía un ticket limpio y formateado directo a tu WhatsApp.
                </p>
              </div>
            </motion.article>

            <motion.article variants={fadeUp} className="bg-gray-50 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 border border-gray-200 flex flex-col justify-between group hover:border-black transition-colors duration-500 min-h-[300px] md:min-h-[400px]">
              <div className="px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-gray-300 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-gray-900 bg-white w-fit mb-8 md:mb-12">
                03 // Control Total
              </div>
              <div>
                <Layers className="w-8 h-8 md:w-10 md:h-10 text-black mb-4 md:mb-6 group-hover:-translate-y-2 transition-transform duration-500" strokeWidth={1.5} />
                <h3 className="text-2xl md:text-4xl font-black tracking-tighter uppercase leading-[0.9] mb-3 md:mb-4">Gestión de <br/> Variantes.</h3>
                <p className="text-gray-500 text-sm md:text-base font-medium leading-relaxed">
                  Tallas, colores y existencias precisas. Si se agota un modelo, desaparece de tu catálogo al instante sin tocar código.
                </p>
              </div>
            </motion.article>

          </motion.div>
        </section>

        {/* PASO 5: DEMO VISUAL (EL SHOWCASE COLOSAL) */}
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
            
            {/* Tarjeta Cliente (Vertical) */}
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

            {/* Tarjeta Admin (Horizontal) */}
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

      </main>

      {/* PASO 6: FOOTER MAGNÉTICO E INVERTIDO (NEGRO PURO) */}
      <footer className="bg-black text-white pt-24 md:pt-32 pb-8 px-4 md:px-6 mt-20 relative overflow-hidden">
        {/* Patrón de puntos sutil oscuro */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "0px" }} variants={fadeUp}>
            <p className="text-sm md:text-base font-bold text-gray-400 uppercase tracking-widest mb-6">¿Listo para el siguiente nivel?</p>
            <Link href="/register" className="inline-flex items-center justify-center gap-3 bg-white text-black px-8 py-4 md:px-12 md:py-6 rounded-full text-base md:text-xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all duration-300 group">
              Empezar por $10/mes <ArrowUpRight size={24} strokeWidth={3} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"/>
            </Link>
            
            <ul className="mt-8 flex flex-wrap justify-center items-center gap-4 md:gap-8">
              <li className="flex items-center gap-2 text-xs md:text-sm text-gray-400 font-medium"><Check size={14} className="text-white"/> Sin Contratos</li>
              <li className="flex items-center gap-2 text-xs md:text-sm text-gray-400 font-medium"><Check size={14} className="text-white"/> Productos Ilimitados</li>
              <li className="flex items-center gap-2 text-xs md:text-sm text-gray-400 font-medium"><Check size={14} className="text-white"/> Cancela cuando quieras</li>
            </ul>
          </motion.div>
        </div>

        {/* LOGO GIGANTE EN EL FOOTER */}
        <div className="mt-24 md:mt-40 border-t border-[#222] pt-8 md:pt-12 w-full flex flex-col items-center">
          <h2 className="text-[20vw] font-black leading-none tracking-tighter uppercase text-outline-white w-full text-center overflow-hidden">
            PREZISO.
          </h2>
          <div className="flex flex-col md:flex-row justify-between w-full max-w-7xl mt-8 px-4 md:px-0 gap-4 text-center md:text-left">
            <p className="text-[10px] md:text-xs text-gray-600 font-bold uppercase tracking-widest">
              &copy; {new Date().getFullYear()} PREZISO INC. TODOS LOS DERECHOS RESERVADOS.
            </p>
            <div className="flex justify-center md:justify-end gap-6">
              <a href="#" className="text-[10px] md:text-xs text-gray-600 font-bold uppercase tracking-widest hover:text-white transition-colors">Términos</a>
              <a href="#" className="text-[10px] md:text-xs text-gray-600 font-bold uppercase tracking-widest hover:text-white transition-colors">Privacidad</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}