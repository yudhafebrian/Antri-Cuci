/**
 * TrafficChart.tsx
 * Bar chart — Jam/Hari/Bulan Paling Ramai
 * Context-aware: tampilkan jam jika filter hari, hari jika filter minggu/bulan,
 * bulan jika filter tahun.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { type TrafficPoint, type DateRange, getTrafficGrouping } from '../../lib/reportService';

interface TrafficChartProps {
  data: TrafficPoint[];
  range: DateRange;
}

function getChartTitle(grouping: 'hour' | 'day' | 'month'): string {
  switch (grouping) {
    case 'hour':  return 'Jam Paling Ramai';
    case 'day':   return 'Hari Paling Ramai';
    case 'month': return 'Bulan Paling Ramai';
  }
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; payload: TrafficPoint }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-[#1a1a1a] text-white rounded-lg shadow-xl px-3 py-2 text-[12px]">
      <div className="font-semibold mb-0.5">{label}</div>
      <div>{item.value} kendaraan</div>
      <div className="text-[#bbb]">{item.payload.percentage}% dari total</div>
    </div>
  );
}

export default function TrafficChart({ data, range }: TrafficChartProps) {
  const grouping = getTrafficGrouping(range);
  const title = getChartTitle(grouping);
  const peakItem = data.find((d) => d.isPeak);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E8E8E4] p-4 flex flex-col h-full">
        <div className="text-[13px] font-semibold text-[#1a1a1a] mb-1">{title}</div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[32px] mb-2">🕐</div>
            <div className="text-[13px] text-[#888]">Belum ada data untuk periode ini</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E8E8E4] p-4 flex flex-col h-full min-h-[260px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-semibold text-[#1a1a1a]">{title}</span>
        {peakItem && (
          <div className="bg-[#1a1a1a] text-white rounded-lg px-2.5 py-1 text-[11px] font-medium">
            {peakItem.label} — {peakItem.percentage}% (Maks)
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1" style={{ minHeight: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#888' }}
              axisLine={false}
              tickLine={false}
              interval={grouping === 'hour' && data.length > 8 ? Math.floor(data.length / 8) : 0}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#888' }}
              axisLine={false}
              tickLine={false}
              width={28}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F5F5F0' }} />
            <Bar dataKey="percentage" radius={[3, 3, 0, 0]} maxBarSize={40}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.isPeak ? '#8B44E0' : '#C4B5F4'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
