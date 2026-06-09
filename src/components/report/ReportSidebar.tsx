/**
 * ReportSidebar.tsx
 * Sidebar navigasi untuk Laporan & Analitik.
 * Laporan & Analitik = aktif. Antrian Aktif = clickable navigasi ke /report/active-queue.
 */

import { useNavigate } from 'react-router-dom';
import { getSession } from '../../lib/auth';

export default function ReportSidebar() {
  const navigate = useNavigate();
  const session = getSession();
  const displayName = session?.displayName || 'Owner';

  return (
    <aside
      className="flex flex-col w-[220px] min-w-[220px] min-h-screen bg-white border-r border-[#E8E8E4] select-none"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#E8E8E4]">
        <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center overflow-hidden flex-shrink-0">
          <img
            src="/Logo-FIP-Black-Transparent-NoText.webp"
            alt="FIP Autoshop"
            className="w-8 h-8 object-contain invert"
          />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-[#1a1a1a] leading-tight truncate">FIP AUTOSHOP</div>
          <div className="text-[10px] text-[#888] leading-tight">PREMIUM CAR WASH</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {/* Ringkasan */}
        <div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium cursor-default text-[#555] opacity-60">
              <HomeIcon size={16} className="text-[#888]" />
              <span>Ringkasan</span>
            </div>
          </div>
        </div>

        {/* TRANSAKSI */}
        <div>
          <div className="text-[10px] font-semibold text-[#aaa] tracking-widest px-2 mb-1 mt-1">TRANSAKSI</div>
          <div className="space-y-0.5">
            {/* Antrian Aktif — clickable, navigasi ke active queue */}
            <button
              onClick={() => navigate('/report/active-queue')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-left text-[#555] hover:bg-[#F5F5F0] transition-colors"
            >
              <ListIcon size={16} className="text-[#888]" />
              <span>Antrian Aktif</span>
            </button>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium cursor-default text-[#555] opacity-60">
              <ClockIcon size={16} className="text-[#888]" />
              <span>Riwayat Transaksi</span>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium cursor-default text-[#555] opacity-60">
              <PlusIcon size={16} className="text-[#888]" />
              <span>Tambah Kendaraan</span>
            </div>
          </div>
        </div>

        {/* MASTER DATA */}
        <div>
          <div className="text-[10px] font-semibold text-[#aaa] tracking-widest px-2 mb-1 mt-1">MASTER DATA</div>
          <div className="space-y-0.5">
            {[
              { icon: CarIcon, label: 'Kendaraan' },
              { icon: TagIcon, label: 'Paket & Harga' },
              { icon: UserIcon, label: 'Pelanggan' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium cursor-default text-[#555] opacity-60">
                <item.icon size={16} className="text-[#888]" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* LAPORAN */}
        <div>
          <div className="text-[10px] font-semibold text-[#aaa] tracking-widest px-2 mb-1 mt-1">LAPORAN</div>
          <div className="space-y-0.5">
            {/* Laporan & Analitik — active */}
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium bg-[#EDF5FF] text-[#185FA5]">
              <BarChartIcon size={16} className="text-[#185FA5]" />
              <span>Laporan & Analitik</span>
            </div>
            {/* Export Data — visual only */}
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium cursor-default text-[#555] opacity-60">
              <ExportIcon size={16} className="text-[#888]" />
              <span>Export Data</span>
            </div>
          </div>
        </div>

        {/* PENGATURAN */}
        <div>
          <div className="text-[10px] font-semibold text-[#aaa] tracking-widest px-2 mb-1 mt-1">PENGATURAN</div>
          <div className="space-y-0.5">
            {[
              { icon: ShieldIcon, label: 'User & Admin' },
              { icon: BuildingIcon, label: 'Pengaturan Outlet' },
              { icon: WorkflowIcon, label: 'SOP & Workflow' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium cursor-default text-[#555] opacity-60">
                <item.icon size={16} className="text-[#888]" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* User pill at bottom */}
      <div className="px-4 py-4 border-t border-[#E8E8E4]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#185FA5] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-[#1a1a1a] truncate">{displayName}</div>
            <div className="text-[10px] text-[#888]">FIP Autoshop</div>
          </div>
          <ChevronIcon size={14} className="text-[#bbb] flex-shrink-0" />
        </div>
      </div>
    </aside>
  );
}

// ── Inline SVG icon components ────────────────────────────────────────────────

function HomeIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

function ListIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/>
      <line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>
    </svg>
  );
}

function ClockIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function PlusIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/>
    </svg>
  );
}

function CarIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2z"/>
      <path d="M9 17v2M15 17v2M3 11h18"/>
      <path d="M7 7 5.5 3.5M17 7l1.5-3.5"/>
    </svg>
  );
}

function TagIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/>
      <circle cx="7.5" cy="7.5" r="0.5" fill="currentColor"/>
    </svg>
  );
}

function UserIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function BarChartIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>
    </svg>
  );
}

function ShieldIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

function BuildingIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>
    </svg>
  );
}

function WorkflowIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/>
      <rect width="8" height="8" x="13" y="13" rx="2"/>
    </svg>
  );
}

function ExportIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
    </svg>
  );
}

function ChevronIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
