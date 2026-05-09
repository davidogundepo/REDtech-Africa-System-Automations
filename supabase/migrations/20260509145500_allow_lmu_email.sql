-- ========================================================
-- Update email domain restriction to allow LMU email
-- ========================================================

CREATE OR REPLACE FUNCTION public.check_email_domain()
RETURNS trigger AS $$
BEGIN
  IF new.email NOT LIKE '%@redtechafrica.com' 
     AND new.email != 'david.oludepo@gmail.com' 
     AND new.email != 'ogundepo.david@lmu.edu.ng' THEN
    RAISE EXCEPTION 'Only @redtechafrica.com email addresses are allowed to register.';
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
