import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Search, Ban, CheckCircle2, Trash2, MoreVertical, Truck, LinkIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function AgencyConductores() {
  const { role, empresaId } = useAuth();
  const { toast } = useToast();
  const [conductores, setConductores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteAlert, setDeleteAlert] = useState<any>(null);

  // Assignment state
  const [unassignedConductores, setUnassignedConductores] = useState<any[]>([]);
  const [unassignedVehiculos, setUnassignedVehiculos] = useState<any[]>([]);
  const [selectedConductor, setSelectedConductor] = useState("");
  const [selectedVehiculo, setSelectedVehiculo] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchData = async () => {
    const [condRes, asigRes, vehRes] = await Promise.all([
      supabase.from("conductores").select("*").order("created_at", { ascending: false }),
      supabase.from("asignaciones").select("conductor_id, vehiculo_id, vehiculos(placa, marca, modelo)").eq("estado", "ACTIVA"),
      supabase.from("vehiculos").select("id, placa, marca, modelo").eq("estado", "HABILITADO"),
    ]);

    const conductoresData = condRes.data || [];
    const asignaciones = asigRes.data || [];
    const vehiculosData = vehRes.data || [];

    // Enrich conductores with their assigned vehicle
    const assignedConductorIds = new Set(asignaciones.map((a: any) => a.conductor_id));
    const assignedVehiculoIds = new Set(asignaciones.map((a: any) => a.vehiculo_id));

    const enriched = conductoresData.map((c: any) => {
      const asig = asignaciones.find((a: any) => a.conductor_id === c.id);
      return { ...c, vehiculo: asig?.vehiculos || null };
    });

    setConductores(enriched);
    setUnassignedConductores(conductoresData.filter((c: any) => !assignedConductorIds.has(c.id) && c.estado === "HABILITADO"));
    setUnassignedVehiculos(vehiculosData.filter((v: any) => !assignedVehiculoIds.has(v.id)));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (role !== "GERENCIA") return <Navigate to="/dashboard" replace />;

  const handleToggleEstado = async (c: any) => {
    const newEstado = c.estado === "HABILITADO" ? "INHABILITADO" : "HABILITADO";
    const { error } = await supabase.from("conductores").update({ estado: newEstado }).eq("id", c.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: newEstado === "HABILITADO" ? "Conductor habilitado" : "Conductor suspendido" }); fetchData(); }
  };

  const handleDelete = async () => {
    if (!deleteAlert) return;
    const { error } = await supabase.from("conductores").delete().eq("id", deleteAlert.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Conductor eliminado" }); fetchData(); }
    setDeleteAlert(null);
  };

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
      fetchData();
    }
  };

  const filtered = conductores.filter(c =>
    c.nombres.toLowerCase().includes(search.toLowerCase()) ||
    c.identificacion.includes(search)
  );

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <h1 className="text-3xl font-display font-bold text-foreground">Conductores</h1>
          <p className="text-muted-foreground mt-1">Gestiona los conductores y asigna vehículos</p>
        </motion.div>

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

        <motion.div variants={item} className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o cédula..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Cargando...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No se encontraron conductores</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Identificación</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead>Licencia</TableHead>
                      <TableHead>Vehículo Asignado</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nombres}</TableCell>
                        <TableCell>{c.identificacion}</TableCell>
                        <TableCell>{c.celular}</TableCell>
                        <TableCell>{c.tipo_licencia}</TableCell>
                        <TableCell>
                          {c.vehiculo ? (
                            <Badge variant="outline" className="text-xs">{c.vehiculo.placa} — {c.vehiculo.marca} {c.vehiculo.modelo}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin asignar</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.estado === "HABILITADO" ? "default" : "destructive"} className="text-xs">{c.estado}</Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleToggleEstado(c)}>
                                {c.estado === "HABILITADO" ? <><Ban className="w-4 h-4 mr-2" /> Suspender</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Habilitar</>}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteAlert(c)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <AlertDialog open={!!deleteAlert} onOpenChange={() => setDeleteAlert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar conductor?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará permanentemente a <strong>{deleteAlert?.nombres}</strong>.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
