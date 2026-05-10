-- ========================================================
-- Seed default departments for REDtech Africa
-- Safe to run multiple times (ON CONFLICT DO NOTHING)
-- ========================================================

INSERT INTO public.departments (name, is_hidden, sort_order)
VALUES
  ('Leadership',        false, 1),
  ('Engineering',       false, 2),
  ('Finance',           false, 3),
  ('Human Resources',   false, 4),
  ('Sales',             false, 5),
  ('Operations',        false, 6),
  ('Marketing',         false, 7),
  ('Creative',          false, 8),
  ('Legal',             false, 9),
  ('Product',           false, 10)
ON CONFLICT (name) DO NOTHING;
