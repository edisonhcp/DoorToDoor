import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
  vehiculos: number;
  vehiculosDeshabilitados: number;
  conductores: number;
  conductoresDeshabilitados: number;
  propietarios: number;
  viajesBorrador: number;
  viajesCerrados: number;
  asignacionesActivas: number;
}

export async function fetchDashboardStats() {
  const [vehiculosRes, vehiculosDeshabRes, conductoresRes, conductoresDeshabRes, propietariosRes, borradorRes, cerradosRes, asignacionesRes, allCond, allVeh] =
    await Promise.all([
      supabase.from("vehiculos").select("id", { count: "exact", head: true }),
      supabase.from("vehiculos").select("id", { count: "exact", head: true }).eq("estado", "INHABILITADO"),
      supabase.from("conductores").select("id", { count: "exact", head: true }),
      supabase.from("conductores").select("id", { count: "exact", head: true }).eq("estado", "INHABILITADO"),
      supabase.from("propietarios").select("id", { count: "exact", head: true }),
      supabase.from("viajes").select("id", { count: "exact", head: true }).eq("estado", "BORRADOR"),
      supabase.from("viajes").select("id", { count: "exact", head: true }).eq("estado", "CERRADO"),
      supabase.from("asignaciones").select("conductor_id, vehiculo_id").eq("estado", "ACTIVA"),
      supabase.from("conductores").select("id, nombres").eq("estado", "HABILITADO"),
      supabase.from("vehiculos").select("id, placa, marca, modelo").eq("estado", "HABILITADO"),
    ]);

  const activeAsignaciones = asignacionesRes.data || [];
  const assignedConductorIds = new Set(activeAsignaciones.map((a: any) => a.conductor_id));
  const assignedVehiculoIds = new Set(activeAsignaciones.map((a: any) => a.vehiculo_id));

  return {
    stats: {
      vehiculos: vehiculosRes.count || 0,
      vehiculosDeshabilitados: vehiculosDeshabRes.count || 0,
      conductores: conductoresRes.count || 0,
      conductoresDeshabilitados: conductoresDeshabRes.count || 0,
      propietarios: propietariosRes.count || 0,
      viajesBorrador: borradorRes.count || 0,
      viajesCerrados: cerradosRes.count || 0,
      asignacionesActivas: activeAsignaciones.length,
    },
    unassignedConductores: (allCond.data || []).filter((c: any) => !assignedConductorIds.has(c.id)),
    unassignedVehiculos: (allVeh.data || []).filter((v: any) => !assignedVehiculoIds.has(v.id)),
  };
}

export async function fetchEmpresaNombre(empresaId: string) {
  const { data } = await supabase.from("empresas").select("nombre").eq("id", empresaId).single();
  return data?.nombre || "";
}

export async function fetchEmpresaInfo(empresaId: string) {
  const { data } = await supabase.from("empresas").select("*").eq("id", empresaId).single();
  return data;
}

export async function updateEmpresaInfo(empresaId: string, updates: any) {
  const { error } = await supabase.from("empresas").update(updates).eq("id", empresaId);
  return { error };
}

export async function uploadEmpresaLogo(empresaId: string, file: File) {
  const ext = file.name.split(".").pop();
  const filePath = `logos/${empresaId}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("recibos").upload(filePath, file, { upsert: true });
  if (uploadError) return { error: uploadError, url: null };
  const { data: urlData } = supabase.storage.from("recibos").getPublicUrl(filePath);
  const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
  const { error: updateError } = await supabase.from("empresas").update({ logo_url: logoUrl }).eq("id", empresaId);
  return { error: updateError, url: logoUrl };
}

export async function createAsignacion(conductorId: string, vehiculoId: string, empresaId: string) {
  const { error } = await supabase.from("asignaciones").insert({
    conductor_id: conductorId,
    vehiculo_id: vehiculoId,
    empresa_id: empresaId,
  });
  return { error };
}

export async function refreshAssignments() {
  const [asigRes, allCond, allVeh] = await Promise.all([
    supabase.from("asignaciones").select("conductor_id, vehiculo_id").eq("estado", "ACTIVA"),
    supabase.from("conductores").select("id, nombres").eq("estado", "HABILITADO"),
    supabase.from("vehiculos").select("id, placa, marca, modelo").eq("estado", "HABILITADO"),
  ]);
  const active = asigRes.data || [];
  const cIds = new Set(active.map((a: any) => a.conductor_id));
  const vIds = new Set(active.map((a: any) => a.vehiculo_id));
  return {
    unassignedConductores: (allCond.data || []).filter((c: any) => !cIds.has(c.id)),
    unassignedVehiculos: (allVeh.data || []).filter((v: any) => !vIds.has(v.id)),
    asignacionesActivas: active.length,
  };
}

// City alias mapping for fuzzy matching
const CITY_ALIASES: Record<string, string[]> = {
  STO: ["SANTO", "STO", "STO DGO", "SANTO DOMINGO", "SDO"],
  QTO: ["UIO", "QUITO", "QUIO", "QTO", "QUIT"],
  MTA: ["MANTA", "MNT", "MAN", "MTA"],
  GYE: ["GUA", "GYQL", "GUAYAS", "QUIL", "GYQ", "GYE", "GUAYAQUIL"],
};

export function matchCity(destino: string): string {
  const norm = destino.trim().toUpperCase();
  for (const [key, aliases] of Object.entries(CITY_ALIASES)) {
    if (aliases.some(a => norm === a || norm.includes(a))) return key;
  }
  return norm;
}

export async function fetchViajesActivosConVehiculo(empresaId: string) {
  const { data, error } = await supabase
    .from("viajes")
    .select(`
      id, destino, estado,
      asignacion_id,
      asignaciones!viajes_asignacion_id_fkey (
        vehiculo_id,
        vehiculos!asignaciones_vehiculo_id_fkey ( placa, marca, modelo )
      )
    `)
    .eq("empresa_id", empresaId)
    .in("estado", ["ASIGNADO", "EN_RUTA", "FINALIZADO"] as any);

  if (error) return [];
  return (data || []).map((v: any) => ({
    id: v.id,
    destino: v.destino,
    estado: v.estado,
    vehiculo: v.asignaciones?.vehiculos || null,
  }));
}
