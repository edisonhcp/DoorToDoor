import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Truck, Plus, Search, AlertTriangle, MessageCircle, Users, UtensilsCrossed, Phone, Mail, MapPin, CreditCard, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { fetchPropietarioVehiculos, createVehiculo } from "@/services/vehiculosService";
import { fetchAlimentacionConfig, upsertAlimentacionConfig } from "@/services/alimentacionService";

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

  // Alimentación
  const [alimentacionVehiculo, setAlimentacionVehiculo] = useState<any | null>(null);
  const [alimentacionForm, setAlimentacionForm] = useState({
    valor_comida: "3",
    desayuno_habilitado: true,
    almuerzo_habilitado: true,
    merienda_habilitado: true,
    alimentacion_habilitada: true,
  });
  const [savingAlimentacion, setSavingAlimentacion] = useState(false);
  const [conductorDetalle, setConductorDetalle] = useState<any | null>(null);

  const loadData = async () => {
    if (!user?.id) return;
    const result = await fetchPropietarioVehiculos(user.id);
    setPropietarioId(result.propietarioId);
    setVehiculos(result.vehiculos);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  if (role !== "PROPIETARIO") return <Navigate to="/dashboard" replace />;

  const handleSave = async () => {
    if (!propietarioId || !empresaId) {
      toast({ title: "Error", description: "No se pudo determinar tu perfil de propietario", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await createVehiculo({
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
      loadData();
    }
  };

  const openAlimentacion = async (v: any) => {
    setAlimentacionVehiculo(v);
    const { data } = await fetchAlimentacionConfig(v.id);
    if (data) {
      setAlimentacionForm({
        valor_comida: String(data.valor_comida),
        desayuno_habilitado: data.desayuno_habilitado,
        almuerzo_habilitado: data.almuerzo_habilitado,
        merienda_habilitado: data.merienda_habilitado,
        alimentacion_habilitada: data.alimentacion_habilitada,
      });
    } else {
      setAlimentacionForm({
        valor_comida: "3", desayuno_habilitado: true, almuerzo_habilitado: true,
        merienda_habilitado: true, alimentacion_habilitada: true,
      });
    }
  };

  const handleSaveAlimentacion = async () => {
    if (!alimentacionVehiculo || !empresaId) return;
    setSavingAlimentacion(true);
    const { error } = await upsertAlimentacionConfig({
      vehiculo_id: alimentacionVehiculo.id,
      empresa_id: empresaId,
      valor_comida: parseFloat(alimentacionForm.valor_comida) || 3,
      desayuno_habilitado: alimentacionForm.desayuno_habilitado,
      almuerzo_habilitado: alimentacionForm.almuerzo_habilitado,
      merienda_habilitado: alimentacionForm.merienda_habilitado,
      alimentacion_habilitada: alimentacionForm.alimentacion_habilitada,
    });
    setSavingAlimentacion(false);
    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configuración de alimentación guardada" });
      setAlimentacionVehiculo(null);
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
                <Card key={v.id} className={`border-0 shadow-sm hover:shadow-md transition-shadow ${v.estado === "INHABILITADO" ? "border border-destructive/30 bg-destructive/5" : ""}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      {v.foto_url ? (
                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-border">
                          <img src={v.foto_url} alt={v.placa} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${v.estado === "INHABILITADO" ? "bg-destructive/10" : "bg-primary/10"}`}>
                          <Truck className={`w-5 h-5 ${v.estado === "INHABILITADO" ? "text-destructive" : "text-primary"}`} />
                        </div>
                      )}
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={v.estado === "HABILITADO" ? "default" : "destructive"}>{v.estado}</Badge>
                        <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => openAlimentacion(v)}>
                          <UtensilsCrossed className="w-3 h-3" /> Alimentación
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-display font-semibold text-foreground">{v.placa}</h3>
                    <p className="text-sm text-muted-foreground">{v.marca} {v.modelo} {v.anio || ""}</p>
                    <p className="text-xs text-muted-foreground mt-1">{v.color} · {v.tipo} · Cap: {v.capacidad}</p>
                    {v.conductor && (
                      <div className="mt-2 p-2 rounded-lg bg-muted/50 border border-border">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Conductor: <span className="font-medium text-foreground">{v.conductor.nombres} {v.conductor.apellidos}</span>
                        </p>
                        {v.conductor.celular && (
                          <p className="text-xs text-muted-foreground ml-4">{v.conductor.celular}</p>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      {v.gps && <Badge variant="secondary" className="text-xs">GPS</Badge>}
                      {v.seguro && <Badge variant="secondary" className="text-xs">Seguro</Badge>}
                    </div>
                    {v.estado === "INHABILITADO" && (
                      <div className="mt-3 pt-3 border-t border-destructive/20 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                        <p className="text-xs text-destructive flex-1">Vehículo deshabilitado. Contacta a la gerencia.</p>
                        <Button variant="outline" size="sm" className="gap-1 shrink-0 h-7 text-xs" asChild>
                          <a href="https://wa.me/" target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="w-3 h-3" />
                            WhatsApp
                          </a>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

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

      {/* Dialog alimentación conductor */}
      <Dialog open={!!alimentacionVehiculo} onOpenChange={open => { if (!open) setAlimentacionVehiculo(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5" /> Alimentación Conductor
            </DialogTitle>
            {alimentacionVehiculo && (
              <p className="text-sm text-muted-foreground">{alimentacionVehiculo.placa} — {alimentacionVehiculo.marca} {alimentacionVehiculo.modelo}</p>
            )}
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-semibold">Alimentación habilitada</Label>
                <p className="text-xs text-muted-foreground">Si se deshabilita, el conductor no podrá registrar alimentación</p>
              </div>
              <Switch
                checked={alimentacionForm.alimentacion_habilitada}
                onCheckedChange={(checked) => setAlimentacionForm(prev => ({ ...prev, alimentacion_habilitada: checked }))}
              />
            </div>
            {alimentacionForm.alimentacion_habilitada && (
              <>
                <div className="space-y-2">
                  <Label>Valor por comida (USD)</Label>
                  <Input type="number" min="0" step="0.50" value={alimentacionForm.valor_comida}
                    onChange={e => setAlimentacionForm(prev => ({ ...prev, valor_comida: e.target.value }))} />
                  <p className="text-xs text-muted-foreground">Este valor se aplicará a cada comida seleccionada</p>
                </div>
                <div className="space-y-3">
                  <Label>Comidas habilitadas</Label>
                  {[
                    { key: "desayuno_habilitado", label: "Desayuno" },
                    { key: "almuerzo_habilitado", label: "Almuerzo" },
                    { key: "merienda_habilitado", label: "Merienda" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <Checkbox
                        checked={alimentacionForm[key as keyof typeof alimentacionForm] as boolean}
                        onCheckedChange={(checked) => setAlimentacionForm(prev => ({ ...prev, [key]: !!checked }))}
                      />
                      <Label className="text-sm">{label}</Label>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlimentacionVehiculo(null)}>Cancelar</Button>
            <Button onClick={handleSaveAlimentacion} disabled={savingAlimentacion}>
              {savingAlimentacion ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}