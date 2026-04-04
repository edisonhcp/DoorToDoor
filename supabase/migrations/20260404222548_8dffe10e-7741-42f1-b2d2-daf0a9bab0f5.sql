
-- Make all buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('recibos', 'conductor-docs', 'propietario-docs', 'vehiculo-fotos');

-- Drop existing user_roles write policies (in case duplicates)
DROP POLICY IF EXISTS "Only super admin can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only super admin can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only super admin can delete roles" ON public.user_roles;

-- Recreate with explicit checks
CREATE POLICY "Only super admin can insert roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

CREATE POLICY "Only super admin can update roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

CREATE POLICY "Only super admin can delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'::app_role));
