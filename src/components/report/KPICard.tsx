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
  /** Compact mode: smaller icon, shorter growth text — for 2-col mobile grids */
  compact?: boolean;
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
  compact = false,
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
      className={`bg-white rounded-xl border border-[#E8E8E4] flex flex-col ${compact ? 'p-3 gap-2' : 'p-4 gap-3'}`}
      style={{ minWidth: 0 }}
    >
      {/* Top row: label + icon */}
      <div className="flex items-start justify-between gap-2">
        <span className={`font-medium text-[#666] leading-tight ${compact ? 'text-[11px]' : 'text-[13px]'}`}>
          {label}
        </span>
        {icon && (
          <div className={`rounded-lg ${iconBgColor} flex items-center justify-center flex-shrink-0 ${compact ? 'w-7 h-7' : 'w-9 h-9'}`}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="min-w-0">
        <div
          className={`font-bold text-[#1a1a1a] leading-tight truncate ${compact ? 'text-[18px]' : 'text-[22px]'}`}
          title={String(displayValue)}
        >
          {displayValue}
        </div>
        {subLabel && (
          <div className="text-[11px] text-[#888] mt-0.5">{subLabel}</div>
        )}
      </div>

      {/* Growth badge */}
      {growth !== null && (
        <div className={`inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full font-semibold ${growthBg} ${growthColor} ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
          <span>{arrowIcon}</span>
          {compact
            ? <span>{Math.abs(growth)}% vs sebelumnya</span>
            : <span>{Math.abs(growth)}% dari periode sebelumnya</span>
          }
        </div>
      )}
    </div>
  );
}
