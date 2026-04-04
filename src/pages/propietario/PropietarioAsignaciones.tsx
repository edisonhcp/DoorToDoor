import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Truck, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PrintHeader } from "@/components/PrintHeader";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { fetchPropietarioAsignaciones } from "@/services/egresosService";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const estadoLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  ASIGNADO: { label: "Ruta Asignada", variant: "secondary" },
  EN_RUTA: { label: "Ruta Iniciada", variant: "default" },
  FINALIZADO: { label: "Ruta Finalizada", variant: "outline" },
};

/**
 * Hide FINALIZADO vehicles 24 hours after the trip's fecha_llegada.
 */
function shouldHideFinalizadoVehiculo(v: any): boolean {
  if (v.estado_ruta !== "FINALIZADO") return false;
  // The viaje object should have fecha_llegada
  const fechaLlegada = v.viaje?.fecha_llegada ? new Date(v.viaje.fecha_llegada) : null;
  if (!fechaLlegada) return false;
  const now = new Date();
  return now.getTime() - fechaLlegada.getTime() > 24 * 60 * 60 * 1000;
}

export default function PropietarioAsignaciones() {
  const { role, user } = useAuth();
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data } = await fetchPropietarioAsignaciones(user.id);
      setVehiculos(data);
      setLoading(false);
    };
    load();
  }, [user]);

  if (role !== "PROPIETARIO") return <Navigate to="/dashboard" replace />;

  // Filter out FINALIZADO that should be hidden after 24h
  const filteredVehiculos = vehiculos.filter(v => !shouldHideFinalizadoVehiculo(v));

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Asignaciones</h1>
            <p className="text-muted-foreground mt-1">Estado de rutas asignadas a tus vehículos</p>
          </div>
        </motion.div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : filteredVehiculos.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Truck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No tienes vehículos con rutas activas</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVehiculos.map(v => {
              const estado = v.estado_ruta ? estadoLabels[v.estado_ruta] : null;
              return (
                <motion.div key={v.id} variants={item}>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Truck className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-display font-semibold text-foreground">{v.placa}</h3>
                            <span className="text-sm text-muted-foreground">{v.marca} {v.modelo}</span>
                          </div>

                          {v.conductor ? (
                            <p className="text-sm text-muted-foreground mt-1">
                              <Users className="w-3 h-3 inline mr-1" />
                              Conductor: {v.conductor.nombres} {v.conductor.apellidos}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground mt-1">Sin conductor asignado</p>
                          )}

                          <div className="mt-2">
                            {estado ? (
                              <div className="space-y-1">
                                <Badge variant={estado.variant}>{estado.label}</Badge>
                                {v.viaje && (
                                  <p className="text-xs text-muted-foreground">
                                    {v.viaje.origen} → {v.viaje.destino}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">Sin ruta activa</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
