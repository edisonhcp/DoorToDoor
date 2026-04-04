import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Search, Ban, CheckCircle2, Trash2, MoreVertical, X, User, Car, Shield, Gauge, MapPin, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { StorageImage } from "@/components/StorageImage";
import { Separator } from "@/components/ui/separator";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { fetchVehiculos, toggleVehiculoEstado, deleteVehiculo, fetchConductoresDisponibles, assignConductorToVehiculo } from "@/services/vehiculosService";
import { unassignConductor } from "@/services/conductoresService";
import { insertAuditLog } from "@/services/auditService";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function AgencyVehiculos() {
  const { role, empresaId, user } = useAuth();
  const { toast } = useToast();
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [conductoresDisponibles, setConductoresDisponibles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteAlert, setDeleteAlert] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);

  const loadData = async () => {
    const [vehs, conds] = await Promise.all([
      fetchVehiculos(),
      fetchConductoresDisponibles(),
    ]);
    setVehiculos(vehs);
    setConductoresDisponibles(conds);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (role !== "GERENCIA") return <Navigate to="/dashboard" replace />;

  const enRutaMsg = "No se puede realizar esta acción porque el vehículo tiene una ruta asignada o en curso. Espere a que finalice.";

  const handleToggleEstado = async (v: any) => {
    if (v.en_ruta) { toast({ title: "En ruta", description: enRutaMsg, variant: "destructive" }); return; }
    const { error, newEstado } = await toggleVehiculoEstado(v);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: newEstado === "HABILITADO" ? "Vehículo habilitado" : "Vehículo suspendido" }); loadData(); }
  };

  const handleDelete = async () => {
    if (!deleteAlert) return;
    if (deleteAlert.en_ruta) { toast({ title: "En ruta", description: enRutaMsg, variant: "destructive" }); setDeleteAlert(null); return; }
    const { error } = await deleteVehiculo(deleteAlert);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      if (empresaId) {
        insertAuditLog({ empresa_id: empresaId, accion: "VEHICULO_ELIMINADO", user_id: user?.id, rol: "GERENCIA", antes: { placa: deleteAlert.placa, marca: deleteAlert.marca, modelo: deleteAlert.modelo } });
      }
      toast({ title: "Vehículo eliminado" }); loadData();
      if (selected?.id === deleteAlert.id) setSelected(null);
    }
    setDeleteAlert(null);
  };

  const handleAssignConductor = async (vehiculoId: string, conductorId: string) => {
    if (!empresaId) return;
    const { error } = await assignConductorToVehiculo(vehiculoId, conductorId, empresaId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      insertAuditLog({ empresa_id: empresaId, accion: "ASIGNACION_CREADA", user_id: user?.id, rol: "GERENCIA", despues: { vehiculo_id: vehiculoId, conductor_id: conductorId } });
      toast({ title: "Conductor asignado al vehículo" }); loadData();
    }
  };

  const handleUnassignFromVehiculo = async (v: any) => {
    if (v.en_ruta) { toast({ title: "En ruta", description: enRutaMsg, variant: "destructive" }); return; }
    const { error } = await unassignConductor({ id: v.conductor_id });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Conductor desvinculado del vehículo" }); loadData(); }
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

        <div className="flex gap-6">
          <motion.div variants={item} className={selected ? "flex-1 min-w-0" : "w-full"}>
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
                        <TableHead>Propietario</TableHead>
                        <TableHead>Conductor</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(v => (
                        <TableRow
                          key={v.id}
                          className={`cursor-pointer ${selected?.id === v.id ? "bg-accent" : ""}`}
                          onClick={() => setSelected(selected?.id === v.id ? null : v)}
                        >
                          <TableCell className="font-medium">{v.placa}</TableCell>
                          <TableCell>{v.marca} {v.modelo}</TableCell>
                          <TableCell>{v.tipo}</TableCell>
                          <TableCell>{v.propietarios?.nombres || "—"}</TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            {v.conductor_nombre ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">{v.conductor_nombre}</Badge>
                                {!v.en_ruta && (
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUnassignFromVehiculo(v)}>
                                    <Ban className="w-3 h-3 text-muted-foreground" />
                                  </Button>
                                )}
                                {v.en_ruta && <Badge variant="secondary" className="text-xs">En uso</Badge>}
                              </div>
                            ) : v.estado === "INHABILITADO" ? (
                              <span className="text-xs text-muted-foreground">Suspendido</span>
                            ) : (
                              <Select onValueChange={(cId) => handleAssignConductor(v.id, cId)}>
                                <SelectTrigger className="h-8 w-[160px] text-xs">
                                  <SelectValue placeholder="Asignar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {conductoresDisponibles.length === 0 ? (
                                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No hay disponibles</div>
                                  ) : conductoresDisponibles.map(c => (
                                    <SelectItem key={c.id} value={c.id} className="text-xs">{c.nombres} {c.apellidos}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={v.estado === "HABILITADO" ? "default" : "destructive"} className="text-xs">{v.estado}</Badge>
                          </TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
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

          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                className="w-[380px] shrink-0"
              >
                <Card className="border shadow-md sticky top-4">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {selected.foto_url ? (
                          <StorageImage src={selected.foto_url} alt="Vehículo" className="w-14 h-14 rounded-lg object-cover border" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Car className="w-7 h-7 text-primary" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-lg">{selected.placa}</CardTitle>
                          <p className="text-xs text-muted-foreground">{selected.marca} {selected.modelo}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Palette className="w-3.5 h-3.5" />
                        <span>Color: <span className="font-medium text-foreground">{selected.color}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Gauge className="w-3.5 h-3.5" />
                        <span>Cap: <span className="font-medium text-foreground">{selected.capacidad}</span></span>
                      </div>
                      <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{selected.tipo}</span></div>
                      <div><span className="text-muted-foreground">Año:</span> <span className="font-medium">{selected.anio || "—"}</span></div>
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        <span className="text-muted-foreground">GPS:</span> <span className="font-medium">{selected.gps ? "Sí" : "No"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        <span className="text-muted-foreground">Seguro:</span> <span className="font-medium">{selected.seguro ? "Sí" : "No"}</span>
                      </div>
                    </div>

                    <div>
                      <Badge variant={selected.estado === "HABILITADO" ? "default" : "destructive"} className="text-xs">{selected.estado}</Badge>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-primary" /> Propietario
                      </h4>
                      {selected.propietarios ? (
                        <div className="p-3 rounded-lg bg-muted/50 border text-xs space-y-1">
                          <div className="font-semibold">{selected.propietarios.nombres} {selected.propietarios.apellidos}</div>
                          <div className="text-muted-foreground">{selected.propietarios.identificacion}</div>
                          <div className="text-muted-foreground">{selected.propietarios.celular}</div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Sin propietario</p>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-primary" /> Conductor
                      </h4>
                      {selected.conductor_nombre ? (
                        <div className="p-3 rounded-lg bg-muted/50 border text-xs space-y-1">
                          <div className="font-semibold">{selected.conductor_nombre}</div>
                          {selected.en_ruta && <Badge variant="secondary" className="text-[10px]">En ruta</Badge>}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Sin conductor asignado</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
