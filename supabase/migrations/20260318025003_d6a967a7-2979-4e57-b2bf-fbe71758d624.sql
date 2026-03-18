
CREATE TYPE public.frecuencia_comision AS ENUM ('SEMANAL', 'QUINCENAL', 'MENSUAL');

ALTER TABLE public.empresas ADD COLUMN frecuencia_comision frecuencia_comision NOT NULL DEFAULT 'SEMANAL';
