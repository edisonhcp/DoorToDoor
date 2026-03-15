import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Truck, Plus, Pencil, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";

interface VehiculoForm {
  placa: string;
  marca: string;
  modelo: string;
  color: string;
  anio: string;
  tipo: string;
  capacidad: string;
  gps: boolean;
  seguro: boolean;
}

const emptyForm: VehiculoForm = {
  placa: "", marca: "", modelo: "", color: "",
  anio: "", tipo: "SUV", capacidad: "4", gps: false, seguro: false,
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function PropietarioVehiculos() {
  const { role, empresaId, user } = useAuth();
  const { toast } = useToast();
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<VehiculoForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [propietarioId, setPropietarioId] = useState<string | null>(null);

  const fetchData = async () => {
    // Get propietario_id from profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("propietario_id")
      .eq("user_id", user?.id || "")
      .single();

    if (profileData?.propietario_id) {
      setPropietarioId(profileData.propietario_id);
      const { data } = await supabase
        .from("vehiculos")
        .select("*")
        .eq("propietario_id", profileData.propietario_id)
        .order("created_at", { ascending: false });
      setVehiculos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  if (role !== "PROPIETARIO") return <Navigate to="/dashboard" replace />;

  const handleSave = async () => {
    if (!propietarioId || !empresaId) {
      toast({ title: "Error", description: "No se pudo determinar tu perfil de propietario", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("vehiculos").insert({
      placa: form.placa,
      marca: form.marca,
      modelo: form.modelo,
      color: form.color,
      anio: form.anio ? parseInt(form.anio) : null,
      tipo: form.tipo,
      capacidad: parseInt(form.capacidad) || 4,
      gps: form.gps,
      seguro: form.seguro,
      propietario_id: propietarioId,
      empresa_id: empresaId,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vehículo registrado exitosamente" });
      setDialogOpen(false);
      setForm(emptyForm);
      fetchData();
    }
  };

  const filtered = vehiculos.filter(v =>
    v.placa.toLowerCase().includes(search.toLowerCase()) ||
    v.marca.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Mis Vehículos</h1>
            <p className="text-muted-foreground mt-1">Gestiona los vehículos registrados a tu nombre</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2 font-display">
            <Plus className="w-4 h-4" />
            Registrar Vehículo
          </Button>
        </motion.div>

        <motion.div variants={item} className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por placa o marca..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </motion.div>

        <motion.div variants={item}>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <Truck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground mb-4">
                  {search ? "No se encontraron vehículos" : "No tienes vehículos registrados"}
                </p>
                {!search && (
                  <p className="text-sm text-muted-foreground">Usa el botón de arriba para registrar tu primer vehículo</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(v => (
                <Card key={v.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-primary" />
                      </div>
                      <Badge variant={v.estado === "HABILITADO" ? "default" : "destructive"}>{v.estado}</Badge>
                    </div>
                    <h3 className="font-display font-semibold text-foreground">{v.placa}</h3>
                    <p className="text-sm text-muted-foreground">{v.marca} {v.modelo} {v.anio || ""}</p>
                    <p className="text-xs text-muted-foreground mt-1">{v.color} · {v.tipo} · Cap: {v.capacidad}</p>
                    <div className="flex gap-2 mt-2">
                      {v.gps && <Badge variant="secondary" className="text-xs">GPS</Badge>}
                      {v.seguro && <Badge variant="secondary" className="text-xs">Seguro</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Register Vehicle Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Registrar Vehículo</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <div className="col-span-2"><Label>Placa</Label><Input value={form.placa} onChange={e => setForm({ ...form, placa: e.target.value.toUpperCase() })} placeholder="ABC-1234" required /></div>
            <div><Label>Marca</Label><Input value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} required /></div>
            <div><Label>Modelo</Label><Input value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} required /></div>
            <div><Label>Color</Label><Input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} required /></div>
            <div><Label>Año</Label><Input type="number" value={form.anio} onChange={e => setForm({ ...form, anio: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUV">SUV</SelectItem>
                  <SelectItem value="Sedán">Sedán</SelectItem>
                  <SelectItem value="Bus">Bus</SelectItem>
                  <SelectItem value="Minivan">Minivan</SelectItem>
                  <SelectItem value="Camioneta">Camioneta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Capacidad</Label><Input type="number" value={form.capacidad} onChange={e => setForm({ ...form, capacidad: e.target.value })} /></div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="gps" checked={form.gps} onChange={e => setForm({ ...form, gps: e.target.checked })} className="rounded" />
              <Label htmlFor="gps">GPS</Label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="seguro" checked={form.seguro} onChange={e => setForm({ ...form, seguro: e.target.checked })} className="rounded" />
              <Label htmlFor="seguro">Seguro</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.placa || !form.marca || !form.modelo || !form.color}>
              {saving ? "Guardando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
