/*
# Add vehicle_category to vehicle_history; support selesai stage

## Changes

### vehicle_history
- Adds `vehicle_category` column (text, nullable) — values 'mobil' or 'motor'.
  Nullable so existing rows are unaffected. Frontend fills it on new upserts.

## Notes
- The `queue.stage` column is plain text with no CHECK constraint, so the new
  'selesai' stage value is already accepted by the database without a migration.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicle_history' AND column_name = 'vehicle_category'
  ) THEN
    ALTER TABLE vehicle_history ADD COLUMN vehicle_category text;
  END IF;
END $$;
