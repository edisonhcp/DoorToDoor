
-- =============================================
-- PART 1: Helper functions
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_conductor_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT conductor_id FROM public.profiles WHERE user_id = _user_id LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.get_user_propietario_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT propietario_id FROM public.profiles WHERE user_id = _user_id LIMIT 1 $$;

-- Audit log insert function (auto-populates user_id and rol from session)
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  _empresa_id uuid,
  _accion accion_audit,
  _antes jsonb DEFAULT NULL,
  _despues jsonb DEFAULT NULL,
  _vehiculo_id text DEFAULT NULL,
  _dia_operacion_id text DEFAULT NULL,
  _semana_id text DEFAULT NULL,
  _viaje_id text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _role text;
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  SELECT role::text INTO _role FROM public.user_roles WHERE user_id = _uid LIMIT 1;
  
  -- Verify empresa_id matches user's empresa (unless SUPER_ADMIN)
  IF _role != 'SUPER_ADMIN' AND _empresa_id != (SELECT empresa_id FROM public.profiles WHERE user_id = _uid LIMIT 1) THEN
    RAISE EXCEPTION 'empresa_id mismatch';
  END IF;
  
  INSERT INTO public.audit_logs (empresa_id, accion, user_id, rol, antes, despues, vehiculo_id, dia_operacion_id, semana_id, viaje_id)
  VALUES (_empresa_id, _accion, _uid::text, _role, _antes, _despues, _vehiculo_id, _dia_operacion_id, _semana_id, _viaje_id);
END;
$$;

-- =============================================
-- PART 2: Add created_by to invitaciones
-- =============================================
ALTER TABLE public.invitaciones ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

-- =============================================
-- PART 3: Drop old permissive tenant policies
-- =============================================
DROP POLICY IF EXISTS "Tenant access conductores" ON public.conductores;
DROP POLICY IF EXISTS "Tenant access propietarios" ON public.propietarios;
DROP POLICY IF EXISTS "Tenant access vehiculos" ON public.vehiculos;
DROP POLICY IF EXISTS "Tenant access asignaciones" ON public.asignaciones;
DROP POLICY IF EXISTS "Tenant access viajes" ON public.viajes;
DROP POLICY IF EXISTS "Tenant access semanas" ON public.semanas;
DROP POLICY IF EXISTS "Tenant access dias_operacion" ON public.dias_operacion;
DROP POLICY IF EXISTS "Tenant access ingresos" ON public.ingresos_viaje;
DROP POLICY IF EXISTS "Tenant access egresos" ON public.egresos_viaje;
DROP POLICY IF EXISTS "Tenant access reservaciones" ON public.reservaciones;
DROP POLICY IF EXISTS "Tenant access pasajeros" ON public.pasajeros;
DROP POLICY IF EXISTS "Tenant access vehiculo_alimentacion" ON public.vehiculo_alimentacion;
DROP POLICY IF EXISTS "Tenant access vehiculo_disponibilidad" ON public.vehiculo_disponibilidad;
DROP POLICY IF EXISTS "Tenant access viaje_dia_control" ON public.viaje_dia_control;

-- Remove audit INSERT policies (replaced by insert_audit_log function)
DROP POLICY IF EXISTS "Gerencia insert audit" ON public.audit_logs;
DROP POLICY IF EXISTS "Super admin insert audit_logs" ON public.audit_logs;

-- Remove broad profiles SELECT
DROP POLICY IF EXISTS "Users see empresa profiles" ON public.profiles;

-- Remove old invitaciones policy
DROP POLICY IF EXISTS "Gerencia access invitaciones" ON public.invitaciones;

-- =============================================
-- PART 4: CONDUCTORES - role-specific policies
-- =============================================
CREATE POLICY "Gerencia access conductores" ON public.conductores FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role));

CREATE POLICY "Conductor read own" ON public.conductores FOR SELECT TO authenticated
USING (id = get_user_conductor_id(auth.uid()) AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Propietario read conductores" ON public.conductores FOR SELECT TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'PROPIETARIO'::app_role));

-- =============================================
-- PART 5: PROPIETARIOS - role-specific policies
-- =============================================
CREATE POLICY "Gerencia access propietarios" ON public.propietarios FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role));

