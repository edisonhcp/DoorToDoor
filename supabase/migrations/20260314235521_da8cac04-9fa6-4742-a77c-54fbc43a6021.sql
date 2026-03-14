
-- Super admins can see ALL empresas
CREATE POLICY "Super admin see all empresas" ON public.empresas
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- Super admin can insert empresas
CREATE POLICY "Super admin insert empresas" ON public.empresas
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- Super admin can update empresas
CREATE POLICY "Super admin update empresas" ON public.empresas
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- Super admin can see all profiles
CREATE POLICY "Super admin see all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));
