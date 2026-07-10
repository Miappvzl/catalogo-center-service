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
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 py-4 flex justify-between items-center border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 hover:bg-gray-50 rounded-xl transition-colors shrink-0">
            <ArrowLeft size={18} className="text-gray-500 hover:text-black" />
          </Link>
          <div>
            <h1 className="font-black text-xl tracking-tight leading-none">Clientes</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Directorio Contable y Passport</p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* COLUMNA IZQUIERDA: DIRECTORIO DE CLIENTES */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          <div className="relative group w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 focus-within:text-black transition-colors" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, tlf o cédula..."
              className="w-full bg-white rounded-2xl pl-10 pr-4 py-3.5 text-sm font-semibold outline-none transition-all shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-transparent focus:border-black"
            />
          </div>

          {loading ? (
            <div className="text-center py-20"><Loader2 className="animate-spin text-gray-300 mx-auto" size={32} /></div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-gray-50 p-6">
              <User size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-400">No se encontraron clientes registrados en tu tienda.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto no-scrollbar">
              {filteredCustomers.map((item) => {
                const isSelected = selectedCredit?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => { setSelectedCredit(item); setActiveTab('credit'); }}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                      isSelected 
                        ? 'bg-black text-white border-black shadow-[0_8px_30px_rgb(0,0,0,0.08)]' 
                        : 'bg-white text-black border-transparent hover:border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.02)]'
                    }`}
                  >
                    <div className="min-w-0 pr-4">
                      <p className="font-bold text-sm truncate">{item.customer?.full_name}</p>
                      <p className={`text-[10px] font-mono mt-1 ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                        {item.customer?.dni || 'Sin Cédula'} • {item.customer?.phone || 'Sin Tlf'}
                      </p>
                    </div>
                    <span className={`text-base font-black shrink-0 ${isSelected ? 'text-white' : 'text-emerald-600'}`}>
                      ${item.balance_usd.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: PERFIL DETALLADO (PASSPORT) */}
        <div className="w-full lg:w-2/3">
          <AnimatePresence mode="wait">
            {!selectedCredit ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full bg-white rounded-[32px] border border-gray-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-12 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                  <User size={36} className="text-gray-300" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-black tracking-tight">Expediente de Cliente</h3>
                  <p className="text-sm text-gray-400 max-w-sm font-medium mt-1">
                    Selecciona un cliente de tu directorio para consultar su balance de crédito local, historial de órdenes y productos favoritos.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div key={selectedCredit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-[32px] border border-gray-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 space-y-8">
                
                {/* FICHA DE IDENTIDAD (Corregida con encadenamiento opcional ?. para evitar crashes) */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-gray-100">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-black tracking-tight leading-none">{selectedCredit.customer?.full_name || 'Cliente sin registro'}</h2>
                    <div className="flex items-center gap-3 pt-2">
                      {selectedCredit.customer?.dni && (
                        <span className="text-[10px] font-bold text-gray-500 uppercase bg-gray-100 px-2 py-1 rounded-md">
                          DNI: {selectedCredit.customer.dni}
                        </span>
                      )}
                      {selectedCredit.customer?.phone && (
                        <a 
                          href={`https://wa.me/${selectedCredit.customer.phone.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-green-700 uppercase bg-green-50 px-2 py-1 rounded-md hover:bg-green-100 transition-colors"
                        >
                          Tlf: {selectedCredit.customer.phone}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="bg-emerald-50 text-emerald-800 px-5 py-4 rounded-2xl flex flex-col items-end shrink-0 border border-emerald-100/50">
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 leading-none mb-1">Crédito de Tienda</span>
                    <span className="text-2xl font-black leading-none">${selectedCredit.balance_usd.toFixed(2)}</span>
                  </div>
                </div>

                {/* DIRECCIÓN DE DESPACHO UNIFICADA (KYC - Opcional ?. seguro) */}
                {selectedCredit.customer?.shipping_details?.addressDetail ? (
                  <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 flex flex-col gap-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Preferencia de Envío Nacional</span>
                    <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-gray-100/50 shadow-[0_4px_20px_rgb(0,0,0,0.01)]">
                      <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                      <div className="text-xs text-gray-700 font-medium leading-relaxed">
                        <strong className="text-black font-semibold block mb-0.5">{selectedCredit.customer.shipping_details.courier} (Cobro en Destino)</strong>
                        {selectedCredit.customer.shipping_details.addressDetail}, {selectedCredit.customer.shipping_details.city}, {selectedCredit.customer.shipping_details.state}.
                        {selectedCredit.customer.shipping_details.reference && <span className="block text-gray-500 font-semibold mt-1">Ref: {selectedCredit.customer.shipping_details.reference}</span>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50/30 rounded-2xl p-4 border border-dashed border-gray-200 text-center">
                    <p className="text-xs text-gray-400 font-medium italic">El cliente aún no ha pre-configurado sus datos de despacho en su Passport.</p>
                  </div>
                )}

                {/* NAVEGACIÓN INTERNA DE DETALLES */}
                <div className="flex gap-4 border-b border-gray-100 pb-3">
                  {[
                    { id: 'credit', label: 'Crédito de Tienda', icon: Wallet },
                    { id: 'orders', label: 'Historial de Compras', icon: ShoppingBag },
                    { id: 'favorites', label: 'Favoritos', icon: Heart }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                        activeTab === tab.id 
                          ? 'border-black text-black font-black' 
                          : 'border-transparent text-gray-400 hover:text-gray-700'
                      }`}
                    >
                      <tab.icon size={14} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* CONTENIDO DÍNAMICO CON TRANSICIONES */}
                <div className="min-h-[250px] relative">
                  {loadingDetail ? (
                    <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={24} /></div>
                  ) : (
                    <div className="animate-in fade-in duration-300">
                      
                      {/* TAB 1: HISTORIAL DE SALDO (LEDGER) */}
                      {activeTab === 'credit' && (
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pb-1">Movimientos recientes</p>
                          {ledger.length === 0 ? (
                            <p className="text-sm text-gray-400 font-medium italic text-center py-10 bg-gray-50/40 rounded-2xl">Este cliente no posee movimientos de crédito registrados.</p>
                          ) : (
                            <div className="divide-y divide-gray-100">
                              {ledger.map((entry) => {
                                const isPositive = entry.amount_usd >= 0;
                                return (
                                  <div key={entry.id} className="py-4 flex justify-between items-center text-sm">
                                    <div className="min-w-0 pr-4">
                                      <p className="font-bold text-gray-900 truncate leading-snug">{entry.description}</p>
                                      <p className="text-[10px] text-gray-400 font-mono mt-1">{new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString()}</p>
                                    </div>
                                    <span className={`font-black text-base shrink-0 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {isPositive ? '+' : ''}${entry.amount_usd.toFixed(2)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB 2: HISTORIAL DE COMPRAS (ORDERS) */}
                      {activeTab === 'orders' && (
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pb-1">Compras en esta tienda</p>
                          {orders.length === 0 ? (
                            <p className="text-sm text-gray-400 font-medium italic text-center py-10 bg-gray-50/40 rounded-2xl">Este cliente no posee órdenes registradas en tu tienda.</p>
                          ) : (
                            <div className="divide-y divide-gray-100">
                              {orders.map((order) => (
                                <div key={order.id} className="py-4 flex justify-between items-center text-sm">
                                  <div className="min-w-0 pr-4">
                                    <div className="flex items-center gap-3">
                                      <p className="font-black text-gray-900">#{order.order_number}</p>
                                      <span className={`px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest ${
                                        order.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 
                                        order.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                                      }`}>
                                        {order.status}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-mono mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                                  </div>
                                  <span className="font-black text-base shrink-0 text-gray-900">
                                    ${order.total_usd.toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB 3: FAVORITOS EN LA TIENDA */}
                      {activeTab === 'favorites' && (
                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pb-1">Intenciones de compra actuales</p>
                          {favorites.length === 0 ? (
                            <p className="text-sm text-gray-400 font-medium italic text-center py-10 bg-gray-50/40 rounded-2xl">Este cliente no posee artículos en favoritos en tu tienda.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {favorites.map((fav) => (
                                <div key={fav.id} className="bg-white p-4 rounded-2xl border border-gray-100/60 shadow-[0_4px_20px_rgb(0,0,0,0.01)] flex gap-4">
                                  <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0 relative border border-gray-50">
                                    {fav.products?.image_url ? (
                                      <img 
                                        src={getOptimizedUrl(fav.products.image_url)} 
                                        alt={fav.products.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={16} /></div>
                                    )}
                                  </div>
                                  <div className="flex flex-col justify-center min-w-0">
                                    <h4 className="font-bold text-xs text-gray-900 truncate pr-2">{fav.products?.name}</h4>
                                    <span className="text-sm font-light text-black mt-1">${fav.products?.usd_cash_price?.toFixed(2)}</span>
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