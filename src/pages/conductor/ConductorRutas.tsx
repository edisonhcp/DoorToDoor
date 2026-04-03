import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, Calendar } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { fetchConductorViajes } from "@/services/egresosService";
import { fetchEmpresaInfo } from "@/services/dashboardService";
import { ViajesTable } from "@/components/ViajesTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

interface PeriodRange {
  label: string;
  start: Date;
  end: Date;
}

function getPeriodsForMonth(year: number, month: number, frecuencia: string): PeriodRange[] {
  const periods: PeriodRange[] = [];
  
  if (frecuencia === "MENSUAL") {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    periods.push({ label: `${MONTH_NAMES[month]} ${year}`, start, end });
  } else if (frecuencia === "QUINCENAL") {
    const mid = new Date(year, month, 15, 23, 59, 59, 999);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
    periods.push({ label: `Quincena 1 (1-15)`, start: new Date(year, month, 1), end: mid });
    periods.push({ label: `Quincena 2 (16-${endOfMonth.getDate()})`, start: new Date(year, month, 16), end: endOfMonth });
  } else if (frecuencia === "BISEMANAL") {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let current = new Date(firstDay);
    const dow = current.getDay();
    if (dow === 0) { current.setDate(current.getDate() - 6); }
    else if (dow !== 1) { current.setDate(current.getDate() - (dow - 1)); }
    
    // Align to biweek using reference Monday
    const refMonday = new Date(2024, 0, 1);
    const weeksSinceRef = Math.floor((current.getTime() - refMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (weeksSinceRef % 2 !== 0) {
      current.setDate(current.getDate() - 7);
    }
    
    let biweekNum = 1;
    while (current <= lastDay) {
      const bStart = new Date(current);
      bStart.setHours(0, 0, 0, 0);
      const bEnd = new Date(current);
      bEnd.setDate(bEnd.getDate() + 13);
      bEnd.setHours(23, 59, 59, 999);
      
      // Show if the period overlaps with this month
      if (bEnd >= firstDay && bStart <= lastDay) {
        const sDay = bStart.getDate();
        const sMonth = bStart.getMonth();
        const eDay = bEnd.getDate();
        const eMonth = bEnd.getMonth();
        let label = `Bisemana ${biweekNum}`;
        if (sMonth === eMonth) {
          label += ` (${sDay}-${eDay} ${MONTH_NAMES[sMonth].substring(0, 3)})`;
        } else {
          label += ` (${sDay} ${MONTH_NAMES[sMonth].substring(0, 3)}-${eDay} ${MONTH_NAMES[eMonth].substring(0, 3)})`;
        }
        periods.push({ label, start: bStart, end: bEnd });
        biweekNum++;
      }
      current.setDate(current.getDate() + 14);
    }
  } else {
    // SEMANAL - Lunes a Domingo
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    let current = new Date(firstDay);
    const dow = current.getDay();
    if (dow === 0) { current.setDate(current.getDate() - 6); }
    else if (dow !== 1) { current.setDate(current.getDate() - (dow - 1)); }
    
    let weekNum = 1;
    while (current <= lastDay) {
      const weekStart = new Date(current);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      // Show if the period overlaps with this month
      if (weekEnd >= firstDay && weekStart <= lastDay) {
        const sDay = weekStart.getDate();
        const sMonth = weekStart.getMonth();
        const eDay = weekEnd.getDate();
        const eMonth = weekEnd.getMonth();
        let label = `Semana ${weekNum}`;
        if (sMonth === eMonth) {
          label += ` (${sDay}-${eDay} ${MONTH_NAMES[sMonth].substring(0, 3)})`;
        } else {
          label += ` (${sDay} ${MONTH_NAMES[sMonth].substring(0, 3)}-${eDay} ${MONTH_NAMES[eMonth].substring(0, 3)})`;
        }
        periods.push({ label, start: weekStart, end: weekEnd });
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
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  } else if (frecuencia === "QUINCENAL") {
    const day = now.getDate();
    if (day <= 15) {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59, 999),
      };
    } else {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 16),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    }
  } else if (frecuencia === "BISEMANAL") {
    // Every 2 weeks Monday-Sunday. Find the biweek containing today.
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() + diffToMonday);
    thisMonday.setHours(0, 0, 0, 0);
    // Use epoch-based calculation: weeks since a reference Monday
    const refMonday = new Date(2024, 0, 1); // Jan 1 2024 is a Monday
    const weeksSinceRef = Math.floor((thisMonday.getTime() - refMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const isEvenWeek = weeksSinceRef % 2 === 0;
    const biweekStart = isEvenWeek ? thisMonday : new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const biweekEnd = new Date(biweekStart.getTime() + 13 * 24 * 60 * 60 * 1000);
    biweekEnd.setHours(23, 59, 59, 999);
    return { start: biweekStart, end: biweekEnd };
  } else {
    // SEMANAL - Monday to Sunday
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  }
}

export default function ConductorRutas() {
  const { role, user, empresaId } = useAuth();
  const [allViajes, setAllViajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresaInfo, setEmpresaInfo] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<{ start: Date; end: Date } | null>(null);
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

  const frecuencia = empresaInfo?.frecuencia_comision || "SEMANAL";

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data } = await fetchConductorViajes(user.id, ["FINALIZADO", "EN_RUTA"]);
      setAllViajes(data);
      if (empresaId) {
        const info = await fetchEmpresaInfo(empresaId);
        setEmpresaInfo(info);
      }
      setLoading(false);
    };
    load();
  }, [user, empresaId]);

  // Set default to current period once empresaInfo loads
  useEffect(() => {
    if (empresaInfo && !selectedPeriod) {
      const current = getCurrentPeriod(frecuencia);
      setSelectedPeriod(current);
      // Open current month by default
      const now = new Date();
      setOpenMonths({ [`${now.getFullYear()}-${now.getMonth()}`]: true });
    }
  }, [empresaInfo]);

  // Get available months from all viajes
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    const now = new Date();
    // Always include current month
    months.add(`${now.getFullYear()}-${now.getMonth()}`);
    
    allViajes.forEach(v => {
      const d = new Date(v.fecha_salida);
      months.add(`${d.getFullYear()}-${d.getMonth()}`);
    });
    
    return Array.from(months)
      .map(key => {
        const [year, month] = key.split("-").map(Number);
        return { year, month, key };
      })
      .sort((a, b) => a.year - b.year || a.month - b.month);
  }, [allViajes]);

  // Filter viajes by selected period
  const filteredViajes = useMemo(() => {
    if (!selectedPeriod) return allViajes;
    return allViajes.filter(v => {
      const fecha = new Date(v.fecha_salida);
      return fecha >= selectedPeriod.start && fecha <= selectedPeriod.end;
    });
  }, [allViajes, selectedPeriod]);

  const isCurrentPeriod = (start: Date, end: Date) => {
    if (!selectedPeriod) return false;
    return selectedPeriod.start.getTime() === start.getTime() && selectedPeriod.end.getTime() === end.getTime();
  };

  if (role !== "CONDUCTOR") return <Navigate to="/dashboard" replace />;

  const frecuenciaLabel: Record<string, string> = {
    SEMANAL: "Semanal",
    BISEMANAL: "Bisemanal",
    QUINCENAL: "Quincenal",
    MENSUAL: "Mensual",
  };

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <h1 className="text-3xl font-display font-bold text-foreground">Consolidado Rutas</h1>
          <p className="text-muted-foreground mt-1">
            Historial de viajes — Corte {frecuenciaLabel[frecuencia] || frecuencia}
          </p>
        </motion.div>

        {/* Period navigator */}
        <motion.div variants={item}>
          <div className="border rounded-lg bg-card">
            <div className="p-3 border-b bg-muted/30 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Seleccionar Período</span>
            </div>
            <div className="p-2 max-h-64 overflow-y-auto space-y-1">
              {availableMonths.map(({ year, month, key }) => {
                const periods = getPeriodsForMonth(year, month, frecuencia);
                const isOpen = openMonths[key] || false;

                return (
                  <Collapsible
                    key={key}
                    open={isOpen}
                    onOpenChange={(open) => setOpenMonths(prev => ({ ...prev, [key]: open }))}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start gap-2 text-sm font-medium h-8">
                        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        {MONTH_NAMES[month]} {year}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pl-6 space-y-0.5 py-1">
                        {periods.map((p, idx) => {
                          const active = isCurrentPeriod(p.start, p.end);
                          return (
                            <Button
                              key={idx}
                              variant={active ? "default" : "ghost"}
                              size="sm"
                              className={`w-full justify-start text-xs h-7 ${active ? "" : "text-muted-foreground"}`}
                              onClick={() => setSelectedPeriod({ start: p.start, end: p.end })}
                            >
                              {p.label}
                              {active && <Badge variant="secondary" className="ml-auto text-[10px] px-1">Actual</Badge>}
                            </Button>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        </motion.div>

        <motion.div variants={item}>
          {loading ? (
            <div className="h-48 rounded-xl bg-muted animate-pulse" />
          ) : (
            <ViajesTable
              viajes={filteredViajes}
              showEgresos
              showConductorColumn={false}
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
