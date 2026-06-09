/**
 * ReportMobile.tsx
 * Halaman Laporan & Analitik — Mobile layout (max-w-[430px]).
 * Single-column, compact KPI cards, mobile-optimized charts, card-list transactions.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KPICard from './KPICard';
import RevenueTrendChart from './RevenueTrendChart';
import TrafficChart from './TrafficChart';
import DonutPaketChart from './DonutPaketChart';
import RevenueBarChart from './RevenueBarChart';
import OvertimeCard from './OvertimeCard';
import TransactionTable from './TransactionTable';
import { useReportData, type FilterPreset } from './useReportData';
import { calcGrowthPercent, formatMinutesToHM } from '../../lib/reportService';

const FILTER_PRESETS: { value: FilterPreset; label: string }[] = [
  { value: 'hari_ini',   label: 'Hari Ini' },
  { value: 'kemarin',    label: 'Kemarin' },
  { value: '7_hari',     label: '7 Hari' },
  { value: '30_hari',    label: '30 Hari' },
  { value: 'bulan_ini',  label: 'Bulan Ini' },
  { value: 'custom',     label: 'Custom' },
];

export default function ReportMobile() {
  const navigate = useNavigate();
  const [customInputStart, setCustomInputStart] = useState('');
  const [customInputEnd, setCustomInputEnd] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const {
    filter, setFilter,
    setCustomStart,
    setCustomEnd,
    range,
    loading,
    summary,
    revenueTrend,
    trafficData,
    topPackages,
    topRevenuePackages,
    overtimeStats,
    transactions,
    transactionTotal,
    transactionPage,
    goToPage,
    refresh,
  } = useReportData();

  function handleFilterClick(preset: FilterPreset) {
    if (preset === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
      setFilter(preset);
    }
  }

  function applyCustomRange() {
    if (!customInputStart || !customInputEnd) return;
    setCustomStart(new Date(customInputStart + 'T00:00:00').toISOString());
    setCustomEnd(new Date(customInputEnd + 'T23:59:59').toISOString());
    setFilter('custom');
    setShowCustomPicker(false);
  }

  const vehicleGrowth            = summary ? calcGrowthPercent(summary.totalVehicles,       summary.prevTotalVehicles)       : null;
  const revenueGrowth            = summary ? calcGrowthPercent(summary.totalRevenue,         summary.prevTotalRevenue)         : null;
  const revenuePerVehicleGrowth  = summary ? calcGrowthPercent(summary.revenuePerVehicle,    summary.prevRevenuePerVehicle)    : null;
  const overtimeGrowth           = summary ? calcGrowthPercent(summary.totalOvertimeMinutes, summary.prevTotalOvertimeMinutes) : null;

  if (loading && !summary) {
    return (
      <div className="w-full max-w-[430px] mx-auto min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <div className="text-[#888] text-[13px]">Memuat data laporan...</div>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-[430px] mx-auto min-h-screen bg-[#F5F5F0] flex flex-col"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* ── Sticky Header ───────────────────────────────────────── */}
      <div className="bg-white border-b border-[#E8E8E4] px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-bold text-[#1a1a1a] leading-tight">Laporan & Analitik</h1>
            <button
              onClick={() => navigate('/report/active-queue')}
              className="text-[10px] text-[#185FA5] font-medium"
            >
              Antrian Aktif →
            </button>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E8E4] text-[12px] text-[#555] hover:bg-[#F5F5F0] disabled:opacity-50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin' : ''}>
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Loading bar */}
      {loading && <div className="h-0.5 bg-[#185FA5] animate-pulse" />}

      {/* ── Filter Bar ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#E8E8E4] px-4 py-2.5">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {FILTER_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => handleFilterClick(p.value)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                filter === p.value
                  ? 'bg-[#185FA5] text-white'
                  : 'text-[#555] border border-[#E8E8E4] hover:bg-[#F5F5F0] bg-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {showCustomPicker && (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="date"
              value={customInputStart}
              onChange={(e) => setCustomInputStart(e.target.value)}
              className="text-[11px] px-2 py-1.5 border border-[#E8E8E4] rounded-lg flex-1 min-w-0"
            />
            <span className="text-[11px] text-[#888] flex-shrink-0">–</span>
            <input
              type="date"
              value={customInputEnd}
              min={customInputStart}
              onChange={(e) => setCustomInputEnd(e.target.value)}
              className="text-[11px] px-2 py-1.5 border border-[#E8E8E4] rounded-lg flex-1 min-w-0"
            />
            <button
              onClick={applyCustomRange}
              disabled={!customInputStart || !customInputEnd}
              className="px-3 py-1.5 bg-[#185FA5] text-white text-[11px] font-medium rounded-lg disabled:opacity-40 flex-shrink-0"
            >
              OK
            </button>
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="flex-1 p-3 space-y-3">

        {/* KPI Cards — 2×2 compact grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <KPICard
            compact
            label="Total Kendaraan"
            value={loading ? '—' : (summary?.totalVehicles ?? 0)}
            growth={loading ? null : vehicleGrowth}
            isCurrency={false}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2z"/>
                <path d="M9 17v2M15 17v2M3 11h18"/>
              </svg>
            }
            iconBgColor="bg-[#EDF5FF]"
          />
          <KPICard
            compact
            label="Total Revenue"
            value={loading ? '—' : (summary?.totalRevenue ?? 0)}
            growth={loading ? null : revenueGrowth}
            isCurrency={!loading}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
              </svg>
            }
            iconBgColor="bg-[#D4F5E9]"
          />
          <KPICard
            compact
            label="Rata-rata/Kendaraan"
            value={loading ? '—' : (summary?.revenuePerVehicle ?? 0)}
            growth={loading ? null : revenuePerVehicleGrowth}
            isCurrency={!loading}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B44E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            }
            iconBgColor="bg-[#F0E6FB]"
          />
          <KPICard
            compact
            label="Jumlah Overtime"
            value={loading ? '—' : formatMinutesToHM(summary?.totalOvertimeMinutes ?? 0)}
            growth={loading ? null : overtimeGrowth}
            isCurrency={false}
            invertGrowth={true}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E06520" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            }
            iconBgColor="bg-[#FFE8D6]"
          />
        </div>

        {/* Trend Revenue */}
        <div className="bg-white rounded-xl border border-[#E8E8E4] p-3" style={{ height: 220 }}>
          <RevenueTrendChart data={revenueTrend} />
        </div>

        {/* Traffic */}
        <div className="bg-white rounded-xl border border-[#E8E8E4] p-3" style={{ height: 200 }}>
          <TrafficChart data={trafficData} range={range} />
        </div>

        {/* Donut Paket */}
        <div className="bg-white rounded-xl border border-[#E8E8E4] p-3" style={{ minHeight: 240 }}>
          <DonutPaketChart data={topPackages} />
        </div>

        {/* Revenue Bar */}
        <div className="bg-white rounded-xl border border-[#E8E8E4] p-3" style={{ minHeight: 200 }}>
          <RevenueBarChart data={topRevenuePackages} />
        </div>

        {/* Overtime per Station — 2×2 grid di mobile */}
        <OvertimeCard stats={overtimeStats} mobile />

        {/* Transaksi — card-list di mobile */}
        <TransactionTable
          rows={transactions}
          total={transactionTotal}
          page={transactionPage}
          pageSize={10}
          onPageChange={goToPage}
          loading={loading}
          mobile
        />

      </div>
    </div>
  );
}
