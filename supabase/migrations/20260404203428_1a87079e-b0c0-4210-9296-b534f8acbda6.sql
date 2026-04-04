
CREATE POLICY "Super admin update solicitudes_baja"
ON public.solicitudes_baja
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role))
WITH CHECK (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));
