import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Building2, Users, Truck, Search, Shield, Link2, Pencil,
  Trash2, Ban, CheckCircle2, Copy, MoreVertical, UserCheck, Eye
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";

interface EmpresaRow {
  id: string;
  nombre: string;
  ruc: string;
  ciudad: string;
  email: string;
  celular: string;
  direccion: string;
  propietario_nombre: string;
  activo: boolean;
  created_at: string;
}

interface GlobalStats {
  companias: number;
  conductores: number;
  vehiculos: number;
  propietarios: number;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function SuperAdminPanel() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [empresas, setEmpresas] = useState<EmpresaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<GlobalStats>({ companias: 0, conductores: 0, vehiculos: 0, propietarios: 0 });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<EmpresaRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [deletingEmpresa, setDeletingEmpresa] = useState<EmpresaRow | null>(null);

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);

  // Detail view state
  const [detailEmpresa, setDetailEmpresa] = useState<EmpresaRow | null>(null);
  const [detailVehiculos, setDetailVehiculos] = useState<any[]>([]);
  const [detailConductores, setDetailConductores] = useState<any[]>([]);
  const [detailPropietarios, setDetailPropietarios] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = async () => {
    const [empresasRes, conductoresRes, vehiculosRes, propietariosRes] = await Promise.all([
      supabase.from("empresas").select("*").order("created_at", { ascending: false }),
      supabase.from("conductores").select("id", { count: "exact", head: true }),
      supabase.from("vehiculos").select("id", { count: "exact", head: true }),
      supabase.from("propietarios").select("id", { count: "exact", head: true }),
    ]);
    setEmpresas((empresasRes.data as EmpresaRow[]) || []);
    setStats({
      companias: empresasRes.data?.length || 0,
      conductores: conductoresRes.count || 0,
      vehiculos: vehiculosRes.count || 0,
      propietarios: propietariosRes.count || 0,
    });
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (role !== "SUPER_ADMIN") return <Navigate to="/dashboard" replace />;

  const handleViewDetail = async (empresa: EmpresaRow) => {
    setDetailEmpresa(empresa);
    setDetailLoading(true);
    const [vRes, cRes, pRes] = await Promise.all([
      supabase.from("vehiculos").select("*").eq("empresa_id", empresa.id),
      supabase.from("conductores").select("*").eq("empresa_id", empresa.id),
      supabase.from("propietarios").select("*").eq("empresa_id", empresa.id),
    ]);
    setDetailVehiculos(vRes.data || []);
    setDetailConductores(cRes.data || []);
    setDetailPropietarios(pRes.data || []);
    setDetailLoading(false);
  };

  const handleEdit = async () => {
    if (!editingEmpresa) return;
    setSaving(true);
    const { error } = await supabase.from("empresas").update({
      nombre: editingEmpresa.nombre,
      ruc: editingEmpresa.ruc,
      ciudad: editingEmpresa.ciudad,
      direccion: editingEmpresa.direccion,
      celular: editingEmpresa.celular,
      email: editingEmpresa.email,
      propietario_nombre: editingEmpresa.propietario_nombre,
    }).eq("id", editingEmpresa.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Compañía actualizada" });
      setEditDialogOpen(false);
      fetchData();
    }
  };

  const handleDelete = async () => {
    if (!deletingEmpresa) return;
    const { error } = await supabase.from("empresas").delete().eq("id", deletingEmpresa.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Compañía eliminada" });
      fetchData();
    }
    setDeleteAlertOpen(false);
  };

  const handleToggleSuspend = async (empresa: EmpresaRow) => {
    const { error } = await supabase.from("empresas").update({ activo: !empresa.activo }).eq("id", empresa.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: empresa.activo ? "Compañía suspendida" : "Compañía reactivada" });
      fetchData();
    }
  };

  const handleGenerateLink = async (empresaId?: string) => {
    setGeneratingLink(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-invitation", {
        body: { rol: "GERENCIA", empresa_id: empresaId },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      const link = `${window.location.origin}/registro/${data.token}`;
      setGeneratedLink(link);
      setLinkDialogOpen(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast({ title: "Link copiado al portapapeles" });
  };

  const filtered = empresas.filter(e =>
    e.nombre.toLowerCase().includes(search.toLowerCase()) ||
    e.ruc.includes(search) ||
    e.ciudad.toLowerCase().includes(search.toLowerCase())
  );

  const statCards = [
    { title: "Compañías", value: stats.companias, icon: Building2, color: "text-primary", bg: "bg-primary/10" },
    { title: "Conductores", value: stats.conductores, icon: Users, color: "text-accent", bg: "bg-accent/10" },
    { title: "Vehículos", value: stats.vehiculos, icon: Truck, color: "text-secondary", bg: "bg-secondary/10" },
    { title: "Propietarios", value: stats.propietarios, icon: UserCheck, color: "text-primary", bg: "bg-primary/10" },
  ];

  // Detail view for a specific empresa
  if (detailEmpresa) {
    return (
      <DashboardLayout>
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={item} className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setDetailEmpresa(null)}>← Volver</Button>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">{detailEmpresa.nombre}</h1>
              <p className="text-muted-foreground text-sm">RUC: {detailEmpresa.ruc} · {detailEmpresa.ciudad}</p>
            </div>
          </motion.div>

          <motion.div variants={item}>
            <Tabs defaultValue="vehiculos">
              <TabsList>
                <TabsTrigger value="vehiculos" className="gap-1"><Truck className="w-4 h-4" /> Vehículos ({detailVehiculos.length})</TabsTrigger>
                <TabsTrigger value="conductores" className="gap-1"><Users className="w-4 h-4" /> Conductores ({detailConductores.length})</TabsTrigger>
                <TabsTrigger value="propietarios" className="gap-1"><UserCheck className="w-4 h-4" /> Propietarios ({detailPropietarios.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="vehiculos">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    {detailLoading ? (
                      <div className="p-8 text-center text-muted-foreground">Cargando...</div>
                    ) : detailVehiculos.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">No hay vehículos registrados</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Placa</TableHead>
                            <TableHead>Marca</TableHead>
                            <TableHead>Modelo</TableHead>
                            <TableHead>Color</TableHead>
                            <TableHead>Año</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailVehiculos.map((v: any) => (
                            <TableRow key={v.id}>
                              <TableCell className="font-medium">{v.placa}</TableCell>
                              <TableCell>{v.marca}</TableCell>
                              <TableCell>{v.modelo}</TableCell>
                              <TableCell>{v.color}</TableCell>
                              <TableCell>{v.anio || "—"}</TableCell>
                              <TableCell><Badge variant={v.estado === "HABILITADO" ? "default" : "destructive"}>{v.estado}</Badge></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="conductores">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    {detailLoading ? (
                      <div className="p-8 text-center text-muted-foreground">Cargando...</div>
                    ) : detailConductores.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">No hay conductores registrados</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Nombres</TableHead>
                            <TableHead>Identificación</TableHead>
                            <TableHead>Celular</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailConductores.map((c: any) => (
                            <TableRow key={c.id}>
                              <TableCell className="font-mono text-xs">{c.codigo}</TableCell>
                              <TableCell className="font-medium">{c.nombres}</TableCell>
                              <TableCell>{c.identificacion}</TableCell>
                              <TableCell>{c.celular}</TableCell>
                              <TableCell>{c.email}</TableCell>
                              <TableCell><Badge variant={c.estado === "HABILITADO" ? "default" : "destructive"}>{c.estado}</Badge></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="propietarios">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    {detailLoading ? (
                      <div className="p-8 text-center text-muted-foreground">Cargando...</div>
                    ) : detailPropietarios.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">No hay propietarios registrados</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Nombres</TableHead>
                            <TableHead>Identificación</TableHead>
                            <TableHead>Celular</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailPropietarios.map((p: any) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                              <TableCell className="font-medium">{p.nombres}</TableCell>
                              <TableCell>{p.identificacion}</TableCell>
                              <TableCell>{p.celular}</TableCell>
                              <TableCell>{p.email}</TableCell>
                              <TableCell><Badge variant={p.estado === "HABILITADO" ? "default" : "destructive"}>{p.estado}</Badge></TableCell>
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
        </motion.div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-primary" />
              <Badge className="bg-primary/10 text-primary border-0 font-medium">Super Admin</Badge>
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">Gestión de Compañías</h1>
            <p className="text-muted-foreground mt-1">Administra las agencias de transporte registradas</p>
          </div>
          <Button onClick={() => handleGenerateLink()} disabled={generatingLink} className="gap-2 font-display">
            <Link2 className="w-4 h-4" />
            {generatingLink ? "Generando..." : "Generar Link para Agencia"}
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <motion.div key={stat.title} variants={item}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-display font-bold text-foreground mt-1">
                      {loading ? "—" : stat.value}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <motion.div variants={item} className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, RUC o ciudad..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </motion.div>

        {/* Companies list */}
        <motion.div variants={item}>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground">
                  {search ? "No se encontraron compañías" : "No hay compañías registradas aún"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(empresa => (
                <Card key={empresa.id} className={`border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${!empresa.activo ? 'opacity-60' : ''}`} onClick={() => handleViewDetail(empresa)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={`text-xs ${!empresa.activo ? 'bg-destructive/10 text-destructive' : ''}`}>
                          {empresa.activo ? empresa.ciudad : "Suspendida"}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingEmpresa(empresa); setEditDialogOpen(true); }}>
                              <Pencil className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetail(empresa); }}>
                              <Eye className="w-4 h-4 mr-2" /> Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleSuspend(empresa); }}>
                              {empresa.activo ? (
                                <><Ban className="w-4 h-4 mr-2" /> Suspender</>
                              ) : (
                                <><CheckCircle2 className="w-4 h-4 mr-2" /> Reactivar</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => { e.stopPropagation(); setDeletingEmpresa(empresa); setDeleteAlertOpen(true); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <h3 className="font-display font-semibold text-foreground mb-1 truncate">{empresa.nombre}</h3>
                    <p className="text-sm text-muted-foreground mb-3">RUC: {empresa.ruc}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{empresa.propietario_nombre}</span>
                      <span>{new Date(empresa.created_at).toLocaleDateString("es-ES")}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Editar Compañía</DialogTitle>
          </DialogHeader>
          {editingEmpresa && (
            <div className="grid grid-cols-2 gap-3 py-4">
              <div className="col-span-2"><Label>Nombre</Label><Input value={editingEmpresa.nombre} onChange={e => setEditingEmpresa({ ...editingEmpresa, nombre: e.target.value })} /></div>
              <div><Label>RUC</Label><Input value={editingEmpresa.ruc} onChange={e => setEditingEmpresa({ ...editingEmpresa, ruc: e.target.value })} /></div>
              <div><Label>Ciudad</Label><Input value={editingEmpresa.ciudad} onChange={e => setEditingEmpresa({ ...editingEmpresa, ciudad: e.target.value })} /></div>
              <div className="col-span-2"><Label>Dirección</Label><Input value={editingEmpresa.direccion} onChange={e => setEditingEmpresa({ ...editingEmpresa, direccion: e.target.value })} /></div>
              <div><Label>Celular</Label><Input value={editingEmpresa.celular} onChange={e => setEditingEmpresa({ ...editingEmpresa, celular: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={editingEmpresa.email} onChange={e => setEditingEmpresa({ ...editingEmpresa, email: e.target.value })} /></div>
              <div className="col-span-2"><Label>Propietario</Label><Input value={editingEmpresa.propietario_nombre} onChange={e => setEditingEmpresa({ ...editingEmpresa, propietario_nombre: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar compañía?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente a <strong>{deletingEmpresa?.nombre}</strong> y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generated Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Link de Registro Generado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Envía este enlace al representante de la agencia para que se registre. El link expira en 7 días.
            </p>
            <div className="flex gap-2">
              <Input value={generatedLink} readOnly className="text-xs" />
              <Button variant="outline" size="icon" onClick={copyLink}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setLinkDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