CREATE POLICY "Propietario read own" ON public.propietarios FOR SELECT TO authenticated
USING (id = get_user_propietario_id(auth.uid()) AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Propietario update own" ON public.propietarios FOR UPDATE TO authenticated
USING (id = get_user_propietario_id(auth.uid()) AND empresa_id = get_user_empresa_id(auth.uid()))
WITH CHECK (id = get_user_propietario_id(auth.uid()) AND empresa_id = get_user_empresa_id(auth.uid()));

-- =============================================
-- PART 6: VEHICULOS - role-specific policies
-- =============================================
CREATE POLICY "Gerencia access vehiculos" ON public.vehiculos FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role));

CREATE POLICY "Propietario access vehiculos" ON public.vehiculos FOR ALL TO authenticated
USING (propietario_id = get_user_propietario_id(auth.uid()) AND empresa_id = get_user_empresa_id(auth.uid()))
WITH CHECK (propietario_id = get_user_propietario_id(auth.uid()) AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Conductor read assigned vehiculo" ON public.vehiculos FOR SELECT TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND EXISTS (
  SELECT 1 FROM public.asignaciones WHERE vehiculo_id = vehiculos.id AND conductor_id = get_user_conductor_id(auth.uid())
));

-- =============================================
-- PART 7: ASIGNACIONES - role-specific policies
-- =============================================
CREATE POLICY "Gerencia access asignaciones" ON public.asignaciones FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role));

CREATE POLICY "Conductor read own asignaciones" ON public.asignaciones FOR SELECT TO authenticated
USING (conductor_id = get_user_conductor_id(auth.uid()) AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Conductor update own asignaciones" ON public.asignaciones FOR UPDATE TO authenticated
USING (conductor_id = get_user_conductor_id(auth.uid()) AND empresa_id = get_user_empresa_id(auth.uid()))
WITH CHECK (conductor_id = get_user_conductor_id(auth.uid()) AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Propietario read asignaciones" ON public.asignaciones FOR SELECT TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND EXISTS (
  SELECT 1 FROM public.vehiculos WHERE id = asignaciones.vehiculo_id AND propietario_id = get_user_propietario_id(auth.uid())
));

-- =============================================
-- PART 8: VIAJES - role-specific policies
-- =============================================
CREATE POLICY "Gerencia access viajes" ON public.viajes FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role));

CREATE POLICY "Conductor select own viajes" ON public.viajes FOR SELECT TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND asignacion_id IN (
  SELECT id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
));

CREATE POLICY "Conductor insert own viajes" ON public.viajes FOR INSERT TO authenticated
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND asignacion_id IN (
  SELECT id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
));

CREATE POLICY "Conductor update own viajes" ON public.viajes FOR UPDATE TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND asignacion_id IN (
  SELECT id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND asignacion_id IN (
  SELECT id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
));

CREATE POLICY "Conductor delete own viajes" ON public.viajes FOR DELETE TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND asignacion_id IN (
  SELECT id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
));

CREATE POLICY "Propietario read viajes" ON public.viajes FOR SELECT TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND asignacion_id IN (
  SELECT a.id FROM public.asignaciones a JOIN public.vehiculos v ON a.vehiculo_id = v.id
  WHERE v.propietario_id = get_user_propietario_id(auth.uid())
));

-- =============================================
-- PART 9: SEMANAS - role-specific policies
-- =============================================
CREATE POLICY "Gerencia access semanas" ON public.semanas FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role));

CREATE POLICY "Conductor read semanas" ON public.semanas FOR SELECT TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND vehiculo_id IN (
  SELECT vehiculo_id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
));

CREATE POLICY "Conductor update semanas" ON public.semanas FOR UPDATE TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND vehiculo_id IN (
  SELECT vehiculo_id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND vehiculo_id IN (
  SELECT vehiculo_id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
));

CREATE POLICY "Conductor insert semanas" ON public.semanas FOR INSERT TO authenticated
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND vehiculo_id IN (
  SELECT vehiculo_id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
));

CREATE POLICY "Propietario read semanas" ON public.semanas FOR SELECT TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND propietario_id = get_user_propietario_id(auth.uid()));

