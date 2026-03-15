import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Truck, Users, Route, DollarSign, TrendingUp, TrendingDown,
  Calendar, AlertCircle, CheckCircle2, Clock, Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Stats {
  vehiculos: number;
  conductores: number;
  viajesHoy: number;
  viajesBorrador: number;
  viajesCerrados: number;
  asignacionesActivas: number;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { profile, role } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    vehiculos: 0, conductores: 0, viajesHoy: 0,
    viajesBorrador: 0, viajesCerrados: 0, asignacionesActivas: 0,
  });
  const [recentViajes, setRecentViajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Propietario-specific state
  const [misVehiculos, setMisVehiculos] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (role === "PROPIETARIO") {
        // Fetch propietario's own vehicles
        const { data: vehiculosData } = await supabase
          .from("vehiculos")
          .select("*")
          .order("created_at", { ascending: false });
        setMisVehiculos(vehiculosData || []);
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      const [vehiculosRes, conductoresRes, viajesHoyRes, borradorRes, cerradosRes, asignacionesRes, recentRes] =
        await Promise.all([
          supabase.from("vehiculos").select("id", { count: "exact", head: true }),
          supabase.from("conductores").select("id", { count: "exact", head: true }),
          supabase.from("viajes").select("id", { count: "exact", head: true }).gte("fecha_salida", today).lt("fecha_salida", today + "T23:59:59"),
          supabase.from("viajes").select("id", { count: "exact", head: true }).eq("estado", "BORRADOR"),
          supabase.from("viajes").select("id", { count: "exact", head: true }).eq("estado", "CERRADO"),
          supabase.from("asignaciones").select("id", { count: "exact", head: true }).eq("estado", "ACTIVA"),
          supabase.from("viajes").select("*").order("created_at", { ascending: false }).limit(5),
        ]);

      setStats({
        vehiculos: vehiculosRes.count || 0,
        conductores: conductoresRes.count || 0,
        viajesHoy: viajesHoyRes.count || 0,
        viajesBorrador: borradorRes.count || 0,
        viajesCerrados: cerradosRes.count || 0,
        asignacionesActivas: asignacionesRes.count || 0,
      });
      setRecentViajes(recentRes.data || []);
      setLoading(false);
    };

    if (role) fetchStats();
  }, [role]);

  // Propietario Dashboard
  if (role === "PROPIETARIO") {
    return (
      <DashboardLayout>
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
          <motion.div variants={item}>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Hola, {profile?.username || "Propietario"} 👋
            </h1>
            <p className="text-muted-foreground mt-1">Panel de propietario de vehículos</p>
          </motion.div>

          <motion.div variants={item} className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold text-foreground">Mis Vehículos</h2>
            <Button onClick={() => navigate("/dashboard/mis-vehiculos")} className="gap-2 font-display">
              <Plus className="w-4 h-4" />
              Registrar Vehículo
            </Button>
          </motion.div>

          <motion.div variants={item}>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : misVehiculos.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                  <Truck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground mb-4">No tienes vehículos registrados aún</p>
                  <Button onClick={() => navigate("/dashboard/mis-vehiculos")} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Registrar mi primer vehículo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {misVehiculos.map(v => (
                  <Card key={v.id} className="border-0 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Truck className="w-5 h-5 text-primary" />
                        </div>
                        <Badge variant={v.estado === "HABILITADO" ? "default" : "destructive"}>{v.estado}</Badge>
                      </div>
                      <h3 className="font-display font-semibold text-foreground">{v.placa}</h3>
                      <p className="text-sm text-muted-foreground">{v.marca} {v.modelo} {v.anio || ""}</p>
                      <p className="text-xs text-muted-foreground mt-1">{v.color} · {v.tipo} · Cap: {v.capacidad}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      </DashboardLayout>
    );
  }

  // Gerencia / default Dashboard
  const statCards = [
    { title: "Vehículos", value: stats.vehiculos, icon: Truck, color: "text-primary", bg: "bg-primary/10" },
    { title: "Conductores", value: stats.conductores, icon: Users, color: "text-accent", bg: "bg-accent/10" },
    { title: "Viajes Hoy", value: stats.viajesHoy, icon: Route, color: "text-secondary", bg: "bg-secondary/10" },
    { title: "Asignaciones Activas", value: stats.asignacionesActivas, icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        <motion.div variants={item}>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Hola, {profile?.username || "Administrador"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Resumen de operaciones del día — {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((stat) => (
            <motion.div key={stat.title} variants={item}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-display font-bold text-foreground mt-1">
                        {loading ? "—" : stat.value}
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={item}>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="font-display text-lg">Estado de Viajes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium text-foreground">Borradores</span>
                    </div>
                    <Badge variant="secondary" className="font-display font-bold text-base px-3">
                      {loading ? "—" : stats.viajesBorrador}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span className="font-medium text-foreground">Cerrados</span>
                    </div>
                    <Badge variant="secondary" className="font-display font-bold text-base px-3">
                      {loading ? "—" : stats.viajesCerrados}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="font-display text-lg">Viajes Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : recentViajes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Route className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No hay viajes registrados aún</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentViajes.map((viaje) => (
                      <div key={viaje.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className={`w-2 h-2 rounded-full ${viaje.estado === "CERRADO" ? "bg-primary" : "bg-muted-foreground"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {viaje.origen} → {viaje.destino}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(viaje.fecha_salida).toLocaleDateString("es-ES")}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {viaje.estado}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
