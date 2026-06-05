import { useEffect, useRef, useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import {
  PAKET_GROUPS_MOBIL,
  PAKET_GROUPS_MOTOR,
  TIME_LABELS,
  stagesOf,
  getPaket,
  fmtRp,
  inferVehicleCategory,
  isoToTimeInput,
  timeInputToIso,
  type VehicleType,
  type Stage,
  type PaketGroup,
} from '../lib/constants';
import { supabase, type QueueRow } from '../lib/supabase';

interface Props {
  carId: string | null;
  queue: QueueRow[];
  onClose: () => void;
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

const TL_COLORS: Record<string, string> = {
  waiting: '#EF9F27', basah: '#378ADD', kering: '#639922',
  antripoles: '#D44A9A', poles: '#E06520', qc: '#8B44E0', selesai: '#1D9E75',
};

export default function DetailModal({ carId, queue, onClose, onRefresh, onToast }: Props) {
  const car = queue.find((c) => c.id === carId) ?? null;

  const [plat, setPlat] = useState('');
  const [wa, setWa] = useState('');
  const [nama, setNama] = useState('');
  const [merk, setMerk] = useState('');
  const [paket, setPaket] = useState('');
  const [size, setSize] = useState('');
  const [harga, setHarga] = useState('');
  const [notes, setNotes] = useState('');
  const [editTimes, setEditTimes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [paketOpen, setPaketOpen] = useState(false);
  const [paketSearch, setPaketSearch] = useState('');
  const paketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (car) {
      setPlat(car.plat);
      setWa(car.wa);
      setNama(car.nama);
      setMerk(car.merk);
      setPaket(car.paket);
      setSize(car.size);
      setHarga(String(car.harga));
      setNotes(car.notes);
      const times: Record<string, string> = {};
      Object.entries(car.times).forEach(([stage, iso]) => {
        times[stage] = isoToTimeInput(iso);
      });
      setEditTimes(times);
    }
  }, [carId]);

  useEffect(() => {
    if (carId) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [carId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!paketRef.current?.contains(e.target as Node)) { setPaketOpen(false); setPaketSearch(''); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!car) return null;

  const type = car.type as VehicleType;
  const stages = stagesOf(type);
  const vehicleCategory = inferVehicleCategory(paket);
  const paketGroups: PaketGroup[] = vehicleCategory === 'motor' ? PAKET_GROUPS_MOTOR : PAKET_GROUPS_MOBIL;

  const filteredPaketGroups = paketSearch
    ? paketGroups.map((g) => ({ ...g, items: g.items.filter((p) => p.label.toLowerCase().includes(paketSearch.toLowerCase())) })).filter((g) => g.items.length > 0)
    : paketGroups;

  const paketData = getPaket(paket);

  const selectPaket = (label: string) => {
    setPaket(label); setPaketOpen(false); setPaketSearch('');
    const pd = getPaket(label);
    if (pd && pd.sizes.length > 0) {
      setSize(pd.sizes[0].size);
      setHarga(String(pd.sizes[0].price));
    }
  };

  const onSizeChange = (s: string) => {
    setSize(s);
    const found = paketData?.sizes.find((x) => x.size === s);
    if (found) setHarga(String(found.price));
  };

  const onTimeChange = (stage: Stage, value: string) => {
    setEditTimes((prev) => ({ ...prev, [stage]: value }));
  };

  const clearTime = (stage: Stage) => {
    setEditTimes((prev) => { const next = { ...prev }; delete next[stage]; return next; });
  };

  const save = async () => {
    setSaving(true);
    const newTimes: Record<string, string> = {};
    stages.forEach((s) => {
      const timeVal = editTimes[s];
      if (timeVal) {
        const ref = car.times[s] || car.times['waiting'] || new Date().toISOString();
        newTimes[s] = timeInputToIso(timeVal, ref);
      }
    });

    const { error } = await supabase.from('queue').update({
      plat: plat.trim().toUpperCase(),
      wa: wa.trim(),
      nama: nama.trim(),
      merk: merk.trim(),
      paket,
      size,
      harga: parseInt(harga.replace(/\D/g, '')) || 0,
      notes: notes.trim(),
      times: newTimes,
    }).eq('id', car.id);

    setSaving(false);
    if (error) { onToast('Gagal simpan: ' + error.message); return; }
    onToast('Perubahan disimpan');
    onRefresh();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#F5F5F0] w-full max-w-[430px] rounded-t-2xl max-h-[92vh] overflow-y-auto pb-8">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 sticky top-0 bg-[#F5F5F0] z-10 border-b border-[#E8E8E4]">
          <div className="text-base font-semibold text-[#1a1a1a]">Detail · {car.plat}</div>
          <button className="p-1.5 rounded-lg text-[#888] hover:bg-[#EAEAE6] transition-all" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pt-4">
          {/* Info form */}
          <div className="text-[11px] font-bold text-[#999] uppercase tracking-wider mb-2">Informasi Kendaraan</div>
          <div className="bg-white rounded-2xl border border-[#EAEAE6] p-4 mb-4 space-y-3">
            {[
              { label: 'Nomor Plat', val: plat, set: (v: string) => setPlat(v.toUpperCase()), t: 'text' },
              { label: 'Nama Pemilik', val: nama, set: setNama, t: 'text' },
              { label: 'Nomor WhatsApp', val: wa, set: setWa, t: 'tel' },
              { label: 'Merek Kendaraan', val: merk, set: setMerk, t: 'text' },
            ].map(({ label, val, set, t }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-[#555] mb-1">{label}</label>
                <input
                  className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all"
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  type={t}
                  inputMode={t === 'tel' ? 'numeric' : undefined}
                />
              </div>
            ))}

            {/* Paket grouped combobox */}
            <div className="relative" ref={paketRef}>
              <label className="block text-xs font-medium text-[#555] mb-1">Paket Layanan</label>
              <div className="relative">
                <input
                  className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all pr-8 cursor-pointer"
                  placeholder="Cari / pilih paket…"
                  value={paketOpen ? paketSearch : paket}
                  onChange={(e) => { setPaketSearch(e.target.value); if (!paketOpen) setPaketOpen(true); }}
                  onFocus={() => { setPaketOpen(true); setPaketSearch(''); }}
                  autoComplete="off"
                />
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aaa] pointer-events-none" />
              </div>
              {paketOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#DDDDD8] rounded-xl z-50 shadow-lg max-h-56 overflow-y-auto">
                  {filteredPaketGroups.map(({ group, items }) => (
                    <div key={group}>
                      <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-[#aaa] uppercase tracking-wider sticky top-0 bg-white">{group}</div>
                      {items.map((p) => (
                        <div key={p.label} className={`px-3 py-2.5 cursor-pointer text-sm border-b border-[#F5F5F0] last:border-none hover:bg-[#EDF5FF] hover:text-[#185FA5] flex items-center justify-between ${p.label === paket ? 'text-[#185FA5] bg-[#EDF5FF]' : 'text-[#1a1a1a]'}`} onClick={() => selectPaket(p.label)}>
                          <span className="truncate mr-2">{p.label}</span>
                          <span className="text-[11px] text-[#888] whitespace-nowrap flex-shrink-0">Rp {fmtRp(p.sizes[0].price)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {filteredPaketGroups.length === 0 && (
                    <div className="px-3 py-4 text-sm text-[#aaa] text-center">Paket tidak ditemukan</div>
                  )}
                </div>
              )}
            </div>

            {/* Size + Harga */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-[#555] mb-1">Ukuran</label>
                <select
                  className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] bg-white"
                  value={size}
                  onChange={(e) => onSizeChange(e.target.value)}
                >
                  {paketData?.sizes.map((s) => (
                    <option key={s.size} value={s.size}>{s.size} — Rp {fmtRp(s.price)}</option>
                  )) ?? <option>{size}</option>}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#555] mb-1">Harga <span className="font-normal text-[#bbb] text-[11px]">(Rp)</span></label>
                <input
                  className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all"
                  inputMode="numeric"
                  value={harga}
                  onChange={(e) => setHarga(e.target.value.replace(/\D/g, ''))}
                  placeholder="0"
                />
              </div>
            </div>

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
              return (
                <div key={s} className="flex items-center gap-2.5 py-2 border-b border-[#F0F0EC] last:border-none">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: TL_COLORS[s] }} />
                  <span className="text-[12px] text-[#555] w-28 flex-shrink-0">{TIME_LABELS[s]}</span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <input
                      type="time"
                      className={`border rounded-lg px-2 py-1 text-[13px] font-medium outline-none transition-all ${
                        hasTime ? 'border-[#DDDDD8] text-[#1a1a1a] focus:border-[#378ADD]' : 'border-dashed border-[#DDDDD8] text-[#ccc]'
                      }`}
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
