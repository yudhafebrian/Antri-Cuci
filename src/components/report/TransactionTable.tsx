/**
 * TransactionTable.tsx
 * Tabel Transaksi Terbaru dengan pagination 20 rows.
 */

import { type RecentTransaction, formatRpFull, formatMinutesToHM } from '../../lib/reportService';
import { STAGE_CFG } from '../../lib/constants';

interface TransactionTableProps {
  rows: RecentTransaction[];
  total: number;
  page: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  /** Mobile card-list mode instead of full table */
  mobile?: boolean;
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function TransactionTable({
  rows,
  total,
  page,
  pageSize = 20,
  onPageChange,
  loading = false,
  mobile = false,
}: TransactionTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);

  // ── Mobile card-list view ──────────────────────────────────────────────────
  if (mobile) {
    return (
      <div className="bg-white rounded-xl border border-[#E8E8E4] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#E8E8E4] flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#1a1a1a]">Transaksi Terbaru</span>
          {total > 0 && (
            <span className="text-[11px] text-[#888]">{start}–{end} / {total}</span>
          )}
        </div>

        {/* Cards */}
        {loading && (
          <div className="py-8 text-center text-[12px] text-[#888]">Memuat data...</div>
        )}
        {!loading && rows.length === 0 && (
          <div className="py-10 text-center">
            <div className="text-[24px] mb-1">🧾</div>
            <div className="text-[12px] text-[#888]">Belum ada transaksi untuk periode ini</div>
          </div>
        )}
        {!loading && rows.map((row, i) => {
          const statusCfg = STAGE_CFG[row.status as keyof typeof STAGE_CFG];
          const rowNum = start + i;
          return (
            <div key={row.id} className="px-4 py-3 border-b border-[#F5F5F0] last:border-0">
              {/* Row 1: number + plate + queue number + status */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] text-[#bbb] w-5 flex-shrink-0">{rowNum}</span>
                  <span className="font-bold text-[12px] text-[#1a1a1a] tracking-wide">{row.plateNumber}</span>
                  {row.queueNumber && (
                    <span className="text-[10px] font-mono font-semibold text-[#185FA5] bg-[#EDF5FF] px-1.5 py-0.5 rounded">
                      #{String(row.queueNumber).padStart(4, '0')}
                    </span>
                  )}
                </div>
                {statusCfg ? (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                    style={{ backgroundColor: statusCfg.badgeBg, color: statusCfg.badgeColor }}
                  >
                    {statusCfg.label}
                  </span>
                ) : (
                  <span className="text-[10px] text-[#888] flex-shrink-0">{row.status}</span>
                )}
              </div>
              {/* Row 2: vehicle + package */}
              <div className="flex items-center gap-1 text-[11px] text-[#555] mb-1 ml-7">
                <span className="truncate max-w-[100px]">{row.vehicleName}</span>
                <span className="text-[#ccc]">·</span>
                <span className="truncate flex-1">{row.packageName}</span>
                {row.variantName && (
                  <>
                    <span className="text-[#ccc]">·</span>
                    <span className="text-[#888] truncate">{row.variantName}</span>
                  </>
                )}
              </div>
              {/* Row 3: price + times + duration */}
              <div className="flex items-center gap-3 ml-7 text-[11px]">
                <span className="font-semibold text-[#1a1a1a]">{formatRpFull(row.packagePrice)}</span>
                <span className="text-[#888]">{formatTime(row.jamMasuk)} → {formatTime(row.jamSelesai)}</span>
                {row.durationMinutes != null && (
                  <span className="text-[#888]">{formatMinutesToHM(row.durationMinutes)}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[#E8E8E4] flex items-center justify-between">
            <div className="text-[11px] text-[#888]">{page} / {totalPages}</div>
            <div className="flex items-center gap-1">
              <PagButton onClick={() => onPageChange(page - 1)} disabled={page === 1} label="‹" />
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) p = i + 1;
                else if (page <= 3) p = i + 1;
                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                else p = page - 2 + i;
                return (
                  <button key={p} onClick={() => onPageChange(p)}
                    className={`w-7 h-7 rounded text-[11px] font-medium transition-colors ${p === page ? 'bg-[#185FA5] text-white' : 'text-[#555] hover:bg-[#F5F5F0]'}`}>
                    {p}
                  </button>
                );
              })}
              <PagButton onClick={() => onPageChange(page + 1)} disabled={page === totalPages} label="›" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Desktop table view ─────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-[#E8E8E4] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-[#E8E8E4] flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#1a1a1a]">Transaksi Selesai Terbaru</span>
        {total > 0 && (
          <span className="text-[11px] text-[#888]">
            {start}–{end} dari {total} transaksi
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-[#FAFAF8] border-b border-[#E8E8E4]">
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#888] whitespace-nowrap">No.</th>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[#888] whitespace-nowrap">No. Antrian</th>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[#888] whitespace-nowrap">Plat Nomor</th>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[#888]">Kendaraan</th>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[#888]">Paket</th>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[#888]">Variant</th>
              <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-[#888] whitespace-nowrap">Harga</th>
              <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-[#888] whitespace-nowrap">Jam Masuk</th>
              <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-[#888] whitespace-nowrap">Jam Selesai</th>
              <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-[#888]">Durasi</th>
              <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-[#888]">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={11} className="text-center py-10 text-[#888]">
                  Memuat data...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-[28px]">🧾</div>
                    <div className="text-[13px] text-[#888]">Belum ada transaksi untuk periode ini</div>
                  </div>
                </td>
              </tr>
            )}
            {!loading && rows.map((row, i) => {
              const statusCfg = STAGE_CFG[row.status as keyof typeof STAGE_CFG];
              const rowNum = start + i;

              return (
                <tr
                  key={row.id}
                  className="border-b border-[#F5F5F0] hover:bg-[#FAFAF8] transition-colors"
                >
                  <td className="px-4 py-2.5 text-[#888]">{rowNum}</td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono font-semibold text-[#185FA5]">
                      {row.queueNumber ? String(row.queueNumber).padStart(4, '0') : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-semibold text-[#1a1a1a] font-mono tracking-wide">
                      {row.plateNumber}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[#333] max-w-[120px] truncate">{row.vehicleName}</td>
                  <td className="px-3 py-2.5 text-[#333] max-w-[140px] truncate">{row.packageName}</td>
                  <td className="px-3 py-2.5 text-[#555]">{row.variantName || '—'}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-[#1a1a1a] whitespace-nowrap">
                    {formatRpFull(row.packagePrice)}
                  </td>
                  <td className="px-3 py-2.5 text-center text-[#555]">{formatTime(row.jamMasuk)}</td>
                  <td className="px-3 py-2.5 text-center text-[#555]">{formatTime(row.jamSelesai)}</td>
                  <td className="px-3 py-2.5 text-center text-[#555]">
                    {row.durationMinutes != null ? formatMinutesToHM(row.durationMinutes) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {statusCfg ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ backgroundColor: statusCfg.badgeBg, color: statusCfg.badgeColor }}
                      >
                        {statusCfg.label}
                      </span>
                    ) : (
                      <span className="text-[#888]">{row.status}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-[#E8E8E4] flex items-center justify-between">
          <div className="text-[11px] text-[#888]">
            Halaman {page} dari {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <PagButton
              onClick={() => onPageChange(1)}
              disabled={page === 1}
              label="«"
            />
            <PagButton
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              label="‹"
            />

            {/* Page number pills */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) {
                p = i + 1;
              } else if (page <= 3) {
                p = i + 1;
              } else if (page >= totalPages - 2) {
                p = totalPages - 4 + i;
              } else {
                p = page - 2 + i;
              }
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`w-7 h-7 rounded text-[11px] font-medium transition-colors ${
                    p === page
                      ? 'bg-[#185FA5] text-white'
                      : 'text-[#555] hover:bg-[#F5F5F0]'
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <PagButton
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              label="›"
            />
            <PagButton
              onClick={() => onPageChange(totalPages)}
              disabled={page === totalPages}
              label="»"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PagButton({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-7 h-7 rounded text-[12px] font-medium transition-colors ${
        disabled
          ? 'text-[#ccc] cursor-not-allowed'
          : 'text-[#555] hover:bg-[#F5F5F0]'
      }`}
    >
      {label}
    </button>
  );
}
