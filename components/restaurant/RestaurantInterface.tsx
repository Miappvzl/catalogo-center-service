// components/restaurant/RestaurantInterface.tsx
'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion, useScroll, useTransform, useAnimation } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-client'
import CustomerAuth from '@/components/passport/CustomerAuth'
import { getTenantHref } from '@/utils/navigation'
import { isValidUUID } from '@/utils/validations'
import { Search, SlidersHorizontal, ArrowRight, Home, User, Heart, ShoppingBag, X, Utensils, RotateCcw } from 'lucide-react'
import { normalizeThemeConfig, generateCssVariables } from '@/utils/themeAdapter'
import { evaluateStoreHours } from '@/utils/storeHours'
import { getOptimizedUrl } from '@/utils/cdn'
import { useCart } from '@/app/store/useCart'
import FoodDishCard from './FoodDishCard'
import RestaurantHeader from './RestaurantHeader'
import RestaurantCategoryRail from './RestaurantCategoryRail'
import ProductFoodModal from '@/components/ui/ProductFoodModal'
import FloatingCheckout from '@/components/FloatingCheckout'
import RestaurantFilterModal, { DEFAULT_FILTERS, RestaurantFiltersState } from './RestaurantFilterModal'
import BCVLogo from '@/components/icons/BCVLogo'

interface RestaurantInterfaceProps {
    store: any
    products: any[]
    rates: { usd_rate: number; eur_rate: number }
    promotions?: any[]
    
}

export default function RestaurantInterface({
    store,
    products,
    rates,
    promotions = []
}: RestaurantInterfaceProps) {

    // 1. Sincronización en vivo con el Customizador
    const [liveConfig, setLiveConfig] = useState<any>(() => normalizeThemeConfig(store?.theme_config))
    const activeTheme = useMemo(() => normalizeThemeConfig(liveConfig), [liveConfig])
    const activeThemeVariables = useMemo(() => generateCssVariables(activeTheme), [activeTheme])
    const scheduleStatus = useMemo(() => evaluateStoreHours(store?.store_hours), [store?.store_hours])

   


    // FÍSICA PARALLAX DE ALTO RENDIMIENTO (COMPOSITOR THREAD)
    const { scrollY } = useScroll()
    const heroY = useTransform(scrollY, [0, 220], [0, 35])
    const heroScale = useTransform(scrollY, [0, 220], [1, 0.96])
    const heroOpacity = useTransform(scrollY, [0, 200], [1, 0.88])

    // CONTROLADOR DE IMPACTO TÁCTIL (Squash & Stretch en la Bolsa)
    const cartControls = useAnimation()

    useEffect(() => {
        const handleImpact = () => {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(15)
            }
            cartControls.start({
                y: [0, 4, -2, 0],
                scale: [1, 0.88, 1.12, 1],
                transition: { duration: 0.35, ease: "easeInOut", times: [0, 0.25, 0.65, 1] }
            })
        }

        // MOTOR PARABÓLICO EN EL HILO DEL COMPOSITOR (Web Animations API)
        const handleFly = (e: any) => {
            const targets = document.querySelectorAll('[data-cart-target="true"]')
            let destNode = targets[0]
            for (let i = 0; i < targets.length; i++) {
                const rect = targets[i].getBoundingClientRect()
                if (rect.width > 0 && rect.height > 0) { 
                    destNode = targets[i]
                    break 
                }
            }

            if (!destNode) { 
                handleImpact()
                return 
            }

            const startRect = e.detail.startRect
            if (!startRect) { 
                handleImpact()
                return 
            }

            const destRect = destNode.getBoundingClientRect()
            // Clamping de tamaño para evitar redibujados masivos si el hero del modal era grande
            const size = Math.min(startRect.width, startRect.height, 70)
            const offsetX = startRect.left + (startRect.width - size) / 2
            const offsetY = startRect.top + (startRect.height - size) / 2

            const wrapper = document.createElement('div')
            wrapper.style.position = 'fixed'
            wrapper.style.top = `${offsetY}px`
            wrapper.style.left = `${offsetX}px`
            wrapper.style.width = `${size}px`
            wrapper.style.height = `${size}px`
            wrapper.style.zIndex = '999999'
            wrapper.style.pointerEvents = 'none'
            wrapper.style.transformOrigin = 'center center'

            const img = document.createElement('img')
            img.src = e.detail.src || '/pezisologo.png'
            img.style.width = '100%'
            img.style.height = '100%'
            img.style.borderRadius = '50%'
            img.style.objectFit = 'cover'
            img.style.boxShadow = '0 12px 28px rgba(0,0,0,0.35)'
            img.style.backgroundColor = '#ffffff'
            img.style.border = '2px solid white'

            wrapper.appendChild(img)
            document.body.appendChild(wrapper)

            const startCenterX = offsetX + size / 2
            const startCenterY = offsetY + size / 2
            const destCenterX = destRect.left + destRect.width / 2
            const destCenterY = destRect.top + destRect.height / 2
            const deltaX = destCenterX - startCenterX
            const deltaY = destCenterY - startCenterY

            // 1. Traslación en Eje X (Aceleración lineal pura)
            wrapper.animate([
                { transform: 'translate(0px, 0px)' },
                { transform: `translate(${deltaX}px, 0px)` }
            ], { duration: 480, easing: 'linear', fill: 'forwards' })

            // 2. Parábola en Eje Y con gravedad, rotación y desvanecimiento final
            const yAnim = img.animate([
                { transform: 'translateY(0px) scale(1) rotate(0deg)', opacity: 1 },
                { transform: `translateY(${deltaY * 0.35}px) scale(0.85) rotate(-18deg)`, opacity: 0.95, offset: 0.45 },
                { transform: `translateY(${deltaY}px) scale(0.2) rotate(0deg)`, opacity: 0.1 }
            ], { duration: 480, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' })

            yAnim.onfinish = () => {
                wrapper.remove()
                handleImpact()
            }
        }

        document.addEventListener('cartImpact', handleImpact)
        document.addEventListener('flyToCart', handleFly)
        return () => {
            document.removeEventListener('cartImpact', handleImpact)
            document.removeEventListener('flyToCart', handleFly)
        }
    }, [cartControls])


    

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const origin = event.origin || ''
            const isAllowed = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('vercel.app') || origin.includes('preziso')
            if (!isAllowed) return
            if (event.data?.type === 'UPDATE_THEME') {
                setLiveConfig(normalizeThemeConfig(event.data.config))
            }
        }
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [])

    const isEur = store?.currency_type === 'eur'
    const activeRate = isEur ? Number(rates?.eur_rate || 0) : Number(rates?.usd_rate || 0)

    // Estados de navegación y filtros
    const [searchQuery, setSearchQuery] = useState('')
    const [activeCategory, setActiveCategory] = useState<string>('Todos')
    const [bottomTab, setBottomTab] = useState<'home' | 'favorites'>('home')
    const [isRateModalOpen, setIsRateModalOpen] = useState(false)
    const [isFoodModalOpen, setIsFoodModalOpen] = useState(false)
    const [selectedProductForModal, setSelectedProductForModal] = useState<any>(null)
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())

    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const [filters, setFilters] = useState<RestaurantFiltersState>(DEFAULT_FILTERS)

    // Control de scroll para el header inteligente
    const [isStickyHeaderVisible, setIsStickyHeaderVisible] = useState(true)
    const lastScrollY = useRef(0)
    const isManualScrolling = useRef(false)
     // Router y Supabase
    const router = useRouter()
    const supabase = useMemo(() => getSupabase(), [])

    // Estados de Passport y Usuario
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

