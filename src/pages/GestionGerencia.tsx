import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, ChevronDown, ChevronRight, Printer, Truck } from "lucide-react";
import { PrintHeader } from "@/components/PrintHeader";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const FREQ_LABEL: Record<string, string> = {
  SEMANAL: "Semana",
  QUINCENAL: "Quincena",
  MENSUAL: "Mes",
};

interface ViajeRow {
  placa: string;
  marca: string;
  modelo: string;
  propietarioNombres: string;
  propietarioApellidos: string;
  propietarioIdentificacion: string;
  comisionCompania: number;
  fechaCorte: string;
}

interface PeriodGroup {
  label: string;
  fechaCorte: string;
  rows: ViajeRow[];
}

interface MonthGroup {
  year: number;
  month: number;
  label: string;
  periods: PeriodGroup[];
}

export default function GestionGerencia() {
  const { empresaId } = useAuth();
  const [months, setMonths] = useState<MonthGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);
  const [frecuencia, setFrecuencia] = useState<string>("SEMANAL");

  useEffect(() => {
    if (!empresaId) return;
    loadData();
  }, [empresaId]);

  const loadData = async () => {
    setLoading(true);

    // Get empresa config
    const { data: empresa } = await supabase
      .from("empresas")
      .select("frecuencia_comision, tipo_comision, comision_pct, comision_fija")
      .eq("id", empresaId!)
      .single();

    if (!empresa) { setLoading(false); return; }
    setFrecuencia(empresa.frecuencia_comision);

    // Get all finalized viajes with full details
    const { data: viajes } = await supabase
      .from("viajes")
      .select(`
        id, fecha_salida, estado,
        ingresos_viaje(total_ingreso, pasajeros_monto, encomiendas_monto),
        asignaciones(
          vehiculos(placa, marca, modelo, propietario_id,
            propietarios(nombres, apellidos, identificacion)
          )
        )
      `)
      .eq("empresa_id", empresaId!)
      .in("estado", ["FINALIZADO", "EN_RUTA"] as any)
      .order("fecha_salida", { ascending: false });

    if (!viajes || viajes.length === 0) { setMonths([]); setLoading(false); return; }

    // Group by month then by period
    const monthMap = new Map<string, { year: number; month: number; viajes: any[] }>();

    for (const v of viajes) {
      const date = new Date(v.fecha_salida);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, { year: date.getFullYear(), month: date.getMonth(), viajes: [] });
      }
      monthMap.get(key)!.viajes.push(v);
    }

    const result: MonthGroup[] = [];

    for (const [, mg] of monthMap) {
      const periodMap = new Map<string, any[]>();

      for (const v of mg.viajes) {
        const date = new Date(v.fecha_salida);
        let periodKey: string;
        let periodLabel: string;
        let fechaCorte: string;

        if (empresa.frecuencia_comision === "SEMANAL") {
          // Week number based on Sunday cutoff
          const dayOfMonth = date.getDate();
          const weekNum = Math.ceil(dayOfMonth / 7);
          periodKey = `S${weekNum}`;
          const endDay = Math.min(weekNum * 7, new Date(mg.year, mg.month + 1, 0).getDate());
          fechaCorte = `${mg.year}-${String(mg.month + 1).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
          periodLabel = `Semana ${weekNum}`;
        } else if (empresa.frecuencia_comision === "QUINCENAL") {
          const half = date.getDate() <= 15 ? 1 : 2;
          periodKey = `Q${half}`;
          const endDay = half === 1 ? 15 : new Date(mg.year, mg.month + 1, 0).getDate();
          fechaCorte = `${mg.year}-${String(mg.month + 1).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
          periodLabel = `Quincena ${half}`;
        } else {
          periodKey = "M1";
          const endDay = new Date(mg.year, mg.month + 1, 0).getDate();
          fechaCorte = `${mg.year}-${String(mg.month + 1).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
          periodLabel = `Mes`;
        }

        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, []);
        }
        periodMap.get(periodKey)!.push({ ...v, _periodLabel: periodLabel, _fechaCorte: fechaCorte });
      }

      // Build periods and aggregate by vehicle within each period
      const periods: PeriodGroup[] = [];
      for (const [, pViajes] of periodMap) {
        const vehicleMap = new Map<string, { rows: ViajeRow; totalIngreso: number }>();

        for (const v of pViajes) {
          const veh = v.asignaciones?.vehiculos;
          const prop = veh?.propietarios;
          const placa = veh?.placa || "—";
          const ingreso = v.ingresos_viaje?.total_ingreso || v.ingresos_viaje?.pasajeros_monto + v.ingresos_viaje?.encomiendas_monto || 0;

          if (!vehicleMap.has(placa)) {
            vehicleMap.set(placa, {
              rows: {
                placa,
                marca: veh?.marca || "—",
                modelo: veh?.modelo || "—",
                propietarioNombres: prop?.nombres || "—",
                propietarioApellidos: prop?.apellidos || "",
                propietarioIdentificacion: prop?.identificacion || "—",
                comisionCompania: 0,
                fechaCorte: v._fechaCorte,
              },
              totalIngreso: 0,
            });
          }
          vehicleMap.get(placa)!.totalIngreso += Number(ingreso);
        }

        // Calculate commission per vehicle
        for (const [, entry] of vehicleMap) {
          let comision = 0;
          if (empresa.tipo_comision === "PORCENTAJE") {
            comision = entry.totalIngreso * empresa.comision_pct;
          } else if (empresa.tipo_comision === "FIJO") {
            comision = empresa.comision_fija;
          } else {
            comision = entry.totalIngreso * empresa.comision_pct + empresa.comision_fija;
          }
          entry.rows.comisionCompania = comision;
        }

        periods.push({
          label: pViajes[0]._periodLabel,
          fechaCorte: pViajes[0]._fechaCorte,
          rows: Array.from(vehicleMap.values()).map(e => e.rows),
        });
      }

      // Sort periods
      periods.sort((a, b) => a.fechaCorte.localeCompare(b.fechaCorte));

      result.push({
        year: mg.year,
        month: mg.month,
        label: `${MESES[mg.month]} ${mg.year}`,
        periods,
      });
    }

    // Sort months descending
    result.sort((a, b) => b.year - a.year || b.month - a.month);
    setMonths(result);
    setLoading(false);
  };

  const toggleMonth = (key: string) => {
    setExpandedMonth(prev => prev === key ? null : key);
    setExpandedPeriod(null);
  };

  const togglePeriod = (key: string) => {
    setExpandedPeriod(prev => prev === key ? null : key);
  };

  return (
    <DashboardLayout>
      <PrintHeader
        reportTitle="Gestión"
        subtitle={`Consolidado financiero por ${FREQ_LABEL[frecuencia]?.toLowerCase() || "periodo"}`}
      />
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex items-center justify-between">
          <div className="no-print">
            <h1 className="text-3xl font-display font-bold text-foreground">Gestión</h1>
            <p className="text-muted-foreground mt-1">
              Consolidado financiero por {FREQ_LABEL[frecuencia]?.toLowerCase() || "periodo"}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.print()} className="no-print">
            <Printer className="w-4 h-4 mr-1" />
            Imprimir
          </Button>
        </motion.div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : months.length === 0 ? (
          <motion.div variants={item}>
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No hay datos de viajes registrados.
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          months.map((mg) => {
            const monthKey = `${mg.year}-${mg.month}`;
            const isMonthOpen = expandedMonth === monthKey;

            return (
              <motion.div key={monthKey} variants={item}>
                <Card
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => toggleMonth(monthKey)}
                >
                  <CardHeader className="py-4">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        <span className="font-semibold">{mg.label}</span>
                        <Badge variant="outline" className="ml-2">
                          {mg.periods.length} {mg.periods.length === 1
                            ? FREQ_LABEL[frecuencia]?.toLowerCase()
                            : frecuencia === "SEMANAL" ? "semanas"
                              : frecuencia === "QUINCENAL" ? "quincenas" : "meses"}
                        </Badge>
                      </div>
                      {isMonthOpen
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </CardTitle>
                  </CardHeader>
                </Card>

                {isMonthOpen && (
                  <div className="mt-2 ml-4 space-y-2">
                    {mg.periods.map((period, pIdx) => {
                      const periodKey = `${monthKey}-${pIdx}`;
                      const isPeriodOpen = expandedPeriod === periodKey;
                      const totalGanancia = period.rows.reduce((s, r) => s + r.comisionCompania, 0);

                      return (
                        <div key={periodKey}>
                          <Card
                            className="cursor-pointer hover:shadow-sm transition-shadow border-l-4 border-l-primary/30"
                            onClick={(e) => { e.stopPropagation(); togglePeriod(periodKey); }}
                          >
                            <CardHeader className="py-3">
                              <CardTitle className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <Truck className="w-4 h-4 text-primary" />
                                  <span>{period.label}</span>
                                  <span className="text-muted-foreground text-xs">
                                    — Corte: {period.fechaCorte}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-semibold text-primary">
                                    Total: ${totalGanancia.toFixed(2)}
                                  </span>
                                  {isPeriodOpen
                                    ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                    : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                </div>
                              </CardTitle>
                            </CardHeader>
                          </Card>

                          {isPeriodOpen && (
                            <Card className="mt-1 ml-4">
                              <CardContent className="pt-4" onClick={(e) => e.stopPropagation()}>
                                <div className="overflow-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>Fecha Corte</TableHead>
                                        <TableHead>Apellidos y Nombre</TableHead>
                                        <TableHead>Cédula</TableHead>
                                        <TableHead>Marca</TableHead>
                                        <TableHead>Modelo</TableHead>
                                        <TableHead>Placa</TableHead>
                                        <TableHead className="text-right">Ganancia Compañía</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {period.rows.map((row, rIdx) => (
                                        <TableRow key={rIdx}>
                                          <TableCell>{rIdx + 1}</TableCell>
                                          <TableCell className="text-xs">{row.fechaCorte}</TableCell>
                                          <TableCell className="font-medium">
                                            {row.propietarioApellidos} {row.propietarioNombres}
                                          </TableCell>
                                          <TableCell>{row.propietarioIdentificacion}</TableCell>
                                          <TableCell>{row.marca}</TableCell>
                                          <TableCell>{row.modelo}</TableCell>
                                          <TableCell>
                                            <Badge variant="outline">{row.placa}</Badge>
                                          </TableCell>
                                          <TableCell className="text-right font-semibold">
                                            ${row.comisionCompania.toFixed(2)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                    <TableFooter>
                                      <TableRow>
                                        <TableCell colSpan={7} className="font-bold">TOTAL</TableCell>
                                        <TableCell className="text-right font-bold">
                                          ${totalGanancia.toFixed(2)}
                                        </TableCell>
                                      </TableRow>
                                    </TableFooter>
                                  </Table>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </motion.div>
    </DashboardLayout>
  );
}
