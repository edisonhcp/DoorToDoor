
-- Allow Super Admin to see all conductores
CREATE POLICY "Super admin see all conductores"
ON public.conductores FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

-- Allow Super Admin to see all vehiculos
CREATE POLICY "Super admin see all vehiculos"
ON public.vehiculos FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

-- Allow Super Admin to see all propietarios
CREATE POLICY "Super admin see all propietarios"
ON public.propietarios FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));
