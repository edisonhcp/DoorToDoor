import { supabase } from "@/integrations/supabase/client";

export async function fetchVehiculos() {
  const [vehRes, asigRes, viajesRes] = await Promise.all([
    supabase.from("vehiculos").select("*, propietarios(nombres, email)").order("created_at", { ascending: false }),
    supabase.from("asignaciones").select("id, vehiculo_id, conductor_id, conductores(nombres)").eq("estado", "ACTIVA"),
    supabase.from("viajes").select("asignacion_id, estado").in("estado", ["ASIGNADO", "EN_RUTA"] as any),
  ]);
  const asignaciones = asigRes.data || [];
  const viajesActivos = new Set((viajesRes.data || []).map((v: any) => v.asignacion_id));
  return (vehRes.data || []).map((v: any) => {
    const asig = asignaciones.find((a: any) => a.vehiculo_id === v.id);
    const enRuta = asig ? viajesActivos.has(asig.id) : false;
    return { ...v, conductor_nombre: asig?.conductores?.nombres || null, conductor_id: asig?.conductor_id || null, en_ruta: enRuta };
  });
}

export async function toggleVehiculoEstado(vehiculo: any) {
  const newEstado = vehiculo.estado === "HABILITADO" ? "INHABILITADO" : "HABILITADO";
  if (newEstado === "INHABILITADO") {
    await supabase.from("asignaciones").update({ estado: "CERRADA", fecha_fin: new Date().toISOString() })
      .eq("vehiculo_id", vehiculo.id).eq("estado", "ACTIVA");
  }
  const { error } = await supabase.from("vehiculos").update({ estado: newEstado }).eq("id", vehiculo.id);
  return { error, newEstado };
}

export async function deleteVehiculo(vehiculo: any) {
  await supabase.from("asignaciones").update({ estado: "CERRADA", fecha_fin: new Date().toISOString() })
    .eq("vehiculo_id", vehiculo.id).eq("estado", "ACTIVA");
  const { error } = await supabase.from("vehiculos").delete().eq("id", vehiculo.id);
  return { error };
}

export async function createVehiculo(data: {
  placa: string; marca: string; modelo: string; color: string;
  anio: number | null; tipo: string; capacidad: number;
  gps: boolean; seguro: boolean; propietario_id: string; empresa_id: string;
}) {
  const { error } = await supabase.from("vehiculos").insert(data);
  return { error };
}

export async function fetchConductoresDisponibles() {
  // Get all enabled conductors
  const { data: conductores } = await supabase
    .from("conductores")
    .select("id, nombres, apellidos, identificacion")
    .eq("estado", "HABILITADO")
    .order("nombres");

  // Get conductors that already have an active assignment
  const { data: asignaciones } = await supabase
    .from("asignaciones")
    .select("conductor_id")
    .eq("estado", "ACTIVA");

  const asignados = new Set((asignaciones || []).map((a: any) => a.conductor_id));

  return (conductores || []).filter((c: any) => !asignados.has(c.id));
}

export async function fetchVehiculosDisponiblesParaConductor() {
  // Get all enabled vehicles
  const { data: vehiculos } = await supabase
    .from("vehiculos")
    .select("id, placa, marca, modelo")
    .eq("estado", "HABILITADO")
    .order("placa");

  // Get vehicles that already have an active assignment
  const { data: asignaciones } = await supabase
    .from("asignaciones")
    .select("vehiculo_id")
    .eq("estado", "ACTIVA");

  const asignados = new Set((asignaciones || []).map((a: any) => a.vehiculo_id));

  return (vehiculos || []).filter((v: any) => !asignados.has(v.id));
}

export async function assignConductorToVehiculo(vehiculoId: string, conductorId: string, empresaId: string) {
  // Close any existing active assignment for this vehicle
  await supabase.from("asignaciones")
    .update({ estado: "CERRADA", fecha_fin: new Date().toISOString() })
    .eq("vehiculo_id", vehiculoId).eq("estado", "ACTIVA");

  // Close any existing active assignment for this conductor
  await supabase.from("asignaciones")
    .update({ estado: "CERRADA", fecha_fin: new Date().toISOString() })
    .eq("conductor_id", conductorId).eq("estado", "ACTIVA");

  // Create new assignment
  const { error } = await supabase.from("asignaciones").insert({
    vehiculo_id: vehiculoId,
    conductor_id: conductorId,
    empresa_id: empresaId,
    estado: "ACTIVA",
  });

  return { error };
}

export async function fetchPropietarioVehiculos(userId: string) {
  const { data: profileData } = await supabase
    .from("profiles")
    .select("propietario_id")
    .eq("user_id", userId)
    .single();

  if (!profileData?.propietario_id) return { propietarioId: null, vehiculos: [] };

  const [vehRes, asigRes] = await Promise.all([
    supabase
      .from("vehiculos")
      .select("*")
      .eq("propietario_id", profileData.propietario_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("asignaciones")
      .select("vehiculo_id, conductores(id, nombres, apellidos, celular, email, identificacion, tipo_licencia, fecha_caducidad_licencia, fecha_nacimiento, foto_url, domicilio, nacionalidad)")
      .eq("estado", "ACTIVA"),
  ]);

  const asignaciones = asigRes.data || [];
  const vehiculos = (vehRes.data || []).map((v: any) => {
    const asig = asignaciones.find((a: any) => a.vehiculo_id === v.id);
    return {
      ...v,
      conductor: asig?.conductores || null,
    };
  });

  return { propietarioId: profileData.propietario_id, vehiculos };
}
