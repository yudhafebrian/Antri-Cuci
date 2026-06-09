# Refactor: packages → packages + package_variants

## Konteks

Arsitektur tabel `packages` saat ini **salah** — satu baris per kombinasi nama+ukuran (89 baris, misal "Regular Car Wash Small-Medium", "Regular Car Wash Large"). Dokumen arsitektur melarang ini.

Yang benar:
- `packages` — satu baris per **jenis layanan** (30 baris)
- `package_variants` — satu baris per **ukuran/varian harga** (89 baris)

`service_orders` saat ini kosong (0 transaksi), sehingga migrasi data tidak diperlukan.

---

## Perubahan Database

### DROP tabel `packages` lama, buat ulang dengan skema baru

**Tabel `packages` (30 baris — satu per jenis layanan):**
```sql
CREATE TABLE packages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('car', 'bike')),
  workflow_type text NOT NULL CHECK (workflow_type IN ('regular', 'premium')),
  category     text NOT NULL CHECK (category IN (
                  'regular_wash', 'one_day_service', 'detailing',
                  'nano_coating', 'ppf', 'sound_proof', 'raptor', 'paket_motor'
               )),
  sort_order   integer NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
```

**Tabel `package_variants` (89 baris — satu per ukuran/varian):**
```sql
CREATE TABLE package_variants (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id         uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  variant_name       text NOT NULL,        -- 'Small-Medium', 'Large', 'All Size', '<250 cc', dll
  price              integer NOT NULL DEFAULT 0,
  sop_basah_minutes  integer NOT NULL DEFAULT 15,
  sop_kering_minutes integer NOT NULL DEFAULT 15,
  sop_qc_minutes     integer NOT NULL DEFAULT 10,
  sop_poles_minutes  integer NOT NULL DEFAULT 30,
  sort_order         integer NOT NULL DEFAULT 0,
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);
CREATE INDEX package_variants_package_id_idx ON package_variants (package_id);
```

### Ubah `service_orders` — tambah kolom, rename kolom

Kolom yang perlu diubah/ditambah:
- Rename `package_size` → `variant_name` (snapshot nama varian)
- Tambah `package_variant_id uuid REFERENCES package_variants(id)` (FK ke varian, nullable untuk backward compat)

Kolom `package_id`, `package_name`, `package_price` tetap ada sebagai snapshot.

Snapshot lengkap di `service_orders`:
```
package_id          -- FK ke packages (jenis layanan)
package_variant_id  -- FK ke package_variants (varian spesifik)
package_name        -- snapshot nama paket saat order dibuat
variant_name        -- snapshot nama varian saat order dibuat
package_price       -- snapshot harga saat order dibuat
```

### Hapus kolom yang tidak relevan di `service_orders`
- `package_size` diganti dengan `variant_name` (rename)

---

## Seed Data

### packages (30 baris)

| name | vehicle_type | workflow_type | category | sort_order |
|---|---|---|---|---|
| Regular Car Wash | car | regular | regular_wash | 1 |
| Wash Detail | car | premium | regular_wash | 2 |
| Wash Wax | car | premium | one_day_service | 10 |
| Wash Windows Care | car | premium | one_day_service | 11 |
| Wash Shine | car | premium | one_day_service | 12 |
| Wash Fast Polish | car | premium | one_day_service | 13 |
| Wash Exterior Express | car | premium | one_day_service | 14 |
| Interior Express | car | premium | one_day_service | 15 |
| Engine Express | car | premium | one_day_service | 16 |
| Poles Baret Wiper | car | premium | one_day_service | 17 |
| Nano Coating Kaca | car | premium | one_day_service | 18 |
| Exterior Detailing | car | premium | detailing | 20 |
| Interior Detailing | car | premium | detailing | 21 |
| Engine Detailing | car | premium | detailing | 22 |
| Under Carriage Detailing | car | premium | detailing | 23 |
| Wheels & Brakes Treatment | car | premium | detailing | 24 |
| Nano Coating Reguler | car | premium | nano_coating | 30 |
| Nano Coating Flagship | car | premium | nano_coating | 31 |
| Maintenance Nano Coating | car | premium | nano_coating | 32 |
| PPF Mobil | car | premium | ppf | 40 |
| Doors Only | car | premium | sound_proof | 50 |
| Plafond Only | car | premium | sound_proof | 51 |
| Lantai, Fender, Firewall | car | premium | sound_proof | 52 |
| Sound Proof All Parts | car | premium | sound_proof | 53 |
| Raptor All Body | car | premium | raptor | 60 |
| Anti Karat Kolongan | car | premium | raptor | 61 |
| Regular Bike Wash | bike | regular | paket_motor | 100 |
| Wash Wax Bike | bike | premium | paket_motor | 101 |
| Nano Coating Motor | bike | premium | paket_motor | 102 |
| PPF Motor | bike | premium | paket_motor | 103 |

