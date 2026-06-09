/**
 * reportService.ts
 * Service layer untuk Report Dashboard.
 * Semua agregasi dilakukan di PostgreSQL — frontend hanya menerima data siap tampil.
 */

import { sql } from './neon';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FilterPreset =
  | 'hari_ini'
  | 'kemarin'
  | '7_hari'
  | '30_hari'
  | 'bulan_ini'
  | 'bulan_lalu'
  | 'tahun_ini'
  | 'custom';

export interface DateRange {
  start: string; // ISO string
  end: string;   // ISO string
}

export interface DashboardSummary {
  totalVehicles: number;
  totalRevenue: number;
  revenuePerVehicle: number;
  totalOvertimeMinutes: number;
  // Previous period for comparison
  prevTotalVehicles: number;
  prevTotalRevenue: number;
  prevRevenuePerVehicle: number;
  prevTotalOvertimeMinutes: number;
}

export interface RevenueTrendPoint {
  date: string;   // 'YYYY-MM-DD' for day/week/month grouping, 'YYYY-MM' for year, 'YYYY' for all
  revenue: number;
  vehicles: number;
}

export interface TrafficPoint {
  label: string;  // jam '07:00', hari 'Senin', bulan 'Jan'
  count: number;
  percentage: number;
  isPeak: boolean;
}

export interface TopPackage {
  packageName: string;
  count: number;
  percentage: number;
  color: string;
}

export interface TopRevenuePackage {
  packageName: string;
  revenue: number;
  percentage: number;
}

export interface StationOvertime {
  station: 'basah' | 'kering' | 'qc' | 'poles';
  label: string;
  sopMinutes: number;
  totalOvertimeMinutes: number;
  overtimeCount: number;
  totalOrders: number;
  overtimePercent: number;
  color: string;
  prevTotalOvertimeMinutes: number;
}

export interface RecentTransaction {
  id: string;
  queueNumber: number | null;
  plateNumber: string;
  vehicleName: string;
  packageName: string;
  variantName: string;
  packagePrice: number;
  jamMasuk: string | null;
  jamSelesai: string | null;
  durationMinutes: number | null;
  status: string;
}

// ── Date range helpers ────────────────────────────────────────────────────────

export function getDateRangeFromPreset(preset: FilterPreset, customStart?: string, customEnd?: string): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'hari_ini':
      return {
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString(),
        end:   new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString(),
      };
    case 'kemarin': {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      return {
        start: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0).toISOString(),
        end:   new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999).toISOString(),
      };
    }
    case '7_hari': {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);
      return {
        start: new Date(sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate(), 0, 0, 0, 0).toISOString(),
        end:   new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString(),
      };
    }
    case '30_hari': {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 29);
      return {
        start: new Date(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate(), 0, 0, 0, 0).toISOString(),
        end:   new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString(),
      };
    }
    case 'bulan_ini':
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0).toISOString(),
        end:   new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(),
      };
    case 'bulan_lalu': {
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth  = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        start: new Date(firstDayLastMonth.getFullYear(), firstDayLastMonth.getMonth(), 1, 0, 0, 0, 0).toISOString(),
        end:   new Date(lastDayLastMonth.getFullYear(), lastDayLastMonth.getMonth(), lastDayLastMonth.getDate(), 23, 59, 59, 999).toISOString(),
      };
    }
    case 'tahun_ini':
      return {
        start: new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0).toISOString(),
        end:   new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999).toISOString(),
      };
    case 'custom':
      return {
        start: customStart || new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0).toISOString(),
        end:   customEnd   || new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(),
      };
  }
}

export function getPreviousPeriod(range: DateRange): DateRange {
  const start = new Date(range.start);
  const end   = new Date(range.end);
  const durationMs = end.getTime() - start.getTime();
  const prevEnd   = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  return { start: prevStart.toISOString(), end: prevEnd.toISOString() };
}

