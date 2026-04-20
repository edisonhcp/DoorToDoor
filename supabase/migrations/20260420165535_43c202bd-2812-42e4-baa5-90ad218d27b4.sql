CREATE POLICY "Conductor update own profile"
ON public.conductores
FOR UPDATE
TO authenticated
USING (id = public.get_user_conductor_id(auth.uid()) AND empresa_id = public.get_user_empresa_id(auth.uid()))
WITH CHECK (id = public.get_user_conductor_id(auth.uid()) AND empresa_id = public.get_user_empresa_id(auth.uid()));