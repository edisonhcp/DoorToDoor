import { useEffect, useState, useRef } from "react";
import { StorageImage } from "@/components/StorageImage";
import { motion } from "framer-motion";
import { Building2, Save, Upload, Camera, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { fetchEmpresaInfo, updateEmpresaInfo, uploadEmpresaLogo } from "@/services/dashboardService";
import { PROVINCIAS_ECUADOR } from "@/constants/provinciasEcuador";
import { fetchSolicitudPendiente, crearSolicitudBaja } from "@/services/solicitudesBajaService";

export default function ConfiguracionEmpresa() {
  const { empresaId, user: authUser } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bajaDialogOpen, setBajaDialogOpen] = useState(false);
  const [bajaMotivo, setBajaMotivo] = useState("");
  const [bajaSending, setBajaSending] = useState(false);
  const [solicitudPendiente, setSolicitudPendiente] = useState<any>(null);
  const [form, setForm] = useState({
    nombre: "",
    ruc: "",
    ciudad: "",
    ciudad_real: "",
    direccion: "",
    celular: "",
    email: "",
    propietario_nombre: "",
    propietario_apellidos: "",
    tipo_comision: "PORCENTAJE",
    comision_pct: 0,
    comision_fija: "" as any,
    frecuencia_comision: "SEMANAL",
  });

  useEffect(() => {
    if (!empresaId) return;
    fetchEmpresaInfo(empresaId).then((data) => {
      if (data) {
        setForm({
          nombre: data.nombre || "",
          ruc: data.ruc || "",
          ciudad: data.ciudad || "",
          ciudad_real: data.ciudad_real || "",
          direccion: data.direccion || "",
          celular: data.celular || "",
          email: data.email || "",
          propietario_nombre: data.propietario_nombre || "",
          propietario_apellidos: data.propietario_apellidos || "",
          tipo_comision: data.tipo_comision || "PORCENTAJE",
          comision_pct: Math.round((data.comision_pct || 0) * 100),
          comision_fija: data.comision_fija || "",
          frecuencia_comision: data.frecuencia_comision || "SEMANAL",
        });
        if (data.logo_url) setLogoPreview(data.logo_url);
      }
      setLoading(false);
    });
  }, [empresaId]);

  useEffect(() => {
    if (!empresaId) return;
    fetchSolicitudPendiente(empresaId).then(setSolicitudPendiente);
  }, [empresaId]);

  const handleSolicitarBaja = async () => {
    if (!empresaId || !authUser) return;
    setBajaSending(true);
    const { error } = await crearSolicitudBaja(empresaId, authUser.id, bajaMotivo);
    setBajaSending(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Solicitud enviada", description: "El administrador revisará tu solicitud" });
      setBajaDialogOpen(false);
      setBajaMotivo("");
      fetchSolicitudPendiente(empresaId).then(setSolicitudPendiente);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!empresaId) return;
    setSaving(true);

    if (logoFile) {
      const { error } = await uploadEmpresaLogo(empresaId, logoFile);
      if (error) {
        toast({ title: "Error al subir logo", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      setLogoFile(null);
    }

    const { error } = await updateEmpresaInfo(empresaId, {
      nombre: form.nombre,
      ruc: form.ruc,
      ciudad: form.ciudad,
      ciudad_real: form.ciudad_real,
      direccion: form.direccion,
      celular: form.celular,
      email: form.email,
      propietario_nombre: form.propietario_nombre,
      propietario_apellidos: form.propietario_apellidos,
      tipo_comision: form.tipo_comision,
      comision_pct: form.tipo_comision === "PORCENTAJE" ? (Number(form.comision_pct) || 0) / 100 : 0,
      comision_fija: form.tipo_comision === "FIJO" ? (Number(form.comision_fija) || 0) : 0,
      frecuencia_comision: form.frecuencia_comision,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configuración guardada correctamente" });
    }
    setSaving(false);
  };

  const update = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">Configuración de la Compañía</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Edita los datos de tu empresa</p>
        </div>

        {/* Logo */}
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="font-display text-lg">Logo de la Compañía</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div
                className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {logoPreview ? (
                  <StorageImage src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-4 h-4" /> Subir imagen
                </Button>
                <p className="text-xs text-muted-foreground mt-2">JPG, PNG. Máx 2MB</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>
          </CardContent>
        </Card>

        {/* Datos generales */}
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="font-display text-lg">Datos Generales</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre de la Empresa</Label>
              <Input value={form.nombre} onChange={(e) => update("nombre", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>RUC</Label>
              <Input value={form.ruc} onChange={(e) => update("ruc", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Provincia</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.ciudad}
                onChange={(e) => update("ciudad", e.target.value)}
              >
                <option value="">Seleccione una provincia</option>
                {PROVINCIAS_ECUADOR.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Ciudad</Label>
              <Input value={form.ciudad_real} onChange={(e) => update("ciudad_real", e.target.value)} placeholder="Ej: Quito" />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={form.direccion} onChange={(e) => update("direccion", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Celular</Label>
              <Input value={form.celular} onChange={(e) => update("celular", e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} inputMode="numeric" pattern="[0-9]*" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Representante */}
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="font-display text-lg">Representante Legal</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombres</Label>
              <Input value={form.propietario_nombre} onChange={(e) => update("propietario_nombre", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Apellidos</Label>
              <Input value={form.propietario_apellidos} onChange={(e) => update("propietario_apellidos", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Comisión */}
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="font-display text-lg">Configuración de Comisión</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">Tipo de Comisión</Label>
              <div className="flex gap-2">
                {[
                  { value: "PORCENTAJE", label: "Porcentaje (%)" },
                  { value: "FIJO", label: "Valor Fijo ($)" },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={form.tipo_comision === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => update("tipo_comision", opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {form.tipo_comision === "PORCENTAJE" ? (
              <div className="space-y-2">
                <Label>Porcentaje de comisión (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.comision_pct || ""}
                  onChange={(e) => update("comision_pct", e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Valor fijo de comisión ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.comision_fija || ""}
                  onChange={(e) => update("comision_fija", e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
            )}

            <div>
              <Label className="mb-2 block">Frecuencia de Comisión</Label>
              <div className="flex gap-2">
                {[
                  { value: "SEMANAL", label: "Semanal" },
                  { value: "BISEMANAL", label: "Bisemanal" },
                  { value: "QUINCENAL", label: "Quincenal" },
                  { value: "MENSUAL", label: "Mensual" },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={form.frecuencia_comision === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => update("frecuencia_comision", opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>

        {/* Solicitar Baja */}
        <Card className="border border-destructive/30 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-lg text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Zona de Peligro
            </CardTitle>
          </CardHeader>
          <CardContent>
            {solicitudPendiente ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800">Solicitud de baja pendiente</p>
                  <p className="text-sm text-amber-600">
                    Enviada el {new Date(solicitudPendiente.created_at).toLocaleDateString("es-ES")}. El administrador revisará tu solicitud.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Solicitar baja de la compañía</p>
                  <p className="text-sm text-muted-foreground">
                    Envía una solicitud al administrador para eliminar tu cuenta y toda la flota asociada.
                  </p>
                </div>
                <Button variant="destructive" onClick={() => setBajaDialogOpen(true)} className="gap-2 shrink-0">
                  <AlertTriangle className="w-4 h-4" /> Solicitar Baja
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <AlertDialog open={bajaDialogOpen} onOpenChange={setBajaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Solicitar baja de la compañía?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta solicitud será enviada al administrador. Si es aprobada, se eliminarán permanentemente todos los datos: conductores, propietarios, vehículos y cuentas de usuario. Los registros de viajes se conservarán para auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label className="mb-2 block">Motivo (opcional)</Label>
            <Textarea
              placeholder="Describe el motivo de la solicitud..."
              value={bajaMotivo}
              onChange={(e) => setBajaMotivo(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSolicitarBaja}
              disabled={bajaSending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bajaSending ? "Enviando..." : "Confirmar Solicitud"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
