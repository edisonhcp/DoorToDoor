import { supabase } from "@/integrations/supabase/client";

export interface RutaAsignada {
  id: string;
  destino: string;
  origen: string;
  hora_salida: string | null;
  cantidad_pasajeros: number;
  estado: string;
  fecha_salida: string;
  asignacion_id: string | null;
  ingresos?: {
    pasajeros_monto: number;
    encomiendas_monto: number;
  };
  vehiculo?: {
    placa: string;
    marca: string;
    modelo: string;
  };
  conductor?: {
    nombres: string;
    apellidos: string;
  };
}

export async function fetchVehiculosDisponibles(empresaId: string) {
  // Get vehicles with ACTIVA assignments (have a conductor)
  const { data: asignaciones } = await supabase
    .from("asignaciones")
    .select("id, vehiculo_id, conductor_id, vehiculos(id, placa, marca, modelo, capacidad), conductores(id, nombres, apellidos)")
    .eq("empresa_id", empresaId)
    .eq("estado", "ACTIVA");

  // Get the latest viaje per asignacion to know the last fecha_salida+hora_salida
  const { data: viajesActivos } = await supabase
    .from("viajes")
    .select("asignacion_id, fecha_salida, hora_salida, estado")
    .eq("empresa_id", empresaId)
    .in("estado", ["ASIGNADO", "EN_RUTA", "FINALIZADO"] as any)
    .order("fecha_salida", { ascending: false });

  // Build a map: asignacion_id -> latest viaje info
  const ultimoViajePorAsignacion: Record<string, { fecha_salida: string; hora_salida: string | null; estado: string }> = {};
  for (const v of (viajesActivos || []) as any[]) {
    if (v.asignacion_id && !ultimoViajePorAsignacion[v.asignacion_id]) {
      ultimoViajePorAsignacion[v.asignacion_id] = {
        fecha_salida: v.fecha_salida,
        hora_salida: v.hora_salida,
        estado: v.estado,
      };
    }
  }

  return (asignaciones || [])
    .filter((a: any) => a.vehiculos)
    .map((a: any) => ({
      id: a.id,
      vehiculo_id: a.vehiculo_id,
      conductor_id: a.conductor_id,
      placa: a.vehiculos?.placa,
      marca: a.vehiculos?.marca,
      modelo: a.vehiculos?.modelo,
      capacidad: a.vehiculos?.capacidad,
      conductor_nombre: `${a.conductores?.nombres || ""} ${a.conductores?.apellidos || ""}`.trim(),
      ultimo_viaje: ultimoViajePorAsignacion[a.id] || null,
    }));
}

export async function crearAsignacionRuta(params: {
  asignacion_id: string;
  destino: string;
  origen: string;
  hora_salida: string;
  cantidad_pasajeros: number;
  pasajeros_monto: number;
  encomiendas_monto: number;
  empresa_id: string;
  fecha_salida?: string;
}) {
  // Create viaje
  const { data: viaje, error: viajeError } = await supabase
    .from("viajes")
    .insert({
      asignacion_id: params.asignacion_id,
      destino: params.destino,
      origen: params.origen,
      hora_salida: params.hora_salida,
      cantidad_pasajeros: params.cantidad_pasajeros,
      fecha_salida: params.fecha_salida || new Date().toISOString(),
      estado: "ASIGNADO" as any,
      empresa_id: params.empresa_id,
    })
    .select()
    .single();

  if (viajeError) return { error: viajeError };

  // Create ingresos_viaje
  const totalIngreso = params.pasajeros_monto + params.encomiendas_monto;
  const { error: ingresosError } = await supabase
    .from("ingresos_viaje")
    .insert({
      viaje_id: viaje.id,
      pasajeros_monto: params.pasajeros_monto,
      encomiendas_monto: params.encomiendas_monto,
      total_ingreso: totalIngreso,
      empresa_id: params.empresa_id,
    });

  if (ingresosError) return { error: ingresosError };

  return { data: viaje, error: null };
}