export function getFilterLabel(preset: FilterPreset): string {
  switch (preset) {
    case 'hari_ini':   return 'Hari Ini';
    case 'kemarin':    return 'Kemarin';
    case '7_hari':     return '7 Hari Terakhir';
    case '30_hari':    return '30 Hari Terakhir';
    case 'bulan_ini':  return 'Bulan Ini';
    case 'bulan_lalu': return 'Bulan Lalu';
    case 'tahun_ini':  return 'Tahun Ini';
    case 'custom':     return 'Custom Range';
  }
}

// Determine the granularity for trend chart based on date range span
export function getTrendGranularity(range: DateRange): 'hour' | 'day' | 'month' {
  const start = new Date(range.start);
  const end   = new Date(range.end);
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 2)   return 'hour';
  if (diffDays <= 90)  return 'day';
  return 'month';
}

// Determine traffic grouping: hour for day-level, day for week/month, month for year
export function getTrafficGrouping(range: DateRange): 'hour' | 'day' | 'month' {
  const start = new Date(range.start);
  const end   = new Date(range.end);
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 2)   return 'hour';
  if (diffDays <= 90)  return 'day';
  return 'month';
}

// ── getDashboardSummary ───────────────────────────────────────────────────────

export async function getDashboardSummary(range: DateRange, prevRange: DateRange): Promise<DashboardSummary> {
  const [currResult, prevResult, currOtResult, prevOtResult] = await Promise.all([
    // Current period KPIs
    sql`
      SELECT
        COUNT(*) FILTER (WHERE current_status != 'cancel') AS total_vehicles,
        COALESCE(SUM(package_price) FILTER (WHERE current_status IN ('selesai', 'diambil')), 0) AS total_revenue
      FROM service_orders
      WHERE created_at >= ${range.start}::timestamptz
        AND created_at <= ${range.end}::timestamptz
    `,
    // Previous period KPIs
    sql`
      SELECT
        COUNT(*) FILTER (WHERE current_status != 'cancel') AS total_vehicles,
        COALESCE(SUM(package_price) FILTER (WHERE current_status IN ('selesai', 'diambil')), 0) AS total_revenue
      FROM service_orders
      WHERE created_at >= ${prevRange.start}::timestamptz
        AND created_at <= ${prevRange.end}::timestamptz
    `,
    // Current overtime (compute at DB level using times JSONB)
    sql`
      SELECT
        COALESCE(SUM(
          GREATEST(0,
            EXTRACT(EPOCH FROM (
              (times->>'kering')::timestamptz - (times->>'basah')::timestamptz
            )) / 60 - COALESCE(pv.sop_basah_minutes, 15)
          )
        ) FILTER (WHERE times->>'basah' IS NOT NULL AND times->>'kering' IS NOT NULL), 0) +
        COALESCE(SUM(
          GREATEST(0,
            EXTRACT(EPOCH FROM (
              (times->>'qc')::timestamptz - (times->>'kering')::timestamptz
            )) / 60 - COALESCE(pv.sop_kering_minutes, 15)
          )
        ) FILTER (WHERE times->>'kering' IS NOT NULL AND times->>'qc' IS NOT NULL), 0) +
        COALESCE(SUM(
          GREATEST(0,
            EXTRACT(EPOCH FROM (
              (times->>'selesai')::timestamptz - (times->>'qc')::timestamptz
            )) / 60 - COALESCE(pv.sop_qc_minutes, 10)
          )
        ) FILTER (WHERE times->>'qc' IS NOT NULL AND times->>'selesai' IS NOT NULL), 0) +
        COALESCE(SUM(
          GREATEST(0,
            EXTRACT(EPOCH FROM (
              (times->>'selesai')::timestamptz - (times->>'poles')::timestamptz
            )) / 60 - COALESCE(pv.sop_poles_minutes, 30)
          )
        ) FILTER (WHERE times->>'poles' IS NOT NULL AND times->>'selesai' IS NOT NULL AND p.workflow_type = 'premium'), 0)
        AS total_overtime_minutes
      FROM service_orders so
      LEFT JOIN package_variants pv ON pv.id = so.package_variant_id
      LEFT JOIN packages p ON p.id = so.package_id
      WHERE so.created_at >= ${range.start}::timestamptz
        AND so.created_at <= ${range.end}::timestamptz
        AND so.current_status != 'cancel'
    `,
    // Previous overtime
    sql`
      SELECT
        COALESCE(SUM(
          GREATEST(0,
            EXTRACT(EPOCH FROM (
              (times->>'kering')::timestamptz - (times->>'basah')::timestamptz
            )) / 60 - COALESCE(pv.sop_basah_minutes, 15)
          )
        ) FILTER (WHERE times->>'basah' IS NOT NULL AND times->>'kering' IS NOT NULL), 0) +
        COALESCE(SUM(
          GREATEST(0,
            EXTRACT(EPOCH FROM (
              (times->>'qc')::timestamptz - (times->>'kering')::timestamptz
            )) / 60 - COALESCE(pv.sop_kering_minutes, 15)
          )
        ) FILTER (WHERE times->>'kering' IS NOT NULL AND times->>'qc' IS NOT NULL), 0) +
        COALESCE(SUM(
          GREATEST(0,
            EXTRACT(EPOCH FROM (
              (times->>'selesai')::timestamptz - (times->>'qc')::timestamptz
            )) / 60 - COALESCE(pv.sop_qc_minutes, 10)
          )
        ) FILTER (WHERE times->>'qc' IS NOT NULL AND times->>'selesai' IS NOT NULL), 0) +
        COALESCE(SUM(
          GREATEST(0,
            EXTRACT(EPOCH FROM (
              (times->>'selesai')::timestamptz - (times->>'poles')::timestamptz
            )) / 60 - COALESCE(pv.sop_poles_minutes, 30)
          )
        ) FILTER (WHERE times->>'poles' IS NOT NULL AND times->>'selesai' IS NOT NULL AND p.workflow_type = 'premium'), 0)
        AS total_overtime_minutes
      FROM service_orders so
      LEFT JOIN package_variants pv ON pv.id = so.package_variant_id
      LEFT JOIN packages p ON p.id = so.package_id
      WHERE so.created_at >= ${prevRange.start}::timestamptz
        AND so.created_at <= ${prevRange.end}::timestamptz
        AND so.current_status != 'cancel'
    `,
  ]);

  const curr = (currResult as Record<string, unknown>[])[0] ?? {};
  const prev = (prevResult as Record<string, unknown>[])[0] ?? {};
  const currOt = (currOtResult as Record<string, unknown>[])[0] ?? {};
  const prevOt = (prevOtResult as Record<string, unknown>[])[0] ?? {};

  const totalVehicles     = Number(curr.total_vehicles ?? 0);
  const totalRevenue      = Number(curr.total_revenue ?? 0);
  const prevTotalVehicles = Number(prev.total_vehicles ?? 0);
  const prevTotalRevenue  = Number(prev.total_revenue ?? 0);

  return {
    totalVehicles,
    totalRevenue,
    revenuePerVehicle:     totalVehicles > 0 ? Math.round(totalRevenue / totalVehicles) : 0,
    totalOvertimeMinutes:  Math.round(Number(currOt.total_overtime_minutes ?? 0)),
    prevTotalVehicles,
    prevTotalRevenue,
    prevRevenuePerVehicle: prevTotalVehicles > 0 ? Math.round(prevTotalRevenue / prevTotalVehicles) : 0,
    prevTotalOvertimeMinutes: Math.round(Number(prevOt.total_overtime_minutes ?? 0)),
  };
}

