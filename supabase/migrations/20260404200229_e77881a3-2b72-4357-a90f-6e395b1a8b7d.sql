
-- vehiculos → propietarios (RESTRICT: delete vehicles first)
ALTER TABLE public.vehiculos
  ADD CONSTRAINT fk_vehiculos_propietario
  FOREIGN KEY (propietario_id) REFERENCES public.propietarios(id) ON DELETE RESTRICT;

-- asignaciones → conductores, vehiculos (RESTRICT: close assignments first)
ALTER TABLE public.asignaciones
  ADD CONSTRAINT fk_asignaciones_conductor
  FOREIGN KEY (conductor_id) REFERENCES public.conductores(id) ON DELETE RESTRICT;

ALTER TABLE public.asignaciones
  ADD CONSTRAINT fk_asignaciones_vehiculo
  FOREIGN KEY (vehiculo_id) REFERENCES public.vehiculos(id) ON DELETE RESTRICT;

-- viajes → asignaciones, semanas, dias_operacion (SET NULL: preserve viaje if parent removed)
ALTER TABLE public.viajes
  ADD CONSTRAINT fk_viajes_asignacion
  FOREIGN KEY (asignacion_id) REFERENCES public.asignaciones(id) ON DELETE SET NULL;

ALTER TABLE public.viajes
  ADD CONSTRAINT fk_viajes_semana
  FOREIGN KEY (semana_id) REFERENCES public.semanas(id) ON DELETE SET NULL;

ALTER TABLE public.viajes
  ADD CONSTRAINT fk_viajes_dia_operacion
  FOREIGN KEY (dia_operacion_id) REFERENCES public.dias_operacion(id) ON DELETE SET NULL;

-- ingresos_viaje → viajes (CASCADE: delete financials with viaje)
ALTER TABLE public.ingresos_viaje
  ADD CONSTRAINT fk_ingresos_viaje
  FOREIGN KEY (viaje_id) REFERENCES public.viajes(id) ON DELETE CASCADE;

-- egresos_viaje → viajes (CASCADE)
ALTER TABLE public.egresos_viaje
  ADD CONSTRAINT fk_egresos_viaje
  FOREIGN KEY (viaje_id) REFERENCES public.viajes(id) ON DELETE CASCADE;

-- viaje_dia_control → viajes (CASCADE)
ALTER TABLE public.viaje_dia_control
  ADD CONSTRAINT fk_viaje_dia_control_viaje
  FOREIGN KEY (viaje_id) REFERENCES public.viajes(id) ON DELETE CASCADE;

-- dias_operacion → semanas (CASCADE: delete days with week)
ALTER TABLE public.dias_operacion
  ADD CONSTRAINT fk_dias_operacion_semana
  FOREIGN KEY (semana_id) REFERENCES public.semanas(id) ON DELETE CASCADE;

-- semanas → vehiculos, propietarios (RESTRICT)
ALTER TABLE public.semanas
  ADD CONSTRAINT fk_semanas_vehiculo
  FOREIGN KEY (vehiculo_id) REFERENCES public.vehiculos(id) ON DELETE RESTRICT;

ALTER TABLE public.semanas
  ADD CONSTRAINT fk_semanas_propietario
  FOREIGN KEY (propietario_id) REFERENCES public.propietarios(id) ON DELETE RESTRICT;

-- profiles → conductores, propietarios (SET NULL: unlink if deleted)
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_conductor_fk
  FOREIGN KEY (conductor_id) REFERENCES public.conductores(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_propietario_fk
  FOREIGN KEY (propietario_id) REFERENCES public.propietarios(id) ON DELETE SET NULL;

-- vehiculo_alimentacion → vehiculos (CASCADE)
ALTER TABLE public.vehiculo_alimentacion
  ADD CONSTRAINT fk_vehiculo_alimentacion_vehiculo
  FOREIGN KEY (vehiculo_id) REFERENCES public.vehiculos(id) ON DELETE CASCADE;

-- vehiculo_disponibilidad → vehiculos (CASCADE)
ALTER TABLE public.vehiculo_disponibilidad
  ADD CONSTRAINT fk_vehiculo_disponibilidad_vehiculo
  FOREIGN KEY (vehiculo_id) REFERENCES public.vehiculos(id) ON DELETE CASCADE;

-- invitaciones → empresas (CASCADE: delete invitations with empresa)
ALTER TABLE public.invitaciones
  ADD CONSTRAINT fk_invitaciones_empresa
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;
