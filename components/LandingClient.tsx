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
  Lock,
  DollarSign,
  AlertTriangle,
  User,
  Gift,
  Users
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

  // 🚀 DETECTOR DE DISPOSITIVO MÓVIL (Bypass de hidratación seguro contra SSR)
  const [isMobile, setIsMobile] = useState(true)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })

  const y = useTransform(scrollYProgress, [0, 1], [0, -100])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95])

  return (
    <section
      ref={containerRef}
      // 🚀 REDUCCIÓN DE ESPACIO MUERTO: De h-screen a h-[85vh] en móvil para un flujo de scroll inmediato
      className="relative h-[85vh] md:h-screen w-full bg-white flex flex-col items-center justify-start overflow-hidden border-b border-neutral-200/50"
    >
      <motion.div
        // 🚀 BYPASS DE RENDIMIENTO: Si es móvil, descartamos los cálculos de scroll y desactivamos el sticky
        style={isMobile ? {} : { y, opacity, scale }}
        className="relative md:sticky md:top-0 h-full md:h-screen w-full flex flex-col items-center justify-center px-6 z-10"
      >
        <div className="max-w-7xl w-full text-center flex flex-col items-center">

          {/* SEO Invisible */}
          <h1 className="sr-only">
            Preziso Commerce: Plataforma SaaS de E-commerce y Punto de Venta (POS) multimoneda sincronizada con el BCV en Venezuela.
          </h1>

          {/* ADN Visual Centrado */}
          <HeroAnimatedLogo className="text-zinc-900 drop-shadow-sm" />

          {/* Propuesta de Valor y CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="-mt-3 md:-mt-8 flex flex-col items-center gap-6 md:gap-8 relative z-10"
          >
            <p className="text-slate-500 font-mono text-[10px] md:text-xs uppercase tracking-[0.4em] max-w-lg leading-relaxed">
              Tu tienda. Multimoneda. Sincronizada al BCV. Domina el caos de vender en Venezuela con un ecosistema de punto de venta y e-commerce. <br />
            </p>

            <div className="mt-2 flex flex-col items-center gap-4">
              <Link
                href="/admin"
                className="group flex items-center gap-3 bg-white border border-black px-8 md:px-10 py-4 rounded-full text-black font-black uppercase tracking-[0.2em] text-[10px] md:text-xs transition-all duration-300 hover:bg-black hover:text-white active:scale-95"
              >
                <span>Crear tienda gratis</span>
                <ArrowUpRight
                  size={18}
                  strokeWidth={2.5}
                  className="text-black group-hover:text-white transition-all duration-300 group-hover:translate-x-1"
                />
              </Link>

              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                No requiere tarjeta de crédito
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Grid de Fondo Dinámico */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_transparent_80%)]" />
      </div>
    </section>
  )
}

