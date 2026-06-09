/**
 * activeQueueService.ts
 * Service layer untuk Owner Active Queue Dashboard.
 * Real-time monitoring: KPI, operational flow, bottleneck, oldest vehicles, kanban summary.
 */

import { sql } from './neon';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActiveQueueSummary {
  kendaraanMasukHariIni: number;
  sedangDalamProses: number;
  selesaiHariIni: number;
  rataRataDurasiMenit: number;
  overtimeKendaraan: number;
}

export type StageStatus = 'normal' | 'hampir_ot' | 'overtime';

export interface VehicleInStage {
  id: string;
  plateNumber: string;
  vehicleName: string;
  packageName: string;
  currentStatus: string;
  durasiMasukMenit: number;       // elapsed since entered current stage
  totalDurasiMenit: number;       // elapsed since masuk (times.menunggu)
  stageStatus: StageStatus;       // normal / hampir_ot / overtime
  sopMenit: number;               // SOP for current station
  workflowType: string;
}

export interface StageFlow {
  stage: string;
  label: string;
  icon: string;
  total: number;
  normal: number;
  hampirOT: number;
  overtime: number;
  vehicles: VehicleInStage[];
}

export interface BottleneckInfo {
  station: string;
  label: string;
  totalKendaraan: number;
  overtimeCount: number;
  overtimePercent: number;
  capacityIdeal: string;
}

export interface OldestVehicle {
  rank: number;
  id: string;
  plateNumber: string;
  vehicleName: string;
  packageName: string;
  currentStatus: string;
  stageLabel: string;
  totalDurasiMenit: number;
  isOvertime: boolean;
}

export interface QueueStageVehicle {
  id: string;
  plateNumber: string;
  vehicleName: string;
  packageName: string;
  currentStatus: string;
  durasiMasukMenit: number;
  totalDurasiMenit: number;
  stageStatus: StageStatus;
  sopMenit: number;
}

export interface QueueStageSummary {
  stage: string;
  label: string;
  vehicles: QueueStageVehicle[];
  total: number;
}

