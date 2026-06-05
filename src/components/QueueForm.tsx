import { useEffect, useRef, useState } from 'react';
import {
  PAKET_GROUPS_MOBIL,
  PAKET_GROUPS_MOTOR,
  MERK_DB_MOBIL,
  MERK_DB_MOTOR,
  MENIT,
  getQueueType,
  getPaket,
  fmtRp,
  waNo,
  stagesOf,
  type VehicleCategory,
} from '../lib/constants';
import { supabase, type QueueRow } from '../lib/supabase';
import { MessageCircle, CheckCircle, Clock, ChevronDown, Car, Bike } from 'lucide-react';

interface HistoryHit {
  plat: string;
  wa: string;
  nama: string;
  merk: string;
  vehicle_category: string | null;
}

interface Props {
  queue: QueueRow[];
  onAdded: () => void;
}

export default function QueueForm({ queue, onAdded }: Props) {
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory | null>(null);
  const [platPrefix, setPlatPrefix] = useState('');
  const [platNum, setPlatNum] = useState('');
  const [platSuffix, setPlatSuffix] = useState('');
  const [wa, setWa] = useState('');
  const [nama, setNama] = useState('');
  const [merk, setMerk] = useState('');
  const [paket, setPaket] = useState('');
  const [size, setSize] = useState('');
  const [harga, setHarga] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [customMerks, setCustomMerks] = useState<string[]>([]);

  const [acOpen, setAcOpen] = useState(false);
  const [acResults, setAcResults] = useState<HistoryHit[]>([]);
  const [merkOpen, setMerkOpen] = useState(false);
  const [paketOpen, setPaketOpen] = useState(false);
  const [paketSearch, setPaketSearch] = useState('');

  const acTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const platRef = useRef<HTMLDivElement>(null);
  const platNumRef = useRef<HTMLInputElement>(null);
  const platSuffixRef = useRef<HTMLInputElement>(null);
  const merkRef = useRef<HTMLDivElement>(null);
  const paketRef = useRef<HTMLDivElement>(null);

  const buildPlat = (prefix: string, num: string, suffix: string) => {
    const parts = [prefix.trim(), num.trim(), suffix.trim()].filter(Boolean);
    return parts.join(' ').toUpperCase();
  };
  const plat = buildPlat(platPrefix, platNum, platSuffix);

  const shouldSearch = (combined: string) => /[A-Za-z]/.test(combined) && /\d/.test(combined);

  const merkDB = vehicleCategory === 'motor' ? MERK_DB_MOTOR : MERK_DB_MOBIL;
  const paketGroups = vehicleCategory === 'motor' ? PAKET_GROUPS_MOTOR : PAKET_GROUPS_MOBIL;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!platRef.current?.contains(e.target as Node)) setAcOpen(false);
      if (!merkRef.current?.contains(e.target as Node)) setMerkOpen(false);
      if (!paketRef.current?.contains(e.target as Node)) { setPaketOpen(false); setPaketSearch(''); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const switchCategory = (cat: VehicleCategory) => {
    setVehicleCategory(cat);
    setMerk('');
    setPaket('');
    setSize('');
    setHarga('');
  };

  const fetchHistory = async (q: string) => {
    if (q.length === 0) {
      const result = await supabase.from('vehicle_history').select('plat, wa, nama, merk, vehicle_category').order('created_at', { ascending: false }).limit(8);
      if (result.data && result.data.length > 0) { setAcResults(result.data as HistoryHit[]); setAcOpen(true); }
      return;
    }
    if (!shouldSearch(q)) { setAcOpen(false); return; }
    const result = await supabase.from('vehicle_history').select('plat, wa, nama, merk, vehicle_category').ilike('plat', `${q}%`).limit(8);
    if (result.data && result.data.length > 0) { setAcResults(result.data as HistoryHit[]); setAcOpen(true); }
    else setAcOpen(false);
  };

  const triggerSearch = (prefix: string, num: string, suffix: string) => {
    if (acTimeout.current) clearTimeout(acTimeout.current);
    const combined = buildPlat(prefix, num, suffix);
    acTimeout.current = setTimeout(() => fetchHistory(combined), 200);
  };

  const onPlatPrefixChange = (v: string) => {
    const val = v.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2);
    setPlatPrefix(val);
    triggerSearch(val, platNum, platSuffix);
    if (val.length >= 2 && platNumRef.current) platNumRef.current.focus();
  };

  const onPlatNumChange = (v: string) => {
    const val = v.replace(/\D/g, '').slice(0, 4);
    setPlatNum(val);
    triggerSearch(platPrefix, val, platSuffix);
    if (val.length >= 4 && platSuffixRef.current) platSuffixRef.current.focus();
  };

  const onPlatSuffixChange = (v: string) => {
    const val = v.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3);
    setPlatSuffix(val);
    triggerSearch(platPrefix, platNum, val);
  };

  const onPlatFocus = () => {
    if (acTimeout.current) clearTimeout(acTimeout.current);
    const combined = buildPlat(platPrefix, platNum, platSuffix);
    fetchHistory(combined);
  };

  const fillFromHistory = (h: HistoryHit) => {
    const parts = h.plat.split(' ');
    setPlatPrefix(parts[0] ?? '');
    setPlatNum(parts[1] ?? '');
    setPlatSuffix(parts[2] ?? '');
    setWa(h.wa);
    setNama(h.nama);
    setMerk(h.merk);
    if (h.vehicle_category === 'motor' || h.vehicle_category === 'mobil') {
      if (vehicleCategory !== h.vehicle_category) {
        setVehicleCategory(h.vehicle_category as VehicleCategory);
        setPaket('');
        setSize('');
        setHarga('');
      }
    }
    setAcOpen(false);
  };

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

  const filteredPaketGroups = paketSearch
    ? paketGroups.map((g) => ({ ...g, items: g.items.filter((p) => p.label.toLowerCase().includes(paketSearch.toLowerCase())) })).filter((g) => g.items.length > 0)
    : paketGroups;

  const selectMerk = (v: string) => { setMerk(v); setMerkOpen(false); };
  const addCustomMerk = () => {
    const v = merk.trim();
    if (!v || allMerks.includes(v)) { setMerkOpen(false); return; }
    setCustomMerks((prev) => [...prev, v]);
    setMerkOpen(false);
  };

  const selectPaket = (label: string) => {
    setPaket(label); setPaketOpen(false); setPaketSearch('');
    const pd = getPaket(label);
    if (pd && pd.sizes.length > 0) { setSize(pd.sizes[0].size); setHarga(String(pd.sizes[0].price)); }
  };

  const onSizeChange = (s: string) => {
    setSize(s);
    const pd = getPaket(paket);
    const found = pd?.sizes.find((x) => x.size === s);
    if (found) setHarga(String(found.price));
  };

  const activeQueueType = paket ? getQueueType(paket) : null;
  const waitingCount = activeQueueType ? queue.filter((c) => c.type === activeQueueType && c.stage === 'waiting').length : 0;
  const etaNew = MENIT * 2 + waitingCount * MENIT;

  const daftar = async (kirimWA: boolean) => {
    if (!vehicleCategory) return alert('Pilih jenis kendaraan');
    if (!plat.trim()) return alert('Masukkan nomor plat');
    if (!wa.trim() || wa.trim().length < 9) return alert('Nomor WA tidak valid');
    if (!nama.trim()) return alert('Masukkan nama pemilik');
    if (!merk.trim()) return alert('Pilih merek kendaraan');
    if (!paket.trim()) return alert('Pilih paket layanan');

    setLoading(true);
    const type = getQueueType(paket);
    const stages = stagesOf(type);
    const times: Record<string, string> = { [stages[0]]: new Date().toISOString() };
    const hargaNum = parseInt(harga.replace(/\D/g, '')) || 0;

    const { data: inserted, error } = await supabase.from('queue').insert({
      type, plat: plat.trim(), wa: wa.trim(), nama: nama.trim(),
      merk: merk.trim(), paket, size, harga: hargaNum,
      notes: notes.trim(), stage: 'waiting', times,
    }).select().maybeSingle();

    if (error) { setLoading(false); alert('Gagal mendaftar: ' + error.message); return; }

    await supabase.from('vehicle_history').upsert(
      { plat: plat.trim(), wa: wa.trim(), nama: nama.trim(), merk: merk.trim(), vehicle_category: vehicleCategory },
      { onConflict: 'plat' }
    );

    setPlatPrefix(''); setPlatNum(''); setPlatSuffix(''); setWa(''); setNama(''); setMerk('');
    setPaket(''); setSize(''); setHarga(''); setNotes('');
    setLoading(false);
    onAdded();

    if (kirimWA && inserted) {
      const pos = waitingCount + 1;
      const teks = `Halo ${nama.trim()}! 👋 Selamat datang di *FIP Autoshop*!\n\n🚗 Kendaraan *${plat.trim()}* (${merk.trim()})\n📋 Paket: *${paket} · ${size}*\n\n📌 Nomor antrian: *${pos}*\n⏳ Estimasi tunggu: *±${etaNew} menit*\n\nTerima kasih! 😊`;
      setTimeout(() => window.open(`https://wa.me/${waNo(wa.trim())}?text=${encodeURIComponent(teks)}`, '_blank'), 400);
    }
  };

  const paketData = getPaket(paket);
  const hargaNum = parseInt(harga.replace(/\D/g, '')) || 0;

  return (
    <div className="bg-white rounded-2xl border border-[#EAEAE6] p-4 mb-3">

      {/* Plat + Autocomplete */}
      <div className="mb-3 relative" ref={platRef}>
        <label className="block text-xs font-medium text-[#555] mb-1">Nomor Plat Kendaraan</label>
        <div className="flex items-center gap-1.5">
          <input
            className="w-16 border border-[#DDDDD8] rounded-xl px-2.5 py-2.5 text-sm font-bold text-[#1a1a1a] text-center outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all uppercase bg-white tracking-widest"
            placeholder="B"
            maxLength={2}
            value={platPrefix}
            onChange={(e) => onPlatPrefixChange(e.target.value)}
            onFocus={onPlatFocus}
            autoComplete="off"
          />
          <span className="text-[#bbb] text-base font-light select-none">·</span>
          <input
            ref={platNumRef}
            className="w-20 border border-[#DDDDD8] rounded-xl px-2.5 py-2.5 text-sm font-bold text-[#1a1a1a] text-center outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all bg-white tracking-widest"
            placeholder="1234"
            inputMode="numeric"
            maxLength={4}
            value={platNum}
            onChange={(e) => onPlatNumChange(e.target.value)}
            onFocus={onPlatFocus}
            autoComplete="off"
          />
          <span className="text-[#bbb] text-base font-light select-none">·</span>
          <input
            ref={platSuffixRef}
            className="flex-1 border border-[#DDDDD8] rounded-xl px-2.5 py-2.5 text-sm font-bold text-[#1a1a1a] text-center outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all uppercase bg-white tracking-widest"
            placeholder="ABC"
            maxLength={3}
            value={platSuffix}
            onChange={(e) => onPlatSuffixChange(e.target.value)}
            onFocus={onPlatFocus}
            autoComplete="off"
          />
        </div>
        {plat && (
          <div className="text-[11px] text-[#aaa] mt-1 ml-0.5">{plat}</div>
        )}
        {acOpen && acResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#DDDDD8] rounded-xl z-50 shadow-lg max-h-52 overflow-y-auto">
            {acResults.map((h) => (
              <div
                key={h.plat}
                className="px-3 py-2.5 cursor-pointer hover:bg-[#EDF5FF] border-b border-[#F5F5F0] last:border-none flex items-center gap-2"
                onClick={() => fillFromHistory(h)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#1a1a1a]">{h.plat}</div>
                  <div className="text-xs text-[#888] mt-0.5 truncate">{h.nama} · {h.merk}</div>
                </div>
                {h.vehicle_category && (
                  <span className="text-[10px] text-[#aaa] bg-[#F5F5F0] px-1.5 py-0.5 rounded-md flex-shrink-0 capitalize">{h.vehicle_category}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WA */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-[#555] mb-1">Nomor WhatsApp Pemilik</label>
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
        <label className="block text-xs font-medium text-[#555] mb-1">Nama Pemilik</label>
        <input
          className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2.5 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all"
          placeholder="Contoh: Budi Santoso"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
        />
      </div>

      {/* Vehicle Category Toggle — below nama, before merk/paket/notes */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-[#555] mb-2">Jenis Kendaraan</label>
        <div className="grid grid-cols-2 gap-2">
          {(['mobil', 'motor'] as VehicleCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                vehicleCategory === cat
                  ? 'border-[#185FA5] bg-[#EDF5FF] text-[#185FA5]'
                  : 'border-[#DDDDD8] text-[#888] hover:border-[#aaa]'
              }`}
              onClick={() => switchCategory(cat)}
            >
              {cat === 'mobil' ? <Car className="w-4 h-4" /> : <Bike className="w-4 h-4" />}
              {cat === 'mobil' ? 'Mobil' : 'Motor'}
            </button>
          ))}
        </div>
      </div>

      {/* Merk — conditional on category */}
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

      {/* Paket — conditional on category */}
      {vehicleCategory && (
        <div className="mb-3 relative" ref={paketRef}>
          <label className="block text-xs font-medium text-[#555] mb-1">Paket Layanan</label>
          <div className="relative">
            <input
              className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2.5 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all pr-8 cursor-pointer"
              placeholder="Cari / pilih paket…"
              value={paketOpen ? paketSearch : paket}
              onChange={(e) => { setPaketSearch(e.target.value); if (!paketOpen) setPaketOpen(true); }}
              onFocus={() => { setPaketOpen(true); setPaketSearch(''); }}
              autoComplete="off"
            />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aaa] pointer-events-none" />
          </div>
          {paketOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#DDDDD8] rounded-xl z-50 shadow-lg max-h-64 overflow-y-auto">
              {filteredPaketGroups.map(({ group, items }) => (
                <div key={group}>
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-[#aaa] uppercase tracking-wider sticky top-0 bg-white">{group}</div>
                  {items.map((p) => (
                    <div key={p.label} className="px-3 py-2.5 cursor-pointer text-sm text-[#1a1a1a] hover:bg-[#EDF5FF] hover:text-[#185FA5] border-b border-[#F5F5F0] last:border-none" onClick={() => selectPaket(p.label)}>{p.label}</div>
                  ))}
                </div>
              ))}
              {filteredPaketGroups.length === 0 && (
                <div className="px-3 py-4 text-sm text-[#aaa] text-center">Paket tidak ditemukan</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Size + Price */}
      {paketData && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-[#555] mb-1">Ukuran</label>
            <select
              className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2.5 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] bg-white"
              value={size}
              onChange={(e) => onSizeChange(e.target.value)}
            >
              {paketData.sizes.map((s) => (
                <option key={s.size} value={s.size}>{s.size}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#555] mb-1">
              Harga <span className="font-normal text-[#bbb] text-[11px]">(Rp)</span>
            </label>
            <input
              className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2.5 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all"
              inputMode="numeric"
              value={harga}
              onChange={(e) => setHarga(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
            />
            {hargaNum > 0 && (
              <div className="text-[11px] text-[#888] mt-0.5">{fmtRp(hargaNum)}</div>
            )}
          </div>
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
        {plat.trim() && paket
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
          disabled={loading}
        >
          <MessageCircle className="w-4 h-4" />
          Daftar + WA
        </button>
      </div>
    </div>
  );
}
