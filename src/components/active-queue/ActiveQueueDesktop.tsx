/**
 * ActiveQueueDesktop.tsx
 * Owner Active Queue Dashboard — Desktop layout.
 * Real-time monitoring: KPI cards, operational flow, bottleneck, oldest vehicles, kanban.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ActiveQueueSidebar from './ActiveQueueSidebar';
import {
  getActiveQueueSummary,
  getOperationalFlow,
  getBottleneckAnalysis,
  getOldestVehicles,
  getQueueStageSummary,
  getTingkatPenyelesaian,
  formatDurasi,
  getStageLabelDisplay,
  type ActiveQueueSummary,
  type StageFlow,
  type BottleneckInfo,
  type OldestVehicle,
  type QueueStageSummary,
  type TingkatPenyelesaian,
} from '../../lib/activeQueueService';

const REFRESH_INTERVAL_MS = 30_000;

// ── Stage Icon SVGs ───────────────────────────────────────────────────────────

function StageIcon({ icon, size = 14 }: { icon: string; size?: number }) {
  const cls = `flex-shrink-0`;
  switch (icon) {
    case 'clock':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case 'droplet':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>;
    case 'wind':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>;
    case 'search':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>;
    case 'layers':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
    case 'sparkles':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>;
    case 'check':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>;
    default:
      return null;
  }
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const COLORS: Record<string, string> = {
    menunggu:    'bg-[#F5F5F0] text-[#666]',
    basah:       'bg-[#EDF5FF] text-[#185FA5]',
    kering:      'bg-[#E8F5E0] text-[#3A7C0A]',
    qc:          'bg-[#F0E6FB] text-[#6B21C0]',
    antri_poles: 'bg-[#FFF3E0] text-[#B06000]',
    poles:       'bg-[#FFF3E0] text-[#B06000]',
    selesai:     'bg-[#D4F5E9] text-[#0D6E4F]',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${COLORS[status] ?? 'bg-[#F5F5F0] text-[#888]'}`}>
      {getStageLabelDisplay(status)}
    </span>
  );
}

// ── Stage color palette ───────────────────────────────────────────────────────

const STAGE_BG: Record<string, string> = {
  menunggu:    'border-[#E8E8E4] bg-[#FAFAF8]',
  basah:       'border-[#BBDAFF] bg-[#F0F7FF]',
  kering:      'border-[#B5D98A] bg-[#F2FAEB]',
  qc:          'border-[#C9A8F5] bg-[#F7F0FE]',
  antri_poles: 'border-[#FFC67A] bg-[#FFF8EE]',
  poles:       'border-[#FFA550] bg-[#FFF4E6]',
  selesai:     'border-[#6FD4AC] bg-[#EDFAF4]',
};

const STAGE_HEADER: Record<string, string> = {
  menunggu:    'text-[#555]',
  basah:       'text-[#185FA5]',
  kering:      'text-[#3A7C0A]',
  qc:          'text-[#6B21C0]',
  antri_poles: 'text-[#B06000]',
  poles:       'text-[#B06000]',
  selesai:     'text-[#0D6E4F]',
};

// ── Mini kanban vehicle card ──────────────────────────────────────────────────

function KanbanCard({ vehicle }: { vehicle: { plateNumber: string; vehicleName: string; packageName: string; durasiMasukMenit: number; stageStatus: string } }) {
  const isOT = vehicle.stageStatus === 'overtime';
  const isHampir = vehicle.stageStatus === 'hampir_ot';
  return (
    <div className={`rounded-lg border p-2.5 text-[11px] bg-white ${isOT ? 'border-[#FFC5C5]' : isHampir ? 'border-[#FFE0A0]' : 'border-[#E8E8E4]'}`}>
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="font-bold text-[#1a1a1a] tracking-wide text-[11px]">{vehicle.plateNumber}</span>
        {isOT && (
          <span className="text-[9px] font-bold bg-[#D04D4D] text-white px-1.5 py-0.5 rounded">OT</span>
        )}
        {isHampir && !isOT && (
          <span className="text-[9px] font-bold bg-[#E06520] text-white px-1.5 py-0.5 rounded">~OT</span>
        )}
      </div>
      <div className="text-[#555] truncate">{vehicle.vehicleName}</div>
      <div className="text-[#888] truncate">{vehicle.packageName}</div>
      <div className={`mt-1 font-semibold ${isOT ? 'text-[#D04D4D]' : isHampir ? 'text-[#E06520]' : 'text-[#888]'}`}>
        {formatDurasi(vehicle.durasiMasukMenit)}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ActiveQueueDesktop() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [summary, setSummary]                     = useState<ActiveQueueSummary | null>(null);
  const [flow, setFlow]                           = useState<StageFlow[]>([]);
  const [bottleneck, setBottleneck]               = useState<BottleneckInfo | null>(null);
  const [oldestVehicles, setOldestVehicles]       = useState<OldestVehicle[]>([]);
  const [stageSummary, setStageSummary]           = useState<QueueStageSummary[]>([]);
  const [tingkat, setTingkat]                     = useState<TingkatPenyelesaian | null>(null);
  const [expandedStages, setExpandedStages]       = useState<Record<string, boolean>>({});

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [s, f, b, o, qs, t] = await Promise.all([
        getActiveQueueSummary(),
        getOperationalFlow(),
        getBottleneckAnalysis(),
        getOldestVehicles(),
        getQueueStageSummary(),
        getTingkatPenyelesaian(),
      ]);
      setSummary(s);
      setFlow(f);
      setBottleneck(b);
      setOldestVehicles(o);
      setStageSummary(qs);
      setTingkat(t);
      setIsOnline(true);
      setLastUpdated(new Date());
    } catch {
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAll]);

  function handleLogout() {
    sessionStorage.clear();
    navigate('/admin');
  }

  function handleRefresh() {
    setLoading(true);
    fetchAll();
  }

  function toggleExpand(stage: string) {
    setExpandedStages((prev) => ({ ...prev, [stage]: !prev[stage] }));
  }

  const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const lastUpdatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    : '—';

  const hasNoActiveVehicles = !loading && (summary?.sedangDalamProses ?? 0) === 0;

  return (
    <div className="flex min-h-screen bg-[#F5F5F0]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <ActiveQueueSidebar activeRoute="active-queue" />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="bg-white border-b border-[#E8E8E4] px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#EDF5FF] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/>
                <line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>
              </svg>
            </div>
            <div>
              <h1 className="text-[16px] font-bold text-[#1a1a1a] leading-tight">Antrian Aktif</h1>
              <p className="text-[11px] text-[#888]">Pantau antrian dan performa operasional hari ini secara real-time</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Date */}
            <div className="flex items-center gap-1.5 text-[12px] text-[#555] border border-[#E8E8E4] rounded-lg px-3 py-1.5 bg-white">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
              <span className="font-medium">{todayStr}</span>
            </div>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[#555] border border-[#E8E8E4] rounded-lg hover:bg-[#F5F5F0] transition-colors disabled:opacity-50"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin' : ''}>
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              <span>Refresh</span>
            </button>

            {/* Online status */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-medium ${isOnline ? 'border-[#6FD4AC] bg-[#EDFAF4] text-[#0D6E4F]' : 'border-[#FFC5C5] bg-[#FFF5F5] text-[#D04D4D]'}`}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#1D9E75]' : 'bg-[#D04D4D]'}`} />
              {isOnline ? 'Online' : 'Offline'}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[#D04D4D] border border-[#FFD5D5] rounded-lg hover:bg-[#FFF5F5] transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Loading bar */}
        {loading && <div className="h-0.5 bg-[#185FA5] animate-pulse" />}

        <div className="flex-1 p-5 space-y-4 overflow-y-auto">

          {/* ── SECTION 1: KPI Cards ──────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Kendaraan Masuk Hari Ini */}
            <div className="bg-white rounded-xl border border-[#E8E8E4] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-[#EDF5FF] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2z"/>
                    <path d="M9 17v2M15 17v2M3 11h18"/>
                    <path d="M7 7 5.5 3.5M17 7l1.5-3.5"/>
                  </svg>
                </div>
                <span className="text-[11px] text-[#888] font-medium">Kendaraan Masuk Hari Ini</span>
              </div>
              <div className="text-[28px] font-bold text-[#1a1a1a] leading-none">
                {loading ? '—' : (summary?.kendaraanMasukHariIni ?? 0)}
              </div>
            </div>

            {/* Sedang Dalam Proses */}
            <div className="bg-white rounded-xl border border-[#E8E8E4] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-[#FFF8E8] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E06520" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <span className="text-[11px] text-[#888] font-medium">Sedang Dalam Proses</span>
              </div>
              <div className="text-[28px] font-bold text-[#1a1a1a] leading-none">
                {loading ? '—' : (summary?.sedangDalamProses ?? 0)}
              </div>
              {!loading && summary && summary.kendaraanMasukHariIni > 0 && (
                <div className="text-[11px] text-[#888] mt-1">
                  {Math.round((summary.sedangDalamProses / summary.kendaraanMasukHariIni) * 100)}% dari total masuk
                </div>
              )}
            </div>

            {/* Selesai Hari Ini */}
            <div className="bg-white rounded-xl border border-[#E8E8E4] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-[#D4F5E9] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D6E4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
                  </svg>
                </div>
                <span className="text-[11px] text-[#888] font-medium">Selesai Hari Ini</span>
              </div>
              <div className="text-[28px] font-bold text-[#1a1a1a] leading-none">
                {loading ? '—' : (summary?.selesaiHariIni ?? 0)}
              </div>
            </div>

            {/* Rata-rata Durasi */}
            <div className="bg-white rounded-xl border border-[#E8E8E4] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-[#EDF5FF] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <span className="text-[11px] text-[#888] font-medium">Rata-rata Durasi</span>
              </div>
              <div className="text-[28px] font-bold text-[#1a1a1a] leading-none">
                {loading ? '—' : formatDurasi(summary?.rataRataDurasiMenit ?? 0)}
              </div>
            </div>

            {/* Overtime Kendaraan */}
            <div className={`rounded-xl border p-4 ${!loading && (summary?.overtimeKendaraan ?? 0) > 0 ? 'bg-[#FFF5F5] border-[#FFC5C5]' : 'bg-white border-[#E8E8E4]'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${!loading && (summary?.overtimeKendaraan ?? 0) > 0 ? 'bg-[#FFD5D5]' : 'bg-[#FFE8D6]'}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={!loading && (summary?.overtimeKendaraan ?? 0) > 0 ? '#D04D4D' : '#E06520'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                    <path d="M12 9v4M12 17h.01"/>
                  </svg>
                </div>
                <span className="text-[11px] text-[#888] font-medium">Overtime Kendaraan</span>
              </div>
              <div className={`text-[28px] font-bold leading-none ${!loading && (summary?.overtimeKendaraan ?? 0) > 0 ? 'text-[#D04D4D]' : 'text-[#1a1a1a]'}`}>
                {loading ? '—' : (summary?.overtimeKendaraan ?? 0)}
              </div>
              {!loading && (summary?.overtimeKendaraan ?? 0) > 0 && (
                <button
                  onClick={() => document.getElementById('section-oldest')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-[11px] text-[#D04D4D] font-medium mt-1 hover:underline"
                >
                  Lihat detail →
                </button>
              )}
            </div>
          </div>

          {/* ── SECTION 2: Alur Operasional + Bottleneck ─────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Alur Operasional */}
            <div className="xl:col-span-2 bg-white rounded-xl border border-[#E8E8E4] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[14px] font-bold text-[#1a1a1a]">Alur Operasional Hari Ini</h2>
                  <p className="text-[11px] text-[#888] mt-0.5">Status kendaraan di setiap tahap proses</p>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#1D9E75]" />Normal</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#E06520]" />Hampir OT</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#D04D4D]" />Overtime</span>
                </div>
              </div>

              {hasNoActiveVehicles ? (
                <EmptyState />
              ) : (
                <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
                  {flow.map((stage, idx) => (
                    <div key={stage.stage} className="flex items-stretch gap-2 flex-shrink-0">
                      <div className={`rounded-xl border p-3 min-w-[120px] flex flex-col gap-2 ${STAGE_BG[stage.stage] ?? 'border-[#E8E8E4] bg-white'}`}>
                        {/* Stage header */}
                        <div className={`flex items-center gap-1.5 ${STAGE_HEADER[stage.stage] ?? 'text-[#555]'}`}>
                          <StageIcon icon={stage.icon} size={13} />
                          <span className="text-[12px] font-bold">{stage.label}</span>
                        </div>

                        {/* Count */}
                        <div className="text-[26px] font-bold text-[#1a1a1a] leading-none">{stage.total}</div>

                        {/* Breakdown */}
                        <div className="space-y-0.5 text-[10px]">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />
                            <span className="text-[#555]">Normal</span>
                            <span className="ml-auto font-semibold text-[#1a1a1a]">{stage.normal}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E06520]" />
                            <span className="text-[#555]">Hampir OT</span>
                            <span className="ml-auto font-semibold text-[#1a1a1a]">{stage.hampirOT}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D04D4D]" />
                            <span className="text-[#555]">Overtime</span>
                            <span className={`ml-auto font-semibold ${stage.overtime > 0 ? 'text-[#D04D4D]' : 'text-[#1a1a1a]'}`}>{stage.overtime}</span>
                          </div>
                        </div>
                      </div>
                      {/* Arrow */}
                      {idx < flow.length - 1 && (
                        <div className="flex items-center text-[#bbb]">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m9 18 6-6-6-6"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Tingkat penyelesaian */}
              {tingkat && (
                <div className="mt-4 pt-4 border-t border-[#E8E8E4] flex items-center justify-between text-[11px]">
                  <span className="text-[#555]">
                    Tingkat Penyelesaian: <span className="font-bold text-[#1a1a1a]">{tingkat.percent}%</span>
                    <span className="text-[#888] ml-1">({tingkat.selesai} dari {tingkat.masuk} kendaraan masuk)</span>
                  </span>
                  <span className="text-[#999]">Update terakhir: {lastUpdatedStr}</span>
                </div>
              )}
            </div>

            {/* Bottleneck */}
            <div className="bg-white rounded-xl border border-[#E8E8E4] p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E06520" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <path d="M12 9v4M12 17h.01"/>
                </svg>
                <h2 className="text-[14px] font-bold text-[#1a1a1a]">Bottleneck Saat Ini</h2>
              </div>

              {loading ? (
                <div className="flex-1 flex items-center justify-center text-[#bbb] text-[12px]">Memuat...</div>
              ) : bottleneck ? (
                <div className="flex-1">
                  <div className="rounded-xl border border-[#FFC5C5] bg-[#FFF5F5] p-4 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[16px] font-bold text-[#1a1a1a]">{bottleneck.label}</span>
                      <span className="text-[10px] font-bold bg-[#D04D4D] text-white px-2 py-0.5 rounded">Bottleneck</span>
                    </div>
                    <div className="text-[12px] text-[#555] space-y-0.5 mb-3">
                      <div>{bottleneck.totalKendaraan} kendaraan dalam proses</div>
                      <div className="text-[#D04D4D] font-medium">{bottleneck.overtimeCount} kendaraan overtime</div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 rounded-full bg-[#FFE0E0] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#D04D4D] transition-all"
                        style={{ width: `${Math.min(bottleneck.overtimePercent, 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[10px] text-[#D04D4D] font-semibold">{bottleneck.overtimePercent}% overtime</div>
                  </div>
                  <div className="text-[11px] text-[#888]">
                    Kapasitas ideal: {bottleneck.capacityIdeal}
                  </div>
                  <button
                    onClick={() => document.getElementById('section-oldest')?.scrollIntoView({ behavior: 'smooth' })}
                    className="mt-3 text-[12px] text-[#185FA5] font-medium hover:underline"
                  >
                    Lihat analisis detail →
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-[#6FD4AC] bg-[#EDFAF4]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0D6E4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
                  </svg>
                  <span className="text-[13px] font-semibold text-[#0D6E4F]">Operasional Sehat</span>
                  <span className="text-[11px] text-[#0D6E4F] text-center">Tidak ada bottleneck saat ini</span>
                </div>
              )}
            </div>
          </div>

          {/* ── SECTION 3: Kendaraan Terlama ──────────────────────── */}
          <div id="section-oldest" className="bg-white rounded-xl border border-[#E8E8E4] p-5">
            <div className="flex items-center gap-2 mb-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E06520" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <h2 className="text-[14px] font-bold text-[#1a1a1a]">Kendaraan Terlama</h2>
              <span className="text-[11px] text-[#888]">Top 10 kendaraan dengan waktu proses terlama hari ini</span>
            </div>

            {loading ? (
              <div className="text-center py-6 text-[#bbb] text-[12px]">Memuat...</div>
            ) : oldestVehicles.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-[#E8E8E4]">
                      <th className="text-left py-2 px-3 text-[10px] font-semibold text-[#888] w-8">#</th>
                      <th className="text-left py-2 px-3 text-[10px] font-semibold text-[#888]">Plat</th>
                      <th className="text-left py-2 px-3 text-[10px] font-semibold text-[#888]">Kendaraan</th>
                      <th className="text-left py-2 px-3 text-[10px] font-semibold text-[#888]">Paket</th>
                      <th className="text-left py-2 px-3 text-[10px] font-semibold text-[#888]">Status</th>
                      <th className="text-right py-2 px-3 text-[10px] font-semibold text-[#888]">Durasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oldestVehicles.map((v) => (
                      <tr key={v.id} className="border-b border-[#F5F5F0] hover:bg-[#FAFAF8]">
                        <td className="py-2.5 px-3 text-[#bbb] text-[11px]">{v.rank}</td>
                        <td className="py-2.5 px-3 font-bold text-[#1a1a1a] tracking-wide">{v.plateNumber}</td>
                        <td className="py-2.5 px-3 text-[#555]">{v.vehicleName}</td>
                        <td className="py-2.5 px-3 text-[#888]">{v.packageName}</td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={v.currentStatus} />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`font-semibold ${v.isOvertime ? 'text-[#D04D4D]' : 'text-[#1a1a1a]'}`}>
                            {formatDurasi(v.totalDurasiMenit)}
                          </span>
                          {v.isOvertime && (
                            <span className="ml-1.5 text-[9px] font-bold bg-[#D04D4D] text-white px-1.5 py-0.5 rounded">OT</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── SECTION 4: Ringkasan Antrian Per Tahap (Kanban) ────── */}
          <div className="bg-white rounded-xl border border-[#E8E8E4] p-5">
            <div className="mb-4">
              <h2 className="text-[14px] font-bold text-[#1a1a1a]">Ringkasan Antrian Per Tahap</h2>
              <p className="text-[11px] text-[#888] mt-0.5">Versi ringkas Kanban — read only</p>
            </div>

            {loading ? (
              <div className="text-center py-6 text-[#bbb] text-[12px]">Memuat...</div>
            ) : hasNoActiveVehicles ? (
              <EmptyState />
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {stageSummary.map((stage) => {
                  const isExpanded = expandedStages[stage.stage];
                  const displayVehicles = isExpanded ? stage.vehicles : stage.vehicles.slice(0, 5);
                  const hasMore = stage.vehicles.length > 5;

                  return (
                    <div key={stage.stage} className={`flex-shrink-0 w-[180px] rounded-xl border p-3 flex flex-col gap-2 ${STAGE_BG[stage.stage] ?? 'border-[#E8E8E4] bg-white'}`}>
                      {/* Column header */}
                      <div className={`flex items-center justify-between ${STAGE_HEADER[stage.stage] ?? 'text-[#555]'}`}>
                        <span className="text-[12px] font-bold">{stage.label}</span>
                        <span className="text-[11px] font-semibold bg-white/60 px-1.5 py-0.5 rounded-full border border-current/20">
                          {stage.total}
                        </span>
                      </div>

                      {/* Vehicle cards */}
                      <div className="flex flex-col gap-1.5">
                        {displayVehicles.map((v) => (
                          <KanbanCard key={v.id} vehicle={v} />
                        ))}
                      </div>

                      {/* Show more / less */}
                      {hasMore && (
                        <button
                          onClick={() => toggleExpand(stage.stage)}
                          className={`text-[10px] font-medium text-center py-1 rounded-lg border border-current/20 hover:bg-white/60 transition-colors ${STAGE_HEADER[stage.stage] ?? 'text-[#555]'}`}
                        >
                          {isExpanded ? 'Tampilkan lebih sedikit ↑' : `Lihat semua (${stage.vehicles.length - 5} lagi) →`}
                        </button>
                      )}

                      {stage.total === 0 && (
                        <div className="text-[10px] text-[#bbb] text-center py-2">Kosong</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-3 text-[10px] text-[#bbb]">
              <svg className="inline-block mr-1" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              Keterangan: OT (Overtime) = Melebihi SOP yang ditentukan
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 text-center text-[11px] text-[#bbb] border-t border-[#E8E8E4] bg-white">
          FIP Autoshop — Antrian Aktif &bull; Auto-refresh setiap 30 detik
        </div>
      </div>
    </div>
  );
}

// ── Empty state component ─────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2z"/>
        <path d="M9 17v2M15 17v2M3 11h18"/>
        <path d="M7 7 5.5 3.5M17 7l1.5-3.5"/>
      </svg>
      <p className="text-[13px] text-[#bbb]">Tidak ada kendaraan dalam proses saat ini.</p>
    </div>
  );
}