export interface TingkatPenyelesaian {
  selesai: number;
  masuk: number;
  percent: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatDurasi(menit: number): string {
  if (menit <= 0) return '0m';
  const h = Math.floor(menit / 60);
  const m = Math.round(menit % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}j`;
  return `${h}j ${m}m`;
}

const STAGE_LABELS: Record<string, string> = {
  menunggu: 'Menunggu',
  basah: 'Basah',
  kering: 'Kering',
  qc: 'QC',
  antri_poles: 'Antri Poles',
  poles: 'Poles',
  selesai: 'Selesai',
  diambil: 'Diambil',
};

export function getStageLabelDisplay(status: string): string {
  return STAGE_LABELS[status] ?? status;
}

const IDEAL_CAPACITY: Record<string, string> = {
  basah: '4–5 kendaraan',
  kering: '4–5 kendaraan',
  qc: '2–3 kendaraan',
  poles: '2–3 kendaraan',
};

// ── getActiveQueueSummary ─────────────────────────────────────────────────────

export async function getActiveQueueSummary(): Promise<ActiveQueueSummary> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

  const [masukResult, prosesResult, selesaiResult, durasiResult, overtimeResult] = await Promise.all([
    // Kendaraan masuk hari ini
    sql`
      SELECT COUNT(*) AS total
      FROM service_orders
      WHERE created_at >= ${todayStart}::timestamptz
        AND created_at <= ${todayEnd}::timestamptz
        AND current_status NOT IN ('cancel')
    `,
    // Sedang dalam proses (belum selesai/diambil/cancel)
    sql`
      SELECT COUNT(*) AS total
      FROM service_orders
      WHERE created_at >= ${todayStart}::timestamptz
        AND current_status IN ('menunggu','basah','kering','qc','antri_poles','poles')
    `,
    // Selesai hari ini (times.selesai hari ini)
    sql`
      SELECT COUNT(*) AS total
      FROM service_orders
      WHERE current_status IN ('selesai', 'diambil')
        AND (times->>'selesai')::timestamptz >= ${todayStart}::timestamptz
        AND (times->>'selesai')::timestamptz <= ${todayEnd}::timestamptz
    `,
    // Rata-rata durasi kendaraan yang selesai hari ini (masuk → selesai)
    sql`
      SELECT
        AVG(
          EXTRACT(EPOCH FROM (
            (times->>'selesai')::timestamptz - (times->>'menunggu')::timestamptz
          )) / 60
        ) AS avg_durasi
      FROM service_orders
      WHERE current_status IN ('selesai', 'diambil')
        AND (times->>'selesai')::timestamptz >= ${todayStart}::timestamptz
        AND (times->>'selesai')::timestamptz <= ${todayEnd}::timestamptz
        AND times->>'menunggu' IS NOT NULL
        AND times->>'selesai' IS NOT NULL
    `,
    // Kendaraan overtime: sedang dalam proses dan minimal 1 station overtime
    sql`
      SELECT COUNT(DISTINCT so.id) AS total
      FROM service_orders so
      LEFT JOIN package_variants pv ON pv.id = so.package_variant_id
      WHERE so.current_status IN ('basah','kering','qc','poles')
        AND so.created_at >= ${todayStart}::timestamptz
        AND (
          -- basah overtime: sudah masuk basah tapi belum keluar, elapsed > sop
          (so.current_status = 'basah'
            AND so.times->>'basah' IS NOT NULL
            AND EXTRACT(EPOCH FROM (NOW() - (so.times->>'basah')::timestamptz)) / 60 > COALESCE(pv.sop_basah_minutes, 15)
          )
          OR
          -- kering overtime
          (so.current_status = 'kering'
            AND so.times->>'kering' IS NOT NULL
            AND EXTRACT(EPOCH FROM (NOW() - (so.times->>'kering')::timestamptz)) / 60 > COALESCE(pv.sop_kering_minutes, 15)
          )
          OR
          -- qc overtime
          (so.current_status = 'qc'
            AND so.times->>'qc' IS NOT NULL
            AND EXTRACT(EPOCH FROM (NOW() - (so.times->>'qc')::timestamptz)) / 60 > COALESCE(pv.sop_qc_minutes, 10)
          )
          OR
          -- poles overtime
          (so.current_status = 'poles'
            AND so.times->>'poles' IS NOT NULL
            AND EXTRACT(EPOCH FROM (NOW() - (so.times->>'poles')::timestamptz)) / 60 > COALESCE(pv.sop_poles_minutes, 30)
          )
        )
    `,
  ]);

  return {
    kendaraanMasukHariIni: Number((masukResult as Record<string, unknown>[])[0]?.total ?? 0),
    sedangDalamProses:     Number((prosesResult as Record<string, unknown>[])[0]?.total ?? 0),
    selesaiHariIni:        Number((selesaiResult as Record<string, unknown>[])[0]?.total ?? 0),
    rataRataDurasiMenit:   Math.round(Number((durasiResult as Record<string, unknown>[])[0]?.avg_durasi ?? 0)),
    overtimeKendaraan:     Number((overtimeResult as Record<string, unknown>[])[0]?.total ?? 0),
  };
}

// ── getOperationalFlow ────────────────────────────────────────────────────────

export async function getOperationalFlow(): Promise<StageFlow[]> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();

  const result = await sql`
    SELECT
      so.id,
      so.current_status,
      so.package_name,
      vh.plate_number,
      vh.vehicle_name,
      so.times,
      p.workflow_type,
      COALESCE(pv.sop_basah_minutes, 15)  AS sop_basah,
      COALESCE(pv.sop_kering_minutes, 15) AS sop_kering,
      COALESCE(pv.sop_qc_minutes, 10)     AS sop_qc,
      COALESCE(pv.sop_poles_minutes, 30)  AS sop_poles
    FROM service_orders so
    JOIN vehicle_history vh ON vh.id = so.vehicle_id
    LEFT JOIN package_variants pv ON pv.id = so.package_variant_id
    LEFT JOIN packages p ON p.id = so.package_id
    WHERE so.current_status IN ('menunggu','basah','kering','qc','antri_poles','poles','selesai')
      AND so.created_at >= ${todayStart}::timestamptz
    ORDER BY so.created_at ASC
  `;

  const STAGES_CONFIG = [
    { stage: 'menunggu',    label: 'Menunggu',    icon: 'clock',   timeKey: 'menunggu',    nextKey: 'basah',    sopKey: null },
    { stage: 'basah',       label: 'Basah',       icon: 'droplet', timeKey: 'basah',       nextKey: 'kering',   sopKey: 'basah' },
    { stage: 'kering',      label: 'Kering',      icon: 'wind',    timeKey: 'kering',      nextKey: 'qc',       sopKey: 'kering' },
    { stage: 'qc',          label: 'QC',          icon: 'search',  timeKey: 'qc',          nextKey: 'selesai',  sopKey: 'qc' },
    { stage: 'selesai',     label: 'Selesai',     icon: 'check',   timeKey: 'selesai',     nextKey: null,       sopKey: null },
  ];

  const rows = result as Record<string, unknown>[];
  const nowMs = Date.now();

  // Group vehicles by current stage
  const stageMap = new Map<string, VehicleInStage[]>();
  STAGES_CONFIG.forEach((s) => stageMap.set(s.stage, []));
  // Also handle antri_poles and poles — lump into their own display
  stageMap.set('antri_poles', []);
  stageMap.set('poles', []);

  for (const row of rows) {
    const status = String(row.current_status ?? '');
    const times = (row.times ?? {}) as Record<string, string | null>;
    const sopBasah  = Number(row.sop_basah ?? 15);
    const sopKering = Number(row.sop_kering ?? 15);
    const sopQc     = Number(row.sop_qc ?? 10);
    const sopPoles  = Number(row.sop_poles ?? 30);

    // Determine stage entry time and SOP
    let stageEntryKey = '';
    let sopMenit = 0;
    switch (status) {
      case 'menunggu':    stageEntryKey = 'menunggu';    sopMenit = 30; break;
      case 'basah':       stageEntryKey = 'basah';       sopMenit = sopBasah; break;
      case 'kering':      stageEntryKey = 'kering';      sopMenit = sopKering; break;
      case 'qc':          stageEntryKey = 'qc';          sopMenit = sopQc; break;
      case 'antri_poles': stageEntryKey = 'antri_poles'; sopMenit = 15; break;
      case 'poles':       stageEntryKey = 'poles';       sopMenit = sopPoles; break;
      case 'selesai':     stageEntryKey = 'selesai';     sopMenit = 0; break;
    }

    const stageEntryStr = times[stageEntryKey];
    const masukStr = times['menunggu'];

    const durasiMasukMenit = stageEntryStr
      ? Math.round((nowMs - new Date(stageEntryStr).getTime()) / 60000)
      : 0;
    const totalDurasiMenit = masukStr
      ? Math.round((nowMs - new Date(masukStr).getTime()) / 60000)
      : durasiMasukMenit;

    let stageStatus: StageStatus = 'normal';
    if (status !== 'selesai' && status !== 'menunggu' && sopMenit > 0) {
      const ratio = durasiMasukMenit / sopMenit;
      if (ratio > 1) stageStatus = 'overtime';
      else if (ratio >= 0.8) stageStatus = 'hampir_ot';
    }

    const vehicle: VehicleInStage = {
      id:              String(row.id ?? ''),
      plateNumber:     String(row.plate_number ?? ''),
      vehicleName:     String(row.vehicle_name ?? ''),
      packageName:     String(row.package_name ?? ''),
      currentStatus:   status,
      durasiMasukMenit,
      totalDurasiMenit,
      stageStatus,
      sopMenit,
      workflowType:    String(row.workflow_type ?? 'regular'),
    };

    const arr = stageMap.get(status);
    if (arr) arr.push(vehicle);
  }

  // Build StageFlow list — merge antri_poles/poles into selesai section if any, else standard flow
  const hasPremium = (stageMap.get('antri_poles')?.length ?? 0) > 0 || (stageMap.get('poles')?.length ?? 0) > 0;

  const outputStages: { stage: string; label: string; icon: string }[] = [
    { stage: 'menunggu', label: 'Menunggu', icon: 'clock' },
    { stage: 'basah',    label: 'Basah',    icon: 'droplet' },
    { stage: 'kering',   label: 'Kering',   icon: 'wind' },
    { stage: 'qc',       label: 'QC',       icon: 'search' },
  ];

  if (hasPremium) {
    outputStages.push({ stage: 'antri_poles', label: 'Antri Poles', icon: 'layers' });
    outputStages.push({ stage: 'poles',       label: 'Poles',       icon: 'sparkles' });
  }

  outputStages.push({ stage: 'selesai', label: 'Selesai', icon: 'check' });

  return outputStages.map(({ stage, label, icon }) => {
    const vehicles = stageMap.get(stage) ?? [];
    const normal   = vehicles.filter((v) => v.stageStatus === 'normal').length;
    const hampirOT = vehicles.filter((v) => v.stageStatus === 'hampir_ot').length;
    const overtime = vehicles.filter((v) => v.stageStatus === 'overtime').length;
    return {
      stage,
      label,
      icon,
      total:    vehicles.length,
      normal,
      hampirOT,
      overtime,
      vehicles,
    };
  });
}

// ── getBottleneckAnalysis ─────────────────────────────────────────────────────

export async function getBottleneckAnalysis(): Promise<BottleneckInfo | null> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();

  const result = await sql`
    SELECT
      so.current_status AS station,
      COUNT(*) AS total,
      SUM(CASE
        WHEN so.current_status = 'basah'
          AND so.times->>'basah' IS NOT NULL
          AND EXTRACT(EPOCH FROM (NOW() - (so.times->>'basah')::timestamptz)) / 60 > COALESCE(pv.sop_basah_minutes, 15)
        THEN 1
        WHEN so.current_status = 'kering'
          AND so.times->>'kering' IS NOT NULL
          AND EXTRACT(EPOCH FROM (NOW() - (so.times->>'kering')::timestamptz)) / 60 > COALESCE(pv.sop_kering_minutes, 15)
        THEN 1
        WHEN so.current_status = 'qc'
          AND so.times->>'qc' IS NOT NULL
          AND EXTRACT(EPOCH FROM (NOW() - (so.times->>'qc')::timestamptz)) / 60 > COALESCE(pv.sop_qc_minutes, 10)
        THEN 1
        WHEN so.current_status = 'poles'
          AND so.times->>'poles' IS NOT NULL
          AND EXTRACT(EPOCH FROM (NOW() - (so.times->>'poles')::timestamptz)) / 60 > COALESCE(pv.sop_poles_minutes, 30)
        THEN 1
        ELSE 0
      END) AS overtime_count
    FROM service_orders so
    LEFT JOIN package_variants pv ON pv.id = so.package_variant_id
    WHERE so.current_status IN ('basah','kering','qc','poles')
      AND so.created_at >= ${todayStart}::timestamptz
    GROUP BY so.current_status
    ORDER BY overtime_count DESC, total DESC
    LIMIT 1
  `;

  const rows = result as Record<string, unknown>[];
  if (!rows.length) return null;

  const row = rows[0];
  const station      = String(row.station ?? '');
  const totalK       = Number(row.total ?? 0);
  const overtimeCount = Number(row.overtime_count ?? 0);

  if (overtimeCount === 0) return null;

  return {
    station,
    label:          STAGE_LABELS[station] ?? station,
    totalKendaraan: totalK,
    overtimeCount,
    overtimePercent: totalK > 0 ? Math.round((overtimeCount / totalK) * 100) : 0,
    capacityIdeal:  IDEAL_CAPACITY[station] ?? '3–5 kendaraan',
  };
}

// ── getOldestVehicles ─────────────────────────────────────────────────────────

export async function getOldestVehicles(): Promise<OldestVehicle[]> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();

  const result = await sql`
    SELECT
      so.id,
      so.current_status,
      so.package_name,
      vh.plate_number,
      vh.vehicle_name,
      so.times,
      COALESCE(pv.sop_basah_minutes, 15)  AS sop_basah,
      COALESCE(pv.sop_kering_minutes, 15) AS sop_kering,
      COALESCE(pv.sop_qc_minutes, 10)     AS sop_qc,
      COALESCE(pv.sop_poles_minutes, 30)  AS sop_poles,
      EXTRACT(EPOCH FROM (NOW() - (so.times->>'menunggu')::timestamptz)) / 60 AS total_durasi_menit
    FROM service_orders so
    JOIN vehicle_history vh ON vh.id = so.vehicle_id
    LEFT JOIN package_variants pv ON pv.id = so.package_variant_id
    WHERE so.current_status IN ('menunggu','basah','kering','qc','antri_poles','poles')
      AND so.times->>'menunggu' IS NOT NULL
      AND so.created_at >= ${todayStart}::timestamptz
    ORDER BY total_durasi_menit DESC
    LIMIT 10
  `;

  const nowMs = Date.now();

  return (result as Record<string, unknown>[]).map((row, i) => {
    const status    = String(row.current_status ?? '');
    const times     = (row.times ?? {}) as Record<string, string | null>;
    const sopBasah  = Number(row.sop_basah ?? 15);
    const sopKering = Number(row.sop_kering ?? 15);
    const sopQc     = Number(row.sop_qc ?? 10);
    const sopPoles  = Number(row.sop_poles ?? 30);

    // Check overtime for current station
    let isOvertime = false;
    let stageEntryStr: string | null = null;
    let sopMenit = 0;

    switch (status) {
      case 'basah':   stageEntryStr = times['basah'] ?? null;   sopMenit = sopBasah;  break;
      case 'kering':  stageEntryStr = times['kering'] ?? null;  sopMenit = sopKering; break;
      case 'qc':      stageEntryStr = times['qc'] ?? null;      sopMenit = sopQc;     break;
      case 'poles':   stageEntryStr = times['poles'] ?? null;   sopMenit = sopPoles;  break;
    }

    if (stageEntryStr && sopMenit > 0) {
      const elapsed = (nowMs - new Date(stageEntryStr).getTime()) / 60000;
      isOvertime = elapsed > sopMenit;
    }

    const masukStr = times['menunggu'];
    const totalDurasi = masukStr
      ? Math.round((nowMs - new Date(masukStr).getTime()) / 60000)
      : Math.round(Number(row.total_durasi_menit ?? 0));

    return {
      rank:            i + 1,
      id:              String(row.id ?? ''),
      plateNumber:     String(row.plate_number ?? ''),
      vehicleName:     String(row.vehicle_name ?? ''),
      packageName:     String(row.package_name ?? ''),
      currentStatus:   status,
      stageLabel:      STAGE_LABELS[status] ?? status,
      totalDurasiMenit: totalDurasi,
      isOvertime,
    };
  });
}

// ── getQueueStageSummary ──────────────────────────────────────────────────────

export async function getQueueStageSummary(): Promise<QueueStageSummary[]> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();

  const result = await sql`
    SELECT
      so.id,
      so.current_status,
      so.package_name,
      vh.plate_number,
      vh.vehicle_name,
      so.times,
      p.workflow_type,
      COALESCE(pv.sop_basah_minutes, 15)  AS sop_basah,
      COALESCE(pv.sop_kering_minutes, 15) AS sop_kering,
      COALESCE(pv.sop_qc_minutes, 10)     AS sop_qc,
      COALESCE(pv.sop_poles_minutes, 30)  AS sop_poles
    FROM service_orders so
    JOIN vehicle_history vh ON vh.id = so.vehicle_id
    LEFT JOIN package_variants pv ON pv.id = so.package_variant_id
    LEFT JOIN packages p ON p.id = so.package_id
    WHERE so.current_status IN ('menunggu','basah','kering','qc','antri_poles','poles','selesai')
      AND so.created_at >= ${todayStart}::timestamptz
    ORDER BY so.created_at ASC
  `;

  const rows = result as Record<string, unknown>[];
  const nowMs = Date.now();

  const ALL_STAGES = [
    { stage: 'menunggu',    label: 'Menunggu' },
    { stage: 'basah',       label: 'Basah' },
    { stage: 'kering',      label: 'Kering' },
    { stage: 'qc',          label: 'QC' },
    { stage: 'antri_poles', label: 'Antri Poles' },
    { stage: 'poles',       label: 'Poles' },
    { stage: 'selesai',     label: 'Selesai' },
  ];

  const stageMap = new Map<string, QueueStageVehicle[]>();
  ALL_STAGES.forEach((s) => stageMap.set(s.stage, []));

  for (const row of rows) {
    const status    = String(row.current_status ?? '');
    const times     = (row.times ?? {}) as Record<string, string | null>;
    const sopBasah  = Number(row.sop_basah ?? 15);
    const sopKering = Number(row.sop_kering ?? 15);
    const sopQc     = Number(row.sop_qc ?? 10);
    const sopPoles  = Number(row.sop_poles ?? 30);

    let stageEntryKey = status;
    let sopMenit = 0;
    switch (status) {
      case 'menunggu':    sopMenit = 30;       break;
      case 'basah':       sopMenit = sopBasah;  break;
      case 'kering':      sopMenit = sopKering; break;
      case 'qc':          sopMenit = sopQc;     break;
      case 'antri_poles': sopMenit = 15;        break;
      case 'poles':       sopMenit = sopPoles;  break;
      case 'selesai':     sopMenit = 0;         break;
    }

    const stageEntryStr = times[stageEntryKey];
    const masukStr = times['menunggu'];

    const durasiMasukMenit = stageEntryStr
      ? Math.round((nowMs - new Date(stageEntryStr).getTime()) / 60000)
      : 0;
    const totalDurasiMenit = masukStr
      ? Math.round((nowMs - new Date(masukStr).getTime()) / 60000)
      : durasiMasukMenit;

    let stageStatus: StageStatus = 'normal';
    if (status !== 'selesai' && sopMenit > 0) {
      const ratio = durasiMasukMenit / sopMenit;
      if (ratio > 1) stageStatus = 'overtime';
      else if (ratio >= 0.8) stageStatus = 'hampir_ot';
    }

    const vehicle: QueueStageVehicle = {
      id:              String(row.id ?? ''),
      plateNumber:     String(row.plate_number ?? ''),
      vehicleName:     String(row.vehicle_name ?? ''),
      packageName:     String(row.package_name ?? ''),
      currentStatus:   status,
      durasiMasukMenit,
      totalDurasiMenit,
      stageStatus,
      sopMenit,
    };

    const arr = stageMap.get(status);
    if (arr) arr.push(vehicle);
  }

  // Only return stages that have vehicles, but always include the core stages
  const CORE_STAGES = ['menunggu', 'basah', 'kering', 'qc', 'selesai'];
  const hasPremium = (stageMap.get('antri_poles')?.length ?? 0) > 0 || (stageMap.get('poles')?.length ?? 0) > 0;

  const stagesToReturn = hasPremium
    ? ['menunggu', 'basah', 'kering', 'qc', 'antri_poles', 'poles', 'selesai']
    : CORE_STAGES;

  return stagesToReturn.map((stageKey) => {
    const cfg = ALL_STAGES.find((s) => s.stage === stageKey)!;
    const vehicles = stageMap.get(stageKey) ?? [];
    return {
      stage:    cfg.stage,
      label:    cfg.label,
      vehicles,
      total:    vehicles.length,
    };
  });
}

// ── getTingkatPenyelesaian ────────────────────────────────────────────────────

export async function getTingkatPenyelesaian(): Promise<TingkatPenyelesaian> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

  const result = await sql`
    SELECT
      COUNT(*) FILTER (WHERE current_status NOT IN ('cancel')) AS total_masuk,
      COUNT(*) FILTER (WHERE current_status IN ('selesai','diambil')) AS total_selesai
    FROM service_orders
    WHERE created_at >= ${todayStart}::timestamptz
      AND created_at <= ${todayEnd}::timestamptz
  `;

  const row = (result as Record<string, unknown>[])[0] ?? {};
  const masuk   = Number(row.total_masuk ?? 0);
  const selesai = Number(row.total_selesai ?? 0);

  return {
    masuk,
    selesai,
    percent: masuk > 0 ? Math.round((selesai / masuk) * 100) : 0,
  };
}
