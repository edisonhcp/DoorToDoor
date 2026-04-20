import { supabase } from "@/integrations/supabase/client";

export async function fetchConductores() {
  const [condRes, asigRes, viajesRes] = await Promise.all([
    supabase.from("conductores").select("*").order("created_at", { ascending: false }),
    supabase.from("asignaciones").select("id, conductor_id, vehiculo_id, vehiculos!fk_asignaciones_vehiculo(id, placa, marca, modelo, estado)").eq("estado", "ACTIVA"),
    supabase.from("viajes").select("asignacion_id, estado").in("estado", ["ASIGNADO", "EN_RUTA"] as any),
  ]);
  const asignaciones = asigRes.data || [];
  const viajesActivos = new Set((viajesRes.data || []).map((v: any) => v.asignacion_id));
  return (condRes.data || []).map((c: any) => {
    const asig = asignaciones.find((a: any) => a.conductor_id === c.id);
    const enRuta = asig ? viajesActivos.has(asig.id) : false;
    return { ...c, vehiculo: asig?.vehiculos || null, en_ruta: enRuta };
  });
}

export async function toggleConductorEstado(conductor: any) {
  const newEstado = conductor.estado === "HABILITADO" ? "INHABILITADO" : "HABILITADO";
  if (newEstado === "INHABILITADO" && conductor.vehiculo) {
    await supabase.from("asignaciones").update({ estado: "CERRADA", fecha_fin: new Date().toISOString() })
      .eq("conductor_id", conductor.id).eq("estado", "ACTIVA");
  }
  const { error } = await supabase.from("conductores").update({ estado: newEstado }).eq("id", conductor.id);
  return { error, newEstado };
}

export async function deleteConductor(conductor: any) {
  const conductorId = conductor.id;
  const conductorEmail = conductor.email;

  const { data: asignacionesData, error: asignacionesError } = await supabase
    .from("asignaciones").select("id").eq("conductor_id", conductorId);

  if (asignacionesError) return { error: asignacionesError };

  const asignacionIds = (asignacionesData || []).map((a: any) => a.id);

  if (asignacionIds.length > 0) {
    const { error: viajesError } = await supabase
      .from("viajes").update({ asignacion_id: null }).in("asignacion_id", asignacionIds);
    if (viajesError) return { error: viajesError };

    const { error: asignacionesDeleteError } = await supabase
      .from("asignaciones").delete().in("id", asignacionIds);
    if (asignacionesDeleteError) return { error: asignacionesDeleteError };
  }

  const { error } = await supabase.from("conductores").delete().eq("id", conductorId);
  if (error) return { error };

  if (conductorEmail) {
    await supabase.functions.invoke("delete-auth-user", { body: { email: conductorEmail } });
  }

  return { error: null };
}

export async function unassignConductor(conductor: any) {
  const { error } = await supabase.from("asignaciones")
    .update({ estado: "CERRADA", fecha_fin: new Date().toISOString() })
    .eq("conductor_id", conductor.id).eq("estado", "ACTIVA");
  return { error };
}

export async function fetchConductorData(userId: string) {
  const { data: profileData } = await supabase
    .from("profiles").select("conductor_id").eq("user_id", userId).single();

  if (!profileData?.conductor_id) return null;

  const [condRes, asigRes] = await Promise.all([
    supabase.from("conductores").select("*").eq("id", profileData.conductor_id).single(),
    supabase.from("asignaciones")
      .select("*, vehiculos(placa, marca, modelo, anio, color, tipo, estado, foto_url, propietarios(nombres, apellidos, email, celular))")
      .eq("conductor_id", profileData.conductor_id)
      .eq("estado", "ACTIVA")
      .single(),
  ]);

  return {
    conductor: condRes.data,
    vehiculo: asigRes.data?.vehiculos || null,
  };
}

export async function deleteConductorAccount(userId: string) {
  const { data: prof } = await supabase.from("profiles").select("conductor_id").eq("user_id", userId).single();
  if (prof?.conductor_id) {
    await supabase.from("asignaciones").update({ estado: "CERRADA", fecha_fin: new Date().toISOString() })
      .eq("conductor_id", prof.conductor_id).eq("estado", "ACTIVA");
    await supabase.from("profiles").update({ conductor_id: null }).eq("user_id", userId);
    await supabase.from("conductores").delete().eq("id", prof.conductor_id);
  }
  await supabase.auth.signOut();
}
