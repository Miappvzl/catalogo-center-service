'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase-client';
import { 
  ArrowLeft, Search, User, Wallet, Heart, ShoppingBag, 
  Clock, MapPin, Loader2, Gift, Check, Copy, AlertCircle, X, Package 
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import { getOptimizedUrl } from '@/utils/cdn';

// --- TIPOS ESTRICTOS ---
interface CustomerProfile {
  id: string;
  full_name: string;
  phone: string | null;
  dni: string | null;
  shipping_details: any;
}

interface StoreCredit {
  id: string;
  balance_usd: number;
  updated_at: string;
  customer: CustomerProfile | null; // Permitimos nulo para tipado defensivo
}

interface LedgerEntry {
  id: string;
  amount_usd: number;
  description: string;
  created_at: string;
  order_id?: string | null;
}

interface OrderHistoryEntry {
  id: string;
  order_number: number;
  created_at: string;
  total_usd: number;
  status: string;
  vuelto_processed: boolean;
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

export default function CustomersPage() {
  const supabase = getSupabase();

  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<StoreCredit[]>([]);
  const [search, setSearch] = useState('');
  
  // Selección y Detalles
  const [selectedCredit, setSelectedCredit] = useState<StoreCredit | null>(null);
  const [activeTab, setActiveTab] = useState<'credit' | 'orders' | 'favorites'>('credit');
  
  // Estados de datos asíncronos del cliente seleccionado
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [orders, setOrders] = useState<OrderHistoryEntry[]>([]);
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 1. OBTENER IDENTIDAD DE TIENDA
  useEffect(() => {
    const initStore = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: store } = await supabase
          .from('stores')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (store) {
          setStoreId(store.id);
        }
      }
    };
    initStore();
  }, [supabase]);

  // 2. OBTENER DIRECTORIO DE CLIENTES (Aislamiento de Inquilinos)
  const fetchCustomers = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      // Cruzamos store_credits con customers para obtener solo la base de datos de esta tienda
      const { data, error } = await supabase
        .from('store_credits')
        .select(`
          id,
          balance_usd,
          updated_at,
          customer:customers (
            id,
            full_name,
            phone,
            dni,
            shipping_details
          )
        `)
        .eq('store_id', storeId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // 🚀 FILTRADO DEFENSIVO: Excluimos registros de saldo huérfanos o bloqueados por RLS
      const rawData = (data as any) || [];
      const validCredits = rawData.filter((item: any) => item.customer !== null);

      setCustomers(validCredits);
    } catch (err: any) {
      console.error('Error al obtener directorio:', err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, storeId]);

  useEffect(() => {
    if (storeId) fetchCustomers();
  }, [fetchCustomers, storeId]);

  // 3. CARGAR DETALLES DEL CLIENTE SELECCIONADO (Ledger, Compras, Favoritos)
  const loadCustomerDetails = useCallback(async (credit: StoreCredit) => {
    if (!storeId || !credit.customer) return;
    setLoadingDetail(true);
    try {
      const customerId = credit.customer.id;

      // Consultas en paralelo para mitigar latencia
      const [ledgerRes, ordersRes, favoritesRes] = await Promise.all([
        supabase.from('store_credit_ledger').select('*').eq('store_credit_id', credit.id).order('created_at', { ascending: false }),
        supabase.from('orders').select('id, order_number, created_at, total_usd, status, vuelto_processed').eq('store_id', storeId).eq('customer_id', customerId).order('created_at', { ascending: false }),
        supabase.from('favorites').select('id, products(id, name, image_url, usd_cash_price)').eq('store_id', storeId).eq('customer_id', customerId)
      ]);

      setLedger(ledgerRes.data || []);
      setOrders((ordersRes.data as any) || []);
      setFavorites((favoritesRes.data as any) || []);
    } catch (err: any) {
      console.error('Error al cargar historial detallado:', err.message);
    } finally {
      setLoadingDetail(false);
    }
  }, [supabase, storeId]);

  useEffect(() => {
    if (selectedCredit) {
      loadCustomerDetails(selectedCredit);
    }
  }, [selectedCredit, loadCustomerDetails]);

  // 4. FILTRADO REACTIVO (Manejo Seguro de Nulos)
  const filteredCustomers = useMemo(() => {
    return customers.filter(item => {
      const name = item.customer?.full_name?.toLowerCase() || '';
      const phone = item.customer?.phone || '';
      const dni = item.customer?.dni || '';
      const query = search.toLowerCase();
      return name.includes(query) || phone.includes(query) || dni.includes(query);
    });
  }, [customers, search]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    Swal.fire({
      toast: true, position: 'top-end', icon: 'success', title: 'Copiado al portapapeles',
      showConfirmButton: false, timer: 1500, customClass: { popup: 'rounded-xl bg-black text-white text-xs font-bold' }
    });
  };

  return (
    <div className="min-h-screen bg-[#F6F6F6] pb-20 font-sans text-gray-900 flex flex-col">
    {/* HEADER PRINCIPAL */}
      <div className="bg-[#FAFAFC]/95 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 py-4 flex justify-between items-center border-b border-neutral-200/50">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-neutral-200/50 hover:border-neutral-300 transition-colors shrink-0 shadow-xs">
            <ArrowLeft size={16} className="text-neutral-500 hover:text-neutral-900" />
          </Link>
          <div>
            <h1 className="font-bold text-base tracking-tight leading-none text-neutral-900">Directorio de Clientes</h1>
            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mt-1 font-mono">Gestión Contable y Passport</p>
          </div>
        </div>
      </div>
     
        <div className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 py-6 md:py-8 flex flex-col lg:flex-row gap-6 md:gap-8">
        
        {/* COLUMNA IZQUIERDA: DIRECTORIO DE CLIENTES (Oculta en móvil si hay cliente seleccionado) */}
        <div className={`w-full lg:w-1/3 flex-col gap-5 ${selectedCredit ? 'hidden lg:flex' : 'flex'}`}>
          
          <div className="relative group w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, teléfono o cédula..."
              className="w-full bg-white border border-neutral-200/50 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.01)]"
            />
          </div>

          {loading ? (
            <div className="text-center py-20"><Loader2 className="animate-spin text-neutral-300 mx-auto" size={24} /></div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-neutral-200/50 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
              <User size={24} className="text-neutral-300 mx-auto mb-3" />
              <p className="text-xs font-semibold text-neutral-400">No se encontraron clientes registrados.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[75vh] overflow-y-auto no-scrollbar pb-10">
              {filteredCustomers.map((item) => {
                const isSelected = selectedCredit?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => { setSelectedCredit(item); setActiveTab('credit'); }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                      isSelected 
                        ? 'bg-neutral-50 border-neutral-300 shadow-xs' 
                        : 'bg-white border-neutral-200/50 hover:bg-neutral-50 hover:border-neutral-300 shadow-[0_1px_3px_rgba(0,0,0,0.01)]'
                    }`}
                  >
                    <div className="min-w-0 pr-3 space-y-0.5">
                      <p className="font-bold text-xs text-neutral-900 truncate">{item.customer?.full_name}</p>
                      <p className={`text-[10px] font-mono font-medium ${isSelected ? 'text-neutral-500' : 'text-neutral-400'}`}>
                        {item.customer?.dni || 'Sin Cédula'} • {item.customer?.phone || 'Sin Tlf'}
                      </p>
                    </div>
                    <span className={`text-sm font-bold font-mono shrink-0 ${isSelected ? 'text-neutral-900' : 'text-emerald-600'}`}>
                      ${item.balance_usd.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      {/* COLUMNA DERECHA: PERFIL DETALLADO (PASSPORT) */}
        <div className={`w-full lg:w-2/3 ${!selectedCredit ? 'hidden lg:block' : 'block'}`}>
          <AnimatePresence mode="wait">
            {!selectedCredit ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full bg-white rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] p-10 flex flex-col items-center justify-center text-center gap-3 min-h-[400px]">
                <div className="w-12 h-12 bg-neutral-50 border border-neutral-200/50 rounded-xl flex items-center justify-center">
                  <User size={20} className="text-neutral-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-neutral-900 tracking-tight">Expediente de Cliente</h3>
                  <p className="text-xs text-neutral-400 max-w-xs font-medium leading-relaxed">
                    Seleccione un cliente del directorio para consultar su balance de crédito, historial de órdenes y productos favoritos.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div key={selectedCredit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] p-5 md:p-8 space-y-6">
                
                {/* BOTÓN VOLVER (SOLO MÓVIL) */}
                <button 
                  onClick={() => setSelectedCredit(null)}
                  className="lg:hidden flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-4 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200/50 active:scale-95 transition-transform w-max"
                >
                  <ArrowLeft size={12} /> Volver al directorio
                </button>

                {/* FICHA DE IDENTIDAD */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-5 pb-5 border-b border-neutral-100">
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-bold text-neutral-900 tracking-tight leading-none">{selectedCredit.customer?.full_name || 'Cliente sin registro'}</h2>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {selectedCredit.customer?.dni && (
                        <span className="text-[10px] font-semibold text-neutral-500 uppercase bg-neutral-50 border border-neutral-200/50 px-2 py-0.5 rounded font-mono">
                          DNI: {selectedCredit.customer.dni}
                        </span>
                      )}
                      {selectedCredit.customer?.phone && (
                        <a 
                          href={`https://wa.me/${selectedCredit.customer.phone.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] font-semibold text-emerald-700 uppercase bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded hover:bg-emerald-100 transition-colors font-mono"
                        >
                          Tlf: {selectedCredit.customer.phone}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="bg-neutral-50 border border-neutral-200/50 px-4 py-3 rounded-xl flex flex-col items-end shrink-0 w-full sm:w-auto">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500 leading-none mb-1.5">Crédito a favor</span>
                    <span className="text-xl font-bold leading-none font-mono text-neutral-900">${selectedCredit.balance_usd.toFixed(2)}</span>
                  </div>
                </div>

                {/* DIRECCIÓN DE DESPACHO */}
                {selectedCredit.customer?.shipping_details?.addressDetail ? (
                  <div className="bg-neutral-50/50 rounded-xl p-4 md:p-5 border border-neutral-200/50 flex flex-col gap-2.5">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider leading-none">Preferencia de Envío Nacional</span>
                    <div className="flex items-start gap-3 bg-white p-3.5 rounded-lg border border-neutral-200/50 shadow-xs">
                      <MapPin size={14} className="text-neutral-400 mt-0.5 shrink-0" />
                      <div className="text-xs text-neutral-600 font-medium leading-relaxed">
                        <strong className="text-neutral-900 font-semibold block mb-0.5">{selectedCredit.customer.shipping_details.courier} (Cobro en Destino)</strong>
                        {selectedCredit.customer.shipping_details.addressDetail}, {selectedCredit.customer.shipping_details.city}, {selectedCredit.customer.shipping_details.state}.
                        {selectedCredit.customer.shipping_details.reference && <span className="block text-neutral-400 font-medium mt-1">Ref: {selectedCredit.customer.shipping_details.reference}</span>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-50/30 rounded-xl p-4 border border-dashed border-neutral-200 text-center">
                    <p className="text-xs text-neutral-400 font-medium">El cliente aún no ha pre-configurado sus datos de despacho en su Passport.</p>
                  </div>
                )}

                {/* NAVEGACIÓN INTERNA (Pill Tabs) */}
                <div className="flex gap-2 border-b border-neutral-100 pb-3 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'credit', label: 'Crédito', icon: Wallet },
                    { id: 'orders', label: 'Compras', icon: ShoppingBag },
                    { id: 'favorites', label: 'Favoritos', icon: Heart }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                        activeTab === tab.id 
                          ? 'bg-neutral-900 text-white shadow-xs' 
                          : 'bg-transparent text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                      }`}
                    >
                      <tab.icon size={13} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* CONTENIDO DINÁMICO */}
                <div className="min-h-[200px] relative">
                  {loadingDetail ? (
                    <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-neutral-300" size={20} /></div>
                  ) : (
                    <div className="animate-in fade-in duration-200">
                      
                      {/* TAB 1: LEDGER */}
                      {activeTab === 'credit' && (
                        <div className="space-y-2">
                          {ledger.length === 0 ? (
                            <p className="text-xs text-neutral-400 font-medium text-center py-8 bg-neutral-50/50 rounded-lg border border-dashed border-neutral-200/50">Sin movimientos registrados.</p>
                          ) : (
                            <div className="divide-y divide-neutral-100">
                              {ledger.map((entry) => {
                                const isPositive = entry.amount_usd >= 0;
                                return (
                                  <div key={entry.id} className="py-3 flex justify-between items-center text-sm">
                                    <div className="min-w-0 pr-4 space-y-0.5">
                                      <p className="font-semibold text-xs text-neutral-900 truncate">{entry.description}</p>
                                      <p className="text-[10px] text-neutral-400 font-mono">{new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString()}</p>
                                    </div>
                                    <span className={`font-bold font-mono text-sm shrink-0 ${isPositive ? 'text-emerald-600' : 'text-neutral-900'}`}>
                                      {isPositive ? '+' : ''}${entry.amount_usd.toFixed(2)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB 2: ORDERS */}
                      {activeTab === 'orders' && (
                        <div className="space-y-2">
                          {orders.length === 0 ? (
                            <p className="text-xs text-neutral-400 font-medium text-center py-8 bg-neutral-50/50 rounded-lg border border-dashed border-neutral-200/50">Sin órdenes en esta tienda.</p>
                          ) : (
                            <div className="divide-y divide-neutral-100">
                              {orders.map((order) => (
                                <div key={order.id} className="py-3 flex justify-between items-center text-sm">
                                  <div className="min-w-0 pr-4 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-bold text-xs text-neutral-900 font-mono">#{order.order_number}</p>
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border ${
                                        order.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100/40' : 
                                        order.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-100/40' : 'bg-amber-50 text-amber-700 border-amber-100/40'
                                      }`}>
                                        {order.status}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-neutral-400 font-mono">{new Date(order.created_at).toLocaleDateString()}</p>
                                  </div>
                                  <span className="font-bold font-mono text-sm shrink-0 text-neutral-900">
                                    ${order.total_usd.toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB 3: FAVORITES */}
                      {activeTab === 'favorites' && (
                        <div className="space-y-3">
                          {favorites.length === 0 ? (
                            <p className="text-xs text-neutral-400 font-medium text-center py-8 bg-neutral-50/50 rounded-lg border border-dashed border-neutral-200/50">Sin artículos favoritos.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {favorites.map((fav) => (
                                <div key={fav.id} className="bg-white p-3 rounded-lg border border-neutral-200/50 shadow-xs flex gap-3 items-center">
                                  <div className="w-12 h-12 bg-neutral-50 rounded-md overflow-hidden shrink-0 relative border border-neutral-100">
                                    {fav.products?.image_url ? (
                                      <img 
                                        src={getOptimizedUrl(fav.products.image_url)} 
                                        alt={fav.products.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-neutral-300"><Package size={14} /></div>
                                    )}
                                  </div>
                                  <div className="flex flex-col justify-center min-w-0">
                                    <h4 className="font-semibold text-xs text-neutral-900 truncate pr-2">{fav.products?.name}</h4>
                                    <span className="text-xs font-bold font-mono text-neutral-500 mt-0.5">${fav.products?.usd_cash_price?.toFixed(2)}</span>
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