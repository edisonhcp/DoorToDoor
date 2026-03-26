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

export async function fetchConsolidadoEmpresas(mes?: number, anio?: number) {
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, nombre, tipo_comision, comision_pct, comision_fija, frecuencia_comision, activo")
    .eq("activo", true)
    .order("nombre");

  if (!empresas || empresas.length === 0) return [];

  const results = await Promise.all(
    empresas.map(async (emp: any) => {
      const { count: totalVehiculos } = await supabase
        .from("vehiculos")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", emp.id);

      let viajesQuery = supabase
        .from("viajes")
        .select("id, asignacion_id, fecha_salida, ingresos_viaje(total_ingreso)")
        .eq("empresa_id", emp.id)
        .eq("estado", "FINALIZADO" as any);

      if (mes !== undefined && anio !== undefined) {
        const startDate = new Date(anio, mes, 1).toISOString();
        const endDate = new Date(anio, mes + 1, 1).toISOString();
        viajesQuery = viajesQuery.gte("fecha_salida", startDate).lt("fecha_salida", endDate);
      }

      const { data: viajes } = await viajesQuery;

      const totalViajes = viajes?.length || 0;
      const totalIngresos = (viajes || []).reduce((s: number, v: any) => s + Number(v.ingresos_viaje?.total_ingreso || 0), 0);

      const vehicleMap: Record<string, number> = {};
      (viajes || []).forEach((v: any) => {
        const key = v.asignacion_id || v.id;
        if (!vehicleMap[key]) vehicleMap[key] = 0;
        vehicleMap[key] += Number(v.ingresos_viaje?.total_ingreso || 0);
      });

      let totalComision = 0;
      Object.values(vehicleMap).forEach((vehicleIngreso) => {
        if (emp.tipo_comision === "PORCENTAJE") {
          totalComision += vehicleIngreso * (emp.comision_pct || 0);
        } else if (emp.tipo_comision === "FIJO") {
          totalComision += emp.comision_fija || 0;
        } else if (emp.tipo_comision === "MIXTO") {
          totalComision += vehicleIngreso * (emp.comision_pct || 0) + (emp.comision_fija || 0);
        }
      });

      return {
        id: emp.id,
        nombre: emp.nombre,
        tipoComision: emp.tipo_comision,
        comisionPct: emp.comision_pct,
        comisionFija: emp.comision_fija,
        frecuenciaComision: emp.frecuencia_comision,
        totalVehiculos: totalVehiculos || 0,
        totalViajes,
        totalIngresos,
        totalComision,
      };
    })
  );

  return results;
}

export async function fetchEmpresaDetail(empresaId: string) {
  const [vRes, cRes, pRes, aRes] = await Promise.all([
    supabase.from("vehiculos").select("*, propietarios(nombres)").eq("empresa_id", empresaId),
    supabase.from("conductores").select("*").eq("empresa_id", empresaId),
    supabase.from("propietarios").select("*, vehiculos(placa, marca, modelo, anio, estado)").eq("empresa_id", empresaId),
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
