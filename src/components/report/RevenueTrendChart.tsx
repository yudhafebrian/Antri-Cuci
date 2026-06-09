/**
 * RevenueTrendChart.tsx
 * Line chart — Trend Revenue (Revenue per hari/bulan/jam)
 */

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { type RevenueTrendPoint, formatRp } from '../../lib/reportService';

interface RevenueTrendChartProps {
  data: RevenueTrendPoint[];
}

function formatXLabel(date: string): string {
  // Could be HH:00, YYYY-MM-DD, YYYY-MM
  if (/^\d{2}:00$/.test(date)) return date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const d = new Date(date + 'T00:00:00');
    return `${d.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()]}`;
  }
  if (/^\d{4}-\d{2}$/.test(date)) {
    const [, m] = date.split('-');
    return ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][parseInt(m, 10) - 1] ?? date;
  }
  return date;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const revenueEntry = payload.find((p) => p.name === 'revenue');
  const vehiclesEntry = payload.find((p) => p.name === 'vehicles');

  return (
    <div className="bg-white border border-[#E8E8E4] rounded-lg shadow-lg px-3 py-2.5 text-[12px]">
      <div className="font-semibold text-[#1a1a1a] mb-1">{label && formatXLabel(label)}</div>
      {revenueEntry && (
        <div className="text-[#185FA5]">Revenue: <span className="font-semibold">{formatRp(revenueEntry.value)}</span></div>
      )}
      {vehiclesEntry && (
        <div className="text-[#888]">Kendaraan: <span className="font-semibold">{vehiclesEntry.value}</span></div>
      )}
    </div>
  );
}

export default function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E8E8E4] p-4 flex flex-col h-full">
        <div className="text-[13px] font-semibold text-[#1a1a1a] mb-1">Trend Revenue</div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[32px] mb-2">📈</div>
            <div className="text-[13px] text-[#888]">Belum ada data untuk periode ini</div>
          </div>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const yTickFormatter = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
    return String(v);
  };

  const tickCount = Math.min(data.length, 8);
  const step = Math.max(1, Math.floor(data.length / tickCount));
  const tickIndices = new Set(
    Array.from({ length: tickCount }, (_, i) => Math.min(i * step, data.length - 1))
  );
  tickIndices.add(data.length - 1);

  const displayData = data.map((d, i) => ({
    ...d,
    displayDate: tickIndices.has(i) ? formatXLabel(d.date) : '',
  }));

  return (
    <div className="bg-white rounded-xl border border-[#E8E8E4] p-4 flex flex-col h-full min-h-[260px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#185FA5]" />
          <span className="text-[13px] font-semibold text-[#1a1a1a]">Trend Revenue</span>
        </div>
        <div className="text-[11px] text-[#888]">Revenue (Rp)</div>
      </div>

      {/* Chart */}
      <div className="flex-1" style={{ minHeight: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#185FA5" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#185FA5" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 10, fill: '#888' }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tickFormatter={yTickFormatter}
              tick={{ fontSize: 10, fill: '#888' }}
              axisLine={false}
              tickLine={false}
              width={36}
              domain={[0, maxRevenue * 1.1]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#185FA5"
              strokeWidth={2}
              fill="url(#revenueGrad)"
              dot={data.length <= 14 ? { r: 3, fill: '#185FA5', strokeWidth: 0 } : false}
              activeDot={{ r: 5, fill: '#185FA5' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
