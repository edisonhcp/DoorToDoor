import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Search, Ban, CheckCircle2, Trash2, MoreVertical, X, User, Car, Phone, Mail, MapPin, Calendar, CreditCard } from "lucide-react";
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
import { fetchConductores, toggleConductorEstado, deleteConductor, unassignConductor } from "@/services/conductoresService";
import { fetchVehiculosDisponiblesParaConductor, assignConductorToVehiculo } from "@/services/vehiculosService";
import { fetchAlimentacionByVehiculos, VehiculoAlimentacion } from "@/services/alimentacionService";
import { insertAuditLog } from "@/services/auditService";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function AgencyConductores() {
  const { role, empresaId, user } = useAuth();
  const { toast } = useToast();
  const [conductores, setConductores] = useState<any[]>([]);
  const [vehiculosDisponibles, setVehiculosDisponibles] = useState<any[]>([]);
  const [alimMap, setAlimMap] = useState<Record<string, VehiculoAlimentacion>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteAlert, setDeleteAlert] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);

  const loadData = async () => {
    const [conds, vehs] = await Promise.all([
      fetchConductores(),
      fetchVehiculosDisponiblesParaConductor(),
    ]);
    setConductores(conds);
    setVehiculosDisponibles(vehs);

    const vehiculoIds = conds
      .filter((c: any) => c.vehiculo?.id)
      .map((c: any) => c.vehiculo.id);
    if (vehiculoIds.length > 0) {
      const { data: alims } = await fetchAlimentacionByVehiculos(vehiculoIds);
      const map: Record<string, VehiculoAlimentacion> = {};
      alims.forEach((a) => { map[a.vehiculo_id] = a; });
      setAlimMap(map);
    }

    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (role !== "GERENCIA") return <Navigate to="/dashboard" replace />;

  const enRutaMsg = "No se puede realizar esta acción porque el conductor tiene una ruta asignada o en curso. Espere a que finalice.";

  const handleToggleEstado = async (c: any) => {
    if (c.en_ruta) { toast({ title: "En ruta", description: enRutaMsg, variant: "destructive" }); return; }
    const { error, newEstado } = await toggleConductorEstado(c);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: newEstado === "HABILITADO" ? "Conductor habilitado" : "Conductor suspendido" }); loadData(); }
  };

  const handleDelete = async () => {
    if (!deleteAlert) return;
    if (deleteAlert.en_ruta) { toast({ title: "En ruta", description: enRutaMsg, variant: "destructive" }); setDeleteAlert(null); return; }
    const { error } = await deleteConductor(deleteAlert);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setDeleteAlert(null); return; }
    if (empresaId) {
      insertAuditLog({ empresa_id: empresaId, accion: "CONDUCTOR_ELIMINADO", user_id: user?.id, rol: "GERENCIA", antes: { nombres: deleteAlert.nombres, apellidos: deleteAlert.apellidos, identificacion: deleteAlert.identificacion } });
    }
    toast({ title: "Conductor eliminado" });
    if (selected?.id === deleteAlert.id) setSelected(null);
    setDeleteAlert(null);
    loadData();
  };

  const handleUnassign = async (c: any) => {
    if (c.en_ruta) { toast({ title: "En ruta", description: enRutaMsg, variant: "destructive" }); return; }
    const { error } = await unassignConductor(c);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Asignación de vehículo eliminada" }); loadData(); }
  };

  const handleAssignVehiculo = async (conductorId: string, vehiculoId: string) => {
    if (!empresaId) return;
    const { error } = await assignConductorToVehiculo(vehiculoId, conductorId, empresaId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      insertAuditLog({ empresa_id: empresaId, accion: "ASIGNACION_CREADA", user_id: user?.id, rol: "GERENCIA", despues: { conductor_id: conductorId, vehiculo_id: vehiculoId } });
      toast({ title: "Vehículo asignado al conductor" }); loadData();
    }
  };

  const filtered = conductores.filter(c =>
    `${c.nombres} ${c.apellidos}`.toLowerCase().includes(search.toLowerCase()) ||
    c.identificacion.includes(search)
  );

  const calcAge = (fecha: string) => {
    const birth = new Date(fecha);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  };

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

        <div className="flex gap-6">
          <motion.div variants={item} className={selected ? "flex-1 min-w-0" : "w-full"}>
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
                        <TableHead>Nombres</TableHead>
                        <TableHead>Apellidos</TableHead>
                        <TableHead>Identificación</TableHead>
                        <TableHead>Celular</TableHead>
                        <TableHead>Vehículo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(c => (
                        <TableRow
                          key={c.id}
                          className={`cursor-pointer ${selected?.id === c.id ? "bg-accent" : ""}`}
                          onClick={() => setSelected(selected?.id === c.id ? null : c)}
                        >
                          <TableCell className="font-medium">{c.nombres}</TableCell>
                          <TableCell>{c.apellidos}</TableCell>
                          <TableCell>{c.identificacion}</TableCell>
                          <TableCell>{c.celular}</TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            {c.vehiculo ? (
                              c.vehiculo.estado === "INHABILITADO" ? (
                                <Badge variant="destructive" className="text-xs">INHABILITADO</Badge>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">{c.vehiculo.placa}</Badge>
                                  {!c.en_ruta && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUnassign(c)}>
                                      <Ban className="w-3 h-3 text-muted-foreground" />
                                    </Button>
                                  )}
                                  {c.en_ruta && <Badge variant="secondary" className="text-xs">En uso</Badge>}
                                </div>
                              )
                            ) : c.estado === "INHABILITADO" ? (
                              <span className="text-xs text-muted-foreground">Suspendido</span>
                            ) : (
                              <Select onValueChange={(vId) => handleAssignVehiculo(c.id, vId)}>
                                <SelectTrigger className="h-8 w-[160px] text-xs">
                                  <SelectValue placeholder="Asignar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {vehiculosDisponibles.length === 0 ? (
                                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No hay disponibles</div>
                                  ) : vehiculosDisponibles.map(v => (
                                    <SelectItem key={v.id} value={v.id} className="text-xs">{v.placa} — {v.marca}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={c.estado === "HABILITADO" ? "default" : "destructive"} className="text-xs">{c.estado}</Badge>
                          </TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
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
                          <StorageImage src={selected.foto_url} alt="Foto" className="w-14 h-14 rounded-full object-cover border-2 border-primary/20" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-7 h-7 text-primary" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-lg">{selected.nombres} {selected.apellidos}</CardTitle>
                          <p className="text-xs text-muted-foreground">Código: {selected.codigo}</p>
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
                        <Mail className="w-3.5 h-3.5" />
                        <span className="truncate">{selected.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{selected.celular}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{selected.domicilio}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{calcAge(selected.fecha_nacimiento)} años</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Identificación:</span> <span className="font-medium">{selected.identificacion}</span></div>
                      <div><span className="text-muted-foreground">Nacionalidad:</span> <span className="font-medium">{selected.nacionalidad}</span></div>
                      <div><span className="text-muted-foreground">Estado civil:</span> <span className="font-medium">{selected.estado_civil}</span></div>
                      <div className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        <span className="text-muted-foreground">Licencia:</span> <span className="font-medium">{selected.tipo_licencia}</span>
                      </div>
                      <div className="col-span-2 text-muted-foreground">Cad. licencia: <span className="font-medium text-foreground">{selected.fecha_caducidad_licencia}</span></div>
                    </div>

                    <div>
                      <Badge variant={selected.estado === "HABILITADO" ? "default" : "destructive"} className="text-xs">{selected.estado}</Badge>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                        <Car className="w-4 h-4 text-primary" /> Vehículo Asignado
                      </h4>
                      {selected.vehiculo ? (
                        <div className="p-3 rounded-lg bg-muted/50 border text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{selected.vehiculo.placa}</span>
                            <Badge variant={selected.vehiculo.estado === "HABILITADO" ? "default" : "destructive"} className="text-[10px]">{selected.vehiculo.estado}</Badge>
                          </div>
                          <div className="text-muted-foreground">{selected.vehiculo.marca} {selected.vehiculo.modelo}</div>
                          {(() => {
                            if (!selected.vehiculo?.id) return null;
                            const alim = alimMap[selected.vehiculo.id];
                            if (!alim) return null;
                            if (!alim.alimentacion_habilitada) return <div className="text-destructive font-medium">No alimentación</div>;
                            return (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="font-semibold">${alim.valor_comida}</span>
                                {alim.desayuno_habilitado && <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" title="Desayuno" />}
                                {alim.almuerzo_habilitado && <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" title="Almuerzo" />}
                                {alim.merienda_habilitado && <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" title="Merienda" />}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Sin vehículo asignado</p>
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
