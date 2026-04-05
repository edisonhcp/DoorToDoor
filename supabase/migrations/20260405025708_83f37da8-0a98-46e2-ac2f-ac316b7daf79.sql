
-- 1. Block direct INSERT on profiles (only handle_new_user trigger should insert)
CREATE POLICY "Block direct profile insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (false);

-- 2. Restrict audit_logs SELECT to GERENCIA and SUPER_ADMIN only
DROP POLICY IF EXISTS "Tenant access audit" ON public.audit_logs;

CREATE POLICY "Gerencia read audit"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND (has_role(auth.uid(), 'GERENCIA'::app_role) OR has_role(auth.uid(), 'SUPER_ADMIN'::app_role))
);