CREATE POLICY "Propietario update semanas" ON public.semanas FOR UPDATE TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND propietario_id = get_user_propietario_id(auth.uid()))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND propietario_id = get_user_propietario_id(auth.uid()));

-- =============================================
-- PART 10: DIAS_OPERACION - role-specific policies
-- =============================================
CREATE POLICY "Gerencia access dias_operacion" ON public.dias_operacion FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role));

CREATE POLICY "Conductor read dias_operacion" ON public.dias_operacion FOR SELECT TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND semana_id IN (
  SELECT id FROM public.semanas WHERE vehiculo_id IN (
    SELECT vehiculo_id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
  )
));

CREATE POLICY "Conductor update dias_operacion" ON public.dias_operacion FOR UPDATE TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND semana_id IN (
  SELECT id FROM public.semanas WHERE vehiculo_id IN (
    SELECT vehiculo_id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
  )
))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND semana_id IN (
  SELECT id FROM public.semanas WHERE vehiculo_id IN (
    SELECT vehiculo_id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
  )
));

CREATE POLICY "Conductor insert dias_operacion" ON public.dias_operacion FOR INSERT TO authenticated
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND semana_id IN (
  SELECT id FROM public.semanas WHERE vehiculo_id IN (
    SELECT vehiculo_id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
  )
));

CREATE POLICY "Propietario read dias_operacion" ON public.dias_operacion FOR SELECT TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND semana_id IN (
  SELECT id FROM public.semanas WHERE propietario_id = get_user_propietario_id(auth.uid())
));

-- =============================================
-- PART 11: INGRESOS_VIAJE - role-specific policies
-- =============================================
CREATE POLICY "Gerencia access ingresos" ON public.ingresos_viaje FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role));

CREATE POLICY "Conductor access ingresos" ON public.ingresos_viaje FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND viaje_id IN (
  SELECT v.id FROM public.viajes v WHERE v.asignacion_id IN (
    SELECT id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
  )
))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND viaje_id IN (
  SELECT v.id FROM public.viajes v WHERE v.asignacion_id IN (
    SELECT id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
  )
));

CREATE POLICY "Propietario read ingresos" ON public.ingresos_viaje FOR SELECT TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND viaje_id IN (
  SELECT v.id FROM public.viajes v WHERE v.asignacion_id IN (
    SELECT a.id FROM public.asignaciones a JOIN public.vehiculos ve ON a.vehiculo_id = ve.id
    WHERE ve.propietario_id = get_user_propietario_id(auth.uid())
  )
));

-- =============================================
-- PART 12: EGRESOS_VIAJE - role-specific policies
-- =============================================
CREATE POLICY "Gerencia access egresos" ON public.egresos_viaje FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role));

CREATE POLICY "Conductor access egresos" ON public.egresos_viaje FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND viaje_id IN (
  SELECT v.id FROM public.viajes v WHERE v.asignacion_id IN (
    SELECT id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
  )
))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND viaje_id IN (
  SELECT v.id FROM public.viajes v WHERE v.asignacion_id IN (
    SELECT id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
  )
));

CREATE POLICY "Propietario read egresos" ON public.egresos_viaje FOR SELECT TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND viaje_id IN (
  SELECT v.id FROM public.viajes v WHERE v.asignacion_id IN (
    SELECT a.id FROM public.asignaciones a JOIN public.vehiculos ve ON a.vehiculo_id = ve.id
    WHERE ve.propietario_id = get_user_propietario_id(auth.uid())
  )
));

-- =============================================
-- PART 13: RESERVACIONES - role-specific policies
-- =============================================
CREATE POLICY "Gerencia access reservaciones" ON public.reservaciones FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role));

CREATE POLICY "Conductor access reservaciones" ON public.reservaciones FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND viaje_id IN (
  SELECT v.id FROM public.viajes v WHERE v.asignacion_id IN (
    SELECT id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
  )
))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND viaje_id IN (
  SELECT v.id FROM public.viajes v WHERE v.asignacion_id IN (
    SELECT id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
  )
));

