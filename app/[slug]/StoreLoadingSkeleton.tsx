// app/[slug]/StoreLoadingSkeleton.tsx
export default function StoreLoadingSkeleton() {
  return (
    <div className="w-full min-h-screen pb-32 overflow-hidden select-none pointer-events-none">
 
      {/* SKELETON: HERO SECTION */}
      <div className="w-full h-[35vh] md:h-[25vh] bg-[var(--store-surface)] border-b border-[var(--store-border)] relative flex items-start animate-pulse">
        <div className="max-w-[1500px] w-full mx-auto px-4 md:px-8 pt-5 md:pt-6 flex items-start justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            {/* Logo */}
            <div className="w-10 h-10 md:w-12 md:h-12 bg-[var(--store-border)] opacity-70 rounded-full shrink-0"></div>
            {/* Nombre e Info */}
            <div className="flex flex-col gap-2">
              <div className="w-32 md:w-48 h-3.5 bg-[var(--store-border)] rounded-full"></div>
              <div className="w-20 h-2 bg-[var(--store-border)] opacity-50 rounded-full"></div>
            </div>
          </div>
          {/* Tasa */}
          <div className="w-24 h-4 bg-[var(--store-border)] rounded-full mt-2 md:mt-3"></div>
        </div>
      </div>

      {/* SKELETON: NAVBAR (Buscador y Categorías) */}
      <div className="bg-[var(--store-surface)] border-b border-[var(--store-border)] pb-4 pt-4 md:pt-6 animate-pulse">
        <div className="max-w-[1500px] mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center mb-3 md:mb-5">
            {/* Buscador */}
            <div className="w-full md:max-w-md h-11 bg-[var(--store-border)] opacity-60 rounded-full shrink-0"></div>

            {/* Categorías */}
            <div className="w-full md:flex-1 flex gap-2 overflow-hidden">
              <div className="w-16 h-8 bg-[var(--store-border)] rounded-full shrink-0"></div>
              <div className="w-24 h-8 bg-[var(--store-border)] rounded-full shrink-0"></div>
              <div className="w-20 h-8 bg-[var(--store-border)] opacity-50 rounded-full shrink-0 hidden sm:block"></div>
            </div>
          </div>
        </div>
      </div>

      {/* SKELETON: GRID DE PRODUCTOS */}
      <main className="max-w-[1500px] mx-auto px-4 md:px-8 pt-6 md:pt-8 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              {/* Foto del producto */}
              <div className="w-full aspect-square bg-[var(--store-border)] opacity-40 rounded-[var(--radius-card,1rem)]"></div>
              {/* Textos */}
              <div className="space-y-2 px-1">
                <div className="w-full h-3 bg-[var(--store-border)] opacity-70 rounded-full"></div>
                <div className="w-2/3 h-2.5 bg-[var(--store-border)] opacity-40 rounded-full"></div>
                <div className="w-1/3 h-4 bg-[var(--store-border)] opacity-80 rounded-full mt-2"></div>
              </div>
            </div>
          ))}
        </div>
      </main>

    </div>
  )
}