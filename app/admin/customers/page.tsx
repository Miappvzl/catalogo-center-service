'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getSupabase } from '@/lib/supabase-client';
import { 
  ArrowLeft, Search, User, Wallet, Heart, ShoppingBag, 
  Loader2, Copy, Package, FileText, CheckCircle2, 
  Star, TrendingUp, History, XCircle, AlertCircle,
  Sparkles, X
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import { getOptimizedUrl } from '@/utils/cdn';

// ============================================================================
// ISOTIPO VECTORIAL DE WHATSAPP (OUTLINE FINO & TELÉFONO EN NEGRO PURO)
// ============================================================================
function WhatsAppOfficialGlyph({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} aria-hidden="true">
      {/* 1. Aro exterior del bocadillo en línea limpia */}
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M12.004 2c-5.523 0-10 4.477-10 10 0 1.767.459 3.484 1.332 5.002l-1.417 5.178 5.305-1.392c1.47.801 3.125 1.222 4.78 1.222 5.522 0 10-4.477 10-10s-4.478-10-10-10zm0 18.232c-1.503 0-2.973-.397-4.26-1.149l-.305-.177-3.16.829.843-3.082-.194-.309c-.832-1.326-1.272-2.868-1.272-4.444 0-4.544 3.696-8.24 8.24-8.24 4.545 0 8.24 3.696 8.24 8.24 0 4.544-3.695 8.24-8.24 8.24z" 
      />
      {/* 2. Auricular del teléfono en negro sólido, sin disco de fondo */}
      <path 
        d="M15.423 14.416c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.12-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" 
      />
    </svg>
  );
}

// ============================================================================
// CONTRATOS DE DATOS CRM
// ============================================================================
interface CrmCustomer {
  customer_key: string;
  full_name: string;
  phone: string | null;
  dni: string | null;
  ltv_usd: number;
  pipeline_usd: number;
  total_orders: number;
  pending_orders: number;
  paid_orders: number;
  cancelled_orders: number;
  total_quotes: number;
  pending_quotes: number;
  converted_quotes: number;
  credit_balance: number;
  origin_type: 'both' | 'web_only' | 'quotes_only' | 'passport_only';
  is_registered: boolean;
  registered_customer_id: string | null;
  last_activity: string;
}

interface OrderItemPreview {
  product_name: string;
  quantity: number;
  products?: {
    image_url: string | null;
  } | null;
}

interface OrderRecord {
  id: string;
  order_number: number;
  created_at: string;
  total_usd: number;
  status: string;
  is_quote: boolean;
  converted_at?: string | null;
  expires_at?: string | null;
  source?: string;
  order_items?: OrderItemPreview[];
}

interface LedgerEntry {
  id: string;
  amount_usd: number;
  description: string;
  created_at: string;
}

interface FavoriteProduct {
  id: string;
  products: {
    id: string;
    name: string;
    image_url: string | null;
    usd_cash_price: number;
  };
}

type FilterCategory = 'all' | 'both' | 'web' | 'quotes' | 'vips' | 'credit';

