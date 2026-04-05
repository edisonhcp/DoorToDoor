import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Printer, Filter } from "lucide-react";
import { PrintHeader } from "@/components/PrintHeader";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const FREQ_LABEL: Record<string, string> = {
  SEMANAL: "Semana",
  BISEMANAL: "Bisemana",
  QUINCENAL: "Quincena",
  MENSUAL: "Mes",
};

interface PeriodRange {
  label: string;
  key: string;
  start: Date;
  end: Date;
}

function getPeriodsForMonth(year: number, month: number, frecuencia: string): PeriodRange[] {
  const periods: PeriodRange[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  if (frecuencia === "MENSUAL") {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    periods.push({ label: `${MESES[month]} ${year}`, key: `${year}-${month}-M1`, start, end });
  } else if (frecuencia === "QUINCENAL") {
    const mid = new Date(year, month, 15, 23, 59, 59, 999);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
    periods.push({ label: `Quincena 1 (1-15)`, key: `${year}-${month}-Q1`, start: new Date(year, month, 1), end: mid });
    periods.push({ label: `Quincena 2 (16-${endOfMonth.getDate()})`, key: `${year}-${month}-Q2`, start: new Date(year, month, 16), end: endOfMonth });
  } else if (frecuencia === "BISEMANAL") {
    let current = new Date(firstDay);
    const dow = current.getDay();
    if (dow === 0) current.setDate(current.getDate() - 6);
    else if (dow !== 1) current.setDate(current.getDate() - (dow - 1));

    const refMonday = new Date(2024, 0, 1);
    const weeksSinceRef = Math.floor((current.getTime() - refMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (weeksSinceRef % 2 !== 0) current.setDate(current.getDate() - 7);

    let num = 1;
    while (current <= lastDay) {
      const bStart = new Date(current); bStart.setHours(0, 0, 0, 0);
      const bEnd = new Date(current); bEnd.setDate(bEnd.getDate() + 13); bEnd.setHours(23, 59, 59, 999);

      if (bEnd >= firstDay && bStart <= lastDay) {
        const sDay = bStart.getDate(), sMonth = bStart.getMonth();
        const eDay = bEnd.getDate(), eMonth = bEnd.getMonth();
        let label = `Bisemana ${num}`;
        if (sMonth === eMonth) label += ` (${sDay}-${eDay} ${MESES[sMonth].substring(0, 3)})`;
        else label += ` (${sDay} ${MESES[sMonth].substring(0, 3)}-${eDay} ${MESES[eMonth].substring(0, 3)})`;
        periods.push({ label, key: `${year}-${month}-B${num}`, start: bStart, end: bEnd });
        num++;
      }
      current.setDate(current.getDate() + 14);
    }
  } else {
    // SEMANAL
    let current = new Date(firstDay);
    const dow = current.getDay();
    if (dow === 0) current.setDate(current.getDate() - 6);
    else if (dow !== 1) current.setDate(current.getDate() - (dow - 1));

    let num = 1;
    while (current <= lastDay) {
      const wStart = new Date(current); wStart.setHours(0, 0, 0, 0);
      const wEnd = new Date(current); wEnd.setDate(wEnd.getDate() + 6); wEnd.setHours(23, 59, 59, 999);

      if (wEnd >= firstDay && wStart <= lastDay) {
        const sDay = wStart.getDate(), sMonth = wStart.getMonth();
        const eDay = wEnd.getDate(), eMonth = wEnd.getMonth();
        let label = `Semana ${num}`;
        if (sMonth === eMonth) label += ` (${sDay}-${eDay} ${MESES[sMonth].substring(0, 3)})`;
        else label += ` (${sDay} ${MESES[sMonth].substring(0, 3)}-${eDay} ${MESES[eMonth].substring(0, 3)})`;
        periods.push({ label, key: `${year}-${month}-S${num}`, start: wStart, end: wEnd });
        num++;
      }
      current.setDate(current.getDate() + 7);
    }
  }

  return periods;
}

interface ViajeData {
  id: string;
  fecha_salida: string;
  placa: string;
  marca: string;
  modelo: string;
  propietarioNombres: string;
  propietarioApellidos: string;
  propietarioIdentificacion: string;
  totalIngreso: number;
  vehiculoId: string;
}

export default function GestionGerencia() {
  const { empresaId } = useAuth();
  const [allViajes, setAllViajes] = useState<ViajeData[]>([]);
  const [vehiculos, setVehiculos] = useState<{ id: string; placa: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [frecuencia, setFrecuencia] = useState<string>("SEMANAL");
  const [empresaConfig, setEmpresaConfig] = useState<any>(null);

  // Filters
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>("__all__");
  const [selectedVehiculos, setSelectedVehiculos] = useState<string[]>([]);

  useEffect(() => {
    if (!empresaId) return;
    loadData();
  }, [empresaId]);

  const loadData = async () => {
    setLoading(true);

    const { data: empresa } = await supabase
      .from("empresas")
      .select("frecuencia_comision, tipo_comision, comision_pct, comision_fija")
      .eq("id", empresaId!)
      .single();

    if (!empresa) { setLoading(false); return; }
    setFrecuencia(empresa.frecuencia_comision);
    setEmpresaConfig(empresa);

    const { data: viajes } = await supabase
      .from("viajes")
      .select(`
        id, fecha_salida, estado,
        ingresos_viaje(total_ingreso, pasajeros_monto, encomiendas_monto),
        asignaciones(
          vehiculos(id, placa, marca, modelo, propietario_id,
            propietarios(nombres, apellidos, identificacion)
          )
        )
      `)
      .eq("empresa_id", empresaId!)
      .in("estado", ["FINALIZADO", "EN_RUTA"] as any)
      .order("fecha_salida", { ascending: false });

    if (!viajes || viajes.length === 0) {
      setAllViajes([]);
      setVehiculos([]);
      setLoading(false);
      return;
    }

    const vehSet = new Map<string, string>();
    const parsed: ViajeData[] = viajes.map(v => {
      const veh = (v as any).asignaciones?.vehiculos;
      const prop = veh?.propietarios;
      const ingreso = (v as any).ingresos_viaje?.total_ingreso ||
        ((v as any).ingresos_viaje?.pasajeros_monto || 0) + ((v as any).ingresos_viaje?.encomiendas_monto || 0);
      const vehiculoId = veh?.id || "";
      const placa = veh?.placa || "—";
      if (vehiculoId) vehSet.set(vehiculoId, placa);
      return {
        id: v.id,
        fecha_salida: v.fecha_salida,
        placa,
        marca: veh?.marca || "—",
        modelo: veh?.modelo || "—",
        propietarioNombres: prop?.nombres || "—",
        propietarioApellidos: prop?.apellidos || "",
        propietarioIdentificacion: prop?.identificacion || "—",
        totalIngreso: Number(ingreso),
        vehiculoId,
      };
    });

    setAllViajes(parsed);
    setVehiculos(Array.from(vehSet.entries()).map(([id, placa]) => ({ id, placa })).sort((a, b) => a.placa.localeCompare(b.placa)));

    // Default: current month selected
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    setSelectedMonths([currentMonthKey]);
    setSelectedPeriodKey("__all__");
    setSelectedVehiculos([]);
    setLoading(false);
  };

  // Available months from viajes
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    const now = new Date();
    months.add(`${now.getFullYear()}-${now.getMonth()}`);
    allViajes.forEach(v => {
      const d = new Date(v.fecha_salida);
      months.add(`${d.getFullYear()}-${d.getMonth()}`);
    });
    return Array.from(months)
      .map(key => {
        const [year, month] = key.split("-").map(Number);
        return { year, month, key, label: `${MESES[month]} ${year}` };
      })
      .sort((a, b) => b.year - a.year || b.month - a.month);
  }, [allViajes]);

  // Periods for selected months
  const availablePeriods = useMemo(() => {
    const periods: PeriodRange[] = [];
    for (const mk of selectedMonths) {
      const [year, month] = mk.split("-").map(Number);
      periods.push(...getPeriodsForMonth(year, month, frecuencia));
    }
    // Deduplicate by key
    const seen = new Set<string>();
    return periods.filter(p => {
      if (seen.has(p.key)) return false;
      seen.add(p.key);
      return true;
    }).sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [selectedMonths, frecuencia]);

  // Filtered viajes
  const filteredViajes = useMemo(() => {
    let result = allViajes;

    // Filter by selected months (if period is __all__, filter by month ranges)
    if (selectedPeriodKey === "__all__") {
      if (selectedMonths.length > 0) {
        // Use all periods from selected months to get the full range
        const ranges = availablePeriods;
        if (ranges.length > 0) {
          result = result.filter(v => {
            const d = new Date(v.fecha_salida);
            return ranges.some(r => d >= r.start && d <= r.end);
          });
        }
      }
    } else {
      const period = availablePeriods.find(p => p.key === selectedPeriodKey);
      if (period) {
        result = result.filter(v => {
          const d = new Date(v.fecha_salida);
          return d >= period.start && d <= period.end;
        });
      }
    }

    // Filter by vehicles
    if (selectedVehiculos.length > 0) {
      result = result.filter(v => selectedVehiculos.includes(v.vehiculoId));
    }

    return result;
  }, [allViajes, selectedMonths, selectedPeriodKey, selectedVehiculos, availablePeriods]);

  // Aggregate by vehicle
  const tableRows = useMemo(() => {
    if (!empresaConfig) return [];

    // Determine which periods to evaluate
    const periodsToEval = selectedPeriodKey === "__all__"
      ? availablePeriods
      : availablePeriods.filter(p => p.key === selectedPeriodKey);

    // Build per-vehicle per-period income map
    const vehInfo = new Map<string, { placa: string; marca: string; modelo: string; propNombres: string; propApellidos: string; propId: string }>();
    const vehPeriodIncome = new Map<string, Map<string, number>>(); // vehicleKey -> periodKey -> income

    for (const v of filteredViajes) {
      if (!vehInfo.has(v.placa)) {
        vehInfo.set(v.placa, {
          placa: v.placa, marca: v.marca, modelo: v.modelo,
          propNombres: v.propietarioNombres, propApellidos: v.propietarioApellidos,
          propId: v.propietarioIdentificacion,
        });
      }
      if (!vehPeriodIncome.has(v.placa)) vehPeriodIncome.set(v.placa, new Map());
      const vDate = new Date(v.fecha_salida);
      for (const period of periodsToEval) {
        if (vDate >= period.start && vDate <= period.end) {
          const pm = vehPeriodIncome.get(v.placa)!;
          pm.set(period.key, (pm.get(period.key) || 0) + v.totalIngreso);
          break;
        }
      }
    }

    return Array.from(vehInfo.entries()).map(([placa, info]) => {
      const periodMap = vehPeriodIncome.get(placa) || new Map<string, number>();
      let totalIngreso = 0;
      let comision = 0;

      periodMap.forEach((periodIngreso) => {
        totalIngreso += periodIngreso;
        if (empresaConfig.tipo_comision === "PORCENTAJE") {
          comision += periodIngreso * empresaConfig.comision_pct;
        } else if (empresaConfig.tipo_comision === "FIJO") {
          comision += empresaConfig.comision_fija;
        } else {
          comision += periodIngreso * empresaConfig.comision_pct + empresaConfig.comision_fija;
        }
      });

      return { ...info, totalIngreso, comision };
    }).sort((a, b) => a.placa.localeCompare(b.placa));
  }, [filteredViajes, empresaConfig, availablePeriods, selectedPeriodKey]);

  const totalGanancia = tableRows.reduce((s, r) => s + r.comision, 0);

  const toggleMonth = (key: string) => {
    setSelectedMonths(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
    setSelectedPeriodKey("__all__");
  };

  const toggleVehiculo = (id: string) => {
    setSelectedVehiculos(prev =>
      prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
    );
  };

  const selectedMonthsLabel = selectedMonths.length === 0
    ? "Seleccionar meses"
    : selectedMonths.length <= 2
      ? selectedMonths.map(k => { const [y, m] = k.split("-").map(Number); return `${MESES[m].substring(0, 3)} ${y}`; }).join(", ")
      : `${selectedMonths.length} meses`;

  const selectedVehiculosLabel = selectedVehiculos.length === 0
    ? "Todos los vehículos"
    : selectedVehiculos.length <= 2
      ? selectedVehiculos.map(id => vehiculos.find(v => v.id === id)?.placa || id).join(", ")
      : `${selectedVehiculos.length} vehículos`;

  return (
    <DashboardLayout>
      <PrintHeader
        reportTitle="Gestión"
        subtitle={`Consolidado financiero por ${FREQ_LABEL[frecuencia]?.toLowerCase() || "periodo"}`}
      />
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex items-center justify-between gap-2">
          <div className="no-print min-w-0 flex-1">
            <h1 className="text-lg sm:text-3xl font-display font-bold text-foreground">Gestión</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Consolidado financiero por {FREQ_LABEL[frecuencia]?.toLowerCase() || "periodo"}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.print()} className="no-print h-8 px-2 sm:h-9 sm:px-3 text-xs sm:text-sm shrink-0">
            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
            Imprimir
          </Button>
        </motion.div>

        {/* Filters */}
        {!loading && (
          <motion.div variants={item} className="no-print">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Filtros</span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {/* Month multi-select */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Meses</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-xs sm:text-sm font-normal h-9 sm:h-10">
                          {selectedMonthsLabel}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2 max-h-64 overflow-y-auto" align="start">
                        {availableMonths.map(m => (
                          <label key={m.key} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer text-sm">
                            <Checkbox
                              checked={selectedMonths.includes(m.key)}
                              onCheckedChange={() => toggleMonth(m.key)}
                            />
                            {m.label}
                          </label>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Period select */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Período</label>
                    <Select value={selectedPeriodKey} onValueChange={setSelectedPeriodKey}>
                      <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder="Todos los períodos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos los períodos</SelectItem>
                        {availablePeriods.map(p => (
                          <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Vehicle multi-select */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Vehículos</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-xs sm:text-sm font-normal h-9 sm:h-10">
                          {selectedVehiculosLabel}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2 max-h-64 overflow-y-auto" align="start">
                        {vehiculos.map(v => (
                          <label key={v.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer text-sm">
                            <Checkbox
                              checked={selectedVehiculos.includes(v.id)}
                              onCheckedChange={() => toggleVehiculo(v.id)}
                            />
                            {v.placa}
                          </label>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Table */}
        <motion.div variants={item}>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : tableRows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No hay datos para los filtros seleccionados.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Apellidos y Nombre</TableHead>
                        <TableHead>Cédula</TableHead>
                        <TableHead>Marca</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead className="text-right">Ganancia Compañía</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableRows.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="font-medium">
                            {row.propApellidos} {row.propNombres}
                          </TableCell>
                          <TableCell>{row.propId}</TableCell>
                          <TableCell>{row.marca}</TableCell>
                          <TableCell>{row.modelo}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.placa}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ${row.comision.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={6} className="font-bold">TOTAL</TableCell>
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
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
