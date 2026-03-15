
-- Add new states for route assignment flow
ALTER TYPE public.estado_viaje ADD VALUE IF NOT EXISTS 'ASIGNADO';
ALTER TYPE public.estado_viaje ADD VALUE IF NOT EXISTS 'EN_RUTA';
ALTER TYPE public.estado_viaje ADD VALUE IF NOT EXISTS 'FINALIZADO';

-- Add hora_salida and cantidad_pasajeros to viajes
ALTER TABLE public.viajes ADD COLUMN IF NOT EXISTS hora_salida text;
ALTER TABLE public.viajes ADD COLUMN IF NOT EXISTS cantidad_pasajeros integer DEFAULT 0;
