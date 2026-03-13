'use client'

import { useState, useEffect, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { getSupabase } from '@/lib/supabase-client'
import { Loader2, TrendingUp, BarChart3 } from 'lucide-react'

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
        const displayDate = format(date, "d 'de' MMM", { locale: es })
        
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
    <div className="bg-white p-6 rounded-[var(--radius-card)] card-interactive flex flex-col h-full w-full relative group">
      
      {/* HEADER DEL GRÁFICO */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h3 className="font-black text-gray-900 flex items-center gap-2 text-lg">
            <BarChart3 size={20} className="text-gray-400" /> Ingresos Brutos
          </h3>
          <div className="flex items-baseline gap-2 mt-1">
             <span className="text-2xl font-black tracking-tighter">${totalPeriodo.toFixed(2)}</span>
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Últimos {timeRange === '7d' ? '7' : '30'} días
             </span>
          </div>
        </div>

        {/* SELECTOR DE TIEMPO (Borderless) */}
        <div className="flex bg-gray-50 p-1 rounded-[var(--radius-btn)] w-fit">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-4 py-1.5 text-xs font-bold rounded-[var(--radius-badge)] transition-all ${timeRange === '7d' ? 'bg-white text-black shadow-subtle border border-transparent' : 'text-gray-400 hover:text-black border border-transparent'}`}
          >
            7 Días
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-4 py-1.5 text-xs font-bold rounded-[var(--radius-badge)] transition-all ${timeRange === '30d' ? 'bg-white text-black shadow-subtle border border-transparent' : 'text-gray-400 hover:text-black border border-transparent'}`}
          >
            30 Días
          </button>
        </div>
      </div>

      {/* ÁREA DEL GRÁFICO */}
      <div className="flex-1 min-h-[250px] w-full relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <Loader2 className="animate-spin text-gray-300" size={32} />
          </div>
        ) : null}
        
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              cursor={{ stroke: '#E5E7EB', strokeWidth: 2, strokeDasharray: '4 4' }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-black text-white p-3 rounded-[var(--radius-card)] border border-[#333] shadow-subtle">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
                      <p className="text-lg font-black flex items-center gap-1">
                        ${payload[0].value} <TrendingUp size={14} className="text-green-400"/>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="ventas" 
              stroke="#000000" 
              strokeWidth={3}
              fill="#F9FAFB" 
              activeDot={{ r: 6, fill: "#000000", stroke: "#FFFFFF", strokeWidth: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}