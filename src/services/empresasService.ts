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
  const { data, error } = await supabase.functions.invoke("delete-empresa", {
    body: { empresa_id: id },
  });
  if (error) return { error };
  if (data?.error) return { error: new Error(data.error) };
  return { error: null };
}

export async function toggleEmpresaSuspend(empresa: any) {
  const { error } = await supabase.from("empresas").update({ activo: !empresa.activo }).eq("id", empresa.id);
  return { error };
}

function getPeriodsForMonth(year: number, month: number, frecuencia: string): { start: Date; end: Date }[] {
  const periods: { start: Date; end: Date }[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  if (frecuencia === "MENSUAL") {
    periods.push({ start: new Date(year, month, 1), end: new Date(year, month + 1, 0, 23, 59, 59, 999) });
  } else if (frecuencia === "QUINCENAL") {
    periods.push({ start: new Date(year, month, 1), end: new Date(year, month, 15, 23, 59, 59, 999) });
    periods.push({ start: new Date(year, month, 16), end: new Date(year, month + 1, 0, 23, 59, 59, 999) });
  } else if (frecuencia === "BISEMANAL") {
    let current = new Date(firstDay);
    const dow = current.getDay();
    if (dow === 0) current.setDate(current.getDate() - 6);
    else if (dow !== 1) current.setDate(current.getDate() - (dow - 1));
    const refMonday = new Date(2024, 0, 1);
    const weeksSinceRef = Math.floor((current.getTime() - refMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (weeksSinceRef % 2 !== 0) current.setDate(current.getDate() - 7);
    while (current <= lastDay) {
      const bStart = new Date(current); bStart.setHours(0, 0, 0, 0);
      const bEnd = new Date(current); bEnd.setDate(bEnd.getDate() + 13); bEnd.setHours(23, 59, 59, 999);
      if (bEnd >= firstDay && bStart <= lastDay) periods.push({ start: bStart, end: bEnd });
      current.setDate(current.getDate() + 14);
    }
  } else {
    // SEMANAL
    let current = new Date(firstDay);
    const dow = current.getDay();
    if (dow === 0) current.setDate(current.getDate() - 6);
    else if (dow !== 1) current.setDate(current.getDate() - (dow - 1));
    while (current <= lastDay) {
      const wStart = new Date(current); wStart.setHours(0, 0, 0, 0);
      const wEnd = new Date(current); wEnd.setDate(wEnd.getDate() + 6); wEnd.setHours(23, 59, 59, 999);
      if (wEnd >= firstDay && wStart <= lastDay) periods.push({ start: wStart, end: wEnd });
      current.setDate(current.getDate() + 7);
    }
  }
  return periods;
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
        .select("id, asignacion_id, fecha_salida, ingresos_viaje(total_ingreso), asignaciones(vehiculo_id)")
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

      let totalComision = 0;

      if (mes !== undefined && anio !== undefined) {
        const periods = getPeriodsForMonth(anio, mes, emp.frecuencia_comision);

        for (const period of periods) {
          const vehiclePeriodIncome: Record<string, number> = {};
          (viajes || []).forEach((v: any) => {
            const vDate = new Date(v.fecha_salida);
            if (vDate >= period.start && vDate <= period.end) {
              const vehiculoId = v.asignaciones?.vehiculo_id || v.asignacion_id || v.id;
              if (!vehiclePeriodIncome[vehiculoId]) vehiclePeriodIncome[vehiculoId] = 0;
              vehiclePeriodIncome[vehiculoId] += Number(v.ingresos_viaje?.total_ingreso || 0);
            }
          });

          Object.values(vehiclePeriodIncome).forEach((vehicleIngreso) => {
            if (emp.tipo_comision === "PORCENTAJE") {
              totalComision += vehicleIngreso * (emp.comision_pct || 0);
            } else if (emp.tipo_comision === "FIJO") {
              totalComision += emp.comision_fija || 0;
            } else if (emp.tipo_comision === "MIXTO") {
              totalComision += vehicleIngreso * (emp.comision_pct || 0) + (emp.comision_fija || 0);
            }
          });
        }
      }

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
  const [vRes, cRes, pRes, asigRes] = await Promise.all([
    supabase.from("vehiculos").select("*").eq("empresa_id", empresaId),
    supabase.from("conductores").select("*").eq("empresa_id", empresaId),
    supabase.from("propietarios").select("*").eq("empresa_id", empresaId),
    supabase.from("asignaciones").select("conductor_id, vehiculo_id").eq("empresa_id", empresaId).eq("estado", "ACTIVA"),
  ]);

  const allVehiculos = vRes.data || [];
  const allPropietarios = pRes.data || [];
  const asignaciones = asigRes.data || [];

  const propsById: Record<string, any> = {};
  allPropietarios.forEach((p: any) => { propsById[p.id] = p; });

  const vehById: Record<string, any> = {};
  allVehiculos.forEach((v: any) => { vehById[v.id] = v; });

  const vehiculos = allVehiculos.map((v: any) => {
    const asig = asignaciones.find((a: any) => a.vehiculo_id === v.id);
    const conductor = asig ? (cRes.data || []).find((c: any) => c.id === asig.conductor_id) : null;
    return {
      ...v,
      propietarios: propsById[v.propietario_id] ? { nombres: propsById[v.propietario_id].nombres } : null,
      conductor_nombre: conductor?.nombres || null,
    };
  });

  const conductores = (cRes.data || []).map((c: any) => {
    const asig = asignaciones.find((a: any) => a.conductor_id === c.id);
    const veh = asig ? vehById[asig.vehiculo_id] : null;
    return {
      ...c,
      vehiculo_placa: veh?.placa || null,
      vehiculo_marca: veh?.marca || null,
      vehiculo_modelo: veh?.modelo || null,
      vehiculo_anio: veh?.anio || null,
      propietario_nombre: veh && propsById[veh.propietario_id] ? propsById[veh.propietario_id].nombres : null,
    };
  });

  const propietarios = allPropietarios.map((p: any) => ({
    ...p,
    vehiculos: allVehiculos.filter((v: any) => v.propietario_id === p.id).map((v: any) => ({
      placa: v.placa, marca: v.marca, modelo: v.modelo, anio: v.anio, estado: v.estado,
    })),
  }));

  return { vehiculos, conductores, propietarios };
}
