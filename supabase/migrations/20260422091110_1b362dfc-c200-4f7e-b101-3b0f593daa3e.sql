
-- Replace permissive ALL policies with scoped ones
DROP POLICY IF EXISTS "authd manage clients" ON public.clients;
CREATE POLICY "authd insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authd update clients" ON public.clients FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "admins delete clients" ON public.clients FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "authd manage tasks" ON public.tasks;
CREATE POLICY "authd insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authd update tasks" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "owner/admin delete tasks" ON public.tasks FOR DELETE TO authenticated USING (auth.uid()=created_by OR auth.uid()=user_id OR public.is_admin(auth.uid()));

-- Restrict storage SELECT so users can only read individual file paths (not list arbitrary names)
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
CREATE POLICY "avatars public file read" ON storage.objects FOR SELECT USING (bucket_id='avatars' AND (storage.foldername(name))[1] IS NOT NULL);

DROP POLICY IF EXISTS "social public read" ON storage.objects;
CREATE POLICY "social public file read" ON storage.objects FOR SELECT USING (bucket_id='social-media' AND (storage.foldername(name))[1] IS NOT NULL);