// ── getRevenueTrend ───────────────────────────────────────────────────────────

export async function getRevenueTrend(range: DateRange, granularity: 'hour' | 'day' | 'month'): Promise<RevenueTrendPoint[]> {
  let result;

  if (granularity === 'hour') {
    result = await sql`
      SELECT
        TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'HH24:00') AS date,
        COUNT(*) FILTER (WHERE current_status != 'cancel') AS vehicles,
        COALESCE(SUM(package_price) FILTER (WHERE current_status IN ('selesai', 'diambil')), 0) AS revenue
      FROM service_orders
      WHERE created_at >= ${range.start}::timestamptz
        AND created_at <= ${range.end}::timestamptz
      GROUP BY TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'HH24:00')
      ORDER BY date ASC
    `;
  } else if (granularity === 'day') {
    result = await sql`
      SELECT
        TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS date,
        COUNT(*) FILTER (WHERE current_status != 'cancel') AS vehicles,
        COALESCE(SUM(package_price) FILTER (WHERE current_status IN ('selesai', 'diambil')), 0) AS revenue
      FROM service_orders
      WHERE created_at >= ${range.start}::timestamptz
        AND created_at <= ${range.end}::timestamptz
      GROUP BY TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD')
      ORDER BY date ASC
    `;
  } else {
    result = await sql`
      SELECT
        TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM') AS date,
        COUNT(*) FILTER (WHERE current_status != 'cancel') AS vehicles,
        COALESCE(SUM(package_price) FILTER (WHERE current_status IN ('selesai', 'diambil')), 0) AS revenue
      FROM service_orders
      WHERE created_at >= ${range.start}::timestamptz
        AND created_at <= ${range.end}::timestamptz
      GROUP BY TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM')
      ORDER BY date ASC
    `;
  }

  return (result as Record<string, unknown>[]).map((r) => ({
    date:     String(r.date ?? ''),
    revenue:  Number(r.revenue ?? 0),
    vehicles: Number(r.vehicles ?? 0),
  }));
}

