import { supabase } from "@/integrations/supabase/client";

export async function fetchEmpresas() {
  return supabase.from("empresas").select("*").order("created_at", { ascending: false });
}

export async function fetchGlobalStats() {
  const [empresasRes, conductoresRes, vehiculosRes, propietariosRes, viajesCerradosRes, viajesBorradorRes] = await Promise.all([
    supabase.from("empresas").select("*").order("created_at", { ascending: false }),
    supabase.from("conductores").select("id", { count: "exact", head: true }),
    supabase.from("vehiculos").select("id", { count: "exact", head: true }),
    supabase.from("propietarios").select("id", { count: "exact", head: true }),
    supabase.from("viajes").select("id", { count: "exact", head: true }).eq("estado", "CERRADO"),
    supabase.from("viajes").select("id", { count: "exact", head: true }).eq("estado", "BORRADOR"),
  ]);
  return {
    empresas: empresasRes.data || [],
    stats: {
      companias: empresasRes.data?.length || 0,
      conductores: conductoresRes.count || 0,
      vehiculos: vehiculosRes.count || 0,
      propietarios: propietariosRes.count || 0,
      viajesCerrados: viajesCerradosRes.count || 0,
      viajesCancelados: viajesBorradorRes.count || 0,
    },
  };
}

export async function updateEmpresa(id: string, data: any) {
  const { error } = await supabase.from("empresas").update(data).eq("id", id);
  return { error };
}

export async function deleteEmpresa(id: string) {
  const { error } = await supabase.from("empresas").delete().eq("id", id);
  return { error };
}

export async function toggleEmpresaSuspend(empresa: any) {
  const { error } = await supabase.from("empresas").update({ activo: !empresa.activo }).eq("id", empresa.id);
  return { error };
}

export async function fetchEmpresaDetail(empresaId: string) {
  const [vRes, cRes, pRes, aRes] = await Promise.all([
    supabase.from("vehiculos").select("*, propietarios(nombres)").eq("empresa_id", empresaId),
    supabase.from("conductores").select("*").eq("empresa_id", empresaId),
    supabase.from("propietarios").select("*, vehiculos(placa, marca, modelo, anio)").eq("empresa_id", empresaId),
    supabase.from("asignaciones").select("conductor_id, vehiculo_id, conductores(nombres), vehiculos(placa, marca, modelo, anio, propietarios(nombres))").eq("empresa_id", empresaId).eq("estado", "ACTIVA"),
  ]);
  const asignaciones = aRes.data || [];

  const vehiculos = (vRes.data || []).map((v: any) => {
    const asig = asignaciones.find((a: any) => a.vehiculo_id === v.id);
    return { ...v, conductor_nombre: asig?.conductores?.nombres || null };
  });

  const conductores = (cRes.data || []).map((c: any) => {
    const asig = asignaciones.find((a: any) => a.conductor_id === c.id);
    return {
      ...c,
      vehiculo_placa: asig?.vehiculos?.placa || null,
      vehiculo_marca: asig?.vehiculos?.marca || null,
      vehiculo_modelo: asig?.vehiculos?.modelo || null,
      vehiculo_anio: asig?.vehiculos?.anio || null,
      propietario_nombre: asig?.vehiculos?.propietarios?.nombres || null,
    };
  });

  return { vehiculos, conductores, propietarios: pRes.data || [] };
}
