
CREATE TABLE public.pasajeros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservacion_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  nombre TEXT NOT NULL DEFAULT '',
  apellidos TEXT NOT NULL DEFAULT '',
  identificacion TEXT NOT NULL DEFAULT '',
  celular TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  direccion TEXT NOT NULL DEFAULT '',
  parada TEXT NOT NULL DEFAULT '',
  detalle TEXT NOT NULL DEFAULT '',
  cantidad_pasajeros INTEGER NOT NULL DEFAULT 1,
  pasajeros_monto NUMERIC NOT NULL DEFAULT 0,
  encomiendas_monto NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pasajeros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant access pasajeros"
ON public.pasajeros
FOR ALL
TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Super admin see all pasajeros"
ON public.pasajeros
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

CREATE TRIGGER update_pasajeros_updated_at
BEFORE UPDATE ON public.pasajeros
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
