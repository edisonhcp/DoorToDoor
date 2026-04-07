
-- 1. Helper function: get vehicle IDs for a propietario (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_propietario_vehicle_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT v.id FROM public.vehiculos v
  WHERE v.propietario_id = (SELECT propietario_id FROM public.profiles WHERE user_id = _user_id LIMIT 1)
$$;

-- 2. Helper function: get vehicle IDs for a conductor (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_conductor_vehicle_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT a.vehiculo_id FROM public.asignaciones a
  WHERE a.conductor_id = (SELECT conductor_id FROM public.profiles WHERE user_id = _user_id LIMIT 1)
$$;

-- 3. Fix asignaciones policies to break recursion
DROP POLICY IF EXISTS "Propietario read asignaciones" ON public.asignaciones;
CREATE POLICY "Propietario read asignaciones" ON public.asignaciones
FOR SELECT TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND vehiculo_id IN (SELECT get_propietario_vehicle_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Conductor read own asignaciones" ON public.asignaciones;
CREATE POLICY "Conductor read own asignaciones" ON public.asignaciones
FOR SELECT TO authenticated
USING (
  conductor_id = get_user_conductor_id(auth.uid())
  AND empresa_id = get_user_empresa_id(auth.uid())
);

DROP POLICY IF EXISTS "Conductor update own asignaciones" ON public.asignaciones;
CREATE POLICY "Conductor update own asignaciones" ON public.asignaciones
FOR UPDATE TO authenticated
USING (
  conductor_id = get_user_conductor_id(auth.uid())
  AND empresa_id = get_user_empresa_id(auth.uid())
)
WITH CHECK (
  conductor_id = get_user_conductor_id(auth.uid())
  AND empresa_id = get_user_empresa_id(auth.uid())
);

-- 4. Fix vehiculos policies to use helper functions (break recursion)
DROP POLICY IF EXISTS "Conductor read assigned vehiculo" ON public.vehiculos;
CREATE POLICY "Conductor read assigned vehiculo" ON public.vehiculos
FOR SELECT TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND id IN (SELECT get_conductor_vehicle_ids(auth.uid()))
);

-- 5. Fix profile update policy to prevent conductor_id/propietario_id manipulation
DROP POLICY IF EXISTS "Users update own profile safe" ON public.profiles;
CREATE POLICY "Users update safe fields only" ON public.profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND empresa_id = (SELECT p.empresa_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1)
  AND conductor_id IS NOT DISTINCT FROM (SELECT p.conductor_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1)
  AND propietario_id IS NOT DISTINCT FROM (SELECT p.propietario_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1)
  AND activo IS NOT DISTINCT FROM (SELECT p.activo FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1)
);

-- 6. Fix invitaciones INSERT WITH CHECK to require created_by_user_id = auth.uid()
DROP POLICY IF EXISTS "Gerencia access own invitaciones" ON public.invitaciones;
CREATE POLICY "Gerencia access own invitaciones" ON public.invitaciones
FOR ALL TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND has_role(auth.uid(), 'GERENCIA'::app_role)
  AND (created_by_user_id = auth.uid() OR created_by_user_id IS NULL)
)
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid())
  AND has_role(auth.uid(), 'GERENCIA'::app_role)
  AND created_by_user_id = auth.uid()
);

-- 7. Restrict propietario read conductores to only assigned conductors
DROP POLICY IF EXISTS "Propietario read conductores" ON public.conductores;
CREATE POLICY "Propietario read assigned conductores" ON public.conductores
FOR SELECT TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND has_role(auth.uid(), 'PROPIETARIO'::app_role)
  AND id IN (
    SELECT a.conductor_id FROM public.asignaciones a
    WHERE a.vehiculo_id IN (SELECT get_propietario_vehicle_ids(auth.uid()))
  )
);

-- 8. Fix other policies that have vehiculos<->asignaciones circular refs