// ── getTrafficAnalysis ────────────────────────────────────────────────────────

const DAY_LABELS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_LABELS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export async function getTrafficAnalysis(range: DateRange, grouping: 'hour' | 'day' | 'month'): Promise<TrafficPoint[]> {
  let result;

  if (grouping === 'hour') {
    // Group by hour from times.menunggu (entry time)
    result = await sql`
      SELECT
        EXTRACT(HOUR FROM (times->>'menunggu')::timestamptz AT TIME ZONE 'Asia/Jakarta')::int AS grp,
        COUNT(*) AS count
      FROM service_orders
      WHERE created_at >= ${range.start}::timestamptz
        AND created_at <= ${range.end}::timestamptz
        AND current_status != 'cancel'
        AND times->>'menunggu' IS NOT NULL
      GROUP BY grp
      ORDER BY grp ASC
    `;

    const rows = (result as Record<string, unknown>[]);
    const total = rows.reduce((s, r) => s + Number(r.count ?? 0), 0);
    const maxCount = Math.max(...rows.map((r) => Number(r.count ?? 0)), 1);

    return rows.map((r) => {
      const grp   = Number(r.grp ?? 0);
      const count = Number(r.count ?? 0);
      return {
        label:      `${String(grp).padStart(2, '0')}:00`,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        isPeak:     count === maxCount,
      };
    });
  }

  if (grouping === 'day') {
    // Group by day of week from times.menunggu
    result = await sql`
      SELECT
        EXTRACT(DOW FROM (times->>'menunggu')::timestamptz AT TIME ZONE 'Asia/Jakarta')::int AS grp,
        COUNT(*) AS count
      FROM service_orders
      WHERE created_at >= ${range.start}::timestamptz
        AND created_at <= ${range.end}::timestamptz
        AND current_status != 'cancel'
        AND times->>'menunggu' IS NOT NULL
      GROUP BY grp
      ORDER BY grp ASC
    `;

    const rows = (result as Record<string, unknown>[]);
    const total = rows.reduce((s, r) => s + Number(r.count ?? 0), 0);
    const maxCount = Math.max(...rows.map((r) => Number(r.count ?? 0)), 1);

    return rows.map((r) => {
      const grp   = Number(r.grp ?? 0);
      const count = Number(r.count ?? 0);
      return {
        label:      DAY_LABELS_ID[grp] ?? String(grp),
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        isPeak:     count === maxCount,
      };
    });
  }

  // grouping === 'month'
  result = await sql`
    SELECT
      EXTRACT(MONTH FROM created_at AT TIME ZONE 'Asia/Jakarta')::int AS grp,
      COUNT(*) FILTER (WHERE current_status != 'cancel') AS count
    FROM service_orders
    WHERE created_at >= ${range.start}::timestamptz
      AND created_at <= ${range.end}::timestamptz
    GROUP BY grp
    ORDER BY grp ASC
  `;

  const rows = (result as Record<string, unknown>[]);
  const total = rows.reduce((s, r) => s + Number(r.count ?? 0), 0);
  const maxCount = Math.max(...rows.map((r) => Number(r.count ?? 0)), 1);

  return rows.map((r) => {
    const grp   = Number(r.grp ?? 1);
    const count = Number(r.count ?? 0);
    return {
      label:      MONTH_LABELS_ID[grp - 1] ?? String(grp),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      isPeak:     count === maxCount,
    };
  });
}

