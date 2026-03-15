import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Truck, Search, Ban, CheckCircle2, Trash2, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function AgencyVehiculos() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteAlert, setDeleteAlert] = useState<any>(null);

  const fetchData = async () => {
    const [vehRes, asigRes] = await Promise.all([
      supabase.from("vehiculos").select("*, propietarios(nombres)").order("created_at", { ascending: false }),
      supabase.from("asignaciones").select("vehiculo_id, conductores(nombres)").eq("estado", "ACTIVA"),
    ]);
    const asignaciones = asigRes.data || [];
    const enriched = (vehRes.data || []).map((v: any) => {
      const asig = asignaciones.find((a: any) => a.vehiculo_id === v.id);
      return { ...v, conductor_nombre: asig?.conductores?.nombres || null };
    });
    setVehiculos(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (role !== "GERENCIA") return <Navigate to="/dashboard" replace />;

  const handleToggleEstado = async (v: any) => {
    const newEstado = v.estado === "HABILITADO" ? "INHABILITADO" : "HABILITADO";
    // If suspending, break the assignment
    if (newEstado === "INHABILITADO") {
      await supabase.from("asignaciones").update({ estado: "CERRADA", fecha_fin: new Date().toISOString() })
        .eq("vehiculo_id", v.id).eq("estado", "ACTIVA");
    }
    const { error } = await supabase.from("vehiculos").update({ estado: newEstado }).eq("id", v.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: newEstado === "HABILITADO" ? "Vehículo habilitado" : "Vehículo suspendido" }); fetchData(); }
  };

  const handleDelete = async () => {
    if (!deleteAlert) return;
    // Break assignment first
    await supabase.from("asignaciones").update({ estado: "CERRADA", fecha_fin: new Date().toISOString() })
      .eq("vehiculo_id", deleteAlert.id).eq("estado", "ACTIVA");
    const { error } = await supabase.from("vehiculos").delete().eq("id", deleteAlert.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Vehículo eliminado" }); fetchData(); }
    setDeleteAlert(null);
  };

  const filtered = vehiculos.filter(v =>
    v.placa.toLowerCase().includes(search.toLowerCase()) ||
    v.marca.toLowerCase().includes(search.toLowerCase()) ||
    v.modelo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <h1 className="text-3xl font-display font-bold text-foreground">Vehículos</h1>
          <p className="text-muted-foreground mt-1">Gestiona los vehículos de la compañía</p>
        </motion.div>

        <motion.div variants={item} className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por placa, marca o modelo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Cargando...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <Truck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No se encontraron vehículos</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Placa</TableHead>
                      <TableHead>Marca / Modelo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Email Propietario</TableHead>
                      <TableHead>Conductor</TableHead>
                      <TableHead>Propietario</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(v => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.placa}</TableCell>
                        <TableCell>{v.marca} {v.modelo}</TableCell>
                        <TableCell>{v.tipo}</TableCell>
                        <TableCell>{v.color}</TableCell>
                        <TableCell>
                          {v.conductor_nombre ? (
                            <Badge variant="outline" className="text-xs">{v.conductor_nombre}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin asignar</span>
                          )}
                        </TableCell>
                        <TableCell>{v.propietarios?.nombres || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={v.estado === "HABILITADO" ? "default" : "destructive"} className="text-xs">{v.estado}</Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleToggleEstado(v)}>
                                {v.estado === "HABILITADO" ? <><Ban className="w-4 h-4 mr-2" /> Suspender</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Habilitar</>}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteAlert(v)}>
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
            <AlertDialogTitle>¿Eliminar vehículo?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará permanentemente el vehículo <strong>{deleteAlert?.placa}</strong>.</AlertDialogDescription>
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