export async function fetchAsignacionesActivas(empresaId: string) {
  const { data, error } = await supabase
    .from("viajes")
    .select(`
      id, destino, origen, hora_salida, cantidad_pasajeros, estado, fecha_salida,
      asignacion_id,
      ingresos_viaje(pasajeros_monto, encomiendas_monto),
      asignaciones(
        vehiculos(placa, marca, modelo),
        conductores(nombres, apellidos)
      )
    `)
    .eq("empresa_id", empresaId)
    .in("estado", ["ASIGNADO", "EN_RUTA", "FINALIZADO"] as any)
    .order("created_at", { ascending: false });

  return {
    data: (data || []).map((v: any) => ({
      ...v,
      vehiculo: v.asignaciones?.vehiculos,
      conductor: v.asignaciones?.conductores,
      ingresos: v.ingresos_viaje,
    })),
    error,
  };
}

export async function fetchRutasConductor(userId: string) {
  // Get conductor_id from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("conductor_id, empresa_id")
    .eq("user_id", userId)
    .single();

  if (!profile?.conductor_id) return { data: [], error: null };

  // Get ALL assignments for this conductor (including CERRADA, since viajes may reference them)
  const { data: asignaciones } = await supabase
    .from("asignaciones")
    .select("id, vehiculo_id, vehiculos(placa, marca, modelo)")
    .eq("conductor_id", profile.conductor_id);

  if (!asignaciones || asignaciones.length === 0) return { data: [], error: null };

  const asignacionIds = asignaciones.map((a: any) => a.id);

  const { data: viajes, error } = await supabase
    .from("viajes")
    .select(`
      id, destino, origen, hora_salida, cantidad_pasajeros, estado, fecha_salida,
      asignacion_id,
      ingresos_viaje(pasajeros_monto, encomiendas_monto)
    `)
    .in("asignacion_id", asignacionIds)
    .in("estado", ["ASIGNADO", "EN_RUTA"] as any)
    .order("created_at", { ascending: false });

  const asignacionMap = Object.fromEntries(
    asignaciones.map((a: any) => [a.id, a.vehiculos])
  );

  return {
    data: (viajes || []).map((v: any) => ({
      ...v,
      vehiculo: asignacionMap[v.asignacion_id],
      ingresos: v.ingresos_viaje,
    })),
    error,
  };
}

export async function iniciarRuta(viajeId: string) {
  const { error } = await supabase
    .from("viajes")
    .update({ estado: "EN_RUTA" as any })
    .eq("id", viajeId);
  return { error };
}

export async function finalizarRuta(viajeId: string) {
  const { error } = await supabase
    .from("viajes")
    .update({ estado: "FINALIZADO" as any, fecha_llegada: new Date().toISOString() })
    .eq("id", viajeId);
  return { error };
}

export async function editarAsignacionRuta(params: {
  viaje_id: string;
  destino: string;
  origen: string;
  hora_salida: string;
  cantidad_pasajeros: number;
  pasajeros_monto: number;
  encomiendas_monto: number;
  asignacion_id?: string;
}) {
  const updateData: any = {
    destino: params.destino,
    origen: params.origen,
    hora_salida: params.hora_salida,
    cantidad_pasajeros: params.cantidad_pasajeros,
  };
  if (params.asignacion_id) {
    updateData.asignacion_id = params.asignacion_id;
  }

  const { error: viajeError } = await supabase
    .from("viajes")
    .update(updateData)
    .eq("id", params.viaje_id);

  if (viajeError) return { error: viajeError };

  const totalIngreso = params.pasajeros_monto + params.encomiendas_monto;
  const { error: ingresosError } = await supabase
    .from("ingresos_viaje")
    .update({
      pasajeros_monto: params.pasajeros_monto,
      encomiendas_monto: params.encomiendas_monto,
      total_ingreso: totalIngreso,
    })
    .eq("viaje_id", params.viaje_id);

  if (ingresosError) return { error: ingresosError };

  return { error: null };
}
