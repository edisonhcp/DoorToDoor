import { supabase } from "@/integrations/supabase/client";

export interface EgresosViaje {
  id: string;
  viaje_id: string;
  peaje: number;
  hotel: number;
  aceite: number;
  pago_conductor: number;
  combustible: number;
  varios: number;
  total_egreso: number;
  desayuno: boolean;
  almuerzo: boolean;
  merienda: boolean;
  combustible_foto_url: string | null;
  varios_foto_url: string | null;
  varios_texto: string | null;
  alimentacion: number;
}

export async function fetchEgresosByViajeId(viajeId: string) {
  const { data, error } = await supabase
    .from("egresos_viaje")
    .select("*")
    .eq("viaje_id", viajeId)
    .maybeSingle();
  return { data, error };
}

export async function upsertEgresos(params: {
  viaje_id: string;
  empresa_id: string;
  peaje?: number;
  hotel?: number;
  pago_conductor?: number;
  combustible?: number;
  varios?: number;
  desayuno?: boolean;
  almuerzo?: boolean;
  merienda?: boolean;
  combustible_foto_url?: string | null;
  varios_foto_url?: string | null;
  varios_texto?: string | null;
}) {
  const { data: existing } = await supabase
    .from("egresos_viaje")
    .select("id")
    .eq("viaje_id", params.viaje_id)
    .maybeSingle();

  const totalEgreso =
    (params.peaje || 0) +
    (params.hotel || 0) +
    (params.pago_conductor || 0) +
    (params.combustible || 0) +
    (params.varios || 0);

  const payload: any = {
    viaje_id: params.viaje_id,
    empresa_id: params.empresa_id,
    peaje: params.peaje || 0,
    hotel: params.hotel || 0,
    pago_conductor: params.pago_conductor || 0,
    combustible: params.combustible || 0,
    varios: params.varios || 0,
    total_egreso: totalEgreso,
    desayuno: params.desayuno || false,
    almuerzo: params.almuerzo || false,
    merienda: params.merienda || false,
    combustible_foto_url: params.combustible_foto_url ?? null,
    varios_foto_url: params.varios_foto_url ?? null,
    varios_texto: params.varios_texto ?? null,
  };

  if (existing) {
    const { error } = await supabase
      .from("egresos_viaje")
      .update(payload)
      .eq("id", existing.id);
    return { error };
  } else {
    const { error } = await supabase
      .from("egresos_viaje")
      .insert(payload);
    return { error };
  }
}