### package_variants (89 baris) — sama dengan data sebelumnya, hanya dipindah ke tabel baru

Harga dan variant_name identik dengan apa yang sudah ada di tabel `packages.size` + `packages.price` sekarang. Data tinggal dipindah struktur saja.

---

## Perubahan TypeScript

### `src/lib/neon.ts`

Ubah interface:
- `PackageRow` — hapus `size`, `price`, `sop_*_minutes` (pindah ke `PackageVariantRow`), tambah `category`, `is_active`
- Tambah `PackageVariantRow` — `id`, `package_id`, `variant_name`, `price`, `sop_*_minutes`, `sort_order`, `is_active`
- `ServiceOrderRow` — rename `package_size` → `variant_name`, tambah `package_variant_id`; SOP minutes di-join dari `package_variants`

### `src/lib/constants.ts`

- Tambah type `PackageCategory` = `'regular_wash' | 'one_day_service' | 'detailing' | 'nano_coating' | 'ppf' | 'sound_proof' | 'raptor' | 'paket_motor'`
- Tambah `CATEGORY_LABELS: Record<PackageCategory, string>` — mapping ke label display
  ```ts
  regular_wash:    'Regular Wash'
  one_day_service: 'Cuci Paket (One Day Service)'
  detailing:       'Detailing (À La Carte)'
  nano_coating:    'Nano Ceramic'
  ppf:             'Paint Protection Film (PPF)'
  sound_proof:     'Peredam Suara (Sound Proof)'
  raptor:          'Raptor Coating'
  paket_motor:     'Paket Motor'
  ```
- Hapus `PACKAGE_NAME_TO_GROUP` hardcoded map (diganti oleh `category` dari DB)

### `src/lib/db.ts`

- `loadPackages()` — query dari tabel `packages` saja (no price)
- Tambah `loadPackageVariants(packageId: string)` — query `package_variants WHERE package_id = ?`
- Tambah `loadAllPackagesWithVariants()` — query join `packages LEFT JOIN package_variants` untuk load semua sekaligus (dipakai QueueForm agar tidak terlalu banyak round-trip)
- `createServiceOrder()` — input ubah `package_id` + `package_variant_id` + `package_name` + `variant_name` + `package_price` (hilangkan `package_size`)
- `updateServiceOrder()` — ubah field names sesuai
- `ORDER_SELECT` — join ke `package_variants` untuk SOP minutes (bukan `packages`), join packages untuk `workflow_type`
- `loadOrdersForReport()` — join ke `package_variants` untuk SOP

### `src/components/QueueForm.tsx`

Flow yang tidak berubah (sudah correct):
```
Pilih jenis kendaraan (mobil/motor)
  ↓
Dropdown paket (nama paket) — filtered by vehicle_type
  ↓
Dropdown varian (variant_name) — filtered by package_id, hidden jika hanya 1 varian
  ↓
Harga otomatis terisi dari variant.price
```

