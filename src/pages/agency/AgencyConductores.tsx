import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Search, Ban, CheckCircle2, Trash2, MoreVertical, Unlink } from "lucide-react";
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

export default function AgencyConductores() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [conductores, setConductores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteAlert, setDeleteAlert] = useState<any>(null);

  const fetchData = async () => {
    const [condRes, asigRes] = await Promise.all([
      supabase.from("conductores").select("*").order("created_at", { ascending: false }),
      supabase.from("asignaciones").select("conductor_id, vehiculo_id, vehiculos(placa, marca, modelo)").eq("estado", "ACTIVA"),
    ]);

    const conductoresData = condRes.data || [];
    const asignaciones = asigRes.data || [];

    const enriched = conductoresData.map((c: any) => {
      const asig = asignaciones.find((a: any) => a.conductor_id === c.id);
      return { ...c, vehiculo: asig?.vehiculos || null };
    });

    setConductores(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (role !== "GERENCIA") return <Navigate to="/dashboard" replace />;

  const handleToggleEstado = async (c: any) => {
    const newEstado = c.estado === "HABILITADO" ? "INHABILITADO" : "HABILITADO";
    if (newEstado === "INHABILITADO" && c.vehiculo) {
      await supabase.from("asignaciones").update({ estado: "CERRADA", fecha_fin: new Date().toISOString() })
        .eq("conductor_id", c.id).eq("estado", "ACTIVA");
    }
    const { error } = await supabase.from("conductores").update({ estado: newEstado }).eq("id", c.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: newEstado === "HABILITADO" ? "Conductor habilitado" : "Conductor suspendido" }); fetchData(); }
  };

  const handleDelete = async () => {
    if (!deleteAlert) return;
    await supabase.from("asignaciones").update({ estado: "CERRADA", fecha_fin: new Date().toISOString() })
      .eq("conductor_id", deleteAlert.id).eq("estado", "ACTIVA");
    const { error } = await supabase.from("conductores").delete().eq("id", deleteAlert.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Conductor eliminado" }); fetchData(); }
    setDeleteAlert(null);
  };

  const handleUnassign = async (c: any) => {
    const { error } = await supabase.from("asignaciones")
      .update({ estado: "CERRADA", fecha_fin: new Date().toISOString() })
      .eq("conductor_id", c.id).eq("estado", "ACTIVA");
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Asignación de vehículo eliminada" }); fetchData(); }
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
          <p className="text-muted-foreground mt-1">Gestiona los conductores de la compañía</p>
        </motion.div>

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
                              {c.vehiculo && (
                                <DropdownMenuItem onClick={() => handleUnassign(c)}>
                                  <Unlink className="w-4 h-4 mr-2" /> Quitar vehículo
                                </DropdownMenuItem>
                              )}
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
