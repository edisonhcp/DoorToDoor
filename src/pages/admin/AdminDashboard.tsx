import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, Truck, Users, UserCheck, Shield, Bell, X, CheckCircle2, Ban } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { fetchGlobalStats, deleteEmpresa } from "@/services/empresasService";
import { fetchSolicitudesPendientes, resolverSolicitud } from "@/services/solicitudesBajaService";
import { useToast } from "@/hooks/use-toast";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function AdminDashboard() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    companias: 0, conductores: 0, vehiculos: 0, propietarios: 0, viajesCerrados: 0, viajesCancelados: 0,
  });
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");

  const loadData = async () => {
    const [result, sols] = await Promise.all([
      fetchGlobalStats(),
      fetchSolicitudesPendientes(),
    ]);
    setStats(result.stats);
    setSolicitudes(sols);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (role !== "SUPER_ADMIN") return <Navigate to="/dashboard" replace />;

  const handleAprobarSolicitud = async (solicitud: any) => {
    const { error: resolveErr } = await resolverSolicitud(solicitud.id, "APROBADA", "SUPER_ADMIN");
    if (resolveErr) {
      toast({ title: "Error", description: resolveErr.message, variant: "destructive" });
      return;
    }
    const { error: deleteErr } = await deleteEmpresa(solicitud.empresa_id);
    if (deleteErr) {
      toast({ title: "Error al eliminar", description: deleteErr.message, variant: "destructive" });
    } else {
      toast({ title: "Solicitud aprobada y compañía eliminada" });
    }
    loadData();
  };

  const handleRechazarSolicitud = async (id: string) => {
    const { error } = await resolverSolicitud(id, "RECHAZADA", "SUPER_ADMIN", motivoRechazo);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Solicitud rechazada" });
    }
    setRechazandoId(null);
    setMotivoRechazo("");
    loadData();
  };

  const statCards = [
    { title: "Compañías", value: stats.companias, icon: Building2, color: "text-primary", bg: "bg-primary/10" },
    { title: "Vehículos", value: stats.vehiculos, icon: Truck, color: "text-amber-600", bg: "bg-amber-100" },
    { title: "Conductores", value: stats.conductores, icon: Users, color: "text-accent", bg: "bg-accent/10" },
    { title: "Propietarios", value: stats.propietarios, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-100" },
  ];

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <Badge className="bg-primary/10 text-primary border-0 font-medium">Super Admin</Badge>
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Resumen global de las agencias de transporte</p>
        </motion.div>

        {/* Solicitudes de Baja */}
        {solicitudes.length > 0 && (
          <motion.div variants={item}>
            <Card className="border border-amber-300 shadow-sm bg-amber-50/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="w-5 h-5 text-amber-600" />
                  <h2 className="font-display font-bold text-foreground">Solicitudes de Baja Pendientes</h2>
                  <Badge className="bg-amber-100 text-amber-700 border-0">{solicitudes.length}</Badge>
                </div>
                <div className="space-y-3">
                  {solicitudes.map((s: any) => (
                    <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-background rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{s.empresas?.nombre || "—"}</p>
                        {s.motivo && <p className="text-sm text-muted-foreground mt-0.5">Motivo: {s.motivo}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Solicitada el {new Date(s.created_at).toLocaleDateString("es-EC")}
                        </p>
                      </div>
                      {rechazandoId === s.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Motivo del rechazo..."
                            value={motivoRechazo}
                            onChange={(e) => setMotivoRechazo(e.target.value)}
                            className="w-48"
                          />
                          <Button size="sm" variant="destructive" onClick={() => handleRechazarSolicitud(s.id)}>
                            Confirmar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setRechazandoId(null); setMotivoRechazo(""); }}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleAprobarSolicitud(s)}>
                            <CheckCircle2 className="w-4 h-4" /> Aprobar y Eliminar
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => setRechazandoId(s.id)}>
                            <Ban className="w-4 h-4" /> Rechazar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat) => (
            <motion.div key={stat.title} variants={item}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-display font-bold text-foreground mt-1">
                      {loading ? "—" : stat.value}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
