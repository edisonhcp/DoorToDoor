CREATE POLICY "Gerencia update own empresa"
ON public.empresas
FOR UPDATE
TO authenticated
USING (id = get_user_empresa_id(auth.uid()))
WITH CHECK (id = get_user_empresa_id(auth.uid()));