// ── getTopPackages ────────────────────────────────────────────────────────────

const DONUT_COLORS = ['#185FA5', '#8B44E0', '#1D9E75', '#E06520', '#888888'];

export async function getTopPackages(range: DateRange): Promise<TopPackage[]> {
  const result = await sql`
    SELECT
      package_name,
      COUNT(*) AS count
    FROM service_orders
    WHERE created_at >= ${range.start}::timestamptz
      AND created_at <= ${range.end}::timestamptz
      AND current_status != 'cancel'
    GROUP BY package_name
    ORDER BY count DESC
    LIMIT 5
  `;

  const rows = (result as Record<string, unknown>[]);
  const total = rows.reduce((s, r) => s + Number(r.count ?? 0), 0);

  const top5 = rows.map((r, i) => {
    const count = Number(r.count ?? 0);
    return {
      packageName: String(r.package_name ?? '-'),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color: DONUT_COLORS[i] ?? '#888888',
    };
  });

  return top5;
}

// ── getTopRevenuePackages ─────────────────────────────────────────────────────

export async function getTopRevenuePackages(range: DateRange): Promise<TopRevenuePackage[]> {
  const result = await sql`
    SELECT
      package_name,
      COALESCE(SUM(package_price), 0) AS revenue
    FROM service_orders
    WHERE created_at >= ${range.start}::timestamptz
      AND created_at <= ${range.end}::timestamptz
      AND current_status IN ('selesai', 'diambil')
    GROUP BY package_name
    ORDER BY revenue DESC
    LIMIT 5
  `;

  const rows = (result as Record<string, unknown>[]);
  const total = rows.reduce((s, r) => s + Number(r.revenue ?? 0), 0);

  return rows.map((r) => {
    const revenue = Number(r.revenue ?? 0);
    return {
      packageName: String(r.package_name ?? '-'),
      revenue,
      percentage: total > 0 ? Math.round((revenue / total) * 100) : 0,
    };
  });
}

// ── getOvertimeAnalysis ───────────────────────────────────────────────────────

const STATION_COLORS: Record<string, string> = {
  basah:  '#378ADD',
  kering: '#639922',
  qc:     '#8B44E0',
  poles:  '#E06520',
};

