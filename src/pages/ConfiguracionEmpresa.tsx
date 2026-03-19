import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Building2, Save, Upload, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { fetchEmpresaInfo, updateEmpresaInfo, uploadEmpresaLogo } from "@/services/dashboardService";

export default function ConfiguracionEmpresa() {
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    ruc: "",
    ciudad: "",
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
      direccion: form.direccion,
      celular: form.celular,
      email: form.email,
      propietario_nombre: form.propietario_nombre,
      propietario_apellidos: form.propietario_apellidos,
      tipo_comision: form.tipo_comision,
      comision_pct: form.tipo_comision === "PORCENTAJE" ? form.comision_pct / 100 : 0,
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
          <h1 className="text-2xl font-display font-bold text-foreground">Configuración de la Compañía</h1>
          <p className="text-muted-foreground text-sm mt-1">Edita los datos de tu empresa</p>
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
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
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
              <Label>Ciudad</Label>
              <Input value={form.ciudad} onChange={(e) => update("ciudad", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={form.direccion} onChange={(e) => update("direccion", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Celular</Label>
              <Input value={form.celular} onChange={(e) => update("celular", e.target.value)} />
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
                  value={form.comision_pct}
                  onChange={(e) => update("comision_pct", Number(e.target.value))}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Valor fijo de comisión ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.comision_fija}
                  onChange={(e) => update("comision_fija", Number(e.target.value))}
                />
              </div>
            )}

            <div>
              <Label className="mb-2 block">Frecuencia de Comisión</Label>
              <div className="flex gap-2">
                {[
                  { value: "SEMANAL", label: "Semanal" },
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
      </motion.div>
    </DashboardLayout>
  );
}
