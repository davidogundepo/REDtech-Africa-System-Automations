
-- =========================================================
-- Notification trigger functions
-- =========================================================

-- Task assigned → notify assignee
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL
     AND NEW.assigned_to <> COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
     AND (TG_OP = 'INSERT' OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to)
  THEN
    INSERT INTO public.notifications (recipient_id, user_id, title, message, type, link, metadata)
    VALUES (
      NEW.assigned_to,
      NEW.assigned_to,
      'New task assigned',
      COALESCE(NEW.title, 'You have a new task'),
      'task',
      '/tasks',
      jsonb_build_object('task_id', NEW.id, 'priority', NEW.priority)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_assigned ON public.tasks;
CREATE TRIGGER trg_notify_task_assigned
AFTER INSERT OR UPDATE OF assigned_to ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_assigned();

-- Leave status change → notify requester
CREATE OR REPLACE FUNCTION public.notify_leave_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('approved', 'rejected')
  THEN
    INSERT INTO public.notifications (recipient_id, user_id, title, message, type, link, metadata)
    VALUES (
      NEW.user_id,
      NEW.user_id,
      'Leave request ' || NEW.status,
      'Your ' || NEW.leave_type || ' leave from ' || NEW.start_date || ' to ' || NEW.end_date || ' was ' || NEW.status || '.',
      'leave',
      '/leave',
      jsonb_build_object('leave_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_leave_status ON public.leave_requests;
CREATE TRIGGER trg_notify_leave_status
AFTER UPDATE OF status ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_leave_status();

-- Payment request created → notify all admins
CREATE OR REPLACE FUNCTION public.notify_admins_payment_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  FOR admin_record IN
    SELECT user_id FROM public.user_roles WHERE role IN ('super_admin', 'admin')
  LOOP
    INSERT INTO public.notifications (recipient_id, user_id, title, message, type, link, metadata)
    VALUES (
      admin_record.user_id,
      admin_record.user_id,
      'New payment request',
      'A payment request for ' || NEW.amount::text || ' was submitted.',
      'payment',
      '/finance',
      jsonb_build_object('request_id', NEW.id, 'amount', NEW.amount)
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_payment_request ON public.payment_requests;
CREATE TRIGGER trg_notify_admins_payment_request
AFTER INSERT ON public.payment_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_payment_request();

-- =========================================================
-- Realtime: full row data + add to publication
-- =========================================================
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.attendance_records REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tasks'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'attendance_records'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records';
  END IF;
END $$;