-- egresos_viaje: Conductor policy uses viajes->asignaciones (no vehiculos, OK)
-- ingresos_viaje: Conductor policy uses viajes->asignaciones (no vehiculos, OK)
-- Propietario egresos/ingresos: uses asignaciones JOIN vehiculos - fix with helper
DROP POLICY IF EXISTS "Propietario read egresos" ON public.egresos_viaje;
CREATE POLICY "Propietario read egresos" ON public.egresos_viaje
FOR SELECT TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND viaje_id IN (
    SELECT v.id FROM viajes v
    WHERE v.asignacion_id IN (
      SELECT a.id FROM asignaciones a
      WHERE a.vehiculo_id IN (SELECT get_propietario_vehicle_ids(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Propietario read ingresos" ON public.ingresos_viaje;
CREATE POLICY "Propietario read ingresos" ON public.ingresos_viaje
FOR SELECT TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND viaje_id IN (
    SELECT v.id FROM viajes v
    WHERE v.asignacion_id IN (
      SELECT a.id FROM asignaciones a
      WHERE a.vehiculo_id IN (SELECT get_propietario_vehicle_ids(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Propietario read viajes" ON public.viajes;
CREATE POLICY "Propietario read viajes" ON public.viajes
FOR SELECT TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND asignacion_id IN (
    SELECT a.id FROM asignaciones a
    WHERE a.vehiculo_id IN (SELECT get_propietario_vehicle_ids(auth.uid()))
  )
);

-- Propietario read vehiculo_disponibilidad
DROP POLICY IF EXISTS "Propietario read vehiculo_disponibilidad" ON public.vehiculo_disponibilidad;
CREATE POLICY "Propietario read vehiculo_disponibilidad" ON public.vehiculo_disponibilidad
FOR SELECT TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND vehiculo_id IN (SELECT get_propietario_vehicle_ids(auth.uid()))
);

-- Propietario access vehiculo_alimentacion
DROP POLICY IF EXISTS "Propietario access vehiculo_alimentacion" ON public.vehiculo_alimentacion;
CREATE POLICY "Propietario access vehiculo_alimentacion" ON public.vehiculo_alimentacion
FOR ALL TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND vehiculo_id IN (SELECT get_propietario_vehicle_ids(auth.uid()))
)
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid())
  AND vehiculo_id IN (SELECT get_propietario_vehicle_ids(auth.uid()))
);

-- Conductor policies that reference vehiculos table - fix with helper
DROP POLICY IF EXISTS "Conductor read vehiculo_alimentacion" ON public.vehiculo_alimentacion;
CREATE POLICY "Conductor read vehiculo_alimentacion" ON public.vehiculo_alimentacion
FOR SELECT TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND vehiculo_id IN (SELECT get_conductor_vehicle_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Conductor read vehiculo_disponibilidad" ON public.vehiculo_disponibilidad;
CREATE POLICY "Conductor read vehiculo_disponibilidad" ON public.vehiculo_disponibilidad
FOR SELECT TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND vehiculo_id IN (SELECT get_conductor_vehicle_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Conductor update vehiculo_disponibilidad" ON public.vehiculo_disponibilidad;
CREATE POLICY "Conductor update vehiculo_disponibilidad" ON public.vehiculo_disponibilidad
FOR UPDATE TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND vehiculo_id IN (SELECT get_conductor_vehicle_ids(auth.uid()))
)
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid())
  AND vehiculo_id IN (SELECT get_conductor_vehicle_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Conductor insert vehiculo_disponibilidad" ON public.vehiculo_disponibilidad;
CREATE POLICY "Conductor insert vehiculo_disponibilidad" ON public.vehiculo_disponibilidad
FOR INSERT TO authenticated
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid())
  AND vehiculo_id IN (SELECT get_conductor_vehicle_ids(auth.uid()))
);

-- Semanas: conductor policies reference asignaciones (OK, no vehiculos direct)
-- But fix the ones that do subquery vehiculos
DROP POLICY IF EXISTS "Conductor read semanas" ON public.semanas;
CREATE POLICY "Conductor read semanas" ON public.semanas
FOR SELECT TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND vehiculo_id IN (SELECT get_conductor_vehicle_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Conductor insert semanas" ON public.semanas;
CREATE POLICY "Conductor insert semanas" ON public.semanas
FOR INSERT TO authenticated
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid())
  AND vehiculo_id IN (SELECT get_conductor_vehicle_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Conductor update semanas" ON public.semanas;
CREATE POLICY "Conductor update semanas" ON public.semanas
FOR UPDATE TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND vehiculo_id IN (SELECT get_conductor_vehicle_ids(auth.uid()))
)
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid())
  AND vehiculo_id IN (SELECT get_conductor_vehicle_ids(auth.uid()))
);

-- dias_operacion conductor policies reference semanas->asignaciones, fix with helper
DROP POLICY IF EXISTS "Conductor read dias_operacion" ON public.dias_operacion;
CREATE POLICY "Conductor read dias_operacion" ON public.dias_operacion
FOR SELECT TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND semana_id IN (SELECT s.id FROM semanas s WHERE s.vehiculo_id IN (SELECT get_conductor_vehicle_ids(auth.uid())))
);

DROP POLICY IF EXISTS "Conductor insert dias_operacion" ON public.dias_operacion;
CREATE POLICY "Conductor insert dias_operacion" ON public.dias_operacion
FOR INSERT TO authenticated
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid())
  AND semana_id IN (SELECT s.id FROM semanas s WHERE s.vehiculo_id IN (SELECT get_conductor_vehicle_ids(auth.uid())))
);

DROP POLICY IF EXISTS "Conductor update dias_operacion" ON public.dias_operacion;
CREATE POLICY "Conductor update dias_operacion" ON public.dias_operacion
FOR UPDATE TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND semana_id IN (SELECT s.id FROM semanas s WHERE s.vehiculo_id IN (SELECT get_conductor_vehicle_ids(auth.uid())))
)
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid())
  AND semana_id IN (SELECT s.id FROM semanas s WHERE s.vehiculo_id IN (SELECT get_conductor_vehicle_ids(auth.uid())))
);
