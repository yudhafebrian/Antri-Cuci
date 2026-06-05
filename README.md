# Antri-Cuci: FIP Autoshop Queue System

Aplikasi sistem antrian cuci mobil dan motor untuk **FIP Autoshop**. Aplikasi ini memungkinkan pelanggan melihat status antrian secara realtime tanpa perlu login, sementara admin dapat mengelola antrian dan mengupdate status kendaraan.

## Tech Stack

| Category       | Technology                                 |
|----------------|--------------------------------------------|
| Framework      | React 18 + TypeScript + Vite               |
| UI Components  | shadcn/ui (Radix primitives) + Tailwind CSS |
| Icons          | Lucide React                               |
| Forms          | React Hook Form + Zod                      |
| Database       | Supabase (PostgreSQL) + Realtime           |
| Date/Time      | date-fns                                   |
| Routing        | react-router-dom                           |
| Build Tool     | Vite 5                                     |

## Fitur Utama

- **Panel Admin** (`/`)
  - Daftarkan kendaraan baru (mobil/motor, regular/premium)
  - Lihat dan kelola antrian per tipe layanan
  - Update status kendaraan (tunggu → basah → kering → poles → QC → selesai)
  - Edit detail kendaraan via modal
  - Statistik jumlah kendaraan per tahap
- **Lihat Antrian** (`/antrian`)
  - Halaman publik tanpa login
  - Estimasi waktu tunggu realtime
  - Tampilan status kendaraan yang sedang diproses
  - Toggle antara Regular Wash dan Premium Wash
  - Update otomatis via Supabase Realtime
- **Realtime** — Semua perubahan data langsung terlihat di semua perangkat tanpa refresh

## Struktur Proyek

```
src/
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── AdminView.tsx         # Halaman utama admin
│   ├── AntrianPage.tsx       # Halaman publik /antrian
│   ├── QueueForm.tsx         # Form daftar kendaraan baru
│   ├── QueueList.tsx         # Daftar antrian dengan grup tahap
│   └── DetailModal.tsx       # Modal edit detail kendaraan
├── pages/
│   └── AntrianPage.tsx       # Halaman /antrian standalone
├── hooks/
│   └── use-toast.ts
├── lib/
│   ├── supabase.ts           # Supabase client & tipe data
│   ├── constants.ts          # Konfigurasi stage, paket, brand, helper
│   └── utils.ts
├── App.tsx                   # Routing & layout utama
├── main.tsx                  # Entry point
└── index.css
```

## Routing

| Path          | Halaman              | Deskripsi                               |
|---------------|----------------------|-----------------------------------------|
| `/`           | AdminView            | Panel admin (default)                   |
| `/antrian`    | AntrianPage          | Lihat antrian publik (dukplikasi tab)   |

## Struktur Database (Supabase)

Tabel utama: `queue`

| Kolom            | Tipe                  | Deskripsi                              |
|------------------|-----------------------|----------------------------------------|
| `id`             | UUID (PK)             | Identifikasi unik                      |
| `type`           | `regular` / `premium` | Tipe layanan                           |
| `plat`           | text                  | Plat nomor kendaraan                   |
| `wa`             | text                  | Nomor WhatsApp pelanggan                |
| `nama`           | text                  | Nama pelanggan                         |
| `merk`           | text                  | Merk & model kendaraan                 |
| `paket`          | text                  | Nama paket layanan                     |
| `size`           | text                  | Ukuran kendaraan                       |
| `harga`          | number                | Harga paket                            |
| `notes`          | text                  | Catatan tambahan                       |
| `stage`          | text                  | Tahap proses saat ini                  |
| `times`          | jsonb                 | Timestamp per tahap                    |
| `queue_number`   | number (nullable)     | Nomor antrian                          |
| `created_at`     | timestamp             | Waktu pendaftaran                       |

## Status Proses (Stage)

### Regular
`waiting` → `basah` → `kering` → `qc` → `selesai`

### Premium
`waiting` → `basah` → `kering` → `antripoles` → `poles` → `qc` → `selesai`

## Konfigurasi

Buat file `.env` di root proyek:

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

## Menjalankan Proyek

```bash
# Install dependencies
npm install

# Jalankan development server
npm run dev

# Build untuk production
npm run build

# Type check
npx tsc --noEmit -p tsconfig.app.json

# Lint
npm run lint
```

## URL Publik

Halaman antrian publik dapat diakses di:

```
fipautoshop.app/antrian
```

Pelanggan dapat membuka halaman ini dari perangkat mobile tanpa perlu login.
