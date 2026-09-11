'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { getSupabase } from '@/lib/supabase-client'
import { Loader2, BarChart3 } from 'lucide-react'

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
    <div className="bg-white p-5 md:p-7 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col h-full w-full relative overflow-hidden">
      
      {/* HEADER DE ANALÍTICAS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#F6F6F6] text-neutral-900 flex items-center justify-center shrink-0">
               <BarChart3 size={16} strokeWidth={2.2} />
            </div>
            <h3 className="font-bold text-neutral-900 text-xs uppercase tracking-wider leading-none">
              Ingresos Brutos
            </h3>
          </div>

          <div className="flex items-baseline gap-3">
             <span 
                ref={animatedTotalRef}
                className="text-3xl md:text-4xl font-mono font-bold tracking-tight text-neutral-900 tabular-nums"
             >
                $0,00
             </span>
             <span className="text-[9px] font-mono font-semibold text-neutral-400 uppercase tracking-wider bg-[#F6F6F6] px-2 py-0.5 rounded">
                {timeRange === '7d' ? 'Últimos 7 días' : 'Últimos 30 días'}
             </span>
          </div>
        </div>

        {/* SELECTOR SEGMENTADO (Estilo Industrial) */}
        <div className="flex bg-[#F6F6F6] p-1 rounded-lg w-fit shrink-0">
          <button
            type="button"
            onClick={() => setTimeRange('7d')}
            className={`px-3.5 py-1.5 text-[11px] font-mono font-bold transition-all rounded-md cursor-pointer ${timeRange === '7d' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-400 hover:text-neutral-700'}`}
          >
            7 Días
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('30d')}
            className={`px-3.5 py-1.5 text-[11px] font-mono font-bold transition-all rounded-md cursor-pointer ${timeRange === '30d' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-400 hover:text-neutral-700'}`}
          >
            30 Días
          </button>
        </div>
      </div>

      {/* LIENZO RECHARTS */}
      <div className="flex-1 min-h-[260px] md:min-h-[320px] w-full relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-xs z-10 transition-opacity">
            <Loader2 className="animate-spin text-neutral-300" size={24} />
          </div>
        )}
        
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGradientObsidian" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0C0D0E" stopOpacity={0.07}/>
                <stop offset="100%" stopColor="#0C0D0E" stopOpacity={0}/>
              </linearGradient>
            </defs>

            {/* Cuadrícula técnica sutil */}
            <CartesianGrid vertical={false} horizontal={true} stroke="#0C0D0E" strokeOpacity={0.03} strokeWidth={1} />
            
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#A3A3A3', fontFamily: 'monospace', fontWeight: 600 }}
              dy={12}
              minTickGap={timeRange === '30d' ? 24 : 0} 
            />
            
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#A3A3A3', fontFamily: 'monospace', fontWeight: 600 }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              dx={-8}
            />
            
            <Tooltip 
              cursor={{ stroke: '#0C0D0E', strokeWidth: 1, strokeOpacity: 0.15 }}
              isAnimationActive={true}
              animationDuration={200}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length > 0) {
                  const valorSeguro = Number(payload[0]?.value || 0);
                  return (
                    <div className="bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-neutral-100 flex flex-col gap-0.5">
                      <span className="text-[9px] font-mono font-semibold uppercase tracking-wider text-neutral-400">{label}</span>
                      <p className="text-sm font-mono font-bold text-neutral-900 tabular-nums">
                        ${valorSeguro.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              animationEasing="ease-out"
              type="linear"
              dataKey="ventas" 
              stroke="#0C0D0E" 
              strokeWidth={2}
              fill="url(#chartGradientObsidian)" 
              dot={{ 
                r: 3, 
                fill: "#FFFFFF", 
                stroke: "#0C0D0E", 
                strokeWidth: 2 
              }}
              activeDot={{ 
                r: 4.5, 
                fill: "#0C0D0E", 
                stroke: "#FFFFFF", 
                strokeWidth: 2,
                style: { filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))' }
              }}
              connectNulls={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}