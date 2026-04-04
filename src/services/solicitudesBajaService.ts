import { supabase } from "@/integrations/supabase/client";

export async function fetchSolicitudPendiente(empresaId: string) {
  const { data } = await supabase
    .from("solicitudes_baja")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("estado", "PENDIENTE")
    .maybeSingle();
  return data;
}

export async function crearSolicitudBaja(empresaId: string, userId: string, motivo: string) {
  const { error } = await supabase
    .from("solicitudes_baja")
    .insert({ empresa_id: empresaId, solicitado_por: userId, motivo });
  return { error };
}

export async function fetchSolicitudesPendientes() {
  const [solRes, empRes] = await Promise.all([
    supabase.from("solicitudes_baja").select("*").eq("estado", "PENDIENTE").order("created_at", { ascending: false }),
    supabase.from("empresas").select("id, nombre"),
  ]);

  const empresasById: Record<string, string> = {};
  (empRes.data || []).forEach((e: any) => { empresasById[e.id] = e.nombre; });

  return (solRes.data || []).map((s: any) => ({
    ...s,
    empresas: { nombre: empresasById[s.empresa_id] || "Compañía eliminada" },
  }));
}

export async function resolverSolicitud(id: string, estado: "APROBADA" | "RECHAZADA", resueltoPor: string, motivoRechazo?: string) {
  const { error } = await supabase
    .from("solicitudes_baja")
    .update({
      estado,
      resuelto_por: resueltoPor,
      resuelto_at: new Date().toISOString(),
      motivo_rechazo: motivoRechazo || null,
    })
    .eq("id", id);
  return { error };
}
