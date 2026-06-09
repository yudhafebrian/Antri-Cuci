/**
 * RevenueBarChart.tsx
 * Horizontal bar chart — Paket Penyumbang Revenue Terbesar
 */

import { type TopRevenuePackage, formatRp } from '../../lib/reportService';

interface RevenueBarChartProps {
  data: TopRevenuePackage[];
}

const BAR_COLORS = ['#185FA5', '#8B44E0', '#1D9E75', '#E06520', '#888888'];

export default function RevenueBarChart({ data }: RevenueBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E8E8E4] p-4 flex flex-col h-full">
        <div className="text-[13px] font-semibold text-[#1a1a1a] mb-1">Paket Penyumbang Revenue Terbesar</div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[32px] mb-2">💰</div>
            <div className="text-[13px] text-[#888]">Belum ada data untuk periode ini</div>
          </div>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="bg-white rounded-xl border border-[#E8E8E4] p-4 flex flex-col h-full">
      <div className="text-[13px] font-semibold text-[#1a1a1a] mb-4">Paket Penyumbang Revenue Terbesar</div>

      <div className="flex flex-col gap-3 flex-1">
        {data.map((item, i) => {
          const color = BAR_COLORS[i] ?? '#888';
          const widthPct = Math.round((item.revenue / maxRevenue) * 100);

          return (
            <div key={i} className="flex flex-col gap-1">
              {/* Row: name + value */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-[#333] truncate flex-1">{item.packageName}</span>
                <span className="text-[12px] font-semibold text-[#1a1a1a] flex-shrink-0">
                  {formatRp(item.revenue)}{' '}
                  <span className="text-[#aaa] font-normal text-[11px]">({item.percentage}%)</span>
                </span>
              </div>
              {/* Bar */}
              <div className="h-2 bg-[#F5F5F0] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${widthPct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
