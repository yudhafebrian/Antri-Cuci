export const MENIT = 15;

export type StageRegular = 'menunggu' | 'basah' | 'kering' | 'qc' | 'selesai';
export type StagePremium = 'menunggu' | 'basah' | 'kering' | 'qc' | 'antri_poles' | 'poles' | 'selesai';
export type StageTerminal = 'diambil' | 'cancel';
export type Stage = StageRegular | StagePremium | StageTerminal;
export type WorkflowType = 'regular' | 'premium';
export type VehicleCategory = 'mobil' | 'motor';

export const STAGES_REGULAR: StageRegular[] = ['menunggu', 'basah', 'kering', 'qc', 'selesai'];
export const STAGES_PREMIUM: StagePremium[] = ['menunggu', 'basah', 'kering', 'qc', 'antri_poles', 'poles', 'selesai'];
export const TERMINAL_STATUSES: StageTerminal[] = ['diambil', 'cancel'];
export const ACTIVE_STATUSES: Stage[] = [...STAGES_REGULAR.slice(0, -1), 'selesai', 'antri_poles', 'poles'];
// Queue aktif = NOT IN terminal statuses

export interface StageCfg {
  label: string;
  dotColor: string;
  numBg: string;
  numColor: string;
  badgeBg: string;
  badgeColor: string;
}

export const STAGE_CFG: Record<Stage, StageCfg> = {
  menunggu:   { label: 'Menunggu',    dotColor: '#EF9F27', numBg: '#FAEEDA', numColor: '#633806', badgeBg: '#FAEEDA', badgeColor: '#633806' },
  basah:      { label: 'Basah',       dotColor: '#378ADD', numBg: '#E6F1FB', numColor: '#0C447C', badgeBg: '#E6F1FB', badgeColor: '#0C447C' },
  kering:     { label: 'Pengeringan', dotColor: '#639922', numBg: '#EAF3DE', numColor: '#27500A', badgeBg: '#EAF3DE', badgeColor: '#27500A' },
  qc:         { label: 'QC',          dotColor: '#8B44E0', numBg: '#F0E6FB', numColor: '#4A0C7C', badgeBg: '#F0E6FB', badgeColor: '#4A0C7C' },
  antri_poles:{ label: 'Antri Poles', dotColor: '#D44A9A', numBg: '#FDE8F5', numColor: '#7C0C55', badgeBg: '#FDE8F5', badgeColor: '#7C0C55' },
  poles:      { label: 'Poles',       dotColor: '#E06520', numBg: '#FFE8D6', numColor: '#7C3000', badgeBg: '#FFE8D6', badgeColor: '#7C3000' },
  selesai:    { label: 'Selesai',     dotColor: '#1D9E75', numBg: '#D4F5E9', numColor: '#0A4D31', badgeBg: '#D4F5E9', badgeColor: '#0A4D31' },
  diambil:    { label: 'Diambil',     dotColor: '#1a1a1a', numBg: '#F0F0EC', numColor: '#444',    badgeBg: '#F0F0EC', badgeColor: '#444'    },
  cancel:     { label: 'Dibatalkan',  dotColor: '#A32D2D', numBg: '#FFE8E8', numColor: '#A32D2D', badgeBg: '#FFE8E8', badgeColor: '#A32D2D' },
};

export const TIME_LABELS: Record<Stage, string> = {
  menunggu:   'Jam Masuk',
  basah:      'Jam Basah',
  kering:     'Jam Kering',
  antri_poles:'Jam Antri Poles',
  poles:      'Jam Poles',
  qc:         'Jam QC',
  selesai:    'Jam Selesai',
  diambil:    'Jam Diambil',
  cancel:     'Jam Cancel',
};

// ── Package categories ────────────────────────────────────────────────────────
// Matches the `category` column in the `packages` table
export type PackageCategory =
  | 'regular_wash'
  | 'one_day_service'
  | 'detailing'
  | 'nano_coating'
  | 'ppf'
  | 'sound_proof'
  | 'raptor'
  | 'paket_motor';

// Human-readable labels for each category (used in form group headers)
export const CATEGORY_LABELS: Record<PackageCategory, string> = {
  regular_wash:    'Regular Wash',
  one_day_service: 'Cuci Paket (One Day Service)',
  detailing:       'Detailing (À La Carte)',
  nano_coating:    'Nano Ceramic',
  ppf:             'Paint Protection Film (PPF)',
  sound_proof:     'Peredam Suara (Sound Proof)',
  raptor:          'Raptor Coating',
  paket_motor:     'Paket Motor',
};

export function stagesOf(workflowType: WorkflowType): Stage[] {
  return workflowType === 'regular' ? STAGES_REGULAR : STAGES_PREMIUM;
}

export function isActiveStatus(status: string): boolean {
  return !TERMINAL_STATUSES.includes(status as StageTerminal);
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
