import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bus, ChevronDown, ChevronUp, LayoutList, User } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { fetchViajesConDetalle } from "@/services/egresosService";
import { ViajesTable } from "@/components/ViajesTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function GerenciaViajes() {
  const { role, empresaId } = useAuth();
  const [viajes, setViajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!empresaId) return;
      const { data } = await fetchViajesConDetalle(empresaId);
      setViajes(data);
      setLoading(false);
    };
    load();
  }, [empresaId]);

  if (role !== "GERENCIA") return <Navigate to="/dashboard" replace />;

  // Group by propietario + vehicle
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

  const vehicleKeys = Object.keys(vehicleMap);

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <h1 className="text-3xl font-display font-bold text-foreground">Viajes</h1>
          <p className="text-muted-foreground mt-1">Registro completo de rutas finalizadas con ingresos y egresos</p>
        </motion.div>

        {loading ? (
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
        ) : (
          <>
            {vehicleKeys.map((key) => {
              const veh = vehicleMap[key];
              const isOpen = expanded === key;
              return (
                <motion.div key={key} variants={item}>
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
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </CardTitle>
                    </CardHeader>
                    {isOpen && (
                      <CardContent onClick={(e) => e.stopPropagation()}>
                        <ViajesTable viajes={veh.viajes} showEgresos showConductorColumn />
                      </CardContent>
                    )}
                  </Card>
                </motion.div>
              );
            })}

            {viajes.length > 0 && (
              <motion.div variants={item}>
                <Card
                  className="cursor-pointer hover:shadow-md transition-shadow border-primary/30"
                  onClick={() => setExpanded(expanded === "__consolidado__" ? null : "__consolidado__")}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <LayoutList className="w-5 h-5 text-primary" />
                        <span>Consolidado</span>
                        <span className="text-muted-foreground text-xs">({viajes.length} viajes)</span>
                      </div>
                      {expanded === "__consolidado__" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </CardTitle>
                  </CardHeader>
                  {expanded === "__consolidado__" && (
                    <CardContent onClick={(e) => e.stopPropagation()}>
                      <ViajesTable viajes={viajes} showEgresos showConductorColumn />
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
