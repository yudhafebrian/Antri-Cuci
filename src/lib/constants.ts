export const MENIT = 15;

export type StageRegular = 'waiting' | 'basah' | 'kering' | 'qc' | 'selesai';
export type StagePremium = 'waiting' | 'basah' | 'kering' | 'antripoles' | 'poles' | 'qc' | 'selesai';
export type Stage = StageRegular | StagePremium;
export type VehicleType = 'regular' | 'premium';
export type VehicleCategory = 'mobil' | 'motor';

export const STAGES_REGULAR: StageRegular[] = ['waiting', 'basah', 'kering', 'qc', 'selesai'];
export const STAGES_PREMIUM: StagePremium[] = ['waiting', 'basah', 'kering', 'antripoles', 'poles', 'qc', 'selesai'];

export interface StageCfg {
  label: string;
  dotColor: string;
  numBg: string;
  numColor: string;
  badgeBg: string;
  badgeColor: string;
}

export const STAGE_CFG: Record<Stage, StageCfg> = {
  waiting:    { label: 'Menunggu',    dotColor: '#EF9F27', numBg: '#FAEEDA', numColor: '#633806', badgeBg: '#FAEEDA', badgeColor: '#633806' },
  basah:      { label: 'Basah',       dotColor: '#378ADD', numBg: '#E6F1FB', numColor: '#0C447C', badgeBg: '#E6F1FB', badgeColor: '#0C447C' },
  kering:     { label: 'Pengeringan', dotColor: '#639922', numBg: '#EAF3DE', numColor: '#27500A', badgeBg: '#EAF3DE', badgeColor: '#27500A' },
  qc:         { label: 'QC',          dotColor: '#8B44E0', numBg: '#F0E6FB', numColor: '#4A0C7C', badgeBg: '#F0E6FB', badgeColor: '#4A0C7C' },
  antripoles: { label: 'Antri Poles', dotColor: '#D44A9A', numBg: '#FDE8F5', numColor: '#7C0C55', badgeBg: '#FDE8F5', badgeColor: '#7C0C55' },
  poles:      { label: 'Poles',       dotColor: '#E06520', numBg: '#FFE8D6', numColor: '#7C3000', badgeBg: '#FFE8D6', badgeColor: '#7C3000' },
  selesai:    { label: 'Selesai',     dotColor: '#1D9E75', numBg: '#D4F5E9', numColor: '#0A4D31', badgeBg: '#D4F5E9', badgeColor: '#0A4D31' },
};

export const TIME_LABELS: Record<Stage, string> = {
  waiting:    'Jam Masuk',
  basah:      'Jam Basah',
  kering:     'Jam Kering',
  antripoles: 'Jam Antri Poles',
  poles:      'Jam Poles',
  qc:         'Jam QC',
  selesai:    'Jam Selesai',
};

export interface PaketSize {
  size: string;
  price: number;
}

export interface Paket {
  label: string;
  sizes: PaketSize[];
}

export interface PaketGroup {
  group: string;
  items: Paket[];
}

// ── Car packages ─────────────────────────────────────────────────────────────
const REGULAR_CAR: Paket[] = [
  { label: 'Regular Car Wash', sizes: [{ size: 'Small–Medium', price: 55000 }, { size: 'Large', price: 60000 }, { size: 'Extra Large', price: 75000 }] },
  { label: 'Wash Detail',      sizes: [{ size: 'Small–Medium', price: 150000 }, { size: 'Large', price: 200000 }, { size: 'Extra Large', price: 250000 }] },
];

const CUCI_PAKET: Paket[] = [
  { label: 'Wash Wax',                sizes: [{ size: 'Small–Medium', price: 230000 }, { size: 'Large', price: 285000 }, { size: 'Extra Large', price: 350000 }] },
  { label: 'Wash Windows Care',       sizes: [{ size: 'Small–Medium', price: 350000 }, { size: 'Large', price: 400000 }, { size: 'Extra Large', price: 450000 }] },
  { label: 'Wash Shine',              sizes: [{ size: 'Small–Medium', price: 500000 }, { size: 'Large', price: 600000 }, { size: 'Extra Large', price: 700000 }] },
  { label: 'Wash Fast Polish',        sizes: [{ size: 'Small–Medium', price: 455000 }, { size: 'Large', price: 585000 }, { size: 'Extra Large', price: 625000 }] },
  { label: 'Wash Exterior Express',   sizes: [{ size: 'Small–Medium', price: 855000 }, { size: 'Large', price: 960000 }, { size: 'Extra Large', price: 1075000 }] },
  { label: 'Interior Express',        sizes: [{ size: '2 Baris', price: 910000 }, { size: '3 Baris', price: 1210000 }, { size: '>3 Baris', price: 1500000 }] },
  { label: 'Engine Express',          sizes: [{ size: 'All Size', price: 250000 }] },
  { label: 'Poles Baret Wiper',       sizes: [{ size: 'All Size', price: 850000 }] },
  { label: 'Nano Coating Kaca',       sizes: [{ size: 'All Size', price: 500000 }] },
];

