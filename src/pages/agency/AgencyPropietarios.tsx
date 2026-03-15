import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserCheck, Search, Trash2, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
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
import { fetchPropietarios, deletePropietario } from "@/services/propietariosService";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function AgencyPropietarios() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [propietarios, setPropietarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteAlert, setDeleteAlert] = useState<any>(null);

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
    toast({ title: "Propietario eliminado" });
    setDeleteAlert(null);
    loadData();
  };

  const filtered = propietarios.filter(p =>
    `${p.nombres} ${p.apellidos}`.toLowerCase().includes(search.toLowerCase()) ||
    p.identificacion.includes(search)
  );

  const rows: any[] = [];
  filtered.forEach(p => {
    if (p.vehiculos && p.vehiculos.length > 0) {
      p.vehiculos.forEach((v: any) => {
        rows.push({ ...p, vehiculo: v, isFirstOfGroup: rows.length === 0 || rows[rows.length - 1]?.id !== p.id });
      });
    } else {
      rows.push({ ...p, vehiculo: null, isFirstOfGroup: true });
    }
  });

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

        <motion.div variants={item}>
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
                      <TableHead>Email</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={`${row.id}-${row.vehiculo?.id || idx}`}>
                        <TableCell className="font-medium">{row.nombres}</TableCell>
                        <TableCell>{row.apellidos}</TableCell>
                        <TableCell>{row.identificacion}</TableCell>
                        <TableCell>{row.celular}</TableCell>
                        <TableCell className="text-xs">{row.email}</TableCell>
                        <TableCell>
                          {row.vehiculo ? (
                            <div className="flex items-center gap-2">
                              <span>{row.vehiculo.marca}</span>
                              {row.vehiculo.estado === "INHABILITADO" && (
                                <Badge variant="destructive" className="text-xs">INHABILITADO</Badge>
                              )}
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>{row.vehiculo?.modelo || "—"}</TableCell>
                        <TableCell>{row.vehiculo?.tipo || "—"}</TableCell>
                        <TableCell>{row.vehiculo?.placa || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={row.estado === "HABILITADO" ? "default" : "destructive"} className="text-xs">{row.estado}</Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteAlert(row)}>
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