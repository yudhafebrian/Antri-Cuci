import { useState, useEffect, useCallback } from 'react';
import {
  type FilterPreset,
  type DateRange,
  type DashboardSummary,
  type RevenueTrendPoint,
  type TrafficPoint,
  type TopPackage,
  type TopRevenuePackage,
  type StationOvertime,
  type RecentTransaction,
  getDateRangeFromPreset,
  getPreviousPeriod,
  getTrendGranularity,
  getTrafficGrouping,
  getDashboardSummary,
  getRevenueTrend,
  getTrafficAnalysis,
  getTopPackages,
  getTopRevenuePackages,
  getOvertimeAnalysis,
  getRecentTransactions,
} from '../../lib/reportService';

export type { FilterPreset };

export interface ReportState {
  loading: boolean;
  summary: DashboardSummary | null;
  revenueTrend: RevenueTrendPoint[];
  trafficData: TrafficPoint[];
  topPackages: TopPackage[];
  topRevenuePackages: TopRevenuePackage[];
  overtimeStats: StationOvertime[];
  transactions: RecentTransaction[];
  transactionTotal: number;
  transactionPage: number;
}

const EMPTY_SUMMARY: DashboardSummary = {
  totalVehicles: 0, totalRevenue: 0, revenuePerVehicle: 0, totalOvertimeMinutes: 0,
  prevTotalVehicles: 0, prevTotalRevenue: 0, prevRevenuePerVehicle: 0, prevTotalOvertimeMinutes: 0,
};

export function useReportData() {
  const [filter, setFilter]           = useState<FilterPreset>('7_hari');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd]     = useState<string>('');
  const [transactionPage, setTransactionPage] = useState(1);

  const [state, setState] = useState<ReportState>({
    loading: false,
    summary: null,
    revenueTrend: [],
    trafficData: [],
    topPackages: [],
    topRevenuePackages: [],
    overtimeStats: [],
    transactions: [],
    transactionTotal: 0,
    transactionPage: 1,
  });

  const range: DateRange = getDateRangeFromPreset(filter, customStart, customEnd);
  const prevRange: DateRange = getPreviousPeriod(range);

  const fetchAll = useCallback(async (page = 1) => {
    setState((s) => ({ ...s, loading: true }));

    const r     = getDateRangeFromPreset(filter, customStart, customEnd);
    const prevR = getPreviousPeriod(r);
    const trendGranularity   = getTrendGranularity(r);
    const trafficGrouping    = getTrafficGrouping(r);

    try {
      const [summary, revenueTrend, trafficData, topPackages, topRevenuePackages, overtimeStats, transactions] =
        await Promise.all([
          getDashboardSummary(r, prevR),
          getRevenueTrend(r, trendGranularity),
          getTrafficAnalysis(r, trafficGrouping),
          getTopPackages(r),
          getTopRevenuePackages(r),
          getOvertimeAnalysis(r, prevR),
          getRecentTransactions(r, page),
        ]);

      setState({
        loading: false,
        summary,
        revenueTrend,
        trafficData,
        topPackages,
        topRevenuePackages,
        overtimeStats,
        transactions: transactions.rows,
        transactionTotal: transactions.total,
        transactionPage: page,
      });
    } catch (err) {
      console.error('[useReportData] fetch error', err);
      setState((s) => ({
        ...s,
        loading: false,
        summary: s.summary ?? EMPTY_SUMMARY,
      }));
    }
  }, [filter, customStart, customEnd]);

  // Refetch when filter changes, reset to page 1
  useEffect(() => {
    setTransactionPage(1);
    fetchAll(1);
  }, [fetchAll]);

  const goToPage = useCallback((page: number) => {
    setTransactionPage(page);
    fetchAll(page);
  }, [fetchAll]);

  return {
    // Filter state
    filter,
    setFilter,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    // Computed ranges (for display)
    range,
    prevRange,
    // Data
    ...state,
    transactionPage,
    goToPage,
    refresh: () => fetchAll(transactionPage),
  };
}
