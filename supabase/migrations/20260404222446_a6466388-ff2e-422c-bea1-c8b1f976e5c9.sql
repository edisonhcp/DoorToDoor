
-- Helper functions in public schema
CREATE OR REPLACE FUNCTION public.storage_conductor_check(file_path text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conductores
    WHERE id::text = split_part(file_path, '/', 1)
    AND empresa_id = public.get_user_empresa_id(auth.uid())
  ) OR public.has_role(auth.uid(), 'SUPER_ADMIN'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.storage_propietario_check(file_path text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.propietarios
    WHERE id::text = split_part(file_path, '/', 1)
    AND empresa_id = public.get_user_empresa_id(auth.uid())
  ) OR public.has_role(auth.uid(), 'SUPER_ADMIN'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.storage_vehiculo_check(file_path text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vehiculos
    WHERE id::text = split_part(file_path, '/', 1)
    AND empresa_id = public.get_user_empresa_id(auth.uid())
  ) OR public.has_role(auth.uid(), 'SUPER_ADMIN'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.storage_recibo_check(file_path text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    CASE
      WHEN split_part(file_path, '/', 1) = 'logos' THEN
        (split_part(split_part(file_path, '/', 2), '.', 1) = public.get_user_empresa_id(auth.uid())::text)
      ELSE
        (split_part(file_path, '/', 1) = public.get_user_empresa_id(auth.uid())::text)
    END
    OR public.has_role(auth.uid(), 'SUPER_ADMIN'::app_role)
$$;

-- Drop ALL existing storage policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- CONDUCTOR-DOCS policies
CREATE POLICY "conductor_docs_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'conductor-docs' AND public.storage_conductor_check(name));

CREATE POLICY "conductor_docs_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'conductor-docs' AND public.storage_conductor_check(name));

CREATE POLICY "conductor_docs_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'conductor-docs' AND public.storage_conductor_check(name));

CREATE POLICY "conductor_docs_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'conductor-docs' AND public.storage_conductor_check(name));

-- PROPIETARIO-DOCS policies
CREATE POLICY "propietario_docs_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'propietario-docs' AND public.storage_propietario_check(name));

CREATE POLICY "propietario_docs_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'propietario-docs' AND public.storage_propietario_check(name));

CREATE POLICY "propietario_docs_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'propietario-docs' AND public.storage_propietario_check(name));

CREATE POLICY "propietario_docs_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'propietario-docs' AND public.storage_propietario_check(name));

-- VEHICULO-FOTOS policies
CREATE POLICY "vehiculo_fotos_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'vehiculo-fotos' AND public.storage_vehiculo_check(name));

CREATE POLICY "vehiculo_fotos_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vehiculo-fotos' AND public.storage_vehiculo_check(name));

CREATE POLICY "vehiculo_fotos_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'vehiculo-fotos' AND public.storage_vehiculo_check(name));

CREATE POLICY "vehiculo_fotos_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'vehiculo-fotos' AND public.storage_vehiculo_check(name));

-- RECIBOS policies
CREATE POLICY "recibos_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'recibos' AND public.storage_recibo_check(name));

CREATE POLICY "recibos_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'recibos' AND public.storage_recibo_check(name));

CREATE POLICY "recibos_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'recibos' AND public.storage_recibo_check(name));

CREATE POLICY "recibos_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'recibos' AND public.storage_recibo_check(name));
