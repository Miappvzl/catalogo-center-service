'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useSpring, AnimatePresence, useMotionValue } from 'framer-motion'
import {
  AlertCircle,
  MessageSquare,
  Calculator,
  XCircle,
  Zap,
  ArrowRightLeft,
  ShoppingBag, Wallet, MessageCircle, CheckCircle2, SlidersHorizontal, Activity, Check, ArrowUpRight,
  Minus,
  Plus,
  Flame,
  X,
  ImageIcon,
  Search,
  ShoppingCart,
  Instagram,
  Twitter,
  InstagramIcon,
  TwitterIcon,
  Menu,
  PackageSearch,
  ClipboardCheck,
  Settings2,
  LayoutDashboard,
  Database,
  Lock
} from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import Link from 'next/link'
import HeroAnimatedLogo from './HeroAnimatedLogo'

/**
 * UTILIDADES DE ESTILO ATÓMICO
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// =========================================
// COMPONENTE: SMART NAVBAR (PRECISION BAR)
// =========================================

const FloatingNavbar = ({ bcvRate }: { bcvRate: number }) => {
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)


  // Control de ocultamiento al hacer scroll (se desactiva si el menú móvil está abierto)
  useEffect(() => {
    const controlNavbar = () => {
      if (isMobileMenuOpen) return;
      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }
      setLastScrollY(window.scrollY)
    }
    window.addEventListener('scroll', controlNavbar)
    return () => window.removeEventListener('scroll', controlNavbar)
  }, [lastScrollY, isMobileMenuOpen])

  // Bloquear scroll cuando el menú móvil está abierto
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const navLinks = [
    { name: 'Funciones', href: '#funciones' },
    { name: 'POS', href: '#pos' },
    { name: 'ADN Visual', href: '#adn' },
    { name: 'Precios', href: '#precios' }
  ]

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    setIsMobileMenuOpen(false)
    const element = document.querySelector(href)
    if (element) {
      // Pequeño delay para permitir que el menú móvil se cierre antes de hacer scroll
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    }
  }

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: isVisible ? 0 : -100 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className="fixed top-0 left-0 right-0 z-[100] px-4 md:px-4 py-3 flex justify-center"
      >
        <div className="w-full max-w-7xl bg-white/40 backdrop-blur-xl rounded-full px-4 md:px-6 py-3 flex items-center justify-between shadow-[0_10px_13px_rgba(0,0,0,0.1)]">

          {/* Logo Inyectado */}
          <div className="flex items-center">
            <a className="flex items-center group active:scale-95 transition-transform" href="/">
              <img
                alt="Preziso Logo"
                width="auto"
                height="20px"
                className="h-10 md:h-12 w-auto object-contain brightness-0"
                src="/pezisologo.png"
              />
            </a>
          </div>

          {/* Links Centrales (Desktop) */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="text-[10px] font-mono text-slate-500 uppercase tracking-widest hover:text-zinc-900 transition-colors"
              >
                {item.name}
              </a>
            ))}
          </div>

          {/* Widgets & CTAs */}
          <div className="flex items-center gap-3 md:gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1  rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse" />
              <span className="text-[12px] font-mono text-zinc-700 uppercase tracking-tighter">BCV: {bcvRate}</span>
            </div>

            <Link
              href="/login"
              className="group flex items-center gap-2   px-6 md:px-10 py-3 rounded-full text-zinc-900/80 font-black uppercase tracking-[0.2em] text-[10px] md:text-xs transition-all duration-300 hover:bg-black hover:text-white active:scale-95"
            >

              <span>Crear Tienda</span>
              <ArrowUpRight size={16} className="text-zinc-900/80 group-hover:text-white transition-colors" />

            </Link>

            {/* Menú Hamburguesa (Mobile) */}
            <button
              className="md:hidden p-2 text-zinc-900 active:scale-95 transition-transform"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Menú Desplegable Móvil (Pantalla Completa) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: "-100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "-100%" }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-0 z-[110] bg-white/95 backdrop-blur-3xl flex flex-col px-6 py-8"
          >
            {/* Header del Menú Móvil */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-6 mb-8">
              <img alt="Preziso Logo" className="h-15 w-auto object-contain brightness-0" src="/pezisologo.png" />
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3 bg-white/10 rounded-full text-zinc-900 active:scale-95"
              >
                <X size={20} />
              </button>
            </div>

            {/* Links Móviles con Animación en Cascada */}
            <div className="flex flex-col gap-6 mt-8">
              {navLinks.map((item, i) => (
                <motion.a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i, duration: 0.5, ease: "easeOut" }}
                  className="text-4xl font-medium tracking-tighter text-slate-500 hover:text-zinc-900 uppercase transition-colors flex items-center justify-between border-b border-slate-200 pb-4"
                >
                  {item.name}
                  <ArrowUpRight size={24} className="opacity-0 hover:opacity-100 transition-opacity" />
                </motion.a>
              ))}
            </div>

            {/* Footer Móvil */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-auto pb-8"
            >
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-100/50 border border-slate-200 rounded-2xl justify-center mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Tasa BCV Activa: {bcvRate} Bs</span>
              </div>
              <button className="w-full bg-black text-zinc-900 py-4 rounded-full text-xs font-black uppercase tracking-widest active:scale-95 flex justify-center items-center gap-2">
                Crear Tienda ahora <ArrowUpRight size={16} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}



// =========================================
// NODO 0: LA INICIALIZACIÓN (PRE-LOADER & HERO)
// =========================================

const NodeZeroHero = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })

  // Transformaciones para el efecto de "Emerge del Vacío"
  const y = useTransform(scrollYProgress, [0, 1], [0, -100])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95])


  return (
    <section
      ref={containerRef}
      className="relative h-[110vh] w-full bg-white flex flex-col items-center justify-start overflow-hidden"
    >

      <motion.div
        style={{ y, opacity, scale }}
        className="sticky top-0 h-screen w-full flex flex-col items-center justify-center px-6"
      >

        <div className="max-w-7xl w-full text-center flex flex-col items-center">

          {/* 1. EL NÚCLEO SEO INVISIBLE (Neuromarketing para Google) 
              La clase 'sr-only' oculta el texto de la interfaz pero lo deja 100% visible para los bots de SEO y lectores de pantalla. */}
          <h1 className="sr-only">
            Preziso Commerce: Plataforma SaaS de E-commerce y Punto de Venta (POS) multimoneda sincronizada con el BCV en Venezuela.
          </h1>

          {/* Inyección del ADN Visual (Logo Animado GPU-Accelerated) */}
          <HeroAnimatedLogo className="text-zinc-900 drop-shadow-sm" />

          {/* 2. TENSIÓN VISUAL AJUSTADA 
              Cambiamos 'mt-12' por un margen negativo '-mt-8' o 'mt-0' para absorber el espacio muerto del SVG y juntar el texto de manera precisa. */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 1 }}
            className="-mt-3 md:-mt-8 flex flex-col items-center gap-8 relative z-10"
          >
            <p className="text-slate-500 font-mono text-[10px] md:text-xs uppercase tracking-[0.4em] max-w-lg leading-relaxed">
              Tu tienda. Multimoneda. Sincronizada al BCV. Domina el caos de vender en Venezuela con un ecosistema de punto de venta y e-commerce. <br />
            </p>

            {/* NUEVO BOTÓN CTA PRINCIPAL (Diseño Flat / Sin Sombras) */}
            <div className="mt-4 flex flex-col items-center gap-4">
              <Link
                href="/admin"
                className="group flex items-center gap-3 bg-white border border-black px-8 md:px-10 py-4 rounded-full text-black font-black uppercase tracking-[0.2em] text-[10px] md:text-xs transition-all duration-300 hover:bg-black hover:text-white active:scale-95"
              >
                <span>Crear tienda gratis</span>
                <ArrowUpRight
                  size={18}
                  strokeWidth={2.5}
                  className="text-black  group-hover:text-white transition-all duration-300 group-hover:translate-x-1"
                />
              </Link>

              {/* Micro-texto de confianza para acompañar el botón */}
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                No requiere tarjeta de crédito
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Grid de Fondo Dinámico (Ruido de Fondo) */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_transparent_80%)]" />
      </div>
    </section>
  )
}

