CREATE POLICY "Super admin see all asignaciones"
ON public.asignaciones
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));