/**
 * ActiveQueueMobile.tsx
 * Owner Active Queue Dashboard — Mobile layout (max-w-[430px]).
 * Fully separate file dari desktop untuk menghindari responsive bug.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${COLORS[status] ?? 'bg-[#F5F5F0] text-[#888]'}`}>
      {getStageLabelDisplay(status)}
    </span>
  );
}

// ── Stage accent colors ───────────────────────────────────────────────────────

const STAGE_BG: Record<string, string> = {
  menunggu:    'border-[#E8E8E4] bg-[#FAFAF8]',
  basah:       'border-[#BBDAFF] bg-[#F0F7FF]',
  kering:      'border-[#B5D98A] bg-[#F2FAEB]',
  qc:          'border-[#C9A8F5] bg-[#F7F0FE]',
  antri_poles: 'border-[#FFC67A] bg-[#FFF8EE]',
  poles:       'border-[#FFA550] bg-[#FFF4E6]',
  selesai:     'border-[#6FD4AC] bg-[#EDFAF4]',
};

const STAGE_TEXT: Record<string, string> = {
  menunggu:    'text-[#555]',
  basah:       'text-[#185FA5]',
  kering:      'text-[#3A7C0A]',
  qc:          'text-[#6B21C0]',
  antri_poles: 'text-[#B06000]',
  poles:       'text-[#B06000]',
  selesai:     'text-[#0D6E4F]',
};

// ── Flow stage card ───────────────────────────────────────────────────────────

function FlowCard({ stage }: { stage: StageFlow }) {
  return (
    <div className={`rounded-xl border p-3 flex-shrink-0 w-[130px] ${STAGE_BG[stage.stage] ?? 'border-[#E8E8E4] bg-white'}`}>
      <div className={`text-[12px] font-bold mb-1 ${STAGE_TEXT[stage.stage] ?? 'text-[#555]'}`}>{stage.label}</div>
      <div className="text-[24px] font-bold text-[#1a1a1a] leading-none mb-2">{stage.total}</div>
      <div className="space-y-0.5 text-[10px]">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />
          <span className="text-[#555]">Normal</span>
          <span className="ml-auto font-semibold">{stage.normal}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E06520]" />
          <span className="text-[#555]">Hampir OT</span>
          <span className="ml-auto font-semibold">{stage.hampirOT}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D04D4D]" />
          <span className="text-[#555]">Overtime</span>
          <span className={`ml-auto font-semibold ${stage.overtime > 0 ? 'text-[#D04D4D]' : ''}`}>{stage.overtime}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main mobile component ─────────────────────────────────────────────────────

export default function ActiveQueueMobile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [summary, setSummary]               = useState<ActiveQueueSummary | null>(null);
  const [flow, setFlow]                     = useState<StageFlow[]>([]);
  const [bottleneck, setBottleneck]         = useState<BottleneckInfo | null>(null);
  const [oldestVehicles, setOldestVehicles] = useState<OldestVehicle[]>([]);
  const [stageSummary, setStageSummary]     = useState<QueueStageSummary[]>([]);
  const [tingkat, setTingkat]               = useState<TingkatPenyelesaian | null>(null);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab]           = useState<'alur' | 'kendaraan' | 'kanban'>('alur');

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
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchAll]);

  function handleLogout() {
    sessionStorage.clear();
    navigate('/admin');
  }

  function toggleExpand(stage: string) {
    setExpandedStages((prev) => ({ ...prev, [stage]: !prev[stage] }));
  }

  const lastUpdatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    : '—';

  const hasNoActive = !loading && (summary?.sedangDalamProses ?? 0) === 0;

  if (loading && !summary) {
    return (
      <div className="w-full max-w-[430px] mx-auto min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <div className="text-[#888] text-[13px]">Memuat data antrian...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[430px] mx-auto min-h-screen bg-[#F5F5F0] flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#E8E8E4] px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-bold text-[#1a1a1a] leading-tight">Antrian Aktif</h1>
            <p className="text-[10px] text-[#888]">Monitoring real-time</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Online status */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border ${isOnline ? 'border-[#6FD4AC] bg-[#EDFAF4] text-[#0D6E4F]' : 'border-[#FFC5C5] bg-[#FFF5F5] text-[#D04D4D]'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#1D9E75]' : 'bg-[#D04D4D]'}`} />
              {isOnline ? 'Online' : 'Offline'}
            </div>
            {/* Refresh */}
            <button
              onClick={() => { setLoading(true); fetchAll(); }}
              disabled={loading}
              className="p-2 rounded-lg border border-[#E8E8E4] text-[#555] hover:bg-[#F5F5F0] disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin' : ''}>
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Loading bar */}
      {loading && <div className="h-0.5 bg-[#185FA5] animate-pulse" />}

      <div className="flex-1 overflow-y-auto">

        {/* ── KPI Cards ────────────────────────────────────────── */}
        <div className="p-3 grid grid-cols-2 gap-2.5">
          {/* Kendaraan Masuk */}
          <div className="bg-white rounded-xl border border-[#E8E8E4] p-3">
            <div className="text-[10px] text-[#888] mb-1">Masuk Hari Ini</div>
            <div className="text-[22px] font-bold text-[#1a1a1a]">{loading ? '—' : (summary?.kendaraanMasukHariIni ?? 0)}</div>
          </div>
          {/* Dalam Proses */}
          <div className="bg-white rounded-xl border border-[#E8E8E4] p-3">
            <div className="text-[10px] text-[#888] mb-1">Dalam Proses</div>
            <div className="text-[22px] font-bold text-[#1a1a1a]">{loading ? '—' : (summary?.sedangDalamProses ?? 0)}</div>
            {!loading && summary && summary.kendaraanMasukHariIni > 0 && (
              <div className="text-[9px] text-[#888]">
                {Math.round((summary.sedangDalamProses / summary.kendaraanMasukHariIni) * 100)}% dari total
              </div>
            )}
          </div>
          {/* Selesai */}
          <div className="bg-white rounded-xl border border-[#E8E8E4] p-3">
            <div className="text-[10px] text-[#888] mb-1">Selesai Hari Ini</div>
            <div className="text-[22px] font-bold text-[#1D9E75]">{loading ? '—' : (summary?.selesaiHariIni ?? 0)}</div>
          </div>
          {/* Overtime */}
          <div className={`rounded-xl border p-3 ${!loading && (summary?.overtimeKendaraan ?? 0) > 0 ? 'bg-[#FFF5F5] border-[#FFC5C5]' : 'bg-white border-[#E8E8E4]'}`}>
            <div className="text-[10px] text-[#888] mb-1">Overtime</div>
            <div className={`text-[22px] font-bold ${!loading && (summary?.overtimeKendaraan ?? 0) > 0 ? 'text-[#D04D4D]' : 'text-[#1a1a1a]'}`}>
              {loading ? '—' : (summary?.overtimeKendaraan ?? 0)}
            </div>
          </div>
        </div>

        {/* Rata-rata Durasi full width */}
        <div className="px-3 pb-3">
          <div className="bg-white rounded-xl border border-[#E8E8E4] p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#EDF5FF] flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div>
              <div className="text-[10px] text-[#888]">Rata-rata Durasi</div>
              <div className="text-[16px] font-bold text-[#1a1a1a]">{loading ? '—' : formatDurasi(summary?.rataRataDurasiMenit ?? 0)}</div>
            </div>
            {tingkat && (
              <div className="ml-auto text-right">
                <div className="text-[10px] text-[#888]">Penyelesaian</div>
                <div className="text-[16px] font-bold text-[#1a1a1a]">{tingkat.percent}%</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Tab Navigation ────────────────────────────────────── */}
        <div className="px-3 pb-3">
          <div className="bg-white rounded-xl border border-[#E8E8E4] p-1 flex gap-1">
            {[
              { key: 'alur',      label: 'Alur & Bottleneck' },
              { key: 'kendaraan', label: 'Terlama' },
              { key: 'kanban',    label: 'Per Tahap' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-[#185FA5] text-white'
                    : 'text-[#555] hover:bg-[#F5F5F0]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab: Alur Operasional ─────────────────────────────── */}
        {activeTab === 'alur' && (
          <div className="px-3 pb-3 space-y-3">
            {/* Alur flow */}
            <div className="bg-white rounded-xl border border-[#E8E8E4] p-4">
              <h2 className="text-[13px] font-bold text-[#1a1a1a] mb-3">Alur Operasional Hari Ini</h2>
              {hasNoActive ? (
                <MobileEmptyState />
              ) : (
                <>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                    {flow.map((stage, idx) => (
                      <div key={stage.stage} className="flex items-center gap-1.5 flex-shrink-0">
                        <FlowCard stage={stage} />
                        {idx < flow.length - 1 && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                            <path d="m9 18 6-6-6-6"/>
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                  {tingkat && (
                    <div className="mt-3 text-[10px] text-[#888]">
                      Penyelesaian: {tingkat.percent}% ({tingkat.selesai}/{tingkat.masuk}) &bull; Update: {lastUpdatedStr}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottleneck */}
            <div className="bg-white rounded-xl border border-[#E8E8E4] p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E06520" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <path d="M12 9v4M12 17h.01"/>
                </svg>
                <h2 className="text-[13px] font-bold text-[#1a1a1a]">Bottleneck Saat Ini</h2>
              </div>

              {loading ? (
                <div className="text-center py-4 text-[#bbb] text-[11px]">Memuat...</div>
              ) : bottleneck ? (
                <div className="rounded-xl border border-[#FFC5C5] bg-[#FFF5F5] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[14px] font-bold text-[#1a1a1a]">{bottleneck.label}</span>
                    <span className="text-[9px] font-bold bg-[#D04D4D] text-white px-1.5 py-0.5 rounded">Bottleneck</span>
                  </div>
                  <div className="text-[11px] text-[#555] mb-1">{bottleneck.totalKendaraan} kendaraan dalam proses</div>
                  <div className="text-[11px] text-[#D04D4D] font-medium mb-2">{bottleneck.overtimeCount} kendaraan overtime</div>
                  <div className="h-1.5 rounded-full bg-[#FFE0E0] overflow-hidden">
                    <div className="h-full rounded-full bg-[#D04D4D]" style={{ width: `${Math.min(bottleneck.overtimePercent, 100)}%` }} />
                  </div>
                  <div className="mt-1 text-[10px] text-[#D04D4D] font-semibold">{bottleneck.overtimePercent}% overtime</div>
                  <div className="mt-1 text-[10px] text-[#888]">Kapasitas ideal: {bottleneck.capacityIdeal}</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4 rounded-xl border border-[#6FD4AC] bg-[#EDFAF4]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D6E4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
                  </svg>
                  <span className="text-[12px] font-semibold text-[#0D6E4F]">Operasional Sehat</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Kendaraan Terlama ────────────────────────────── */}
        {activeTab === 'kendaraan' && (
          <div className="px-3 pb-3">
            <div className="bg-white rounded-xl border border-[#E8E8E4] p-4">
              <h2 className="text-[13px] font-bold text-[#1a1a1a] mb-3">Kendaraan Terlama</h2>
              {loading ? (
                <div className="text-center py-6 text-[#bbb] text-[11px]">Memuat...</div>
              ) : oldestVehicles.length === 0 ? (
                <MobileEmptyState />
              ) : (
                <div className="space-y-2">
                  {oldestVehicles.map((v) => (
                    <div
                      key={v.id}
                      className={`rounded-xl border p-3 ${v.isOvertime ? 'border-[#FFC5C5] bg-[#FFF5F5]' : 'border-[#E8E8E4] bg-white'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-[#bbb] w-5 flex-shrink-0">#{v.rank}</span>
                          <div className="min-w-0">
                            <div className="font-bold text-[12px] text-[#1a1a1a] tracking-wide">{v.plateNumber}</div>
                            <div className="text-[11px] text-[#555] truncate">{v.vehicleName} · {v.packageName}</div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className={`text-[13px] font-bold ${v.isOvertime ? 'text-[#D04D4D]' : 'text-[#1a1a1a]'}`}>
                            {formatDurasi(v.totalDurasiMenit)}
                          </div>
                          <div className="flex items-center gap-1 justify-end mt-0.5">
                            <StatusBadge status={v.currentStatus} />
                            {v.isOvertime && (
                              <span className="text-[9px] font-bold bg-[#D04D4D] text-white px-1 py-0.5 rounded">OT</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Ringkasan Per Tahap (Kanban) ─────────────────── */}
        {activeTab === 'kanban' && (
          <div className="px-3 pb-3 space-y-3">
            {loading ? (
              <div className="text-center py-8 text-[#bbb] text-[11px]">Memuat...</div>
            ) : hasNoActive ? (
              <div className="bg-white rounded-xl border border-[#E8E8E4] p-6">
                <MobileEmptyState />
              </div>
            ) : (
              stageSummary.map((stage) => {
                const isExpanded = expandedStages[stage.stage];
                const displayVehicles = isExpanded ? stage.vehicles : stage.vehicles.slice(0, 5);
                const hasMore = stage.vehicles.length > 5;

                return (
                  <div key={stage.stage} className={`rounded-xl border p-3 ${STAGE_BG[stage.stage] ?? 'border-[#E8E8E4] bg-white'}`}>
                    {/* Stage header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[12px] font-bold ${STAGE_TEXT[stage.stage] ?? 'text-[#555]'}`}>
                        {stage.label}
                      </span>
                      <span className={`text-[11px] font-semibold bg-white/70 px-2 py-0.5 rounded-full ${STAGE_TEXT[stage.stage] ?? 'text-[#555]'}`}>
                        {stage.total}
                      </span>
                    </div>

                    {stage.total === 0 ? (
                      <div className="text-[10px] text-[#bbb] py-1">Tidak ada kendaraan</div>
                    ) : (
                      <div className="space-y-1.5">
                        {displayVehicles.map((v) => {
                          const isOT = v.stageStatus === 'overtime';
                          const isHampir = v.stageStatus === 'hampir_ot';
                          return (
                            <div
                              key={v.id}
                              className={`rounded-lg border p-2.5 bg-white text-[11px] ${isOT ? 'border-[#FFC5C5]' : isHampir ? 'border-[#FFE0A0]' : 'border-[#E8E8E4]'}`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-[#1a1a1a] tracking-wide">{v.plateNumber}</span>
                                <div className="flex gap-1">
                                  {isOT && <span className="text-[9px] font-bold bg-[#D04D4D] text-white px-1 py-0.5 rounded">OT</span>}
                                  {isHampir && !isOT && <span className="text-[9px] font-bold bg-[#E06520] text-white px-1 py-0.5 rounded">~OT</span>}
                                </div>
                              </div>
                              <div className="text-[#555] truncate">{v.vehicleName} · {v.packageName}</div>
                              <div className={`font-semibold mt-0.5 ${isOT ? 'text-[#D04D4D]' : isHampir ? 'text-[#E06520]' : 'text-[#888]'}`}>
                                {formatDurasi(v.durasiMasukMenit)}
                              </div>
                            </div>
                          );
                        })}

                        {hasMore && (
                          <button
                            onClick={() => toggleExpand(stage.stage)}
                            className={`w-full text-[10px] font-medium py-1.5 rounded-lg border border-current/20 hover:bg-white/60 text-center ${STAGE_TEXT[stage.stage] ?? 'text-[#555]'}`}
                          >
                            {isExpanded ? 'Tampilkan lebih sedikit ↑' : `Lihat semua (${stage.vehicles.length - 5} lagi) →`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div className="text-[10px] text-[#bbb] text-center pb-2">
              OT = Overtime (melebihi SOP) &bull; ~OT = Hampir Overtime
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="p-3 pt-0 flex gap-2">
          <button
            onClick={() => navigate('/report')}
            className="flex-1 py-2.5 rounded-xl border border-[#E8E8E4] bg-white text-[12px] font-medium text-[#555] hover:bg-[#F5F5F0] transition-colors"
          >
            Laporan & Analitik
          </button>
          <button
            onClick={handleLogout}
            className="py-2.5 px-4 rounded-xl border border-[#FFD5D5] bg-white text-[12px] font-medium text-[#D04D4D] hover:bg-[#FFF5F5] transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileEmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2z"/>
        <path d="M9 17v2M15 17v2M3 11h18"/>
      </svg>
      <p className="text-[12px] text-[#bbb]">Tidak ada kendaraan dalam proses saat ini.</p>
    </div>
  );
}