// =========================================
// NODO 0.5: ECOSISTEMA Y SOCIAL PROOF (EL IMPACTO DE CONFIANZA)
// =========================================

// =========================================
// NODO 0.5: ECOSISTEMA OMNICANAL (AUTORIDAD TÉCNICA)
// =========================================

const NodeTrustEcosystem = () => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Coordenadas del cursor
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Física ajustada: Masa más pesada, rigidez mínima, amortiguación alta
  const springConfig = { damping: 40, stiffness: 40, mass: 1 }

  // Rotación ultra sutil (de 6deg a 3deg)
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], ["3deg", "-3deg"]), springConfig)
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], ["-3deg", "3deg"]), springConfig)

  // Desplazamiento Paralaje recortado para máxima elegancia
  const laptopTranslateX = useSpring(useTransform(mouseX, [-0.5, 0.5], ["-5px", "5px"]), springConfig)
  const laptopTranslateY = useSpring(useTransform(mouseY, [-0.5, 0.5], ["-5px", "5px"]), springConfig)

  const phoneTranslateX = useSpring(useTransform(mouseX, [-0.5, 0.5], ["-15px", "15px"]), springConfig)
  const phoneTranslateY = useSpring(useTransform(mouseY, [-0.5, 0.5], ["-15px", "15px"]), springConfig)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const clientX = e.clientX - rect.left
    const clientY = e.clientY - rect.top
    const xPct = clientX / width - 0.5
    const yPct = clientY / height - 0.5
    mouseX.set(xPct)
    mouseY.set(yPct)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative mb-32 w-full bg-white border-t border-slate-200 py-32 overflow-hidden flex flex-col items-center justify-center min-h-[110vh]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#f8fafc_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">

        {/* COLUMNA IZQUIERDA: Copy de Atracción */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: "-100px" }}
          className="flex flex-col items-start w-full lg:w-[25%] relative z-20"
        >
          <span className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest border border-slate-200 px-3 py-1.5 rounded-full mb-6 bg-white/50 backdrop-blur-sm shadow-sm">
            <Database size={12} className="text-black" /> Ecosistema Omnicanal
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-zinc-900 leading-[0.9] mb-6 uppercase">
            Tu inventario.<br />
            Tu caja.<br />
            Una sola plataforma.
          </h2>

          <p className="sr-only">
            Punto de Venta (POS) y tienda online (E-commerce) para Venezuela. Facturación en divisas y bolívares sincronizada al instante.
          </p>

          <Link href="/admin" className="mt-4 flex items-center gap-3 bg-zinc-900 text-white px-6 py-3.5 rounded-full text-xs font-bold uppercase tracking-widest hover:scale-95 transition-all shadow-[0_10px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_15px_25px_rgba(0,0,0,0.15)] group">
            Iniciar Despliegue <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </motion.div>

        {/* CENTRO: Composición Dual (Laptop + iPhone) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          viewport={{ once: true, margin: "-100px" }}

          className="w-full lg:w-[50%] h-[400px] md:h-[600px] flex justify-center items-center relative z-30 perspective-[1200px]"
        >
          <motion.div
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="relative w-full h-full max-w-[600px] will-change-transform flex items-center justify-center"
          >
            {/* 1. LAPTOP (Fondo/Izquierda) */}
            <motion.div
              // Gravedad cero: Oscila en el eje Y suavemente
              animate={{ y: [-5, 5, -5] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              style={{ x: laptopTranslateX, y: laptopTranslateY, z: -50 }}
              className="absolute left-0 top-[10%] w-[85%] drop-shadow-[0_40px_40px_rgba(0,0,0,0.2)] will-change-transform"
            >
              <img
                src="/mockup-laptop.webp"
                alt="Dashboard Administrativo Preziso"
                className="w-full h-auto object-contain"
              />
            </motion.div>

            {/* 2. IPHONE (Frente/Derecha) */}
            <motion.div
              // Gravedad cero asíncrona: Oscila en dirección opuesta y a otra velocidad
              animate={{ y: [8, -8, 8] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
              style={{ x: phoneTranslateX, y: phoneTranslateY, z: 100 }}
              className="absolute right-[5%] bottom-[5%] w-[32%] drop-shadow-[0_50px_50px_rgba(0,0,0,0.4)] will-change-transform"
            >
              <img
                src="/mockup-iphone.webp"
                alt="POS Móvil Preziso"
                className="w-full h-auto object-contain"
              />
            </motion.div>

          </motion.div>
        </motion.div>

      {/* COLUMNA DERECHA: Autoridad Técnica (Pagos Globales) */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          viewport={{ once: true, margin: "-100px" }}
          className="flex flex-col items-start lg:items-end w-full lg:w-[25%] relative z-20 text-left lg:text-right mt-16 lg:mt-0"
        >
          <p className="text-slate-500 text-sm leading-relaxed mb-8 font-light max-w-[280px]">
            Olvida los cuadernos, el Excel y los descuadres de caja. Preziso unifica tus ventas físicas y digitales, automatizando el caos multimoneda para que te enfoques en escalar.
          </p>
          
          {/* Tarjeta Dark Luxury - PayPal Nativo (Cero bordes, cero líneas) */}
          <div className="flex flex-col items-start p-7 bg-[#050505] rounded-[1.5rem] w-full max-w-[280px] group transition-all duration-500 hover:bg-[#0a0a0a] shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
            
            {/* Header Técnico */}
            <div className="flex items-center gap-2.5 mb-6">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800/50 group-hover:bg-zinc-800 transition-colors">
                <Lock size={10} className="text-zinc-300" />
              </div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                Pasarela Nativa
              </span>
            </div>
            
            {/* Logo Typográfico (Sustituye por el SVG oficial de PayPal si lo deseas) */}
            <div className="mb-4">
              <span className="text-3xl font-black italic text-white tracking-tighter opacity-90 group-hover:opacity-100 transition-opacity">
                PayPal
              </span>
            </div>
            
            {/* Titular de Conversión */}
            <span className="text-xl font-black text-white leading-tight tracking-tighter mb-4 uppercase">
              Pagos Globales.<br />Cero Fricción.
            </span>
            
            {/* Copy de Valor (Con espacio negativo en lugar de líneas divisorias) */}
            <span className="text-xs font-mono text-zinc-500 leading-relaxed text-left mt-2">
              Procesa pagos internacionales en piloto automático. Liquidez directa a tu cuenta, sin intermediarios.
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
// =========================================
// NODO 1: LA FRICCIÓN (EL TERROR DEL CIERRE DE CAJA)
// =========================================

const NodeOneFriction = () => {
  const targetRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"]
  })

  const chaosScale = useTransform(scrollYProgress, [0, 0.4, 0.6], [0.8, 1.2, 0.9])
  const chaosRotate = useTransform(scrollYProgress, [0, 1], [-10, 10])
  const blurValue = useTransform(scrollYProgress, [0, 0.2, 0.5], ["0px", "4px", "0px"])

  const StressFragment = ({ icon: Icon, label, pos, rotStart, rotEnd }: { icon: any, label: string, pos: string, rotStart: number, rotEnd: number }) => (
    <motion.div
      style={{ rotate: useTransform(scrollYProgress, [0, 1], [rotStart, rotEnd]) }}
      className={cn("absolute p-4 bg-slate-100/50 border border-red-500/30 backdrop-blur-sm rounded-lg flex items-center gap-3 z-20 shadow-xl", pos)}
    >
      <Icon size={18} className="text-red-500 animate-pulse" />
      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">{label}</span>
    </motion.div>
  )

  return (
    <section id="pos" ref={targetRef} className="relative min-h-[200vh] w-full bg-white py-40 flex flex-col items-center border-t border-slate-200">
      <div className="sticky top-1/2 -translate-y-1/2 z-10 text-center max-w-4xl px-6">
        <motion.span
          style={{ opacity: useTransform(scrollYProgress, [0, 0.2], [0, 1]) }}
          className="text-black font-mono text-[10px] tracking-[0.5em] uppercase mb-6 block"
        >
          El Mostrador y el WhatsApp están desconectados
        </motion.span>

        <motion.h2
          style={{ scale: chaosScale, filter: `blur(${blurValue})` }}
          className="text-5xl md:text-8xl font-medium tracking-tighter text-zinc-900 leading-[0.9] uppercase"
        >
          EL TERROR DEL <br />
          <span className="text-zinc-700 italic">CIERRE DE CAJA.</span>
        </motion.h2>

        <motion.div
          style={{ opacity: useTransform(scrollYProgress, [0.3, 0.5], [0, 1]) }}
          className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 text-left border-t border-slate-200 pt-12"
        >
          <div className="space-y-4">
            <h4 className="text-zinc-900 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <Calculator size={14} className="text-black" /> Descuadre Multimoneda
            </h4>
            <p className="text-slate-500 text-sm leading-relaxed font-light">
              Cobras en efectivo, das vuelto en bolívares, anotas en un cuaderno y al final del día la caja no cuadra. Cada minuto sumando billetes es tiempo que pierdes de hacer crecer tu negocio.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-zinc-900 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag size={14} className="text-black" /> Inventario Fantasma
            </h4>
            <p className="text-slate-500 text-sm leading-relaxed font-light">
              Vendes la última franela en tu mostrador físico, pero alguien te la compra por Instagram 5 minutos después. Preziso sincroniza tu Punto de Venta (POS) y tu E-commerce en el mismo segundo.
            </p>
          </div>
        </motion.div>
      </div>

      <StressFragment icon={AlertCircle} label="Descuadre de $15 en caja" pos="top-[10%] left-[5%] md:left-[15%]" rotStart={15} rotEnd={-10} />
      <StressFragment icon={XCircle} label="Vendiste algo que ya no tienes" pos="top-[30%] right-[5%] md:right-[20%]" rotStart={-12} rotEnd={18} />
      <StressFragment icon={MessageSquare} label="Cliente se fue por esperar la tasa" pos="bottom-[40%] left-[10%] md:left-[25%]" rotStart={8} rotEnd={-15} />
      <StressFragment icon={Calculator} label="Tasa BCV cambió a las 2PM" pos="bottom-[15%] right-[10%] md:right-[15%]" rotStart={-20} rotEnd={5} />

      <motion.div
        style={{ opacity: useTransform(scrollYProgress, [0, 0.5, 1], [0, 0.4, 0]), rotate: chaosRotate }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-black/10 rounded-full blur-[120px] pointer-events-none"
      />
    </section>
  )
}


// =========================================
// NODO 2: LA SINGULARIDAD (TASA BCV INTERACTIVA)
// =========================================

const NodeTwoSingularity = ({ bcvRate }: { bcvRate: number }) => {
  const [usdValue, setUsdValue] = useState(150)
  const bsValue = (usdValue * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"]
  })

  const scaleUp = useTransform(scrollYProgress, [0, 1], [0.8, 1])
  const opacityIn = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section id="funciones" ref={containerRef} className="relative min-h-screen w-full bg-slate-50/50 flex items-center justify-center py-32 border-t border-slate-200 overflow-hidden">

      {/* Luz de Fondo del Núcleo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-black/10 rounded-full blur-[150px] pointer-events-none" />

      <motion.div
        style={{ scale: scaleUp, opacity: opacityIn }}
        className="w-full max-w-6xl px-6 relative z-10 flex flex-col items-center"
      >
        <span className="text-[10px] font-mono text-black uppercase tracking-[0.5em] mb-4">Prueba Empírica Interactiva</span>
        <h2 className="text-4xl md:text-6xl font-medium tracking-tighter text-zinc-900 uppercase text-center mb-16">
          El fin del cálculo manual.
        </h2>

        {/* El Motor de Conversión */}
        <div className="w-full bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-8 md:p-16 shadow-[0_0_50px_rgba(0,0,0,0.03)] relative overflow-hidden group">

          {/* Grid de Fondo de la UI */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:20px_20px]" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">

            {/* Lado USD (Input) */}
            <div className="w-full md:w-5/12 flex flex-col items-center md:items-start">
              <span className="text-slate-500 font-mono text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" /> Valor de tu producto (USD)
              </span>
              <div className="text-6xl md:text-8xl font-light text-zinc-900 tracking-tighter flex items-center gap-2">
                <span className="text-zinc-600">$</span>
                <motion.span>{usdValue}</motion.span>
              </div>

              {/* Slider Táctico */}
              <div className="w-full mt-10 relative">
                <input
                  type="range"
                  min="5"
                  max="1000"
                  value={usdValue}
                  onChange={(e) => setUsdValue(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-crosshair outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white transition-all"
                />
                <div className="flex justify-between mt-4 text-[10px] font-mono text-zinc-600">
                  <span>Arrastra para simular</span>
                  <span>Tasa actual: {bcvRate} Bs</span>
                </div>
              </div>
            </div>

            {/* Conector Central */}
            <div className="hidden md:flex flex-col items-center justify-center relative">
              <div className="h-24 w-[1px] bg-gradient-to-b from-transparent via-slate-300 to-transparent relative overflow-hidden">
                <motion.div
                  animate={{ y: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="absolute top-0 left-0 w-full h-1/2 bg-white"
                />
              </div>
              <div className="w-10 h-10 border border-slate-300 bg-white flex items-center justify-center my-4 rotate-45 group-hover:rotate-0 transition-transform duration-700">
                <ArrowRightLeft size={16} className="text-black -rotate-45 group-hover:rotate-0 transition-transform duration-700" />
              </div>
              <div className="h-24 w-[1px] bg-gradient-to-b from-transparent via-slate-300 to-transparent relative overflow-hidden">
                <motion.div
                  animate={{ y: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear", delay: 0.5 }}
                  className="absolute top-0 left-0 w-full h-1/2 bg-white"
                />
              </div>
            </div>

            {/* Lado Bs (Output Automatizado) */}
            <div className="w-full md:w-5/12 flex flex-col items-center md:items-end">
              <span className="text-black font-mono text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                Lo que ve tu cliente (Bs) <div className="w-2 h-2 rounded-full bg-black animate-ping" />
              </span>
              <div className="text-5xl md:text-8xl font-light text-zinc-900 tracking-tighter flex items-center gap-2">
                <span className="text-black">Bs</span>
                {/* Re-renderización instantánea para simular velocidad de DB */}
                <motion.span
                  key={bsValue}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {bsValue}
                </motion.span>
              </div>
              <p className="mt-10 text-xs text-slate-500 font-mono text-right max-w-[250px]">
                Preziso intercepta la variación del BCV y reescribe tu base de datos global en &lt; 400ms. Cero intervención humana requerida.
              </p>
            </div>

          </div>
        </div>
      </motion.div>
    </section>
  )
}
// =========================================
// NODO 3: EL CENTRO DE COMANDO (DUAL-ARCH)
// =========================================

const NodeThreeCommandCenter = () => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Capturamos el progreso global de la sección
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  })

  const features = [
    {
      title: "Visión de Rayos X",
      desc: "Controla tu flujo de caja en USD y Bs, monitorea pedidos por despachar y visualiza ingresos netos en tiempo real. Cero cuadernos, cero errores.",
      icon: LayoutDashboard,
      color: "#000000",
      image: "/image_948a1a.webp" // Dashboard Administrativo
    },
    {
      title: "Precios Inteligentes",
      desc: "Fija precios base y márgenes. Preziso reescribe tus etiquetas en Bs al vuelo siguiendo el BCV. Sincronización total en menos de 400ms.",
      icon: Settings2,
      color: "#000000",
      image: "/image_9486b6.webp" // Gestión de Precios
    },
    {
      title: "Stock Milimétrico",
      desc: "Gestión avanzada de variantes. Recibe alertas de stock crítico y controla cada talla y color con una interfaz diseñada para la velocidad.",
      icon: PackageSearch,
      color: "#000000",
      image: "/image_9482ba.webp" // Control de Inventario
    },
    {
      title: "Ecosistema B2B",
      desc: "Gestiona tu red de promotores y presupuestos. Liquida comisiones y convierte cotizaciones en ventas con un solo clic.",
      icon: ClipboardCheck,
      color: "#000000",
      image: "/image_942cbe.webp" // Gestión de Presupuestos
    }
  ]

  // Mapeo de opacidades para sincronizar imágenes y textos
  const opacities = features.map((_, i) => {
    const start = i / features.length
    const end = (i + 1) / features.length
    return useTransform(scrollYProgress, [start, start + 0.1, end - 0.1, end], [0, 1, 1, 0])
  })

  return (
    <section id="adn" ref={containerRef} className="relative min-h-[400vh] bg-white border-t border-slate-200">

      {/* EL CONTENEDOR STICKY: Mantiene la UI visible mientras se recorren los 400vh */}
      <div className="sticky top-0 h-screen w-full flex items-center overflow-hidden">

        <div className="max-w-7xl mx-auto w-full px-6 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-32">

          {/* COLUMNA IZQUIERDA: TEXTOS (Desktop: Separado / Mobile: Overlay) */}
          <div className="relative z-20 w-full lg:w-5/12 h-[250px] lg:h-[450px]">

            {/* Capa de textos superpuestos (Mantiene la experiencia Mobile que te gustó) */}
            <div className="relative w-full h-full">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  style={{ opacity: opacities[i] }}
                  className="absolute inset-0 flex flex-col justify-center"
                >
                  <div className="flex flex-col gap-6 lg:gap-8">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: `${f.color}20`, border: `1px solid ${f.color}40` }}
                    >
                      <f.icon style={{ color: f.color }} size={24} />
                    </div>
                    <div>
                      <h3 className="text-4xl lg:text-6xl font-black tracking-tighter text-zinc-900 uppercase leading-[0.85] mb-6">
                        {f.title}
                      </h3>
                      <p className="text-slate-500 text-sm lg:text-xl leading-relaxed max-w-md font-light">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* BARRA DE PROGRESO LATERAL (Solo Desktop - Ajustada con -left-16 para dar aire) */}
            <div className="hidden lg:flex absolute -left-16 top-0 bottom-0 flex-col justify-center gap-6">
              {features.map((_, i) => {
                const height = useTransform(
                  scrollYProgress,
                  [i / features.length, (i + 1) / features.length],
                  ["20px", "60px"]
                )
                const color = useTransform(scrollYProgress, [i / features.length, (i + 1) / features.length], ["#e2e8f0", "#000000"]
                )
                return (
                  <motion.div
                    key={i}
                    style={{ height, backgroundColor: color }}
                    className="w-1.5 rounded-full transition-all duration-300"
                  />
                )
              })}
            </div>
          </div>

          {/* COLUMNA DERECHA: MOCKUP DE PANEL ADMINISTRATIVO */}
          <div className="relative z-10 w-full lg:w-7/12 flex justify-center lg:justify-end">
            <div className="relative aspect-[16/10] w-full max-w-[700px] rounded-2xl lg:rounded-[2.5rem] overflow-hidden border border-slate-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]">

              {/* Reflejo de cristal superior */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/5 z-10 pointer-events-none" />

              {/* Renderizado de Capturas (Stack) */}
              {features.map((f, i) => (
                <motion.img
                  key={i}
                  src={f.image}
                  style={{ opacity: opacities[i] }}
                  className="absolute inset-0 w-full h-full object-cover will-change-opacity"
                  alt={f.title}
                />
              ))}

              {/* Glow Dinámico que reacciona al módulo activo */}
              {features.map((f, i) => (
                <motion.div
                  key={`glow-${i}`}
                  style={{ opacity: useTransform(opacities[i], [0, 1], [0, 0.15]) }}
                  className="absolute -inset-20 blur-[150px] -z-10 pointer-events-none transition-colors duration-700"
                  animate={{ backgroundColor: f.color }}
                />
              ))}
            </div>

            {/* Indicador de Navegación Mobile */}
            <div className="lg:hidden absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
              {features.map((_, i) => {
                const scale = useTransform(opacities[i], [0, 1], [0.8, 1.3])
                const bg = useTransform(opacities[i], [0, 1], ["#cbd5e1", "#000000"])
                return <motion.div key={i} style={{ scale, backgroundColor: bg }} className="w-2.5 h-2.5 rounded-full" />
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

// IMPORTACIONES ADICIONALES NECESARIAS (Asegúrate de tenerlas arriba)
// import { useMotionValue, useSpring } from 'framer-motion'
// import { ShoppingBag, ArrowRight, Wallet, MessageCircle, CheckCircle2 } from 'lucide-react'

// =========================================
// NODO 4: INTERFAZ NEURAL (MOCKUP 3D INTERACTIVO)
// =========================================

const NodeFourNeural = ({ bcvRate }: { bcvRate: number }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Físicas de interacción magnética
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { damping: 20, stiffness: 100, mass: 0.5 }
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], ["15deg", "-15deg"]), springConfig)
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], ["-15deg", "15deg"]), springConfig)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const clientX = e.clientX - rect.left
    const clientY = e.clientY - rect.top
    const xPct = clientX / width - 0.5
    const yPct = clientY / height - 0.5
    mouseX.set(xPct)
    mouseY.set(yPct)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <section className="relative min-h-[120vh] w-full bg-white py-40 overflow-hidden flex flex-col items-center border-t border-slate-200">

      {/* Texto Estructural */}
      <div className="max-w-7xl px-6 relative z-20 w-full text-center mb-20 pointer-events-none">
        <span className="text-[10px] font-mono text-black uppercase tracking-[0.5em] mb-6 block">Fricción Cero en Front-End</span>
        <h2 className="text-4xl md:text-7xl font-medium tracking-tighter text-zinc-900 uppercase leading-[0.9]">
          Experiencia <br />
          <span className="text-zinc-600">Magnética.</span>
        </h2>
      </div>

      {/* Contenedor del Dispositivo 3D */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full max-w-[400px] h-[750px] flex items-center justify-center perspective-[2000px] cursor-crosshair z-10"
      >
        <motion.div
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="relative w-[340px] h-[700px] bg-white rounded-[3rem] border-[8px] border-slate-200 shadow-[0_0_50px_rgba(0,0,0,0.06)] p-2 will-change-transform"
        >
          {/* Muesca del teléfono */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-200 rounded-b-2xl z-50 flex items-center justify-center">
            <div className="w-16 h-1.5 bg-white rounded-full" />
          </div>

          {/* 🚀 CLON EXACTO DE TU PRODUCT MODAL INYECTANDO TUS VARIABLES CSS */}
          <div
            className="w-full h-full rounded-[2.5rem] overflow-hidden relative flex flex-col bg-[var(--store-bg)] font-sans"
            // 🚀 COLORES POR DEFECTO EXTRAÍDOS DE page.tsx
            style={{
              '--store-bg': '#ffffff',
              '--store-surface': '#ffffff',
              '--store-border': '#d5d6d7b3',
              '--store-text-main': '#111111',
              '--store-surface-text': '#6b7280',
              '--store-primary': '#000000',
              '--store-primary-text': '#ffffff',
              '--store-incentive': '#059669',
            } as React.CSSProperties}
          >
            {/* Fake Store Header */}
            <div className="absolute top-6 left-0 right-0 z-40 flex justify-between items-center px-6 pointer-events-none">

              <div className="bg-[var(--store-surface)]/80 p-2 rounded-full backdrop-blur-md border border-[var(--store-border)]">
                <X size={16} className="text-[var(--store-text-main)]" />
              </div>
            </div>

            {/* 1. Área de Imagen (Top) */}
            <div className="w-full h-[45%] bg-[var(--store-bg)] relative flex items-center justify-center border-b border-[var(--store-border)] shrink-0 group overflow-hidden">

              {/* Gradiente de fondo */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[var(--store-primary)]/10 to-transparent" />

              {/* Texto "P." (Cambiado a absolute para que no mueva la imagen) */}
              <span className="absolute text-6xl font-black text-[var(--store-border)] transition-transform duration-700 ease-out group-hover:scale-110 pointer-events-none select-none">
                P.
              </span>

              {/* TU IMAGEN PNG CENTRADA */}
              <img
                src="hoodietitanio.webp"
                alt="Product"
                className="h-4/5 w-auto object-contain z-10 transition-transform duration-500 group-hover:scale-105"
              />

              {/* Dots del carrusel */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                <div className="h-1.5 rounded-full transition-all duration-300 bg-[var(--store-primary)] w-4" />
                <div className="h-1.5 rounded-full transition-all duration-300 bg-[var(--store-border)] w-1.5" />
                <div className="h-1.5 rounded-full transition-all duration-300 bg-[var(--store-border)] w-1.5" />
              </div>

            </div>


            {/* 2. Área de Contenido (Scrollable) */}
            <div className="w-full h-[55%] flex flex-col relative bg-[var(--store-surface)]">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-[140px]">

                {/* Títulos y Precios */}
                <div>
                  <span className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest leading-none mb-2 block">Streetwear</span>
                  <h2 className="text-2xl font-black text-[var(--store-text-main)] leading-tight tracking-tight">Hoodie Titanio</h2>

                  {/* Nudge simulado */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="text-[var(--store-incentive)] bg-[var(--store-incentive)]/10 px-2.5 py-1.5 rounded-md text-[11px] font-bold tracking-wide flex items-center gap-1.5">
                      <Flame size={14} className="text-[var(--store-incentive)]" />
                      Ahorra $5.00 pagando en USD
                    </span>
                  </div>

                  <div className="flex items-end gap-3 mt-6">
                    <span className="text-4xl font-black tracking-tighter leading-none text-[var(--store-text-main)] transition-colors">
                      ${bcvRate > 0 ? (10).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '---'}
                    </span>
                    <span className="text-sm font-bold text-[var(--store-surface-text)] mb-1">
                      {bcvRate > 0 ? ` ${(10 * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs` : 'Calculando tasa...'}
                    </span>
                  </div>
                </div>

                {/* Variantes - Simulación de Selección */}
                <div className="space-y-6 pb-4">
                  {/* Componente de Color */}
                  <div className="space-y-3 p-3 -mx-3 rounded-2xl border border-transparent">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest">1. Color</span>
                      <span className="text-xs font-bold text-[var(--store-text-main)]">Onyx Black</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button className="relative flex items-center justify-center overflow-hidden w-10 h-10 rounded-full border border-1 ring-[var(--store-primary)] border-[var(--store-primary)] ring-offset-2 scale-110 bg-[#1A1A1A]">
                        <Check size={16} className="text-zinc-900 mix-blend-difference" strokeWidth={3} />
                      </button>
                      <button className="relative flex items-center justify-center overflow-hidden w-10 h-10 rounded-full border border-3 hover:scale-105 border-[var(--store-border)] bg-[#E5E5E5]"></button>
                    </div>
                  </div>

                  {/* Componente de Talla */}
                  <div className="space-y-3 p-3 -mx-3 rounded-2xl border border-transparent">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest block">2. Talla</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="relative min-w-[3rem] px-3 py-2.5 rounded-lg text-xs font-bold border transition-all overflow-hidden bg-[var(--store-surface)] text-[var(--store-text-main)] border-[var(--store-border)] hover:border-[var(--store-primary)]">S</button>
                      <button className="relative min-w-[3rem] px-3 py-2.5 rounded-lg text-xs font-bold border transition-all overflow-hidden bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[var(--store-primary)]">M</button>
                      <button className="relative min-w-[3rem] px-3 py-2.5 rounded-lg text-xs font-bold border transition-all overflow-hidden bg-[var(--store-surface)] text-[var(--store-text-main)] border-[var(--store-border)] hover:border-[var(--store-primary)]">L</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Footer Absoluto con Glassmorphism */}
              <div className="absolute bottom-0 left-0 right-0 w-full p-4 bg-[var(--store-surface)]/85 backdrop-blur-2xl border-t border-[var(--store-border)] z-20 flex flex-col gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="flex gap-3">
                  {/* Controles QTY */}
                  <div className="flex items-center rounded-full p-1 border-1 border-[var(--store-border)] shrink-0 bg-[var(--store-bg)]/50">
                    <button className="w-10 h-10 flex items-center justify-center text-[var(--store-text-main)]">
                      <Minus size={16} strokeWidth={2.5} />
                    </button>
                    <span className="font-bold text-sm w-8 text-center text-[var(--store-text-main)]">1</span>
                    <button className="w-10 h-10 flex items-center justify-center text-[var(--store-text-main)]">
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* CTA Principal */}
                  <button className="flex-1 rounded-full font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 bg-[var(--store-primary)] text-[var(--store-primary-text)] shadow-lg shadow-[var(--store-primary)]/20 cursor-pointer">
                    <ShoppingBag size={18} className="pointer-events-none mb-0.5 shrink-0" />
                    <span>Agregar</span>
                  </button>
                </div>

                {/* Contacto WhatsApp */}
                <button className="w-full py-2 text-[8px] font-bold uppercase tracking-widest text-[var(--store-surface-text)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                  <MessageCircle size={12} /> Tengo una duda sobre este artículo
                </button>
              </div>

            </div>
          </div>
        </motion.div>

        {/* Halo Magnético Reactivo */}
        <motion.div
          style={{
            x: useTransform(mouseX, [-0.5, 0.5], [-50, 50]),
            y: useTransform(mouseY, [-0.5, 0.5], [-50, 50]),
          }}
          className="absolute inset-0 bg-slate-200/50 blur-[100px] -z-10 rounded-full"
        />
      </div>
    </section>
  )
}
// =========================================
// NODO 5: PAGOS MIXTOS (EL SUPERPODER MULTIMONEDA)
// =========================================

const NodeFiveExtraction = ({ bcvRate }: { bcvRate: number }) => {
  const remainingUsd = 10;
  // Si bcvRate llega como undefined, esto genera el NaN
  const remainingBs = (remainingUsd * bcvRate).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const targetRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "center center"]
  })




  return (
    <section ref={targetRef} className="relative min-h-screen w-full bg-slate-50 py-40 border-t border-slate-200 overflow-hidden flex flex-col items-center">
      <div className="max-w-7xl px-6 relative z-10 w-full text-center mb-32">
        <span className="text-[10px] font-mono text-black uppercase tracking-[0.5em] mb-6 block">Fricción Cero en el Mostrador</span>
        <h2 className="text-4xl md:text-7xl font-medium tracking-tighter text-zinc-900 uppercase leading-[0.9]">
          Pagos Mixtos <br />
          <span className="text-zinc-600">Sin Calculadora.</span>
        </h2>
        <p className="mt-8 max-w-2xl mx-auto text-slate-500 text-sm md:text-base leading-relaxed">
          ¿Tu cliente quiere pagar una parte en un billete de $20, mandarte un Zelle de $15 y el resto exacto en Pago Móvil? Preziso lo procesa, lo calcula y lo factura en 1 segundo.
        </p>
      </div>

      <div className="relative w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-12 px-6">

        {/* Simulación del Split Payment de Preziso */}
        <div className="w-full md:w-1/2 bg-white border border-slate-200 rounded-[2rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.03)] relative z-20">
          <div className="flex justify-between items-end mb-8 border-b border-slate-200 pb-4">
            <span className="text-sm font-bold uppercase text-zinc-900">Total a Pagar</span>
            <span className="text-4xl font-light text-zinc-900">$45.00</span>
          </div>

          <div className="space-y-4">
            {/* Input Efectivo */}
            <div className="flex items-center justify-between bg-slate-100/50 p-4 rounded-xl border border-slate-200 group">
              <div className="flex items-center gap-3">
                <Wallet size={18} className="text-emerald-500" />
                <span className="text-xs font-bold text-slate-600 uppercase">Efectivo USD</span>
              </div>
              <span className="text-lg text-zinc-900 font-mono">$20.00</span>
            </div>

            {/* Input Zelle */}
            <div className="flex items-center justify-between bg-slate-100/50 p-4 rounded-xl border border-slate-200 group">
              <div className="flex items-center gap-3">
                <ArrowRightLeft size={18} className="text-purple-500" />
                <span className="text-xs font-bold text-slate-600 uppercase">Zelle</span>
              </div>
              <span className="text-lg text-zinc-900 font-mono">$15.00</span>
            </div>

            {/* Restante Automático Pago Móvil */}
            <div className="flex items-center justify-between bg-black/10 p-4 rounded-xl border border-slate-300 relative overflow-hidden">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-black/10 blur-xl"
              />
              <div className="flex items-center gap-3 relative z-10">
                <Activity size={18} className="text-black" />
                <span className="text-xs font-bold text-black uppercase">Restante Pago Móvil</span>
              </div>
              <div className="text-right relative z-10">
                <span className="block text-lg text-zinc-900 font-mono">$10.00</span>
                <span className="block text-[10px] text-black font-mono mt-1">Ref: Bs {remainingBs}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Factura Final */}
        <motion.div
          initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}
          className="w-full md:w-1/3 bg-white border border-emerald-200 rounded-2xl p-6 relative shadow-[0_0_50px_rgba(34,197,94,0.05)] z-20 mt-10 md:mt-0"
        >
          <div className="absolute -top-4 -left-4 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)]">
            <CheckCircle2 size={20} className="text-black" />
          </div>

          <span className="text-[10px] font-mono text-green-500 uppercase tracking-widest mb-4 block">Cierre Perfecto</span>

          <div className="space-y-3 font-mono text-xs text-slate-500">
            <p className="text-zinc-900 font-bold">TICKET #9024</p>
            <p>--------------------</p>
            <p className="flex justify-between"><span>Efectivo:</span> <span>$20.00</span></p>
            <p className="flex justify-between"><span>Zelle:</span> <span>$15.00</span></p>
            <p className="flex justify-between text-green-400"><span>Pago Móvil:</span> <span>Bs {remainingBs}</span></p>
            <p>--------------------</p>
            <p className="text-zinc-900">Inventario descontado (-1)</p>
            <p className="text-zinc-900">Caja cuadrada automáticamente.</p>
          </div>
        </motion.div>

      </div>
    </section>
  )
}

