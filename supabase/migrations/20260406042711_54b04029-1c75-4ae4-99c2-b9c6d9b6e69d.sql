
-- Fix 1: Replace the permissive UPDATE policy on profiles
-- Only allow updating username (not empresa_id, user_id, or other sensitive fields)
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users update own profile safe"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND empresa_id = (SELECT p.empresa_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
);
