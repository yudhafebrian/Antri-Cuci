import { type ServiceOrderRow } from './db';

export type FilterType = 'day' | 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
  start: string;
  end: string;
}

export interface KPIResult {
  totalVehicles: number;
  totalRevenue: number;
  bestPackage: string;
  mostRevenuePackage: string;
  vehicleGrowth: number | null;
  revenueGrowth: number | null;
  busiestHour: string;
  busiestDay: string;
}

export interface TrendPoint {
  date: string;
  vehicles: number;
  revenue: number;
}

export interface PaketBreakdown {
  paket: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface CalendarDay {
  day: number;
  date: string;
  vehicles: number;
  revenue: number;
  level: 'sepi' | 'normal' | 'ramai' | 'sangat-ramai';
}

export interface OvertimeStats {
  station: string;
  label: string;
  avgDurationMinutes: number;
  sopMinutes: number;
  overtimeCount: number;
  totalOrders: number;
  overtimePercent: number;
}

// ── Date range helpers ────────────────────────────────────────────────────────

export function getDateRange(filter: FilterType, customStart?: string, customEnd?: string, reference?: Date): DateRange {
  const ref = reference || new Date();
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const day = ref.getDate();

  switch (filter) {
    case 'day':
      return {
        start: new Date(year, month, day, 0, 0, 0, 0).toISOString(),
        end:   new Date(year, month, day, 23, 59, 59, 999).toISOString(),
      };
    case 'week': {
      const dayOfWeek = ref.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(year, month, day - diffToMonday, 0, 0, 0, 0);
      const sunday = new Date(year, month, day + (6 - diffToMonday), 23, 59, 59, 999);
      return { start: monday.toISOString(), end: sunday.toISOString() };
    }
    case 'month':
      return {
        start: new Date(year, month, 1, 0, 0, 0, 0).toISOString(),
        end:   new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString(),
      };
    case 'year':
      return {
        start: new Date(year, 0, 1, 0, 0, 0, 0).toISOString(),
        end:   new Date(year, 11, 31, 23, 59, 59, 999).toISOString(),
      };
    case 'custom':
      return {
        start: customStart || ref.toISOString(),
        end:   customEnd   || ref.toISOString(),
      };
  }
}

export function getPreviousPeriod(range: DateRange): DateRange {
  const start = new Date(range.start);
  const end = new Date(range.end);
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  return { start: prevStart.toISOString(), end: prevEnd.toISOString() };
}

// ── KPI ───────────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function calculateKPIs(data: ServiceOrderRow[], previousData: ServiceOrderRow[]): KPIResult {
  const totalVehicles = data.length;
  const totalRevenue = data.reduce((sum, r) => sum + (r.package_price || 0), 0);

  // Best package by count
  const paketCounts = new Map<string, number>();
  const paketRevenue = new Map<string, number>();
  data.forEach((r) => {
    const name = r.package_name || '-';
    paketCounts.set(name, (paketCounts.get(name) || 0) + 1);
    paketRevenue.set(name, (paketRevenue.get(name) || 0) + (r.package_price || 0));
  });

  let bestPackage = '-';
  let maxCount = 0;
  paketCounts.forEach((count, name) => {
    if (count > maxCount) { maxCount = count; bestPackage = name; }
  });

  let mostRevenuePackage = '-';
  let maxRevenue = 0;
  paketRevenue.forEach((rev, name) => {
    if (rev > maxRevenue) { maxRevenue = rev; mostRevenuePackage = name; }
  });

  // Busiest hour (from times.menunggu)
  const hourCounts = new Map<number, number>();
  data.forEach((r) => {
    const t = r.times['menunggu'];
    if (t) {
      const h = new Date(t).getHours();
      hourCounts.set(h, (hourCounts.get(h) || 0) + 1);
    }
  });
  let busiestHour = '-';
  let maxHour = 0;
  hourCounts.forEach((count, h) => {
    if (count > maxHour) { maxHour = count; busiestHour = `${String(h).padStart(2, '0')}:00`; }
  });

  // Busiest day of week (from times.menunggu)
  const dayCounts = new Map<number, number>();
  data.forEach((r) => {
    const t = r.times['menunggu'];
    if (t) {
      const d = new Date(t).getDay();
      dayCounts.set(d, (dayCounts.get(d) || 0) + 1);
    }
  });
  let busiestDay = '-';
  let maxDay = 0;
  dayCounts.forEach((count, d) => {
    if (count > maxDay) { maxDay = count; busiestDay = DAY_LABELS[d]; }
  });

  // Growth vs previous period
  const prevVehicles = previousData.length;
  const prevRevenue = previousData.reduce((sum, r) => sum + (r.package_price || 0), 0);
  const vehicleGrowth = prevVehicles > 0 ? Math.round(((totalVehicles - prevVehicles) / prevVehicles) * 100) : null;
  const revenueGrowth = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : null;

  return { totalVehicles, totalRevenue, bestPackage, mostRevenuePackage, vehicleGrowth, revenueGrowth, busiestHour, busiestDay };
}

// ── Trend ─────────────────────────────────────────────────────────────────────

