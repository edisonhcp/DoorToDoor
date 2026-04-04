import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bus, ChevronDown, ChevronUp, LayoutList, Printer, User, CheckCircle, AlertTriangle, Truck, Check } from "lucide-react";
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
import { toast } from "sonner";

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

  // Group by vehicle
  const vehicleMap: Record<string, { placa: string; marca: string; modelo: string; propietario: string; viajes: any[] }> = {};
  viajes.forEach((v) => {
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

  const allVehicleKeys = Object.keys(vehicleMap).sort();
  const filteredVehicleKeys = selectedVehiculos.length > 0
    ? allVehicleKeys.filter(k => selectedVehiculos.includes(k))
    : allVehicleKeys;

  const handleFinalizarPeriodo = (placa: string) => {
    toast.success(`Corte de ${frecuenciaLabel.toLowerCase()} realizado para vehículo ${placa}`);
  };

  const handlePrint = () => {
    window.print();
  };

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
          {allVehicleKeys.length > 1 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Truck className="w-4 h-4" />
                  {selectedVehiculos.length === 0
                    ? "Todos los vehículos"
                    : `${selectedVehiculos.length} vehículo${selectedVehiculos.length > 1 ? "s" : ""}`}
                  <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-7 text-muted-foreground"
                    onClick={() => setSelectedVehiculos([])}
                  >
                    {selectedVehiculos.length === 0 && <Check className="w-3 h-3 mr-2" />}
                    Todos
                  </Button>
                  {allVehicleKeys.map(k => {
                    const veh = vehicleMap[k];
                    const checked = selectedVehiculos.includes(k);
                    return (
                      <label key={k} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => {
                            setSelectedVehiculos(prev =>
                              c ? [...prev, k] : prev.filter(p => p !== k)
                            );
                          }}
                        />
                        <span className="font-medium">{veh.placa}</span>
                        <span className="text-muted-foreground">{veh.marca} {veh.modelo}</span>
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </motion.div>

        {loading ? (
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
        ) : (
          <>
            {vehicleKeys.map((key) => {
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

            {viajes.length > 0 && (
              <motion.div variants={item} className={printingVehicle ? "print:hidden" : ""}>
                <Card className="border-primary/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <LayoutList className="w-5 h-5 text-primary" />
                        <span>Consolidado</span>
                        <span className="text-muted-foreground text-xs">({vehicleKeys.length} vehículos)</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={handlePrint}>
                        <Printer className="w-4 h-4 mr-1" />
                        Imprimir
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ConsolidadoTable vehicleMap={vehicleMap} vehicleKeys={vehicleKeys} empresaInfo={empresaInfo} />
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
