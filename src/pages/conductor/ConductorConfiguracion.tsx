import { useEffect, useState, useRef } from "react";
import { StorageImage } from "@/components/StorageImage";
import { motion } from "framer-motion";
import { Save, Upload, Camera, User, CreditCard, Car } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { deleteConductorAccount } from "@/services/conductoresService";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ConductorConfiguracion() {
  const { role, user, profile } = useAuth();
  const { toast } = useToast();
  const fotoRef = useRef<HTMLInputElement>(null);
  const cedulaFrontalRef = useRef<HTMLInputElement>(null);
  const cedulaTraseraRef = useRef<HTMLInputElement>(null);
  const licenciaFrontalRef = useRef<HTMLInputElement>(null);
  const licenciaTraseraRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conductorId, setConductorId] = useState<string | null>(null);
  const [deleteAccountAlert, setDeleteAccountAlert] = useState(false);

  const [form, setForm] = useState({
    nombres: "", apellidos: "", identificacion: "", celular: "",
    domicilio: "", nacionalidad: "", estado_civil: "",
    fecha_nacimiento: "", tipo_licencia: "", fecha_caducidad_licencia: "",
  });

  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [cedulaFrontalPreview, setCedulaFrontalPreview] = useState<string | null>(null);
  const [cedulaFrontalFile, setCedulaFrontalFile] = useState<File | null>(null);
  const [cedulaTraseraPreview, setCedulaTraseraPreview] = useState<string | null>(null);
  const [cedulaTraseraFile, setCedulaTraseraFile] = useState<File | null>(null);
  const [licenciaFrontalPreview, setLicenciaFrontalPreview] = useState<string | null>(null);
  const [licenciaFrontalFile, setLicenciaFrontalFile] = useState<File | null>(null);
  const [licenciaTraseraPreview, setLicenciaTraseraPreview] = useState<string | null>(null);
  const [licenciaTraseraFile, setLicenciaTraseraFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user?.id || !profile?.conductor_id) return;
    setConductorId(profile.conductor_id);
    supabase.from("conductores").select("*").eq("id", profile.conductor_id).single().then(({ data }) => {
      if (data) {
        setForm({
          nombres: data.nombres || "",
          apellidos: data.apellidos || "",
          identificacion: data.identificacion || "",
          celular: data.celular || "",
          domicilio: data.domicilio || "",
          nacionalidad: data.nacionalidad || "",
          estado_civil: data.estado_civil || "",
          fecha_nacimiento: data.fecha_nacimiento || "",
          tipo_licencia: data.tipo_licencia || "",
          fecha_caducidad_licencia: data.fecha_caducidad_licencia || "",
        });
        if ((data as any).foto_url) setFotoPreview((data as any).foto_url);
        if ((data as any).cedula_frontal_url) setCedulaFrontalPreview((data as any).cedula_frontal_url);
        if ((data as any).cedula_trasera_url) setCedulaTraseraPreview((data as any).cedula_trasera_url);
        if ((data as any).licencia_frontal_url) setLicenciaFrontalPreview((data as any).licencia_frontal_url);
        if ((data as any).licencia_trasera_url) setLicenciaTraseraPreview((data as any).licencia_trasera_url);
      }
      setLoading(false);
    });
  }, [user, profile]);

  if (role !== "CONDUCTOR") return <Navigate to="/dashboard" replace />;

  const uploadDoc = async (file: File, folder: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${conductorId}/${folder}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("conductor-docs").upload(path, file, { upsert: true });
    if (error) return null;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/conductor-docs/${path}`;
  };

  const handleFileChange = (
    file: File | undefined,
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void
  ) => {
    if (!file) return;
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!conductorId) return;
    setSaving(true);

    const updates: Record<string, any> = { ...form };

    const uploads = [
      { file: fotoFile, folder: "foto", key: "foto_url" },
      { file: cedulaFrontalFile, folder: "cedula_frontal", key: "cedula_frontal_url" },
      { file: cedulaTraseraFile, folder: "cedula_trasera", key: "cedula_trasera_url" },
      { file: licenciaFrontalFile, folder: "licencia_frontal", key: "licencia_frontal_url" },
      { file: licenciaTraseraFile, folder: "licencia_trasera", key: "licencia_trasera_url" },
    ];

    for (const { file, folder, key } of uploads) {
      if (file) {
        const url = await uploadDoc(file, folder);
        if (url) updates[key] = url;
      }
    }

    const { error } = await supabase.from("conductores").update(updates).eq("id", conductorId);
    setSaving(false);

    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configuración guardada correctamente" });
      setFotoFile(null);
      setCedulaFrontalFile(null);
      setCedulaTraseraFile(null);
      setLicenciaFrontalFile(null);
      setLicenciaTraseraFile(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    await deleteConductorAccount(user.id);
    toast({ title: "Cuenta eliminada. Puede registrarse en otra compañía." });
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

  const DocUploadCard = ({
    title,
    icon: Icon,
    frontalPreview,
    traseraPreview,
    frontalRef,
    traseraRef,
    onFrontalChange,
    onTraseraChange,
  }: {
    title: string;
    icon: any;
    frontalPreview: string | null;
    traseraPreview: string | null;
    frontalRef: React.RefObject<HTMLInputElement>;
    traseraRef: React.RefObject<HTMLInputElement>;
    onFrontalChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onTraseraChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Icon className="w-5 h-5" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm">Lado frontal</Label>
            <div
              className="w-full h-40 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors"
              onClick={() => frontalRef.current?.click()}
            >
              {frontalPreview ? (
                <StorageImage src={frontalPreview} alt="Frontal" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                  <p className="text-xs text-muted-foreground mt-1">Subir imagen</p>
                </div>
              )}
            </div>
            <input ref={frontalRef} type="file" accept="image/*" className="hidden" onChange={onFrontalChange} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Lado trasero</Label>
            <div
              className="w-full h-40 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors"
              onClick={() => traseraRef.current?.click()}
            >
              {traseraPreview ? (
                <StorageImage src={traseraPreview} alt="Trasero" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                  <p className="text-xs text-muted-foreground mt-1">Subir imagen</p>
                </div>
              )}
            </div>
            <input ref={traseraRef} type="file" accept="image/*" className="hidden" onChange={onTraseraChange} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Configuración del Perfil</h1>
          <p className="text-muted-foreground text-sm mt-1">Edita tus datos personales y documentos</p>
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
                  <StorageImage src={fotoPreview} alt="Foto" className="w-full h-full object-cover" />
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
                onChange={e => handleFileChange(e.target.files?.[0], setFotoFile, setFotoPreview)} />
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
              <Label>Domicilio</Label>
              <Input value={form.domicilio} onChange={e => update("domicilio", e.target.value)} />
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
            <div className="space-y-2">
              <Label>Tipo de Licencia</Label>
              <Input value={form.tipo_licencia} onChange={e => update("tipo_licencia", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha Caducidad Licencia</Label>
              <Input type="date" value={form.fecha_caducidad_licencia} onChange={e => update("fecha_caducidad_licencia", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Correo Electrónico</Label>
              <Input value={profile?.email || ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">El correo no se puede modificar</p>
            </div>
          </CardContent>
        </Card>

        {/* Documento de identidad */}
        <DocUploadCard
          title="Documento de Identidad"
          icon={CreditCard}
          frontalPreview={cedulaFrontalPreview}
          traseraPreview={cedulaTraseraPreview}
          frontalRef={cedulaFrontalRef as any}
          traseraRef={cedulaTraseraRef as any}
          onFrontalChange={e => handleFileChange(e.target.files?.[0], setCedulaFrontalFile, setCedulaFrontalPreview)}
          onTraseraChange={e => handleFileChange(e.target.files?.[0], setCedulaTraseraFile, setCedulaTraseraPreview)}
        />

        {/* Licencia de conducir */}
        <DocUploadCard
          title="Licencia de Conducir"
          icon={Car}
          frontalPreview={licenciaFrontalPreview}
          traseraPreview={licenciaTraseraPreview}
          frontalRef={licenciaFrontalRef as any}
          traseraRef={licenciaTraseraRef as any}
          onFrontalChange={e => handleFileChange(e.target.files?.[0], setLicenciaFrontalFile, setLicenciaFrontalPreview)}
          onTraseraChange={e => handleFileChange(e.target.files?.[0], setLicenciaTraseraFile, setLicenciaTraseraPreview)}
        />

        <div className="flex justify-between items-center">
          <Button variant="destructive" size="sm" className="gap-2" onClick={() => setDeleteAccountAlert(true)}>
            <Trash2 className="w-4 h-4" />
            Eliminar mi cuenta
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>

        <AlertDialog open={deleteAccountAlert} onOpenChange={setDeleteAccountAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar tu cuenta?</AlertDialogTitle>
              <AlertDialogDescription>Esta acción eliminará tu perfil de conductor. Podrás registrarte en otra compañía con un nuevo link de invitación.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar cuenta</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </DashboardLayout>
  );
}
