import { supabase } from "@/integrations/supabase/client";

export const ACCION_LABELS: Record<string, string> = {
  CONDUCTOR_DIA_FINALIZADO: "Día finalizado (conductor)",
  CONDUCTOR_DIA_REABIERTO: "Día reabierto (conductor)",
  GERENCIA_DIA_FINALIZADO: "Día finalizado (gerencia)",
  GERENCIA_DIA_REABIERTO: "Día reabierto (gerencia)",
  CONDUCTOR_SEMANA_FINALIZADA: "Semana finalizada (conductor)",
  CONDUCTOR_SEMANA_REABIERTA: "Semana reabierta (conductor)",
  GERENCIA_SEMANA_FINALIZADA: "Semana finalizada (gerencia)",
  GERENCIA_SEMANA_REABIERTA: "Semana reabierta (gerencia)",
  PROPIETARIO_SEMANA_CERRADA: "Semana cerrada (propietario)",
  PROPIETARIO_SEMANA_REABIERTA: "Semana reabierta (propietario)",
  CONDUCTOR_VEHICULO_EN_RUTA: "Vehículo en ruta",
  INGRESOS_EDITADOS: "Ingresos editados",
  EGRESOS_EDITADOS: "Egresos editados",
  CONDUCTOR_VEHICULO_DISPONIBLE: "Vehículo disponible",
  CONDUCTOR_VEHICULO_NO_DISPONIBLE: "Vehículo no disponible",
  LINK_CONDUCTOR_GENERADO: "Link conductor generado",
  LINK_PROPIETARIO_GENERADO: "Link propietario generado",
  LINK_GERENCIA_GENERADO: "Link gerencia generado",
  PROPIETARIO_ELIMINADO: "Propietario eliminado",
  CONDUCTOR_ELIMINADO: "Conductor eliminado",
  VEHICULO_ELIMINADO: "Vehículo eliminado",
  ASIGNACION_CREADA: "Asignación creada",
  ASIGNACION_CERRADA: "Asignación cerrada",
  REPORTE_IMPRESO: "Reporte impreso",
  EMPRESA_SUSPENDIDA: "Empresa suspendida",
  EMPRESA_REACTIVADA: "Empresa reactivada",
  EMPRESA_ELIMINADA: "Empresa eliminada",
  SOLICITUD_BAJA_APROBADA: "Solicitud de baja aprobada",
  SOLICITUD_BAJA_RECHAZADA: "Solicitud de baja rechazada",
};

export async function fetchAuditLogs(filters?: {
  empresaId?: string;
  accion?: string;
  desde?: string;
  hasta?: string;
}) {
  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (filters?.empresaId) {
    query = query.eq("empresa_id", filters.empresaId);
  }
  if (filters?.accion) {
    query = query.eq("accion", filters.accion);
  }
  if (filters?.desde) {
    query = query.gte("created_at", filters.desde);
  }
  if (filters?.hasta) {
    query = query.lte("created_at", filters.hasta + "T23:59:59");
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function insertAuditLog(params: {
  empresa_id: string;
  accion: string;
  user_id?: string;
  rol?: string;
  antes?: any;
  despues?: any;
  vehiculo_id?: string;
  viaje_id?: string;
  semana_id?: string;
  dia_operacion_id?: string;
}) {
  const { error } = await supabase.from("audit_logs").insert({
    empresa_id: params.empresa_id,
    accion: params.accion as any,
    user_id: params.user_id || null,
    rol: params.rol || null,
    antes: params.antes || null,
    despues: params.despues || null,
    vehiculo_id: params.vehiculo_id || null,
    viaje_id: params.viaje_id || null,
    semana_id: params.semana_id || null,
    dia_operacion_id: params.dia_operacion_id || null,
  });
  return { error };
}
