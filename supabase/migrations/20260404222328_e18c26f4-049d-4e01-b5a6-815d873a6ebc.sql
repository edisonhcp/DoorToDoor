
-- Remove public (unauthenticated) SELECT policies
DROP POLICY IF EXISTS "Public read propietario docs" ON storage.objects;
DROP POLICY IF EXISTS "Public read vehiculo fotos" ON storage.objects;

-- Add authenticated SELECT for propietario-docs and vehiculo-fotos
CREATE POLICY "propietario_docs_select_auth" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'propietario-docs');

CREATE POLICY "vehiculo_fotos_select_auth" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'vehiculo-fotos');

-- Add DELETE policies for all 4 buckets (authenticated only)
CREATE POLICY "recibos_delete_auth" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'recibos');

CREATE POLICY "conductor_docs_delete_auth" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'conductor-docs');

CREATE POLICY "propietario_docs_delete_auth" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'propietario-docs');

CREATE POLICY "vehiculo_fotos_delete_auth" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'vehiculo-fotos');

-- Profiles: deny INSERT for normal users (only trigger creates profiles)
-- Since RLS is enabled and no INSERT policy exists, INSERT is already denied.
-- But let's be explicit: no policy = denied. The scan flagged this as a concern,
-- so we mark it as intentional by documenting it.
-- No action needed - INSERT is denied by default with RLS enabled and no INSERT policy.
