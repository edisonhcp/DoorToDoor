import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Save, Upload, Camera, Truck, Edit2, UtensilsCrossed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAlimentacionConfig, upsertAlimentacionConfig } from "@/services/alimentacionService";

export default function PropietarioConfiguracion() {
  const { role, user, profile, empresaId } = useAuth();
  const { toast } = useToast();
  const fotoRef = useRef<HTMLInputElement>(null);
  const vehiculoFotoRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [propietarioId, setPropietarioId] = useState<string | null>(null);

  const [form, setForm] = useState({
    nombres: "", apellidos: "", identificacion: "", celular: "",
    direccion: "", nacionalidad: "", estado_civil: "", fecha_nacimiento: "",
  });

  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  // Vehiculos
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [editVehiculo, setEditVehiculo] = useState<any | null>(null);
  const [vehiculoForm, setVehiculoForm] = useState<any>({});
  const [vehiculoFotoPreview, setVehiculoFotoPreview] = useState<string | null>(null);
  const [vehiculoFotoFile, setVehiculoFotoFile] = useState<File | null>(null);
  const [savingVehiculo, setSavingVehiculo] = useState(false);

  // Alimentación config
  const [alimentacionVehiculo, setAlimentacionVehiculo] = useState<any | null>(null);
  const [alimentacionForm, setAlimentacionForm] = useState({
    valor_comida: "3",
    desayuno_habilitado: true,
    almuerzo_habilitado: true,
    merienda_habilitado: true,
    alimentacion_habilitada: true,
  });
  const [savingAlimentacion, setSavingAlimentacion] = useState(false);

  useEffect(() => {
    if (!user?.id || !profile?.propietario_id) return;
    const pid = profile.propietario_id;
    setPropietarioId(pid);

    Promise.all([
      supabase.from("propietarios").select("*").eq("id", pid).single(),
      supabase.from("vehiculos").select("*").eq("propietario_id", pid).order("created_at", { ascending: false }),
    ]).then(([{ data: prop }, { data: vehs }]) => {
      if (prop) {
        setForm({
          nombres: prop.nombres || "",
          apellidos: prop.apellidos || "",
          identificacion: prop.identificacion || "",
          celular: prop.celular || "",
          direccion: prop.direccion || "",
          nacionalidad: prop.nacionalidad || "",
          estado_civil: prop.estado_civil || "",
          fecha_nacimiento: prop.fecha_nacimiento || "",
        });
        if ((prop as any).foto_url) setFotoPreview((prop as any).foto_url);
      }
      setVehiculos(vehs || []);
      setLoading(false);
    });
  }, [user, profile]);

  if (role !== "PROPIETARIO") return <Navigate to="/dashboard" replace />;

  const uploadFile = async (file: File, bucket: string, folder: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!propietarioId) return;
    setSaving(true);
    const updates: Record<string, any> = { ...form };

    if (fotoFile) {
      const url = await uploadFile(fotoFile, "propietario-docs", propietarioId);
      if (url) updates.foto_url = url;
    }

    const { error } = await supabase.from("propietarios").update(updates).eq("id", propietarioId);
    setSaving(false);

    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil actualizado correctamente" });
      setFotoFile(null);
    }
  };

  const openEditVehiculo = (v: any) => {
    setEditVehiculo(v);
    setVehiculoForm({
      placa: v.placa, marca: v.marca, modelo: v.modelo, color: v.color,
      anio: v.anio?.toString() || "", tipo: v.tipo, capacidad: v.capacidad?.toString() || "4",
      gps: v.gps, seguro: v.seguro,
    });
    setVehiculoFotoPreview((v as any).foto_url || null);
    setVehiculoFotoFile(null);
  };

  const handleSaveVehiculo = async () => {
    if (!editVehiculo) return;
    setSavingVehiculo(true);
    const updates: Record<string, any> = {
      placa: vehiculoForm.placa,
      marca: vehiculoForm.marca,
      modelo: vehiculoForm.modelo,
      color: vehiculoForm.color,
      anio: vehiculoForm.anio ? parseInt(vehiculoForm.anio) : null,
      tipo: vehiculoForm.tipo,
      capacidad: parseInt(vehiculoForm.capacidad) || 4,
      gps: vehiculoForm.gps,
      seguro: vehiculoForm.seguro,
    };

    if (vehiculoFotoFile) {
      const url = await uploadFile(vehiculoFotoFile, "vehiculo-fotos", editVehiculo.id);
      if (url) updates.foto_url = url;
    }

    const { error } = await supabase.from("vehiculos").update(updates).eq("id", editVehiculo.id);
    setSavingVehiculo(false);

    if (error) {
      toast({ title: "Error al guardar vehículo", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vehículo actualizado correctamente" });
      setEditVehiculo(null);
      // Reload vehicles
      const { data } = await supabase.from("vehiculos").select("*").eq("propietario_id", propietarioId!).order("created_at", { ascending: false });
      setVehiculos(data || []);
    }
  };

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Configuración del Perfil</h1>
          <p className="text-muted-foreground text-sm mt-1">Edita tus datos personales y gestiona tus vehículos</p>
        </div>

        {/* Foto de perfil */}
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="font-display text-lg">Foto de Perfil</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div
                className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors"
                onClick={() => fotoRef.current?.click()}
              >
                {fotoPreview ? (
                  <img src={fotoPreview} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => fotoRef.current?.click()}>
                  <Upload className="w-4 h-4" /> Subir foto
                </Button>
                <p className="text-xs text-muted-foreground mt-2">JPG, PNG. Máx 2MB</p>
              </div>
              <input ref={fotoRef} type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) { setFotoFile(file); setFotoPreview(URL.createObjectURL(file)); }
                }} />
            </div>
          </CardContent>
        </Card>

        {/* Datos personales */}
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="font-display text-lg">Datos Personales</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombres</Label>
              <Input value={form.nombres} onChange={e => update("nombres", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Apellidos</Label>
              <Input value={form.apellidos} onChange={e => update("apellidos", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Identificación</Label>
              <Input value={form.identificacion} onChange={e => update("identificacion", e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} inputMode="numeric" pattern="[0-9]*" />
            </div>
            <div className="space-y-2">
              <Label>Celular</Label>
              <Input value={form.celular} onChange={e => update("celular", e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} inputMode="numeric" pattern="[0-9]*" />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={form.direccion} onChange={e => update("direccion", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nacionalidad</Label>
              <Input value={form.nacionalidad} onChange={e => update("nacionalidad", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Estado Civil</Label>
              <Input value={form.estado_civil} onChange={e => update("estado_civil", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha de Nacimiento</Label>
              <Input type="date" value={form.fecha_nacimiento} max={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()).toISOString().split("T")[0]} onChange={e => update("fecha_nacimiento", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Correo Electrónico</Label>
              <Input value={profile?.email || ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">El correo no se puede modificar</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar Perfil"}
          </Button>
        </div>

        {/* Mis Vehículos */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Truck className="w-5 h-5" /> Mis Vehículos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vehiculos.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tienes vehículos registrados.</p>
            ) : (
              <div className="space-y-3">
                {vehiculos.map(v => (
                  <div key={v.id} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {(v as any).foto_url ? (
                        <img src={(v as any).foto_url} alt={v.placa} className="w-full h-full object-cover" />
                      ) : (
                        <Truck className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{v.placa}</p>
                      <p className="text-sm text-muted-foreground">{v.marca} {v.modelo} {v.anio || ""} · {v.color}</p>
                    </div>
                    <Badge variant={v.estado === "HABILITADO" ? "default" : "destructive"} className="shrink-0">{v.estado}</Badge>
                    <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => openEditVehiculo(v)}>
                      <Edit2 className="w-3 h-3" /> Editar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Dialog editar vehículo */}
      <Dialog open={!!editVehiculo} onOpenChange={open => { if (!open) setEditVehiculo(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Editar Vehículo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Foto del vehículo */}
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors"
                onClick={() => vehiculoFotoRef.current?.click()}
              >
                {vehiculoFotoPreview ? (
                  <img src={vehiculoFotoPreview} alt="Vehículo" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => vehiculoFotoRef.current?.click()}>
                  <Upload className="w-4 h-4" /> Foto del vehículo
                </Button>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Máx 2MB</p>
              </div>
              <input ref={vehiculoFotoRef} type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) { setVehiculoFotoFile(file); setVehiculoFotoPreview(URL.createObjectURL(file)); }
                }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Placa</Label><Input value={vehiculoForm.placa || ""} onChange={e => setVehiculoForm({ ...vehiculoForm, placa: e.target.value.toUpperCase() })} /></div>
              <div><Label>Marca</Label><Input value={vehiculoForm.marca || ""} onChange={e => setVehiculoForm({ ...vehiculoForm, marca: e.target.value })} /></div>
              <div><Label>Modelo</Label><Input value={vehiculoForm.modelo || ""} onChange={e => setVehiculoForm({ ...vehiculoForm, modelo: e.target.value })} /></div>
              <div><Label>Color</Label><Input value={vehiculoForm.color || ""} onChange={e => setVehiculoForm({ ...vehiculoForm, color: e.target.value })} /></div>
              <div><Label>Año</Label><Input type="number" value={vehiculoForm.anio || ""} onChange={e => setVehiculoForm({ ...vehiculoForm, anio: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={vehiculoForm.tipo || "SUV"} onValueChange={v => setVehiculoForm({ ...vehiculoForm, tipo: v })}>
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
              <div><Label>Capacidad</Label><Input type="number" value={vehiculoForm.capacidad || ""} onChange={e => setVehiculoForm({ ...vehiculoForm, capacidad: e.target.value })} /></div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="edit-gps" checked={vehiculoForm.gps || false} onChange={e => setVehiculoForm({ ...vehiculoForm, gps: e.target.checked })} className="rounded" />
                <Label htmlFor="edit-gps">GPS</Label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="edit-seguro" checked={vehiculoForm.seguro || false} onChange={e => setVehiculoForm({ ...vehiculoForm, seguro: e.target.checked })} className="rounded" />
                <Label htmlFor="edit-seguro">Seguro</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVehiculo(null)}>Cancelar</Button>
            <Button onClick={handleSaveVehiculo} disabled={savingVehiculo}>
              {savingVehiculo ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
