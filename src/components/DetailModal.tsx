import { useEffect, useRef, useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import {
  CATEGORY_LABELS,
  TIME_LABELS,
  STAGE_CFG,
  stagesOf,
  fmtRp,
  isoToTimeInput,
  timeInputToIso,
  type WorkflowType,
  type Stage,
  type PackageCategory,
} from '../lib/constants';
import {
  updateServiceOrder,
  loadAllPackagesWithVariants,
  type ServiceOrderRow,
  type PackageRow,
  type PackageVariantRow,
} from '../lib/db';

interface Props {
  orderId: string | null;
  queue: ServiceOrderRow[];
  onClose: () => void;
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

const TL_COLORS: Record<string, string> = {
  menunggu: '#EF9F27', basah: '#378ADD', kering: '#639922',
  antri_poles: '#D44A9A', poles: '#E06520', qc: '#8B44E0', selesai: '#1D9E75',
  diambil: '#1a1a1a', cancel: '#A32D2D',
};

interface PackageGroup {
  category: PackageCategory;
  label: string;
  packages: PackageRow[];
}

function buildPackageGroups(packages: PackageRow[], vehicleType: string): PackageGroup[] {
  const dbVehicleType = vehicleType === 'motor' ? 'bike' : 'car';
  const grouped = new Map<PackageCategory, PackageRow[]>();
  packages
    .filter((p) => p.vehicle_type === dbVehicleType)
    .forEach((p) => {
      const cat = p.category as PackageCategory;
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(p);
    });
  return Array.from(grouped.entries()).map(([category, pkgs]) => ({
    category,
    label: CATEGORY_LABELS[category] ?? category,
    packages: pkgs,
  }));
}

export default function DetailModal({ orderId, queue, onClose, onRefresh, onToast }: Props) {
  const order = queue.find((c) => c.id === orderId) ?? null;

  const [ownerName, setOwnerName] = useState('');
  const [wa, setWa] = useState('');
  const [platDisplay, setPlatDisplay] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<PackageRow | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<PackageVariantRow | null>(null);
  const [packagePrice, setPackagePrice] = useState('');
  const [notes, setNotes] = useState('');
  const [editTimes, setEditTimes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [paketOpen, setPaketOpen] = useState(false);
  const [paketSearch, setPaketSearch] = useState('');
  const [allPackages, setAllPackages] = useState<PackageRow[]>([]);
  const [allVariants, setAllVariants] = useState<PackageVariantRow[]>([]);
  const paketRef = useRef<HTMLDivElement>(null);

  // Load packages + variants on mount
  useEffect(() => {
    loadAllPackagesWithVariants().then(({ packages, variants }) => {
      setAllPackages(packages);
      setAllVariants(variants);
    });
  }, []);

  // Populate form when order changes
  useEffect(() => {
    if (order) {
      setPlatDisplay(order.plate_number);
      setWa(order.whatsapp_number);
      setOwnerName(order.owner_name);
      setVehicleName(order.vehicle_name);
      setPackagePrice(String(order.package_price));
      setNotes(order.notes);

      const times: Record<string, string> = {};
      Object.entries(order.times).forEach(([stage, iso]) => {
        if (iso) times[stage] = isoToTimeInput(iso);
      });
      setEditTimes(times);
    }
  }, [orderId]);

  // Sync selected package/variant from order when packages are loaded
  useEffect(() => {
    if (!order || allPackages.length === 0) return;
    const pkg = allPackages.find((p) => p.id === order.package_id) ?? null;
    setSelectedPackage(pkg);
    if (order.package_variant_id) {
      const variant = allVariants.find((v) => v.id === order.package_variant_id) ?? null;
      setSelectedVariant(variant);
    } else if (pkg) {
      // Fallback: match by variant_name
      const vars = allVariants.filter((v) => v.package_id === pkg.id);
      const matched = vars.find((v) => v.variant_name === order.variant_name) ?? vars[0] ?? null;
      setSelectedVariant(matched);
    }
  }, [orderId, allPackages, allVariants]);

  useEffect(() => {
    if (orderId) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [orderId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!paketRef.current?.contains(e.target as Node)) { setPaketOpen(false); setPaketSearch(''); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!order) return null;

  const workflowType = order.workflow_type as WorkflowType;
  const stages = stagesOf(workflowType);
  const vehicleType = order.vehicle_type ?? 'mobil';
  const packageGroups = buildPackageGroups(allPackages, vehicleType);

  const filteredPaketGroups = paketSearch
    ? packageGroups.map((g) => ({
        ...g,
        packages: g.packages.filter((p) => p.name.toLowerCase().includes(paketSearch.toLowerCase())),
      })).filter((g) => g.packages.length > 0)
    : packageGroups;

  // Variants for currently selected package
  const variants = selectedPackage
    ? allVariants.filter((v) => v.package_id === selectedPackage.id)
    : [];

  const selectPackageName = (pkg: PackageRow) => {
    setSelectedPackage(pkg);
    setPaketOpen(false);
    setPaketSearch('');
    const vars = allVariants.filter((v) => v.package_id === pkg.id);
    const first = vars[0] ?? null;
    setSelectedVariant(first);
    if (first) setPackagePrice(String(first.price));
  };

  const onVariantChange = (variantId: string) => {
    const found = variants.find((v) => v.id === variantId) ?? null;
    setSelectedVariant(found);
    if (found) setPackagePrice(String(found.price));
  };

  const onTimeChange = (stage: Stage, value: string) => {
    setEditTimes((prev) => ({ ...prev, [stage]: value }));
  };

  const clearTime = (stage: Stage) => {
    setEditTimes((prev) => { const next = { ...prev }; delete next[stage]; return next; });
  };

  const save = async () => {
    setSaving(true);

    const newTimes: Record<string, string | null> = { ...order.times };
    stages.forEach((s) => {
      const timeVal = editTimes[s];
      if (timeVal) {
        const ref = order.times[s] || order.times['menunggu'] || new Date().toISOString();
        newTimes[s] = timeInputToIso(timeVal, ref);
      } else {
        newTimes[s] = null;
      }
    });

    const success = await updateServiceOrder(order.id, {
      package_id:         selectedPackage?.id,
      package_variant_id: selectedVariant?.id,
      package_name:       selectedPackage?.name ?? order.package_name,
      variant_name:       selectedVariant?.variant_name ?? order.variant_name,
      package_price:      parseInt(packagePrice.replace(/\D/g, '')) || 0,
      notes:              notes.trim(),
      times:              newTimes,
      owner_name:         ownerName.trim(),
      whatsapp_number:    wa.trim(),
      vehicle_name:       vehicleName.trim(),
    });

    setSaving(false);
    if (!success) { onToast('Gagal simpan'); return; }
    onToast('Perubahan disimpan');
    onRefresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#F5F5F0] w-full max-w-[430px] rounded-t-2xl max-h-[92vh] overflow-y-auto pb-8">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 sticky top-0 bg-[#F5F5F0] z-10 border-b border-[#E8E8E4]">
          <div className="text-base font-semibold text-[#1a1a1a]">Detail · {order.plate_number}</div>
          <button className="p-1.5 rounded-lg text-[#888] hover:bg-[#EAEAE6] transition-all" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pt-4">
          {/* Info form */}
          <div className="text-[11px] font-bold text-[#999] uppercase tracking-wider mb-2">Informasi Kendaraan</div>
          <div className="bg-white rounded-2xl border border-[#EAEAE6] p-4 mb-4 space-y-3">
            {[
              { label: 'Nomor Plat', val: platDisplay, set: (v: string) => setPlatDisplay(v.toUpperCase()), t: 'text', readOnly: true },
              { label: 'Nama Pemilik', val: ownerName, set: setOwnerName, t: 'text', readOnly: false },
              { label: 'Nomor WhatsApp', val: wa, set: setWa, t: 'tel', readOnly: false },
              { label: 'Merek / Nama Kendaraan', val: vehicleName, set: setVehicleName, t: 'text', readOnly: false },
            ].map(({ label, val, set, t, readOnly }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-[#555] mb-1">{label}</label>
                <input
                  className={`w-full border border-[#DDDDD8] rounded-xl px-3 py-2 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all ${readOnly ? 'bg-[#F5F5F0] text-[#888] cursor-default' : ''}`}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  type={t}
                  inputMode={t === 'tel' ? 'numeric' : undefined}
                  readOnly={readOnly}
                />
              </div>
            ))}

            {/* Package picker */}
            <div className="relative" ref={paketRef}>
              <label className="block text-xs font-medium text-[#555] mb-1">Paket Layanan</label>
              <div className="relative">
                <input
                  className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all pr-8 cursor-pointer"
                  placeholder="Cari / pilih paket…"
                  value={paketOpen ? paketSearch : (selectedPackage?.name ?? '')}
                  onChange={(e) => { setPaketSearch(e.target.value); if (!paketOpen) setPaketOpen(true); }}
                  onFocus={() => { setPaketOpen(true); setPaketSearch(''); }}
                  autoComplete="off"
                />
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aaa] pointer-events-none" />
              </div>
              {paketOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#DDDDD8] rounded-xl z-50 shadow-lg max-h-56 overflow-y-auto">
                  {filteredPaketGroups.map(({ label, packages }) => (
                    <div key={label}>
                      <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-[#aaa] uppercase tracking-wider sticky top-0 bg-white">{label}</div>
                      {packages.map((pkg) => {
                        const firstVar = allVariants.find((v) => v.package_id === pkg.id);
                        return (
                          <div key={pkg.id}
                            className={`px-3 py-2.5 cursor-pointer text-sm border-b border-[#F5F5F0] last:border-none hover:bg-[#EDF5FF] hover:text-[#185FA5] flex items-center justify-between ${pkg.id === selectedPackage?.id ? 'text-[#185FA5] bg-[#EDF5FF]' : 'text-[#1a1a1a]'}`}
                            onClick={() => selectPackageName(pkg)}
                          >
                            <span className="truncate mr-2">{pkg.name}</span>
                            {firstVar && <span className="text-[11px] text-[#888] whitespace-nowrap flex-shrink-0">mulai {fmtRp(firstVar.price)}</span>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {filteredPaketGroups.length === 0 && (
                    <div className="px-3 py-4 text-sm text-[#aaa] text-center">Paket tidak ditemukan</div>
                  )}
                </div>
              )}
            </div>

            {/* Variant picker — only when >1 variant */}
            {variants.length > 1 && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-[#555] mb-1">Ukuran</label>
                  <select
                    className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] bg-white"
                    value={selectedVariant?.id ?? ''}
                    onChange={(e) => onVariantChange(e.target.value)}
                  >
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>{v.variant_name} — {fmtRp(v.price)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#555] mb-1">Harga <span className="font-normal text-[#bbb] text-[11px]">(Rp)</span></label>
                  <input
                    className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all"
                    inputMode="numeric"
                    value={packagePrice}
                    onChange={(e) => setPackagePrice(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                  />
                </div>
              </div>
            )}

            {/* Single variant — show price inline */}
            {variants.length === 1 && selectedVariant && (
              <div className="flex items-center justify-between bg-[#F5F9FF] rounded-xl px-3 py-2.5 border border-[#D8E8FB]">
                <span className="text-xs text-[#555]">Harga</span>
                <span className="text-sm font-bold text-[#185FA5]">{fmtRp(selectedVariant.price)}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#555] mb-1">Notes <span className="font-normal text-[#bbb] text-[11px]">(opsional)</span></label>
              <textarea
                className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] resize-none min-h-14 font-sans"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Timeline — editable */}
          <div className="text-[11px] font-bold text-[#999] uppercase tracking-wider mb-2">Rekam Waktu</div>
          <div className="bg-white rounded-2xl border border-[#EAEAE6] p-4 mb-4 space-y-1">
            {stages.map((s) => {
              const hasTime = !!editTimes[s];
              const color = TL_COLORS[s] ?? '#888';
              return (
                <div key={s} className="flex items-center gap-2.5 py-2 border-b border-[#F0F0EC] last:border-none">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-[12px] text-[#555] w-28 flex-shrink-0">{TIME_LABELS[s]}</span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <input
                      type="time"
                      className={`border rounded-lg px-2 py-1 text-[13px] font-medium outline-none transition-all ${hasTime ? 'border-[#DDDDD8] text-[#1a1a1a] focus:border-[#378ADD]' : 'border-dashed border-[#DDDDD8] text-[#ccc]'}`}
                      value={editTimes[s] ?? ''}
                      onChange={(e) => onTimeChange(s, e.target.value)}
                    />
                    {hasTime && (
                      <button className="text-[#ccc] hover:text-[#A32D2D] transition-colors text-xs px-1" onClick={() => clearTime(s)} title="Hapus waktu">✕</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-[#888]">Status saat ini:</span>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: STAGE_CFG[order.current_status as Stage]?.badgeBg ?? '#F0F0EC',
                color: STAGE_CFG[order.current_status as Stage]?.badgeColor ?? '#444',
              }}
            >
              {STAGE_CFG[order.current_status as Stage]?.label ?? order.current_status}
            </span>
          </div>

          <button
            className="w-full py-3 bg-[#185FA5] text-white rounded-xl text-[15px] font-semibold hover:bg-[#0C447C] transition-all disabled:opacity-50"
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
}
