# Refactor: Database Schema & Data Flow (FIP Autoshop Queue System)

## Tujuan

Mengubah arsitektur database dari dua tabel (`queue` + `vehicle_history`) menjadi tiga tabel (`vehicle_history`, `packages`, `service_orders`) sesuai dokumen referensi, serta menyesuaikan seluruh layer kode TypeScript yang bergantung pada skema lama.

---

## Ringkasan Perubahan

### Skema Lama → Baru

| Lama | Baru | Keterangan |
|---|---|---|
| `queue` | `service_orders` | Rename + restructure. Menggabungkan queue aktif & histori dalam satu tabel. |
| `vehicle_history` (field: `plat`, `wa`, `nama`, `merk`, `vehicle_category`) | `vehicle_history` (field: `plate_number`, `owner_name`, `whatsapp_number`, `vehicle_name`, `vehicle_type`, `notes`, `updated_at`) | Rename kolom + tambah kolom baru |
| _(tidak ada)_ | `packages` | Tabel baru: master data paket layanan dengan SOP minutes |
| `stage` (teks bebas, `waiting`) | `current_status` (enum-like, `menunggu`) | Rename kolom + ubah nilai awal dari `waiting` → `menunggu` |
| `type` (`regular`/`premium`) | didapat dari `packages.workflow_type` | Tidak disimpan di `service_orders` secara eksplisit |
| `harga` | `package_price` (snapshot saat order dibuat) | Rename |
| `paket`, `size` | `package_name` (snapshot saat order dibuat), `package_id` (FK) | Strukturisasi ulang |
| Tabel `queue` dihapus saat `selesai`/delete | `service_orders` tidak pernah dihapus | Data retention |

### Perubahan Status Workflow

| Lama | Baru |
|---|---|
| `waiting` | `menunggu` |
| `basah` | `basah` (sama) |
| `kering` | `kering` (sama) |
| `antripoles` | `antri_poles` (underscore, konsisten) |
| `poles` | `poles` (sama) |
| `qc` | `qc` (sama) |
| `selesai` | `selesai` (sama) |
| _(tidak ada)_ | `diambil` (terminal: kendaraan keluar queue aktif) |
| _(tidak ada)_ | `cancel` (terminal: dibatalkan) |

Queue aktif = `current_status NOT IN ('diambil', 'cancel')`

---

## Fase Implementasi

### Fase 1: Database NeonDB (Migrasi Skema)

**File baru:** `neon/migrations/003_refactor_schema.sql`

#### 1a. Ubah tabel `vehicle_history`
- Rename kolom: `plat` → `plate_number`, `wa` → `whatsapp_number`, `nama` → `owner_name`, `merk` → `vehicle_name`, `vehicle_category` → `vehicle_type`
- Tambah kolom: `notes TEXT DEFAULT ''`, `updated_at TIMESTAMPTZ DEFAULT now()`

#### 1b. Buat tabel `packages`

Satu baris per kombinasi **nama paket + ukuran**. Total: **89 baris** (76 mobil + 13 motor).

