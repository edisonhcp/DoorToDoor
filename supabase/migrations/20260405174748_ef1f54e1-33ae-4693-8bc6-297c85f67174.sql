
CREATE TABLE public.reservaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  viaje_id UUID NOT NULL REFERENCES public.viajes(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL,
  parada TEXT DEFAULT '',
  nombre_pasajero TEXT DEFAULT '',
  celular_pasajero TEXT DEFAULT '',
  detalle TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reservaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant access reservaciones"
ON public.reservaciones
FOR ALL
TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Super admin see all reservaciones"
ON public.reservaciones
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

CREATE TRIGGER update_reservaciones_updated_at
BEFORE UPDATE ON public.reservaciones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
