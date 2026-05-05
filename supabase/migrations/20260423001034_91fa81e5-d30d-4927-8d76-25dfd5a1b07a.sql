-- 1. PROFILES: restrict broad SELECT, expose safe fields via a view
DROP POLICY IF EXISTS "anyone signed-in can view profiles" ON public.profiles;

CREATE POLICY "users view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR is_admin(auth.uid()));

-- Public-safe directory view (no PII)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT id, full_name, job_title, department, avatar_url, is_active
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;

-- 2. CLIENTS: scope SELECT and UPDATE to owner/assignee/admin
DROP POLICY IF EXISTS "authd view clients" ON public.clients;
DROP POLICY IF EXISTS "authd update clients" ON public.clients;

CREATE POLICY "scoped view clients" ON public.clients
  FOR SELECT TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() = assigned_to
    OR is_admin(auth.uid())
  );

CREATE POLICY "scoped update clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() = assigned_to
    OR is_admin(auth.uid())
  );

-- 3. TASKS: scope UPDATE to owner/assignee/creator/admin
DROP POLICY IF EXISTS "authd update tasks" ON public.tasks;

CREATE POLICY "scoped update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() = assigned_to
    OR auth.uid() = user_id
    OR is_admin(auth.uid())
  );

-- 4. NOTIFICATIONS: only admins can broadcast; users can notify themselves
DROP POLICY IF EXISTS "authd send notif" ON public.notifications;

CREATE POLICY "scoped send notif" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
    OR auth.uid() = recipient_id
    OR auth.uid() = user_id
  );

-- 5. STORAGE: avatars — enforce per-user folder
DROP POLICY IF EXISTS "avatars authd upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;

CREATE POLICY "users upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "users update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "users delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 6. STORAGE: documents — uploader/admin can update + delete
CREATE POLICY "uploader update documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (owner = auth.uid() OR is_admin(auth.uid()))
  );

CREATE POLICY "uploader delete documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (owner = auth.uid() OR is_admin(auth.uid()))
  );