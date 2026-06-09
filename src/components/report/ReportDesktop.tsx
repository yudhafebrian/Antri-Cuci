/**
 * ReportDesktop.tsx
 * Halaman Laporan & Analitik — Owner Dashboard.
 * Layout: Sidebar kiri (dummy) + main content area.
 *
 * Sections:
 *  1. Header + Filter bar
 *  2. KPI Cards (4 kolom)
 *  3. Section 1: Trend Revenue | Traffic Chart (2 kolom)
 *  4. Section 2: Donut Paket | Revenue Bar | Overtime Cards (3 kolom)
 *  5. Section 4: Transaction Table
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReportData, type FilterPreset } from './useReportData';
import ReportSidebar from './ReportSidebar';
import KPICard from './KPICard';
import RevenueTrendChart from './RevenueTrendChart';
import TrafficChart from './TrafficChart';
import DonutPaketChart from './DonutPaketChart';
import RevenueBarChart from './RevenueBarChart';
import OvertimeCard from './OvertimeCard';
import TransactionTable from './TransactionTable';
import {
  calcGrowthPercent,
  formatMinutesToHM,
  getFilterLabel,
  getDateRangeFromPreset,
  formatRpFull,
} from '../../lib/reportService';
import { getSession } from '../../lib/auth';

const FILTER_PRESETS: { value: FilterPreset; label: string }[] = [
  { value: 'hari_ini',   label: 'Hari Ini' },
  { value: 'kemarin',    label: 'Kemarin' },
  { value: '7_hari',     label: '7 Hari' },
  { value: '30_hari',    label: '30 Hari' },
  { value: 'bulan_ini',  label: 'Bulan Ini' },
  { value: 'bulan_lalu', label: 'Bulan Lalu' },
  { value: 'tahun_ini',  label: 'Tahun Ini' },
  { value: 'custom',     label: 'Custom' },
];

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth() && s.getDate() === e.getDate()) {
    return `${s.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()}`;
  }
  return `${s.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
}

export default function ReportDesktop() {
  const navigate = useNavigate();
  const session = getSession();
  const [customInputStart, setCustomInputStart] = useState('');
  const [customInputEnd, setCustomInputEnd]     = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const {
    filter, setFilter,
    customStart, setCustomStart,
    customEnd, setCustomEnd,
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

  function handleLogout() {
    sessionStorage.clear();
    navigate('/admin');
  }

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

  const vehicleGrowth = summary
    ? calcGrowthPercent(summary.totalVehicles, summary.prevTotalVehicles)
    : null;
  const revenueGrowth = summary
    ? calcGrowthPercent(summary.totalRevenue, summary.prevTotalRevenue)
    : null;
  const revenuePerVehicleGrowth = summary
    ? calcGrowthPercent(summary.revenuePerVehicle, summary.prevRevenuePerVehicle)
    : null;
  const overtimeGrowth = summary
    ? calcGrowthPercent(summary.totalOvertimeMinutes, summary.prevTotalOvertimeMinutes)
    : null;

  const dateRangeLabel = formatDateRange(range.start, range.end);

  return (
    <div className="flex min-h-screen bg-[#F5F5F0]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <ReportSidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="bg-white border-b border-[#E8E8E4] px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Bar chart icon */}
            <div className="w-8 h-8 rounded-lg bg-[#EDF5FF] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>
              </svg>
            </div>
            <div>
              <h1 className="text-[16px] font-bold text-[#1a1a1a] leading-tight">Laporan & Analitik</h1>
              <p className="text-[11px] text-[#888]">Pantau performa bisnis Anda secara real-time</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Date range display */}
            <div className="flex items-center gap-1.5 text-[12px] text-[#555] border border-[#E8E8E4] rounded-lg px-3 py-1.5 bg-white">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
              <span className="font-medium">{dateRangeLabel}</span>
            </div>

            {/* Refresh */}
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[#555] border border-[#E8E8E4] rounded-lg hover:bg-[#F5F5F0] transition-colors disabled:opacity-50"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin' : ''}>
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              <span>Refresh</span>
            </button>

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

        {/* ── Filter Bar ───────────────────────────────────────────── */}
        <div className="bg-white border-b border-[#E8E8E4] px-6 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            {FILTER_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => handleFilterClick(p.value)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                  filter === p.value
                    ? 'bg-[#185FA5] text-white'
                    : 'text-[#555] border border-[#E8E8E4] hover:bg-[#F5F5F0] bg-white'
                }`}
              >
                {p.label}
              </button>
            ))}

            {/* Custom Range Picker */}
            {showCustomPicker && (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-[#E8E8E4]">
                <input
                  type="date"
                  value={customInputStart}
                  onChange={(e) => setCustomInputStart(e.target.value)}
                  className="text-[12px] px-2 py-1 border border-[#E8E8E4] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#185FA5]"
                />
                <span className="text-[12px] text-[#888]">–</span>
                <input
                  type="date"
                  value={customInputEnd}
                  min={customInputStart}
                  onChange={(e) => setCustomInputEnd(e.target.value)}
                  className="text-[12px] px-2 py-1 border border-[#E8E8E4] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#185FA5]"
                />
                <button
                  onClick={applyCustomRange}
                  disabled={!customInputStart || !customInputEnd}
                  className="px-3 py-1.5 bg-[#185FA5] text-white text-[12px] font-medium rounded-lg hover:bg-[#0C447C] transition-colors disabled:opacity-40"
                >
                  Terapkan
                </button>
                <button
                  onClick={() => setShowCustomPicker(false)}
                  className="text-[12px] text-[#888] hover:text-[#555]"
                >
                  Batal
                </button>
              </div>
            )}

            {filter === 'custom' && customStart && !showCustomPicker && (
              <span className="text-[11px] text-[#888] ml-1">
                {formatDateRange(customStart, customEnd)}
              </span>
            )}
          </div>
        </div>

        {/* ── Main Content ─────────────────────────────────────────── */}
        <div className="flex-1 p-5 space-y-4">

          {/* Loading overlay indicator */}
          {loading && (
            <div className="fixed top-0 left-0 right-0 h-0.5 bg-[#185FA5] animate-pulse z-30" />
          )}

          {/* ── KPI Cards ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total Kendaraan */}
            <KPICard
              label="Total Kendaraan"
              value={loading ? '—' : (summary?.totalVehicles ?? 0)}
              growth={loading ? null : vehicleGrowth}
              isCurrency={false}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2z"/>
                  <path d="M9 17v2M15 17v2M3 11h18"/>
                  <path d="M7 7 5.5 3.5M17 7l1.5-3.5"/>
                </svg>
              }
              iconBgColor="bg-[#EDF5FF]"
            />

            {/* Total Revenue */}
            <KPICard
              label="Total Revenue"
              value={loading ? '—' : (summary?.totalRevenue ?? 0)}
              growth={loading ? null : revenueGrowth}
              isCurrency={!loading}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
                </svg>
              }
              iconBgColor="bg-[#D4F5E9]"
            />

            {/* Rata-rata per Kendaraan */}
            <KPICard
              label="Rata-rata per Kendaraan"
              value={loading ? '—' : (summary?.revenuePerVehicle ?? 0)}
              growth={loading ? null : revenuePerVehicleGrowth}
              isCurrency={!loading}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B44E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              }
              iconBgColor="bg-[#F0E6FB]"
            />

            {/* Jumlah Overtime */}
            <KPICard
              label="Jumlah Overtime"
              value={loading ? '—' : formatMinutesToHM(summary?.totalOvertimeMinutes ?? 0)}
              growth={loading ? null : overtimeGrowth}
              isCurrency={false}
              invertGrowth={true}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E06520" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              }
              iconBgColor="bg-[#FFE8D6]"
            />
          </div>

          {/* ── Section 1: Trend + Traffic ───────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" style={{ minHeight: 300 }}>
            <RevenueTrendChart data={revenueTrend} />
            <TrafficChart data={trafficData} range={range} />
          </div>

          {/* ── Section 2: Package Charts (2 kolom) ──────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3" style={{ minHeight: 260 }}>
            <DonutPaketChart data={topPackages} />
            <RevenueBarChart data={topRevenuePackages} />
          </div>

          {/* ── Section 3: Overtime per Station (full width) ─────── */}
          <OvertimeCard stats={overtimeStats} />

          {/* ── Section 4: Transaction Table ─────────────────────── */}
          <TransactionTable
            rows={transactions}
            total={transactionTotal}
            page={transactionPage}
            pageSize={20}
            onPageChange={goToPage}
            loading={loading}
          />

        </div>

        {/* Footer */}
        <div className="px-6 py-3 text-center text-[11px] text-[#bbb] border-t border-[#E8E8E4] bg-white">
          FIP Autoshop — Laporan & Analitik &bull; Data diperbarui secara real-time
        </div>
      </div>
    </div>
  );
}
