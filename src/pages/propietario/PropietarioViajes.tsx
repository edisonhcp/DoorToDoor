import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Filter, Printer } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PrintHeader } from "@/components/PrintHeader";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { fetchViajesPropietario } from "@/services/egresosService";
import { fetchEmpresaInfo } from "@/services/dashboardService";
import { ViajesTable } from "@/components/ViajesTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

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

export default function PropietarioViajes() {
  const { role, user, empresaId } = useAuth();
  const [allViajes, setAllViajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresaInfo, setEmpresaInfo] = useState<any>(null);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>("__all__");
  const [selectedVehiculos, setSelectedVehiculos] = useState<string[]>([]);

  const frecuencia = empresaInfo?.frecuencia_comision || "SEMANAL";

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data } = await fetchViajesPropietario(user.id);
      setAllViajes(data);
      if (empresaId) {
        const info = await fetchEmpresaInfo(empresaId);
        setEmpresaInfo(info);
      }
      setLoading(false);
    };
    load();
  }, [user, empresaId]);

  useEffect(() => {
    if (empresaInfo && selectedMonths.length === 0) {
      const now = new Date();
      setSelectedMonths([`${now.getFullYear()}-${now.getMonth()}`]);
    }
  }, [empresaInfo]);

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
        return { year, month, key, label: `${MONTH_NAMES[month]} ${year}` };
      })
      .sort((a, b) => b.year - a.year || b.month - a.month);
  }, [allViajes]);

  const availablePeriods = useMemo(() => {
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
  }, [selectedMonths, frecuencia]);

  // Get all vehicle placas from viajes
  const allVehicleKeys = useMemo(() => {
    const keys = new Set<string>();
    allViajes.forEach(v => {
      const placa = v.vehiculo?.placa;
      if (placa) keys.add(placa);
    });
    return Array.from(keys).sort();
  }, [allViajes]);

  const allVehicleInfo: Record<string, { placa: string; marca: string; modelo: string }> = {};
  allViajes.forEach(v => {
    const placa = v.vehiculo?.placa;
    if (placa && !allVehicleInfo[placa]) {
      allVehicleInfo[placa] = { placa, marca: v.vehiculo?.marca || "", modelo: v.vehiculo?.modelo || "" };
    }
  });

  const filteredViajes = useMemo(() => {
    let result = allViajes;

    // Filter by vehicle
    if (selectedVehiculos.length > 0) {
      result = result.filter(v => {
        const placa = v.vehiculo?.placa;
        return placa && selectedVehiculos.includes(placa);
      });
    }

    // Filter by period
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
  }, [allViajes, selectedMonths, selectedPeriodKey, availablePeriods, selectedVehiculos]);

  if (role !== "PROPIETARIO") return <Navigate to="/dashboard" replace />;

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

  const frecuenciaLabel: Record<string, string> = {
    SEMANAL: "Semanal",
    BISEMANAL: "Bisemanal",
    QUINCENAL: "Quincenal",
    MENSUAL: "Mensual",
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
      <PrintHeader reportTitle="Consolidado Rutas — Propietario" />
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="no-print flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Consolidado Rutas</h1>
            <p className="text-muted-foreground mt-1">
              Historial de ingresos y egresos — Corte {frecuenciaLabel[frecuencia] || frecuencia}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.print()} className="no-print">
            <Printer className="w-4 h-4 mr-1" />
            Imprimir
          </Button>
        </motion.div>

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
                      <PopoverContent className="w-64 p-2 max-h-64 overflow-y-auto" align="start">
                        {allVehicleKeys.map(placa => {
                          const info = allVehicleInfo[placa];
                          return (
                            <label key={placa} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer text-sm">
                              <Checkbox
                                checked={selectedVehiculos.includes(placa)}
                                onCheckedChange={() => toggleVehiculo(placa)}
                              />
                              {placa} <span className="text-muted-foreground text-xs">{info?.marca} {info?.modelo}</span>
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

        <motion.div variants={item}>
          {loading ? (
            <div className="h-48 rounded-xl bg-muted animate-pulse" />
          ) : (
            <ViajesTable
              viajes={filteredViajes}
              showEgresos
              showConductorColumn
              comisionPct={empresaInfo?.comision_pct || 0.10}
              comisionFija={empresaInfo?.comision_fija || 0}
              tipoComision={empresaInfo?.tipo_comision || "PORCENTAJE"}
              frecuenciaComision={empresaInfo?.frecuencia_comision || "SEMANAL"}
            />
          )}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
