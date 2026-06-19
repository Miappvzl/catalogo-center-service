'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { getSupabase } from '@/lib/supabase-client'
import { Loader2, TrendingUp, BarChart3, DollarSign } from 'lucide-react'

interface AnalyticsChartProps {
  storeId: string
}

export default function AnalyticsChart({ storeId }: AnalyticsChartProps) {
  const supabase = getSupabase()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d')
  
  // Referencias para la animación ultra-optimizada (Direct DOM Manipulation)
  const animatedTotalRef = useRef<HTMLSpanElement>(null)
  const prevTotalRef = useRef<number>(0)

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true)
      const days = timeRange === '7d' ? 7 : 30
      const startDate = startOfDay(subDays(new Date(), days - 1))
      const endDate = endOfDay(new Date())

      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, total_usd')
        .eq('store_id', storeId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .neq('status', 'cancelled')

      if (error || !orders) {
        setLoading(false)
        return
      }

      const aggregatedData = Array.from({ length: days }).map((_, i) => {
        const date = subDays(new Date(), days - 1 - i)
        const dateString = format(date, 'yyyy-MM-dd')
        const displayDate = format(date, "d MMM", { locale: es })
        
        const dayTotal = orders
          .filter((o: any) => o.created_at.startsWith(dateString))
          .reduce((acc: number, curr: any) => acc + Number(curr.total_usd), 0)
        
        return {
          date: displayDate,
          fullDate: dateString,
          ventas: Number(dayTotal.toFixed(2))
        }
      })

      setData(aggregatedData)
      setLoading(false)
    }

    if (storeId) fetchAnalytics()
  }, [storeId, timeRange, supabase])

  const totalPeriodo = useMemo(() => data.reduce((acc, curr) => acc + curr.ventas, 0), [data])

  // --- Motor de Animación de Alto Rendimiento (60fps garantizados) ---
  useEffect(() => {
    if (!animatedTotalRef.current || data.length === 0) return

    const startValue = prevTotalRef.current
    const endValue = totalPeriodo
    if (startValue === endValue) return // No animar si es el mismo valor

    const duration = 800 // Duración en ms
    let startTime: number | null = null

    const easeOutExpo = (x: number): number => {
      return x === 1 ? 1 : 1 - Math.pow(2, -10 * x)
    }

    const animateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const easedProgress = easeOutExpo(progress)

      const currentValue = startValue + (endValue - startValue) * easedProgress

      // Mutación directa del DOM: Bypassa el ciclo de vida de React
      if (animatedTotalRef.current) {
        animatedTotalRef.current.innerText = '$' + currentValue.toLocaleString('es-VE', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })
      }

      if (progress < 1) {
        requestAnimationFrame(animateCount)
      } else {
        prevTotalRef.current = endValue // Guardar para la próxima transición
      }
    }

    requestAnimationFrame(animateCount)
  }, [totalPeriodo, data.length])
  // ------------------------------------------------------------------

  return (
    <div className="bg-white p-6 md:p-8 rounded-[var(--radius-card)] flex flex-col h-full w-full relative group transition-all duration-500 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
      
      {/* 🚀 HEADER DE ANALÍTICAS (Clean Look + Titanium Ring) */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-5 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {/* Anillo de Titanio Estratégico */}
            <div className="w-6 h-6 rounded-full p-[1.5px] bg-gradient-to-tr from-zinc-400 via-zinc-100 to-zinc-300 shadow-sm shrink-0">
               <div className="w-full h-full bg-white rounded-full flex items-center justify-center shadow-inner">
                  <BarChart3 size={12} className="text-zinc-700" strokeWidth={2.5} />
               </div>
            </div>
            <h3 className="font-black text-zinc-400 text-[10px] uppercase tracking-widest leading-none mt-0.5">
              Ingresos Brutos
            </h3>
          </div>
          
          <div className="flex items-baseline gap-3">
             {/* Span mutado directamente en el DOM a 60fps */}
             <span 
                ref={animatedTotalRef}
                className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 tabular-nums"
             >
                $0,00
             </span>
             <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-50 px-2 py-1 rounded-[var(--radius-badge)] border border-black/5">
                {timeRange === '7d' ? '7 días' : '30 días'}
             </span>
          </div>
        </div>

        {/* 🚀 SELECTOR SEGMENTADO (Inner shadow mantenida, bordes eliminados) */}
        <div className="flex bg-zinc-100/80 p-1.5 rounded-[var(--radius-btn)] w-fit shrink-0 shadow-inner ring-1 ring-black/[0.02]">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-5 py-2 text-[11px] font-black uppercase tracking-widest rounded-[10px] transition-all duration-500 flex items-center gap-2 ${timeRange === '7d' ? 'bg-white text-zinc-900 shadow-[0_2px_10px_rgba(0,0,0,0.04)] scale-[1.02]' : 'text-zinc-400 hover:text-zinc-600 scale-100'}`}
          >
            {timeRange === '7d' && <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 animate-pulse"/>}
            7 Días
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-5 py-2 text-[11px] font-black uppercase tracking-widest rounded-[10px] transition-all duration-500 flex items-center gap-2 ${timeRange === '30d' ? 'bg-white text-zinc-900 shadow-[0_2px_10px_rgba(0,0,0,0.04)] scale-[1.02]' : 'text-zinc-400 hover:text-zinc-600 scale-100'}`}
          >
            {timeRange === '30d' && <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 animate-pulse"/>}
            30 Días
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[250px] md:min-h-[300px] w-full relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10 animate-in fade-in transition-all">
            <Loader2 className="animate-spin text-zinc-300" size={32} />
          </div>
        ) : null}
        
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              {/* 🚀 GRADIENTE LIQUID TITANIUM: Plata denso a transparente puro */}
              <linearGradient id="colorTitanium" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#71717a" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#e4e4e7" stopOpacity={0}/>
              </linearGradient>
            </defs>

            {/* Cuadrícula técnica ultra-sutil */}
            <CartesianGrid vertical={false} horizontal={true} stroke="#f4f4f5" strokeDasharray="4 4" strokeWidth={1} />
            
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 700 }}
              dy={15}
              minTickGap={timeRange === '30d' ? 20 : 0} 
            />
            
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 700, fontFamily: 'monospace' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              dx={-10}
            />
            
            <Tooltip 
              cursor={{ stroke: '#d4d4d8', strokeWidth: 1.5, strokeDasharray: '4 4' }}
              isAnimationActive={true}
              animationDuration={200}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length > 0) {
                  const valorSeguro = Number(payload[0]?.value || 0);
                  return (
                    // 🚀 TOOLTIP ELITE: Glassmorphism absoluto sin bordes pesados
                    <div className="bg-white/90 backdrop-blur-2xl p-4 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-zinc-100">
                        {/* Anillo de Titanio en el Tooltip */}
                        <div className="w-6 h-6 rounded-full p-[1.5px] bg-gradient-to-tr from-zinc-400 via-zinc-100 to-zinc-300 shadow-sm shrink-0">
                           <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                              <DollarSign size={10} className="text-zinc-800" strokeWidth={3}/>
                           </div>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{label}</p>
                      </div>
                      <p className="text-2xl font-black flex items-center gap-1.5 text-zinc-900 tabular-nums tracking-tighter">
                        ${valorSeguro.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <TrendingUp size={16} className="text-zinc-300 shrink-0 ml-1"/>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            
            <Area 
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
              type="monotone" 
              dataKey="ventas" 
              
              // 🚀 LÍNEA DE GRAFITO: Tinta sólida y profunda
              stroke="#18181b" 
              strokeWidth={2.5}
              fill="url(#colorTitanium)" 
              
              // Vértices limpios
              dot={{ 
                r: 4, 
                fill: "#ffffff", 
                stroke: "#18181b", 
                strokeWidth: 2 
              }}
              
              // Vértice activo (Hover): Más presencia, sombra suave
              activeDot={{ 
                r: 6, 
                fill: "#18181b", 
                stroke: "#ffffff", 
                strokeWidth: 3,
                style: { filter: 'drop-shadow(0px 4px 10px rgba(0, 0, 0, 0.15))' }
              }}
              connectNulls={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}