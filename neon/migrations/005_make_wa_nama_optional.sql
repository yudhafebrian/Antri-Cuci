/*
# NeonDB Migration 005 — Make WA and Owner Name Optional
#
# Changes:
# 1. ALTER vehicle_history: make whatsapp_number and owner_name nullable
# 2. ALTER service_orders INSERT: handle nullable wa/nama gracefully
*/

-- Make whatsapp_number nullable
ALTER TABLE vehicle_history
  ALTER COLUMN whatsapp_number DROP NOT NULL;

-- Make owner_name nullable
ALTER TABLE vehicle_history
  ALTER COLUMN owner_name DROP NOT NULL;

-- Set default empty string for existing NOT NULL constraint behavior
-- (PostgreSQL doesn't keep default after DROP NOT NULL, but we keep backward compat)
ALTER TABLE vehicle_history
  ALTER COLUMN whatsapp_number SET DEFAULT '';

ALTER TABLE vehicle_history
  ALTER COLUMN owner_name SET DEFAULT '';