const NodeZeroShowcase = () => {
  return (
    <section className="relative py-24 md:py-32 bg-[#FAFAFC] overflow-hidden border-b border-neutral-200/50 flex flex-col items-center justify-center">

      {/* 🚀 INYECCIÓN DE ESTILOS DE COMPOSICIÓN GPU DIRECTA (Fluidez 60FPS garantizada en Alcatel 1v) */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes inlineCompositorMarquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .gpu-kinetic-marquee {
          display: flex;
          gap: 1.5rem; /* Gap en móvil */
          width: max-content;
          animation: inlineCompositorMarquee 32s linear infinite;
          will-change: transform;
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
          perspective: 1000px;
        }
        @media (min-width: 768px) {
          .gpu-kinetic-marquee {
            gap: 3.5rem; /* Gap en desktop */
            animation-duration: 38s; /* Desplazamiento más sutil en pantallas grandes */
          }
        }
      `}} />

      {/* Sombra de transición superior */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />

      {/* Copit de Contexto */}
      <div className="max-w-7xl mx-auto px-6 text-center mb-16 relative z-10">
        <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-[0.4em] mb-4 block">Experiencia de Usuario Real</span>
        <h2 className="text-3xl md:text-5xl font-black text-neutral-900 tracking-tight leading-none uppercase">
          Interfaces que enamoran <br />
          <span className="text-neutral-500 font-medium">a primera vista.</span>
        </h2>
      </div>

      {/* THE GIANT KINETIC SHOWCASE CONTAINER */}
      <div className="relative w-full h-[460px] md:h-[630px] overflow-hidden select-none pointer-events-none">

        {/* Marquee con aceleración por hardware pura */}
        <div className="gpu-kinetic-marquee items-start">
          {[...Array(2)].map((_, listIdx) => (
            <React.Fragment key={listIdx}>
              {[
                { src: '/mockup-iphone-1.webp', offset: 'translate-y-0 md:translate-y-6' },
                { src: '/mockup-iphone-2.webp', offset: 'translate-y-8 md:translate-y-24' },
                { src: '/mockup-iphone-3.webp', offset: 'translate-y-3 md:translate-y-12' },
                { src: '/mockup-iphone-4.webp', offset: 'translate-y-12 md:translate-y-32' },
                { src: '/mockup-iphone-5.webp', offset: 'translate-y-6 md:translate-y-18' },
              ].map((item, idx) => (
                <div
                  key={`${listIdx}-${idx}`}
                  // Se escalaron los iPhones: w-210px en móvil, w-320px en desktop (Closer to screen)
                  className={`relative w-[210px] md:w-[320px] shrink-0 ${item.offset} transition-transform duration-300 drop-shadow-[0_20px_45px_rgba(0,0,0,0.04)]`}
                >
                  <img
                    src={item.src}
                    alt={`Mockup Tienda Preziso ${idx + 1}`}
                    className="w-full h-auto object-contain pointer-events-none"
                    decoding="async"
                    loading="eager"
                  />
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>

        {/* MÁSCARAS DE DIFUMINACIÓN LATERAL Y DE BASE (Efecto cristal de alta fidelidad) */}
        <div className="absolute inset-y-0 left-0 w-24 md:w-56 bg-gradient-to-r from-[#FAFAFC] via-[#FAFAFC]/70 to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 md:w-56 bg-gradient-to-l from-[#FAFAFC] via-[#FAFAFC]/70 to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#FAFAFC] via-[#FAFAFC]/80 to-transparent z-20 pointer-events-none" />
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
// =========================================================
// NODO 1: LA CONCILIACIÓN DE CAJA (ALTA CONVERSIÓN SAAS)
// =========================================================

const NodeOneReconciliation = () => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Datos simulados de un Arqueo Perfecto para el Mockup de Conversión
  const bcvSimulado = 36.50;
  const expectedTotals = { cash: 120.00, zelle: 85.00, bs: 1460.00, other: 50.00 };
  const reportedTotals = { cash: 120.00, zelle: 85.00, bs: 1460.00, other: 50.00 };

  return (
    <section id="pos" ref={containerRef} className="relative py-24 md:py-32 bg-[#FAFAFC] border-t border-neutral-200/50 overflow-hidden flex flex-col items-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(244,244,245,0.8)_0%,#FAFAFC_70%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 md:px-8 relative z-10 w-full flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">

        {/* COLUMNA IZQUIERDA: COPY EMPÁTICO (El dolor de Venezuela resuelto) */}
        <div className="w-full lg:w-[40%] flex flex-col items-start text-left space-y-5">
          <span className="inline-flex items-center gap-1.5 bg-neutral-100 text-neutral-600 border border-neutral-200/50 text-[10px] font-mono font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
            <Wallet size={12} className="text-neutral-500" /> Conciliación Multimoneda
          </span>

          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-neutral-900 leading-tight uppercase">
            El fin del caos en <br />
            <span className="text-neutral-500">sus cierres de caja.</span>
          </h2>

          <div className="space-y-4 text-neutral-500 text-xs md:text-sm leading-relaxed font-medium">
            <p>
              Vender en Venezuela implica un rompecabezas contable diario: billetes arrugados de dólares, transferencias en Zelle y un flujo constante de Pago Móvil en Bolívares que fluctúa según la tasa oficial.
            </p>
            <p>
              Preziso unifica su Punto de Venta (POS) y su tienda en línea en una sola base de datos, sumando cada divisa en su respectivo canal y calculando de forma matemática el vuelto exacto.
            </p>
            <p className="font-semibold text-neutral-800">
              Presione un botón, selle la caja al final de la jornada y genere su Libro Z contable listo para auditar.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/admin" className="inline-flex items-center gap-1.5 bg-neutral-950 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] shadow-xs">
              <span>Probar demo de caja</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

        {/* COLUMNA DERECHA: EL MOCKUP DEL ARQUEO Y EL TICKET Z */}
        <div className="w-full lg:w-[55%] flex flex-col sm:flex-row items-stretch gap-4 relative">

          {/* Tarjeta 1: El panel de Arqueo Físico */}
          <div className="flex-1 bg-white p-5 rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.015)] flex flex-col justify-between space-y-5">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Sello de Jornada</span>
              <h3 className="font-bold text-xs text-neutral-900">Arqueo en Sistema</h3>
            </div>

            {/* Listado de Cuentas */}
            <div className="space-y-2.5">
              {[
                { label: "Efectivo USD", expected: expectedTotals.cash, symbol: "$", theme: "text-emerald-700 bg-emerald-50 border border-emerald-100/40" },
                { label: "Zelle / Digital", expected: expectedTotals.zelle, symbol: "$", theme: "text-purple-700 bg-purple-50 border border-purple-100/40" },
                { label: "Otros POS USD", expected: expectedTotals.other, symbol: "$", theme: "text-blue-700 bg-blue-50 border border-blue-100/40" },
                { label: "Pago Móvil Bs", expected: expectedTotals.bs, symbol: "Bs ", isBs: true },
              ].map((row) => (
                <div key={row.label} className="p-3 bg-neutral-50/50 rounded-lg border border-neutral-200/50 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">{row.label}</span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      Esperado: {row.symbol}{row.expected.toLocaleString("es-VE")}
                    </span>
                  </div>
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${row.theme || 'text-neutral-700 bg-white border border-neutral-200/50'}`}>
                    {row.symbol}{row.expected.toLocaleString("es-VE")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tarjeta 2: Representación del Ticket Z (Estética de recibo térmico contable) */}
          <div className="w-full sm:w-[220px] bg-white rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.015)] p-5 flex flex-col justify-between relative overflow-hidden shrink-0">

            {/* Indicador de Cuadre Perfecto */}
            <div className="absolute -top-3 -right-3 w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xs">
              <CheckCircle2 size={16} />
            </div>

            <div className="space-y-4">
              <div className="text-center border-b border-dashed border-neutral-200/50 pb-4">
                <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/40 px-2 py-0.5 rounded">CUADRADO</span>
                <p className="text-xs font-bold text-neutral-900 mt-2">TICKET DE JORNADA</p>
                <p className="text-[9px] font-mono text-neutral-400 mt-0.5">ID: Z-9024</p>
              </div>

              {/* Impresión de Líneas del Recibo */}
              <div className="space-y-2 font-mono text-[10px] text-neutral-500">
                <div className="flex justify-between"><span>Efectivo:</span> <span>$120.00</span></div>
                <div className="flex justify-between"><span>Zelle:</span> <span>$85.00</span></div>
                <div className="flex justify-between"><span>Otros:</span> <span>$50.00</span></div>
                <div className="flex justify-between text-neutral-900 font-semibold border-t border-dashed border-neutral-100/80 pt-1.5">
                  <span>Pago Móvil:</span>
                  <span>Bs 1.460</span>
                </div>
              </div>
            </div>

            {/* Acciones de exportación rápidas simuladas */}
            <div className="grid grid-cols-2 gap-1.5 pt-4 border-t border-dashed border-neutral-200/50 mt-4">
              <div className="bg-neutral-50 text-[9px] text-neutral-600 font-bold uppercase tracking-wider py-1.5 rounded text-center border border-neutral-200/50 cursor-default">
                WhatsApp
              </div>
              <div className="bg-neutral-900 text-white text-[9px] font-bold uppercase tracking-wider py-1.5 rounded text-center cursor-default">
                Excel
              </div>
            </div>

          </div>

        </div>

      </div>
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
// NODO 3: EL CENTRO DE COMANDO (ADAPTATIVE SHOWCASE & DEEP ZOOM)
// =========================================

// 🚀 1. AÑADIMOS LA PROP 'bcvRate' A LA FUNCIÓN
const NodeThreeCommandCenter = ({ bcvRate }: { bcvRate: number }) => {
  const [activeTab, setActiveTab] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)

  const features = [
    {
      id: 'control',
      title: "Control Financiero Absoluto",
      desc: "Conoce tu ingreso neto, el dinero en tránsito y el stock crítico en un solo vistazo. Cero fugas de capital.",
      icon: LayoutDashboard,
      image: "/ingresoneto.webp",
      widget: {
        icon: DollarSign,
        label: "INGRESO NETO",
        value: "$3,644.89",
        accentLine: "bg-emerald-500",
        iconColor: "text-emerald-600",
        positionDesktop: "-bottom-6 -left-6",
        positionMobile: "bottom-4 left-4"
      }
    },
    {
      id: 'bcv',
      title: "Motor BCV Automatizado",
      desc: "Fija tu precio en dólares una vez. Preziso actualiza toda tu tienda en Bolívares al instante según la tasa oficial. Adiós a remarcar precios.",
      icon: Zap,
      image: "/motorbcvautomatizado.webp",
      widget: {
        icon: ArrowRightLeft,
        label: "TASA BCV SINC.",
        // 🚀 2. INYECTAMOS LA VARIABLE DINÁMICA CON 2 DECIMALES
        value: `${bcvRate.toFixed(2)} Bs`,
        accentLine: "bg-blue-500",
        iconColor: "text-blue-600",
        positionDesktop: "-top-6 -right-6",
        positionMobile: "top-4 right-4"
      }
    },
    // ... (el resto de features queda exactamente igual)
    {
      id: 'omni',
      title: "Inventario Omnicanal",
      desc: "Vende en tu local físico y en Instagram al mismo tiempo. Si se acaba en el mostrador, se agota en la web en milisegundos.",
      icon: PackageSearch,
      image: "/inventarioomnicanal.webp",
      widget: {
        icon: AlertTriangle,
        label: "STOCK CRÍTICO",
        value: "02 Unidades",
        accentLine: "bg-rose-500",
        iconColor: "text-rose-600",
        positionDesktop: "-bottom-6 -right-6",
        positionMobile: "bottom-4 right-4"
      }
    },
    {
      id: 'b2b',
      title: "Red de Promotores",
      desc: "Convierte a tus mejores clientes en vendedores. Asígnales un código, dales comisión y haz que tu marca se viralice sola.",
      icon: Users,
      image: "/image_942cbe.webp",
      widget: {
        icon: Gift,
        label: "COMISIÓN PENDIENTE",
        value: "+$5.00 USD",
        accentLine: "bg-purple-500",
        iconColor: "text-purple-600",
        positionDesktop: "-top-6 -left-6",
        positionMobile: "top-4 left-4"
      }
    }
  ]

  // Auto-Play Logic (Solo para Desktop)
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, features.length]);

  const handleTabClick = (index: number) => {
    setActiveTab(index);
    setIsAutoPlaying(false);
  }

  const ActiveWidgetIcon = features[activeTab].widget.icon;

  return (
    <section id="adn" className="relative py-24 md:py-32 bg-white border-t border-neutral-200/50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        {/* Encabezado de la Sección */}
        <div className="text-center md:text-left mb-16 md:mb-20">
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-[0.5em] mb-4 block">Centro de Comando</span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-neutral-900 uppercase leading-none">
            El cerebro detrás <br className="hidden md:block" />
            <span className="text-neutral-500 font-medium">de tu operación.</span>
          </h2>
        </div>

        {/* ========================================= */}
        {/* VERSIÓN ESCRITORIO (TABS INTERACTIVAS) */}
        {/* ========================================= */}
        <div className="hidden lg:grid grid-cols-12 gap-20 items-center">

          {/* Pestañas (Izquierda) */}
          <div className="col-span-5 flex flex-col gap-4">
            {features.map((feature, idx) => {
              const isActive = activeTab === idx;
              return (
                <button
                  key={feature.id}
                  onClick={() => handleTabClick(idx)}
                  className={`relative flex flex-col items-start p-6 rounded-2xl text-left transition-all duration-300 border ${isActive
                      ? 'bg-white border-neutral-300/50 shadow-[0_20px_50px_rgba(0,0,0,0.05)] ring-0.5 ring-black/50 scale-[1.02]'
                      : 'bg-transparent border-transparent hover:bg-neutral-50/50'
                    }`}
                >
                  {isActive && isAutoPlaying && (
                    <motion.div
                      initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 5, ease: "linear" }}
                      className="absolute top-0 left-0 h-1 bg-neutral-900 rounded-t-2xl"
                    />
                  )}

                  <div className="flex items-center gap-4 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300 ${isActive ? 'bg-neutral-900 text-white shadow-md' : 'bg-neutral-100 text-neutral-500'}`}>
                      <feature.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <h3 className={`text-lg font-bold tracking-tight transition-colors duration-300 ${isActive ? 'text-neutral-900' : 'text-neutral-500'}`}>
                      {feature.title}
                    </h3>
                  </div>

                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }} className="overflow-hidden"
                      >
                        <p className="text-sm text-neutral-500 leading-relaxed font-medium pt-1">
                          {feature.desc}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              )
            })}
          </div>

          {/* Escaparate Visual (Derecha) */}
          <div className="lg:col-span-7 relative order-1 lg:order-2">
            <div 
              onClick={() => setZoomedImage(features[activeTab].image)}
              className="relative aspect-[4/3] md:aspect-[16/10] w-full rounded-[2rem] bg-neutral-100/50 shadow-inner flex items-center justify-center cursor-zoom-in group"
            >
              {/* 🚀 BORDE ANIMADO PREMIUM (Movimiento lento y estela asimétrica) */}
              <div 
                className="absolute inset-0 z-30 pointer-events-none rounded-[2rem] p-[1px]" 
                style={{ WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}
              >
                <div 
                  className="absolute inset-[-100%] animate-[spin_12s_linear_infinite]" 
                  style={{ background: 'conic-gradient(from 0deg, transparent 60%, rgba(156, 163, 175, 0.1) 80%, rgba(23, 23, 23, 5) 98%, #ffffff 100%)' }} 
                />
              </div>
              
              {/* 🚀 RESPLANDOR VOLUMÉTRICO (Soft Glow) */}
              <div 
                className="absolute inset-0 z-20 pointer-events-none rounded-[2rem] p-[1px]" 
                style={{ WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}
              >
                <div 
                  className="absolute inset-[-100%] animate-[spin_12s_linear_infinite] blur-[12px] opacity-40" 
                  style={{ background: 'conic-gradient(from 0deg, transparent 60%, rgba(156, 163, 175, 0.1) 80%, rgba(23, 23, 23, 5) 98%, #ffffff 100%)' }} 
                />
              </div>

              {/* CONTENIDO INTERNO (Aislado para no desbordar el borde) */}
              <div className="absolute inset-[1px] rounded-[calc(2rem-1px)] overflow-hidden">
                {/* Barra macOS */}
                <div className="absolute top-0 left-0 right-0 h-10 bg-white/80 backdrop-blur-md border-b border-neutral-200/50 z-20 flex items-center px-4 gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
                </div>

                {/* Imagen con Hover Hint */}
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeTab}
                    src={features[activeTab].image}
                    initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.05, filter: "blur(4px)" }}
                    transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                    className="absolute top-10 left-0 w-full h-[calc(100%-40px)] object-cover object-left-top group-hover:scale-105 transition-transform duration-700"
                    alt={features[activeTab].title}
                  />
                </AnimatePresence>
              </div>

              {/* Overlay de Lupa */}
              <div className="absolute inset-0 bg-neutral-950/5 opacity-0 group-hover:opacity-100 transition-opacity z-40 flex items-center justify-center pointer-events-none rounded-[2rem]">
                <span className="bg-white/95 text-neutral-900 text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                  <Search size={14} /> Ampliar Interfaz
                </span>
              </div>
            </div>

            {/* MICRO-WIDGETS FLOTANTES DESKTOP */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`widget-${activeTab}`}
                initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
                className={`absolute z-50 ${features[activeTab].widget.positionDesktop}`}
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="flex items-stretch bg-white/90 backdrop-blur-md border border-neutral-200/50 shadow-[0_15px_35px_rgba(0,0,0,0.1)] rounded-none overflow-hidden"
                >
                  <div className={`w-1 shrink-0 ${features[activeTab].widget.accentLine}`} />
                  <div className="px-4 py-3 flex items-center gap-3.5">
                    <ActiveWidgetIcon size={16} strokeWidth={2.5} className={features[activeTab].widget.iconColor} />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1.5">
                        {features[activeTab].widget.label}
                      </span>
                      <span className="text-sm font-bold tracking-tight font-mono text-neutral-900 leading-none">
                        {features[activeTab].widget.value}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ========================================= */}
        {/* VERSIÓN MÓVIL (STACK VERTICAL) */}
        {/* ========================================= */}
        <div className="lg:hidden flex flex-col gap-20">
          {features.map((feature) => {
            const MobileWidgetIcon = feature.widget.icon;
            return (
              <div key={feature.id} className="flex flex-col gap-6">

               {/* Contenedor de Imagen Móvil */}
                <div 
                  onClick={() => setZoomedImage(feature.image)}
                  className="relative aspect-[4/3] w-full rounded-2xl bg-neutral-100/50 shadow-inner flex items-center justify-center cursor-zoom-in"
                >
                  {/* 🚀 BORDE ANIMADO PREMIUM MÓVIL */}
                  <div 
                    className="absolute inset-0 z-30 pointer-events-none rounded-2xl p-[1px]" 
                    style={{ WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}
                  >
                    <div 
                      className="absolute inset-[-100%] animate-[spin_12s_linear_infinite]" 
                      style={{ background: 'conic-gradient(from 0deg, transparent 60%, rgba(156, 163, 175, 0.1) 80%, rgba(23, 23, 23, 0.8) 98%, #ffffff 100%)' }} 
                    />
                  </div>
                  
                  {/* 🚀 RESPLANDOR VOLUMÉTRICO MÓVIL */}
                  <div 
                    className="absolute inset-0 z-20 pointer-events-none rounded-2xl p-[1px]" 
                    style={{ WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}
                  >
                    <div 
                      className="absolute inset-[-100%] animate-[spin_12s_linear_infinite] blur-[10px] opacity-40" 
                      style={{ background: 'conic-gradient(from 0deg, transparent 60%, rgba(156, 163, 175, 0.1) 80%, rgba(23, 23, 23, 0.8) 98%, #ffffff 100%)' }} 
                    />
                  </div>

                  {/* CONTENIDO INTERNO ENMASCARADO */}
                  <div className="absolute inset-[1px] rounded-[calc(1rem-1px)] overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-8 bg-white/80 backdrop-blur-md border-b border-neutral-200/50 z-20 flex items-center px-3 gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-neutral-300" />
                      <div className="w-2 h-2 rounded-full bg-neutral-300" />
                      <div className="w-2 h-2 rounded-full bg-neutral-300" />
                    </div>
                    
                    <img src={feature.image} alt={feature.title} className="absolute top-8 left-0 w-full h-[calc(100%-32px)] object-cover object-left-top" />
                  </div>

                  {/* MICRO-WIDGET MÓVIL */}
                  <div className={`absolute z-50 ${feature.widget.positionMobile}`}>
                    <div className="flex items-stretch bg-white/95 backdrop-blur-md border border-neutral-200/50 shadow-lg rounded-none overflow-hidden">
                      <div className={`w-1 shrink-0 ${feature.widget.accentLine}`} />
                      <div className="px-3 py-2.5 flex items-center gap-2.5">
                        <MobileWidgetIcon size={14} strokeWidth={2.5} className={feature.widget.iconColor} />
                        <div className="flex flex-col">
                          <span className="text-[7px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">
                            {feature.widget.label}
                          </span>
                          <span className="text-xs font-bold tracking-tight font-mono text-neutral-900 leading-none">
                            {feature.widget.value}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Textos Móvil */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-neutral-900 text-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                      <feature.icon size={18} strokeWidth={2} />
                    </div>
                    <h3 className="text-xl font-bold text-neutral-900 leading-tight">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-sm text-neutral-500 leading-relaxed font-medium">
                    {feature.desc}
                  </p>
                </div>

              </div>
            )
          })}
        </div>

      </div>

      {/* ========================================= */}
      {/* LIGHTBOX DE ZOOM (DEEP INSPECTION) */}
      {/* ========================================= */}
      <AnimatePresence>
        {zoomedImage && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-10">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setZoomedImage(null)}
              className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm cursor-zoom-out"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative w-full max-w-5xl bg-white rounded-2xl border border-neutral-200/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
            >
              <div className="p-4 flex justify-between items-center border-b border-neutral-200/50 bg-neutral-50/50 shrink-0">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Inspección de Interfaz</span>
                <button onClick={() => setZoomedImage(null)} className="p-1.5 text-neutral-400 hover:text-neutral-900 bg-white border border-neutral-200/50 hover:bg-neutral-50 rounded-full transition-colors shadow-xs">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-neutral-100/50 p-0 md:p-8 flex items-start justify-center">
                <img src={zoomedImage} alt="Zoomed Interface" className="w-full h-auto object-contain rounded-none md:rounded-xl shadow-none md:shadow-lg border-0 md:border border-neutral-200/50" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                7 dias gratis
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

// 🚀 ENSAMBLAJE MAESTRO CON INTEGRACIÓN ARMÓNICA
export default function DeepCaptureLanding({ liveRate }: LandingProps) {
  return (
    <div className="bg-white selection:bg-slate-200 selection:text-black">
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
      <NodeZeroShowcase /> {/* 🚀 NUEVO NODO DE REVELACIÓN DE PRODUCTO */}
      <NodeTrustEcosystem />
      <NodeOneReconciliation /> {/* 🚀 REEMPLAZO: Cambiamos "Friction" por la solución real */}

      <NodeTwoSingularity bcvRate={liveRate} />
      <NodeThreeCommandCenter bcvRate={liveRate} />

      <NodeFourNeural bcvRate={liveRate} />
      <NodeFiveExtraction bcvRate={liveRate} />

      <NodeSixMutation bcvRate={liveRate} />
      <NodeSevenSwarm />

      <NodeEightExtraction />
      <KineticFooter />

    </div>
  )
}
