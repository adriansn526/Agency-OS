"use client"

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { DayPoint } from "@/lib/commerce/trends"

export function StockChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} fontSize={11} />
        <YAxis allowDecimals={false} fontSize={11} />
        <Tooltip />
        <Legend />
        <Bar dataKey="out" name="Epuizate la furnizor" fill="#dc2626" />
        <Bar dataKey="back" name="Reaprovizionate" fill="#16a34a" />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function PriceChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} fontSize={11} />
        <YAxis allowDecimals={false} fontSize={11} />
        <Tooltip />
        <Bar dataKey="priceChanges" name="Prețuri schimbate" fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  )
}
