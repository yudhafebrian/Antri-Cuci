/**
 * OvertimeCard.tsx
 * Card overtime per station — compact, readable layout.
 */

import { type StationOvertime, formatMinutesToHM, calcGrowthPercent } from '../../lib/reportService';

interface OvertimeCardProps {
  stats: StationOvertime[];
}

function MiniSparkline({ color, up }: { color: string; up: boolean }) {
  const points = up
    ? '0,16 8,12 16,14 24,8 32,10 40,4'
    : '0,4 8,8 16,6 24,12 32,10 40,16';
  return (
    <svg width="40" height="20" viewBox="0 0 40 20">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />
    </svg>
  );
}

export default function OvertimeCard({ stats }: OvertimeCardProps) {
  // Poles hanya tampil jika ada data (premium orders)
  const visibleStats = stats.filter((s) => s.station !== 'poles' || s.totalOrders > 0);

  if (visibleStats.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E8E8E4] p-4">
        <div className="text-[13px] font-semibold text-[#1a1a1a] mb-4">Overtime per Station</div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="text-[28px] mb-2">✅</div>
            <div className="text-[13px] text-[#888]">Tidak ada data overtime untuk periode ini</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E8E8E4] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-semibold text-[#1a1a1a]">Overtime per Station</span>
        <span className="text-[11px] text-[#888]">Urut: overtime terbanyak</span>
      </div>

      {/* Station cards grid */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${visibleStats.length}, minmax(0, 1fr))` }}>
        {visibleStats.map((stat) => {
          const growth = calcGrowthPercent(stat.totalOvertimeMinutes, stat.prevTotalOvertimeMinutes);
          const isUp = growth !== null && growth > 0;
          const growthColor = isUp ? '#D04D4D' : '#1D9E75';
          const hasOvertime = stat.totalOvertimeMinutes > 0;

          return (
            <div
              key={stat.station}
              className="flex flex-col gap-2 p-3 rounded-lg border border-[#F0F0EC] bg-[#FAFAF8]"
            >
              {/* Station header: icon + name + SOP on same row */}
              <div className="flex items-center gap-1.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: stat.color + '20' }}
                >
                  <ClockIcon size={12} color={stat.color} />
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-[#1a1a1a] leading-tight">{stat.label}</div>
                  <div className="text-[10px] text-[#888] leading-tight whitespace-nowrap">SOP: {stat.sopMinutes} menit</div>
                </div>
              </div>

              {/* Overtime value */}
              <div
                className="text-[20px] font-bold leading-tight"
                style={{ color: hasOvertime ? '#1a1a1a' : '#bbb' }}
              >
                {formatMinutesToHM(stat.totalOvertimeMinutes)}
              </div>

              {/* Bottom row: order count + sparkline + growth */}
              <div className="flex items-center justify-between gap-1">
                <div className="text-[10px] text-[#888] leading-tight">
                  {stat.overtimeCount}/{stat.totalOrders} order
                </div>
                <MiniSparkline color={hasOvertime ? growthColor : '#ddd'} up={isUp} />
              </div>

              {/* Growth badge */}
              {growth !== null && hasOvertime ? (
                <div
                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full self-start"
                  style={{
                    backgroundColor: isUp ? '#FFE8E8' : '#D4F5E9',
                    color: growthColor,
                  }}
                >
                  {isUp ? '▲' : '▼'} {Math.abs(growth)}%
                </div>
              ) : (
                <div className="h-[20px]" /> // spacer to keep card heights aligned
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClockIcon({ size = 12, color = '#888' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
