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
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const logoUrl = `${supabaseUrl}/storage/v1/object/public/recibos/${filePath}?t=${Date.now()}`;
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
  // Get viajes and current active assignments to show correct conductor
  // Fetch viajes + asignacion details separately to avoid FK hint issues
  const [viajesRes, asigAllRes] = await Promise.all([
    supabase
      .from("viajes")
      .select("id, destino, estado, fecha_llegada, fecha_salida, asignacion_id")
      .eq("empresa_id", empresaId)
      .in("estado", ["ASIGNADO", "EN_RUTA", "FINALIZADO"] as any)
      .order("fecha_llegada", { ascending: false }),
    supabase
      .from("asignaciones")
      .select("id, vehiculo_id, conductor_id, estado")
      .eq("empresa_id", empresaId),
  ]);

  // Build lookup maps for asignaciones, vehiculos, conductores
  const asignacionMap: Record<string, any> = {};
  for (const a of (asigAllRes.data || [])) {
    asignacionMap[a.id] = a;
  }

  // Get vehiculos and conductores for enrichment
  const [vehRes, condRes] = await Promise.all([
    supabase.from("vehiculos").select("id, placa, marca, modelo").eq("empresa_id", empresaId),
    supabase.from("conductores").select("id, nombres, apellidos").eq("empresa_id", empresaId),
  ]);
  const vehMap: Record<string, any> = {};
  for (const v of (vehRes.data || [])) vehMap[v.id] = v;
  const condMap: Record<string, any> = {};
  for (const c of (condRes.data || [])) condMap[c.id] = c;

  if (viajesRes.error) return { viajes: [], activeAssignments: [] };

  const viajes = (viajesRes.data || []).map((v: any) => {
    const asig = v.asignacion_id ? asignacionMap[v.asignacion_id] : null;
    return {
      id: v.id,
      destino: v.destino,
      estado: v.estado,
      fecha_llegada: v.fecha_llegada,
      fecha_salida: v.fecha_salida,
      vehiculo: asig ? vehMap[asig.vehiculo_id] || null : null,
      conductor: asig ? condMap[asig.conductor_id] || null : null,
    };
  });

  // Map vehiculo_id -> current conductor from active assignments
  const activeAssignments: Record<string, { nombres: string; apellidos: string }> = {};
  for (const a of Object.values(asignacionMap) as any[]) {
    if (a.estado === "ACTIVA" && a.conductor_id && a.vehiculo_id) {
      const cond = condMap[a.conductor_id];
      if (cond) {
        activeAssignments[a.vehiculo_id] = { nombres: cond.nombres, apellidos: cond.apellidos };
      }
    }
  }

  return { viajes, activeAssignments };
}

export interface VehiculoDespacho {
  vehiculoId: string;
  placa: string;
  marca: string;
  modelo: string;
  conductorNombre: string | null;
  ciudadActual: string;
  fechaLlegada: string | null;
  estadoRuta: string | null;
  destinoPendiente: string | null;
}

export function buildDespachoBoard(viajes: any[], activeAssignments?: Record<string, { nombres: string; apellidos: string }>): Record<string, VehiculoDespacho[]> {
  // For each vehicle, find its current city (last FINALIZADO destination)
  // and whether it has a pending route (ASIGNADO or EN_RUTA)
  const vehiculoMap: Record<string, VehiculoDespacho> = {};

  // First pass: find last FINALIZADO per vehicle (data is ordered by fecha_llegada desc)
  for (const v of viajes) {
    if (!v.vehiculo?.id) continue;
    const vid = v.vehiculo.id;
    if (v.estado === "FINALIZADO" && !vehiculoMap[vid]) {
      // Use current active assignment conductor, fallback to trip's conductor
      const activeCond = activeAssignments?.[vid];
      const conductorNombre = activeCond
        ? `${activeCond.nombres} ${activeCond.apellidos}`
        : (v.conductor ? `${v.conductor.nombres} ${v.conductor.apellidos}` : null);
      vehiculoMap[vid] = {
        vehiculoId: vid,
        placa: v.vehiculo.placa,
        marca: v.vehiculo.marca,
        modelo: v.vehiculo.modelo,
        conductorNombre,
        ciudadActual: matchCity(v.destino),
        fechaLlegada: v.fecha_llegada,
        estadoRuta: null,
        destinoPendiente: null,
      };
    }
  }

  // Second pass: check for pending routes (ASIGNADO / EN_RUTA)
  for (const v of viajes) {
    if (!v.vehiculo?.id) continue;
    const vid = v.vehiculo.id;
    if (v.estado === "ASIGNADO" || v.estado === "EN_RUTA") {
      if (vehiculoMap[vid]) {
        vehiculoMap[vid].estadoRuta = v.estado;
        vehiculoMap[vid].destinoPendiente = matchCity(v.destino);
        // Si está EN_RUTA, mover el vehículo a la columna de la ciudad destino
        if (v.estado === "EN_RUTA") {
          vehiculoMap[vid].ciudadActual = matchCity(v.destino);
        }
      }
    }
  }

  // Group by ciudadActual, sorted by fechaLlegada asc (first arrived = first turn)
  const grouped: Record<string, VehiculoDespacho[]> = {};
  const fixedCities = ["STO", "QTO", "MTA", "GYE"];
  fixedCities.forEach(c => { grouped[c] = []; });

  for (const veh of Object.values(vehiculoMap)) {
    const city = veh.ciudadActual;
    if (!grouped[city]) grouped[city] = [];
    grouped[city].push(veh);
  }

  // Sort each city by fechaLlegada ascending (FIFO)
  for (const city of Object.keys(grouped)) {
    grouped[city].sort((a, b) => {
      if (!a.fechaLlegada) return 1;
      if (!b.fechaLlegada) return -1;
      return new Date(a.fechaLlegada).getTime() - new Date(b.fechaLlegada).getTime();
    });
  }

  return grouped;
}