Perubahan:
- `buildPackageGroups()` — gunakan `p.category` dari DB alih-alih `PACKAGE_NAME_TO_GROUP` hardcoded
- `getVariants()` — dari `PackageVariantRow[]` alih-alih `PackageRow[]`
- State `selectedVariant` type ubah ke `PackageVariantRow | null`
- `daftar()` — pass `package_variant_id` dan `variant_name` ke `createServiceOrder()`
- Jika varian hanya 1: auto-select dan sembunyikan dropdown variant (sesuai spesifikasi dokumen)

### `src/components/DetailModal.tsx`

- `buildPackageGroups()` — gunakan `category` dari DB
- Variants dropdown: dari `PackageVariantRow[]`
- State: `variantName`, bukan `packageSize`
- `save()` — pass `package_variant_id`, `variant_name`

### `src/components/QueueList.tsx`, `AdminView.tsx`, `AntrianPage.tsx`, `PublicView.tsx`

- Rename referensi `order.package_size` → `order.variant_name`
- Tidak ada perubahan logika lain

### `src/lib/reportUtils.ts`

- `generatePaketBreakdown()` — `package_name` sudah tersedia di snapshot, tidak perlu ubah
- Tambah `generateCategoryBreakdown()` — bisa GROUP BY `category` jika diinginkan di report
- Rename `paket` field di `PaketBreakdown` → tidak perlu ubah (sudah menggunakan `package_name`)

---

## Urutan Implementasi

1. **Migrasi DB** — `neon/migrations/004_packages_two_table.sql`
   - DROP tabel `packages` (89 baris lama)
   - CREATE tabel `packages` baru (30 jenis layanan)
   - CREATE tabel `package_variants` (89 varian)
   - Seed kedua tabel
   - ALTER `service_orders`: ADD `package_variant_id`, RENAME `package_size` → `variant_name`

2. **`neon.ts`** — Update interfaces (`PackageRow`, tambah `PackageVariantRow`, update `ServiceOrderRow`)

3. **`constants.ts`** — Tambah `PackageCategory`, `CATEGORY_LABELS`, hapus `PACKAGE_NAME_TO_GROUP`

4. **`db.ts`** — Update semua fungsi (queries, mappers, `ORDER_SELECT`)

5. **`QueueForm.tsx`** — Update flow picker, auto-hide variant jika 1 varian

6. **`DetailModal.tsx`** — Update picker dan field names

7. **`QueueList.tsx`, `AdminView.tsx`, `AntrianPage.tsx`, `PublicView.tsx`** — Rename `package_size` → `variant_name`

8. **`reportUtils.ts`** — Minor field rename, tambah `generateCategoryBreakdown()`

9. **Typecheck** — `npm run typecheck`

---

## Catatan Penting

### `ORDER_SELECT` join strategy
```sql
FROM service_orders so
JOIN vehicle_history vh ON vh.id = so.vehicle_id
LEFT JOIN packages p ON p.id = so.package_id
LEFT JOIN package_variants pv ON pv.id = so.package_variant_id
```
SOP minutes di-join dari `pv` (package_variants), `workflow_type` dari `p` (packages).

### Single-variant auto-hide
Jika `package_variants` untuk suatu paket hanya 1 baris → dropdown variant tidak ditampilkan, harga langsung tampil. Ini sudah sesuai spesifikasi dokumen. Implementasi: `variants.length === 1` → skip render dropdown, langsung set `selectedVariant = variants[0]` saat paket dipilih.

### Data migration di DB
`service_orders` saat ini kosong → tidak ada baris yang perlu di-update untuk `package_variant_id` atau rename `package_size → variant_name`.

### `category` menggantikan `PACKAGE_NAME_TO_GROUP`
Grouping tampilan form (misal "Regular Wash", "Cuci Paket") sekarang berasal dari `packages.category` yang di-join, bukan dari mapping hardcoded di TypeScript. Ini membuat penambahan paket baru di masa depan cukup dengan INSERT ke DB tanpa perlu edit kode.
