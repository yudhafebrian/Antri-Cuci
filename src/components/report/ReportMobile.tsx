import KPICard from './KPICard';
import TrendChart from './TrendChart';
import PaketBarChart from './PaketBarChart';
import CalendarPerformance from './CalendarPerformance';
import ReportHeader from './ReportHeader';
import ReportFilterBar from './ReportFilterBar';
import OvertimeCard from './OvertimeCard';
import { useReportData } from './useReportData';

export default function ReportMobile() {
  const {
    filter, setFilter, customStart, setCustomStart, customEnd, setCustomEnd,
    month, setMonth, year, setYear,
    loading, kpis, trendData, paketBreakdown, calendarData, overtimeStats,
  } = useReportData();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <div className="text-[#888]">Memuat data report...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[430px] mx-auto min-h-screen bg-[#F5F5F0]">
      <ReportHeader />
      <ReportFilterBar
        filter={filter}
        setFilter={setFilter}
        month={month}
        setMonth={setMonth}
        year={year}
        setYear={setYear}
        customStart={customStart}
        setCustomStart={setCustomStart}
        customEnd={customEnd}
        setCustomEnd={setCustomEnd}
      />
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <KPICard label="Total Kendaraan"   value={kpis.totalVehicles}      growth={kpis.vehicleGrowth}  icon="🚗" />
          <KPICard label="Total Revenue"     value={kpis.totalRevenue}        growth={kpis.revenueGrowth}  icon="💰" />
          <KPICard label="Paket Terlaris"    value={kpis.bestPackage}         growth={null}                icon="🏆" />
          <KPICard label="Paket Tercuan"     value={kpis.mostRevenuePackage}  growth={null}                icon="💎" />
          <KPICard label="Jam Paling Ramai"  value={kpis.busiestHour}         growth={null}                icon="🕐" />
          <KPICard label="Hari Paling Ramai" value={kpis.busiestDay}          growth={null}                icon="📅" />
        </div>

        <div className="space-y-2">
          <TrendChart data={trendData} />
          <PaketBarChart data={paketBreakdown} title="Paket Terlaris"    valueKey="count" />
          <PaketBarChart data={paketBreakdown} title="Revenue per Paket" valueKey="revenue" />
        </div>

        <OvertimeCard stats={overtimeStats} />

        <CalendarPerformance data={calendarData} month={month} year={year} />
      </div>
    </div>
  );
}
