/**
 * KPICard.tsx
 * KPI metric card sesuai desain referensi UI.
 * Mendukung: nilai angka/teks, growth indicator, icon berwarna.
 */

import { formatRpFull } from '../../lib/reportService';

interface KPICardProps {
  label: string;
  value: number | string;
  /** Growth % dibanding periode sebelumnya. null = tidak ditampilkan */
  growth?: number | null;
  /** Icon JSX */
  icon?: React.ReactNode;
  /** Icon background color class */
  iconBgColor?: string;
  /** Format value as Rp currency */
  isCurrency?: boolean;
  /** Invert growth color: true means "up = bad" (e.g. overtime) */
  invertGrowth?: boolean;
  /** Sub label below value */
  subLabel?: string;
}

export default function KPICard({
  label,
  value,
  growth = null,
  icon,
  iconBgColor = 'bg-[#EDF5FF]',
  isCurrency = false,
  invertGrowth = false,
  subLabel,
}: KPICardProps) {
  const displayValue = isCurrency && typeof value === 'number'
    ? formatRpFull(value)
    : value;

  const growthPositive = growth !== null && growth > 0;
  const growthNegative = growth !== null && growth < 0;
  const growthNeutral  = growth !== null && growth === 0;

  // Invert logic: for overtime, up is bad (red), down is good (green)
  const growthColor = growth === null ? ''
    : growthNeutral ? 'text-[#888]'
    : invertGrowth
      ? (growthPositive ? 'text-[#D04D4D]' : 'text-[#1D9E75]')
      : (growthPositive ? 'text-[#1D9E75]' : 'text-[#D04D4D]');

  const growthBg = growth === null ? ''
    : growthNeutral ? 'bg-[#F5F5F0]'
    : invertGrowth
      ? (growthPositive ? 'bg-[#FFE8E8]' : 'bg-[#D4F5E9]')
      : (growthPositive ? 'bg-[#D4F5E9]' : 'bg-[#FFE8E8]');

  const arrowIcon = growthPositive ? '▲' : growthNegative ? '▼' : '●';

  return (
    <div
      className="bg-white rounded-xl border border-[#E8E8E4] p-4 flex flex-col gap-3"
      style={{ minWidth: 0 }}
    >
      {/* Top row: label + icon */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium text-[#666] leading-tight">{label}</span>
        {icon && (
          <div className={`w-9 h-9 rounded-lg ${iconBgColor} flex items-center justify-center flex-shrink-0`}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="min-w-0">
        <div className="text-[22px] font-bold text-[#1a1a1a] leading-tight truncate" title={String(displayValue)}>
          {displayValue}
        </div>
        {subLabel && (
          <div className="text-[11px] text-[#888] mt-0.5">{subLabel}</div>
        )}
      </div>

      {/* Growth badge */}
      {growth !== null && (
        <div className={`inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full text-[11px] font-semibold ${growthBg} ${growthColor}`}>
          <span>{arrowIcon}</span>
          <span>{Math.abs(growth)}% dari periode sebelumnya</span>
        </div>
      )}
    </div>
  );
}