export async function getOvertimeAnalysis(range: DateRange, prevRange: DateRange): Promise<StationOvertime[]> {
  const [currResult, prevResult] = await Promise.all([
    sql`
      SELECT
        'basah'::text AS station,
        COUNT(*) FILTER (WHERE times->>'basah' IS NOT NULL AND times->>'kering' IS NOT NULL) AS total_orders,
        COALESCE(SUM(
          GREATEST(0,
            EXTRACT(EPOCH FROM (
              (times->>'kering')::timestamptz - (times->>'basah')::timestamptz
            )) / 60 - COALESCE(pv.sop_basah_minutes, 15)
          )
        ) FILTER (WHERE times->>'basah' IS NOT NULL AND times->>'kering' IS NOT NULL), 0) AS total_overtime_minutes,
        COUNT(*) FILTER (WHERE times->>'basah' IS NOT NULL AND times->>'kering' IS NOT NULL AND
          EXTRACT(EPOCH FROM (
            (times->>'kering')::timestamptz - (times->>'basah')::timestamptz
          )) / 60 > COALESCE(pv.sop_basah_minutes, 15)
        ) AS overtime_count,
        AVG(COALESCE(pv.sop_basah_minutes, 15)) AS avg_sop
      FROM service_orders so
      LEFT JOIN package_variants pv ON pv.id = so.package_variant_id
      WHERE so.created_at >= ${range.start}::timestamptz
        AND so.created_at <= ${range.end}::timestamptz
        AND so.current_status != 'cancel'

      UNION ALL

      SELECT
        'kering'::text AS station,
        COUNT(*) FILTER (WHERE times->>'kering' IS NOT NULL AND times->>'qc' IS NOT NULL) AS total_orders,
        COALESCE(SUM(
          GREATEST(0,
            EXTRACT(EPOCH FROM (
              (times->>'qc')::timestamptz - (times->>'kering')::timestamptz
            )) / 60 - COALESCE(pv.sop_kering_minutes, 15)
          )
        ) FILTER (WHERE times->>'kering' IS NOT NULL AND times->>'qc' IS NOT NULL), 0) AS total_overtime_minutes,
        COUNT(*) FILTER (WHERE times->>'kering' IS NOT NULL AND times->>'qc' IS NOT NULL AND
          EXTRACT(EPOCH FROM (
            (times->>'qc')::timestamptz - (times->>'kering')::timestamptz
          )) / 60 > COALESCE(pv.sop_kering_minutes, 15)
        ) AS overtime_count,
        AVG(COALESCE(pv.sop_kering_minutes, 15)) AS avg_sop
      FROM service_orders so
      LEFT JOIN package_variants pv ON pv.id = so.package_variant_id
      WHERE so.created_at >= ${range.start}::timestamptz
        AND so.created_at <= ${range.end}::timestamptz
        AND so.current_status != 'cancel'

      UNION ALL

      SELECT
        'qc'::text AS station,
        COUNT(*) FILTER (WHERE times->>'qc' IS NOT NULL AND times->>'selesai' IS NOT NULL) AS total_orders,
        COALESCE(SUM(
          GREATEST(0,
            EXTRACT(EPOCH FROM (
              (times->>'selesai')::timestamptz - (times->>'qc')::timestamptz
            )) / 60 - COALESCE(pv.sop_qc_minutes, 10)
          )
        ) FILTER (WHERE times->>'qc' IS NOT NULL AND times->>'selesai' IS NOT NULL), 0) AS total_overtime_minutes,
        COUNT(*) FILTER (WHERE times->>'qc' IS NOT NULL AND times->>'selesai' IS NOT NULL AND
          EXTRACT(EPOCH FROM (
            (times->>'selesai')::timestamptz - (times->>'qc')::timestamptz
          )) / 60 > COALESCE(pv.sop_qc_minutes, 10)
        ) AS overtime_count,
        AVG(COALESCE(pv.sop_qc_minutes, 10)) AS avg_sop
      FROM service_orders so
      LEFT JOIN package_variants pv ON pv.id = so.package_variant_id
      WHERE so.created_at >= ${range.start}::timestamptz
        AND so.created_at <= ${range.end}::timestamptz
        AND so.current_status != 'cancel'

      UNION ALL

      SELECT
        'poles'::text AS station,
        COUNT(*) FILTER (WHERE times->>'poles' IS NOT NULL AND times->>'selesai' IS NOT NULL AND p.workflow_type = 'premium') AS total_orders,
        COALESCE(SUM(
          GREATEST(0,
            EXTRACT(EPOCH FROM (
              (times->>'selesai')::timestamptz - (times->>'poles')::timestamptz
            )) / 60 - COALESCE(pv.sop_poles_minutes, 30)
          )
        ) FILTER (WHERE times->>'poles' IS NOT NULL AND times->>'selesai' IS NOT NULL AND p.workflow_type = 'premium'), 0) AS total_overtime_minutes,
        COUNT(*) FILTER (WHERE times->>'poles' IS NOT NULL AND times->>'selesai' IS NOT NULL AND p.workflow_type = 'premium' AND
          EXTRACT(EPOCH FROM (
            (times->>'selesai')::timestamptz - (times->>'poles')::timestamptz
          )) / 60 > COALESCE(pv.sop_poles_minutes, 30)
        ) AS overtime_count,
        AVG(COALESCE(pv.sop_poles_minutes, 30)) AS avg_sop
      FROM service_orders so
      LEFT JOIN package_variants pv ON pv.id = so.package_variant_id
      LEFT JOIN packages p ON p.id = so.package_id
      WHERE so.created_at >= ${range.start}::timestamptz
        AND so.created_at <= ${range.end}::timestamptz
        AND so.current_status != 'cancel'
    `,
    // Previous period total overtime per station for comparison
    sql`
      SELECT
        'basah'::text AS station,
        COALESCE(SUM(
          GREATEST(0,
            EXTRACT(EPOCH FROM ((times->>'kering')::timestamptz - (times->>'basah')::timestamptz)) / 60
            - COALESCE(pv.sop_basah_minutes, 15)
          )
        ) FILTER (WHERE times->>'basah' IS NOT NULL AND times->>'kering' IS NOT NULL), 0) AS prev_overtime
      FROM service_orders so LEFT JOIN package_variants pv ON pv.id = so.package_variant_id
      WHERE so.created_at >= ${prevRange.start}::timestamptz AND so.created_at <= ${prevRange.end}::timestamptz AND so.current_status != 'cancel'
      UNION ALL
      SELECT 'kering', COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM ((times->>'qc')::timestamptz - (times->>'kering')::timestamptz)) / 60 - COALESCE(pv.sop_kering_minutes, 15))) FILTER (WHERE times->>'kering' IS NOT NULL AND times->>'qc' IS NOT NULL), 0)
      FROM service_orders so LEFT JOIN package_variants pv ON pv.id = so.package_variant_id
      WHERE so.created_at >= ${prevRange.start}::timestamptz AND so.created_at <= ${prevRange.end}::timestamptz AND so.current_status != 'cancel'
      UNION ALL
      SELECT 'qc', COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM ((times->>'selesai')::timestamptz - (times->>'qc')::timestamptz)) / 60 - COALESCE(pv.sop_qc_minutes, 10))) FILTER (WHERE times->>'qc' IS NOT NULL AND times->>'selesai' IS NOT NULL), 0)
      FROM service_orders so LEFT JOIN package_variants pv ON pv.id = so.package_variant_id
      WHERE so.created_at >= ${prevRange.start}::timestamptz AND so.created_at <= ${prevRange.end}::timestamptz AND so.current_status != 'cancel'
      UNION ALL
      SELECT 'poles', COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM ((times->>'selesai')::timestamptz - (times->>'poles')::timestamptz)) / 60 - COALESCE(pv.sop_poles_minutes, 30))) FILTER (WHERE times->>'poles' IS NOT NULL AND times->>'selesai' IS NOT NULL AND p.workflow_type = 'premium'), 0)
      FROM service_orders so LEFT JOIN package_variants pv ON pv.id = so.package_variant_id LEFT JOIN packages p ON p.id = so.package_id
      WHERE so.created_at >= ${prevRange.start}::timestamptz AND so.created_at <= ${prevRange.end}::timestamptz AND so.current_status != 'cancel'
    `,
  ]);

  const stationLabels: Record<string, string> = {
    basah: 'Basah', kering: 'Kering', qc: 'QC', poles: 'Poles',
  };
  const stationSop: Record<string, number> = {
    basah: 20, kering: 15, qc: 10, poles: 30,
  };

  const prevMap = new Map<string, number>();
  (prevResult as Record<string, unknown>[]).forEach((r) => {
    prevMap.set(String(r.station ?? ''), Math.round(Number(r.prev_overtime ?? 0)));
  });

  const rows = (currResult as Record<string, unknown>[]).map((r) => {
    const station = String(r.station ?? '') as StationOvertime['station'];
    const totalOrders       = Number(r.total_orders ?? 0);
    const totalOtMinutes    = Math.round(Number(r.total_overtime_minutes ?? 0));
    const overtimeCount     = Number(r.overtime_count ?? 0);

    return {
      station,
      label:    stationLabels[station] ?? station,
      sopMinutes: stationSop[station] ?? Number(r.avg_sop ?? 15),
      totalOvertimeMinutes: totalOtMinutes,
      overtimeCount,
      totalOrders,
      overtimePercent: totalOrders > 0 ? Math.round((overtimeCount / totalOrders) * 100) : 0,
      color: STATION_COLORS[station] ?? '#888',
      prevTotalOvertimeMinutes: prevMap.get(station) ?? 0,
    };
  });

  // Sort by overtime minutes descending, poles only if exists with data
  return rows.sort((a, b) => b.totalOvertimeMinutes - a.totalOvertimeMinutes);
}

