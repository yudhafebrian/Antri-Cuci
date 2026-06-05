/*
# AntriCuci — Queue & Vehicle History Tables

## Overview
Creates the two core tables for the FIP Autoshop vehicle wash queue system.
This is a single-tenant app (no user auth), so all policies allow anon + authenticated access.

## New Tables

### `vehicle_history`
Stores past customers for autocomplete when registering a new vehicle.
- `id` (uuid, primary key)
- `plat` (text, unique) — license plate number
- `wa` (text) — WhatsApp number
- `nama` (text) — owner name
- `merk` (text) — vehicle brand/model
- `created_at` (timestamptz)

### `queue`
Stores every vehicle currently in the wash queue.
- `id` (uuid, primary key)
- `type` (text) — "regular" or "premium"
- `plat` (text) — license plate
- `wa` (text) — WhatsApp number
- `nama` (text) — owner name
- `merk` (text) — vehicle brand/model
- `paket` (text) — service package name
- `size` (text) — vehicle/package size tier
- `harga` (integer) — price in IDR
- `notes` (text) — optional staff notes
- `stage` (text) — current stage: waiting | basah | kering | antripoles | poles | qc
- `times` (jsonb) — map of stage → ISO timestamp when that stage was entered
- `created_at` (timestamptz)
- `queue_number` (integer) — sequential number within the day

## Security
- RLS enabled on both tables.
- Policies use TO anon, authenticated with USING (true) / WITH CHECK (true)
  because this is intentionally a shared, staff-facing app with no user isolation.
*/

CREATE TABLE IF NOT EXISTS vehicle_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plat text UNIQUE NOT NULL,
  wa text NOT NULL DEFAULT '',
  nama text NOT NULL DEFAULT '',
  merk text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vehicle_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_history" ON vehicle_history;
CREATE POLICY "anon_select_history" ON vehicle_history FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_history" ON vehicle_history;
CREATE POLICY "anon_insert_history" ON vehicle_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_history" ON vehicle_history;
CREATE POLICY "anon_update_history" ON vehicle_history FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_history" ON vehicle_history;
CREATE POLICY "anon_delete_history" ON vehicle_history FOR DELETE
  TO anon, authenticated USING (true);


CREATE TABLE IF NOT EXISTS queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('regular', 'premium')),
  plat text NOT NULL,
  wa text NOT NULL DEFAULT '',
  nama text NOT NULL DEFAULT '',
  merk text NOT NULL DEFAULT '',
  paket text NOT NULL DEFAULT '',
  size text NOT NULL DEFAULT '',
  harga integer NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  stage text NOT NULL DEFAULT 'waiting',
  times jsonb NOT NULL DEFAULT '{}'::jsonb,
  queue_number integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS queue_stage_idx ON queue (stage);
CREATE INDEX IF NOT EXISTS queue_type_idx ON queue (type);
CREATE INDEX IF NOT EXISTS queue_created_at_idx ON queue (created_at);

ALTER TABLE queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_queue" ON queue;
CREATE POLICY "anon_select_queue" ON queue FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_queue" ON queue;
CREATE POLICY "anon_insert_queue" ON queue FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_queue" ON queue;
CREATE POLICY "anon_update_queue" ON queue FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_queue" ON queue;
CREATE POLICY "anon_delete_queue" ON queue FOR DELETE
  TO anon, authenticated USING (true);


-- Seed some history data for autocomplete demo
INSERT INTO vehicle_history (plat, wa, nama, merk) VALUES
  ('B 3344 GHZ', '08119283746', 'Andi Wijaya', 'Toyota Avanza'),
  ('D 7821 ZZA', '08556677889', 'Sari Dewi', 'Honda Brio'),
  ('F 1122 AAB', '08987654321', 'Budi Santoso', 'Mitsubishi Xpander'),
  ('B 9900 JKC', '08112345678', 'Rini Kusuma', 'Daihatsu Xenia')
ON CONFLICT (plat) DO NOTHING;