// =========================================
// NODO 6: MUTACIÓN ESTÉTICA EN VIVO (CLON REAL DE TIENDA)
// =========================================

const NodeSixMutation = ({ bcvRate }: { bcvRate: number }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"]
  })

  const [storeColors, setStoreColors] = useState({
    primary: '#000000',
    primary_text: '#ffffff',
    background: '#f8fafc',
    text_main: '#0a0a0a',
    surface: '#ffffff',
    surface_text: '#64748b',
    border: '#e2e8f0',
    incentive: '#0f172a'
  })

  const handleColorChange = (key: keyof typeof storeColors, value: string) => {
    setStoreColors(prev => ({ ...prev, [key]: value }))
  }

  // 2. MOCK DATA ESTÁTICA
  // Se añade el campo 'image' para mapear dinámicamente los PNG
  const mockProducts = [
    {
      id: 1, name: 'Hoodie Titanio Heavyweight', category: 'Streetwear',
      usd_cash_price: 45, usd_penalty: 5, compare_at_usd: 60, isPromo: true,
      image: '/hoodietitanio.webp' // Reemplaza con la ruta de tu PNG
    },
    {
      id: 2, name: 'Cargo Techwear Minimal', category: 'Pants',
      usd_cash_price: 35, usd_penalty: 0, compare_at_usd: 0, isPromo: false,
      image: '/minimalcargo.webp' // Reemplaza con la ruta de tu PNG
    }
  ];

  const LandingColorInput = ({ label, valueKey, value }: { label: string, valueKey: keyof typeof storeColors, value: string }) => {
    const safeHexValue = value.length > 7 ? value.substring(0, 7) : value;

    return (
      <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-white transition-colors">
        <span className="font-mono text-[10px] md:text-xs text-slate-500 uppercase tracking-widest">{label}</span>
        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-slate-300 shadow-sm shrink-0 cursor-pointer group">
          <input
            type="color"
            value={safeHexValue}
            onChange={(e) => handleColorChange(valueKey, e.target.value)}
            className="absolute -inset-2 w-12 h-12 cursor-pointer scale-150"
          />
        </div>
      </div>
    )
  }

  return (
    <section id="adn" ref={containerRef} className="relative min-h-screen w-full bg-slate-50 py-32 overflow-hidden flex flex-col items-center border-t border-slate-200">

      <motion.div
        animate={{ backgroundColor: `${storeColors.primary}15` }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 blur-[150px] pointer-events-none"
      />

      <div className="max-w-7xl px-6 relative z-10 w-full text-center mb-16">
        <span className="text-[10px] font-mono text-black uppercase tracking-[0.5em] mb-6 block">Control de ADN Visual</span>
        <h2 className="text-4xl md:text-7xl font-medium tracking-tighter text-zinc-900 uppercase leading-[0.9]">
          Muta en <br />
          <span className="text-zinc-600">Milisegundos.</span>
        </h2>
        <p className="mt-8 max-w-2xl mx-auto text-slate-500 text-sm md:text-base leading-relaxed">
          Tu marca no se adapta a Preziso; Preziso muta para convertirse en tu marca. Altera la topología visual de tu nodo de ventas sin tocar una sola línea de código, usando nuestro motor de variables dinámicas CSS.
        </p>
      </div>

      <div className="w-full max-w-6xl px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">

        {/* PANEL IZQUIERDO: CONTROLES DE ADMIN */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="flex items-center gap-3 text-zinc-900 border-b border-slate-200 pb-4">
            <h3 className="text-sm font-bold uppercase tracking-widest">Panel de Apariencia Real</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1">Bloque 1: Identidad</span>
              <LandingColorInput label="Color Principal" valueKey="primary" value={storeColors.primary} />
              <LandingColorInput label="Texto sobre Principal" valueKey="primary_text" value={storeColors.primary_text} />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1">Bloque 2: Estructura</span>
              <LandingColorInput label="Fondo Global" valueKey="background" value={storeColors.background} />
              <LandingColorInput label="Color de Cajas (Surface)" valueKey="surface" value={storeColors.surface} />
              <LandingColorInput label="Bordes y Líneas" valueKey="border" value={storeColors.border} />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1">Bloque 3: Tipografía y Conversión</span>
              <LandingColorInput label="Texto Principal" valueKey="text_main" value={storeColors.text_main} />
              <LandingColorInput label="Texto Secundario" valueKey="surface_text" value={storeColors.surface_text} />
              <LandingColorInput label="Incentivos y Ahorro" valueKey="incentive" value={storeColors.incentive} />
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: STOREFRONT PREVIEW */}
        <div className="lg:col-span-7 flex justify-center">
          <motion.div
            className="w-full max-w-md h-[700px] overflow-y-auto no-scrollbar rounded-[2rem] border shadow-2xl flex flex-col font-sans transition-colors duration-500 will-change-transform"
            style={{
              borderColor: storeColors.border,
              backgroundColor: storeColors.background,
              '--store-primary': storeColors.primary,
              '--store-primary-text': storeColors.primary_text,
              '--store-bg': storeColors.background,
              '--store-text-main': storeColors.text_main,
              '--store-surface': storeColors.surface,
              '--store-surface-text': storeColors.surface_text,
              '--store-border': storeColors.border,
              '--store-incentive': storeColors.incentive,
            } as React.CSSProperties}
          >
            {/* Header */}
            <div className="bg-[var(--store-bg)] px-4 md:px-6 py-4 flex items-center justify-between border-b border-[var(--store-border)] shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--store-surface)] rounded-full flex items-center justify-center text-[var(--store-surface-text)] border border-[var(--store-border)] shadow-sm transition-colors duration-500">
                  <ShoppingBag size={18} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-base md:text-lg font-black text-[var(--store-text-main)] tracking-tight leading-none transition-colors duration-500">QUANZOS.</h1>
                  <span className="text-[9px] uppercase font-bold tracking-[0.15em] mt-1 text-[var(--store-surface-text)] transition-colors duration-500">Tienda Oficial</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 shrink-0 transition-colors duration-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--store-surface-text)] transition-colors duration-500">Tasa BCV</span>
                </div>
                <div className="h-3 w-[1px] bg-[var(--store-border)] transition-colors duration-500"></div>
                <span className="font-mono text-xs font-bold tracking-tight text-[var(--store-text-main)] transition-colors duration-500">{bcvRate}</span>
              </div>
            </div>

            {/* Navbar & Categories */}
            <div className="bg-[var(--store-bg)] border-b border-[var(--store-border)] pt-4 pb-4 px-4 md:px-6 shrink-0 transition-colors duration-500">
              <div className="flex gap-4 items-center mb-4">
                <div className="relative flex-1 w-full group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--store-surface-text)] transition-colors duration-500" size={16} strokeWidth={2} />
                  <input disabled placeholder="Buscar producto..." className="w-full bg-[var(--store-surface)] border border-[var(--store-border)] rounded-full pl-11 pr-4 py-3 text-sm font-medium placeholder:text-[var(--store-surface-text)] transition-colors duration-500" />
                </div>
                <div className="shrink-0 w-11 h-11">
                  <button className="relative p-3 rounded-full border transition-colors duration-500 bg-[var(--store-surface)] text-[var(--store-surface-text)] border-[var(--store-border)]">
                    <ShoppingCart size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                <button className="px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-colors duration-500 border bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[var(--store-primary)]">Todos</button>
                <button className="px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-colors duration-500 border bg-[var(--store-surface)] text-[var(--store-surface-text)] border-[var(--store-border)]">Streetwear</button>
              </div>
            </div>

            {/* Product Grid */}
            <div className="p-4 md:p-6 grid grid-cols-2 gap-4 bg-[var(--store-bg)] transition-colors duration-500">
              {mockProducts.map((product) => {
                const listPrice = product.usd_cash_price + product.usd_penalty;
                const priceInBs = listPrice * bcvRate;
                const activeCompareAt = product.compare_at_usd > listPrice ? product.compare_at_usd : listPrice;
                const promoPercent = product.isPromo ? Math.round(((activeCompareAt - listPrice) / activeCompareAt) * 100) : 0;

                return (
                  <div key={product.id} className="w-full group flex flex-col relative transition-transform duration-300 ease-out hover:-translate-y-1.5">

                    {/* Image Container Modificado */}
                    <div className="relative w-full bg-[var(--store-surface)] overflow-hidden rounded-[10px] aspect-[4/5] flex items-center justify-center transition-colors duration-500">

                      {/* NUEVA ETIQUETA DE IMAGEN */}
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105 mix-blend-multiply"
                      />

                      {product.isPromo && (
                        <div className="absolute top-2 right-2 z-10 bg-red-600 text-zinc-900 text-[10px] font-black px-2 py-1 rounded-lg tracking-widest shadow-sm">
                          -{promoPercent}%
                        </div>
                      )}
                    </div>

                    {/* Content Container */}
                    <div className="flex flex-col flex-1 pt-3 pb-1">
                      <h3 className="text-xs md:text-sm font-bold text-[var(--store-text-main)] tracking-tight leading-snug line-clamp-2 mb-2 min-h-[2.4em] transition-colors duration-500">
                        {product.name}
                      </h3>

                      <div className="flex-1 flex flex-col justify-end gap-2 mt-auto">
                        <div className="flex items-end justify-between gap-2 pt-3 transition-colors duration-500">
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {product.isPromo && (
                                <span className="text-[10px] font-bold text-[var(--store-surface-text)] line-through decoration-[var(--store-border)] transition-colors duration-500">
                                  ${activeCompareAt.toFixed(2)}
                                </span>
                              )}
                              <span className={`text-sm font-black leading-none tracking-tight transition-colors duration-500 ${product.isPromo ? 'text-red-600' : 'text-[var(--store-text-main)]'}`}>
                                ${listPrice.toFixed(2)}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-[var(--store-surface-text)] leading-none mt-1.5 tabular-nums transition-colors duration-500">
                              Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(priceInBs)}
                            </span>
                          </div>
                          <button className="w-8 h-8 rounded-full border text-[var(--store-surface-text)] border-[var(--store-border)]/30 flex items-center justify-center shrink-0 transition-colors duration-500">
                            <ShoppingCart size={14} strokeWidth={2.5} className="ml-[-1px]" />
                          </button>
                        </div>
                      </div>

                      {product.usd_penalty > 0 && (
                        <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--store-incentive)] py-1 rounded-full self-start transition-colors duration-500">
                          <Flame size={12} className="text-[var(--store-incentive)] fill-[var(--store-incentive)] shrink-0 transition-colors duration-500" />
                          <span>Paga ${product.usd_cash_price.toFixed(2)} en Divisas</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

          </motion.div>
        </div>
      </div>
    </section>
  )
}


// =========================================
// NODO 7: EL ENJAMBRE (MOTOR DE AFILIADOS Y CRECIMIENTO)
// =========================================

const NodeSevenSwarm = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"]
  })

  // Actividad de Afiliados en Vivo
  const logs = [
    { name: "Carlos_Fit", action: "compartió link", item: "Proteína Whey", comm: "--" },
    { name: "Maria_Style", action: "generó venta", item: "Hoodie Titanio", comm: "+$2.50" },
    { name: "Andres99", action: "generó venta", item: "Cargo Pants", comm: "+$1.80" },
    { name: "Sofia_Vzla", action: "nuevo afiliado registrado", item: "--", comm: "--" },
    { name: "Carlos_Fit", action: "generó venta", item: "Pre-entreno", comm: "+$3.00" },
  ]

  const [visibleLogs, setVisibleLogs] = useState<typeof logs>([])

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setVisibleLogs(prev => {
        const next = [...prev, logs[i]]
        if (next.length > 4) next.shift() // Mantener los últimos 4
        return next
      })
      i = (i + 1) % logs.length
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  const opacityIn = useTransform(scrollYProgress, [0, 0.5], [0, 1])
  const yUp = useTransform(scrollYProgress, [0, 0.5], [100, 0])

  return (
    <section ref={containerRef} className="relative min-h-screen w-full bg-slate-50 py-40 overflow-hidden flex flex-col items-center border-t border-slate-200">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#f1f5f9_0%,transparent_50%)] opacity-[0.03] pointer-events-none" />

      <motion.div style={{ opacity: opacityIn, y: yUp }} className="w-full max-w-5xl px-6 relative z-10 flex flex-col md:flex-row items-center gap-16">

        <div className="w-full md:w-1/2">
          <div className="flex items-center gap-4 mb-8">
            <Zap size={32} className="text-black" />
            <span className="text-[10px] font-mono text-black uppercase tracking-widest">Motor de Crecimiento</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-medium tracking-tighter text-zinc-900 uppercase leading-[0.9] mb-6">
            Tus clientes son <br />
            <span className="text-zinc-600">tus vendedores.</span>
          </h2>
          <p className="text-slate-500 text-sm md:text-base leading-relaxed">
            No pagues publicidad vacía. Preziso integra un sistema nativo de Afiliados. Genera códigos únicos para tus clientes fieles, dales un % de comisión y observa cómo promocionan tu inventario por todo WhatsApp e Instagram.
          </p>
        </div>

        {/* Dashboard de Afiliados */}
        <div className="w-full md:w-1/2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.03)]">
          <div className="bg-white/5 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Live: Comisiones Globales</span>
            <div className="flex items-center gap-2 text-[10px] font-mono text-green-500">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Activo
            </div>
          </div>

          <div className="p-6 h-[300px] overflow-hidden flex flex-col justify-end">
            <AnimatePresence>
              {visibleLogs.map((log, idx) => (
                <motion.div
                  key={`${log.name}-${idx}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center justify-between py-4 border-b border-slate-200 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500 border border-slate-200">
                      {log.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-900">@{log.name}</span>
                      <span className="text-[10px] text-slate-500">{log.action} <span className="text-slate-600">{log.item}</span></span>
                    </div>
                  </div>
                  <span className={cn("text-xs font-mono font-bold", log.comm.includes('+') ? 'text-green-400' : 'text-zinc-600')}>
                    {log.comm}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

      </motion.div>
    </section>
  )
}

const NodeEightExtraction = () => {
  const targetRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "center center"]
  })

  const scaleUp = useTransform(scrollYProgress, [0, 1], [0.9, 1])
  const opacityIn = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section id="precios" ref={targetRef} className="relative min-h-screen w-full bg-white py-40 border-t border-slate-200 flex flex-col items-center justify-center overflow-hidden">

      {/* Resplandor Estructural */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-black/5 rounded-full blur-[150px] pointer-events-none" />

      <motion.div
        style={{ scale: scaleUp, opacity: opacityIn }}
        className="w-full max-w-5xl px-6 relative z-10 flex flex-col items-center"
      >
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.5em] mb-4">Protocolo de Acceso</span>
        <h2 className="text-4xl md:text-6xl font-medium tracking-tighter text-zinc-900 uppercase text-center mb-16">
          Un Precio. <br />
          <span className="text-zinc-600">Cero Comisiones.</span>
        </h2>

        {/* El Recibo (Monolito) */}
        <div className="w-full bg-white border border-slate-200 rounded-[2rem] flex flex-col md:flex-row relative overflow-hidden shadow-2xl shadow-slate-200/50">

          {/* Lado A: Captura */}
          <div className="w-full md:w-1/2 p-12 md:p-20 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-slate-200 relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100/0 via-slate-100/0 to-slate-200/80 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <span className="text-[10px] font-mono text-black uppercase tracking-widest mb-6 relative z-10">Acceso Ilimitado</span>

            <div className="flex items-start gap-1 mb-4 relative z-10">
              <span className="text-2xl text-slate-500 mt-2">$</span>
              <span className="text-7xl md:text-9xl font-light tracking-tighter text-zinc-900 leading-none">18</span>
              <span className="text-3xl text-slate-500 mt-2">.99</span>
            </div>

            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest relative z-10">Renovación Mensual</span>

            <Link href="/login" className="mt-12 w-full relative group/btn overflow-hidden rounded-xl bg-black text-white py-5 flex justify-center items-center gap-3 z-10">
              <span className="font-bold text-xs uppercase tracking-[0.2em] relative z-10 group-hover/btn:text-zinc-900 transition-colors duration-500">
                Inicializar Nodo
              </span>
              <ArrowUpRight size={16} strokeWidth={2} className="relative z-10 group-hover/btn:text-zinc-900 transition-colors duration-500" />
              <div className="absolute inset-0 bg-zinc-200 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-0" />
            </Link>
          </div>

          {/* Lado B: Parámetros */}
          <div className="w-full md:w-1/2 p-12 md:p-16 flex flex-col justify-center relative bg-white/50">
            <p className="text-xs font-mono text-slate-500 leading-relaxed mb-10 pb-8 border-b border-slate-200">
              Despliegue inmediato. Vende 10 o 10.000 productos. Liquidación directa a tus cuentas (USDT / Pago Móvil). Sin intermediarios.
            </p>

            <ul className="flex flex-col gap-6">
              {[
                "Productos y variantes ilimitados",
                "Motor de Tasa BCV < 400ms",
                "Cuadre algorítmico (Bs y USD)",
                "Mutación de ADN de Marca",
                "Enrutamiento a WhatsApp",
                "Subdominio .preziso.shop"
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-4 group/li">
                  <div className="w-5 h-5 rounded-full bg-white/5 border border-slate-200 flex items-center justify-center shrink-0 group-hover/li:border-black group-hover/li:bg-black/20 transition-colors">
                    <Check size={10} className="text-slate-500 group-hover/li:text-black transition-colors" strokeWidth={3} />
                  </div>
                  <span className="text-sm font-medium text-slate-600 group-hover/li:text-zinc-900 transition-colors">{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </motion.div>
    </section>
  )
}


// =========================================
// COMPONENTE: KINETIC FOOTER (EVENT HORIZON)
// =========================================

const KineticFooter = () => {
  return (
    <footer className="relative w-full bg-white pt-40 pb-12 overflow-hidden border-t border-slate-200">
      {/* Marquee cinético de fondo */}
      <div className="absolute top-0 left-0 w-full overflow-hidden opacity-[0.03] select-none pointer-events-none">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
          className="flex whitespace-nowrap text-[20vw] font-black uppercase text-zinc-900"
        >
          <span>SIN FRICCIÓN • SIN CAOS • SIN ERRORES • </span>
          <span>SIN FRICCIÓN • SIN CAOS • SIN ERRORES • </span>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
          <div className="md:col-span-2">
            <h2 className="text-5xl md:text-7xl font-medium tracking-tighter text-zinc-900 uppercase leading-[0.9] mb-8">
              El futuro de tu <br />
              <span className="text-black">negocio es hoy.</span>
            </h2>
            <p className="text-slate-500 max-w-sm mb-10 text-sm">
              Preziso es el sistema operativo para la nueva generación de comercios en Venezuela. Control total, desde el inventario hasta la última comisión.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-zinc-900 hover:bg-white hover:text-black transition-all"><InstagramIcon size={18} /></a>
              <a href="#" className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-zinc-900 hover:bg-white hover:text-black transition-all"><TwitterIcon size={18} /></a>
            </div>
          </div>

          <div>
            <h4 className="text-zinc-900 font-bold text-xs uppercase tracking-[0.2em] mb-8">Producto</h4>
            <ul className="space-y-4">
              {['Tienda Online', 'Punto de Venta', 'Afiliados', 'Seguridad'].map(item => (
                <li key={item}><a href="#" className="text-slate-500 text-sm hover:text-zinc-900 transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-zinc-900 font-bold text-xs uppercase tracking-[0.2em] mb-8">Soporte</h4>
            <ul className="space-y-4">
              {['Documentación', 'API', 'Centro de Ayuda', 'Status'].map(item => (
                <li key={item}><a href="#" className="text-slate-500 text-sm hover:text-zinc-900 transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            © 2026 PREZISO SYSTEM. TECNOLOGÍA PARA EL CAPITAL.
          </span>
          <div className="flex gap-8">
            <a href="#" className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest hover:text-zinc-900">Privacidad</a>
            <a href="#" className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest hover:text-zinc-900">Términos</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
// =========================================
// ENSAMBLAJE MAESTRO
// =========================================

// =========================================
// ENSAMBLAJE MAESTRO
// =========================================

// 🚀 1. DEFINIMOS LA INTERFAZ DE TIPOS ESTRICTOS
interface LandingProps {
  liveRate: number;
}

// 🚀 2. INYECTAMOS EL TIPO EN EL COMPONENTE
export default function DeepCaptureLanding({ liveRate }: LandingProps) {
  return (
    <div className="bg-white selection:bg-slate-200 selection:text-black">
      {/* Inyección de Estilos de Capa Inferior */}
      <style jsx global>{`
        .text-outline-black {
         -webkit-text-stroke: 1px rgba(0, 0, 0, 0.1);
          color: transparent;
        }
        @media (min-width: 768px) {
          .text-outline-black { -webkit-text-stroke: 1.5px rgba(255, 255, 255, 0.3); }
        }
        body { cursor: crosshair; }
      `}</style>

      {/* 🚀 3. PASAMOS EL DATO A LOS NODOS QUE LO NECESITAN */}
      <FloatingNavbar bcvRate={liveRate} />

      <NodeZeroHero />
      <NodeTrustEcosystem />
      <NodeOneFriction />

      <NodeTwoSingularity bcvRate={liveRate} />
      <NodeThreeCommandCenter />

      <NodeFourNeural bcvRate={liveRate} />
      <NodeFiveExtraction bcvRate={liveRate} />

      <NodeSixMutation bcvRate={liveRate} />
      <NodeSevenSwarm />

      <NodeEightExtraction />
      <KineticFooter />

    </div>
  )
}