// ── getRecentTransactions ─────────────────────────────────────────────────────

export async function getRecentTransactions(range: DateRange, page = 1, pageSize = 20): Promise<{
  rows: RecentTransaction[];
  total: number;
}> {
  const offset = (page - 1) * pageSize;

  const [rowsResult, countResult] = await Promise.all([
    sql`
      SELECT
        so.id,
        so.queue_number,
        vh.plate_number,
        vh.vehicle_name,
        so.package_name,
        so.variant_name,
        so.package_price,
        so.times->>'menunggu' AS jam_masuk,
        so.times->>'selesai' AS jam_selesai,
        so.current_status
      FROM service_orders so
      JOIN vehicle_history vh ON vh.id = so.vehicle_id
      WHERE so.created_at >= ${range.start}::timestamptz
        AND so.created_at <= ${range.end}::timestamptz
        AND so.current_status != 'cancel'
      ORDER BY so.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `,
    sql`
      SELECT COUNT(*) AS total
      FROM service_orders
      WHERE created_at >= ${range.start}::timestamptz
        AND created_at <= ${range.end}::timestamptz
        AND current_status != 'cancel'
    `,
  ]);

  const rows = (rowsResult as Record<string, unknown>[]).map((r) => {
    const jamMasuk  = r.jam_masuk  ? String(r.jam_masuk)  : null;
    const jamSelesai = r.jam_selesai ? String(r.jam_selesai) : null;
    let durationMinutes: number | null = null;
    if (jamMasuk && jamSelesai) {
      durationMinutes = Math.round(
        (new Date(jamSelesai).getTime() - new Date(jamMasuk).getTime()) / 60000
      );
      if (durationMinutes < 0) durationMinutes = null;
    }

    return {
      id:           String(r.id ?? ''),
      queueNumber:  r.queue_number != null ? Number(r.queue_number) : null,
      plateNumber:  String(r.plate_number ?? ''),
      vehicleName:  String(r.vehicle_name ?? ''),
      packageName:  String(r.package_name ?? ''),
      variantName:  String(r.variant_name ?? ''),
      packagePrice: Number(r.package_price ?? 0),
      jamMasuk,
      jamSelesai,
      durationMinutes,
      status:       String(r.current_status ?? ''),
    };
  });

  const total = Number((countResult as Record<string, unknown>[])[0]?.total ?? 0);

  return { rows, total };
}

// ── Utility formatters ────────────────────────────────────────────────────────

export function formatMinutesToHM(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}j`;
  return `${h}j ${m}m`;
}

export function calcGrowthPercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function formatRp(value: number): string {
  if (value >= 1_000_000_000) return `Rp${(value / 1_000_000_000).toFixed(1)}M`;
  if (value >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1)}jt`;
  return 'Rp' + value.toLocaleString('id-ID');
}

export function formatRpFull(value: number): string {
  return 'Rp' + value.toLocaleString('id-ID');
}
