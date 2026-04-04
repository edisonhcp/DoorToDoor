import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserCheck, Search, Trash2, MoreVertical, X, Phone, Mail, MapPin, Calendar, Car, User } from "lucide-react";
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
import { fetchPropietarios, deletePropietario } from "@/services/propietariosService";
import { insertAuditLog } from "@/services/auditService";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function AgencyPropietarios() {
  const { role, empresaId, user } = useAuth();
  const { toast } = useToast();
  const [propietarios, setPropietarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteAlert, setDeleteAlert] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);

  const loadData = async () => {
    setPropietarios(await fetchPropietarios());
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (role !== "GERENCIA") return <Navigate to="/dashboard" replace />;

  const handleDelete = async () => {
    if (!deleteAlert) return;
    const { error } = await deletePropietario(deleteAlert);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setDeleteAlert(null); return; }
    if (empresaId) {
      insertAuditLog({ empresa_id: empresaId, accion: "PROPIETARIO_ELIMINADO", user_id: user?.id, rol: "GERENCIA", antes: { nombres: deleteAlert.nombres, apellidos: deleteAlert.apellidos, identificacion: deleteAlert.identificacion } });
    }
    toast({ title: "Propietario eliminado" });
    setDeleteAlert(null);
    if (selected?.id === deleteAlert.id) setSelected(null);
    loadData();
  };

  const filtered = propietarios.filter(p =>
    `${p.nombres} ${p.apellidos}`.toLowerCase().includes(search.toLowerCase()) ||
    p.identificacion.includes(search)
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
          <h1 className="text-3xl font-display font-bold text-foreground">Propietarios</h1>
          <p className="text-muted-foreground mt-1">Gestiona los propietarios de vehículos</p>
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
                      {filtered.map(p => (
                        <TableRow
                          key={p.id}
                          className={`cursor-pointer ${selected?.id === p.id ? "bg-accent" : ""}`}
                          onClick={() => setSelected(selected?.id === p.id ? null : p)}
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
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteAlert(p)}>
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
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="truncate text-xs">{selected.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span className="text-xs">{selected.celular}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate text-xs">{selected.direccion}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-xs">{calcAge(selected.fecha_nacimiento)} años</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Identificación:</span> <span className="font-medium">{selected.identificacion}</span></div>
                      <div><span className="text-muted-foreground">Nacionalidad:</span> <span className="font-medium">{selected.nacionalidad}</span></div>
                      <div><span className="text-muted-foreground">Estado civil:</span> <span className="font-medium">{selected.estado_civil}</span></div>
                      <div>
                        <Badge variant={selected.estado === "HABILITADO" ? "default" : "destructive"} className="text-xs">{selected.estado}</Badge>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                        <Car className="w-4 h-4 text-primary" /> Vehículos ({selected.vehiculos?.length || 0})
                      </h4>
                      {!selected.vehiculos || selected.vehiculos.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sin vehículos registrados</p>
                      ) : (
                        <div className="space-y-2">
                          {selected.vehiculos.map((v: any) => (
                            <div key={v.id} className="p-3 rounded-lg bg-muted/50 border text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">{v.placa}</span>
                                <Badge variant={v.estado === "HABILITADO" ? "default" : "destructive"} className="text-[10px]">{v.estado}</Badge>
                              </div>
                              <div className="text-muted-foreground">{v.marca} {v.modelo} {v.anio ? `(${v.anio})` : ""}</div>
                              <div className="text-muted-foreground">Tipo: {v.tipo}</div>
                            </div>
                          ))}
                        </div>
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
            <AlertDialogTitle>¿Eliminar propietario?</AlertDialogTitle>
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
