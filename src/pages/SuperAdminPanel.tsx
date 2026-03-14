import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, Plus, Users, Truck, Search, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
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
  propietario_nombre: string;
  created_at: string;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function SuperAdminPanel() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [empresas, setEmpresas] = useState<EmpresaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  // Form state
  const [form, setForm] = useState({
    nombre: "", ruc: "", ciudad: "", direccion: "", celular: "",
    email: "", propietario_nombre: "",
    adminEmail: "", adminPassword: "", adminUsername: "",
  });

  const fetchEmpresas = async () => {
    const { data } = await supabase.from("empresas").select("*").order("created_at", { ascending: false });
    setEmpresas((data as EmpresaRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchEmpresas(); }, []);

  if (role !== "SUPER_ADMIN") return <Navigate to="/dashboard" replace />;

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-empresa", {
        body: {
          empresa: {
            nombre: form.nombre,
            ruc: form.ruc,
            ciudad: form.ciudad,
            direccion: form.direccion,
            celular: form.celular,
            email: form.email,
            propietario_nombre: form.propietario_nombre,
          },
          adminUser: {
            email: form.adminEmail,
            password: form.adminPassword,
            username: form.adminUsername,
          },
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: "Empresa creada", description: `${form.nombre} registrada exitosamente con usuario ${form.adminEmail}` });
      setDialogOpen(false);
      setForm({ nombre: "", ruc: "", ciudad: "", direccion: "", celular: "", email: "", propietario_nombre: "", adminEmail: "", adminPassword: "", adminUsername: "" });
      fetchEmpresas();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const filtered = empresas.filter(e =>
    e.nombre.toLowerCase().includes(search.toLowerCase()) ||
    e.ruc.includes(search) ||
    e.ciudad.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-primary" />
              <Badge className="bg-primary/10 text-primary border-0 font-medium">Super Admin</Badge>
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">Gestión de Empresas</h1>
            <p className="text-muted-foreground mt-1">Crea y administra las agencias de transporte registradas</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-display">
                <Plus className="w-4 h-4" />
                Nueva Empresa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Registrar Nueva Empresa</DialogTitle>
              </DialogHeader>

              <div className="space-y-5 py-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" /> Datos de la Empresa
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Nombre de la empresa</Label>
                    <Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Transportes XYZ" />
                  </div>
                  <div>
                    <Label>RUC</Label>
                    <Input value={form.ruc} onChange={e => setForm({ ...form, ruc: e.target.value })} placeholder="1234567890001" />
                  </div>
                  <div>
                    <Label>Ciudad</Label>
                    <Input value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} placeholder="Quito" />
                  </div>
                  <div className="col-span-2">
                    <Label>Dirección</Label>
                    <Input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Av. Principal S/N" />
                  </div>
                  <div>
                    <Label>Celular</Label>
                    <Input value={form.celular} onChange={e => setForm({ ...form, celular: e.target.value })} placeholder="0991234567" />
                  </div>
                  <div>
                    <Label>Email empresa</Label>
                    <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="info@empresa.com" />
                  </div>
                  <div className="col-span-2">
                    <Label>Nombre del propietario</Label>
                    <Input value={form.propietario_nombre} onChange={e => setForm({ ...form, propietario_nombre: e.target.value })} placeholder="Juan Pérez" />
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-1">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent" /> Usuario Administrador (Gerencia)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Nombre de usuario</Label>
                    <Input value={form.adminUsername} onChange={e => setForm({ ...form, adminUsername: e.target.value })} placeholder="admin_xyz" />
                  </div>
                  <div>
                    <Label>Email del admin</Label>
                    <Input type="email" value={form.adminEmail} onChange={e => setForm({ ...form, adminEmail: e.target.value })} placeholder="admin@empresa.com" />
                  </div>
                  <div>
                    <Label>Contraseña</Label>
                    <Input type="password" value={form.adminPassword} onChange={e => setForm({ ...form, adminPassword: e.target.value })} placeholder="Min. 6 caracteres" />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={creating} className="gap-2 font-display">
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Crear Empresa
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Search */}
        <motion.div variants={item} className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, RUC o ciudad..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </motion.div>

        {/* Empresas list */}
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
                  {search ? "No se encontraron empresas" : "No hay empresas registradas aún"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(empresa => (
                <Card key={empresa.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {empresa.ciudad}
                      </Badge>
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
    </DashboardLayout>
  );
}
