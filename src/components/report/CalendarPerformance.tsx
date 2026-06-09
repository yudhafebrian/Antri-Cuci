import { getLevelStyles, type CalendarDay } from '../../lib/reportUtils';

interface CalendarPerformanceProps {
  data: CalendarDay[];
  year: number;
  month: number;
}

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function CalendarPerformance({ data, year, month }: CalendarPerformanceProps) {
  return (
    <div className="bg-white rounded-xl border border-[#E8E8E4] p-4">
      <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Performa {MONTH_NAMES[month]} {year}</h3>
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-[#888] py-1">
            {d}
          </div>
        ))}

        {Array.from({ length: new Date(year, month, 1).getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {data.map(d => {
          const styles = getLevelStyles(d.level);
          return (
            <div
              key={d.day}
              className="aspect-square rounded-lg flex flex-col items-center justify-center text-[11px] font-medium cursor-pointer hover:opacity-80 transition-all"
              style={{ backgroundColor: styles.bg }}
            >
              <span style={{ color: styles.text }}>{d.day}</span>
              {d.vehicles > 0 && (
                <span className="text-[8px] mt-0.5" style={{ color: styles.text }}>
                  {d.vehicles}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#FFFFFF' }} />
          <span className="text-[#888]">Sepi (0-20)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#E6F1FB' }} />
          <span className="text-[#888]">Normal (21-40)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#EAF3DE' }} />
          <span className="text-[#888]">Ramai (41-60)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#FFEDD5' }} />
          <span className="text-[#888]">Sangat Ramai (60+)</span>
        </div>
      </div>
    </div>
  );
}