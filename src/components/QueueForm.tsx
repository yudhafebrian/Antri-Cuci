import { useEffect, useRef, useState } from 'react';
import {
  MERK_DB_MOBIL,
  MERK_DB_MOTOR,
  MENIT,
  CATEGORY_LABELS,
  stagesOf,
  fmtRp,
  waNo,
  type VehicleCategory,
  type WorkflowType,
  type PackageCategory,
} from '../lib/constants';
import {
  createServiceOrder,
  loadVehicleHistory,
  loadAllPackagesWithVariants,
  type ServiceOrderRow,
  type VehicleHistoryHit,
  type PackageRow,
  type PackageVariantRow,
} from '../lib/db';
import { MessageCircle, CheckCircle, Clock, ChevronDown, Car, Bike } from 'lucide-react';

interface Props {
  queue: ServiceOrderRow[];
  onAdded: () => void;
}

interface PackageGroup {
  category: PackageCategory;
  label: string;
  packages: PackageRow[];
}

/** Build grouped list of packages for a given vehicle_type, ordered by category sort */
function buildPackageGroups(packages: PackageRow[], dbVehicleType: 'car' | 'bike'): PackageGroup[] {
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

export default function QueueForm({ queue, onAdded }: Props) {
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory | null>(null);
  const [platInput, setPlatInput] = useState('');
  const [wa, setWa] = useState('');
  const [nama, setNama] = useState('');
  const [merk, setMerk] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<PackageRow | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<PackageVariantRow | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [customMerks, setCustomMerks] = useState<string[]>([]);

  const [allPackages, setAllPackages] = useState<PackageRow[]>([]);
  const [allVariants, setAllVariants] = useState<PackageVariantRow[]>([]);
  const [acOpen, setAcOpen] = useState(false);
  const [acResults, setAcResults] = useState<VehicleHistoryHit[]>([]);
  const [merkOpen, setMerkOpen] = useState(false);
  const [paketOpen, setPaketOpen] = useState(false);
  const [paketSearch, setPaketSearch] = useState('');

  const acTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const platRef = useRef<HTMLDivElement>(null);
  const merkRef = useRef<HTMLDivElement>(null);
  const paketRef = useRef<HTMLDivElement>(null);

  // Load all packages + variants once on mount
  useEffect(() => {
    loadAllPackagesWithVariants().then(({ packages, variants }) => {
      setAllPackages(packages);
      setAllVariants(variants);
    });
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!platRef.current?.contains(e.target as Node)) setAcOpen(false);
      if (!merkRef.current?.contains(e.target as Node)) setMerkOpen(false);
      if (!paketRef.current?.contains(e.target as Node)) { setPaketOpen(false); setPaketSearch(''); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const dbVehicleType: 'car' | 'bike' | null =
    vehicleCategory === 'motor' ? 'bike' : vehicleCategory === 'mobil' ? 'car' : null;
  const merkDB = vehicleCategory === 'motor' ? MERK_DB_MOTOR : MERK_DB_MOBIL;
  const packageGroups = dbVehicleType ? buildPackageGroups(allPackages, dbVehicleType) : [];

  /** Variants for the currently selected package */
  const variants = selectedPackage
    ? allVariants.filter((v) => v.package_id === selectedPackage.id)
    : [];

  const switchCategory = (cat: VehicleCategory) => {
    setVehicleCategory(cat);
    setMerk('');
    setSelectedPackage(null);
    setSelectedVariant(null);
  };

  // ── plate autocomplete ────────────────────────────────────────────────────

  const shouldSearch = (val: string) => {
    const clean = val.replace(/\s/g, '');
    return clean.length > 0 && /\d/.test(clean);
  };

  const fetchHistory = async (q: string) => {
    if (!q.length || !shouldSearch(q)) { setAcOpen(false); return; }
    const qNorm = q.replace(/\s/g, '').toUpperCase();
    const result = await loadVehicleHistory(30);
    const filtered = result.filter((h) =>
      h.plate_number.replace(/\s/g, '').toUpperCase().startsWith(qNorm)
    );
    if (filtered.length > 0) { setAcResults(filtered.slice(0, 8)); setAcOpen(true); }
    else setAcOpen(false);
  };

  const triggerSearch = (val: string) => {
    if (acTimeout.current) clearTimeout(acTimeout.current);
    acTimeout.current = setTimeout(() => fetchHistory(val), 200);
  };

  const onPlatChange = (v: string) => {
    const val = v.replace(/[^A-Za-z0-9\s]/g, '');
    setPlatInput(val);
    triggerSearch(val);
  };

  const onPlatFocus = () => {
    if (acTimeout.current) clearTimeout(acTimeout.current);
    if (shouldSearch(platInput)) fetchHistory(platInput);
  };

  const fillFromHistory = (h: VehicleHistoryHit) => {
    setPlatInput(h.plate_number.toUpperCase());
    setWa(h.whatsapp_number);
    setNama(h.owner_name);
    setMerk(h.vehicle_name);
    if (h.vehicle_type === 'motor' || h.vehicle_type === 'mobil') {
      if (vehicleCategory !== h.vehicle_type) {
        setVehicleCategory(h.vehicle_type as VehicleCategory);
        setSelectedPackage(null);
        setSelectedVariant(null);
      }
    }
    setAcOpen(false);
  };

  // ── merk dropdown ─────────────────────────────────────────────────────────

  const allMerks = [...Object.values(merkDB).flat(), ...customMerks];
  const merkFilter = merk.toLowerCase();
  const merkGroups = Object.entries(merkDB)
    .map(([grp, items]) => ({ grp, items: merkFilter ? items.filter((i) => i.toLowerCase().includes(merkFilter)) : items }))
    .filter((g) => g.items.length > 0);
  if (customMerks.length > 0) {
    const filtered = merkFilter ? customMerks.filter((i) => i.toLowerCase().includes(merkFilter)) : customMerks;
    if (filtered.length > 0) merkGroups.push({ grp: 'Custom', items: filtered });
  }
  const merkExact = allMerks.map((m) => m.toLowerCase()).includes(merk.toLowerCase().trim());
  const selectMerk = (v: string) => { setMerk(v); setMerkOpen(false); };
  const addCustomMerk = () => {
    const v = merk.trim();
    if (!v || allMerks.includes(v)) { setMerkOpen(false); return; }
    setCustomMerks((prev) => [...prev, v]);
    setMerkOpen(false);
  };

  // ── package picker ────────────────────────────────────────────────────────

  const filteredGroups = paketSearch
    ? packageGroups.map((g) => ({
        ...g,
        packages: g.packages.filter((p) => p.name.toLowerCase().includes(paketSearch.toLowerCase())),
      })).filter((g) => g.packages.length > 0)
    : packageGroups;

  const selectPackage = (pkg: PackageRow) => {
    setSelectedPackage(pkg);
    setPaketOpen(false);
    setPaketSearch('');
    // Get variants for this package and auto-select first
    const vars = allVariants.filter((v) => v.package_id === pkg.id);
    setSelectedVariant(vars.length > 0 ? vars[0] : null);
  };

  const onVariantChange = (variantId: string) => {
    const found = variants.find((v) => v.id === variantId) ?? null;
    setSelectedVariant(found);
  };

  // ── ETA ───────────────────────────────────────────────────────────────────

  const workflowType: WorkflowType | null = selectedPackage
    ? (selectedPackage.workflow_type as WorkflowType)
    : null;
  const waitingCount = workflowType
    ? queue.filter((c) => c.workflow_type === workflowType && c.current_status === 'menunggu').length
    : 0;
  const etaNew = MENIT * 2 + waitingCount * MENIT;

  // ── submit ────────────────────────────────────────────────────────────────

  const daftar = async (kirimWA: boolean) => {
    if (!vehicleCategory)             return alert('Pilih jenis kendaraan');
    if (!platInput.trim())            return alert('Masukkan nomor plat');
    if (wa.trim() && wa.trim().length < 9) return alert('Nomor WA tidak valid');
    if (!merk.trim())                 return alert('Pilih merek kendaraan');
    if (!selectedPackage || !selectedVariant) return alert('Pilih paket dan ukuran layanan');

    setLoading(true);
    const inserted = await createServiceOrder({
      plate_number:       platInput.trim().toUpperCase(),
      owner_name:         nama.trim(),
      whatsapp_number:    wa.trim(),
      vehicle_name:       merk.trim(),
      vehicle_type:       vehicleCategory,
      package_id:         selectedPackage.id,
      package_variant_id: selectedVariant.id,
      package_name:       selectedPackage.name,
      variant_name:       selectedVariant.variant_name,
      package_price:      selectedVariant.price,
      notes:              notes.trim(),
    });

    setLoading(false);
    if (!inserted) { alert('Gagal mendaftar'); return; }

    setPlatInput(''); setWa(''); setNama(''); setMerk('');
    setSelectedPackage(null); setSelectedVariant(null); setNotes('');
    onAdded();

    if (kirimWA && wa.trim()) {
      const pos = waitingCount + 1;
      const stages = stagesOf(selectedPackage.workflow_type as WorkflowType);
      const variantLabel = selectedVariant.variant_name !== 'All Size' ? ` · ${selectedVariant.variant_name}` : '';
      const teks = `Halo ${nama.trim()}! 👋 Selamat datang di *FIP Autoshop*!\n\n🚗 Kendaraan *${platInput.trim()}* (${merk.trim()})\n📋 Paket: *${selectedPackage.name}${variantLabel}*\n💰 Harga: *${fmtRp(selectedVariant.price)}*\n\n📌 Nomor antrian: *${pos}*\n⏳ Estimasi tunggu: *±${etaNew} menit* (${stages.length} tahap)\n\nTerima kasih! 😊`;
      setTimeout(() => window.open(`https://wa.me/${waNo(wa.trim())}?text=${encodeURIComponent(teks)}`, '_blank'), 400);
    }
  };

  const isLoading = allPackages.length === 0;

  return (
    <div className="bg-white rounded-2xl border border-[#EAEAE6] p-4 mb-3">

      {/* Plat + Autocomplete */}
      <div className="mb-3 relative" ref={platRef}>
        <label className="block text-xs font-medium text-[#555] mb-1">Nomor Plat Kendaraan</label>
        <input
          className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2.5 text-sm font-bold text-[#1a1a1a] outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all uppercase bg-white tracking-widest"
          placeholder="Contoh: B 1234 ABC"
          maxLength={11}
          value={platInput}
          onChange={(e) => onPlatChange(e.target.value)}
          onFocus={onPlatFocus}
          autoComplete="off"
        />
        {acOpen && acResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#DDDDD8] rounded-xl z-50 shadow-lg max-h-52 overflow-y-auto">
            {acResults.map((h) => (
              <div key={h.plate_number} className="px-3 py-2.5 cursor-pointer hover:bg-[#EDF5FF] border-b border-[#F5F5F0] last:border-none flex items-center gap-2" onClick={() => fillFromHistory(h)}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#1a1a1a]">{h.plate_number}</div>
                  <div className="text-xs text-[#888] mt-0.5 truncate">{h.owner_name} · {h.vehicle_name}</div>
                </div>
                {h.vehicle_type && (
                  <span className="text-[10px] text-[#aaa] bg-[#F5F5F0] px-1.5 py-0.5 rounded-md flex-shrink-0 capitalize">{h.vehicle_type}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WA */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-[#555] mb-1">Nomor WhatsApp Pemilik <span className="font-normal text-[#bbb] text-[11px]">(opsional)</span></label>
        <input
          className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2.5 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all"
          placeholder="08123456789"
          inputMode="numeric"
          value={wa}
          onChange={(e) => setWa(e.target.value)}
        />
      </div>

      {/* Nama */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-[#555] mb-1">Nama Pemilik <span className="font-normal text-[#bbb] text-[11px]">(opsional)</span></label>
        <input
          className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2.5 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all"
          placeholder="Contoh: Budi Santoso"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
        />
      </div>

      {/* Vehicle Category Toggle */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-[#555] mb-2">Jenis Kendaraan</label>
        <div className="grid grid-cols-2 gap-2">
          {(['mobil', 'motor'] as VehicleCategory[]).map((cat) => (
            <button key={cat} type="button"
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${vehicleCategory === cat ? 'border-[#185FA5] bg-[#EDF5FF] text-[#185FA5]' : 'border-[#DDDDD8] text-[#888] hover:border-[#aaa]'}`}
              onClick={() => switchCategory(cat)}
            >
              {cat === 'mobil' ? <Car className="w-4 h-4" /> : <Bike className="w-4 h-4" />}
              {cat === 'mobil' ? 'Mobil' : 'Motor'}
            </button>
          ))}
        </div>
      </div>

      {/* Merk */}
      {vehicleCategory && (
        <div className="mb-3 relative" ref={merkRef}>
          <label className="block text-xs font-medium text-[#555] mb-1">
            Merek {vehicleCategory === 'mobil' ? 'Mobil' : 'Motor'}
          </label>
          <div className="relative">
            <input
              className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2.5 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all pr-8"
              placeholder="Ketik atau pilih merek…"
              value={merk}
              onChange={(e) => { setMerk(e.target.value); setMerkOpen(true); }}
              onFocus={() => setMerkOpen(true)}
              autoComplete="off"
            />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aaa] pointer-events-none" />
          </div>
          {merkOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#DDDDD8] rounded-xl z-50 shadow-lg max-h-56 overflow-y-auto">
              {merkGroups.map(({ grp, items }) => (
                <div key={grp}>
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-[#aaa] uppercase tracking-wider">{grp}</div>
                  {items.map((item) => (
                    <div key={item} className="px-3 py-2.5 cursor-pointer text-sm text-[#1a1a1a] hover:bg-[#EDF5FF] hover:text-[#185FA5] border-b border-[#F5F5F0] last:border-none" onClick={() => selectMerk(item)}>{item}</div>
                  ))}
                </div>
              ))}
              {merk.trim() && !merkExact && (
                <div className="px-3 py-2.5 cursor-pointer text-sm text-[#185FA5] font-semibold flex items-center gap-2 border-t border-[#E8E8E4] hover:bg-[#EDF5FF]" onClick={addCustomMerk}>
                  <span className="text-base">＋</span> Tambah "{merk.trim()}"
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Package picker */}
      {vehicleCategory && (
        <div className="mb-3 relative" ref={paketRef}>
          <label className="block text-xs font-medium text-[#555] mb-1">Paket Layanan</label>
          <div className="relative">
            <input
              className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2.5 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all pr-8 cursor-pointer"
              placeholder={isLoading ? 'Memuat paket…' : 'Cari / pilih paket…'}
              value={paketOpen ? paketSearch : (selectedPackage?.name ?? '')}
              onChange={(e) => { setPaketSearch(e.target.value); if (!paketOpen) setPaketOpen(true); }}
              onFocus={() => { setPaketOpen(true); setPaketSearch(''); }}
              autoComplete="off"
              readOnly={isLoading}
            />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aaa] pointer-events-none" />
          </div>
          {paketOpen && packageGroups.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#DDDDD8] rounded-xl z-50 shadow-lg max-h-64 overflow-y-auto">
              {filteredGroups.map(({ label, packages }) => (
                <div key={label}>
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-[#aaa] uppercase tracking-wider sticky top-0 bg-white">{label}</div>
                  {packages.map((pkg) => {
                    const firstVar = allVariants.find((v) => v.package_id === pkg.id);
                    const hasMultipleVars = allVariants.filter((v) => v.package_id === pkg.id).length > 1;
                    return (
                      <div key={pkg.id}
                        className="px-3 py-2.5 cursor-pointer text-sm text-[#1a1a1a] hover:bg-[#EDF5FF] hover:text-[#185FA5] border-b border-[#F5F5F0] last:border-none flex items-center justify-between"
                        onClick={() => selectPackage(pkg)}
                      >
                        <span className="truncate mr-2">{pkg.name}</span>
                        {firstVar && (
                          <span className="text-[11px] text-[#888] whitespace-nowrap flex-shrink-0">
                            {hasMultipleVars ? `mulai ${fmtRp(firstVar.price)}` : fmtRp(firstVar.price)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              {filteredGroups.length === 0 && (
                <div className="px-3 py-4 text-sm text-[#aaa] text-center">Paket tidak ditemukan</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Variant picker — only shown when package has >1 variant */}
      {selectedPackage && variants.length > 1 && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-[#555] mb-1">Ukuran</label>
            <select
              className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2.5 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] bg-white"
              value={selectedVariant?.id ?? ''}
              onChange={(e) => onVariantChange(e.target.value)}
            >
              {variants.map((v) => (
                <option key={v.id} value={v.id}>{v.variant_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#555] mb-1">
              Harga <span className="font-normal text-[#bbb] text-[11px]">(Rp)</span>
            </label>
            <input
              className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2.5 text-sm font-semibold text-[#185FA5] bg-[#F5F9FF] outline-none cursor-default"
              value={selectedVariant ? selectedVariant.price.toLocaleString('id-ID') : ''}
              readOnly
            />
          </div>
        </div>
      )}

      {/* Single variant — just show price inline (no dropdown) */}
      {selectedPackage && variants.length === 1 && selectedVariant && (
        <div className="mb-3 flex items-center justify-between bg-[#F5F9FF] rounded-xl px-3 py-2.5 border border-[#D8E8FB]">
          <span className="text-xs text-[#555]">Harga</span>
          <span className="text-sm font-bold text-[#185FA5]">{fmtRp(selectedVariant.price)}</span>
        </div>
      )}

      {/* Notes */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-[#555] mb-1">Notes <span className="font-normal text-[#bbb] text-[11px]">(opsional)</span></label>
        <textarea
          className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2.5 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all resize-none min-h-16 font-sans"
          placeholder="Catatan tambahan…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* ETA Hint */}
      <div className="flex items-center gap-2 bg-[#EDF5FF] rounded-xl px-3 py-2.5 mb-3 text-[12.5px] text-[#185FA5]">
        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        {platInput.trim() && selectedVariant
          ? <span>Antrian ke-<strong>{waitingCount + 1}</strong> · estimasi tunggu <strong>~{etaNew} menit</strong></span>
          : <span>Isi form untuk lihat estimasi antrian</span>
        }
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          className="flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 border-[#185FA5] text-[#185FA5] text-sm font-semibold hover:bg-[#EDF5FF] active:scale-95 transition-all disabled:opacity-50"
          onClick={() => daftar(false)}
          disabled={loading}
        >
          <CheckCircle className="w-4 h-4" />
          Daftar Saja
        </button>
        <button
          className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#185FA5] text-white text-sm font-semibold hover:bg-[#0C447C] active:scale-95 transition-all disabled:opacity-50"
          onClick={() => daftar(true)}
          disabled={loading || !wa.trim()}
        >
          <MessageCircle className="w-4 h-4" />
          Daftar + WA
        </button>
      </div>
    </div>
  );
}
