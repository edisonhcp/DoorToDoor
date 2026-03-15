ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS fk_profiles_conductor;

ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_conductor
FOREIGN KEY (conductor_id)
REFERENCES public.conductores(id)
ON DELETE SET NULL;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS fk_profiles_propietario;

ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_propietario
FOREIGN KEY (propietario_id)
REFERENCES public.propietarios(id)
ON DELETE SET NULL;