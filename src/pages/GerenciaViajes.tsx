import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Bus, ChevronDown, ChevronUp, LayoutList, Printer, User, CheckCircle, AlertTriangle, Truck, Check, Filter } from "lucide-react";
import { PrintHeader } from "@/components/PrintHeader";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { fetchViajesConDetalle } from "@/services/egresosService";
import { fetchEmpresaInfo } from "@/services/dashboardService";
import { ViajesTable } from "@/components/ViajesTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

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
    periods.push({ label: `${MONTH_NAMES[month]} ${year}`, key: `${year}-${month}-M1`, start, end });
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
        if (sMonth === eMonth) label += ` (${sDay}-${eDay} ${MONTH_NAMES[sMonth].substring(0, 3)})`;
        else label += ` (${sDay} ${MONTH_NAMES[sMonth].substring(0, 3)}-${eDay} ${MONTH_NAMES[eMonth].substring(0, 3)})`;
        periods.push({ label, key: `${year}-${month}-B${num}`, start: bStart, end: bEnd });
        num++;
      }
      current.setDate(current.getDate() + 14);
    }
  } else {
    let current = new Date(firstDay);
    const dow = current.getDay();
    if (dow === 0) current.setDate(current.getDate() - 6);
    else if (dow !== 1) current.setDate(current.getDate() - (dow - 1));

    let weekNum = 1;
    while (current <= lastDay) {
      const weekStart = new Date(current); weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(current); weekEnd.setDate(weekEnd.getDate() + 6); weekEnd.setHours(23, 59, 59, 999);
      if (weekEnd >= firstDay && weekStart <= lastDay) {
        const sDay = weekStart.getDate(), sMonth = weekStart.getMonth();
        const eDay = weekEnd.getDate(), eMonth = weekEnd.getMonth();
        let label = `Semana ${weekNum}`;
        if (sMonth === eMonth) label += ` (${sDay}-${eDay} ${MONTH_NAMES[sMonth].substring(0, 3)})`;
        else label += ` (${sDay} ${MONTH_NAMES[sMonth].substring(0, 3)}-${eDay} ${MONTH_NAMES[eMonth].substring(0, 3)})`;
        periods.push({ label, key: `${year}-${month}-S${weekNum}`, start: weekStart, end: weekEnd });
        weekNum++;
      }
      current.setDate(current.getDate() + 7);
    }
  }
  return periods;
}

