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
    <div className="bg-white p-6 md:p-7 rounded-(--radius-card) border border-gray-100 flex flex-col h-full w-full relative group transition-all duration-300 overflow-hidden">
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-5 mb-10">
        <div>
          <h3 className="font-bold text-gray-500 flex items-center gap-2 text-xs uppercase tracking-widest mb-1.5">
            <BarChart3 size={16} className="text-gray-300" /> Ingresos Brutos
          </h3>
          <div className="flex items-baseline gap-2.5">
             {/* Span referenciado para la mutación directa. Empieza con $0.00 hasta que cargue la data */}
             <span 
                ref={animatedTotalRef}
                className="text-4xl md:text-5xl font-black tracking-tighter text-gray-950 tabular-nums"
             >
               $0,00
             </span>
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50  px-2 py-0.5 rounded-(--radius-badge)">
                {timeRange === '7d' ? '7 días' : '30 días'}
             </span>
          </div>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-(--radius-btn) w-fit shrink-0 shadow-inner">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-5 py-2 text-xs font-bold rounded-[10px] transition-all duration-300 flex items-center gap-1.5 ${timeRange === '7d' ? 'bg-white text-black shadow-subtle' : 'text-gray-500 hover:text-black'}`}
          >
            {timeRange === '7d' && <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"/>}
            7 Días
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-5 py-2 text-xs font-bold rounded-(--radius-badge) transition-all duration-300 flex items-center gap-1.5 ${timeRange === '30d' ? 'bg-white text-black shadow-subtle' : 'text-gray-500 hover:text-black'}`}
          >
            {timeRange === '30d' && <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"/>}
            30 Días
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-70 md:min-h-80 w-full relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10 animate-in fade-in transition-all">
            <Loader2 className="animate-spin text-[#4f37d3]" size={32} />
          </div>
        ) : null}
        
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              {/* Gradiente adaptado para fondo blanco: vibrante arriba, desvanecido a transparente abajo */}
              <linearGradient id="colorVentasNeon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f37d3" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#4f37d3" stopOpacity={0}/>
              </linearGradient>
            </defs>

            {/* Grícula estilo tech pero sutil para el fondo blanco */}
            <CartesianGrid vertical={true} horizontal={true} stroke="#F3F4F6" strokeDasharray="4 4" strokeWidth={1} />
            
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }}
              dy={12}
              minTickGap={timeRange === '30d' ? 20 : 0} 
            />
            
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              dx={-5}
            />
            
            <Tooltip 
              cursor={{ stroke: '#4f37d3', strokeWidth: 1, strokeDasharray: '4 4' }}
              isAnimationActive={true}
              animationDuration={200}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length > 0) {
                  const valorSeguro = Number(payload[0]?.value || 0);
                  return (
                    <div className="bg-white/95 backdrop-blur-md p-4 rounded-(--radius-card) border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)] animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                        <div className="bg-purple-50 p-1.5 rounded-md border border-purple-100">
                            <DollarSign size={14} className="text-[#4f37d3]"/>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
                      </div>
                      <p className="text-xl font-black flex items-baseline gap-1.5 text-gray-950 tabular-nums">
                        ${valorSeguro.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <TrendingUp size={16} className="text-[#4f37d3] shrink-0"/>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            
            <Area 
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-in-out"
              type="monotone" 
              dataKey="ventas" 
              
              // Trazo vibrante e intenso para el "efecto dibujo" sobre blanco
              stroke="#4f37d3" 
              strokeWidth={2}
              fill="url(#colorVentasNeon)" 
              
              // Círculos huecos en TODOS los vértices, como en la imagen
              dot={{ 
                r: 4, 
                fill: "#FFFFFF", 
                stroke: "#4f37d3", 
                strokeWidth: 2 
              }}
              
              // Círculo más prominente al pasar el mouse
              activeDot={{ 
                r: 6, 
                fill: "#4f37d3", 
                stroke: "#FFFFFF", 
                strokeWidth: 3,
                style: { filter: 'drop-shadow(0px 0px 4px rgba(79, 55, 211, 0.5))' }
              }}
              connectNulls={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}