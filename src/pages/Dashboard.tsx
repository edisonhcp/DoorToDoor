import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Truck, Users, Route, CheckCircle2, Clock, Plus, AlertTriangle,
  Trash2, MessageCircle, UserCheck, Percent, DollarSign, CalendarClock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { fetchConductorData, deleteConductorAccount } from "@/services/conductoresService";
import { deletePropietarioAccount } from "@/services/propietariosService";
import { fetchPropietarioVehiculos, deleteVehiculo } from "@/services/vehiculosService";
import { fetchDashboardStats, fetchEmpresaNombre, fetchEmpresaInfo, type DashboardStats } from "@/services/dashboardService";
import { fetchRutasConductor, iniciarRuta, finalizarRuta, type RutaAsignada } from "@/services/asignacionesRutaService";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// ─── Suspension Banner ───
function SuspensionBanner({ message }: { message: string }) {
  return (
    <motion.div variants={item}>
      <Card className="border-0 shadow-sm border-l-4 border-l-destructive bg-destructive/5">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <p className="text-sm text-foreground flex-1">{message}</p>
          <Button variant="outline" size="sm" className="gap-1 shrink-0" asChild>
            <a href="https://wa.me/" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-3 h-3" />
              WhatsApp
            </a>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Conductor Dashboard ───
function ConductorDashboard({ profile, suspended }: { profile: any; suspended: any }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [conductorInfo, setConductorInfo] = useState<any>(null);
  const [rutasAsignadas, setRutasAsignadas] = useState<RutaAsignada[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteAccountAlert, setDeleteAccountAlert] = useState(false);

  const loadRutas = async () => {
    if (!user?.id) return;
    const { data } = await fetchRutasConductor(user.id);
    setRutasAsignadas(data);
  };

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const data = await fetchConductorData(user.id);
      setConductorInfo(data);
      await loadRutas();
      setLoading(false);
    };
    load();
  }, [user]);

  const handleIniciarRuta = async (viajeId: string) => {
    const { error } = await iniciarRuta(viajeId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Ruta iniciada" }); loadRutas(); }
  };

  const handleFinalizarRuta = async (viajeId: string) => {
    const { error } = await finalizarRuta(viajeId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Ruta finalizada" }); loadRutas(); }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    await deleteConductorAccount(user.id);
    toast({ title: "Cuenta eliminada. Puede registrarse en otra compañía." });
  };

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        {suspended && suspended.type === "empresa" && (
          <SuspensionBanner message={suspended.message} />
        )}

        <motion.div variants={item}>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Hola, {profile?.username || "Conductor"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">Panel de conductor</p>
        </motion.div>

        <motion.div variants={item}>
          {loading ? (
            <div className="h-48 rounded-xl bg-muted animate-pulse" />
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-display font-bold text-foreground">
                      {conductorInfo?.conductor ? `${conductorInfo.conductor.nombres} ${conductorInfo.conductor.apellidos}` : profile?.username || "Conductor"}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      {conductorInfo?.conductor?.tipo_licencia && `Licencia: ${conductorInfo.conductor.tipo_licencia}`}
                      {conductorInfo?.conductor?.celular && ` · ${conductorInfo.conductor.celular}`}
                    </p>

                    {conductorInfo?.vehiculo ? (
                      <div className={`mt-4 p-4 rounded-xl border ${conductorInfo.vehiculo.estado === "INHABILITADO" ? "bg-destructive/5 border-destructive/30" : "bg-muted/50 border-border"}`}>
                        <div className="flex items-center gap-3">
                          <Truck className={`w-6 h-6 ${conductorInfo.vehiculo.estado === "INHABILITADO" ? "text-destructive" : "text-primary"}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-display font-semibold text-foreground">
                                {conductorInfo.vehiculo.marca} {conductorInfo.vehiculo.modelo} {conductorInfo.vehiculo.anio || ""}
                              </p>
                              {conductorInfo.vehiculo.estado === "INHABILITADO" && (
                                <Badge variant="destructive" className="text-xs">INHABILITADO</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Placa: {conductorInfo.vehiculo.placa} · {conductorInfo.vehiculo.color} · {conductorInfo.vehiculo.tipo}
                            </p>
                            {conductorInfo.vehiculo.propietarios && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Propietario: {conductorInfo.vehiculo.propietarios.nombres} {conductorInfo.vehiculo.propietarios.apellidos}
                              </p>
                            )}
                          </div>
                        </div>
                        {conductorInfo.vehiculo.estado === "INHABILITADO" && (
                          <div className="mt-3 pt-3 border-t border-destructive/20 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                            <p className="text-sm text-destructive flex-1">Tu vehículo ha sido deshabilitado. Contacta a la gerencia para más información.</p>
                            <Button variant="outline" size="sm" className="gap-1 shrink-0" asChild>
                              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="w-3 h-3" />
                                WhatsApp
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-dashed border-border text-center">
                        <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">No tienes un vehículo asignado aún</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Rutas asignadas */}
        {rutasAsignadas.length > 0 && (
          <motion.div variants={item}>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">Rutas Asignadas</h2>
            <div className="space-y-3">
              {rutasAsignadas.map((ruta) => (
                <Card key={ruta.id} className={`border-0 shadow-sm ${ruta.estado === "EN_RUTA" ? "border-l-4 border-l-primary" : "border-l-4 border-l-muted"}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Route className="w-5 h-5 text-primary" />
                          <span className="font-display font-semibold text-foreground">
                            {ruta.origen} → {ruta.destino}
                          </span>
                          <Badge variant={ruta.estado === "EN_RUTA" ? "default" : "secondary"}>
                            {ruta.estado === "EN_RUTA" ? "Ruta Iniciada" : "Asignado"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          {ruta.hora_salida && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ruta.hora_salida}</span>}
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ruta.cantidad_pasajeros} pasajeros</span>
                          {ruta.vehiculo && <span><Truck className="w-3 h-3 inline mr-1" />{ruta.vehiculo.placa}</span>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>Valor pasajeros: ${ruta.ingresos?.pasajeros_monto?.toFixed(2) || "0.00"}</span>
                          <span>Encomienda: ${ruta.ingresos?.encomiendas_monto?.toFixed(2) || "0.00"}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {ruta.estado === "ASIGNADO" && (
                          <Button onClick={() => handleIniciarRuta(ruta.id)} className="gap-2">
                            <Route className="w-4 h-4" />
                            Iniciar Ruta
                          </Button>
                        )}
                        {ruta.estado === "EN_RUTA" && (
                          <Button onClick={() => handleFinalizarRuta(ruta.id)} variant="outline" className="gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Ruta Finalizada
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div variants={item}>
          <Button variant="destructive" size="sm" className="gap-2" onClick={() => setDeleteAccountAlert(true)}>
            <Trash2 className="w-4 h-4" />
            Eliminar mi cuenta
          </Button>
        </motion.div>
      </motion.div>

      <AlertDialog open={deleteAccountAlert} onOpenChange={setDeleteAccountAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tu cuenta?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará tu perfil de conductor. Podrás registrarte en otra compañía con un nuevo link de invitación.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar cuenta</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

// ─── Propietario Dashboard ───
function PropietarioDashboard({ profile, suspended }: { profile: any; suspended: any }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [misVehiculos, setMisVehiculos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteAccountAlert, setDeleteAccountAlert] = useState(false);
  const [deleteVehiculoAlert, setDeleteVehiculoAlert] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const result = await fetchPropietarioVehiculos(user.id);
      setMisVehiculos(result.vehiculos);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    await deletePropietarioAccount(user.id);
    toast({ title: "Cuenta eliminada. Puede registrarse en otra compañía." });
  };

  const handleDeleteVehiculo = async () => {
    if (!deleteVehiculoAlert) return;
    const { error } = await deleteVehiculo(deleteVehiculoAlert);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Vehículo eliminado" });
      setMisVehiculos(prev => prev.filter(v => v.id !== deleteVehiculoAlert.id));
    }
    setDeleteVehiculoAlert(null);
  };

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        {suspended && suspended.type === "empresa" && (
          <SuspensionBanner message={suspended.message} />
        )}

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
                <Card key={v.id} className={`border-0 shadow-sm ${v.estado === "INHABILITADO" ? "border border-destructive/30 bg-destructive/5" : ""}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${v.estado === "INHABILITADO" ? "bg-destructive/10" : "bg-primary/10"}`}>
                        <Truck className={`w-5 h-5 ${v.estado === "INHABILITADO" ? "text-destructive" : "text-primary"}`} />
                      </div>
                      <Badge variant={v.estado === "HABILITADO" ? "default" : "destructive"}>{v.estado}</Badge>
                    </div>
                    <h3 className="font-display font-semibold text-foreground">{v.placa}</h3>
                    <p className="text-sm text-muted-foreground">{v.marca} {v.modelo} {v.anio || ""}</p>
                    <p className="text-xs text-muted-foreground mt-1">{v.color} · {v.tipo} · Cap: {v.capacidad}</p>
                    {v.estado === "INHABILITADO" && (
                      <div className="mt-3 pt-3 border-t border-destructive/20 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                        <p className="text-xs text-destructive flex-1">Vehículo deshabilitado. Contacta a la gerencia.</p>
                        <Button variant="outline" size="sm" className="gap-1 shrink-0 h-7 text-xs" asChild>
                          <a href="https://wa.me/" target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="w-3 h-3" />
                            WhatsApp
                          </a>
                        </Button>
                      </div>
                    )}
                    <Button variant="ghost" size="sm" className="mt-2 text-destructive gap-1" onClick={() => setDeleteVehiculoAlert(v)}>
                      <Trash2 className="w-3 h-3" /> Eliminar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div variants={item}>
          <Button variant="destructive" size="sm" className="gap-2" onClick={() => setDeleteAccountAlert(true)}>
            <Trash2 className="w-4 h-4" />
            Eliminar mi cuenta
          </Button>
        </motion.div>
      </motion.div>

      <AlertDialog open={deleteAccountAlert} onOpenChange={setDeleteAccountAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tu cuenta?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará tu perfil de propietario y todos tus vehículos. Podrás registrarte en otra compañía con un nuevo link.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar cuenta</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteVehiculoAlert} onOpenChange={() => setDeleteVehiculoAlert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar vehículo?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará el vehículo <strong>{deleteVehiculoAlert?.placa}</strong> permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVehiculo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

// ─── Gerencia Dashboard ───
export default function Dashboard() {
  const { profile, role, empresaId, suspended } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    vehiculos: 0, vehiculosDeshabilitados: 0, conductores: 0, conductoresDeshabilitados: 0,
    propietarios: 0, viajesBorrador: 0, viajesCerrados: 0, asignacionesActivas: 0,
  });
  
  const [loading, setLoading] = useState(true);
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [empresaInfo, setEmpresaInfo] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (role !== "GERENCIA") return;

      const result = await fetchDashboardStats();
      setStats(result.stats);

      if (empresaId) {
        setEmpresaNombre(await fetchEmpresaNombre(empresaId));
        const info = await fetchEmpresaInfo(empresaId);
        setEmpresaInfo(info);
      }

      setLoading(false);
    };

    if (role) load();
  }, [role]);

  if (role === "SUPER_ADMIN") return <Navigate to="/admin" replace />;
  if (role === "PROPIETARIO") return <PropietarioDashboard profile={profile} suspended={suspended} />;
  if (role === "CONDUCTOR") return <ConductorDashboard profile={profile} suspended={suspended} />;

  const vehiculosActivos = stats.vehiculos - stats.vehiculosDeshabilitados;
  const conductoresActivos = stats.conductores - stats.conductoresDeshabilitados;

  const statCards = [
    {
      title: "Vehículos", icon: Truck, color: "text-primary", bg: "bg-primary/10",
      items: [
        { label: "Activos", value: vehiculosActivos },
        { label: "Deshabilitados", value: stats.vehiculosDeshabilitados, destructive: true },
        { label: "Total", value: stats.vehiculos },
      ],
    },
    {
      title: "Conductores", icon: Users, color: "text-accent", bg: "bg-accent/10",
      items: [
        { label: "Activos", value: conductoresActivos },
        { label: "Deshabilitados", value: stats.conductoresDeshabilitados, destructive: true },
        { label: "Total", value: stats.conductores },
      ],
    },
    {
      title: "Propietarios", icon: UserCheck, color: "text-secondary", bg: "bg-secondary/10",
      items: [{ label: "Total", value: stats.propietarios }],
    },
  ];

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <motion.div variants={item}>
            <Card className="border-0 shadow-sm h-full">
              <CardContent className="p-6 flex items-center gap-5">
                {empresaInfo?.logo_url ? (
                  <img src={empresaInfo.logo_url} alt="Logo" className="w-16 h-16 rounded-full object-cover border border-border shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-8 h-8 text-primary" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-display font-bold text-foreground">
                    Hola, {empresaNombre || profile?.username || "Administrador"} 👋
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-0 shadow-sm h-full">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-3">Comisión Configurada</p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    {empresaInfo?.tipo_comision === "PORCENTAJE" ? (
                      <Percent className="w-5 h-5 text-primary" />
                    ) : (
                      <DollarSign className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-display font-bold text-foreground">
                      {empresaInfo?.tipo_comision === "PORCENTAJE"
                        ? `${Math.round((empresaInfo?.comision_pct || 0) * 100)}%`
                        : `$${empresaInfo?.comision_fija || 0}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {empresaInfo?.tipo_comision === "PORCENTAJE" ? "Porcentaje" : "Valor Fijo"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-muted-foreground" />
                    <Badge variant="secondary" className="capitalize">
                      {(empresaInfo?.frecuencia_comision || "SEMANAL").toLowerCase()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((stat) => (
            <motion.div key={stat.title} variants={item}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    {stat.items.map((si) => (
                      <div key={si.label} className="flex items-center justify-between">
                        <span className={`text-xs ${si.destructive ? "text-destructive" : "text-muted-foreground"}`}>{si.label}</span>
                        <span className={`text-sm font-display font-bold ${si.destructive ? "text-destructive" : "text-foreground"}`}>
                          {loading ? "—" : si.value}
                        </span>
                      </div>
                    ))}
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
        </div>
      </motion.div>
    </DashboardLayout>
  );
}