
-- Add new columns to egresos_viaje for conductor expense tracking
ALTER TABLE public.egresos_viaje 
  ADD COLUMN IF NOT EXISTS desayuno boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS almuerzo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS merienda boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS combustible_foto_url text,
  ADD COLUMN IF NOT EXISTS varios_foto_url text,
  ADD COLUMN IF NOT EXISTS varios_texto text;

-- Create storage bucket for expense receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('recibos', 'recibos', true) ON CONFLICT (id) DO NOTHING;

-- RLS for recibos bucket: authenticated users can upload
CREATE POLICY "Authenticated users can upload recibos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'recibos');

-- Authenticated users can view recibos
CREATE POLICY "Authenticated users can view recibos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'recibos');

-- Users can update their own recibos
CREATE POLICY "Users can update own recibos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'recibos');
