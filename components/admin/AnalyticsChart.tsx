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

  useEffect(() => {
    if (!animatedTotalRef.current || data.length === 0) return

    const startValue = prevTotalRef.current
    const endValue = totalPeriodo
    if (startValue === endValue) return 

    const duration = 800 
    let startTime: number | null = null

    const easeOutExpo = (x: number): number => {
      return x === 1 ? 1 : 1 - Math.pow(2, -10 * x)
    }

    const animateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const easedProgress = easeOutExpo(progress)

      const currentValue = startValue + (endValue - startValue) * easedProgress

      if (animatedTotalRef.current) {
        animatedTotalRef.current.innerText = '$' + currentValue.toLocaleString('es-VE', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })
      }

      if (progress < 1) {
        requestAnimationFrame(animateCount)
      } else {
        prevTotalRef.current = endValue 
      }
    }

    requestAnimationFrame(animateCount)
  }, [totalPeriodo, data.length])

  return (
    <div className="bg-white p-6 md:p-8 rounded-[var(--radius-card)] flex flex-col h-full w-full relative group transition-all duration-500 overflow-hidden shadow-none">
      
      {/* HEADER DE ANALÍTICAS (Clean Look Absoluto) */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-5 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            {/* Habitáculo Matemático sin skeuomorfismo */}
            <div className="w-11 h-11 rounded-[var(--radius-btn)] bg-[#f6f6f6] text-gray-900 flex items-center justify-center shrink-0">
               <BarChart3 size={18} strokeWidth={2.2} />
            </div>
            <h3 className="font-black text-gray-400 text-xs uppercase tracking-widest leading-none">
              Ingresos Brutos
            </h3>
          </div>

          
          
          <div className="flex items-baseline gap-3">
             <span 
                ref={animatedTotalRef}
                className="text-4xl md:text-5xl font-black tracking-tighter text-gray-900 tabular-nums"
             >
                $0,00
             </span>
             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-[#f6f6f6] px-2.5 py-1 rounded-[var(--radius-badge)]">
                {timeRange === '7d' ? 'Últimos 7 días' : 'Últimos 30 días'}
             </span>
          </div>
        </div>

        {/* SELECTOR SEGMENTADO (Clean Look) */}
        <div className="flex bg-[#F6F6F6] p-1 rounded-xl w-fit shrink-0">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-300 flex items-center justify-center ${timeRange === '7d' ? 'bg-white text-gray-900 shadow-[0_2px_12px_rgba(0,0,0,0.06)]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            7 Días
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-300 flex items-center justify-center ${timeRange === '30d' ? 'bg-white text-gray-900 shadow-[0_2px_12px_rgba(0,0,0,0.06)]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            30 Días
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[250px] md:min-h-[300px] w-full relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10 animate-in fade-in transition-all">
            <Loader2 className="animate-spin text-gray-400" size={28} />
          </div>
        )}
        
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTitanium" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#18181b" stopOpacity={0.08}/>
                <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
              </linearGradient>
            </defs>

            {/* Cuadrícula continua de alta gama (cero líneas punteadas) */}
            <CartesianGrid vertical={false} horizontal={true} stroke="#18181b" strokeOpacity={0.04} strokeWidth={1} />
            
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
              dy={15}
              minTickGap={timeRange === '30d' ? 20 : 0} 
            />
            
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              dx={-10}
            />
            
            <Tooltip 
              cursor={{ stroke: '#18181b', strokeWidth: 1, strokeOpacity: 0.2 }}
              isAnimationActive={true}
              animationDuration={200}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length > 0) {
                  const valorSeguro = Number(payload[0]?.value || 0);
                  return (
                    // Tooltip Glassmorphism sin bordes internos
                    <div className="bg-white/95 backdrop-blur-md p-4 rounded-[var(--radius-card)] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.12)] border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 mb-1">
                           <div className="w-1.5 h-1.5 rounded-full bg-gray-900"></div>
                           <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
                        </div>
                        <p className="text-xl font-black text-gray-900 tabular-nums tracking-tighter">
                          ${valorSeguro.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
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
              type="linear" // <-- LÍNEAS RECTAS Y VECTORES EXACTOS
              dataKey="ventas" 
              stroke="#18181b" 
              strokeWidth={2}
              fill="url(#colorTitanium)" 
              
              // VISIBILIDAD INMEDIATA DE PICOS
              dot={{ 
                r: 3.5, 
                fill: "#ffffff", 
                stroke: "#18181b", 
                strokeWidth: 2 
              }}
              
              activeDot={{ 
                r: 5, 
                fill: "#18181b", 
                stroke: "#ffffff", 
                strokeWidth: 2,
                style: { filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.15))' }
              }}
              connectNulls={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}