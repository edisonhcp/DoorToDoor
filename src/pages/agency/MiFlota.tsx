import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCheck, Truck, Users, Search, Ban, CheckCircle2, Trash2, MoreVertical,
  X, ChevronUp, User, Car, Phone, Mail, MapPin, Calendar, CreditCard, Shield, Gauge, Palette, Filter
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { fetchPropietarios, deletePropietario } from "@/services/propietariosService";
import { fetchVehiculos, toggleVehiculoEstado, deleteVehiculo, fetchConductoresDisponibles, assignConductorToVehiculo } from "@/services/vehiculosService";
import { fetchConductores, toggleConductorEstado, deleteConductor, unassignConductor } from "@/services/conductoresService";
import { fetchVehiculosDisponiblesParaConductor } from "@/services/vehiculosService";
import { fetchAlimentacionByVehiculos, VehiculoAlimentacion } from "@/services/alimentacionService";
import { insertAuditLog } from "@/services/auditService";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const anim = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function MiFlota() {
  const { role, empresaId, user } = useAuth();
  const { toast } = useToast();

  const [propietarios, setPropietarios] = useState<any[]>([]);
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [conductores, setConductores] = useState<any[]>([]);
  const [conductoresDisponibles, setConductoresDisponibles] = useState<any[]>([]);
  const [vehiculosDisponibles, setVehiculosDisponibles] = useState<any[]>([]);
  const [alimMap, setAlimMap] = useState<Record<string, VehiculoAlimentacion>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterPropietario, setFilterPropietario] = useState("");
  const [filterPlaca, setFilterPlaca] = useState("");
  const [filterConductor, setFilterConductor] = useState("");

  const [deleteAlert, setDeleteAlert] = useState<{ type: string; item: any } | null>(null);
  const [selected, setSelected] = useState<{ type: string; item: any } | null>(null);
  const [activeTab, setActiveTab] = useState("propietarios");

  const loadData = async () => {
    setLoading(true);
    const [props, vehs, conds, condsDisp, vehsDisp] = await Promise.all([
      fetchPropietarios(),
      fetchVehiculos(),
      fetchConductores(),
      fetchConductoresDisponibles(),
      fetchVehiculosDisponiblesParaConductor(),
    ]);
    setPropietarios(props);
    setVehiculos(vehs);
    setConductores(conds);
    setConductoresDisponibles(condsDisp);
    setVehiculosDisponibles(vehsDisp);

    const vehiculoIds = conds.filter((c: any) => c.vehiculo?.id).map((c: any) => c.vehiculo.id);
    if (vehiculoIds.length > 0) {
      const { data: alims } = await fetchAlimentacionByVehiculos(vehiculoIds);
      const map: Record<string, VehiculoAlimentacion> = {};
      alims.forEach((a) => { map[a.vehiculo_id] = a; });
      setAlimMap(map);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  

  // Filtered data
  const filteredPropietarios = useMemo(() => {
    return propietarios.filter(p => {
      if (filterPropietario && !`${p.nombres} ${p.apellidos}`.toLowerCase().includes(filterPropietario.toLowerCase())) return false;
      if (filterPlaca && !(p.vehiculos || []).some((v: any) => v.placa.toLowerCase().includes(filterPlaca.toLowerCase()))) return false;
      return true;
    });
  }, [propietarios, filterPropietario, filterPlaca]);

  const filteredVehiculos = useMemo(() => {
    return vehiculos.filter(v => {
      if (filterPlaca && !v.placa.toLowerCase().includes(filterPlaca.toLowerCase())) return false;
      if (filterPropietario && !(v.propietarios?.nombres || "").toLowerCase().includes(filterPropietario.toLowerCase())) return false;
      if (filterConductor && !(v.conductor_nombre || "").toLowerCase().includes(filterConductor.toLowerCase())) return false;
      return true;
    });
  }, [vehiculos, filterPlaca, filterPropietario, filterConductor]);

  const filteredConductores = useMemo(() => {
    return conductores.filter(c => {
      if (filterConductor && !`${c.nombres} ${c.apellidos}`.toLowerCase().includes(filterConductor.toLowerCase())) return false;
      if (filterPlaca && !(c.vehiculo?.placa || "").toLowerCase().includes(filterPlaca.toLowerCase())) return false;
      return true;
    });
  }, [conductores, filterConductor, filterPlaca]);

  if (role !== "GERENCIA") return <Navigate to="/dashboard" replace />;

  const calcAge = (fecha: string) => {
    const birth = new Date(fecha);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const enRutaMsg = "No se puede realizar esta acción porque tiene una ruta asignada o en curso.";

  // Handlers
  const handleDeletePropietario = async () => {
    if (!deleteAlert || deleteAlert.type !== "propietario") return;
    const { error } = await deletePropietario(deleteAlert.item);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      if (empresaId) insertAuditLog({ empresa_id: empresaId, accion: "PROPIETARIO_ELIMINADO", user_id: user?.id, rol: "GERENCIA", antes: { nombres: deleteAlert.item.nombres, apellidos: deleteAlert.item.apellidos, identificacion: deleteAlert.item.identificacion } });
      toast({ title: "Propietario eliminado" });
      if (selected?.item?.id === deleteAlert.item.id) setSelected(null);
      loadData();
    }
    setDeleteAlert(null);
  };

  const handleToggleVehiculoEstado = async (v: any) => {
    if (v.en_ruta) { toast({ title: "En ruta", description: enRutaMsg, variant: "destructive" }); return; }
    const { error, newEstado } = await toggleVehiculoEstado(v);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: newEstado === "HABILITADO" ? "Vehículo habilitado" : "Vehículo suspendido" }); loadData(); }
  };

  const handleDeleteVehiculo = async () => {
    if (!deleteAlert || deleteAlert.type !== "vehiculo") return;
    const v = deleteAlert.item;
    if (v.en_ruta) { toast({ title: "En ruta", description: enRutaMsg, variant: "destructive" }); setDeleteAlert(null); return; }
    const { error } = await deleteVehiculo(v);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      if (empresaId) insertAuditLog({ empresa_id: empresaId, accion: "VEHICULO_ELIMINADO", user_id: user?.id, rol: "GERENCIA", antes: { placa: v.placa, marca: v.marca, modelo: v.modelo } });
      toast({ title: "Vehículo eliminado" });
      if (selected?.item?.id === v.id) setSelected(null);
      loadData();
    }
    setDeleteAlert(null);
  };

  const handleToggleConductorEstado = async (c: any) => {
    if (c.en_ruta) { toast({ title: "En ruta", description: enRutaMsg, variant: "destructive" }); return; }
    const { error, newEstado } = await toggleConductorEstado(c);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: newEstado === "HABILITADO" ? "Conductor habilitado" : "Conductor suspendido" }); loadData(); }
  };

  const handleDeleteConductor = async () => {
    if (!deleteAlert || deleteAlert.type !== "conductor") return;
    const c = deleteAlert.item;
    if (c.en_ruta) { toast({ title: "En ruta", description: enRutaMsg, variant: "destructive" }); setDeleteAlert(null); return; }
    const { error } = await deleteConductor(c);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setDeleteAlert(null); return; }
    if (empresaId) insertAuditLog({ empresa_id: empresaId, accion: "CONDUCTOR_ELIMINADO", user_id: user?.id, rol: "GERENCIA", antes: { nombres: c.nombres, apellidos: c.apellidos, identificacion: c.identificacion } });
    toast({ title: "Conductor eliminado" });
    if (selected?.item?.id === c.id) setSelected(null);
    setDeleteAlert(null);
    loadData();
  };

  const handleAssignConductorToVeh = async (vehiculoId: string, conductorId: string) => {
    if (!empresaId) return;
    const { error } = await assignConductorToVehiculo(vehiculoId, conductorId, empresaId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      insertAuditLog({ empresa_id: empresaId, accion: "ASIGNACION_CREADA", user_id: user?.id, rol: "GERENCIA", despues: { vehiculo_id: vehiculoId, conductor_id: conductorId } });
      toast({ title: "Conductor asignado" }); loadData();
    }
  };

  const handleUnassignFromVeh = async (v: any) => {
    if (v.en_ruta) { toast({ title: "En ruta", description: enRutaMsg, variant: "destructive" }); return; }
    const { error } = await unassignConductor({ id: v.conductor_id });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Conductor desvinculado" }); loadData(); }
  };

  const handleUnassignConductor = async (c: any) => {
    if (c.en_ruta) { toast({ title: "En ruta", description: enRutaMsg, variant: "destructive" }); return; }
    const { error } = await unassignConductor(c);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Vehículo desvinculado" }); loadData(); }
  };

  const handleAssignVehToConductor = async (conductorId: string, vehiculoId: string) => {
    if (!empresaId) return;
    const { error } = await assignConductorToVehiculo(vehiculoId, conductorId, empresaId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      insertAuditLog({ empresa_id: empresaId, accion: "ASIGNACION_CREADA", user_id: user?.id, rol: "GERENCIA", despues: { conductor_id: conductorId, vehiculo_id: vehiculoId } });
      toast({ title: "Vehículo asignado" }); loadData();
    }
  };

  const handleDelete = () => {
    if (!deleteAlert) return;
    if (deleteAlert.type === "propietario") handleDeletePropietario();
    else if (deleteAlert.type === "vehiculo") handleDeleteVehiculo();
    else if (deleteAlert.type === "conductor") handleDeleteConductor();
  };

  const clearFilters = () => { setFilterPropietario(""); setFilterPlaca(""); setFilterConductor(""); };
  const hasFilters = filterPropietario || filterPlaca || filterConductor;

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={anim}>
          <h1 className="text-3xl font-display font-bold text-foreground">Mi Flota</h1>
          <p className="text-muted-foreground mt-1">Vista consolidada de propietarios, vehículos y conductores</p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelected(null); }}>
          <motion.div variants={anim}>
            <TabsList className="mb-4">
              <TabsTrigger value="propietarios" className="gap-2">
                <UserCheck className="w-4 h-4" /> Propietarios ({filteredPropietarios.length})
              </TabsTrigger>
              <TabsTrigger value="vehiculos" className="gap-2">
                <Truck className="w-4 h-4" /> Vehículos ({filteredVehiculos.length})
              </TabsTrigger>
              <TabsTrigger value="conductores" className="gap-2">
                <Users className="w-4 h-4" /> Conductores ({filteredConductores.length})
              </TabsTrigger>
            </TabsList>
          </motion.div>

          {/* Filters */}
          <motion.div variants={anim} className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="relative">
              <Input
                placeholder="Propietario..."
                value={filterPropietario}
                onChange={e => setFilterPropietario(e.target.value)}
                className="h-9 w-44 text-sm"
              />
            </div>
            <div className="relative">
              <Input
                placeholder="Placa..."
                value={filterPlaca}
                onChange={e => setFilterPlaca(e.target.value)}
                className="h-9 w-36 text-sm"
              />
            </div>
            <div className="relative">
              <Input
                placeholder="Conductor..."
                value={filterConductor}
                onChange={e => setFilterConductor(e.target.value)}
                className="h-9 w-44 text-sm"
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
                <X className="w-3 h-3 mr-1" /> Limpiar
              </Button>
            )}
          </motion.div>




          {/* Tab: Propietarios */}
          <TabsContent value="propietarios">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">Cargando...</div>
                ) : filteredPropietarios.length === 0 ? (
                  <div className="p-8 text-center">
                    <UserCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-muted-foreground">No se encontraron propietarios</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombres</TableHead>
                        <TableHead>Apellidos</TableHead>
                        <TableHead>Identificación</TableHead>
                        <TableHead>Celular</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPropietarios.map(p => (
                        <TableRow
                          key={p.id}
                          className={`cursor-pointer ${selected?.type === "propietario" && selected?.item?.id === p.id ? "bg-accent" : ""}`}
                          onClick={() => setSelected(selected?.type === "propietario" && selected?.item?.id === p.id ? null : { type: "propietario", item: p })}
                        >
                          <TableCell className="font-medium">{p.nombres}</TableCell>
                          <TableCell>{p.apellidos}</TableCell>
                          <TableCell>{p.identificacion}</TableCell>
                          <TableCell>{p.celular}</TableCell>
                          <TableCell>
                            <Badge variant={p.estado === "HABILITADO" ? "default" : "destructive"} className="text-xs">{p.estado}</Badge>
                          </TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteAlert({ type: "propietario", item: p })}>
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
          </TabsContent>

          {/* Tab: Vehículos */}
          <TabsContent value="vehiculos">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">Cargando...</div>
                ) : filteredVehiculos.length === 0 ? (
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
                      {filteredVehiculos.map(v => (
                        <TableRow
                          key={v.id}
                          className={`cursor-pointer ${selected?.type === "vehiculo" && selected?.item?.id === v.id ? "bg-accent" : ""}`}
                          onClick={() => setSelected(selected?.type === "vehiculo" && selected?.item?.id === v.id ? null : { type: "vehiculo", item: v })}
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
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUnassignFromVeh(v)}>
                                    <Ban className="w-3 h-3 text-muted-foreground" />
                                  </Button>
                                )}
                                {v.en_ruta && <Badge variant="secondary" className="text-xs">En uso</Badge>}
                              </div>
                            ) : v.estado === "INHABILITADO" ? (
                              <span className="text-xs text-muted-foreground">Suspendido</span>
                            ) : (
                              <Select onValueChange={(cId) => handleAssignConductorToVeh(v.id, cId)}>
                                <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Asignar" /></SelectTrigger>
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
                                <DropdownMenuItem onClick={() => handleToggleVehiculoEstado(v)}>
                                  {v.estado === "HABILITADO" ? <><Ban className="w-4 h-4 mr-2" /> Suspender</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Habilitar</>}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteAlert({ type: "vehiculo", item: v })}>
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
          </TabsContent>

          {/* Tab: Conductores */}
          <TabsContent value="conductores">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">Cargando...</div>
                ) : filteredConductores.length === 0 ? (
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
                      {filteredConductores.map(c => (
                        <TableRow
                          key={c.id}
                          className={`cursor-pointer ${selected?.type === "conductor" && selected?.item?.id === c.id ? "bg-accent" : ""}`}
                          onClick={() => setSelected(selected?.type === "conductor" && selected?.item?.id === c.id ? null : { type: "conductor", item: c })}
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
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUnassignConductor(c)}>
                                      <Ban className="w-3 h-3 text-muted-foreground" />
                                    </Button>
                                  )}
                                  {c.en_ruta && <Badge variant="secondary" className="text-xs">En uso</Badge>}
                                </div>
                              )
                            ) : c.estado === "INHABILITADO" ? (
                              <span className="text-xs text-muted-foreground">Suspendido</span>
                            ) : (
                              <Select onValueChange={(vId) => handleAssignVehToConductor(c.id, vId)}>
                                <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Asignar" /></SelectTrigger>
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
                                <DropdownMenuItem onClick={() => handleToggleConductorEstado(c)}>
                                  {c.estado === "HABILITADO" ? <><Ban className="w-4 h-4 mr-2" /> Suspender</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Habilitar</>}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteAlert({ type: "conductor", item: c })}>
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
          </TabsContent>
        </Tabs>
      </motion.div>

      <AlertDialog open={!!deleteAlert} onOpenChange={() => setDeleteAlert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteAlert?.type === "propietario" ? "¿Eliminar propietario?" : deleteAlert?.type === "vehiculo" ? "¿Eliminar vehículo?" : "¿Eliminar conductor?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente {deleteAlert?.type === "vehiculo" ? <strong>{deleteAlert?.item?.placa}</strong> : <strong>{deleteAlert?.item?.nombres}</strong>}.
            </AlertDialogDescription>
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