// 1. Escucha de sesión de usuario en tiempo real
    useEffect(() => {
        supabase.auth.getUser().then(({ data }: { data: any }) => setCurrentUser(data.user))
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setCurrentUser(session?.user || null)
        })
        return () => subscription.unsubscribe()
    }, [supabase])

    // 2. Carga de favoritos reales desde la tabla 'favorites' de Supabase
    useEffect(() => {
        if (!currentUser?.id || !store?.id || !isValidUUID(currentUser.id) || !isValidUUID(store.id)) {
            setFavoriteIds(new Set())
            return
        }

        const initCustomerOnStore = async () => {
            try {
                await supabase.rpc('onboard_customer', { p_store_id: store.id })
                const { data } = await supabase
                    .from('favorites')
                    .select('product_id')
                    .eq('store_id', store.id)
                    .eq('customer_id', currentUser.id)

                if (data) {
                    setFavoriteIds(new Set(data.map((f: any) => String(f.product_id))))
                }
            } catch (err) {
                console.error('Alerta silenciosa: error sincronizando favoritos:', err)
            }
        }

        initCustomerOnStore()
    }, [currentUser, store?.id, supabase])

    // 3. Candado de seguridad en favoritos: Si no hay usuario, abre el modal de registro
    useEffect(() => {
        const handleToggleFavorite = async (e: any) => {
            const product = e.detail
            
            // Si el cliente no ha iniciado sesión, bloquea la acción y abre Passport
            if (!currentUser) {
                setIsAuthModalOpen(true)
                return
            }

            const productId = String(product.id)
            const isFav = favoriteIds.has(productId)

            // Actualización optimista de UI
            setFavoriteIds(prev => {
                const next = new Set(prev)
                if (isFav) next.delete(productId)
                else next.add(productId)
                return next
            })

            try {
                if (isFav) {
                    await supabase
                        .from('favorites')
                        .delete()
                        .eq('store_id', store.id)
                        .eq('customer_id', currentUser.id)
                        .eq('product_id', product.id)
                } else {
                    await supabase
                        .from('favorites')
                        .insert({
                            store_id: store.id,
                            customer_id: currentUser.id,
                            product_id: product.id
                        })
                }
            } catch (error) {
                console.error('Error mutando favorito:', error)
                // Revertir estado si hay fallo de red
                setFavoriteIds(prev => {
                    const next = new Set(prev)
                    if (isFav) next.add(productId)
                    else next.delete(productId)
                    return next
                })
            }
        }

        const handleOpenAuth = () => setIsAuthModalOpen(true)

        document.addEventListener('toggleFavorite', handleToggleFavorite)
        document.addEventListener('openAuthModal', handleOpenAuth)
        return () => {
            document.removeEventListener('toggleFavorite', handleToggleFavorite)
            document.removeEventListener('openAuthModal', handleOpenAuth)
        }
    }, [currentUser, favoriteIds, store?.id, supabase])


     const handleProfileClick = () => {
        if (currentUser) {
            router.push(getTenantHref('/passport', store.slug))
        } else {
            setIsAuthModalOpen(true)
        }
    }

    useEffect(() => {
        let ticking = false
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const currentScrollY = window.scrollY
                    if (currentScrollY < 120) {
                        setIsStickyHeaderVisible(true)
                    } else if (currentScrollY > lastScrollY.current + 5) {
                        setIsStickyHeaderVisible(false)
                    } else if (currentScrollY < lastScrollY.current - 5) {
                        setIsStickyHeaderVisible(true)
                    }
                    lastScrollY.current = currentScrollY
                    ticking = false
                })
                ticking = true
            }
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Variables de identidad
    const greetingText = activeTheme.layout?.greeting_text || 'Bienvenido a'
    const sloganText = activeTheme.layout?.slogan_text || store.description || 'Delicioso. Todos los días.'
    const heroBtnText = activeTheme.layout?.hero_button_text || 'Ordenar Ahora'
    const isPngLogo = activeTheme.layout?.logo_type === 'png_transparent'


       const resolvedDesktopHeroUrl = activeTheme.layout?.hero_desktop_url || store?.hero_url || activeTheme.layout?.hero_mobile_url
    const resolvedMobileHeroUrl = activeTheme.layout?.hero_mobile_url || store?.hero_url || activeTheme.layout?.hero_desktop_url
    // Carrito de compras
    const items = useCart(state => state.items)
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)
    const cartTotalUSD = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    const cartTotalBS = cartTotalUSD * activeRate

    // Favoritos
    useEffect(() => {
        const handleToggleFav = (e: any) => {
            const id = String(e.detail.id)
            setFavoriteIds(prev => {
                const next = new Set(prev)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
            })
        }
        document.addEventListener('toggleFavorite', handleToggleFav)
        return () => document.removeEventListener('toggleFavorite', handleToggleFav)
    }, [])

    // Categorías ordenadas
    const categories = useMemo(() => {
        const rawCats = products.map(p => p.category?.trim()).filter(Boolean) as string[]
        const uniqueCats = Array.from(new Set(rawCats))
        const savedOrder: string[] = store?.categories_order || []
        return uniqueCats.sort((a, b) => {
            const idxA = savedOrder.indexOf(a)
            const idxB = savedOrder.indexOf(b)
            if (idxA !== -1 && idxB !== -1) return idxA - idxB
            if (idxA !== -1) return -1
            if (idxB !== -1) return 1
            return a.localeCompare(b)
        })
    }, [products, store?.categories_order])

    // Miniaturas para categorías
    const categoryImages = useMemo(() => {
        const customImages = store?.category_images || {}
        const map: Record<string, string> = { ...customImages }
        if (products && Array.isArray(products)) {
            categories.forEach(cat => {
                if (map[cat]) return
                const catClean = cat.trim().toLowerCase()
                const catProducts = products.filter(p => p.category?.trim().toLowerCase() === catClean && p.status === 'active')
                const sorted = [...catProducts].sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
                const productWithImage = sorted.find((p: any) => p.image_url)
                if (productWithImage?.image_url) map[cat] = productWithImage.image_url
            })
        }
        return map
    }, [store?.category_images, categories, products])

    const featuredProducts = useMemo(() => products.filter(p => p.is_featured && p.status === 'active'), [products])
    const favoriteProducts = useMemo(() => products.filter(p => favoriteIds.has(String(p.id)) && p.status === 'active'), [products, favoriteIds])

    const productsByCategory = useMemo(() => {
        const map: Record<string, any[]> = {}
        categories.forEach(cat => {
            map[cat] = products.filter(p => p.category?.trim().toLowerCase() === cat.toLowerCase() && p.status === 'active')
        })
        return map
    }, [products, categories])

    // Filtros calculados
    const activeFiltersCount = useMemo(() => {
        let count = 0
        if (filters.sortBy !== 'default') count++
        if (filters.maxPrepTime !== null) count++
        if (filters.priceRange !== 'all') count++
        if (filters.onlyPromos) count++
        return count
    }, [filters])

    const filteredProductsList = useMemo(() => {
        let list = [...products].filter(p => p.status === 'active')
        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase().trim()
            list = list.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
        }
        if (filters.onlyPromos) {
            list = list.filter(p => Number(p.compare_at_usd || 0) > Number(p.usd_cash_price || 0))
        }
        if (filters.maxPrepTime !== null) {
            list = list.filter(p => {
                if (!p.shipping_badge_title) return false
                const match = p.shipping_badge_title.match(/\d+/)
                if (!match) return true
                return parseInt(match[0], 10) <= filters.maxPrepTime!
            })
        }
        if (filters.priceRange === 'budget') {
            list = list.filter(p => Number(p.usd_cash_price || 0) < 10)
        } else if (filters.priceRange === 'medium') {
            list = list.filter(p => Number(p.usd_cash_price || 0) >= 10 && Number(p.usd_cash_price || 0) <= 20)
        } else if (filters.priceRange === 'premium') {
            list = list.filter(p => Number(p.usd_cash_price || 0) > 20)
        }
        if (filters.sortBy === 'popular') {
            list.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0))
        } else if (filters.sortBy === 'price_asc') {
            list.sort((a, b) => Number(a.usd_cash_price || 0) - Number(b.usd_cash_price || 0))
        } else if (filters.sortBy === 'price_desc') {
            list.sort((a, b) => Number(b.usd_cash_price || 0) - Number(a.usd_cash_price || 0))
        }
        return list
    }, [products, searchQuery, filters])

    const isFilteringActive = searchQuery.trim() !== '' || activeFiltersCount > 0

    const handleResetAllFilters = () => {
        setFilters(DEFAULT_FILTERS)
        setSearchQuery('')
    }

    const handleOpenDishModal = useCallback((product: any) => {
        const foodProduct = {
            ...product,
            modifier_groups: product.product_modifier_groups?.map((pmg: any) => pmg.modifier_groups).filter(Boolean) || []
        }
        setSelectedProductForModal(foodProduct)
        setIsFoodModalOpen(true)
    }, [])

 // SCROLL-SPY OPTIMIZADO (CERO RE-RENDERS EN SCROLL CONTINUO)
    useEffect(() => {
        if (isFilteringActive) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (isManualScrolling.current) return
                
                // Tomamos solo la sección más visible que intersecta
                const visibleEntry = entries.find(e => e.isIntersecting)
                if (visibleEntry) {
                    const catName = visibleEntry.target.getAttribute('data-category-name')
                    if (catName) {
                        // El callback funcional evita re-renderizar si la categoría es la misma
                        setActiveCategory(prev => prev === catName ? prev : catName)
                    }
                }
            },
            { rootMargin: '-110px 0px -65% 0px', threshold: 0 }
        )

        categories.forEach(cat => {
            const sectionId = `section-${cat.toLowerCase().replace(/\s+/g, '-')}`
            const el = document.getElementById(sectionId)
            if (el) observer.observe(el)
        })

        return () => observer.disconnect()
    }, [categories, isFilteringActive])

    const handleScrollToSection = (category: string) => {
        setActiveCategory(category)
        isManualScrolling.current = true
        if (category === 'Todos') {
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
            const targetId = `section-${category.toLowerCase().replace(/\s+/g, '-')}`
            const element = document.getElementById(targetId)
            if (element) {
                const yOffset = -165
                const y = element.getBoundingClientRect().top + window.scrollY + yOffset
                window.scrollTo({ top: y, behavior: 'smooth' })
            }
        }
        setTimeout(() => {
            isManualScrolling.current = false
        }, 800)
    }

    return (
        <div
            className="min-h-screen pb-36 font-sans antialiased selection:bg-[var(--store-primary)] selection:text-[var(--store-primary-text)]"
            style={{
                ...activeThemeVariables,
                backgroundColor: 'var(--store-bg)',
                color: 'var(--store-text-main)',
                fontFamily: 'var(--font-body, var(--font-inter), sans-serif)'
            }}
        >
            <style dangerouslySetInnerHTML={{ __html: `
                @media (max-width: 768px) {
                    #floating-checkout-trigger { display: none !important; }
                }
            `}} />

         {/* ========================================================================= */}
            {/* VISTA MÓVIL NATIVA CON PARALLAX Y DOCKING MAGNÉTICO                       */}
            {/* ========================================================================= */}
            <div className="block md:hidden pb-32">
                
                {/* 1. IDENTIDAD DE CABECERA (Se desplaza con velocidad natural) */}
                <header className="px-5 pt-5 pb-2 bg-[var(--store-bg)]">
                    <div className="flex justify-between items-center gap-3">
                        <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-[10px] sm:text-[11px] text-[var(--store-surface-text)] font-semibold truncate mb-0.5">
                                {activeTheme.layout?.greeting_text || "Bienvenido a"}
                            </span>
                            
                            <div className="flex items-center gap-2.5">
                                {store?.logo_url && (
                                    activeTheme.layout?.logo_type === 'png_transparent' ? (
                                        <div className="h-9 w-auto max-w-[130px] relative shrink-0 flex items-center">
                                            <Image
                                                src={getOptimizedUrl(store.logo_url)}
                                                alt={store.name}
                                                width={130}
                                                height={36}
                                                className="object-contain max-h-9 w-auto"
                                                priority
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 aspect-square rounded-full overflow-hidden border border-[var(--store-border)]/60 bg-[var(--store-surface)] shrink-0 shadow-2xs flex items-center justify-center p-0.5">
                                            <Image
                                                src={getOptimizedUrl(store.logo_url)}
                                                alt={store.name}
                                                width={40}
                                                height={40}
                                                className="object-contain rounded-full"
                                            />
                                        </div>
                                    )
                                )}
                                
                                {activeTheme.layout?.logo_type !== 'png_transparent' && (
                                    <span className="font-black text-lg sm:text-xl text-[var(--store-text-main)] tracking-tight leading-none truncate">
                                        {store.name}
                                    </span>
                                )}
                            </div>

                            <span className="text-[10px] text-[var(--store-surface-text)] mt-1 font-medium truncate opacity-85">
                                {activeTheme.layout?.slogan_text || store.description || "Delicioso. Todos los días."}
                            </span>
                        </div>
                        
                        <div className="flex flex-col items-end justify-center border-l border-[var(--store-border)]/50 pl-3.5 h-8 shrink-0">
                            <span className="text-[8px] font-bold text-[var(--store-surface-text)] tracking-widest uppercase font-mono">TASA BCV</span>
                            <span className="text-xs sm:text-sm font-black text-[var(--store-text-main)] font-mono tabular-nums leading-none mt-0.5">
                                Bs. {activeRate.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </header>

                {/* 2. BUSCADOR Y FILTROS FIJOS EN EL TOPE (Sticky Nivel 1: top-0 z-30) */}
                <div className="sticky top-0 z-30 w-full bg-[var(--store-bg)]/98 backdrop-blur-sm border-b border-[var(--store-border)]/30 px-5 py-2.5 transition-colors transform-gpu"
>
                    <div className="flex items-center gap-2.5 max-w-lg mx-auto">
                        <div 
                            className="flex-1 bg-[var(--store-surface)] border-[length:var(--border-width-ui)] border-[var(--store-border)] shadow-[var(--shadow-ui)] flex items-center px-4 py-2.5 focus-within:border-[var(--store-primary)] transition-colors h-11"
                            style={{ borderRadius: 'var(--radius-search, 999px)' }}
                        >
                            <Search size={15} className="text-[var(--store-surface-text)] mr-2 shrink-0" />
                            <input 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar plato o ingrediente..." 
                                className="bg-transparent w-full text-xs font-semibold outline-none text-[var(--store-text-main)] placeholder:text-[var(--store-surface-text)]/60" 
                            />
                            {searchQuery && (
                                <button type="button" onClick={() => setSearchQuery('')} className="p-0.5 text-[var(--store-surface-text)] hover:text-[var(--store-text-main)]">
                                    <X size={13}/>
                                </button>
                            )}
                        </div>

                        {/* Botón de Filtros con Reseteo Integrado */}
                        <button 
                            type="button"
                            onClick={() => {
                                if (activeFiltersCount > 0) {
                                    handleResetAllFilters()
                                } else {
                                    setIsFilterModalOpen(true)
                                }
                            }}
                            className={`w-11 h-11 border-[length:var(--border-width-ui)] flex items-center justify-center active:scale-95 shrink-0 transition-all ${
                                activeFiltersCount > 0
                                    ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[var(--store-primary)] shadow-sm'
                                    : 'bg-[var(--store-surface)] text-[var(--store-text-main)] border-[var(--store-border)] shadow-[var(--shadow-ui)]'
                            }`}
                            style={{ borderRadius: 'var(--radius-btn, 12px)' }}
                            title={activeFiltersCount > 0 ? "Limpiar filtros" : "Filtrar menú"}
                        >
                            {activeFiltersCount > 0 ? (
                                <RotateCcw size={15} strokeWidth={2.5} />
                            ) : (
                                <SlidersHorizontal size={15} strokeWidth={2.2} />
                            )}
                        </button>
                    </div>
                </div>

                {/* 3. HERO BANNER CON PARALLAX (Pasa físicamente por debajo del buscador) */}
                {resolvedMobileHeroUrl && (
                  <motion.div 
    style={{ y: heroY, scale: heroScale, opacity: heroOpacity }}
    className="px-5 py-3 relative z-10 will-change-transform transform-gpu"
>

                        <div 
                            className="relative w-full aspect-[3/2] overflow-hidden bg-[var(--store-surface)] border-[length:var(--border-width-ui)] border-[var(--store-border)] shadow-[var(--shadow-ui)]"
                            style={{ borderRadius: 'var(--radius-card, 24px)' }}
                        >
                            <Image 
                                src={getOptimizedUrl(resolvedMobileHeroUrl)} 
                                alt="Portada gastronómica" 
                                fill 
                                priority 
                                className="object-cover" 
                            />
                            <button 
                                type="button"
                                onClick={() => categories[0] && handleScrollToSection(categories[0])}
                                className="absolute bottom-4 left-4 px-4 py-2 border-2 border-[var(--store-primary)] text-[var(--store-primary)] font-black text-xs bg-[var(--store-surface)]/90 backdrop-blur-md active:scale-95 shadow-[var(--shadow-ui)] flex items-center gap-1.5 uppercase tracking-wide transition-transform"
                                style={{ borderRadius: 'var(--radius-btn, 999px)' }}
                            >
                                {activeTheme.layout?.hero_button_text || "Ordenar Ahora"} <ArrowRight size={13} strokeWidth={3} />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* 4. CARRIL DE CATEGORÍAS (Sticky Nivel 2: Se fusiona en top-[59px] con el buscador) */}
                {!isFilteringActive && (
                    <div className="sticky top-[59px] z-20 w-full bg-[var(--store-bg)]/98 backdrop-blur-sm border-b border-[var(--store-border)]/30 transition-colors transform-gpu">

                        <nav 
                            aria-label="Selector de categorías"
                            className="w-full py-2 overflow-hidden"
                        >
                            <div className="flex items-start gap-4 sm:gap-5 overflow-x-auto no-scrollbar pl-6 pr-6 pt-1 pb-3 snap-x snap-mandatory scroll-pl-6 scroll-smooth">
                                <button 
                                    type="button"
                                    onClick={() => handleScrollToSection('Todos')} 
                                    className="flex flex-col items-center gap-1.5 shrink-0 snap-start outline-none group active:scale-95 transition-transform select-none"
                                >
                                    <div 
                                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors bg-[var(--store-surface)] shadow-[var(--shadow-ui)] ${
                                            activeCategory === 'Todos' 
                                                ? 'border-2 border-[var(--store-primary)]' 
                                                : 'border-[length:var(--border-width-ui)] border-[var(--store-border)] group-hover:border-[var(--store-text-main)]/30'
                                        }`}
                                    >
                                        <Utensils 
                                            size={20} 
                                            strokeWidth={2} 
                                            className={activeCategory === 'Todos' ? 'text-[var(--store-primary)]' : 'text-[var(--store-surface-text)]'} 
                                        />
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className={`text-[11px] tracking-tight leading-tight ${
                                            activeCategory === 'Todos' 
                                                ? 'text-[var(--store-primary)] font-black' 
                                                : 'text-[var(--store-surface-text)] font-bold'
                                        }`}>
                                            Todos
                                        </span>
                                        {activeCategory === 'Todos' && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--store-primary)] mt-1 shrink-0" />
                                        )}
                                    </div>
                                </button>
                                
                                {categories.map(cat => {
                                    const isActive = activeCategory === cat
                                    const imgUrl = categoryImages[cat]

                                    return (
                                        <button 
                                            key={cat} 
                                            type="button"
                                            onClick={() => handleScrollToSection(cat)} 
                                            className="flex flex-col items-center gap-1.5 shrink-0 snap-start outline-none group active:scale-95 transition-transform select-none"
                                        >
                                            <div 
                                                className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden transition-colors relative bg-[var(--store-surface)] shadow-[var(--shadow-ui)] ${
                                                    isActive 
                                                        ? 'border-2 border-[var(--store-primary)]' 
                                                        : 'border-[length:var(--border-width-ui)] border-[var(--store-border)] group-hover:border-[var(--store-text-main)]/30'
                                                }`}
                                            >
                                                {imgUrl ? (
                                                    <Image 
                                                        src={getOptimizedUrl(imgUrl)} 
                                                        alt={cat} 
                                                        fill 
                                                        sizes="64px" 
                                                        className="object-cover p-1.5 rounded-full" 
                                                    />
                                                ) : (
                                                    <span className="text-[10px] font-black uppercase text-[var(--store-surface-text)] opacity-40 tracking-wider">
                                                        {cat.substring(0, 3)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-center max-w-[72px]">
                                                <span className={`text-[11px] tracking-tight truncate w-full text-center leading-tight ${
                                                    isActive 
                                                        ? 'text-[var(--store-primary)] font-black' 
                                                        : 'text-[var(--store-surface-text)] font-semibold'
                                                }`}>
                                                    {cat}
                                                </span>
                                                {isActive && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--store-primary)] mt-1 shrink-0" />
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </nav>
                    </div>
                )}

                {/* 4. CUERPO DEL MENÚ */}
                {bottomTab === 'favorites' ? (
                    <div className="px-5 py-6">
                        <h2 className="text-xl font-black text-[var(--store-text-main)] mb-1">Tus Favoritos</h2>
                        <p className="text-xs text-[var(--store-surface-text)] mb-6">Platos guardados para pedir rápidamente.</p>
                        
                        {favoriteProducts.length === 0 ? (
                            <div className="text-center py-20 bg-[var(--store-surface)] rounded-3xl border border-[var(--store-border)]/50 p-6 space-y-3">
                                <Heart size={30} className="mx-auto text-[var(--store-surface-text)] opacity-40" />
                                <p className="text-sm font-bold text-[var(--store-text-main)]">Sin platos favoritos guardados</p>
                                <p className="text-xs text-[var(--store-surface-text)]">Toca el corazón en cualquier plato del menú para guardarlo aquí.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                {favoriteProducts.map((dish, idx) => (
                                    <FoodDishCard key={dish.id} product={dish} activeRate={activeRate} onOpenModal={handleOpenDishModal} index={idx} layoutVariant="grid" isFavorite={true} />
                                ))}
                            </div>
                        )}
                    </div>
                ) : isFilteringActive ? (
                    <div className="px-5 py-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-[var(--store-border)]/40 pb-2">
                            <h2 className="text-base font-black text-[var(--store-text-main)]">
                                {searchQuery ? `Resultados para "${searchQuery}"` : 'Platos Filtrados'}
                            </h2>
                            <span className="text-xs font-mono text-[var(--store-surface-text)]">
                                {filteredProductsList.length} encontrados
                            </span>
                        </div>

                        {filteredProductsList.length === 0 ? (
                            <div className="text-center py-16 bg-[var(--store-surface)] rounded-3xl border border-[var(--store-border)]/50 p-8 space-y-4 shadow-xs">
                                <div className="w-12 h-12 rounded-full bg-[var(--store-bg)] flex items-center justify-center mx-auto text-[var(--store-surface-text)]">
                                    <SlidersHorizontal size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[var(--store-text-main)]">No encontramos platos con estos filtros</h3>
                                    <p className="text-xs text-[var(--store-surface-text)] mt-1 max-w-xs mx-auto leading-relaxed">
                                        Prueba cambiando el rango de precio, el tiempo de cocina o limpia los filtros activos.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleResetAllFilters}
                                    className="px-5 py-2.5 rounded-full bg-[var(--store-primary)] text-[var(--store-primary-text)] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                                >
                                    <RotateCcw size={13} />
                                    <span>Restablecer Filtros</span>
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                {filteredProductsList.map((dish, idx) => (
                                    <FoodDishCard key={dish.id} product={dish} activeRate={activeRate} onOpenModal={handleOpenDishModal} index={idx} layoutVariant="grid" isFavorite={favoriteIds.has(String(dish.id))} />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Lo Más Pedido */}
                        {featuredProducts.length > 0 && (
                            <div className="py-3">
                                <div className="px-5 flex justify-between items-end mb-3.5">
                                    <h2 className="text-lg font-black text-[var(--store-text-main)] tracking-tight">Más Populares</h2>
                                    <button 
                                        type="button" 
                                        onClick={() => categories[0] && handleScrollToSection(categories[0])}
                                        className="text-[11px] font-bold text-[var(--store-primary)] flex items-center gap-1 active:scale-95"
                                    >
                                        Ver Todo <ArrowRight size={12} strokeWidth={3}/>
                                    </button>
                                </div>
                                <div className="flex gap-3 overflow-x-auto no-scrollbar ml-4 px-5 pb-5 snap-x snap-mandatory items-stretch">
                                    {featuredProducts.map((p, idx) => (
                                        <div key={`feat-${p.id}`} className="w-[45vw] shrink-0 snap-start flex">
                                            <FoodDishCard product={p} activeRate={activeRate} onOpenModal={handleOpenDishModal} index={idx} layoutVariant="grid" isFavorite={favoriteIds.has(String(p.id))} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                       {/* 1.7 PROMOCIONES GASTRONÓMICAS EN MÓVIL (CARRUSEL HORIZONTAL FLUIDO) */}
                        {promotions.filter(p => p.is_active).length > 0 && (
                            <div className="py-0">
                                {promotions.filter(p => p.is_active).length === 1 ? (
                                    // 🚀 CASO 1 PROMO: Ocupa el ancho completo con márgenes nativos
                                    <div className="px-5">
                                        {promotions.filter(p => p.is_active).map((promo: any) => {
                                            const textColor = promo.text_color || '#ffffff';
                                            const bgColor = promo.bg_color || 'var(--store-primary)';

                                            return (
                                                <div
                                                    key={promo.id}
                                                    style={{ backgroundColor: bgColor }}
                                                    className="w-full rounded-[var(--radius-card,24px)] p-5 shadow-[var(--shadow-ui)] border border-black/5 flex items-center justify-between gap-4 overflow-hidden relative"
                                                >
                                                    <div className="flex-1 min-w-0 z-10 space-y-1.5 text-left">
                                                        {promo.tagline && (
                                                            <span 
                                                                className="text-[9px] font-mono font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full inline-block"
                                                                style={{ 
                                                                    backgroundColor: 'rgba(255,255,255,0.25)', 
                                                                    color: textColor 
                                                                }}
                                                            >
                                                                {promo.tagline}
                                                            </span>
                                                        )}
                                                        <h3 
                                                            className="text-base sm:text-lg font-black leading-tight tracking-tight line-clamp-2"
                                                            style={{ color: textColor }}
                                                        >
                                                            {promo.title}
                                                        </h3>
                                                        {promo.discount_percentage > 0 && (
                                                            <p 
                                                                className="text-xs font-bold font-mono opacity-90"
                                                                style={{ color: textColor }}
                                                            >
                                                                {promo.discount_percentage}% de descuento aplicado
                                                            </p>
                                                        )}
                                                    </div>

                                                    {promo.image_url && (
                                                        <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 relative">
                                                            <Image
                                                                src={getOptimizedUrl(promo.image_url)}
                                                                alt={promo.title}
                                                                fill
                                                                sizes="96px"
                                                                className="object-contain drop-shadow-md"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    // 🚀 CASO MÚLTIPLES PROMOS: Carrusel Horizontal con Peek & Snap Magnético
                                    <div className="flex gap-3.5 overflow-x-auto no-scrollbar pl-5 pr-5 pb-3 pt-1 snap-x snap-mandatory scroll-pl-5 items-stretch">
                                        {promotions.filter(p => p.is_active).map((promo: any) => {
                                            const textColor = promo.text_color || '#ffffff';
                                            const bgColor = promo.bg_color || 'var(--store-primary)';

                                            return (
                                                <div
                                                    key={promo.id}
                                                    style={{ backgroundColor: bgColor }}
                                                    className="w-[84vw] max-w-[360px] shrink-0 snap-start rounded-[var(--radius-card,24px)] p-5 shadow-[var(--shadow-ui)] border border-black/5 flex items-center justify-between gap-4 overflow-hidden relative select-none active:scale-[0.99] transition-transform"
                                                >
                                                    <div className="flex-1 min-w-0 z-10 space-y-1.5 text-left">
                                                        {promo.tagline && (
                                                            <span 
                                                                className="text-[9px] font-mono font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full inline-block"
                                                                style={{ 
                                                                    backgroundColor: 'rgba(255,255,255,0.25)', 
                                                                    color: textColor 
                                                                }}
                                                            >
                                                                {promo.tagline}
                                                            </span>
                                                        )}
                                                        <h3 
                                                            className="text-base sm:text-lg font-black leading-tight tracking-tight line-clamp-2"
                                                            style={{ color: textColor }}
                                                        >
                                                            {promo.title}
                                                        </h3>
                                                        {promo.discount_percentage > 0 && (
                                                            <p 
                                                                className="text-xs font-bold font-mono opacity-90"
                                                                style={{ color: textColor }}
                                                            >
                                                                {promo.discount_percentage}% de descuento
                                                            </p>
                                                        )}
                                                    </div>

                                                    {promo.image_url && (
                                                        <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 relative">
                                                            <Image
                                                                src={getOptimizedUrl(promo.image_url)}
                                                                alt={promo.title}
                                                                fill
                                                                sizes="96px"
                                                                className="object-contain drop-shadow-md"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Menú por Categorías */}
                        <div className="px-5 space-y-9 pt-1">
                            {categories.map((catName) => {
                                const sectionId = `section-${catName.toLowerCase().replace(/\s+/g, '-')}`
                                const dishes = productsByCategory[catName] || []
                                if (dishes.length === 0) return null

                                return (
                                    <section key={catName} id={sectionId} data-category-name={catName} className="scroll-mt-44">
                                        <div className="mb-3 border-b border-[var(--store-border)]/40 pb-2">
                                            <h3 className="text-lg font-black text-[var(--store-text-main)] tracking-tight">{catName}</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                            {dishes.map((dish, idx) => (
                                                <FoodDishCard key={dish.id} product={dish} activeRate={activeRate} onOpenModal={handleOpenDishModal} index={idx} layoutVariant="grid" isFavorite={favoriteIds.has(String(dish.id))} />
                                            ))}
                                        </div>
                                    </section>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 5. APP BOTTOM NAVIGATION */}
                <nav 
                    aria-label="Navegación principal de la aplicación"
                    className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--store-surface)]/95 backdrop-blur-2xl border-t border-[var(--store-border)]/40 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 px-3 sm:px-5 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] transition-colors"
                >
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-1 sm:gap-2 max-w-lg mx-auto w-full">
                        <motion.button
                            whileTap={{ scale: 0.92 }}
                            type="button"
                            onClick={() => setBottomTab('home')}
                            className={`flex flex-col items-center justify-center py-1 transition-colors select-none w-full ${
                                bottomTab === 'home'
                                    ? 'text-[var(--store-text-main)] font-bold'
                                    : 'text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] font-medium'
                            }`}
                        >
                            <div 
                                className="px-3 py-1 rounded-full transition-colors flex items-center justify-center"
                                style={{
                                    backgroundColor: bottomTab === 'home' 
                                        ? 'color-mix(in srgb, var(--store-text-main) 8%, transparent)' 
                                        : 'transparent'
                                }}
                            >
                                <Home size={19} strokeWidth={bottomTab === 'home' ? 2.5 : 2} className="shrink-0" />
                            </div>
                            <span className="text-[10px] tracking-tight mt-0.5 leading-none">Inicio</span>
                        </motion.button>
                        
                       <motion.button
                            whileTap={{ scale: 0.92 }}
                            type="button"
                            onClick={handleProfileClick}
                            className="flex flex-col items-center justify-center py-1 text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] transition-colors select-none font-medium w-full"
                        >
                            <div className="px-3 py-1 rounded-full flex items-center justify-center">
                                <User size={19} strokeWidth={2} className="shrink-0" />
                            </div>
                            <span className="text-[10px] tracking-tight mt-0.5 leading-none">Perfil</span>
                        </motion.button>
                        
                        <motion.button
                            whileTap={{ scale: 0.92 }}
                            type="button"
                            onClick={() => setBottomTab('favorites')}
                            className={`flex flex-col items-center justify-center py-1 transition-colors select-none w-full ${
                                bottomTab === 'favorites'
                                    ? 'text-rose-500 font-bold'
                                    : 'text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] font-medium'
                            }`}
                        >
                            <div 
                                className="px-3 py-1 rounded-full transition-colors flex items-center justify-center"
                                style={{
                                    backgroundColor: bottomTab === 'favorites' 
                                        ? 'color-mix(in srgb, #f43f5e 10%, transparent)' 
                                        : 'transparent'
                                }}
                            >
                                <Heart size={19} strokeWidth={bottomTab === 'favorites' ? 2.5 : 2} className={bottomTab === 'favorites' ? 'fill-current shrink-0' : 'shrink-0'} />
                            </div>
                            <span className="text-[10px] tracking-tight mt-0.5 leading-none">Favoritos</span>
                        </motion.button>
                        
                       <motion.button
                            data-cart-target="true"
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => document.dispatchEvent(new CustomEvent('toggleCartDrawer'))}
                            className="w-auto shrink-0 h-11 px-3 sm:px-4 rounded-[var(--radius-btn,9999px)] bg-[var(--store-primary)] text-[var(--store-primary-text)] flex items-center justify-between gap-2.5 shadow-[0_8px_20px_-4px_rgba(0,0,0,0.25)] border border-white/10 select-none active:opacity-95 transition-all ml-1"
                        >
                            <div className="flex flex-col items-start leading-none text-left">
                                <span className="font-mono font-black text-xs sm:text-sm tracking-tight leading-none">
                                    ${cartTotalUSD.toFixed(2)}
                                </span>
                                <span className="font-mono text-[9px] font-medium opacity-75 tabular-nums mt-1 leading-none">
                                    Bs. {cartTotalBS.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                                </span>
                            </div>

                            <div className="w-[1px] h-4 bg-white/20 shrink-0" />

<motion.div 
                                animate={cartControls}
                                className="relative flex items-center justify-center shrink-0 origin-center"
                            >
                                <ShoppingBag size={18} strokeWidth={2.2} />
                                {totalItems > 0 && (
                                    <span 
                                        className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full font-mono text-[8px] font-black flex items-center justify-center border-2 shadow-xs"
                                        style={{
                                            backgroundColor: 'var(--store-primary-text)',
                                            color: 'var(--store-primary)',
                                            borderColor: 'var(--store-primary)'
                                        }}
                                    >
                                        {totalItems}
                                    </span>
                                )}
                            </motion.div>
                        </motion.button>
                    </div>
                </nav>
            </div>

         {/* ==================================================================================== */}
            {/* 💻 EXPERIENCIA DESKTOP AWWWARDS (Editorial Split-View) - Oculto en Móvil             */}
            {/* ==================================================================================== */}
            <div className="hidden md:flex flex-col min-h-screen bg-[var(--store-bg)]">
                
                {/* 1. THE QUIET HEADER (Cabecera Minimalista) */}
                <header className="sticky top-0 z-40 bg-[var(--store-bg)]/80 backdrop-blur-2xl border-b border-[var(--store-border)]/40 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
                    <div className="max-w-[1400px] mx-auto px-8 h-20 flex items-center justify-between gap-10">
                        
                        {/* Identidad Visual (Izquierda) */}
                        <div className="flex items-center gap-3.5 shrink-0 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            {store?.logo_url && (
                                activeTheme.layout?.logo_type === 'png_transparent' ? (
                                    <div className="h-10 w-auto max-w-[160px] relative flex items-center">
                                        <Image src={getOptimizedUrl(store.logo_url)} alt={store.name} width={160} height={40} className="object-contain max-h-10 w-auto" priority />
                                    </div>
                                ) : (
                                    <div className="w-11 h-11 rounded-full bg-[var(--store-surface)] border border-[var(--store-border)]/60 overflow-hidden shadow-sm flex items-center justify-center p-0.5">
                                        <Image src={getOptimizedUrl(store.logo_url)} alt={store.name} width={44} height={44} className="object-contain rounded-full" />
                                    </div>
                                )
                            )}
                            {activeTheme.layout?.logo_type !== 'png_transparent' && (
                                <span className="font-black text-xl text-[var(--store-text-main)] tracking-tight truncate max-w-[200px]">
                                    {store.name}
                                </span>
                            )}
                        </div>

                       {/* Buscador Central Expansivo + Filtros */}
                        <div className="flex-1 max-w-2xl mx-auto flex items-center justify-center gap-3">
                            <div 
                                className="relative w-full group transition-all duration-300 focus-within:max-w-[100%] bg-[var(--store-surface)] border-[length:var(--border-width-ui)] border-[var(--store-border)] shadow-[var(--shadow-ui)] focus-within:border-[var(--store-primary)] h-12"
                                style={{ borderRadius: 'var(--radius-search, 999px)' }}
                            >
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--store-surface-text)] group-focus-within:text-[var(--store-primary)] transition-colors" size={16} strokeWidth={2.5} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar plato, ingrediente o antojo..."
                                    className="w-full h-full bg-transparent pl-11 pr-11 text-sm font-semibold text-[var(--store-text-main)] placeholder:text-[var(--store-surface-text)]/70 outline-none transition-colors"
                                />
                                {searchQuery ? (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] transition-colors">
                                        <X size={15} strokeWidth={2.5} />
                                    </button>
                                ) : (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1 opacity-40 pointer-events-none">
                                        <span className="text-[10px] font-mono border border-[var(--store-border)] rounded px-1.5 py-0.5 font-bold">⌘</span>
                                        <span className="text-[10px] font-mono border border-[var(--store-border)] rounded px-1.5 py-0.5 font-bold">K</span>
                                    </div>
                                )}
                            </div>

                            {/* BOTÓN DE FILTROS DESKTOP */}
                            <button 
                                type="button"
                                onClick={() => {
                                    if (activeFiltersCount > 0) handleResetAllFilters()
                                    else setIsFilterModalOpen(true)
                                }}
                                className={`w-12 h-12 shrink-0 flex items-center justify-center transition-all border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] active:scale-95 ${
                                    activeFiltersCount > 0
                                        ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[var(--store-primary)]'
                                        : 'bg-[var(--store-surface)] text-[var(--store-text-main)] border-[var(--store-border)] hover:border-[var(--store-text-main)]/30'
                                }`}
                                style={{ borderRadius: 'var(--radius-btn, 12px)' }}
                                title={activeFiltersCount > 0 ? "Limpiar filtros" : "Filtrar menú"}
                            >
                                {activeFiltersCount > 0 ? (
                                    <RotateCcw size={16} strokeWidth={2.5} />
                                ) : (
                                    <SlidersHorizontal size={16} strokeWidth={2.2} />
                                )}
                            </button>
                        </div>

                        {/* Controles Derecha (Tasa, Perfil) */}
                        <div className="flex items-center gap-6 shrink-0">
                            <button onClick={() => setIsRateModalOpen(true)} className="flex flex-col items-end group outline-none">
                                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--store-surface-text)] group-hover:text-[var(--store-text-main)] transition-colors">
                                    Tasa {isEur ? 'EUR' : 'BCV'}
                                </span>
                                <span className="text-sm font-mono font-black text-[var(--store-text-main)] tabular-nums leading-none mt-0.5">
                                    Bs. {activeRate.toFixed(2)}
                                </span>
                            </button>

                            <div className="w-px h-8 bg-[var(--store-border)]/50" />

                            <button onClick={() => document.dispatchEvent(new CustomEvent('openAuthModal'))} className="flex items-center gap-2 text-[var(--store-text-main)] transition-opacity active:scale-95 group outline-none">
                                <div className="w-11 h-11 rounded-full bg-[var(--store-surface)] border-[length:var(--border-width-ui)] border-[var(--store-border)] shadow-[var(--shadow-ui)] flex items-center justify-center group-hover:border-[var(--store-primary)] transition-colors">
                                    <User size={18} strokeWidth={2.5} />
                                </div>
                            </button>
                        </div>
                    </div>
                </header>

                {/* 2. SPLIT-VIEW MASTER LAYOUT */}
                <div className="flex-1 w-full max-w-[1400px] mx-auto px-8 py-10 relative">
                    <div className="flex items-start gap-12 lg:gap-16">
                        
                        {/* 2.1 ÍNDICE MAGNÉTICO (Sticky Left Sidebar) */}
                        {!searchQuery && (
                            <aside className="hidden lg:block w-[240px] shrink-0 sticky top-28">
                                <div className="space-y-6">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--store-surface-text)] font-mono px-3">
                                        La Carta
                                    </h3>
                                    <nav className="space-y-1 border-l-2 border-[var(--store-border)]/30 ml-3 pl-3">
                                        {categories.map((cat) => {
                                            const isActive = activeCategory === cat
                                            const count = (productsByCategory[cat] || []).length

                                            return (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => handleScrollToSection(cat)}
                                                    className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl transition-all text-left outline-none group"
                                                    style={{
                                                        backgroundColor: isActive 
                                                            ? 'color-mix(in srgb, var(--store-primary) 8%, transparent)' 
                                                            : 'transparent'
                                                    }}
                                                >
                                                    <span 
                                                        className={`text-sm truncate pr-3 transition-colors ${
                                                            isActive 
                                                                ? 'font-black text-[var(--store-primary)]' 
                                                                : 'font-semibold text-[var(--store-surface-text)] group-hover:text-[var(--store-text-main)]'
                                                        }`}
                                                    >
                                                        {cat}
                                                    </span>
                                                    <span 
                                                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md transition-colors ${
                                                            isActive 
                                                                ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)] font-bold shadow-sm' 
                                                                : 'text-[var(--store-surface-text)] bg-[var(--store-surface)] border border-[var(--store-border)] group-hover:border-[var(--store-text-main)]/20'
                                                        }`}
                                                    >
                                                        {count}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </nav>
                                </div>
                            </aside>
                        )}

                        {/* 2.2 CONTENT FEED (Bento Grid + Crave-Grid) */}
                        <main className="flex-1 min-w-0 space-y-16 pb-32">
                        
                                {/* BENTO SHOWCASE EDITORIAL CON PROMOCIONES */}
                            {(resolvedDesktopHeroUrl || promotions.filter(p => p.is_active).length > 0) && !searchQuery && (
                                <section className="grid grid-cols-12 gap-5 items-stretch">
                                    
                                    {/* Bloque 1: Hero Principal (Ocupa 8 cols si hay promos, o 12 cols si no hay) */}
                                    {resolvedDesktopHeroUrl && (
                                        <div 
                                            className={`relative overflow-hidden bg-[var(--store-surface)] border-[length:var(--border-width-ui)] border-[var(--store-border)] shadow-[var(--shadow-ui)] group ${
                                                promotions.filter(p => p.is_active).length > 0 ? 'col-span-8' : 'col-span-12'
                                            }`}
                                            style={{ borderRadius: 'calc(var(--radius-card, 24px) + 4px)', minHeight: '320px' }}
                                        >
                                            <Image 
                                                src={getOptimizedUrl(resolvedDesktopHeroUrl)} 
                                                alt="Especialidad del Chef" 
                                                fill 
                                                priority 
                                                className="object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105" 
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />
                                            
                                            <div className="absolute inset-0 p-10 flex flex-col justify-center items-start text-left z-10 w-2/3">
                                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/10 text-white border border-white/20 font-mono mb-4 backdrop-blur-md">
                                                    Selección del Chef
                                                </span>
                                                <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.1] mb-4 drop-shadow-md">
                                                    {sloganText}
                                                </h2>
                                                <button 
                                                    onClick={() => categories[0] && handleScrollToSection(categories[0])} 
                                                    className="px-6 py-3 bg-[var(--store-primary)] text-[var(--store-primary-text)] rounded-[var(--radius-btn)] font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all"
                                                >
                                                    {heroBtnText} <ArrowRight size={14} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Bloque 2: Bento Promociones Laterales (Columna de 4 slots apilados) */}
                                    {promotions.filter(p => p.is_active).length > 0 && (
                                        <div className={`flex flex-col gap-4 ${resolvedDesktopHeroUrl ? 'col-span-4' : 'col-span-12 grid grid-cols-2'}`}>
                                            {promotions.filter(p => p.is_active).slice(0, 2).map((promo: any) => {
                                                const textColor = promo.text_color || '#ffffff';
                                                const bgColor = promo.bg_color || 'var(--store-primary)';

                                                return (
                                                    <div 
                                                        key={promo.id}
                                                        style={{ backgroundColor: bgColor }}
                                                        className="flex-1 rounded-3xl p-6 relative overflow-hidden flex items-center justify-between shadow-[var(--shadow-ui)] border border-black/10 group cursor-pointer"
                                                        onClick={() => categories[0] && handleScrollToSection(categories[0])}
                                                    >
                                                        <div className="flex-1 min-w-0 pr-3 z-10 text-left space-y-1">
                                                            {promo.tagline && (
                                                                <span 
                                                                    className="text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full inline-block mb-1"
                                                                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: textColor }}
                                                                >
                                                                    {promo.tagline}
                                                                </span>
                                                            )}
                                                            <h4 
                                                                className="text-lg font-black leading-tight tracking-tight line-clamp-2"
                                                                style={{ color: textColor }}
                                                            >
                                                                {promo.title}
                                                            </h4>
                                                            <span 
                                                                className="text-[11px] font-bold underline underline-offset-4 block pt-2 transition-transform group-hover:translate-x-1"
                                                                style={{ color: textColor }}
                                                            >
                                                                Aprovechar oferta &rarr;
                                                            </span>
                                                        </div>

                                                        {promo.image_url && (
                                                            <div className="w-24 h-24 shrink-0 relative">
                                                                <Image 
                                                                    src={getOptimizedUrl(promo.image_url)} 
                                                                    alt={promo.title} 
                                                                    fill 
                                                                    sizes="96px"
                                                                    className="object-contain group-hover:scale-105 transition-transform duration-300"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                </section>
                            )}
                           
                            {/* VISTA A: BÚSQUEDA ACTIVA (CORREGIDO CON filteredProductsList) */}
                            {searchQuery.trim() !== '' ? (
                                <section className="space-y-6 animate-in fade-in">
                                    <div className="flex items-end justify-between border-b border-[var(--store-border)]/40 pb-3">
                                        <div>
                                            <h2 className="text-2xl font-black tracking-tight text-[var(--store-text-main)]">
                                                Resultados para &quot;{searchQuery}&quot;
                                            </h2>
                                        </div>
                                        <span className="text-sm font-bold text-[var(--store-surface-text)] bg-[var(--store-surface)] px-3 py-1 rounded-lg border border-[var(--store-border)]">
                                            {filteredProductsList.length} platos
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                                        {filteredProductsList.map((dish: any, idx: number) => (
                                            <FoodDishCard key={dish.id} product={dish} activeRate={activeRate} onOpenModal={handleOpenDishModal} index={idx} layoutVariant="grid" isFavorite={favoriteIds.has(String(dish.id))} />
                                        ))}
                                    </div>
                                </section>
                            ) : (
                                /* VISTA B: EL MENÚ CONTINUO (CRAVE-GRID) */
                                <>
                                    {/* LO MÁS PEDIDO */}
                                    {featuredProducts.length > 0 && (
                                        <section className="space-y-6">
                                            <div className="border-b border-[var(--store-border)]/40 pb-3">
                                                <h2 className="text-2xl font-black tracking-tight text-[var(--store-text-main)]">
                                                    Popular Picks
                                                </h2>
                                                <p className="text-sm text-[var(--store-surface-text)] font-medium mt-1">
                                                    Los favoritos indiscutibles de nuestra comunidad
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                                                {featuredProducts.map((dish, idx) => (
                                                    <FoodDishCard key={`featured-${dish.id}`} product={dish} activeRate={activeRate} onOpenModal={handleOpenDishModal} index={idx} layoutVariant="grid" isFavorite={favoriteIds.has(String(dish.id))} />
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {/* SECCIONES DEL MENÚ */}
                                    {categories.map((catName) => {
                                        const sectionId = `section-${catName.toLowerCase().replace(/\s+/g, '-')}`
                                        const dishes = productsByCategory[catName] || []
                                        if (dishes.length === 0) return null

                                        return (
                                            <section key={catName} id={sectionId} data-category-name={catName} className="space-y-6 scroll-mt-32">
                                                <div className="border-b border-[var(--store-border)]/40 pb-3 flex items-end justify-between">
                                                    <h3 className="text-2xl font-black tracking-tight text-[var(--store-text-main)]">
                                                        {catName}
                                                    </h3>
                                                    <span className="text-xs font-bold text-[var(--store-surface-text)] font-mono">
                                                        {dishes.length} opciones
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                                                    {dishes.map((dish, idx) => (
                                                        <FoodDishCard key={dish.id} product={dish} activeRate={activeRate} onOpenModal={handleOpenDishModal} index={idx} layoutVariant="grid" isFavorite={favoriteIds.has(String(dish.id))} />
                                                    ))}
                                                </div>
                                            </section>
                                        )
                                    })}
                                </>
                            )}
                        </main>
                    </div>
                </div>
            </div>

            {/* MODALES GLOBALES */}
            <ProductFoodModal
                isOpen={isFoodModalOpen}
                onClose={() => setIsFoodModalOpen(false)}
                product={selectedProductForModal}
                activeRate={activeRate}
            />

            <FloatingCheckout
                rates={{ usd: Number(rates?.usd_rate || 0), eur: Number(rates?.eur_rate || 0) }}
                currency={isEur ? 'eur' : 'usd'}
                phone={store.phone || '584120000000'}
                storeName={store.name}
                storeId={store.id}
                storeConfig={{ ...store, theme_config: activeTheme }}
                products={products}
                promotions={promotions}
            />

            <RestaurantFilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                filters={filters}
                setFilters={setFilters}
                totalResults={filteredProductsList.length}
            />

            {isRateModalOpen && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
                    onClick={() => setIsRateModalOpen(false)}
                >
                    <div 
                        className="bg-white border border-neutral-200 rounded-3xl p-6 max-w-xs w-full text-center space-y-3 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-12 h-12 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center mx-auto">
                            <BCVLogo className="w-6 h-auto" />
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-wider text-neutral-900">
                            Tasa Oficial de Cambio
                        </h4>
                        <p className="text-xs text-neutral-500 leading-relaxed">
                            Los precios en Bolívares se calculan automáticamente con base en la tasa oficial {isEur ? 'EUR' : 'USD'} del Banco Central de Venezuela.
                        </p>
                        <div className="pt-2 border-t border-neutral-100">
                            <span className="text-2xl font-black font-mono text-neutral-900">
                                Bs. {activeRate.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            )}
            {/* MODAL GLOBAL DE REGISTRO Y LOGIN (PREZISO PASSPORT) */}
            <AnimatePresence>
                {isAuthModalOpen && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs"
                            onClick={() => setIsAuthModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="relative w-full max-w-md z-10"
                        >
                            <div className="absolute top-4 right-4 z-20">
                                <button
                                    type="button"
                                    onClick={() => setIsAuthModalOpen(false)}
                                    className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-500 transition-colors active:scale-95"
                                    aria-label="Cerrar modal de autenticación"
                                >
                                    <X size={16} strokeWidth={2.5} />
                                </button>
                            </div>
                            <CustomerAuth storeName={store.name} onSuccess={() => setIsAuthModalOpen(false)} />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}