export async function uploadRecibo(file: File, folder: string): Promise<string | null> {
  const fileName = `${folder}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage
    .from("recibos")
    .upload(fileName, file);
  if (error) return null;
  const { data } = supabase.storage.from("recibos").getPublicUrl(fileName);
  return data.publicUrl;
}

// Fetch all viajes with ingresos and egresos for a given empresa (FINALIZADO)
// Now also fetches propietario name from vehiculos -> propietarios
export async function fetchViajesConDetalle(empresaId: string) {
  const { data, error } = await supabase
    .from("viajes")
    .select(`
      id, destino, origen, hora_salida, cantidad_pasajeros, estado, fecha_salida, fecha_llegada,
      asignacion_id, created_at,
      ingresos_viaje(pasajeros_monto, encomiendas_monto, total_ingreso),
      egresos_viaje(peaje, hotel, pago_conductor, combustible, varios, total_egreso, desayuno, almuerzo, merienda, combustible_foto_url, varios_foto_url, varios_texto),
      asignaciones(
        vehiculos(placa, marca, modelo, propietarios(nombres, apellidos)),
        conductores(nombres, apellidos)
      )
    `)
    .eq("empresa_id", empresaId)
    .in("estado", ["FINALIZADO", "EN_RUTA"] as any)
    .order("fecha_salida", { ascending: false });

  return {
    data: (data || []).map((v: any) => ({
      ...v,
      vehiculo: v.asignaciones?.vehiculos,
      conductor: v.asignaciones?.conductores,
      propietario_nombre: v.asignaciones?.vehiculos?.propietarios
        ? `${v.asignaciones.vehiculos.propietarios.nombres} ${v.asignaciones.vehiculos.propietarios.apellidos}`
        : "—",
      ingresos: v.ingresos_viaje,
      egresos: v.egresos_viaje,
    })),
    error,
  };
}

// Fetch viajes for propietario (by their vehicles)
export async function fetchViajesPropietario(userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("propietario_id, empresa_id")
    .eq("user_id", userId)
    .single();

  if (!profile?.propietario_id) return { data: [], error: null };

  const { data: vehiculos } = await supabase
    .from("vehiculos")
    .select("id")
    .eq("propietario_id", profile.propietario_id);

  if (!vehiculos || vehiculos.length === 0) return { data: [], error: null };

  const vehiculoIds = vehiculos.map((v: any) => v.id);

  const { data: asignaciones } = await supabase
    .from("asignaciones")
    .select("id, vehiculo_id, vehiculos(placa, marca, modelo), conductores(nombres, apellidos)")
    .in("vehiculo_id", vehiculoIds);

  if (!asignaciones || asignaciones.length === 0) return { data: [], error: null };

  const asignacionIds = asignaciones.map((a: any) => a.id);

  const { data: viajes, error } = await supabase
    .from("viajes")
    .select(`
      id, destino, origen, hora_salida, cantidad_pasajeros, estado, fecha_salida, fecha_llegada,
      asignacion_id, created_at,
      ingresos_viaje(pasajeros_monto, encomiendas_monto, total_ingreso),
      egresos_viaje(peaje, hotel, pago_conductor, combustible, varios, total_egreso, desayuno, almuerzo, merienda)
    `)
    .in("asignacion_id", asignacionIds)
    .in("estado", ["FINALIZADO", "EN_RUTA"] as any)
    .order("fecha_salida", { ascending: false });

  const asignacionMap = Object.fromEntries(
    asignaciones.map((a: any) => [a.id, { vehiculo: a.vehiculos, conductor: a.conductores }])
  );

  return {
    data: (viajes || []).map((v: any) => ({
      ...v,
      ...asignacionMap[v.asignacion_id],
      ingresos: v.ingresos_viaje,
      egresos: v.egresos_viaje,
    })),
    error,
  };
}

// Fetch assignment status for propietario's vehicles
export async function fetchPropietarioAsignaciones(userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("propietario_id, empresa_id")
    .eq("user_id", userId)
    .single();

  if (!profile?.propietario_id) return { data: [], error: null };

  const { data: vehiculos } = await supabase
    .from("vehiculos")
    .select("id, placa, marca, modelo")
    .eq("propietario_id", profile.propietario_id);

  if (!vehiculos || vehiculos.length === 0) return { data: [], error: null };

  const vehiculoIds = vehiculos.map((v: any) => v.id);

  const { data: asignaciones } = await supabase
    .from("asignaciones")
    .select("id, vehiculo_id, conductores(nombres, apellidos)")
    .in("vehiculo_id", vehiculoIds)
    .eq("estado", "ACTIVA");

  if (!asignaciones || asignaciones.length === 0) {
    return {
      data: vehiculos.map((v: any) => ({ ...v, estado_ruta: null, conductor: null, viaje: null })),
      error: null,
    };
  }

  const asignacionIds = asignaciones.map((a: any) => a.id);

  const { data: viajes } = await supabase
    .from("viajes")
    .select("id, asignacion_id, estado, origen, destino")
    .in("asignacion_id", asignacionIds)
    .in("estado", ["ASIGNADO", "EN_RUTA", "FINALIZADO"] as any)
    .order("created_at", { ascending: false });

  const asignacionMap = Object.fromEntries(
    asignaciones.map((a: any) => [a.vehiculo_id, a])
  );

  const viajeByVehiculo: Record<string, any> = {};
  for (const viaje of viajes || []) {
    const asig = asignaciones.find((a: any) => a.id === viaje.asignacion_id);
    if (asig && !viajeByVehiculo[asig.vehiculo_id]) {
      viajeByVehiculo[asig.vehiculo_id] = viaje;
    }
  }

  return {
    data: vehiculos.map((v: any) => {
      const asig = asignacionMap[v.id];
      const viaje = viajeByVehiculo[v.id];
      return {
        ...v,
        conductor: asig?.conductores || null,
        estado_ruta: viaje?.estado || null,
        viaje: viaje || null,
      };
    }),
    error: null,
  };
}

// Fetch conductor's viajes for egresos entry and route viewing
export async function fetchConductorViajes(userId: string, estadoFilter?: string[]) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("conductor_id, empresa_id")
    .eq("user_id", userId)
    .single();

  if (!profile?.conductor_id) return { data: [], empresaId: null, error: null };

  const { data: asignaciones } = await supabase
    .from("asignaciones")
    .select("id, vehiculos(placa, marca, modelo)")
    .eq("conductor_id", profile.conductor_id);

  if (!asignaciones || asignaciones.length === 0) return { data: [], empresaId: profile.empresa_id, error: null };

  const asignacionIds = asignaciones.map((a: any) => a.id);

  let query = supabase
    .from("viajes")
    .select(`
      id, destino, origen, hora_salida, cantidad_pasajeros, estado, fecha_salida, fecha_llegada,
      asignacion_id, created_at,
      ingresos_viaje(pasajeros_monto, encomiendas_monto, total_ingreso),
      egresos_viaje(id, peaje, hotel, pago_conductor, combustible, varios, total_egreso, desayuno, almuerzo, merienda, combustible_foto_url, varios_foto_url, varios_texto)
    `)
    .in("asignacion_id", asignacionIds);

  if (estadoFilter) {
    query = query.in("estado", estadoFilter as any);
  }

  const { data: viajes, error } = await query.order("created_at", { ascending: false });

  const asignacionMap = Object.fromEntries(
    asignaciones.map((a: any) => [a.id, a.vehiculos])
  );

  return {
    data: (viajes || []).map((v: any) => ({
      ...v,
      vehiculo: asignacionMap[v.asignacion_id],
      ingresos: v.ingresos_viaje,
      egresos: v.egresos_viaje,
    })),
    empresaId: profile.empresa_id,
    error,
  };
}
