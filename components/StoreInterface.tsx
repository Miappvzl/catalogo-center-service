"use client";

import { useState, useMemo } from "react";
import { ShoppingBag, RefreshCw, Tag, Search, X, Plus } from "lucide-react";
import Link from "next/link";
import AddToCartBtn from "@/components/AddToCartBtn";
import FloatingCheckout from "@/components/FloatingCheckout";
import NumberTicker from "@/components/NumberTicker";

interface Props {
  store: any;
  products: any[];
  rates: any;
}

export default function StoreInterface({ store, products, rates }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  // --- LÓGICA MAESTRA DE MONEDA ---
  const currencyMode = store.currency_symbol === "€" ? "eur" : "usd";
  const symbol = "$";

  const activeRate =
    currencyMode === "eur"
      ? store.eur_price > 0
        ? store.eur_price
        : rates?.eur_rate
      : store.usd_price > 0
        ? store.usd_price
        : rates?.usd_rate;

  // --------------------------------------------------------

  const normalizeCategory = (cat: string) => {
    if (!cat) return "";
    const trimmed = cat.trim().toLowerCase();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const categories = useMemo(() => {
    const cats = products
      .map((p) => normalizeCategory(p.category))
      .filter(Boolean);
    return ["Todos", ...Array.from(new Set(cats))];
  }, [products]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const productCatClean = normalizeCategory(product.category);
    const matchesCategory =
      selectedCategory === "Todos" || productCatClean === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-white pb-32 font-sans relative">
      {/* HEADER INDUSTRIAL / TÉCNICO */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 md:h-24 flex items-center justify-between transition-all duration-300">
          
          {/* --- IZQUIERDA: IDENTIDAD --- */}
          <div className="flex items-center gap-3 md:gap-4 group cursor-default">
            <div className="relative">
                {store.logo_url ? (
                <img
                    src={store.logo_url}
                    className="w-9 h-9 md:w-14 md:h-14 object-contain rounded-lg border border-gray-100 bg-white shadow-sm group-hover:scale-105 transition-transform duration-500"
                    alt="Logo"
                />
                ) : (
                <div className="w-9 h-9 md:w-14 md:h-14 bg-gray-900 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-gray-900/20 transition-all duration-500">
                    <ShoppingBag className="text-white w-4 h-4 md:w-6 md:h-6" />
                </div>
                )}
                {/* Dot de estado "Online" en el logo */}
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            
            <div className="flex flex-col justify-center">
              <h1 className="text-base md:text-2xl font-black tracking-tighter text-gray-900 uppercase leading-none">
                {store.name}
              </h1>
              <div className="hidden md:flex items-center gap-1.5 mt-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                  Official Store
                </p>
              </div>
            </div>
          </div>

          {/* --- DERECHA: DATA FINANCIERA (ADAPTATIVA) --- */}
          
          {/* 1. VERSIÓN MÓVIL: "The Pill" (Minimalista, una sola línea) */}
          <div className="md:hidden flex items-center gap-2 bg-gray-50 border border-gray-200/80 rounded-full pl-1 pr-3 py-1 shadow-sm">
            <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">BCV</span>
                <span className="font-mono text-xs font-black text-gray-900 tracking-tight tabular-nums">
                    <NumberTicker value={activeRate} />
                </span>
                <span className="text-[9px] font-bold text-gray-400">Bs</span>
            </div>
          </div>

          {/* 2. VERSIÓN DESKTOP: "The Terminal" (Full Data, Estilo Hacker) */}
          <div className="hidden md:flex flex-col items-end relative group">
            <div className="bg-gray-50/50 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 px-5 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-4 cursor-help backdrop-blur-sm">
                
                {/* Indicador de Estado */}
                <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Live Feed</span>
                </div>

                {/* El Valor */}
                <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-gray-400 uppercase mb-0.5 tracking-wider">Tasa Oficial</span>
                    <div className="flex items-baseline gap-1 leading-none">
                        <span className="font-mono text-xl font-black text-gray-900 tracking-tighter tabular-nums">
                             <NumberTicker value={activeRate} />
                        </span>
                        <span className="text-[10px] font-bold text-gray-500">Bs/$</span>
                    </div>
                </div>
            </div>
            {/* Sombra suave inferior para profundidad */}
            <div className="absolute -bottom-2 right-2 w-[90%] h-2 bg-gray-200/50 rounded-full blur-md -z-10 group-hover:bg-gray-300/50 transition-colors"></div>
          </div>

        </div>

        {/* BUSCADOR INTEGRADO (Sin cambios visuales drásticos, solo limpieza) */}
        <div className="max-w-6xl mx-auto px-4 py-2 md:py-4 border-t border-gray-100">
           {/* ... (Mantén tu código del buscador aquí, ese estaba bien) ... */}
           <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors"
                    size={18}
                    />
                    <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium transition-all outline-none placeholder:text-gray-400"
                    />
                     {searchTerm && (
                    <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X size={14} className="text-gray-500" />
                    </button>
                    )}
                </div>
                
                 {/* CHIPS */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar items-center mask-linear-fade">
                    {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat as string)}
                        className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                        selectedCategory === cat
                            ? "bg-black text-white border-black scale-105"
                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-black hover:shadow-md"
                        }`}
                    >
                        {cat as string}
                    </button>
                    ))}
                </div>
           </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex justify-between items-end mb-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {filteredProducts.length}{" "}
            {filteredProducts.length === 1 ? "Item" : "Items"}
            {selectedCategory !== "Todos" && (
              <span className="text-black">
                {" "}
                / {selectedCategory}
              </span>
            )}
          </p>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-200 rounded-xl">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-gray-400" size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900">
              Sin resultados
            </h3>
            <p className="text-gray-500 text-sm mt-1 mb-4">
              No encontramos repuestos con ese nombre.
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("Todos");
              }}
              className="text-black font-bold text-xs underline uppercase tracking-wide"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredProducts.map((product: any) => {
              const hasPenalty = product.usd_penalty > 0;
              const totalRef =
                product.usd_cash_price + (product.usd_penalty || 0);
              const priceInBs = totalRef * (activeRate || 0);

              return (
                <div
                  key={product.id}
                  className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-black/30 hover:shadow-lg transition-all duration-300 relative flex flex-col h-full"
                >
                  {/* IMAGEN TÉCNICA (Cuadrada + Contain) */}
                  <Link
                    href={`/product/${product.id}`}
                    className="block cursor-pointer relative aspect-square bg-white border-b border-gray-50"
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500 mix-blend-multiply"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                        <span className="font-bold text-4xl opacity-20">P.</span>
                      </div>
                    )}

                    {/* Badge de Oferta (Estilo Etiqueta) */}
                    {hasPenalty && (
                      <div className="absolute top-2 left-2 bg-black text-white text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded-md">
                        Desc Divisa
                      </div>
                    )}
                  </Link>

                  {/* INFO DEL PRODUCTO */}
                  <div className="p-4 flex flex-col flex-1 gap-2">
                    <div className="flex-1">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                        {product.category || "General"}
                      </span>
                      <Link href={`/product/${product.id}`}>
                        <h3 className="font-bold text-gray-900 text-sm leading-tight group-hover:text-black line-clamp-2">
                          {product.name}
                        </h3>
                      </Link>
                    </div>

                    {/* ZONA DE ACCIÓN (Precio + Botón) */}
                    <div className="pt-3 border-t border-dashed border-gray-100 flex items-end justify-between gap-2">
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <span className="text-sm font-bold text-gray-400 mr-0.5">$</span>
                          <span className="text-xl font-black text-gray-900 tracking-tight">
                            {product.usd_cash_price}
                          </span>
                        </div>
                        {activeRate > 0 && (
                          <span className="font-mono text-[10px] text-gray-500 font-medium">
                            Bs {new Intl.NumberFormat("es-VE", {
                              maximumFractionDigits: 2,
                            }).format(priceInBs)}
                          </span>
                        )}
                      </div>

                      {/* Botón Integrado en la Fila (Más ergonómico) */}
                      <div className="shrink-0">
                        <AddToCartBtn product={product} iconOnly={true} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <FloatingCheckout
  rate={activeRate}
  currency={currencyMode}
  phone={store.phone || "584120000000"}
  storeName={store.name}
  paymentMethods={store.payment_methods}
  storeId={store.id}  // <--- AGREGA ESTA LÍNEA OBLIGATORIAMENTE
  shippingConfig={store.shipping_config}
/>

      <footer className="py-8 text-center text-xs text-gray-400 bg-white border-t border-gray-100">
        <p>
          Precios calculados a tasa {currencyMode.toUpperCase()}{" "}
          {activeRate > 0 ? `(${activeRate} Bs)` : ""}
        </p>
        <p className="mt-1 font-medium">Powered by Preziso</p>
      </footer>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}
      </style>
    </div>
  );
}
