import { supabase } from "@/integrations/supabase/client";

export async function fetchVehiculos() {
  const [vehRes, asigRes] = await Promise.all([
    supabase.from("vehiculos").select("*, propietarios(nombres, email)").order("created_at", { ascending: false }),
    supabase.from("asignaciones").select("vehiculo_id, conductores(nombres)").eq("estado", "ACTIVA"),
  ]);
  const asignaciones = asigRes.data || [];
  return (vehRes.data || []).map((v: any) => {
    const asig = asignaciones.find((a: any) => a.vehiculo_id === v.id);
    return { ...v, conductor_nombre: asig?.conductores?.nombres || null };
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

export async function fetchPropietarioVehiculos(userId: string) {
  const { data: profileData } = await supabase
    .from("profiles")
    .select("propietario_id")
    .eq("user_id", userId)
    .single();

  if (!profileData?.propietario_id) return { propietarioId: null, vehiculos: [] };

  const { data } = await supabase
    .from("vehiculos")
    .select("*")
    .eq("propietario_id", profileData.propietario_id)
    .order("created_at", { ascending: false });

  return { propietarioId: profileData.propietario_id, vehiculos: data || [] };
}
