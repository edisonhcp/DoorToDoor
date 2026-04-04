
-- Make buckets public again (reads via URL) but policies control listing/writes
UPDATE storage.buckets SET public = true WHERE id IN ('recibos', 'conductor-docs', 'propietario-docs', 'vehiculo-fotos');