export default function CustomersPage() {
  const supabase = getSupabase();

  // Contexto de Tienda
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Estados del Directorio
  const [roster, setRoster] = useState<CrmCustomer[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Estados del Expediente Activo
  const [selectedCustomer, setSelectedCustomer] = useState<CrmCustomer | null>(null);
  const [activeTab, setActiveTab] = useState<'purchases' | 'quotes' | 'wallet' | 'favorites'>('purchases');
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Registros Históricos del Cliente
  const [customerPurchases, setCustomerPurchases] = useState<OrderRecord[]>([]);
  const [customerQuotes, setCustomerQuotes] = useState<OrderRecord[]>([]);
  const [customerLedger, setCustomerLedger] = useState<LedgerEntry[]>([]);
  const [customerFavorites, setCustomerFavorites] = useState<FavoriteProduct[]>([]);

  // 1. INICIALIZAR IDENTIDAD
  useEffect(() => {
    const initStore = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: store } = await supabase
        .from('stores')
        .select('id, name')
        .eq('user_id', user.id)
        .single();

      if (store) {
        setStoreId(store.id);
        setStoreName(store.name);
      }
    };
    initStore();
  }, [supabase]);

  // Atajo de teclado '/' para el buscador
  useEffect(() => {
    const handleSearchShortcut = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleSearchShortcut);
    return () => window.removeEventListener('keydown', handleSearchShortcut);
  }, []);

  // 2. MOTOR CLIENT-SIDE DE RESOLUCIÓN DE IDENTIDAD (CERO ERRORES 404)
  const fetchCrmData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);

    try {
      const [ordersRes, creditsRes, customersRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, customer_name, customer_phone, customer_dni, customer_id, total_usd, status, is_quote, converted_at, expires_at, created_at, source')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false }),
        supabase
          .from('store_credits')
          .select('id, customer_id, balance_usd, updated_at')
          .eq('store_id', storeId),
        supabase
          .from('customers')
          .select('id, full_name, phone, dni')
      ]);

      const rawOrders = ordersRes.data || [];
      const rawCredits = creditsRes.data || [];
      const rawCustomers = customersRes.data || [];

      const creditMap = new Map<string, number>();
      rawCredits.forEach((c: any) => {
        if (c.customer_id) creditMap.set(c.customer_id, Number(c.balance_usd || 0));
      });

      const customerProfileMap = new Map<string, any>();
      rawCustomers.forEach((c: any) => {
        customerProfileMap.set(c.id, c);
      });

      const customerMap = new Map<string, CrmCustomer>();

      rawOrders.forEach((o: any) => {
        const cleanPhone = o.customer_phone ? o.customer_phone.replace(/\D/g, '') : null;
        
        const key = cleanPhone && cleanPhone.length >= 7 
          ? `phone_${cleanPhone}` 
          : o.customer_id 
            ? `reg_${o.customer_id}` 
            : `name_${(o.customer_name || o.id).toLowerCase().trim()}`;

        let item = customerMap.get(key);

        if (!item) {
          const regProfile = o.customer_id ? customerProfileMap.get(o.customer_id) : null;
          const creditBal = o.customer_id ? (creditMap.get(o.customer_id) || 0) : 0;

          item = {
            customer_key: key,
            full_name: o.customer_name || regProfile?.full_name || 'Cliente sin nombre',
            phone: o.customer_phone || regProfile?.phone || null,
            dni: o.customer_dni || regProfile?.dni || null,
            ltv_usd: 0,
            pipeline_usd: 0,
            total_orders: 0,
            pending_orders: 0,
            paid_orders: 0,
            cancelled_orders: 0,
            total_quotes: 0,
            pending_quotes: 0,
            converted_quotes: 0,
            credit_balance: creditBal,
            origin_type: 'web_only',
            is_registered: !!o.customer_id,
            registered_customer_id: o.customer_id || null,
            last_activity: o.created_at
          };
          customerMap.set(key, item);
        }

        if (new Date(o.created_at) > new Date(item.last_activity)) {
          item.last_activity = o.created_at;
        }

        if (o.is_quote) {
          item.total_quotes++;
          const isExpired = o.expires_at ? new Date(o.expires_at) < new Date() : false;
          if (o.status === 'converted' || o.converted_at) {
            item.converted_quotes++;
          } else if (o.status === 'pending' && !isExpired) {
            item.pending_quotes++;
          }
        } else {
          item.total_orders++;
          if (o.status === 'pending') {
            item.pending_orders++;
            item.pipeline_usd += Number(o.total_usd || 0);
          } else if (o.status === 'paid' || o.status === 'completed') {
            item.paid_orders++;
            item.ltv_usd += Number(o.total_usd || 0);
          } else if (o.status === 'cancelled') {
            item.cancelled_orders++;
          } else {
            item.ltv_usd += Number(o.total_usd || 0);
          }
        }

        if (item.total_orders > 0 && item.total_quotes > 0) {
          item.origin_type = 'both';
        } else if (item.total_orders > 0) {
          item.origin_type = 'web_only';
        } else if (item.total_quotes > 0) {
          item.origin_type = 'quotes_only';
        }
      });

      rawCredits.forEach((cr: any) => {
        if (!cr.customer_id) return;
        const regProfile = customerProfileMap.get(cr.customer_id);
        const cleanPhone = regProfile?.phone ? regProfile.phone.replace(/\D/g, '') : null;
        const key = cleanPhone && cleanPhone.length >= 7 ? `phone_${cleanPhone}` : `reg_${cr.customer_id}`;

        if (!customerMap.has(key)) {
          customerMap.set(key, {
            customer_key: key,
            full_name: regProfile?.full_name || 'Cliente Passport',
            phone: regProfile?.phone || null,
            dni: regProfile?.dni || null,
            ltv_usd: 0,
            pipeline_usd: 0,
            total_orders: 0,
            pending_orders: 0,
            paid_orders: 0,
            cancelled_orders: 0,
            total_quotes: 0,
            pending_quotes: 0,
            converted_quotes: 0,
            credit_balance: Number(cr.balance_usd || 0),
            origin_type: 'passport_only',
            is_registered: true,
            registered_customer_id: cr.customer_id,
            last_activity: cr.updated_at || new Date().toISOString()
          });
        }
      });

      const list = Array.from(customerMap.values());
      setRoster(list);
      if (list.length > 0 && !selectedCustomer && window.innerWidth >= 1024) {
        setSelectedCustomer(list[0]);
      }
    } catch (err: any) {
      Swal.fire({ title: 'Error de Sincronización', text: err.message, icon: 'error', confirmButtonColor: '#171717' });
    } finally {
      setLoading(false);
    }
  }, [storeId, supabase, selectedCustomer]);

  useEffect(() => {
    if (storeId) fetchCrmData();
  }, [fetchCrmData, storeId]);

  // 3. CARGAR DETALLES CON MINIATURAS DE PRODUCTOS
  const loadDetailedProfile = useCallback(async (customer: CrmCustomer) => {
    if (!storeId) return;
    setLoadingDetail(true);

    try {
      const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, '') : null;
      const regId = customer.registered_customer_id;

      let ordersQuery = supabase
        .from('orders')
        .select(`
          id, order_number, created_at, total_usd, status, is_quote, converted_at, expires_at, source,
          order_items (
            product_name,
            quantity,
            products (
              image_url
            )
          )
        `)
        .eq('store_id', storeId);

      if (regId && cleanPhone) {
        ordersQuery = ordersQuery.or(`customer_id.eq.${regId},customer_phone.ilike.%${cleanPhone.slice(-8)}%`);
      } else if (regId) {
        ordersQuery = ordersQuery.eq('customer_id', regId);
      } else if (cleanPhone) {
        ordersQuery = ordersQuery.ilike('customer_phone', `%${cleanPhone.slice(-8)}%`);
      } else {
        ordersQuery = ordersQuery.eq('customer_name', customer.full_name);
      }

      const [ordersRes, favsRes, creditRes] = await Promise.all([
        ordersQuery.order('created_at', { ascending: false }),
        regId 
          ? supabase.from('favorites').select('id, products(id, name, image_url, usd_cash_price)').eq('store_id', storeId).eq('customer_id', regId)
          : Promise.resolve({ data: [] }),
        regId 
          ? supabase.from('store_credits').select('id').eq('store_id', storeId).eq('customer_id', regId).maybeSingle()
          : Promise.resolve({ data: null })
      ]);

      const allOrders = (ordersRes.data as OrderRecord[]) || [];
      setCustomerPurchases(allOrders.filter(o => !o.is_quote));
      setCustomerQuotes(allOrders.filter(o => o.is_quote));
      setCustomerFavorites((favsRes.data as any) || []);

      if (creditRes.data?.id) {
        const { data: ledgerData } = await supabase
          .from('store_credit_ledger')
          .select('id, amount_usd, description, created_at')
          .eq('store_credit_id', creditRes.data.id)
          .order('created_at', { ascending: false });
        setCustomerLedger(ledgerData || []);
      } else {
        setCustomerLedger([]);
      }
    } catch (err: any) {
      console.error('Error cargando detalles:', err.message);
    } finally {
      setLoadingDetail(false);
    }
  }, [supabase, storeId]);

  useEffect(() => {
    if (selectedCustomer) {
      loadDetailedProfile(selectedCustomer);
    }
  }, [selectedCustomer, loadDetailedProfile]);

  // 4. FILTRADO REACTIVO
  const filteredRoster = useMemo(() => {
    return roster.filter(c => {
      const q = search.toLowerCase();
      const matchesSearch = 
        (c.full_name?.toLowerCase() || '').includes(q) ||
        (c.phone || '').includes(q) ||
        (c.dni || '').includes(q);

      if (!matchesSearch) return false;

      switch (activeFilter) {
        case 'both': return c.origin_type === 'both';
        case 'web': return c.origin_type === 'web_only' || c.origin_type === 'both';
        case 'quotes': return c.origin_type === 'quotes_only' || c.origin_type === 'both';
        case 'vips': return c.ltv_usd >= 100 || c.pipeline_usd >= 100;
        case 'credit': return c.credit_balance > 0;
        default: return true;
      }
    }).sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());
  }, [roster, search, activeFilter]);

  // Navegación por teclado (↑ / ↓ o J / K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (filteredRoster.length === 0) return;

      const currentIndex = filteredRoster.findIndex(
        c => c.customer_key === selectedCustomer?.customer_key
      );

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const next = currentIndex < filteredRoster.length - 1 ? currentIndex + 1 : 0;
        setSelectedCustomer(filteredRoster[next]);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : filteredRoster.length - 1;
        setSelectedCustomer(filteredRoster[prev]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredRoster, selectedCustomer]);

  const counts = useMemo(() => ({
    all: roster.length,
    both: roster.filter(c => c.origin_type === 'both').length,
    web: roster.filter(c => c.origin_type === 'web_only' || c.origin_type === 'both').length,
    quotes: roster.filter(c => c.origin_type === 'quotes_only' || c.origin_type === 'both').length,
    vips: roster.filter(c => c.ltv_usd >= 100 || c.pipeline_usd >= 100).length,
    credit: roster.filter(c => c.credit_balance > 0).length,
  }), [roster]);

  // 5. ACCIÓN WHATSAPP CONTEXTUAL
  const handleContactCustomer = (customer: CrmCustomer) => {
    if (!customer.phone) return;
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const firstName = customer.full_name.split(' ')[0] || 'Cliente';
    
    let contextMessage = `Hola ${firstName}, te saludo de ${storeName || 'la tienda'}.`;
    if (customer.pending_quotes > 0) {
      contextMessage += ` Te contacto respecto a la cotización pendiente con nosotros. ¿Pudiste evaluarla?`;
    } else if (customer.pending_orders > 0) {
      contextMessage += ` Te escribo para coordinar los detalles de despacho de tu pedido pendiente.`;
    } else {
      contextMessage += ` ¿En qué podemos ayudarte el día de hoy?`;
    }

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(contextMessage)}`, '_blank');
  };

  const copyToClipboard = (text: string, label = 'Dato') => {
    navigator.clipboard.writeText(text);
    Swal.fire({
      toast: true, position: 'top-end', icon: 'success', title: `${label} copiado`,
      showConfirmButton: false, timer: 1500, 
      customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold border border-neutral-800' }
    });
  };

  const getMonogram = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'CL';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-[#FAFAFC] font-sans text-neutral-900 flex flex-col antialiased selection:bg-neutral-950 selection:text-white">
      
      {/* CABECERA PRINCIPAL FIJA */}
      <div className="bg-[#FAFAFC]/95 backdrop-blur-md shrink-0 z-30 px-4 md:px-8 py-3 flex justify-between items-center border-b border-neutral-200/50">
        <div className="flex items-center gap-3.5">
          <Link 
            href="/admin" 
            className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-neutral-200/60 hover:border-neutral-400 transition-all shrink-0 shadow-xs active:scale-[0.98]"
            title="Volver al Panel"
          >
            <ArrowLeft size={15} className="text-neutral-500 hover:text-neutral-900" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm md:text-base tracking-tight leading-none text-neutral-900">
                Directorio de Clientes
              </h1>
              <span className="bg-neutral-100 text-neutral-600 border border-neutral-200/60 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                {roster.length} Registros
              </span>
            </div>
            <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider mt-1 font-mono">
              CRM Omnicanal • Navegación por teclado [ ↑ / ↓ ] activa
            </p>
          </div>
        </div>
      </div>
     
      {/* CONTENEDOR PRINCIPAL: CADENA FLEXBOX CERRADA (100% INMUNE A DESBORDES) */}
      <div className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-3.5 sm:px-4 md:px-8 py-3 md:py-4 flex flex-col lg:flex-row gap-4 md:gap-6 min-w-0 overflow-hidden">
        
        {/* =================================================================== */}
        {/* COLUMNA IZQUIERDA: SMART ROSTER                                    */}
        {/* =================================================================== */}
        <div className={`w-full lg:w-[360px] xl:w-[390px] h-full flex flex-col gap-2.5 shrink-0 min-w-0 ${selectedCustomer ? 'hidden lg:flex' : 'flex'}`}>
          
          {/* THE COMMAND CAPSULE BUSCADOR */}
          <div className="relative group w-full h-11 flex items-center bg-white rounded-xl border border-neutral-200/80 focus-within:border-neutral-950 focus-within:ring-4 focus-within:ring-neutral-950/[0.04] transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] px-2.5 shrink-0">
            <div className="w-6.5 h-6.5 rounded-lg bg-neutral-50 group-focus-within:bg-neutral-950 border border-neutral-200/60 group-focus-within:border-neutral-950 flex items-center justify-center transition-all duration-200 shrink-0">
              <Search className="text-neutral-400 group-focus-within:text-white transition-colors" size={13} strokeWidth={2.2} />
            </div>

            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, teléfono o cédula..."
              className="w-full h-full bg-transparent pl-2.5 pr-8 text-xs font-semibold text-neutral-950 placeholder:text-neutral-400 placeholder:font-normal outline-none transition-all"
            />

            <div className="absolute right-2.5 flex items-center">
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="w-5 h-5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-950 flex items-center justify-center transition-colors active:scale-90"
                  title="Limpiar búsqueda"
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center text-[9px] font-mono font-bold text-neutral-400 bg-neutral-50 border border-neutral-200/80 px-1.5 py-0.5 rounded shadow-2xs group-focus-within:border-neutral-300 transition-colors">
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* CONTENEDOR UNIFICADO: PESTAÑAS PEGADAS A LA LISTA */}
          <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-neutral-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)] overflow-hidden">
            
            {/* 🚀 RIEL DE PESTAÑAS CON SCROLL HORIZONTAL TÁCTIL LIBRE */}
            <div className="w-full min-w-0 relative border-b border-neutral-200/60 flex items-center gap-4 overflow-x-auto no-scrollbar px-3.5 pt-2 shrink-0">
              {[
                { id: 'all', label: 'Todos', count: counts.all },
                { id: 'both', label: 'Híbridos', count: counts.both, icon: Sparkles },
                { id: 'web', label: 'Tienda Web', count: counts.web },
                { id: 'quotes', label: 'Cotizan', count: counts.quotes },
                { id: 'vips', label: 'VIPs', count: counts.vips, icon: Star },
                { id: 'credit', label: 'Con Saldo', count: counts.credit },
              ].map(f => {
                const isActive = activeFilter === f.id;

                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveFilter(f.id as FilterCategory)}
                    className={`relative pb-2.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
                      isActive ? 'text-neutral-950' : 'text-neutral-400 hover:text-neutral-700'
                    }`}
                  >
                    {f.icon && (
                      <f.icon 
                        size={10} 
                        className={
                          f.id === 'vips' 
                            ? 'fill-amber-400 text-amber-500' 
                            : f.id === 'both' 
                              ? 'text-zinc-400 fill-zinc-300/40' 
                              : ''
                        } 
                      />
                    )}
                    <span>{f.label}</span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-500'
                    }`}>
                      {f.count}
                    </span>

                    {/* LÍNEA INFERIOR CON POINTER-EVENTS-NONE (CERO BLOQUEO TÁCTIL) */}
                    {isActive && (
                      <motion.div
                        layoutId="crmFilterActiveUnderline"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-neutral-950 pointer-events-none"
                        transition={{ type: "spring", stiffness: 500, damping: 38 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* 🚀 LISTA CON SCROLL VERTICAL INERCIAL */}
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 gap-2.5">
                <Loader2 className="animate-spin text-neutral-300" size={20} />
                <p className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-wider">
                  Sincronizando directorio...
                </p>
              </div>
            ) : filteredRoster.length === 0 ? (
              <div className="flex-1 text-center py-16 p-6 flex flex-col items-center justify-center gap-2">
                <User size={24} className="text-neutral-300" />
                <p className="text-xs font-semibold text-neutral-500">Ningún cliente coincide con los filtros.</p>
                <button onClick={() => { setSearch(''); setActiveFilter('all'); }} className="text-[11px] font-bold text-neutral-900 underline mt-0.5">
                  Restablecer vista
                </button>
              </div>
            ) : (
              <div className="flex-1 min-h-0 w-full overflow-y-auto no-scrollbar divide-y divide-neutral-100/80 pb-6">
                {filteredRoster.map((customer) => {
                  const isSelected = selectedCustomer?.customer_key === customer.customer_key;
                  
                  return (
                    <div
                      key={customer.customer_key}
                      onClick={() => { setSelectedCustomer(customer); setActiveTab('purchases'); }}
                      className={`px-3.5 py-3 transition-all duration-150 cursor-pointer flex flex-col gap-2 relative group ${
                        isSelected 
                          ? 'bg-neutral-100/80 text-neutral-950' 
                          : 'bg-white hover:bg-neutral-50/60 text-neutral-800'
                      }`}
                    >
                      {/* MICRO-INDICADOR FLOTANTE DE SELECCIÓN */}
                      {isSelected && (
                        <div className="absolute left-0 top-3 bottom-3 w-[2.5px] bg-neutral-950 rounded-r-full pointer-events-none" />
                      )}

                      <div className="flex justify-between items-start gap-2.5 min-w-0">
                        {/* Monograma de Avatar Compacto */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[10px] shrink-0 font-mono transition-transform duration-200 group-hover:scale-105 ${
                          isSelected 
                            ? 'bg-neutral-950 text-white shadow-xs' 
                            : 'bg-neutral-100 text-neutral-700 border border-neutral-200/60'
                        }`}>
                          {getMonogram(customer.full_name)}
                        </div>

                        {/* Datos del Cliente */}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="font-bold text-xs text-neutral-950 truncate leading-snug">
                              {customer.full_name}
                            </p>
                            {customer.is_registered && (
                              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-white" title="Passport Verificado" />
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-neutral-400 font-medium truncate">
                            {customer.phone || 'Sin WhatsApp'} {customer.dni ? `• ${customer.dni}` : ''}
                          </p>
                        </div>

                        {/* Métrica Dual en Tarjeta */}
                        <div className="flex flex-col items-end shrink-0 pl-2 text-right">
                          <span className="text-[8px] font-mono font-semibold uppercase tracking-wider text-neutral-400 leading-none mb-1">
                            LTV
                          </span>
                          <span className="text-xs font-black font-mono tracking-tight text-neutral-950 tabular-nums leading-none">
                            ${customer.ltv_usd.toFixed(2)}
                          </span>
                          {customer.pipeline_usd > 0 && (
                            <span className="text-[9px] font-mono font-bold text-amber-700 mt-1 flex items-center gap-1 tabular-nums leading-none">
                              <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                              +${customer.pipeline_usd.toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* BADGES SEMÁNTICOS CON CHISPA TITANIUM */}
                      <div className="flex flex-wrap items-center gap-1.5 pl-10.5">
                        {customer.origin_type === 'both' && (
                          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border flex items-center gap-1 bg-neutral-950 text-white border-neutral-800 shadow-2xs">
                            <Sparkles size={8} className="text-zinc-300 fill-zinc-200/50" /> Híbrido
                          </span>
                        )}

                        {customer.origin_type === 'web_only' && (
                          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border bg-neutral-100 text-neutral-600 border-neutral-200/50">
                            Tienda Web
                          </span>
                        )}

                        {customer.origin_type === 'quotes_only' && (
                          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border bg-purple-50 text-purple-700 border-purple-200/60">
                            Cotización
                          </span>
                        )}

                        {(customer.ltv_usd >= 100 || customer.pipeline_usd >= 100) && (
                          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border flex items-center gap-0.5 bg-amber-50 text-amber-800 border-amber-200/60 font-mono">
                            <Star size={8} className="fill-amber-400 text-amber-500" /> VIP
                          </span>
                        )}

                        {customer.pending_orders > 0 && (
                          <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded-md border bg-amber-50/90 text-amber-800 border-amber-200/70 tabular-nums">
                            {customer.pending_orders} por despachar
                          </span>
                        )}
                        
                        {customer.pending_quotes > 0 && (
                          <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded-md border bg-purple-50 text-purple-700 border-purple-200/60 tabular-nums">
                            {customer.pending_quotes} cotiz. activa
                          </span>
                        )}
                        
                        {customer.credit_balance > 0 && (
                          <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200/60 tabular-nums">
                            saldo +${customer.credit_balance.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* COLUMNA DERECHA: CUSTOMER 360 (EXPEDIENTE)                         */}
        {/* =================================================================== */}
        <div className={`w-full lg:flex-1 h-full min-w-0 ${!selectedCustomer ? 'hidden lg:block' : 'block'}`}>
          <AnimatePresence mode="wait">
            {!selectedCustomer ? (
              <motion.div 
                key="empty" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="h-full bg-white rounded-2xl border border-neutral-200/60 shadow-xs p-8 md:p-12 flex flex-col items-center justify-center text-center gap-3.5 min-h-[480px]"
              >
                <div className="w-14 h-14 bg-neutral-50 border border-neutral-200/60 rounded-2xl flex items-center justify-center shadow-xs">
                  <TrendingUp size={24} className="text-neutral-400" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-sm font-bold text-neutral-900 tracking-tight">
                    Expediente Omnicanal 360º
                  </h3>
                  <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                    Selecciona un cliente del directorio o navega con las teclas <kbd className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-[10px] text-neutral-700 font-bold border border-neutral-200">↑</kbd> <kbd className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-[10px] text-neutral-700 font-bold border border-neutral-200">↓</kbd> para auditar compras, cotizaciones y billetera.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key={selectedCustomer.customer_key} 
                initial={{ opacity: 0, y: 8 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -8 }} 
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }} 
                className="bg-white rounded-2xl border border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.01)] p-4 sm:p-5 md:p-6 flex flex-col h-full max-h-full min-h-0 overflow-hidden"
              >
                {/* BOTÓN VOLVER EN MÓVIL */}
                <button 
                  onClick={() => setSelectedCustomer(null)}
                  className="lg:hidden flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 bg-neutral-50 hover:bg-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200/50 transition-colors w-max active:scale-95 shrink-0"
                >
                  <ArrowLeft size={13} /> Volver al Directorio
                </button>

                {/* 1. CABECERA: IDENTIDAD & WHATSAPP */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-neutral-100 min-w-0 shrink-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {getMonogram(selectedCustomer.full_name)}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base md:text-lg font-bold text-neutral-950 tracking-tight leading-none truncate">
                          {selectedCustomer.full_name}
                        </h2>
                        {selectedCustomer.is_registered ? (
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-blue-50/80 text-blue-600 border border-blue-200/60 px-2 py-0.5 rounded-full shrink-0">
                            Passport
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-neutral-100 text-neutral-500 border border-neutral-200/50 px-2 py-0.5 rounded-full shrink-0">
                            Invitado
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-mono text-neutral-400 pt-0.5">
                        <span className="flex items-center gap-1.5 text-neutral-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          Activo {new Date(selectedCustomer.last_activity).toLocaleDateString('es-VE')}
                        </span>
                        {selectedCustomer.phone && (
                          <>
                            <span className="text-neutral-200">•</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(selectedCustomer.phone!, 'Teléfono')}
                              className="text-neutral-500 hover:text-neutral-950 transition-colors flex items-center gap-1"
                              title="Copiar teléfono"
                            >
                              <span>TLF: {selectedCustomer.phone}</span>
                              <Copy size={10} className="text-neutral-300" />
                            </button>
                          </>
                        )}
                        {selectedCustomer.dni && (
                          <>
                            <span className="text-neutral-200">•</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(selectedCustomer.dni!, 'DNI')}
                              className="text-neutral-500 hover:text-neutral-950 transition-colors flex items-center gap-1"
                              title="Copiar DNI"
                            >
                              <span>DNI: {selectedCustomer.dni}</span>
                              <Copy size={10} className="text-neutral-300" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => handleContactCustomer(selectedCustomer)}
                    disabled={!selectedCustomer.phone}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-neutral-950 bg-white text-neutral-950 hover:bg-neutral-50 font-black text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs shrink-0 active:scale-95"
                  >
                    <span>Contactar WhatsApp</span>
                    <WhatsAppOfficialGlyph className="w-4 h-4 fill-neutral-950" />
                  </button>
                </div>

                {/* 2. TELEMETRÍA DESCOMPRIMIDA */}
                <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 border-b border-neutral-100 shrink-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[9px] font-mono font-semibold uppercase tracking-widest text-neutral-400">
                      LTV Cobrado:
                    </span>
                    <span className="font-mono font-black text-sm text-neutral-950 tabular-nums">
                      ${selectedCustomer.ltv_usd.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-[9px] font-mono font-semibold uppercase tracking-widest text-neutral-400">
                      En Tránsito:
                    </span>
                    {selectedCustomer.pipeline_usd > 0 ? (
                      <span className="font-mono font-bold text-xs text-amber-700 bg-amber-50/80 border border-amber-200/60 px-2 py-0.5 rounded-md flex items-center gap-1.5 tabular-nums">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        +${selectedCustomer.pipeline_usd.toFixed(2)}
                        <span className="text-[9px] font-normal text-amber-600 font-sans">
                          ({selectedCustomer.pending_orders} por despachar)
                        </span>
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-neutral-400 font-medium">
                        $0.00
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-[9px] font-mono font-semibold uppercase tracking-widest text-neutral-400">
                      Saldo Billetera:
                    </span>
                    <span className={`font-mono font-black text-sm tabular-nums ${
                      selectedCustomer.credit_balance > 0 ? 'text-emerald-700' : 'text-neutral-950'
                    }`}>
                      ${selectedCustomer.credit_balance.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* 3. 🚀 RIEL DE PESTAÑAS CON SCROLL HORIZONTAL TÁCTIL LIBRE */}
                <div className="w-full min-w-0 relative border-b border-neutral-200/60 flex items-center gap-6 md:gap-8 overflow-x-auto no-scrollbar pt-1 shrink-0">
                  {[
                    { id: 'purchases', label: 'Compras Reales', count: selectedCustomer.total_orders },
                    { id: 'quotes', label: 'Cotizaciones', count: selectedCustomer.total_quotes },
                    { id: 'wallet', label: 'Billetera', count: customerLedger.length },
                    { id: 'favorites', label: 'Wishlist', count: customerFavorites.length }
                  ].map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`relative pb-3 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
                          isActive ? 'text-neutral-950' : 'text-neutral-400 hover:text-neutral-600'
                        }`}
                      >
                        <span>{tab.label}</span>
                        {tab.count > 0 && (
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                            isActive ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-500'
                          }`}>
                            {tab.count}
                          </span>
                        )}
                        {/* LÍNEA INFERIOR CON POINTER-EVENTS-NONE */}
                        {isActive && (
                          <motion.div
                            layoutId="activeCrmTabIndicator"
                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-neutral-950 pointer-events-none"
                            transition={{ type: "spring", stiffness: 500, damping: 38 }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 4. 🚀 CONTENIDO AISLADO CON SCROLL VERTICAL SUAVE */}
                <div className="flex-1 relative min-h-0 w-full overflow-y-auto no-scrollbar pr-1 pt-1">
                  {loadingDetail ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="animate-spin text-neutral-300" size={20} />
                    </div>
                  ) : (
                    <div className="animate-in fade-in duration-150 h-full">
                      
                      {/* PESTAÑA: COMPRAS REALES CON MINIATURAS */}
                      {activeTab === 'purchases' && (
                        <div className="space-y-2">
                          {customerPurchases.length === 0 ? (
                            <div className="text-center py-12 bg-neutral-50/50 rounded-xl border border-dashed border-neutral-200/60 p-6">
                              <ShoppingBag size={22} className="text-neutral-300 mx-auto mb-2" />
                              <p className="text-xs text-neutral-500 font-medium">
                                Este cliente aún no registra compras consolidadas.
                              </p>
                            </div>
                          ) : (
                            <div className="divide-y divide-neutral-100/80">
                              {customerPurchases.map((order) => {
                                const isPending = order.status === 'pending';
                                const isPaid = order.status === 'paid' || order.status === 'completed';
                                const isCancelled = order.status === 'cancelled';
                                const items = order.order_items || [];

                                return (
                                  <div key={order.id} className="py-3 flex justify-between items-center group hover:bg-neutral-50/50 px-2 rounded-lg transition-colors min-w-0">
                                    <div className="min-w-0 pr-4 space-y-1 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-mono font-bold text-xs text-neutral-900">
                                          Pedido #{order.order_number}
                                        </p>
                                        
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-semibold uppercase tracking-wider border ${
                                          isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                                          isPending ? 'bg-amber-50 text-amber-700 border-amber-200/60' :
                                          isCancelled ? 'bg-rose-50 text-rose-700 border-rose-200/60' :
                                          'bg-neutral-100 text-neutral-600 border-neutral-200/40'
                                        }`}>
                                          {isPending ? 'por despachar' : isPaid ? 'pagado' : isCancelled ? 'cancelado' : order.status}
                                        </span>
                                        
                                        {order.source && (
                                          <span className="text-[8px] font-mono font-semibold uppercase text-neutral-400 bg-neutral-100 px-1 rounded">
                                            {order.source}
                                          </span>
                                        )}

                                        {/* Miniaturas de Ítems */}
                                        {items.length > 0 && (
                                          <div className="flex items-center -space-x-1.5 overflow-hidden pl-1">
                                            {items.slice(0, 3).map((it, idx) => (
                                              <div 
                                                key={idx} 
                                                className="w-5 h-5 rounded-full border border-white bg-neutral-100 overflow-hidden relative shadow-2xs shrink-0" 
                                                title={`${it.quantity}x ${it.product_name}`}
                                              >
                                                {it.products?.image_url ? (
                                                  <img 
                                                    src={getOptimizedUrl(it.products.image_url)} 
                                                    alt="" 
                                                    className="w-full h-full object-cover" 
                                                  />
                                                ) : (
                                                  <div className="w-full h-full flex items-center justify-center text-[7px] font-mono text-neutral-400 font-bold">
                                                    P
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                            {items.length > 3 && (
                                              <span className="text-[8px] font-mono font-bold text-neutral-400 pl-1.5">
                                                +{items.length - 3}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
                                        <span>{new Date(order.created_at).toLocaleDateString('es-VE')}</span>
                                        <span>•</span>
                                        <span>{new Date(order.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</span>
                                        {items[0] && (
                                          <>
                                            <span>•</span>
                                            <span className="truncate max-w-[180px] text-neutral-600 font-sans">
                                              {items[0].product_name}
                                              {items.length > 1 ? ` (+${items.length - 1})` : ''}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <span className="font-mono font-bold text-xs text-neutral-900 tabular-nums">
                                        ${order.total_usd.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* PESTAÑA: COTIZACIONES */}
                      {activeTab === 'quotes' && (
                        <div className="space-y-2">
                          {customerQuotes.length === 0 ? (
                            <div className="text-center py-12 bg-neutral-50/50 rounded-xl border border-dashed border-neutral-200/60 p-6">
                              <FileText size={22} className="text-neutral-300 mx-auto mb-2" />
                              <p className="text-xs text-neutral-500 font-medium">
                                No se registran cotizaciones emitidas para este cliente.
                              </p>
                            </div>
                          ) : (
                            <div className="divide-y divide-neutral-100/80">
                              {customerQuotes.map((quote) => {
                                const isConverted = quote.status === 'converted' || !!quote.converted_at;
                                const isExpired = quote.expires_at ? new Date(quote.expires_at) < new Date() : false;

                                return (
                                  <div key={quote.id} className="py-2.5 flex justify-between items-center group hover:bg-neutral-50/50 px-2 rounded-lg transition-colors min-w-0">
                                    <div className="min-w-0 pr-4 space-y-0.5 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-mono font-bold text-xs text-neutral-900">
                                          Cotización #{quote.order_number}
                                        </p>
                                        {isConverted ? (
                                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-1.5 py-0.5 rounded text-[8px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1">
                                            <CheckCircle2 size={9} /> Concretada (Venta)
                                          </span>
                                        ) : isExpired ? (
                                          <span className="bg-neutral-100 text-neutral-500 border border-neutral-200/60 px-1.5 py-0.5 rounded text-[8px] font-mono font-semibold uppercase tracking-wider">
                                            Vencida
                                          </span>
                                        ) : (
                                          <span className="bg-purple-50 text-purple-700 border border-purple-200/60 px-1.5 py-0.5 rounded text-[8px] font-mono font-semibold uppercase tracking-wider">
                                            Vigente / Pendiente
                                          </span>
                                        )}
                                      </div>

                                      <p className="text-[10px] text-neutral-400 font-mono">
                                        Emitida: {new Date(quote.created_at).toLocaleDateString('es-VE')}
                                      </p>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <span className="font-mono font-bold text-xs text-neutral-900 tabular-nums">
                                        ${quote.total_usd.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* PESTAÑA: BILLETERA TIENDA */}
                      {activeTab === 'wallet' && (
                        <div className="space-y-4">
                          <div className="bg-neutral-950 text-white rounded-xl p-5 flex justify-between items-center shadow-xs border border-neutral-800">
                            <div>
                              <p className="text-[9px] font-mono font-semibold uppercase tracking-widest text-neutral-400 mb-1">
                                Saldo Disponible en Tienda
                              </p>
                              <p className="text-2xl md:text-3xl font-bold font-mono tracking-tight text-white tabular-nums">
                                ${selectedCustomer.credit_balance.toFixed(2)}
                              </p>
                            </div>
                            <Wallet size={24} className="text-neutral-500" strokeWidth={1.5} />
                          </div>

                          {customerLedger.length === 0 ? (
                            <div className="text-center py-8 text-neutral-400 text-xs font-medium border border-dashed border-neutral-200/60 rounded-xl">
                              Sin movimientos registrados en el libro contable de saldo.
                            </div>
                          ) : (
                            <div className="divide-y divide-neutral-100/80">
                              {customerLedger.map((entry) => {
                                const isCredit = entry.amount_usd >= 0;
                                return (
                                  <div key={entry.id} className="py-2.5 flex justify-between items-center text-xs min-w-0">
                                    <div className="min-w-0 pr-4 space-y-0.5 flex-1">
                                      <p className="font-semibold text-neutral-800 truncate text-[11px]">
                                        {entry.description}
                                      </p>
                                      <p className="text-[10px] text-neutral-400 font-mono">
                                        {new Date(entry.created_at).toLocaleDateString('es-VE')}
                                      </p>
                                    </div>
                                    <span className={`font-mono font-bold text-xs shrink-0 ${isCredit ? 'text-emerald-700' : 'text-neutral-900'}`}>
                                      {isCredit ? '+' : ''}${entry.amount_usd.toFixed(2)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* PESTAÑA: WISHLIST */}
                      {activeTab === 'favorites' && (
                        <div className="space-y-3">
                          {customerFavorites.length === 0 ? (
                            <div className="text-center py-12 bg-neutral-50/50 rounded-xl border border-dashed border-neutral-200/60 p-6">
                              <Heart size={22} className="text-neutral-300 mx-auto mb-2" />
                              <p className="text-xs text-neutral-500 font-medium">
                                El cliente no tiene artículos añadidos a su lista de deseos.
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {customerFavorites.map((fav) => (
                                <div key={fav.id} className="bg-white p-2.5 rounded-xl border border-neutral-200/50 shadow-xs flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 bg-neutral-50 rounded-lg overflow-hidden shrink-0 relative border border-neutral-100">
                                    {fav.products?.image_url ? (
                                      <img 
                                        src={getOptimizedUrl(fav.products.image_url)} 
                                        alt={fav.products.name}
                                        className="w-full h-full object-cover" 
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-neutral-300">
                                        <Package size={14} />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-semibold text-xs text-neutral-900 truncate">
                                      {fav.products?.name}
                                    </h4>
                                    <span className="text-[11px] font-mono font-bold text-neutral-600 mt-0.5 block tabular-nums">
                                      ${fav.products?.usd_cash_price?.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  )}
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}