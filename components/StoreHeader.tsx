// components/StoreHeader.tsx
'use client'

import { useState } from 'react'
import { Search, ShoppingBag, X, ShoppingCart, ArrowRight, Receipt, ChevronRight, ChevronLeft, UserCircle, Sparkles, Menu, Flame, Zap, Utensils } from 'lucide-react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { getOptimizedUrl } from '@/utils/cdn'
import { normalizeThemeConfig } from '@/utils/themeAdapter'

interface StoreHeaderProps {
    layoutStyle: 'classic' | 'minimal' | 'dense_search' | 'brutalist' | 'pill_nav';
    store: any;
    activeRate: number;
    isEur: boolean;
    search: string;
    setSearch: (s: string) => void;
    categories: string[];
    selectedCategory: string;
    setSelectedCategory: (c: string) => void;
    isBoutiqueMode: boolean;
    exitBoutiqueMode: () => void;
    currentUser: any;
    orderHistory: any[];
    hasItems: boolean;
    totalItems: number;
    cartControls: any;
    setIsAuthModalOpen: (b: boolean) => void;
    setIsHistoryModalOpen: (b: boolean) => void;
    setIsRateModalOpen: (b: boolean) => void;
    isStickyVisible: boolean;
    categoryScrollRef: any;
    handleCategoryScroll: any;
    dynamicMask: string;
    scrollCategories: (dir: 'left' | 'right') => void;
    onProfileClick: () => void;
}

const CategoryPill = ({ label, active, onClick, isMinimal = false }: { label: string, active: boolean, onClick: () => void, isMinimal?: boolean }) => (
    <button
        onClick={onClick}
        className={`px-5 py-2 md:px-6 md:py-2 text-[11px] md:text-xs font-bold tracking-wide transition-all duration-300 active:scale-95 whitespace-nowrap 
        ${isMinimal 
            ? (active ? 'text-[var(--store-text-main)] border-b-2 border-[var(--store-text-main)]' : 'text-[var(--store-surface-text)] border-b-2 border-transparent hover:text-[var(--store-text-main)]')
            : (active ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[length:var(--border-width-ui)] border-[var(--store-primary)] rounded-[var(--radius-btn)]' : 'bg-[var(--store-surface)] text-[var(--store-text-main)] border-[length:var(--border-width-ui)] border-[var(--store-border)]/40 rounded-[var(--radius-btn)] hover:bg-[var(--store-surface)]')
        }`}
    >
        {label}
    </button>
);