export function generateTrendData(data: ServiceOrderRow[], granularity: 'day' | 'week' | 'month' | 'year' = 'day'): TrendPoint[] {
  const points = new Map<string, { vehicles: number; revenue: number }>();

  data.forEach((r) => {
    const d = new Date(r.created_at);
    let key: string;
    switch (granularity) {
      case 'day':
        key = d.toISOString().split('T')[0];
        break;
      case 'week': {
        const weekStart = new Date(d);
        const day = weekStart.getDay();
        const diff = day === 0 ? 6 : day - 1;
        weekStart.setDate(d.getDate() - diff);
        key = weekStart.toISOString().split('T')[0];
        break;
      }
      case 'month':
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'year':
        key = String(d.getFullYear());
        break;
    }
    const current = points.get(key) || { vehicles: 0, revenue: 0 };
    current.vehicles += 1;
    current.revenue += r.package_price || 0;
    points.set(key, current);
  });

  return Array.from(points.entries())
    .map(([date, values]) => ({ date, ...values }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── Paket breakdown ───────────────────────────────────────────────────────────

export function generatePaketBreakdown(data: ServiceOrderRow[]): PaketBreakdown[] {
  const entries = new Map<string, { count: number; revenue: number }>();

  data.forEach((r) => {
    const label = r.package_name || '-';
    const current = entries.get(label) || { count: 0, revenue: 0 };
    current.count += 1;
    current.revenue += r.package_price || 0;
    entries.set(label, current);
  });

  const total = Array.from(entries.values()).reduce((sum, v) => sum + v.count, 0);

  return Array.from(entries.entries())
    .map(([paket, { count, revenue }]) => ({
      paket,
      count,
      revenue,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

// ── Calendar ──────────────────────────────────────────────────────────────────

export function generateCalendarData(data: ServiceOrderRow[], year: number, month: number): CalendarDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dailyMap = new Map<number, { vehicles: number; revenue: number }>();

  data.forEach((r) => {
    const d = new Date(r.created_at);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      const current = dailyMap.get(day) || { vehicles: 0, revenue: 0 };
      current.vehicles += 1;
      current.revenue += r.package_price || 0;
      dailyMap.set(day, current);
    }
  });

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const count = dailyMap.get(day)?.vehicles || 0;
    let level: CalendarDay['level'] = 'sepi';
    if (count >= 60) level = 'sangat-ramai';
    else if (count >= 41) level = 'ramai';
    else if (count >= 21) level = 'normal';

    return {
      day,
      date: new Date(year, month, day).toISOString(),
      vehicles: count,
      revenue: dailyMap.get(day)?.revenue || 0,
      level,
    };
  });
}

// ── Overtime analysis ─────────────────────────────────────────────────────────

function diffMinutes(from: string | null | undefined, to: string | null | undefined): number | null {
  if (!from || !to) return null;
  const diff = (new Date(to).getTime() - new Date(from).getTime()) / 60000;
  return diff > 0 ? diff : null;
}

export function generateOvertimeStats(data: ServiceOrderRow[]): OvertimeStats[] {
  const stations: Array<{
    station: string;
    label: string;
    getDuration: (r: ServiceOrderRow) => number | null;
    getSop: (r: ServiceOrderRow) => number;
    filter?: (r: ServiceOrderRow) => boolean;
  }> = [
    {
      station: 'basah',
      label: 'Basah',
      getDuration: (r) => diffMinutes(r.times['basah'], r.times['kering']),
      getSop: (r) => r.sop_basah_minutes,
    },
    {
      station: 'kering',
      label: 'Kering',
      getDuration: (r) => diffMinutes(r.times['kering'], r.times['qc']),
      getSop: (r) => r.sop_kering_minutes,
    },
    {
      station: 'qc',
      label: 'QC',
      getDuration: (r) => diffMinutes(r.times['qc'], r.times['selesai']),
      getSop: (r) => r.sop_qc_minutes,
    },
    {
      station: 'poles',
      label: 'Poles',
      getDuration: (r) => diffMinutes(r.times['poles'], r.times['selesai']),
      getSop: (r) => r.sop_poles_minutes,
      filter: (r) => r.workflow_type === 'premium',
    },
  ];

  return stations.map(({ station, label, getDuration, getSop, filter }) => {
    const relevant = filter ? data.filter(filter) : data;
    const durations: number[] = [];
    let overtimeCount = 0;
    let sopSum = 0;

    relevant.forEach((r) => {
      const dur = getDuration(r);
      const sop = getSop(r);
      if (dur !== null) {
        durations.push(dur);
        sopSum += sop;
        if (dur > sop) overtimeCount++;
      }
    });

    const totalOrders = durations.length;
    const avgDurationMinutes = totalOrders > 0
      ? Math.round(durations.reduce((s, d) => s + d, 0) / totalOrders)
      : 0;
    const avgSop = totalOrders > 0 ? Math.round(sopSum / totalOrders) : 0;

    return {
      station,
      label,
      avgDurationMinutes,
      sopMinutes: avgSop,
      overtimeCount,
      totalOrders,
      overtimePercent: totalOrders > 0 ? Math.round((overtimeCount / totalOrders) * 100) : 0,
    };
  });
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export const getLevelStyles = (level: CalendarDay['level']) => {
  switch (level) {
    case 'sepi':        return { bg: '#FFFFFF', text: '#888888' };
    case 'normal':      return { bg: '#E6F1FB', text: '#0C447C' };
    case 'ramai':       return { bg: '#EAF3DE', text: '#27500A' };
    case 'sangat-ramai':return { bg: '#FFEDD5', text: '#7C3000' };
  }
};

export const formatGrowth = (growth: number | null): string => {
  if (growth === null) return '—';
  const sign = growth >= 0 ? '+' : '';
  return `${sign}${growth}%`;
};