const DETAILING: Paket[] = [
  { label: 'Exterior Detailing',         sizes: [{ size: 'Small', price: 1675000 }, { size: 'Medium', price: 2075000 }, { size: 'Large', price: 2350000 }, { size: 'Extra Large', price: 2750000 }] },
  { label: 'Interior Detailing',         sizes: [{ size: '2 Baris', price: 2005000 }, { size: '3 Baris', price: 2450000 }, { size: '>3 Baris', price: 2900000 }] },
  { label: 'Engine Detailing',           sizes: [{ size: 'Small', price: 650000 }, { size: 'Medium', price: 750000 }, { size: 'Large/XL', price: 850000 }] },
  { label: 'Under Carriage Detailing',   sizes: [{ size: 'Small–Medium', price: 1500000 }, { size: 'Large–XL', price: 2000000 }] },
  { label: 'Wheels & Brakes Treatment',  sizes: [{ size: 'Small–Medium', price: 550000 }, { size: 'Large–XL', price: 650000 }] },
];

const NANO_CERAMIC: Paket[] = [
  { label: 'Nano Coating Reguler',     sizes: [{ size: 'Xtra Small', price: 4500000 }, { size: 'Small', price: 5000000 }, { size: 'Medium', price: 5500000 }, { size: 'Large', price: 6000000 }, { size: 'Extra Large', price: 6500000 }] },
  { label: 'Nano Coating Flagship',    sizes: [{ size: 'Xtra Small', price: 8950000 }, { size: 'Small', price: 9950000 }, { size: 'Medium', price: 10950000 }, { size: 'Large', price: 11950000 }, { size: 'Extra Large', price: 12950000 }] },
  { label: 'Maintenance Nano Coating', sizes: [{ size: 'Small', price: 1250000 }, { size: 'Medium', price: 1500000 }, { size: 'Large', price: 1750000 }, { size: 'Extra Large', price: 2000000 }] },
];

const PPF_MOBIL: Paket[] = [
  { label: 'PPF Mobil', sizes: [{ size: 'Xtra Small', price: 35000000 }, { size: 'Small', price: 40000000 }, { size: 'Medium', price: 45000000 }, { size: 'Large', price: 50000000 }, { size: 'Extra Large', price: 60000000 }] },
];

const SOUND_PROOF: Paket[] = [
  { label: 'Doors Only (3 Doors)',      sizes: [{ size: '3 Doors', price: 2000000 }] },
  { label: 'Doors Only (5 Doors)',      sizes: [{ size: '5 Doors', price: 2500000 }] },
  { label: 'Plafond Only',              sizes: [{ size: 'Small', price: 2250000 }, { size: 'Non Small', price: 3250000 }] },
  { label: 'Lantai, Fender, Firewall',  sizes: [{ size: 'Small', price: 12000000 }, { size: 'Non Small', price: 15500000 }] },
  { label: 'Sound Proof All Parts',     sizes: [{ size: 'Small', price: 16000000 }, { size: 'Non Small', price: 20000000 }] },
];

const RAPTOR: Paket[] = [
  { label: 'Raptor All Body',     sizes: [{ size: 'Small', price: 35000000 }, { size: 'Medium', price: 40000000 }, { size: 'Large', price: 52500000 }, { size: 'Extra Large', price: 61500000 }] },
  { label: 'Anti Karat Kolongan', sizes: [{ size: 'Small', price: 3000000 }, { size: 'Medium', price: 3500000 }, { size: 'Large', price: 4000000 }, { size: 'Extra Large', price: 4800000 }] },
];

// ── Motorcycle packages ───────────────────────────────────────────────────────
const PAKET_MOTOR: Paket[] = [
  { label: 'Regular Bike Wash',   sizes: [{ size: '<250 cc', price: 50000 }, { size: '>250 cc', price: 75000 }, { size: '>400 cc', price: 100000 }] },
  { label: 'Wash Wax Bike',       sizes: [{ size: '<250 cc', price: 125000 }, { size: '>250 cc', price: 175000 }, { size: '>400 cc', price: 225000 }] },
  { label: 'Nano Coating Motor',  sizes: [{ size: '<250 cc', price: 2000000 }, { size: '250–400 cc', price: 2500000 }, { size: '>400–600 cc', price: 3000000 }] },
  { label: 'PPF Motor',           sizes: [{ size: 'Small (Mio)', price: 17500000 }, { size: 'Medium (NMAX)', price: 22500000 }, { size: 'Large (XMAX)', price: 27500000 }, { size: 'Extra Large (TMAX)', price: 35000000 }] },
];