export default function StoreHeader(props: StoreHeaderProps) {
    const [isMinimalSearchOpen, setIsMinimalSearchOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // 🚀 DEFINICIÓN GLOBAL: Resuelve el error de Scope TS2304 en cascada y normaliza los heros duales
    const liveTheme = normalizeThemeConfig(props.store.theme_config);

    // ==========================================
    // COMPONENTES REUTILIZABLES (DRY)
    // ==========================================
const LogoBlock = ({ centered = false }: { centered?: boolean }) => {
        // 🚀 Lee prioritariamente el logo en vivo del postMessage para renderizado en 0ms
        const liveLogoUrl = liveTheme.layout?.logo_url || props.store.logo_url;
        const isPng = liveTheme.layout?.logo_type === 'png_transparent';

        return (
            <div className={`flex items-center gap-3 cursor-pointer ${centered ? 'justify-center' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <div className="relative shrink-0 flex items-center justify-center">
                    {liveLogoUrl ? (
                        <Image 
                            src={getOptimizedUrl(liveLogoUrl)} 
                            // 🚀 DIMENSIONES ADAPTABLES: Proporción horizontal elegante para marcas de lujo si es PNG
                            width={isPng ? 140 : 44} 
                            height={isPng ? 44 : 44} 
                            className={`object-contain transition-all ${
                                isPng 
                                    ? 'bg-transparent border-0 shadow-none w-24 h-8 md:w-32 md:h-10' 
                                    : 'w-10 h-10 md:w-11 md:h-11 bg-[var(--store-surface)] border-[length:var(--border-width-ui)] border-[var(--store-border)] shadow-[var(--shadow-ui)]'
                            } ${props.layoutStyle === 'minimal' && !isPng ? 'rounded-none' : 'rounded-full'}`} 
                            alt="Logo" 
                        />
                    ) : (
                        <div className={`w-10 h-10 md:w-11 md:h-11 bg-[var(--store-surface)] flex items-center justify-center text-[var(--store-surface-text)] border-[length:var(--border-width-ui)] border-[var(--store-border)] shadow-[var(--shadow-ui)] ${props.layoutStyle === 'minimal' ? 'rounded-none' : 'rounded-full'}`}>
                            <ShoppingBag size={18} strokeWidth={1.5} />
                        </div>
                    )}
                </div>
                
                {/* 🚀 ELIMINACIÓN DE REDUNDANCIA: Ocultamos el nombre de la tienda si el logo es un PNG transparente */}
                {!isPng && (
                    <h1 className={`text-base md:text-lg font-black text-[var(--store-text-main)] tracking-tight leading-none truncate max-w-[150px] md:max-w-[250px] ${centered ? 'hidden md:block' : ''}`}>
                        {props.store.name}
                    </h1>
                )}
            </div>
        );
    };
    const RateBlock = () => (
        <button onClick={() => props.setIsRateModalOpen(true)} className="group flex items-center gap-2 px-2.5 py-1.5 shrink-0 rounded-[var(--radius-btn)] active:scale-95 transition-all">
            <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-[var(--store-surface-text)] group-hover:text-[var(--store-text-main)] transition-colors hidden sm:block">
                    {props.isEur ? 'Tasa EUR' : 'Tasa BCV'}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider text-[var(--store-surface-text)] group-hover:text-[var(--store-text-main)] transition-colors sm:hidden">
                    {props.isEur ? 'EUR' : 'BCV'}
                </span>
            </div>
            <div className="h-3.5 w-[1px] bg-[var(--store-border)]/60"></div>
            <div className="flex items-baseline pt-[1px] text-[var(--store-text-main)] font-mono text-[13px] font-bold tracking-tight border-b border-[var(--store-text-main)]/30 group-hover:border-[var(--store-text-main)]/70 transition-colors pb-[1px] leading-none">
                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="mr-0.5 select-none font-sans text-xs">Bs.</motion.span>
                <span className="tabular-nums">{Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(props.activeRate)}</span>
            </div>
        </button>
    );

const renderSearchBlock = (isDense: boolean = false) => (
        <div className={`relative flex-1 group min-w-0 ${isDense ? 'w-full' : 'w-full md:max-w-sm'}`}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--store-surface-text)] group-focus-within:text-[var(--store-primary)] transition-colors" size={16} strokeWidth={2} />
            <input
                type="text"
                placeholder={isDense ? "Buscar repuesto, producto o marca..." : "Buscar producto..."}
                value={props.search}
                onChange={(e) => props.setSearch(e.target.value)}
                className={`w-full bg-[var(--store-surface)] focus:bg-[var(--store-bg)] border-[length:var(--border-width-ui)] border-[var(--store-border)] shadow-[var(--shadow-ui)] pl-11 pr-4 py-2.5 text-sm font-medium text-[var(--store-text-main)] placeholder:text-[var(--store-surface-text)] outline-none focus:border-[var(--store-primary)] transition-all rounded-[var(--radius-search)]`}
            />
            {props.search && (
                <button onClick={() => props.setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--store-surface-text)] hover:text-[var(--store-primary)] transition-colors">
                    <X size={16} />
                </button>
            )}
        </div>
    );

    const IconsBlock = () => (
        <div className="flex items-center gap-1">
            {/* Perfil - Siempre visible */}
            <button onClick={props.onProfileClick} className="relative p-2.5 md:p-3 rounded-full text-[var(--store-text-main)] hover:text-[var(--store-primary)] transition-all duration-300 active:scale-95">
                <UserCircle size={24} strokeWidth={1.5} />
            </button>
            
            {/* Mis Pedidos - Oculto en Mobile (Se mueve al menú hamburguesa si aplica) */}
            {props.orderHistory && props.orderHistory.length > 0 && (
                <button onClick={() => props.setIsHistoryModalOpen(true)} className="hidden md:flex relative p-2.5 md:p-3 rounded-full text-[var(--store-text-main)] hover:text-[var(--store-primary)] transition-all duration-300 active:scale-95">
                    <Receipt size={24} strokeWidth={1.5} />
                    <span className="absolute top-1 right-1 bg-[var(--store-primary)] text-[var(--store-primary-text)] text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                        {props.orderHistory.length}
                    </span>
                </button>
            )}
            
            {/* Carrito Superior - SIEMPRE OCULTO EN MOBILE (Evita duplicados con FloatingCheckout) */}
            <button data-cart-target="true" onClick={() => document.dispatchEvent(new CustomEvent('toggleCartDrawer'))} className={`hidden md:flex relative p-2.5 md:p-3 rounded-full transition-all duration-300 active:scale-95 ${props.hasItems ? 'text-[var(--store-text-main)] hover:text-[var(--store-primary)]' : 'text-[var(--store-surface-text)] hover:text-[var(--store-primary)]'}`}>
                <motion.div animate={props.cartControls} className="inline-block origin-top">
                    <ShoppingCart size={24} strokeWidth={1.5} />
                </motion.div>
                <AnimatePresence>
                    {props.hasItems && (
                        <motion.span key={props.totalItems} initial={{ scale: 0, y: 10, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute top-1 right-1 bg-[var(--store-primary)] text-[var(--store-primary-text)] text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                            {props.totalItems}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            {/* Menú Hamburguesa - SOLO VISIBLE EN MOBILE Y SOLO EN TEMAS NO CLÁSICOS */}
            {props.layoutStyle !== 'classic' && (
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden relative p-2.5 rounded-full text-[var(--store-text-main)] hover:text-[var(--store-primary)] transition-all duration-300 active:scale-90">
                    {isMobileMenuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
                </button>
            )}
        </div>
    );

  // 🚀 CATEGORÍAS CON ANCHO ELÁSTICO RESPONSIVO (md:flex-1 md:min-w-0)
    const CategoriesBlock = ({ isMinimal = false }: { isMinimal?: boolean }) => (
        <div className="w-full md:flex-1 md:min-w-0 relative group flex items-center">
            {props.isBoutiqueMode ? (
                <div className="w-full flex items-center justify-between py-1 px-1 animate-in fade-in duration-500">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-[var(--store-primary)]/10 px-2.5 py-1 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] border-[var(--store-primary)]/20 shadow-[var(--shadow-ui)]">
                            <Sparkles size={12} className="text-[var(--store-primary)]" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--store-primary)] hidden sm:inline">Pasillo VIP</span>
                        </div>
                        <h2 className="text-sm md:text-base font-black text-[var(--store-text-main)] truncate max-w-[150px] md:max-w-none">{props.selectedCategory}</h2>
                    </div>
                    <button onClick={props.exitBoutiqueMode} className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] transition-colors active:scale-95 bg-[var(--store-surface)] px-3 py-1.5 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] border-[var(--store-border)]/50 shadow-[var(--shadow-ui)] shrink-0">
                        Ver Todo <ArrowRight size={12} />
                    </button>
                </div>
            ) : (
                <>
                    <div className="absolute left-2 z-20 hidden md:flex items-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button onClick={() => props.scrollCategories('left')} className="pointer-events-auto p-2 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] bg-[var(--store-surface)] shadow-[var(--shadow-ui)] text-[var(--store-text-main)] active:scale-95 transition-all duration-150"><ChevronLeft size={14} strokeWidth={2.5} /></button>
                    </div>
                    
                    {/* Contenedor Auto-Centrado en Desktop & Scrollable en Mobile */}
                    <div ref={props.categoryScrollRef} onScroll={props.handleCategoryScroll} className="w-full overflow-x-auto no-scrollbar py-1" style={{ WebkitMaskImage: props.dynamicMask, maskImage: props.dynamicMask }}>
                        <div className="flex items-center gap-2 min-w-max md:mx-auto md:w-fit px-1">
                            {props.categories.map((category) => (
                                <CategoryPill key={category} label={category} active={props.selectedCategory === category} onClick={() => props.setSelectedCategory(category)} isMinimal={isMinimal} />
                            ))}
                        </div>
                    </div>

                    <div className="absolute right-2 z-20 hidden md:flex items-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button onClick={() => props.scrollCategories('right')} className="pointer-events-auto p-2 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] bg-[var(--store-surface)] shadow-[var(--shadow-ui)] text-[var(--store-text-main)] active:scale-95 transition-all duration-150"><ChevronRight size={14} strokeWidth={2.5} /></button>
                    </div>
                </>
            )}
        </div>
    );

 const MobileMenu = () => {
        // 💎 VARIANTE: MENÚ EDITORIAL FULL-SCREEN (TEMA MINIMAL LUXURY)
        if (props.layoutStyle === 'minimal') {
            return (
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                            className="fixed inset-0 z-[100] bg-[var(--store-bg)] flex flex-col w-full h-[100dvh] overflow-hidden"
                        >
                            {/* Cabecera del Menú */}
                            <div className="flex justify-between items-center px-6 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--store-surface-text)] shrink-0">
                                <span>Menu</span>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-1.5 hover:text-[var(--store-text-main)] transition-colors active:scale-90">
                                    Close <X size={14} strokeWidth={1} />
                                </button>
                            </div>

                            {/* Lista Editorial de Categorías */}
                            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6 no-scrollbar">
                                {props.categories.map((cat, idx) => (
                                    <button
                                        key={cat}
                                        onClick={() => {
                                            props.setSelectedCategory(cat);
                                            setIsMobileMenuOpen(false);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="flex items-center gap-5 text-left group w-full"
                                    >
                                        <span className="text-[10px] font-mono text-[var(--store-surface-text)] opacity-70 mt-1">
                                            {(idx + 1).toString().padStart(2, '0')}
                                        </span>
                                        <span className="text-3xl md:text-4xl font-heading text-[var(--store-text-main)] group-hover:opacity-60 transition-opacity tracking-tight">
                                            {cat}
                                        </span>
                                        <ChevronRight size={18} strokeWidth={1} className="text-[var(--store-surface-text)] ml-auto opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 duration-300" />
                                    </button>
                                ))}
                            </div>

                            {/* Footer del Menú */}
                            <div className="p-6 flex flex-col gap-5 shrink-0 border-t border-[var(--store-border)]/20">
                                <button onClick={() => { setIsMobileMenuOpen(false); setIsMinimalSearchOpen(true); }} className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--store-text-main)] hover:opacity-70 transition-opacity">
                                    <Search size={16} strokeWidth={1} /> Search
                                </button>
                                <button onClick={() => { setIsMobileMenuOpen(false); props.onProfileClick(); }} className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--store-text-main)] hover:opacity-70 transition-opacity">
                                    <UserCircle size={16} strokeWidth={1} /> Sign In
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            );
        }

        // 🛠️ VARIANTE: MENÚ DESPLEGABLE ESTÁNDAR (TEMA INDUSTRIAL / CLASSIC)
        return (
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                        className="md:hidden border-t border-[var(--store-border)]/30 bg-[var(--store-bg)] overflow-hidden"
                    >
                        <div className="flex flex-col px-4 py-5 gap-3 max-h-[65vh] overflow-y-auto no-scrollbar">
                            {props.orderHistory && props.orderHistory.length > 0 && (
                                <button
                                    onClick={() => { setIsMobileMenuOpen(false); props.setIsHistoryModalOpen(true); }}
                                    className="flex items-center gap-3 p-3.5 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] border-[var(--store-border)] bg-[var(--store-surface)] text-[var(--store-text-main)] shadow-[var(--shadow-ui)] mb-2 active:scale-95 transition-transform text-left"
                                >
                                    <div className="bg-[var(--store-primary)]/10 p-2 rounded-[var(--radius-btn)]">
                                        <Receipt size={18} className="text-[var(--store-primary)]" />
                                    </div>
                                    <div className="flex flex-col items-start min-w-0">
                                        <span className="font-bold text-sm leading-none">Mis Pedidos</span>
                                        <span className="text-[10px] font-semibold text-[var(--store-surface-text)] mt-1 truncate">Tienes {props.orderHistory.length} ordenes en curso</span>
                                    </div>
                                </button>
                            )}

                            <span className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest mb-1">Categorías del Catálogo</span>
                            
                            <div className="flex flex-col gap-2">
                                {props.categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => {
                                            props.setSelectedCategory(cat);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`flex items-center justify-between p-3.5 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] transition-all active:scale-95 ${props.selectedCategory === cat ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[var(--store-primary)] shadow-[var(--shadow-ui)]' : 'bg-[var(--store-surface)] text-[var(--store-text-main)] border-[var(--store-border)]/50 hover:border-[var(--store-border)]'}`}
                                    >
                                        <span className="font-bold text-sm">{cat}</span>
                                        {props.selectedCategory === cat && <ChevronRight size={16} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    };
    // ==========================================
    // 🛠️ RENDERIZADO: TEMA 2 - INDUSTRIAL PRO (DENSE SEARCH)
    // ==========================================
    if (props.layoutStyle === 'dense_search') {
        return (
            <>
                {/* 1. ENCABEZADO STICKY (Navegación Fija) */}
                <div className={`sticky top-0 z-40 bg-[var(--store-bg)] border-b-[length:var(--border-width-ui)] border-[var(--store-border)] transition-transform duration-300 will-change-transform ${props.isStickyVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                    
                    <div className="bg-[var(--store-surface)] border-b border-[var(--store-border)]/40 px-4 md:px-8 py-2 flex justify-between items-center text-[10px] font-mono">
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex items-center gap-2 font-bold text-[var(--store-text-main)]">
                                <span>⚡ Despacho Inmediato</span>
                                <span className="text-[var(--store-border)]">|</span>
                                <span>📦 Envíos MRW / Zoom / Tealca</span>
                            </div>
                            <div className="sm:hidden flex items-center gap-1.5 font-bold text-[var(--store-text-main)]">
                                <span className="w-1.5 h-1.5 bg-[var(--store-primary)]"></span>
                                <span>Tienda Oficial</span>
                            </div>
                        </div>
                        <RateBlock />
                    </div>

                    <div className="max-w-[1500px] mx-auto px-4 md:px-8 py-3.5 flex flex-col gap-3">
                       <div className="flex items-center justify-between gap-4 md:gap-8">
                            <LogoBlock />
                            <div className="hidden md:flex flex-1 max-w-3xl">{renderSearchBlock(true)}</div>
                            <div className="flex items-center gap-1.5 shrink-0"><IconsBlock /></div>
                        </div>
                        <div className="block md:hidden w-full">{renderSearchBlock(true)}</div>
                        <div className="pt-1 hidden md:block"><CategoriesBlock /></div>
                    </div>
                    <MobileMenu />
                </div>

          {/* 2. HERO BANNER INDUSTRIAL (Segregación Estricta y Desvanecido Suave) */}
                {(liveTheme.layout?.hero_desktop_url || props.store.hero_url || liveTheme.layout?.hero_mobile_url) && (
                    <div className="w-full bg-[var(--store-bg)] flex justify-center overflow-hidden -mt-[1px]">
                        <div 
                            className="relative w-full"
                            style={{
                                WebkitMaskImage: 'linear-gradient(to bottom, black 50%, rgba(0,0,0,0.92) 65%, rgba(0,0,0,0.6) 80%, rgba(0,0,0,0.2) 92%, transparent 100%)',
                                maskImage: 'linear-gradient(to bottom, black 50%, rgba(0,0,0,0.92) 65%, rgba(0,0,0,0.6) 80%, rgba(0,0,0,0.2) 92%, transparent 100%)'
                            }}
                        >
                            {/* Desktop (Solo se muestra si hay banner desktop) */}
                            {(liveTheme.layout?.hero_desktop_url || props.store.hero_url) && (
                                <div className="hidden md:block w-full">
                                    <Image 
                                        src={getOptimizedUrl(liveTheme.layout?.hero_desktop_url || props.store.hero_url)} 
                                        alt="Banner de escritorio" 
                                        width={1920} 
                                        height={600} 
                                        className="w-full h-auto block" 
                                        priority 
                                    />
                                </div>
                            )}
                            
                            {/* Móvil (Solo se muestra si hay portada móvil explícita) */}
                            {liveTheme.layout?.hero_mobile_url && (
                                <div className="block md:hidden w-full">
                                    <div className="relative w-full aspect-[4/5] max-h-[320px] overflow-hidden">
                                        <Image 
                                            src={getOptimizedUrl(liveTheme.layout.hero_mobile_url)} 
                                            alt="Portada móvil" 
                                            fill 
                                            className="object-cover object-center" 
                                            priority 
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </>
        );
    }

  // ==========================================
    // 💎 RENDERIZADO: TEMA 3 - MINIMAL LUXURY (GLASS HEADER)
    // ==========================================
    if (props.layoutStyle === 'minimal') {
        return (
            <>
                <div className={`fixed top-0 left-0 right-0 z-40 bg-[var(--store-bg)]/80 backdrop-blur-md border-b-[length:var(--border-width-ui)] border-[var(--store-border)]/30 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${props.isStickyVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                    
                    {/* Top Bar Elegante (Opcional, ultra delgada) */}
                    <div className="bg-[var(--store-text-main)] text-[var(--store-bg)] px-4 md:px-8 py-1.5 flex justify-center md:justify-between items-center text-[8px] md:text-[9px] uppercase tracking-[0.2em] font-bold">
                        <span className="hidden md:block opacity-90">Envíos asegurados a nivel nacional</span>
                        <div className="flex items-center gap-2 opacity-90">
                            <span>Tasa BCV: Bs. {Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(props.activeRate)}</span>
                        </div>
                    </div>

                    {/* Main Header Simétrico (Estilo Maen Donati) */}
                    <div className="max-w-[1500px] mx-auto px-4 md:px-8 py-4 md:py-5 flex items-center justify-between">
                        
                        {/* Izquierda: Botón Menú Editorial */}
                        <div className="flex-1 flex justify-start">
                            <button onClick={() => setIsMobileMenuOpen(true)} className="flex items-center gap-2 text-[var(--store-text-main)] hover:opacity-70 transition-opacity active:scale-95">
                                <Menu size={22} strokeWidth={1} />
                                <span className="hidden md:block text-[10px] font-bold uppercase tracking-widest mt-0.5">Menu</span>
                            </button>
                        </div>

                        {/* Centro: Logo Protagónico */}
                        <div className="flex-1 flex justify-center">
                            <LogoBlock centered />
                        </div>

                        {/* Derecha: Iconos Limpios */}
                        <div className="flex-1 flex justify-end items-center gap-1 md:gap-3">
                            <button onClick={() => setIsMinimalSearchOpen(!isMinimalSearchOpen)} className="w-10 h-10 flex items-center justify-center text-[var(--store-text-main)] hover:opacity-70 transition-opacity active:scale-95">
                                {isMinimalSearchOpen ? <X size={20} strokeWidth={1} /> : <Search size={20} strokeWidth={1} />}
                            </button>
                            <button onClick={props.onProfileClick} className="w-10 h-10 hidden md:flex items-center justify-center text-[var(--store-text-main)] hover:opacity-70 transition-opacity active:scale-95">
                                <UserCircle size={22} strokeWidth={1} />
                            </button>
                           <button data-cart-target="true" onClick={() => document.dispatchEvent(new CustomEvent('toggleCartDrawer'))} className="hidden md:flex relative p-2 text-[var(--store-text-main)] hover:opacity-70 transition-opacity active:scale-95">
                                <motion.div animate={props.cartControls} className="flex items-center justify-center origin-top">
                                    <ShoppingBag size={20} strokeWidth={1} />
                                </motion.div>
                                <AnimatePresence>
                                    {props.hasItems && (
                                        <motion.span key={props.totalItems} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute top-1.5 right-1 bg-[var(--store-text-main)] text-[var(--store-bg)] text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full">
                                            {props.totalItems}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </button>
                        </div>
                    </div>

                {/* Buscador Desplegable */}
                    <AnimatePresence>
                        {isMinimalSearchOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden flex justify-center bg-[var(--store-bg)] border-t border-[var(--store-border)]/30">
                                <div className="w-full max-w-2xl relative my-6 px-4">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--store-surface-text)]" size={18} strokeWidth={1} />
                                    <input
                                        type="text"
                                        placeholder="Buscar piezas, colecciones o fragancias..."
                                        value={props.search}
                                        onChange={(e) => props.setSearch(e.target.value)}
                                        className="w-full bg-transparent border-0 border-b-[length:var(--border-width-ui)] border-[var(--store-border)] py-4 pl-12 pr-4 text-base font-medium text-[var(--store-text-main)] placeholder:text-[var(--store-surface-text)] outline-none focus:ring-0 focus:border-[var(--text-main)] transition-colors font-heading italic"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 🚀 EL MENÚ EDITORIAL A PANTALLA COMPLETA */}
                <MobileMenu />

       {/* 💎 2. HERO BANNER EDITORIAL RESPONSIVO (Segregación Estricta) */}
                {/* Renderizado fuera del fixed con padding superior para el efecto de cristal líquido */}
                {(liveTheme.layout?.hero_desktop_url || props.store.hero_url || liveTheme.layout?.hero_mobile_url) && (
                    <div className="w-full bg-[var(--store-bg)] flex justify-center overflow-hidden pt-[90px] md:pt-[130px]">
                        <div className="w-full max-w-[1500px] px-4 md:px-12 py-4 md:py-6">
                            <div 
                                className="relative w-full"
                                style={{
                                    WebkitMaskImage: 'linear-gradient(to bottom, black 50%, rgba(0,0,0,0.92) 65%, rgba(0,0,0,0.6) 80%, rgba(0,0,0,0.2) 92%, transparent 100%)',
                                    maskImage: 'linear-gradient(to bottom, black 50%, rgba(0,0,0,0.92) 65%, rgba(0,0,0,0.6) 80%, rgba(0,0,0,0.2) 92%, transparent 100%)'
                                }}
                            >
                                {/* Desktop (Solo si hay banner desktop) */}
                                {(liveTheme.layout?.hero_desktop_url || props.store.hero_url) && (
                                    <div className="hidden md:block w-full relative aspect-[21/9] max-h-[420px] border-[length:var(--border-width-ui)] border-[var(--store-border)]/30 overflow-hidden bg-[var(--store-surface)] rounded-[var(--radius-card)]">
                                        <Image 
                                            src={getOptimizedUrl(liveTheme.layout?.hero_desktop_url || props.store.hero_url)} 
                                            alt="Banner de escritorio" 
                                            fill 
                                            sizes="(max-width: 1500px) 100vw, 1500px"
                                            className="object-cover" 
                                            priority 
                                        />
                                    </div>
                                )}
                                
                                {/* Móvil (Solo si hay portada móvil explícita) */}
                                {liveTheme.layout?.hero_mobile_url && (
                                    <div className="block md:hidden w-full">
                                        <div className="relative w-full aspect-[4/5] max-h-[350px] border-[length:var(--border-width-ui)] border-[var(--store-border)]/30 overflow-hidden bg-[var(--store-surface)] rounded-[var(--radius-card)]">
                                            <Image 
                                                src={getOptimizedUrl(liveTheme.layout.hero_mobile_url)} 
                                                alt="Portada móvil" 
                                                fill 
                                                className="object-cover object-center" 
                                                priority 
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                          {/* 🚀 EL SUB-TICKER EDITORIAL DINÁMICO */}
                            <div className="w-full text-center py-5 border-b border-[var(--store-border)]/20">
                                <p className="font-heading italic text-xs md:text-sm text-[var(--store-surface-text)] tracking-wider">
                                    {liveTheme.layout?.hero_subtitle || "— Diseños atemporales y fragancias exclusivas creadas para perdurar —"}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // ==========================================
    // 🏴‍☠️ RENDERIZADO: TEMA 4 - STREETWEAR BRUTALIST (MARQUEE & RAW UI)
    // ==========================================
    if (props.layoutStyle === 'brutalist') {
        return (
            <>
                {/* 1. MARQUEE TICKER INFINITO (High-Energy Brutalist Top Bar) */}
                <div className="bg-[var(--store-primary)] text-[var(--store-primary-text)] border-b-2 border-[var(--store-border)] py-1.5 overflow-hidden flex items-center select-none">
                    <motion.div 
                        animate={{ x: ["0%", "-50%"] }} 
                        transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
                        className="flex items-center gap-8 whitespace-nowrap text-[10px] font-mono font-black uppercase tracking-[0.25em]"
                    >
                        <span>🔥 LIMITED DROP DISPONIBLE</span>
                        <span>•</span>
                        <span>⚡ DESPACHO NACIONAL 24-48H</span>
                        <span>•</span>
                        <span>📦 PIEZAS DE EDICIÓN LIMITADA</span>
                        <span>•</span>
                        <span>TASA BCV: BS. {Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(props.activeRate)}</span>
                        <span>•</span>
                        <span>🔥 LIMITED DROP DISPONIBLE</span>
                        <span>•</span>
                        <span>⚡ DESPACHO NACIONAL 24-48H</span>
                        <span>•</span>
                        <span>📦 PIEZAS DE EDICIÓN LIMITADA</span>
                        <span>•</span>
                        <span>TASA BCV: BS. {Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(props.activeRate)}</span>
                    </motion.div>
                </div>

                {/* 2. ENCABEZADO PRINCIPAL BRUTALISTA */}
                <div className={`sticky top-0 z-40 bg-[var(--store-bg)] border-b-2 border-[var(--store-border)] transition-transform duration-300 ${props.isStickyVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                    <div className="max-w-[1500px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
                        <LogoBlock />
                        
                        {/* Buscador de Alto Contraste en Desktop */}
                        <div className="hidden md:flex flex-1 max-w-md">
                            <div className="relative w-full">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--store-surface-text)]" size={16} strokeWidth={2.5} />
                                <input
                                    type="text"
                                    placeholder="BUSCAR STREETWEAR / DROP..."
                                    value={props.search}
                                    onChange={(e) => props.setSearch(e.target.value)}
                                    className="w-full bg-[var(--store-surface)] border-2 border-[var(--store-border)] pl-10 pr-4 py-2 text-xs font-mono font-bold text-[var(--store-text-main)] placeholder:text-[var(--store-surface-text)] outline-none focus:border-[var(--store-primary)] uppercase tracking-wider"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <RateBlock />
                            <IconsBlock />
                        </div>
                    </div>

                    {/* Buscador Móvil + Categorías Cinta Adhesiva */}
                    <div className="px-4 pb-3 flex flex-col gap-2 md:hidden">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--store-surface-text)]" size={15} strokeWidth={2.5} />
                            <input
                                type="text"
                                placeholder="BUSCAR DROP..."
                                value={props.search}
                                onChange={(e) => props.setSearch(e.target.value)}
                                className="w-full bg-[var(--store-surface)] border-2 border-[var(--store-border)] pl-9 pr-3 py-2 text-xs font-mono font-bold text-[var(--store-text-main)] outline-none uppercase"
                            />
                        </div>
                    </div>

                    <div className="px-4 md:px-8 pb-3 border-t border-[var(--store-border)]/40 pt-2">
                        <CategoriesBlock />
                    </div>
                </div>

                {/* 3. HERO BANNER BRUTALISTA (Segregación Estricta con Borde Cortante) */}
                {(liveTheme.layout?.hero_desktop_url || props.store.hero_url || liveTheme.layout?.hero_mobile_url) && (
                    <div className="w-full bg-[var(--store-bg)] flex justify-center overflow-hidden border-b-2 border-[var(--store-border)]">
                        <div 
                            className="relative w-full max-w-[1500px]"
                            style={{
                                WebkitMaskImage: 'linear-gradient(to bottom, black 60%, rgba(0,0,0,0.85) 75%, transparent 100%)',
                                maskImage: 'linear-gradient(to bottom, black 60%, rgba(0,0,0,0.85) 75%, transparent 100%)'
                            }}
                        >
                            {(liveTheme.layout?.hero_desktop_url || props.store.hero_url) && (
                                <div className="hidden md:block w-full">
                                    <Image src={getOptimizedUrl(liveTheme.layout?.hero_desktop_url || props.store.hero_url)} alt="Streetwear Hero" width={1920} height={600} className="w-full h-auto block" priority />
                                </div>
                            )}
                            {liveTheme.layout?.hero_mobile_url && (
                                <div className="block md:hidden w-full">
                                    <div className="relative w-full aspect-[4/5] max-h-[320px] overflow-hidden">
                                        <Image src={getOptimizedUrl(liveTheme.layout.hero_mobile_url)} alt="Streetwear Portada" fill className="object-cover object-center" priority />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </>
        );
    }

    // ==========================================
    // 🍔 RENDERIZADO: TEMA 5 - BISTRO & FAST FOOD (PILL NAV & APP FEEL)
    // ==========================================
    if (props.layoutStyle === 'pill_nav') {
        return (
            <>
                {/* 1. TOP BAR GASTRONÓMICA */}
                <div className="bg-[var(--store-bg)] px-4 md:px-8 py-2 flex items-center justify-between border-b border-[var(--store-border)]/40 text-xs font-bold">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black tracking-wider uppercase">
                            <Utensils size={11} /> Cocina Activa & Delivery
                        </span>
                    </div>
                    <RateBlock />
                </div>

                {/* 2. HEADER FLOTANTE TIPO APP */}
                <div className={`sticky top-0 z-40 bg-[var(--store-bg)]/95 backdrop-blur-xl border-b border-[var(--store-border)]/40 transition-transform duration-300 ${props.isStickyVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                    <div className="max-w-[1500px] mx-auto px-4 md:px-8 py-3.5 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-4">
                            <LogoBlock />
                            
                            {/* Buscador Píldora Completo */}
                            <div className="hidden md:flex flex-1 max-w-lg">
                                <div className="relative w-full">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--store-surface-text)]" size={16} />
                                    <input
                                        type="text"
                                        placeholder="¿Qué se te antoja hoy? (Hamburguesas, pizzas, combos...)"
                                        value={props.search}
                                        onChange={(e) => props.setSearch(e.target.value)}
                                        className="w-full bg-[var(--store-surface)] border-[length:var(--border-width-ui)] border-[var(--store-border)] rounded-full pl-11 pr-4 py-2.5 text-xs font-medium text-[var(--store-text-main)] placeholder:text-[var(--store-surface-text)] outline-none focus:ring-2 focus:ring-[var(--store-primary)]/20 shadow-xs"
                                    />
                                </div>
                            </div>

                            <IconsBlock />
                        </div>

                        {/* Buscador Mobile Píldora */}
                        <div className="block md:hidden w-full">
                            <div className="relative w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--store-surface-text)]" size={15} />
                                <input
                                    type="text"
                                    placeholder="Buscar plato, combo o bebida..."
                                    value={props.search}
                                    onChange={(e) => props.setSearch(e.target.value)}
                                    className="w-full bg-[var(--store-surface)] border-[length:var(--border-width-ui)] border-[var(--store-border)] rounded-full pl-10 pr-4 py-2 text-xs font-medium text-[var(--store-text-main)] outline-none"
                                />
                            </div>
                        </div>

                        {/* Barra de Menú de Categorías (Píldoras) */}
                        <div className="pt-1">
                            <CategoriesBlock />
                        </div>
                    </div>
                </div>

                {/* 3. HERO BANNER GASTRONÓMICO (Esquinas Redondeadas & Apetito) */}
                {(liveTheme.layout?.hero_desktop_url || props.store.hero_url || liveTheme.layout?.hero_mobile_url) && (
                    <div className="w-full bg-[var(--store-bg)] flex justify-center overflow-hidden">
                        <div 
                            className="relative w-full max-w-[1500px]"
                            style={{
                                WebkitMaskImage: 'linear-gradient(to bottom, black 50%, rgba(0,0,0,0.9) 65%, rgba(0,0,0,0.5) 80%, transparent 100%)',
                                maskImage: 'linear-gradient(to bottom, black 50%, rgba(0,0,0,0.9) 65%, rgba(0,0,0,0.5) 80%, transparent 100%)'
                            }}
                        >
                            {(liveTheme.layout?.hero_desktop_url || props.store.hero_url) && (
                                <div className="hidden md:block w-full">
                                    <Image src={getOptimizedUrl(liveTheme.layout?.hero_desktop_url || props.store.hero_url)} alt="Bistro Hero" width={1920} height={600} className="w-full h-auto block" priority />
                                </div>
                            )}
                            {liveTheme.layout?.hero_mobile_url && (
                                <div className="block md:hidden w-full">
                                    <div className="relative w-full aspect-[4/5] max-h-[300px] overflow-hidden">
                                        <Image src={getOptimizedUrl(liveTheme.layout.hero_mobile_url)} alt="Bistro Portada" fill className="object-cover object-center" priority />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </>
        );
    }

    // ==========================================
    // 🌟 RENDERIZADO: TEMA 1 - PREZISO UNIVERSAL (CLASSIC)
    // ==========================================
    return (
        <>
            <div className="bg-[var(--store-bg)] px-4 md:px-8 py-3.5 flex items-center justify-between border-b border-[var(--store-border)]/30">
                <LogoBlock />
                <RateBlock />
            </div>
{/* 🚀 HERO BANNER DUAL PARA EL TEMA UNIVERSAL (Desvanecido Inferior Líquido) */}
            {(liveTheme.layout?.hero_desktop_url || props.store.hero_url || liveTheme.layout?.hero_mobile_url) && (
                <div className="w-full bg-[var(--store-bg)] flex justify-center overflow-hidden">
                    <div 
                        className="relative w-full"
                        style={{
                            WebkitMaskImage: 'linear-gradient(to bottom, black 50%, rgba(0,0,0,0.92) 65%, rgba(0,0,0,0.6) 80%, rgba(0,0,0,0.2) 92%, transparent 100%)',
                            maskImage: 'linear-gradient(to bottom, black 50%, rgba(0,0,0,0.92) 65%, rgba(0,0,0,0.6) 80%, rgba(0,0,0,0.2) 92%, transparent 100%)'
                        }}
                    >
                        
                        {/* Desktop (Ancho fluido, alto automático de 1920x600 px) */}
                        {(liveTheme.layout?.hero_desktop_url || props.store.hero_url) && (
                            <div className="hidden md:block w-full">
                                <Image 
                                    src={getOptimizedUrl(liveTheme.layout?.hero_desktop_url || props.store.hero_url)} 
                                    alt="Banner de escritorio" 
                                    width={1920} 
                                    height={600} 
                                    className="w-full h-auto block" 
                                    priority 
                                />
                            </div>
                        )}

                        {/* Móvil (Lógica de Fallback Legacy) */}
                        <div className="block md:hidden w-full">
                            {liveTheme.layout?.hero_mobile_url ? (
                                /* Si hay portada móvil nativa 4:5, usa el contenedor optimizado */
                                <div className="relative w-full aspect-[4/5] max-h-[320px] overflow-hidden">
                                    <Image 
                                        src={getOptimizedUrl(liveTheme.layout.hero_mobile_url)} 
                                        alt="Portada móvil" 
                                        fill 
                                        className="object-cover object-center" 
                                        priority 
                                    />
                                </div>
                            ) : (liveTheme.layout?.hero_desktop_url || props.store.hero_url) ? (
                                /* Si NO hay portada móvil, renderiza el banner horizontal legacy sin forzar recortes */
                                <Image 
                                    src={getOptimizedUrl(liveTheme.layout?.hero_desktop_url || props.store.hero_url)} 
                                    alt="Banner móvil legacy" 
                                    width={1920} 
                                    height={600} 
                                    className="w-full h-auto block" 
                                    priority 
                                />
                            ) : null}
                        </div>

                    </div>
                </div>
            )}

                 
           <div className={`sticky top-0 z-40 bg-[var(--store-bg)]/95 backdrop-blur-xl pt-4 md:pt-6 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${props.isStickyVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="max-w-[1500px] mx-auto px-4 md:px-8 pb-[2px]">
                    <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-center mb-3 md:mb-5">
                        
                    {/* 1. Buscador (Ancho rígido protegido en desktop) */}
                        <div className="flex items-center w-full md:w-72 shrink-0 gap-1">
                            {renderSearchBlock(false)}
                            <div className="md:hidden flex items-center"><IconsBlock /></div>
                        </div>

                        {/* 2. Categorías (Elásticas y Auto-centradas) */}
                        <CategoriesBlock />
                        
                        {/* 3. Iconos (Fijos en el extremo derecho de la grilla) */}
                        <div className="hidden md:flex shrink-0"><IconsBlock /></div>
                    </div>
                </div>
            </div>
        </>
    );
}