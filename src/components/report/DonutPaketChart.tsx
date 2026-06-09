/**
 * DonutPaketChart.tsx
 * Donut chart — Paket Paling Banyak Dipilih (Top 5)
 */

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { type TopPackage } from '../../lib/reportService';

interface DonutPaketChartProps {
  data: TopPackage[];
}

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: { payload: TopPackage }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white border border-[#E8E8E4] rounded-lg shadow-lg px-3 py-2 text-[12px]">
      <div className="font-semibold text-[#1a1a1a] mb-0.5">{item.packageName}</div>
      <div className="text-[#555]">{item.count} pesanan ({item.percentage}%)</div>
    </div>
  );
}

export default function DonutPaketChart({ data }: DonutPaketChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E8E8E4] p-4 flex flex-col h-full">
        <div className="text-[13px] font-semibold text-[#1a1a1a] mb-1">Paket Paling Banyak Dipilih</div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[32px] mb-2">🏆</div>
            <div className="text-[13px] text-[#888]">Belum ada data untuk periode ini</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E8E8E4] p-4 flex flex-col h-full">
      <div className="text-[13px] font-semibold text-[#1a1a1a] mb-3">Paket Paling Banyak Dipilih</div>
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Donut */}
        <div className="w-[140px] flex-shrink-0" style={{ minHeight: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={65}
                dataKey="count"
                strokeWidth={2}
                stroke="#fff"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-col justify-center gap-2 flex-1 min-w-0">
          {data.map((item, i) => (
            <div key={i} className="flex items-center gap-2 min-w-0">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-[#333] truncate leading-tight">{item.packageName}</div>
              </div>
              <div className="text-[12px] font-semibold text-[#555] flex-shrink-0 ml-1">
                {item.count} <span className="text-[#aaa] font-normal">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
