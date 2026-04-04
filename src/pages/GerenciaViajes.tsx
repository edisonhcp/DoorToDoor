import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Printer, Filter } from "lucide-react";
import { PrintHeader } from "@/components/PrintHeader";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { fetchViajesConDetalle } from "@/services/egresosService";
import { fetchEmpresaInfo } from "@/services/dashboardService";
import { ViajesTable } from "@/components/ViajesTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

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

function getCurrentPeriod(frecuencia: string): { start: Date; end: Date } {
  const now = new Date();
  if (frecuencia === "MENSUAL") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
  } else if (frecuencia === "QUINCENAL") {
    const day = now.getDate();
    if (day <= 15) {
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59, 999) };
    } else {
      return { start: new Date(now.getFullYear(), now.getMonth(), 16), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
    }
  } else if (frecuencia === "BISEMANAL") {
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisMonday = new Date(now); thisMonday.setDate(now.getDate() + diffToMonday); thisMonday.setHours(0, 0, 0, 0);
    const refMonday = new Date(2024, 0, 1);
    const weeksSinceRef = Math.floor((thisMonday.getTime() - refMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const isEvenWeek = weeksSinceRef % 2 === 0;
    const biweekStart = isEvenWeek ? thisMonday : new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const biweekEnd = new Date(biweekStart.getTime() + 13 * 24 * 60 * 60 * 1000); biweekEnd.setHours(23, 59, 59, 999);
    return { start: biweekStart, end: biweekEnd };
  } else {
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now); monday.setDate(now.getDate() + diffToMonday); monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  }
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
  const [empresaInfo, setEmpresaInfo] = useState<any>(null);
  const [selectedVehiculos, setSelectedVehiculos] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!empresaId) return;
      const { data } = await fetchViajesConDetalle(empresaId);
      setViajes(data);
      const info = await fetchEmpresaInfo(empresaId);
      setEmpresaInfo(info);
      setLoading(false);
    };
    load();
  }, [empresaId]);

  if (role !== "GERENCIA") return <Navigate to="/dashboard" replace />;

  const frecuencia = empresaInfo?.frecuencia_comision || "SEMANAL";
  const frecuenciaLabel = FRECUENCIA_LABELS[frecuencia] || "Período";

  // Filter viajes by current period and selected vehicles
  const currentPeriod = getCurrentPeriod(frecuencia);
  const filteredViajes = (() => {
    let result = viajes.filter(v => {
      const d = new Date(v.fecha_salida);
      return d >= currentPeriod.start && d <= currentPeriod.end;
    });
    if (selectedVehiculos.length > 0) {
      result = result.filter(v => {
        const placa = v.vehiculo?.placa || "sin-vehiculo";
        return selectedVehiculos.includes(placa);
      });
    }
    return result;
  })();

  // All vehicle keys from current period viajes (for the vehicle filter)
  const periodViajes = viajes.filter(v => {
    const d = new Date(v.fecha_salida);
    return d >= currentPeriod.start && d <= currentPeriod.end;
  });
  const allVehicleKeysUnfiltered = (() => {
    const keys = new Set<string>();
    periodViajes.forEach(v => {
      const placa = v.vehiculo?.placa || "sin-vehiculo";
      keys.add(placa);
    });
    return Array.from(keys).sort();
  })();

  const allVehicleInfo: Record<string, { placa: string; marca: string; modelo: string }> = {};
  periodViajes.forEach(v => {
    const placa = v.vehiculo?.placa || "sin-vehiculo";
    if (!allVehicleInfo[placa]) {
      allVehicleInfo[placa] = { placa: v.vehiculo?.placa || "—", marca: v.vehiculo?.marca || "", modelo: v.vehiculo?.modelo || "" };
    }
  });

  const toggleVehiculo = (placa: string) => {
    setSelectedVehiculos(prev =>
      prev.includes(placa) ? prev.filter(k => k !== placa) : [...prev, placa]
    );
  };

  const selectedVehiculosLabel = selectedVehiculos.length === 0
    ? "Todos los vehículos"
    : selectedVehiculos.length <= 2
      ? selectedVehiculos.join(", ")
      : `${selectedVehiculos.length} vehículos`;

  const formatPeriodDate = (d: Date) => d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
  const periodLabel = `${formatPeriodDate(currentPeriod.start)} — ${formatPeriodDate(currentPeriod.end)}`;

  return (
    <DashboardLayout>
      <PrintHeader
        reportTitle="Consolidado Rutas"
        subtitle={`Período actual: ${periodLabel}`}
      />
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="no-print flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Consolidado Rutas</h1>
            <p className="text-muted-foreground mt-1">
              Período actual ({frecuenciaLabel}): {periodLabel}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.print()} className="no-print">
            <Printer className="w-4 h-4 mr-1" />
            Imprimir
          </Button>
        </motion.div>

        {/* Vehicle filter */}
        {!loading && (
          <motion.div variants={item} className="no-print">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Filtrar por vehículo</span>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full md:w-72 justify-start text-sm font-normal h-10">
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
              </CardContent>
            </Card>
          </motion.div>
        )}

        {loading ? (
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
        ) : filteredViajes.length > 0 ? (
          <motion.div variants={item}>
            <ViajesTable
              viajes={filteredViajes}
              showEgresos
              showConductorColumn
              comisionPct={empresaInfo?.comision_pct || 0.10}
              comisionFija={empresaInfo?.comision_fija || 0}
              tipoComision={empresaInfo?.tipo_comision || "PORCENTAJE"}
              frecuenciaComision={empresaInfo?.frecuencia_comision || "SEMANAL"}
            />
          </motion.div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay viajes en el período actual
            </CardContent>
          </Card>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