// ── Grouped for form display ──────────────────────────────────────────────────
export const PAKET_GROUPS_MOBIL: PaketGroup[] = [
  { group: 'Regular Wash', items: REGULAR_CAR },
  { group: 'Cuci Paket (One Day Service)', items: CUCI_PAKET },
  { group: 'Detailing (À La Carte)', items: DETAILING },
  { group: 'Nano Ceramic', items: NANO_CERAMIC },
  { group: 'Paint Protection Film (PPF)', items: PPF_MOBIL },
  { group: 'Peredam Suara (Sound Proof)', items: SOUND_PROOF },
  { group: 'Raptor Coating', items: RAPTOR },
];

export const PAKET_GROUPS_MOTOR: PaketGroup[] = [
  { group: 'Paket Motor', items: PAKET_MOTOR },
];

// ── Flat lists for lookup ─────────────────────────────────────────────────────
export const PRICE_LIST_REGULAR: Paket[] = [...REGULAR_CAR, PAKET_MOTOR[0]];
export const ALL_PAKETS: Paket[] = [
  ...REGULAR_CAR, ...CUCI_PAKET, ...DETAILING, ...NANO_CERAMIC,
  ...PPF_MOBIL, ...SOUND_PROOF, ...RAPTOR, ...PAKET_MOTOR,
];

const REGULAR_LABELS = new Set([...REGULAR_CAR, PAKET_MOTOR[0]].map((p) => p.label));
export function getQueueType(paketLabel: string): VehicleType {
  return REGULAR_LABELS.has(paketLabel) ? 'regular' : 'premium';
}

export function inferVehicleCategory(paketLabel: string): VehicleCategory {
  return PAKET_MOTOR.some((p) => p.label === paketLabel) ? 'motor' : 'mobil';
}

export function getPaket(label: string): Paket | undefined {
  return ALL_PAKETS.find((p) => p.label === label);
}

export function stagesOf(type: VehicleType): Stage[] {
  return type === 'regular' ? STAGES_REGULAR : STAGES_PREMIUM;
}

// ── Brand lists ───────────────────────────────────────────────────────────────
export const MERK_DB_MOBIL: Record<string, string[]> = {
  Toyota:     ['Toyota Avanza', 'Toyota Innova', 'Toyota Fortuner', 'Toyota Calya', 'Toyota Yaris', 'Toyota Rush', 'Toyota Raize', 'Toyota Kijang', 'Toyota Veloz'],
  Honda:      ['Honda Brio', 'Honda Jazz', 'Honda City', 'Honda Civic', 'Honda CR-V', 'Honda HR-V', 'Honda Mobilio', 'Honda Freed', 'Honda BR-V'],
  Daihatsu:   ['Daihatsu Xenia', 'Daihatsu Terios', 'Daihatsu Sigra', 'Daihatsu Ayla', 'Daihatsu Gran Max'],
  Suzuki:     ['Suzuki Ertiga', 'Suzuki XL7', 'Suzuki Ignis', 'Suzuki Baleno'],
  Mitsubishi: ['Mitsubishi Xpander', 'Mitsubishi Pajero', 'Mitsubishi L300', 'Mitsubishi Outlander'],
  Nissan:     ['Nissan Livina', 'Nissan X-Trail', 'Nissan Kicks'],
  Hyundai:    ['Hyundai Creta', 'Hyundai Ioniq 5', 'Hyundai Stargazer'],
  Wuling:     ['Wuling Almaz', 'Wuling Air ev', 'Wuling Confero'],
  Lainnya:    ['Pick Up / Truk', 'Lainnya'],
};

export const MERK_DB_MOTOR: Record<string, string[]> = {
  Yamaha:   ['Yamaha NMAX', 'Yamaha XMAX', 'Yamaha TMAX', 'Yamaha Aerox', 'Yamaha Mio', 'Yamaha R15', 'Yamaha R25'],
  Honda:    ['Honda PCX', 'Honda ADV', 'Honda Vario', 'Honda Beat', 'Honda CBR', 'Honda CB500'],
  Kawasaki: ['Kawasaki Ninja 250', 'Kawasaki Ninja 400', 'Kawasaki Z400', 'Kawasaki Versys'],
  Suzuki:   ['Suzuki GSX-R150', 'Suzuki Address', 'Suzuki Burgman'],
  Lainnya:  ['Motor Lainnya'],
};

export function fmtRp(value: number): string {
  return 'Rp' + value.toLocaleString('id-ID');
}

export function fmtTime(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${String(date.getHours()).padStart(2, '0')}.${String(date.getMinutes()).padStart(2, '0')}`;
}

export function isoToTimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function timeInputToIso(timeStr: string, referenceIso?: string | null): string {
  const ref = referenceIso ? new Date(referenceIso) : new Date();
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(ref);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export function waNo(raw: string): string {
  return raw.startsWith('0') ? '62' + raw.slice(1) : raw;
}
