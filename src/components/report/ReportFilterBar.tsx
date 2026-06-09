import { type FilterType } from '../../lib/reportUtils';

interface ReportFilterBarProps {
  filter: FilterType;
  setFilter: (f: FilterType) => void;
  month: number;
  setMonth: (m: number) => void;
  year: number;
  setYear: (y: number) => void;
  customStart: string;
  setCustomStart: (d: string) => void;
  customEnd: string;
  setCustomEnd: (d: string) => void;
}

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function ReportFilterBar({ filter, setFilter, month, setMonth, year, setYear, customStart, setCustomStart, customEnd, setCustomEnd }: ReportFilterBarProps) {
  const handlePrev = () => {
    if (filter === 'year') {
      setYear(year - 1);
    } else {
      const d = new Date(year, month, 1);
      d.setMonth(d.getMonth() - 1);
      setYear(d.getFullYear());
      setMonth(d.getMonth());
    }
  };

  const handleNext = () => {
    if (filter === 'year') {
      setYear(year + 1);
    } else {
      const d = new Date(year, month, 1);
      d.setMonth(d.getMonth() + 1);
      setYear(d.getFullYear());
      setMonth(d.getMonth());
    }
  };

  return (
    <div className="bg-white border-b border-[#E8E8E4] px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <button onClick={handlePrev} className="p-1.5 rounded-lg hover:bg-[#F5F5F0] transition-all cursor-pointer">
          <span className="text-lg">‹</span>
        </button>
        <div className="text-sm font-medium text-[#1a1a1a]">
          {filter === 'year' ? year : `${MONTH_NAMES[month]} ${year}`}
        </div>
        <button onClick={handleNext} className="p-1.5 rounded-lg hover:bg-[#F5F5F0] transition-all cursor-pointer">
          <span className="text-lg">›</span>
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['day', 'week', 'month', 'year', 'custom'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              filter === f
                ? 'bg-[#185FA5] text-white'
                : 'bg-[#F5F5F0] text-[#666] hover:bg-[#E8E8E4]'
            }`}
          >
            {f === 'day' ? 'Hari' : f === 'week' ? 'Minggu' : f === 'month' ? 'Bulan' : f === 'year' ? 'Tahun' : 'Kustom'}
          </button>
        ))}
      </div>

      {filter === 'custom' && (
        <div className="mt-3 flex gap-2">
          <input
            type="date"
            value={customStart}
            onChange={e => setCustomStart(e.target.value)}
            className="flex-1 text-xs border border-[#DDD] rounded-lg px-2 py-1.5"
          />
          <span className="text-xs text-[#888] self-center">–</span>
          <input
            type="date"
            value={customEnd}
            onChange={e => setCustomEnd(e.target.value)}
            className="flex-1 text-xs border border-[#DDD] rounded-lg px-2 py-1.5"
          />
        </div>
      )}
    </div>
  );
}