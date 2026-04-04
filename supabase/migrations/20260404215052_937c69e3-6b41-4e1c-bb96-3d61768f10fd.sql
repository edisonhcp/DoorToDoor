-- Add new audit action enum values
ALTER TYPE public.accion_audit ADD VALUE IF NOT EXISTS 'LINK_CONDUCTOR_GENERADO';
ALTER TYPE public.accion_audit ADD VALUE IF NOT EXISTS 'LINK_PROPIETARIO_GENERADO';
ALTER TYPE public.accion_audit ADD VALUE IF NOT EXISTS 'LINK_GERENCIA_GENERADO';
ALTER TYPE public.accion_audit ADD VALUE IF NOT EXISTS 'PROPIETARIO_ELIMINADO';
ALTER TYPE public.accion_audit ADD VALUE IF NOT EXISTS 'CONDUCTOR_ELIMINADO';
ALTER TYPE public.accion_audit ADD VALUE IF NOT EXISTS 'VEHICULO_ELIMINADO';
ALTER TYPE public.accion_audit ADD VALUE IF NOT EXISTS 'ASIGNACION_CREADA';
ALTER TYPE public.accion_audit ADD VALUE IF NOT EXISTS 'ASIGNACION_CERRADA';
ALTER TYPE public.accion_audit ADD VALUE IF NOT EXISTS 'REPORTE_IMPRESO';
ALTER TYPE public.accion_audit ADD VALUE IF NOT EXISTS 'EMPRESA_SUSPENDIDA';
ALTER TYPE public.accion_audit ADD VALUE IF NOT EXISTS 'EMPRESA_REACTIVADA';
ALTER TYPE public.accion_audit ADD VALUE IF NOT EXISTS 'EMPRESA_ELIMINADA';
ALTER TYPE public.accion_audit ADD VALUE IF NOT EXISTS 'SOLICITUD_BAJA_APROBADA';
ALTER TYPE public.accion_audit ADD VALUE IF NOT EXISTS 'SOLICITUD_BAJA_RECHAZADA';

-- Super Admin can read all audit logs
CREATE POLICY "Super admin see all audit_logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));

-- Super Admin can insert audit logs for any empresa
CREATE POLICY "Super admin insert audit_logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'SUPER_ADMIN'::app_role));