function getNextSunday(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function calcAlim(eg: any, valorComida: number = 3): number {
  if (!eg) return 0;
  let c = 0;
  if (eg.desayuno) c++;
  if (eg.almuerzo) c++;
  if (eg.merienda) c++;
  return c * valorComida;
}

function ConsolidadoTable({ vehicleMap, vehicleKeys, empresaInfo }: { vehicleMap: Record<string, any>; vehicleKeys: string[]; empresaInfo: any }) {
  let latestSunday = "";
  vehicleKeys.forEach((key) => {
    vehicleMap[key].viajes.forEach((v: any) => {
      const sun = getNextSunday(v.fecha_salida);
      if (sun > latestSunday) latestSunday = sun;
    });
  });

  const tipoComision = empresaInfo?.tipo_comision || "PORCENTAJE";
  const comisionPct = empresaInfo?.comision_pct || 0.10;
  const comisionFija = empresaInfo?.comision_fija || 0;

  const rows = vehicleKeys.map((key, idx) => {
    const veh = vehicleMap[key];
    const finalizados = veh.viajes.filter((v: any) => v.estado === "FINALIZADO");
    const totalIngreso = finalizados.reduce((s: number, v: any) => s + Number(v.ingresos?.total_ingreso || 0), 0);
    const totalEgreso = finalizados.reduce((s: number, v: any) => {
      const eg = v.egresos;
      if (!eg) return s;
      const alim = calcAlim(eg, v.valor_comida);
      return s + Number(eg.peaje || 0) + Number(eg.hotel || 0) + Number(eg.combustible || 0) + Number(eg.varios || 0) + Number(eg.pago_conductor || 0) + alim;
    }, 0);
    const totalCompania = tipoComision === "PORCENTAJE"
      ? totalIngreso * comisionPct
      : comisionFija;

    return { idx: idx + 1, placa: veh.placa, propietario: veh.propietario, totalIngreso, totalEgreso, totalCompania };
  });

  const grandIngreso = rows.reduce((s, r) => s + r.totalIngreso, 0);
  const grandEgreso = rows.reduce((s, r) => s + r.totalEgreso, 0);
  const grandCompania = rows.reduce((s, r) => s + r.totalCompania, 0);

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Vehículo</TableHead>
            <TableHead>Propietario</TableHead>
            <TableHead className="text-center">Fecha de Corte</TableHead>
            <TableHead className="text-right">Total Ingreso</TableHead>
            <TableHead className="text-right">Total Egreso</TableHead>
            <TableHead className="text-right">Total Compañía</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.placa}>
              <TableCell>{r.idx}</TableCell>
              <TableCell className="font-medium">{r.placa}</TableCell>
              <TableCell>{r.propietario}</TableCell>
              <TableCell className="text-center">{latestSunday}</TableCell>
              <TableCell className="text-right">${r.totalIngreso.toFixed(2)}</TableCell>
              <TableCell className="text-right">${r.totalEgreso.toFixed(2)}</TableCell>
              <TableCell className="text-right">${r.totalCompania.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} className="font-bold">TOTAL GENERAL</TableCell>
            <TableCell className="text-right font-bold">${grandIngreso.toFixed(2)}</TableCell>
            <TableCell className="text-right font-bold">${grandEgreso.toFixed(2)}</TableCell>
            <TableCell className="text-right font-bold">${grandCompania.toFixed(2)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const FRECUENCIA_LABELS: Record<string, string> = {
  SEMANAL: "Semana",
  BISEMANAL: "Bisemana",
  QUINCENAL: "Quincena",
  MENSUAL: "Mes",
};

export default function GerenciaViajes() {
  const { role, empresaId } = useAuth();
  const [viajes, setViajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [printingVehicle, setPrintingVehicle] = useState<string | null>(null);
  const [empresaInfo, setEmpresaInfo] = useState<any>(null);
  const [finalizarAlert, setFinalizarAlert] = useState<{ placa: string; hasEnRuta: boolean } | null>(null);
  const [selectedVehiculos, setSelectedVehiculos] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>("__all__");

  useEffect(() => {
    const load = async () => {
      if (!empresaId) return;
      const { data } = await fetchViajesConDetalle(empresaId);
      setViajes(data);
      const info = await fetchEmpresaInfo(empresaId);
      setEmpresaInfo(info);
      const now = new Date();
      setSelectedMonths([`${now.getFullYear()}-${now.getMonth()}`]);
      setLoading(false);
    };
    load();
  }, [empresaId]);

  if (role !== "GERENCIA") return <Navigate to="/dashboard" replace />;

  const frecuencia = empresaInfo?.frecuencia_comision || "SEMANAL";
  const frecuenciaLabel = FRECUENCIA_LABELS[frecuencia] || "Período";

  // Available months from viajes
  const availableMonths = (() => {
    const months = new Set<string>();
    const now = new Date();
    months.add(`${now.getFullYear()}-${now.getMonth()}`);
    viajes.forEach(v => {
      const d = new Date(v.fecha_salida);
      months.add(`${d.getFullYear()}-${d.getMonth()}`);
    });
    return Array.from(months)
      .map(key => {
        const [year, month] = key.split("-").map(Number);
        return { year, month, key, label: `${MONTH_NAMES[month]} ${year}` };
      })
      .sort((a, b) => b.year - a.year || b.month - a.month);
  })();

  // Periods for selected months
  const availablePeriods = (() => {
    const periods: PeriodRange[] = [];
    for (const mk of selectedMonths) {
      const [year, month] = mk.split("-").map(Number);
      periods.push(...getPeriodsForMonth(year, month, frecuencia));
    }
    const seen = new Set<string>();
    return periods.filter(p => {
      if (seen.has(p.key)) return false;
      seen.add(p.key);
      return true;
    }).sort((a, b) => a.start.getTime() - b.start.getTime());
  })();

  // Filter viajes by period and months
  const filteredViajes = (() => {
    let result = viajes;
    if (selectedPeriodKey === "__all__") {
      if (selectedMonths.length > 0 && availablePeriods.length > 0) {
        result = result.filter(v => {
          const d = new Date(v.fecha_salida);
          return availablePeriods.some(r => d >= r.start && d <= r.end);
        });
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
    return result;
  })();

  // Group by vehicle
  const vehicleMap: Record<string, { placa: string; marca: string; modelo: string; propietario: string; viajes: any[] }> = {};
  filteredViajes.forEach((v) => {
    const placa = v.vehiculo?.placa || "sin-vehiculo";
    const key = placa;
    if (!vehicleMap[key]) {
      vehicleMap[key] = {
        placa: v.vehiculo?.placa || "—",
        marca: v.vehiculo?.marca || "",
        modelo: v.vehiculo?.modelo || "",
        propietario: v.propietario_nombre || "—",
        viajes: [],
      };
    }
    vehicleMap[key].viajes.push(v);
  });

  // All vehicle keys from unfiltered viajes (for the vehicle filter)
  const allVehicleKeysUnfiltered = (() => {
    const keys = new Set<string>();
    viajes.forEach(v => {
      const placa = v.vehiculo?.placa || "sin-vehiculo";
      keys.add(placa);
    });
    return Array.from(keys).sort();
  })();

  // All vehicle info for the filter
  const allVehicleInfo: Record<string, { placa: string; marca: string; modelo: string }> = {};
  viajes.forEach(v => {
    const placa = v.vehiculo?.placa || "sin-vehiculo";
    if (!allVehicleInfo[placa]) {
      allVehicleInfo[placa] = { placa: v.vehiculo?.placa || "—", marca: v.vehiculo?.marca || "", modelo: v.vehiculo?.modelo || "" };
    }
  });

  const allVehicleKeys = Object.keys(vehicleMap).sort();
  const filteredVehicleKeys = selectedVehiculos.length > 0
    ? allVehicleKeys.filter(k => selectedVehiculos.includes(k))
    : allVehicleKeys;

  const handleFinalizarPeriodo = (placa: string) => {
    toast.success(`Corte de ${frecuenciaLabel.toLowerCase()} realizado para vehículo ${placa}`);
  };

  const toggleMonth = (key: string) => {
    setSelectedMonths(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
    setSelectedPeriodKey("__all__");
  };

  const toggleVehiculo = (placa: string) => {
    setSelectedVehiculos(prev =>
      prev.includes(placa) ? prev.filter(k => k !== placa) : [...prev, placa]
    );
  };

  const selectedMonthsLabel = selectedMonths.length === 0
    ? "Seleccionar meses"
    : selectedMonths.length <= 2
      ? selectedMonths.map(k => { const [y, m] = k.split("-").map(Number); return `${MONTH_NAMES[m].substring(0, 3)} ${y}`; }).join(", ")
      : `${selectedMonths.length} meses`;

  const selectedVehiculosLabel = selectedVehiculos.length === 0
    ? "Todos los vehículos"
    : selectedVehiculos.length <= 2
      ? selectedVehiculos.join(", ")
      : `${selectedVehiculos.length} vehículos`;

  return (
    <DashboardLayout>
      <PrintHeader
        reportTitle="Consolidado Rutas"
        subtitle="Registro completo de rutas con ingresos y egresos"
      />
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="no-print flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Consolidado Rutas</h1>
            <p className="text-muted-foreground mt-1">Registro completo de rutas con ingresos y egresos</p>
          </div>
        </motion.div>

        {/* Filters card */}
        {!loading && (
          <motion.div variants={item} className="no-print">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Filtros</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Meses */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Meses</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-sm font-normal h-10">
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

                  {/* Período */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Período</label>
                    <Select value={selectedPeriodKey} onValueChange={setSelectedPeriodKey}>
                      <SelectTrigger className="h-10">
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

                  {/* Vehículos */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Vehículos</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-sm font-normal h-10">
                          {selectedVehiculosLabel}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2 max-h-64 overflow-y-auto" align="start">
                        <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer text-sm text-muted-foreground">
                          <Checkbox
                            checked={selectedVehiculos.length === 0}
                            onCheckedChange={() => setSelectedVehiculos([])}
                          />
                          Todos
                        </label>
                        {allVehicleKeysUnfiltered.map(placa => {
                          const info = allVehicleInfo[placa];
                          return (
                            <label key={placa} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer text-sm">
                              <Checkbox
                                checked={selectedVehiculos.includes(placa)}
                                onCheckedChange={() => toggleVehiculo(placa)}
                              />
                              <span className="font-medium">{info?.placa || placa}</span>
                              <span className="text-muted-foreground text-xs">{info?.marca} {info?.modelo}</span>
                            </label>
                          );
                        })}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {loading ? (
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
        ) : (
          <>
            {filteredVehicleKeys.map((key) => {
              const veh = vehicleMap[key];
              const isOpen = expanded === key;
              return (
                <motion.div key={key} variants={item} className={printingVehicle && printingVehicle !== key ? "print:hidden" : ""}>
                  <Card
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setExpanded(isOpen ? null : key)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-base">
                        <div className="flex items-center gap-2">
                          <Bus className="w-5 h-5 text-primary" />
                          <span>{veh.placa}</span>
                          <span className="text-muted-foreground font-normal text-sm">
                            {veh.marca} {veh.modelo}
                          </span>
                          <span className="text-muted-foreground text-xs flex items-center gap-1">
                            <User className="w-3 h-3" /> {veh.propietario}
                          </span>
                          <span className="text-muted-foreground text-xs">({veh.viajes.length} viajes)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOpen && (() => {
                            const hasEnRuta = veh.viajes.some((v: any) => v.estado === "EN_RUTA" || v.estado === "ASIGNADO");
                            return (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPrintingVehicle(key);
                                    setTimeout(() => {
                                      window.print();
                                      setPrintingVehicle(null);
                                    }, 100);
                                  }}
                                >
                                  <Printer className="w-4 h-4 mr-1" />
                                  Imprimir
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFinalizarAlert({ placa: veh.placa, hasEnRuta });
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Finalizar {frecuenciaLabel}
                                </Button>
                              </>
                            );
                          })()}
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    {isOpen && (
                      <CardContent onClick={(e) => e.stopPropagation()}>
                        <ViajesTable
                          viajes={veh.viajes}
                          showEgresos
                          showConductorColumn
                          comisionPct={empresaInfo?.comision_pct || 0.10}
                          comisionFija={empresaInfo?.comision_fija || 0}
                          tipoComision={empresaInfo?.tipo_comision || "PORCENTAJE"}
                          frecuenciaComision={empresaInfo?.frecuencia_comision || "SEMANAL"}
                        />
                      </CardContent>
                    )}
                  </Card>
                </motion.div>
              );
            })}

            {filteredViajes.length > 0 && (
              <motion.div variants={item} className={printingVehicle ? "print:hidden" : ""}>
                <Card className="border-primary/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <LayoutList className="w-5 h-5 text-primary" />
                        <span>Consolidado</span>
                        <span className="text-muted-foreground text-xs">({filteredVehicleKeys.length} vehículos)</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => window.print()}>
                        <Printer className="w-4 h-4 mr-1" />
                        Imprimir
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ConsolidadoTable vehicleMap={vehicleMap} vehicleKeys={filteredVehicleKeys} empresaInfo={empresaInfo} />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </motion.div>

      <AlertDialog open={!!finalizarAlert} onOpenChange={() => setFinalizarAlert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {finalizarAlert?.hasEnRuta && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
              Finalizar {frecuenciaLabel}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {finalizarAlert?.hasEnRuta
                ? "Tienes rutas pendientes por finalizar. Las rutas que no estén finalizadas se registrarán en el siguiente corte. Contáctate con tu conductor."
                : `¿Deseas finalizar el corte de ${frecuenciaLabel.toLowerCase()} para el vehículo ${finalizarAlert?.placa}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (finalizarAlert) handleFinalizarPeriodo(finalizarAlert.placa);
              setFinalizarAlert(null);
            }}>
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
