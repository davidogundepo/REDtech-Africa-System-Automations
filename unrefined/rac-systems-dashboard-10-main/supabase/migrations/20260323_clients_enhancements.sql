-- ============================================================
-- Migration: Clients Table Enhancements
-- Adds city, postcode, and status columns to the clients table
-- so that Invoice/Waybill smart auto-fill works correctly.
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- Add city column (used by Invoice Generator auto-fill)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS city TEXT;

-- Add postcode column (used by Invoice Generator auto-fill)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS postcode TEXT;

-- Add status column (used to filter active clients in CRM lookups)
-- Values: 'active' | 'inactive' | 'prospect'
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'prospect'));

-- Backfill: mark all existing clients as active
UPDATE public.clients SET status = 'active' WHERE status IS NULL;

-- Add last_contact_date if not already present (used by CRM views)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMPTZ;

-- Running total: sum of all invoices raised for this client
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS total_invoiced NUMERIC NOT NULL DEFAULT 0;

-- Running total: number of waybill deliveries made to this client
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS total_deliveries INTEGER NOT NULL DEFAULT 0;

-- Confirm
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'clients'
ORDER BY ordinal_position;
