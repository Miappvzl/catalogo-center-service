'use client'

import { useState, useEffect, useMemo } from 'react'
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

  return (
    <div className="bg-white p-6 md:p-7 rounded-(--radius-card) border border-gray-100 flex flex-col h-full w-full relative group transition-all duration-300 overflow-hidden">
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-5 mb-10">
        <div>
          <h3 className="font-bold text-gray-500 flex items-center gap-2 text-xs uppercase tracking-widest mb-1.5">
            <BarChart3 size={16} className="text-gray-300" /> Ingresos Brutos
          </h3>
          <div className="flex items-baseline gap-2.5">
             <span className="text-4xl md:text-5xl font-black tracking-tighter text-gray-950">
               ${totalPeriodo.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </span>
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-(--radius-badge)">
                {timeRange === '7d' ? '7 días' : '30 días'}
             </span>
          </div>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-(--radius-btn) border border-gray-200 w-fit shrink-0 shadow-inner">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-5 py-2 text-xs font-bold rounded-(--radius-badge) transition-all duration-300 flex items-center gap-1.5 ${timeRange === '7d' ? 'bg-white text-black shadow-subtle' : 'text-gray-500 hover:text-black'}`}
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
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10 animate-in fade-in transition-all">
            <Loader2 className="animate-spin text-gray-300" size={32} />
          </div>
        ) : null}
        
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
            {/* Etiquetas SVG Nativas en minúsculas */}
            <defs>
              <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="1%" stopColor="#0084ff" stopOpacity={200}/>
                <stop offset="99%" stopColor="#0611ab" stopOpacity={0}/>
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke="#F3F4F6" strokeWidth={1} />
            
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
              cursor={{ stroke: '#D1D5DB', strokeWidth: 1, strokeDasharray: '0' }}
              isAnimationActive={true}
              animationDuration={300}
              content={({ active, payload, label }) => {
                // Blindaje TypeScript con Optional Chaining
                if (active && payload && payload.length > 0) {
                  const valorSeguro = Number(payload[0]?.value || 0);
                  return (
                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-(--radius-card) border border-gray-100 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                        <div className="bg-gray-100 p-1.5 rounded-md border border-gray-200">
                            <DollarSign size={14} className="text-gray-500"/>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
                      </div>
                      <p className="text-xl font-black flex items-baseline gap-1.5 text-gray-950">
                        ${valorSeguro.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <TrendingUp size={16} className="text-green-500 shrink-0"/>
                      </p>
                      <p className="text-[10px] font-medium text-gray-500 mt-1">Ingresos netos del día</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            
            <Area 
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-in-out"
              type="monotone" 
              dataKey="ventas" 
              stroke="#11286c" 
              strokeWidth={1.2}
              fill="url(#colorVentas)" 
              activeDot={{ 
                r: 5, 
                fill: "#FFFFFF", 
                stroke: "#000000", 
                strokeWidth: 2.5,
              }}
              connectNulls={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}