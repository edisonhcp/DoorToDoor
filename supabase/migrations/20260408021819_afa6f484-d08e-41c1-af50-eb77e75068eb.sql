
CREATE OR REPLACE FUNCTION public.storage_conductor_check(file_path text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conductores
    WHERE id::text = split_part(file_path, '/', 1)
    AND empresa_id = public.get_user_empresa_id(auth.uid())
    AND id = public.get_user_conductor_id(auth.uid())
  )
  OR public.has_role(auth.uid(), 'GERENCIA'::app_role)
  OR public.has_role(auth.uid(), 'SUPER_ADMIN'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.storage_propietario_check(file_path text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.propietarios
    WHERE id::text = split_part(file_path, '/', 1)
    AND empresa_id = public.get_user_empresa_id(auth.uid())
    AND id = public.get_user_propietario_id(auth.uid())
  )
  OR public.has_role(auth.uid(), 'GERENCIA'::app_role)
  OR public.has_role(auth.uid(), 'SUPER_ADMIN'::app_role)
$$;