-- =============================================
-- PART 14: PASAJEROS - role-specific policies
-- =============================================
CREATE POLICY "Gerencia access pasajeros" ON public.pasajeros FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role));

CREATE POLICY "Conductor access pasajeros" ON public.pasajeros FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND reservacion_id IN (
  SELECT r.id FROM public.reservaciones r WHERE r.viaje_id IN (
    SELECT v.id FROM public.viajes v WHERE v.asignacion_id IN (
      SELECT id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
    )
  )
))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND reservacion_id IN (
  SELECT r.id FROM public.reservaciones r WHERE r.viaje_id IN (
    SELECT v.id FROM public.viajes v WHERE v.asignacion_id IN (
      SELECT id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
    )
  )
));

-- =============================================
-- PART 15: VEHICULO_ALIMENTACION - role-specific policies
-- =============================================
CREATE POLICY "Gerencia access vehiculo_alimentacion" ON public.vehiculo_alimentacion FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role));

CREATE POLICY "Propietario access vehiculo_alimentacion" ON public.vehiculo_alimentacion FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND vehiculo_id IN (
  SELECT id FROM public.vehiculos WHERE propietario_id = get_user_propietario_id(auth.uid())
))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND vehiculo_id IN (
  SELECT id FROM public.vehiculos WHERE propietario_id = get_user_propietario_id(auth.uid())
));

CREATE POLICY "Conductor read vehiculo_alimentacion" ON public.vehiculo_alimentacion FOR SELECT TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND vehiculo_id IN (
  SELECT vehiculo_id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
));

-- =============================================
-- PART 16: VEHICULO_DISPONIBILIDAD - role-specific policies
-- =============================================
CREATE POLICY "Gerencia access vehiculo_disponibilidad" ON public.vehiculo_disponibilidad FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role));

CREATE POLICY "Conductor read vehiculo_disponibilidad" ON public.vehiculo_disponibilidad FOR SELECT TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND vehiculo_id IN (
  SELECT vehiculo_id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
));

CREATE POLICY "Conductor update vehiculo_disponibilidad" ON public.vehiculo_disponibilidad FOR UPDATE TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND vehiculo_id IN (
  SELECT vehiculo_id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND vehiculo_id IN (
  SELECT vehiculo_id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
));

CREATE POLICY "Conductor insert vehiculo_disponibilidad" ON public.vehiculo_disponibilidad FOR INSERT TO authenticated
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND vehiculo_id IN (
  SELECT vehiculo_id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
));

CREATE POLICY "Propietario read vehiculo_disponibilidad" ON public.vehiculo_disponibilidad FOR SELECT TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND vehiculo_id IN (
  SELECT id FROM public.vehiculos WHERE propietario_id = get_user_propietario_id(auth.uid())
));

-- =============================================
-- PART 17: VIAJE_DIA_CONTROL - role-specific policies
-- =============================================
CREATE POLICY "Gerencia access viaje_dia_control" ON public.viaje_dia_control FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role));

CREATE POLICY "Conductor access viaje_dia_control" ON public.viaje_dia_control FOR ALL TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND viaje_id IN (
  SELECT v.id FROM public.viajes v WHERE v.asignacion_id IN (
    SELECT id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
  )
))
WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND viaje_id IN (
  SELECT v.id FROM public.viajes v WHERE v.asignacion_id IN (
    SELECT id FROM public.asignaciones WHERE conductor_id = get_user_conductor_id(auth.uid())
  )
));

-- =============================================
-- PART 18: PROFILES - restricted visibility
-- =============================================
CREATE POLICY "Users see own profile" ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Gerencia see empresa profiles" ON public.profiles FOR SELECT TO authenticated
USING (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'GERENCIA'::app_role));

-- =============================================
-- PART 19: INVITACIONES - scoped to creator
-- =============================================
CREATE POLICY "Gerencia access own invitaciones" ON public.invitaciones FOR ALL TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid()) 
  AND has_role(auth.uid(), 'GERENCIA'::app_role)
  AND (created_by_user_id = auth.uid() OR created_by_user_id IS NULL)
)
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid()) 
  AND has_role(auth.uid(), 'GERENCIA'::app_role)
);
