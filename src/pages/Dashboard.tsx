import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Truck, Users, Route, CheckCircle2, Clock, Plus, LinkIcon, AlertTriangle,
  Trash2, MessageCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

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
  const [conductorInfo, setConductorInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteAccountAlert, setDeleteAccountAlert] = useState(false);

  useEffect(() => {
    const fetchConductorData = async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("conductor_id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id || "")
        .single();

      if (profileData?.conductor_id) {
        const [condRes, asigRes] = await Promise.all([
          supabase.from("conductores").select("*").eq("id", profileData.conductor_id).single(),
          supabase.from("asignaciones")
            .select("*, vehiculos(placa, marca, modelo, anio, color, tipo, propietarios(nombres))")
            .eq("conductor_id", profileData.conductor_id)
            .eq("estado", "ACTIVA")
            .single(),
        ]);
        setConductorInfo({
          conductor: condRes.data,
          vehiculo: asigRes.data?.vehiculos || null,
        });
      }
      setLoading(false);
    };
    fetchConductorData();
  }, []);

  const handleDeleteAccount = async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const { data: prof } = await supabase.from("profiles").select("conductor_id").eq("user_id", userId).single();
    if (prof?.conductor_id) {
      await supabase.from("asignaciones").update({ estado: "CERRADA", fecha_fin: new Date().toISOString() })
        .eq("conductor_id", prof.conductor_id).eq("estado", "ACTIVA");
      // Unlink profile before deleting conductor
      await supabase.from("profiles").update({ conductor_id: null }).eq("user_id", userId);
      await supabase.from("conductores").delete().eq("id", prof.conductor_id);
    }
    toast({ title: "Cuenta eliminada. Puede registrarse en otra compañía." });
    await supabase.auth.signOut();
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
                      <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border">
                        <div className="flex items-center gap-3">
                          <Truck className="w-6 h-6 text-primary" />
                          <div>
                            <p className="font-display font-semibold text-foreground">
                              {conductorInfo.vehiculo.marca} {conductorInfo.vehiculo.modelo} {conductorInfo.vehiculo.anio || ""}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Placa: {conductorInfo.vehiculo.placa} · {conductorInfo.vehiculo.color} · {conductorInfo.vehiculo.tipo}
                            </p>
                            {conductorInfo.vehiculo.propietarios?.nombres && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Propietario: {conductorInfo.vehiculo.propietarios.nombres}
                              </p>
                            )}
                          </div>
                        </div>
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
  const [misVehiculos, setMisVehiculos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteAccountAlert, setDeleteAccountAlert] = useState(false);
  const [deleteVehiculoAlert, setDeleteVehiculoAlert] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return;
      const { data: prof } = await supabase.from("profiles").select("propietario_id").eq("user_id", userId).single();
      if (prof?.propietario_id) {
        const { data } = await supabase
          .from("vehiculos")
          .select("*")
          .eq("propietario_id", prof.propietario_id)
          .order("created_at", { ascending: false });
        setMisVehiculos(data || []);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleDeleteAccount = async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const { data: prof } = await supabase.from("profiles").select("propietario_id").eq("user_id", userId).single();
    if (prof?.propietario_id) {
      // Delete vehicles first (cascade might handle, but be explicit)
      await supabase.from("vehiculos").delete().eq("propietario_id", prof.propietario_id);
      await supabase.from("propietarios").delete().eq("id", prof.propietario_id);
    }
    toast({ title: "Cuenta eliminada. Puede registrarse en otra compañía." });
    await supabase.auth.signOut();
  };

  const handleDeleteVehiculo = async () => {
    if (!deleteVehiculoAlert) return;
    // Close any assignments for this vehicle
    await supabase.from("asignaciones").update({ estado: "CERRADA", fecha_fin: new Date().toISOString() })
      .eq("vehiculo_id", deleteVehiculoAlert.id).eq("estado", "ACTIVA");
    const { error } = await supabase.from("vehiculos").delete().eq("id", deleteVehiculoAlert.id);
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
  const [stats, setStats] = useState<Stats>({
    vehiculos: 0, conductores: 0, viajesHoy: 0,
    viajesBorrador: 0, viajesCerrados: 0, asignacionesActivas: 0,
  });
  const [recentViajes, setRecentViajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Assignment state
  const [unassignedConductores, setUnassignedConductores] = useState<any[]>([]);
  const [unassignedVehiculos, setUnassignedVehiculos] = useState<any[]>([]);
  const [selectedConductor, setSelectedConductor] = useState("");
  const [selectedVehiculo, setSelectedVehiculo] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (role !== "GERENCIA") return;

      const today = new Date().toISOString().split("T")[0];

      const [vehiculosRes, conductoresRes, viajesHoyRes, borradorRes, cerradosRes, asignacionesRes, recentRes, allCond, allVeh] =
        await Promise.all([
          supabase.from("vehiculos").select("id", { count: "exact", head: true }),
          supabase.from("conductores").select("id", { count: "exact", head: true }),
          supabase.from("viajes").select("id", { count: "exact", head: true }).gte("fecha_salida", today).lt("fecha_salida", today + "T23:59:59"),
          supabase.from("viajes").select("id", { count: "exact", head: true }).eq("estado", "BORRADOR"),
          supabase.from("viajes").select("id", { count: "exact", head: true }).eq("estado", "CERRADO"),
          supabase.from("asignaciones").select("conductor_id, vehiculo_id").eq("estado", "ACTIVA"),
          supabase.from("viajes").select("*").order("created_at", { ascending: false }).limit(5),
          supabase.from("conductores").select("id, nombres").eq("estado", "HABILITADO"),
          supabase.from("vehiculos").select("id, placa, marca, modelo").eq("estado", "HABILITADO"),
        ]);

      const activeAsignaciones = asignacionesRes.data || [];
      const assignedConductorIds = new Set(activeAsignaciones.map((a: any) => a.conductor_id));
      const assignedVehiculoIds = new Set(activeAsignaciones.map((a: any) => a.vehiculo_id));

      setUnassignedConductores((allCond.data || []).filter((c: any) => !assignedConductorIds.has(c.id)));
      setUnassignedVehiculos((allVeh.data || []).filter((v: any) => !assignedVehiculoIds.has(v.id)));

      setStats({
        vehiculos: vehiculosRes.count || 0,
        conductores: conductoresRes.count || 0,
        viajesHoy: viajesHoyRes.count || 0,
        viajesBorrador: borradorRes.count || 0,
        viajesCerrados: cerradosRes.count || 0,
        asignacionesActivas: activeAsignaciones.length,
      });
      setRecentViajes(recentRes.data || []);
      setLoading(false);
    };

    if (role) fetchStats();
  }, [role]);

  if (role === "PROPIETARIO") return <PropietarioDashboard profile={profile} suspended={suspended} />;
  if (role === "CONDUCTOR") return <ConductorDashboard profile={profile} suspended={suspended} />;

  const handleAssign = async () => {
    if (!selectedConductor || !selectedVehiculo || !empresaId) return;
    setAssigning(true);
    const { error } = await supabase.from("asignaciones").insert({
      conductor_id: selectedConductor,
      vehiculo_id: selectedVehiculo,
      empresa_id: empresaId,
    });
    setAssigning(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Conductor asignado al vehículo exitosamente" });
      setSelectedConductor("");
      setSelectedVehiculo("");
      const [asigRes, allCond, allVeh] = await Promise.all([
        supabase.from("asignaciones").select("conductor_id, vehiculo_id").eq("estado", "ACTIVA"),
        supabase.from("conductores").select("id, nombres").eq("estado", "HABILITADO"),
        supabase.from("vehiculos").select("id, placa, marca, modelo").eq("estado", "HABILITADO"),
      ]);
      const active = asigRes.data || [];
      const cIds = new Set(active.map((a: any) => a.conductor_id));
      const vIds = new Set(active.map((a: any) => a.vehiculo_id));
      setUnassignedConductores((allCond.data || []).filter((c: any) => !cIds.has(c.id)));
      setUnassignedVehiculos((allVeh.data || []).filter((v: any) => !vIds.has(v.id)));
      setStats(prev => ({ ...prev, asignacionesActivas: active.length }));
    }
  };

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

        {/* Assignment section */}
        {(unassignedConductores.length > 0 || unassignedVehiculos.length > 0) && (
          <motion.div variants={item}>
            <Card className="border-0 shadow-sm border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-primary" />
                  Asignar Conductor a Vehículo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Conductores sin vehículo ({unassignedConductores.length})</p>
                    <Select value={selectedConductor} onValueChange={setSelectedConductor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar conductor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedConductores.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.nombres}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Vehículos sin conductor ({unassignedVehiculos.length})</p>
                    <Select value={selectedVehiculo} onValueChange={setSelectedVehiculo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar vehículo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedVehiculos.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAssign} disabled={!selectedConductor || !selectedVehiculo || assigning} className="gap-2">
                    <LinkIcon className="w-4 h-4" />
                    {assigning ? "Asignando..." : "Asignar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

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
                        <Badge variant="secondary">{viaje.estado}</Badge>
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
