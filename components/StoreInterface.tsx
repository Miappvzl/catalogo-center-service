"use client";

import { useState, useMemo } from "react";
import { ShoppingBag, RefreshCw, Tag, Search, X, Plus } from "lucide-react";
import Link from "next/link";
import AddToCartBtn from "@/components/AddToCartBtn";
import FloatingCheckout from "@/components/FloatingCheckout";

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
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                className="w-10 h-10 md:w-12 md:h-12 object-contain rounded-md border border-gray-100"
                alt="Logo"
              />
            ) : (
              <div className="w-10 h-10 bg-black rounded-md flex items-center justify-center shadow-sm">
                <ShoppingBag className="text-white w-5 h-5" />
              </div>
            )}
            <div className="flex flex-col">
              {/* TÍTULO SÓLIDO Y ROBUSTO */}
              <h1 className="text-lg md:text-xl font-black tracking-tight text-gray-900 uppercase leading-none">
                {store.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  Catálogo Digital
                </p>
              </div>
            </div>
          </div>

          {/* DATA FINANCIERA (Estilo Terminal) */}
          <div className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-md flex flex-col items-end">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
              Tasa BCV
            </span>
            <div className="font-mono text-sm md:text-base font-bold text-gray-900 leading-none mt-0.5">
              {activeRate} <span className="text-xs text-gray-500">Bs/$</span>
            </div>
          </div>
        </div>

        {/* BUSCADOR */}
        <div className="max-w-6xl mx-auto px-4 py-3 border-t border-gray-50">
           <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                    />
                    <input
                    type="text"
                    placeholder="Buscar por código o nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black focus:ring-0 rounded-lg pl-9 pr-8 py-2 text-sm font-medium transition-all outline-none"
                    />
                    {searchTerm && (
                    <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                    >
                        <X size={14} />
                    </button>
                    )}
                </div>
                
                 {/* CHIPS (Scroll horizontal) */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar items-center">
                    {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat as string)}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-bold transition-all border uppercase tracking-wide ${
                        selectedCategory === cat
                            ? "bg-black text-white border-black"
                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-black"
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
      `}</style>
    </div>
  );
}