```sql
CREATE TABLE packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  size text NOT NULL DEFAULT '',        -- 'Small–Medium', 'Large', 'All Size', '<250 cc', dll.
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('car', 'bike')),
  workflow_type text NOT NULL CHECK (workflow_type IN ('regular', 'premium')),
  price integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0, -- urutan tampil di form
  sop_basah_minutes integer NOT NULL DEFAULT 15,
  sop_kering_minutes integer NOT NULL DEFAULT 15,
  sop_qc_minutes integer NOT NULL DEFAULT 10,
  sop_poles_minutes integer NOT NULL DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

Implikasi pada `service_orders`:
- `package_id` merujuk ke satu baris varian spesifik → ukuran sudah implicit dari variant
- `package_size` di `service_orders` tetap disimpan sebagai **snapshot** untuk readability
- `package_name` di `service_orders` juga snapshot (nama paket tanpa ukuran)

**Seed data lengkap** (dari `Price List Fip Auto Mobil.txt` dan `Price List Fip Auto Motor.txt`):

| group | name | size | vehicle_type | workflow_type | price |
|---|---|---|---|---|---|
| Regular Wash | Regular Car Wash | Small–Medium | car | regular | 55000 |
| Regular Wash | Regular Car Wash | Large | car | regular | 60000 |
| Regular Wash | Regular Car Wash | Extra Large | car | regular | 75000 |
| Regular Wash | Wash Detail | Small–Medium | car | premium | 150000 |
| Regular Wash | Wash Detail | Large | car | premium | 200000 |
| Regular Wash | Wash Detail | Extra Large | car | premium | 250000 |
| Cuci Paket | Wash Wax | Small–Medium | car | premium | 230000 |
| Cuci Paket | Wash Wax | Large | car | premium | 285000 |
| Cuci Paket | Wash Wax | Extra Large | car | premium | 350000 |
| Cuci Paket | Wash Windows Care | Small–Medium | car | premium | 350000 |
| Cuci Paket | Wash Windows Care | Large | car | premium | 400000 |
| Cuci Paket | Wash Windows Care | Extra Large | car | premium | 450000 |
| Cuci Paket | Wash Shine | Small–Medium | car | premium | 500000 |
| Cuci Paket | Wash Shine | Large | car | premium | 600000 |
| Cuci Paket | Wash Shine | Extra Large | car | premium | 700000 |
| Cuci Paket | Wash Fast Polish | Small–Medium | car | premium | 455000 |
| Cuci Paket | Wash Fast Polish | Large | car | premium | 585000 |
| Cuci Paket | Wash Fast Polish | Extra Large | car | premium | 625000 |
| Cuci Paket | Wash Exterior Express | Small–Medium | car | premium | 855000 |
| Cuci Paket | Wash Exterior Express | Large | car | premium | 960000 |
| Cuci Paket | Wash Exterior Express | Extra Large | car | premium | 1075000 |
| Cuci Paket | Interior Express | 2 Baris | car | premium | 910000 |
| Cuci Paket | Interior Express | 3 Baris | car | premium | 1210000 |
| Cuci Paket | Interior Express | >3 Baris | car | premium | 1500000 |
| Cuci Paket | Engine Express | All Size | car | premium | 250000 |
| Cuci Paket | Poles Baret Wiper | All Size | car | premium | 850000 |
| Cuci Paket | Nano Coating Kaca | All Size | car | premium | 500000 |
| Detailing | Exterior Detailing | Small | car | premium | 1675000 |
| Detailing | Exterior Detailing | Medium | car | premium | 2075000 |
| Detailing | Exterior Detailing | Large | car | premium | 2350000 |
| Detailing | Exterior Detailing | Extra Large | car | premium | 2750000 |
| Detailing | Interior Detailing | 2 Baris | car | premium | 2005000 |
| Detailing | Interior Detailing | 3 Baris | car | premium | 2450000 |
| Detailing | Interior Detailing | >3 Baris | car | premium | 2900000 |
| Detailing | Engine Detailing | Small | car | premium | 650000 |
| Detailing | Engine Detailing | Medium | car | premium | 750000 |
| Detailing | Engine Detailing | Large/XL | car | premium | 850000 |
| Detailing | Under Carriage Detailing | Small–Medium | car | premium | 1500000 |
| Detailing | Under Carriage Detailing | Large–XL | car | premium | 2000000 |
| Detailing | Wheels & Brakes Treatment | Small–Medium | car | premium | 550000 |
| Detailing | Wheels & Brakes Treatment | Large–XL | car | premium | 650000 |
| Nano Ceramic | Nano Coating Reguler | Xtra Small | car | premium | 4500000 |
| Nano Ceramic | Nano Coating Reguler | Small | car | premium | 5000000 |
| Nano Ceramic | Nano Coating Reguler | Medium | car | premium | 5500000 |
| Nano Ceramic | Nano Coating Reguler | Large | car | premium | 6000000 |
| Nano Ceramic | Nano Coating Reguler | Extra Large | car | premium | 6500000 |
| Nano Ceramic | Nano Coating Flagship | Xtra Small | car | premium | 8950000 |
| Nano Ceramic | Nano Coating Flagship | Small | car | premium | 9950000 |
| Nano Ceramic | Nano Coating Flagship | Medium | car | premium | 10950000 |
| Nano Ceramic | Nano Coating Flagship | Large | car | premium | 11950000 |
| Nano Ceramic | Nano Coating Flagship | Extra Large | car | premium | 12950000 |
| Nano Ceramic | Maintenance Nano Coating | Small | car | premium | 1250000 |
| Nano Ceramic | Maintenance Nano Coating | Medium | car | premium | 1500000 |
| Nano Ceramic | Maintenance Nano Coating | Large | car | premium | 1750000 |
| Nano Ceramic | Maintenance Nano Coating | Extra Large | car | premium | 2000000 |
| PPF | PPF Mobil | Xtra Small | car | premium | 35000000 |
| PPF | PPF Mobil | Small | car | premium | 40000000 |
| PPF | PPF Mobil | Medium | car | premium | 45000000 |
| PPF | PPF Mobil | Large | car | premium | 50000000 |
| PPF | PPF Mobil | Extra Large | car | premium | 60000000 |
| Sound Proof | Doors Only | 3 Doors | car | premium | 2000000 |
| Sound Proof | Doors Only | 5 Doors | car | premium | 2500000 |
| Sound Proof | Plafond Only | Small | car | premium | 2250000 |
| Sound Proof | Plafond Only | Non Small | car | premium | 3250000 |
| Sound Proof | Lantai, Fender, Firewall | Small | car | premium | 12000000 |
| Sound Proof | Lantai, Fender, Firewall | Non Small | car | premium | 15500000 |
| Sound Proof | Sound Proof All Parts | Small | car | premium | 16000000 |
| Sound Proof | Sound Proof All Parts | Non Small | car | premium | 20000000 |
| Raptor | Raptor All Body | Small | car | premium | 35000000 |
| Raptor | Raptor All Body | Medium | car | premium | 40000000 |
| Raptor | Raptor All Body | Large | car | premium | 52500000 |
| Raptor | Raptor All Body | Extra Large | car | premium | 61500000 |
| Raptor | Anti Karat Kolongan | Small | car | premium | 3000000 |
| Raptor | Anti Karat Kolongan | Medium | car | premium | 3500000 |
| Raptor | Anti Karat Kolongan | Large | car | premium | 4000000 |
| Raptor | Anti Karat Kolongan | Extra Large | car | premium | 4800000 |
| Paket Motor | Regular Bike Wash | <250 cc | bike | regular | 50000 |
| Paket Motor | Regular Bike Wash | >250 cc | bike | regular | 75000 |
| Paket Motor | Regular Bike Wash | >400 cc | bike | regular | 100000 |
| Paket Motor | Wash Wax Bike | <250 cc | bike | premium | 125000 |
| Paket Motor | Wash Wax Bike | >250 cc | bike | premium | 175000 |
| Paket Motor | Wash Wax Bike | >400 cc | bike | premium | 225000 |
| Paket Motor | Nano Coating Motor | <250 cc | bike | premium | 2000000 |
| Paket Motor | Nano Coating Motor | 250–400 cc | bike | premium | 2500000 |
| Paket Motor | Nano Coating Motor | >400–600 cc | bike | premium | 3000000 |
| Paket Motor | PPF Motor | Small (Mio) | bike | premium | 17500000 |
| Paket Motor | PPF Motor | Medium (NMAX) | bike | premium | 22500000 |
| Paket Motor | PPF Motor | Large (XMAX) | bike | premium | 27500000 |
| Paket Motor | PPF Motor | Extra Large (TMAX) | bike | premium | 35000000 |

> **Catatan nama:** Di price list "All Parts" untuk Sound Proof, namun di `constants.ts` sudah bernama "Sound Proof All Parts" — gunakan nama dari `constants.ts` agar konsisten dengan frontend yang sudah ada.
>
> Kolom `sort_order` diisi berurutan per group untuk mempertahankan urutan tampil di form.

#### 1c. Buat tabel `service_orders`
```sql
CREATE TABLE service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_number integer,
  vehicle_id uuid NOT NULL REFERENCES vehicle_history(id),
  package_id uuid REFERENCES packages(id),
  package_name text NOT NULL DEFAULT '',
  package_price integer NOT NULL DEFAULT 0,
  package_size text NOT NULL DEFAULT '',      -- snapshot ukuran saat order
  current_status text NOT NULL DEFAULT 'menunggu',
  notes text NOT NULL DEFAULT '',
  times jsonb NOT NULL DEFAULT '{
    "menunggu": null,
    "basah": null,
    "kering": null,
    "qc": null,
    "antri_poles": null,
    "poles": null,
    "selesai": null,
    "diambil": null,
    "cancel": null
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX service_orders_status_idx ON service_orders (current_status);
CREATE INDEX service_orders_created_at_idx ON service_orders (created_at);
CREATE INDEX service_orders_vehicle_id_idx ON service_orders (vehicle_id);
CREATE INDEX service_orders_package_id_idx ON service_orders (package_id);
```

#### 1d. Reset & Drop tabel `queue`

Data lama di `queue` tidak perlu dimigrasi. Cukup drop tabel `queue` langsung.

```sql
DROP TABLE IF EXISTS queue;
```

---

### Fase 2: TypeScript Types & Constants

**File:** `src/lib/constants.ts`

- Ubah `Stage` type: ganti `'waiting'` → `'menunggu'`, `'antripoles'` → `'antri_poles'`, tambah `'diambil'` dan `'cancel'`
- Ubah `STAGES_REGULAR`: `['menunggu', 'basah', 'kering', 'qc', 'selesai']`
- Ubah `STAGES_PREMIUM`: `['menunggu', 'basah', 'kering', 'qc', 'antri_poles', 'poles', 'selesai']`
- Tambah `TERMINAL_STATUSES`: `['diambil', 'cancel']`
- Tambah `ACTIVE_STATUSES`: semua status kecuali terminal (untuk filter queue aktif)
- Ubah `STAGE_CFG`: tambah entry `menunggu` (ganti `waiting`), `antri_poles` (ganti `antripoles`), `diambil`, `cancel`
- Ubah `TIME_LABELS`: sesuaikan key baru
- Hapus helper `getQueueType()` (sekarang datang dari `packages.workflow_type` di DB)
- Pertahankan `PAKET_GROUPS_MOBIL`, `PAKET_GROUPS_MOTOR`, `getPaket()`, `ALL_PAKETS` — masih digunakan sebagai referensi display grouping di form, tapi harga & ID kini dari DB
- Tambah kolom `group` pada data paket (nama category group) agar bisa di-match dengan data dari DB untuk menampilkan grouping yang sama

**File:** `src/lib/neon.ts`

- Hapus interface `QueueRow` (tidak relevan lagi)
- Tambah interface `ServiceOrderRow`, `VehicleHistoryRow`, `PackageRow`

---

### Fase 3: Data Layer (`src/lib/db.ts`)

Ini adalah perubahan terbesar. Seluruh fungsi dirubah untuk menggunakan skema baru:

| Fungsi Lama | Fungsi Baru | Perubahan |
|---|---|---|
| `loadQueue()` | `loadActiveOrders()` | Query dari `service_orders` JOIN `vehicle_history` JOIN `packages` WHERE `current_status NOT IN ('diambil','cancel')` |
| `insertQueue()` | `createServiceOrder()` | 1) upsert `vehicle_history`, 2) lookup `package_id`, 3) insert `service_orders` dengan `times` berisi semua key (null kecuali `menunggu`) |
| `updateQueue()` | `updateServiceOrder()` | Update `current_status`, `times`, `notes`, dll di `service_orders` |
| `deleteQueue()` | `cancelServiceOrder()` | Set `current_status = 'cancel'`, `times.cancel = now()` (tidak delete!) |
| `loadHistory()` | `loadVehicleHistory()` | Query dari `vehicle_history` dengan nama kolom baru |
| `upsertHistory()` | dihilangkan sebagai fungsi terpisah | Sekarang terintegrasi dalam `createServiceOrder()` |
| `loadCompletedQueue()` | `loadOrdersForReport()` | Query dari `service_orders` dengan filter date range, termasuk join ke packages untuk SOP minutes |
| `subscribeToQueue()` | `subscribeToOrders()` | Sama: polling 3 detik untuk Neon |

Tambah fungsi baru:
- `loadPackages()`: load semua packages dari DB
- `markOrderPickedUp()`: set `current_status = 'diambil'`, `times.diambil = now()`

Hapus dukungan Supabase (karena `VITE_DB_PROVIDER=neon` dan Supabase sudah tidak aktif). Sederhanakan `db.ts` menjadi Neon-only.

---

### Fase 4: Komponen QueueForm (`src/components/QueueForm.tsx`)

- Tambah `useEffect` untuk load `packages` dari DB via `loadPackages()` saat komponen mount
- **Perubahan logika pemilihan paket:**
  - Dulu: dropdown paket dari `PAKET_GROUPS_MOBIL`/`PAKET_GROUPS_MOTOR` (hardcoded di `constants.ts`), lalu pilih ukuran → harga dari `getPaket()` helper
  - Baru: group packages dari DB berdasarkan nama unik, lalu saat nama dipilih tampilkan ukuran yang tersedia dari varian DB → pilih varian → set `package_id`, `package_name`, `package_size`, `package_price`
  - Konstanta `PAKET_GROUPS_MOBIL`/`PAKET_GROUPS_MOTOR` di `constants.ts` tidak dihapus (masih berguna sebagai fallback/display), namun harga dan ID kini datang dari DB
- Ubah pemanggilan `insertQueue()` → `createServiceOrder()` dengan payload baru: `{ vehicle_id, package_id, package_name, package_size, package_price, notes }`
- Ubah `upsertHistory()` → tidak perlu dipanggil terpisah (sudah ada di `createServiceOrder()`)
- Ubah `loadHistory()` → `loadVehicleHistory()` dengan mapping field baru (`plate_number`, `owner_name`, `whatsapp_number`, `vehicle_name`, `vehicle_type`)
- Ubah `type HistoryHit` untuk pakai field name baru
- Ubah initial `times` object: semua key terisi null kecuali `menunggu`
- Ubah ETA estimation: gunakan `current_status` sebagai pengganti `stage`, filter dengan `current_status === 'menunggu'` (bukan `'waiting'`)

---

### Fase 5: Komponen QueueList & QueueCard (`src/components/QueueList.tsx`)

- Ubah semua referensi `car.stage` → `car.current_status`
- Ubah `car.plat` → `car.plate_number`, `car.nama` → `car.owner_name`, `car.wa` → `car.whatsapp_number`, `car.merk` → `car.vehicle_name`, `car.paket` → `car.package_name`, `car.harga` → `car.package_price`
- Ubah `car.type` (regular/premium) → didapat dari package's `workflow_type` (sudah di-join saat load)
- Ubah fungsi `advance()`: panggil `updateServiceOrder()` dengan field `current_status` dan `times`
- Ubah fungsi `undo()`: logika sama, gunakan field baru
- Ubah fungsi `hapus()` → `cancelOrder()`: panggil `cancelServiceOrder()` (soft delete) bukan `deleteQueue()`
- Tambah tombol "Diambil" untuk stage `selesai`: panggil `markOrderPickedUp()`
- Update WA messages: ganti referensi field

---

### Fase 6: DetailModal (`src/components/DetailModal.tsx`)

- Ubah field references (sama seperti QueueList)
- Ubah edit form: gunakan field name baru
- Pastikan `times` editing masih bekerja dengan format jsonb baru (semua key selalu ada)

---

### Fase 7: AdminView (`src/components/AdminView.tsx`)

- Ubah referensi `QueueRow` → `ServiceOrderRow`
- Ubah stats counter: gunakan `current_status` bukan `stage`
- Ubah filter untuk "queue aktif" vs "selesai"

---

### Fase 8: AntrianPage / PublicView (`src/pages/AntrianPage.tsx`)

- Ubah referensi field sesuai skema baru
- Queue aktif: filter `current_status NOT IN ('diambil', 'cancel')`

---

### Fase 9: Report (`src/lib/reportUtils.ts`, `src/pages/ReportPage.tsx`, `src/components/report/`)

- `loadOrdersForReport()` menggantikan `loadCompletedQueue()`: query semua `service_orders` dengan `current_status = 'diambil'` (sudah selesai diambil) dalam date range
- Ubah KPI calculation: gunakan `package_price` bukan `harga`, `package_name` bukan `paket`
- Tambah **Overtime Analysis**: kalkulasi durasi per station vs `sop_*_minutes` dari packages
  - `durasi_basah = times.kering - times.basah` vs `sop_basah_minutes`
  - `durasi_kering = times.qc - times.kering` vs `sop_kering_minutes`
  - `durasi_qc = times.selesai - times.qc` vs `sop_qc_minutes`
  - `durasi_poles = times.selesai - times.poles` (premium only) vs `sop_poles_minutes`
- Tambah KPI baru: **Jam Paling Ramai** (group by hour dari `times.menunggu`), **Hari Paling Ramai** (group by day of week)
- `useReportData.ts`: Sesuaikan tipe data dan hook dengan field baru
- Report sudah menggunakan `current_status` bukan `stage`

---

### Fase 10: Migration Scripts (`scripts/`)

- Hapus `scripts/migrate-to-neon.mjs` (tidak relevan lagi)
- Tambah `scripts/seed-packages.mjs`: populate tabel `packages` dari data di `constants.ts`

---

## Urutan Implementasi (Step-by-Step)

1. **Fase 1** — Tulis migration SQL (`neon/migrations/003_refactor_schema.sql`)
2. **Fase 2** — Update types & constants (`constants.ts`, `neon.ts`)
3. **Fase 3** — Update data layer (`db.ts`) — drop Supabase support
4. **Fase 4** — Update `QueueForm.tsx`
5. **Fase 5** — Update `QueueList.tsx`
6. **Fase 6** — Update `DetailModal.tsx`
7. **Fase 7** — Update `AdminView.tsx`
8. **Fase 8** — Update `AntrianPage.tsx`
9. **Fase 9** — Update report files (`reportUtils.ts`, `useReportData.ts`, report components)
10. **Fase 10** — Update scripts

---

## Catatan Penting

### Struktur tabel `packages` (satu baris per varian)
Tabel `packages` memiliki **89 baris** — satu baris per kombinasi nama paket + ukuran. Ini memudahkan lookup langsung via `package_id` dan memastikan harga yang tepat tersimpan tanpa ambiguitas. Field `sort_order` mempertahankan urutan tampil di form yang sama seperti sebelumnya.

### `package_size` di `service_orders`
Walaupun ukuran sudah implicit dari `package_id` (FK ke varian spesifik), field `package_size` tetap disimpan sebagai **snapshot** di `service_orders` untuk:
- Readability langsung tanpa JOIN saat menampilkan detail order
- Resilience jika package data berubah di masa depan

### Supabase Support Dihapus
File `src/lib/supabase.ts` dan semua kode dual-provider di `db.ts` dihapus. `db.ts` menjadi Neon-only. File `src/lib/supabase.ts` bisa dihapus. Supabase credentials tetap ada di `.env` untuk referensi jika diperlukan.

### Data Retention
- `service_orders` tidak pernah di-DELETE
- "Hapus dari antrian" = `current_status = 'cancel'`
- "Kendaraan diambil" = `current_status = 'diambil'` (hilang dari queue aktif, tetap di report)

### `times` JSONB Format
Semua key selalu tersedia sejak order dibuat, dengan nilai `null` untuk status yang belum dicapai:
```json
{
  "menunggu": "2026-06-06T08:00:00Z",
  "basah": "2026-06-06T08:15:00Z",
  "kering": null,
  "qc": null,
  "antri_poles": null,
  "poles": null,
  "selesai": null,
  "diambil": null,
  "cancel": null
}
```

### `workflow_type` pada QueueList
`ServiceOrderRow` yang di-load dari DB sudah include `workflow_type` dari join ke `packages`. Ini menggantikan `car.type` di logika frontend.

---

## File yang Terimpact

| File | Jenis Perubahan |
|---|---|
| `neon/migrations/003_refactor_schema.sql` | **BARU** — SQL migrasi |
| `src/lib/constants.ts` | **EDIT** — Stage names, types, helpers |
| `src/lib/neon.ts` | **EDIT** — TypeScript interfaces |
| `src/lib/db.ts` | **EDIT BESAR** — Semua fungsi CRUD, drop Supabase |
| `src/lib/reportUtils.ts` | **EDIT** — Field references, overtime analysis |
| `src/components/QueueForm.tsx` | **EDIT** — Form submission, history lookup |
| `src/components/QueueList.tsx` | **EDIT** — Card render, stage transitions, cancel/pickup |
| `src/components/DetailModal.tsx` | **EDIT** — Field references, times editing |
| `src/components/AdminView.tsx` | **EDIT** — Type references, stat counters |
| `src/components/report/useReportData.ts` | **EDIT** — Data fetching hook |
| `src/pages/AdminPage.tsx` | **EDIT MINOR** — Type reference |
| `src/pages/AntrianPage.tsx` | **EDIT** — Field references, active filter |
| `src/pages/ReportPage.tsx` | **EDIT MINOR** — Type reference |
| `src/lib/supabase.ts` | **HAPUS** — Tidak diperlukan lagi |
| `scripts/migrate-to-neon.mjs` | **HAPUS** — Tidak relevan lagi |
| `scripts/seed-packages.mjs` | **BARU** — Seed packages table |
