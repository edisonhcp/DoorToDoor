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

  // Filter out vehicles that already have an active viaje (ASIGNADO or EN_RUTA)
  const { data: viajesActivos } = await supabase
    .from("viajes")
    .select("asignacion_id")
    .eq("empresa_id", empresaId)
    .in("estado", ["ASIGNADO", "EN_RUTA"]);

  const asignacionesConViajeActivo = new Set(
    (viajesActivos || []).map((v: any) => v.asignacion_id)
  );

  return (asignaciones || [])
    .filter((a: any) => !asignacionesConViajeActivo.has(a.id) && a.vehiculos)
    .map((a: any) => ({
      id: a.id,
      vehiculo_id: a.vehiculo_id,
      conductor_id: a.conductor_id,
      placa: a.vehiculos?.placa,
      marca: a.vehiculos?.marca,
      modelo: a.vehiculos?.modelo,
      capacidad: a.vehiculos?.capacidad,
      conductor_nombre: `${a.conductores?.nombres || ""} ${a.conductores?.apellidos || ""}`.trim(),
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
      fecha_salida: new Date().toISOString(),
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

  // Get active assignments for this conductor
  const { data: asignaciones } = await supabase
    .from("asignaciones")
    .select("id, vehiculo_id, vehiculos(placa, marca, modelo)")
    .eq("conductor_id", profile.conductor_id)
    .eq("estado", "ACTIVA");

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
