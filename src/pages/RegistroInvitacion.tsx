import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Truck, Mail, Lock, User, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { validateInvitation, registerWithInvitation } from "@/services/invitacionesService";

interface DatosExtra {
  nombres: string;
  apellidos: string;
  identificacion: string;
  celular: string;
  domicilio: string;
  tipo_licencia: string;
  estado_civil: string;
  nacionalidad: string;
  fecha_nacimiento: string;
  fecha_caducidad_licencia: string;
  direccion: string;
  codigo: string;
}

interface DatosEmpresa {
  nombre_empresa: string;
  ruc: string;
  ciudad: string;
  direccion: string;
  celular_empresa: string;
  propietario_nombre: string;
  propietario_apellidos: string;
  tipo_comision: string;
  comision_pct: string;
  comision_fija: string;
  frecuencia_comision: string;
}

const emptyDatos: DatosExtra = {
  nombres: "", apellidos: "", identificacion: "", celular: "", domicilio: "",
  tipo_licencia: "", estado_civil: "", nacionalidad: "Ecuatoriana",
  fecha_nacimiento: "", fecha_caducidad_licencia: "", direccion: "", codigo: "",
};

const emptyEmpresa: DatosEmpresa = {
  nombre_empresa: "", ruc: "", ciudad: "", direccion: "",
  celular_empresa: "", propietario_nombre: "", propietario_apellidos: "",
  tipo_comision: "PORCENTAJE", comision_pct: "10", comision_fija: "0",
  frecuencia_comision: "SEMANAL",
};

export default function RegistroInvitacion() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [validating, setValidating] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [rol, setRol] = useState<string>("");
  const [empresaNombre, setEmpresaNombre] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [datos, setDatos] = useState<DatosExtra>(emptyDatos);
  const [datosEmpresa, setDatosEmpresa] = useState<DatosEmpresa>(emptyEmpresa);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const validate = async () => {
      if (!token) { setInvalid(true); setValidating(false); return; }
      const result = await validateInvitation(token);
      if (!result.valid) {
        setInvalid(true);
      } else {
        setRol(result.rol);
        setEmpresaNombre(result.empresa_nombre || "");
      }
      setValidating(false);
    };
    validate();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);

    const username = email.split("@")[0];

    try {
      const body: any = { token, email, password, username };
      if (rol === "GERENCIA") {
        body.datos_extra = datosEmpresa;
      } else if (rol === "CONDUCTOR" || rol === "PROPIETARIO") {
        body.datos_extra = datos;
      }

      await registerWithInvitation(body);
      toast({ title: "¡Registro exitoso!", description: "Ya puedes iniciar sesión con tu cuenta." });
      navigate("/login");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const rolLabels: Record<string, string> = {
    GERENCIA: "Administrador de Agencia",
    CONDUCTOR: "Conductor",
    PROPIETARIO: "Propietario de Vehículo",
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full border-0 shadow-xl">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-display font-bold text-foreground mb-2">Invitación Inválida</h2>
            <p className="text-muted-foreground mb-6">
              Este enlace de registro es inválido o ha expirado. Contacta al administrador para obtener uno nuevo.
            </p>
            <Button onClick={() => navigate("/login")}>Ir al Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary blur-[100px]" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-secondary blur-[120px]" />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary mb-8">
            <Truck className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-display font-bold text-sidebar-foreground mb-4">DoorToDoor</h1>
          <p className="text-sidebar-foreground/60 text-lg max-w-md">
            {empresaNombre ? `Registro para ${empresaNombre}` : "Registro de usuario"}
          </p>
          <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sidebar-accent">
            <User className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-sidebar-foreground">{rolLabels[rol] || rol}</span>
          </div>
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-lg">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-display font-bold text-foreground">DoorToDoor</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-display font-bold text-foreground">Crear tu cuenta</h2>
            <p className="text-muted-foreground mt-1">
              {empresaNombre && <span className="font-medium text-foreground">{empresaNombre}</span>}
              {" · "}{rolLabels[rol] || rol}
            </p>
          </div>

          <Card className="border-0 shadow-xl shadow-primary/5">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Correo electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 6 caracteres" className="pl-10 pr-10" required minLength={6}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {rol === "GERENCIA" && (
                  <div className="border-t border-border pt-4 space-y-3">
                    <p className="text-sm font-semibold text-foreground">Datos de la Compañía</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2"><Label>Nombre de la compañía</Label><Input value={datosEmpresa.nombre_empresa} onChange={e => setDatosEmpresa({ ...datosEmpresa, nombre_empresa: e.target.value })} required /></div>
                      <div><Label>RUC</Label><Input value={datosEmpresa.ruc} onChange={e => setDatosEmpresa({ ...datosEmpresa, ruc: e.target.value })} required /></div>
                      <div><Label>Ciudad</Label><Input value={datosEmpresa.ciudad} onChange={e => setDatosEmpresa({ ...datosEmpresa, ciudad: e.target.value })} required /></div>
                      <div className="col-span-2"><Label>Dirección</Label><Input value={datosEmpresa.direccion} onChange={e => setDatosEmpresa({ ...datosEmpresa, direccion: e.target.value })} required /></div>
                      <div><Label>Celular de la compañía</Label><Input value={datosEmpresa.celular_empresa} onChange={e => setDatosEmpresa({ ...datosEmpresa, celular_empresa: e.target.value.replace(/\D/g, "").slice(0, 10) })} maxLength={10} inputMode="numeric" pattern="[0-9]*" required /></div>
                      <div><Label>Nombres del representante</Label><Input value={datosEmpresa.propietario_nombre} onChange={e => setDatosEmpresa({ ...datosEmpresa, propietario_nombre: e.target.value })} required /></div>
                      <div><Label>Apellidos del representante</Label><Input value={datosEmpresa.propietario_apellidos} onChange={e => setDatosEmpresa({ ...datosEmpresa, propietario_apellidos: e.target.value })} required /></div>
                    </div>

                    <div className="border-t border-border pt-4 space-y-3">
                      <p className="text-sm font-semibold text-foreground">Configuración de Comisión</p>
                      
                      <div className="space-y-2">
                        <Label>¿Esta compañía recibe la comisión mediante?</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setDatosEmpresa({ ...datosEmpresa, tipo_comision: "PORCENTAJE" })}
                            className={`p-3 rounded-lg border-2 text-left transition-colors ${datosEmpresa.tipo_comision === "PORCENTAJE" ? "border-primary bg-primary/5" : "border-border"}`}
                          >
                            <p className="text-sm font-medium text-foreground">Porcentaje</p>
                            <p className="text-xs text-muted-foreground">Se cobra un % del ingreso</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDatosEmpresa({ ...datosEmpresa, tipo_comision: "FIJO" })}
                            className={`p-3 rounded-lg border-2 text-left transition-colors ${datosEmpresa.tipo_comision === "FIJO" ? "border-primary bg-primary/5" : "border-border"}`}
                          >
                            <p className="text-sm font-medium text-foreground">Valor Fijo</p>
                            <p className="text-xs text-muted-foreground">Se cobra un monto fijo</p>
                          </button>
                        </div>
                      </div>

                      {datosEmpresa.tipo_comision === "PORCENTAJE" ? (
                        <div className="space-y-2">
                          <Label>Porcentaje de comisión (%)</Label>
                          <Input
                            type="number" min="0" max="100" step="1"
                            value={datosEmpresa.comision_pct}
                            onChange={e => setDatosEmpresa({ ...datosEmpresa, comision_pct: e.target.value })}
                            placeholder="Ej: 10"
                            required
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label>Valor fijo de comisión ($)</Label>
                          <Input
                            type="number" min="0" step="0.01"
                            value={datosEmpresa.comision_fija}
                            onChange={e => setDatosEmpresa({ ...datosEmpresa, comision_fija: e.target.value })}
                            placeholder="Ej: 50.00"
                            required
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>¿Con qué frecuencia recibe la comisión?</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["SEMANAL", "QUINCENAL", "MENSUAL"] as const).map(freq => (
                            <button
                              key={freq}
                              type="button"
                              onClick={() => setDatosEmpresa({ ...datosEmpresa, frecuencia_comision: freq })}
                              className={`p-2.5 rounded-lg border-2 text-center text-sm font-medium transition-colors ${datosEmpresa.frecuencia_comision === freq ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground"}`}
                            >
                              {freq.charAt(0) + freq.slice(1).toLowerCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {rol === "CONDUCTOR" && (
                  <div className="border-t border-border pt-4 space-y-3">
                    <p className="text-sm font-semibold text-foreground">Datos del Conductor</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Nombres</Label><Input value={datos.nombres} onChange={e => setDatos({ ...datos, nombres: e.target.value })} required /></div>
                      <div><Label>Apellidos</Label><Input value={datos.apellidos} onChange={e => setDatos({ ...datos, apellidos: e.target.value })} required /></div>
                      <div><Label>Identificación</Label><Input value={datos.identificacion} onChange={e => setDatos({ ...datos, identificacion: e.target.value.replace(/\D/g, "").slice(0, 10) })} maxLength={10} inputMode="numeric" pattern="[0-9]*" required /></div>
                      <div><Label>Celular</Label><Input value={datos.celular} onChange={e => setDatos({ ...datos, celular: e.target.value.replace(/\D/g, "").slice(0, 10) })} maxLength={10} inputMode="numeric" pattern="[0-9]*" required /></div>
                      <div className="col-span-2"><Label>Domicilio</Label><Input value={datos.domicilio} onChange={e => setDatos({ ...datos, domicilio: e.target.value })} /></div>
                      <div><Label>Tipo de licencia</Label><Input value={datos.tipo_licencia} onChange={e => setDatos({ ...datos, tipo_licencia: e.target.value })} /></div>
                      <div className="space-y-2">
                        <Label>Estado civil</Label>
                        <Select value={datos.estado_civil} onValueChange={v => setDatos({ ...datos, estado_civil: v })}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Soltero">Soltero</SelectItem>
                            <SelectItem value="Casado">Casado</SelectItem>
                            <SelectItem value="Divorciado">Divorciado</SelectItem>
                            <SelectItem value="Viudo">Viudo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Nacionalidad</Label><Input value={datos.nacionalidad} onChange={e => setDatos({ ...datos, nacionalidad: e.target.value })} /></div>
                      <div><Label>Fecha nacimiento</Label><Input type="date" value={datos.fecha_nacimiento} max={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()).toISOString().split("T")[0]} onChange={e => setDatos({ ...datos, fecha_nacimiento: e.target.value })} /></div>
                      <div className="col-span-2"><Label>Fecha caducidad licencia</Label><Input type="date" value={datos.fecha_caducidad_licencia} onChange={e => setDatos({ ...datos, fecha_caducidad_licencia: e.target.value })} /></div>
                    </div>
                  </div>
                )}

                {rol === "PROPIETARIO" && (
                  <div className="border-t border-border pt-4 space-y-3">
                    <p className="text-sm font-semibold text-foreground">Datos del Propietario</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Nombres</Label><Input value={datos.nombres} onChange={e => setDatos({ ...datos, nombres: e.target.value })} required /></div>
                      <div><Label>Apellidos</Label><Input value={datos.apellidos} onChange={e => setDatos({ ...datos, apellidos: e.target.value })} required /></div>
                      <div><Label>Identificación</Label><Input value={datos.identificacion} onChange={e => setDatos({ ...datos, identificacion: e.target.value.replace(/\D/g, "").slice(0, 10) })} maxLength={10} inputMode="numeric" pattern="[0-9]*" required /></div>
                      <div><Label>Celular</Label><Input value={datos.celular} onChange={e => setDatos({ ...datos, celular: e.target.value.replace(/\D/g, "").slice(0, 10) })} maxLength={10} inputMode="numeric" pattern="[0-9]*" required /></div>
                      <div className="col-span-2"><Label>Dirección</Label><Input value={datos.direccion} onChange={e => setDatos({ ...datos, direccion: e.target.value })} /></div>
                      <div className="space-y-2">
                        <Label>Estado civil</Label>
                        <Select value={datos.estado_civil} onValueChange={v => setDatos({ ...datos, estado_civil: v })}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Soltero">Soltero</SelectItem>
                            <SelectItem value="Casado">Casado</SelectItem>
                            <SelectItem value="Divorciado">Divorciado</SelectItem>
                            <SelectItem value="Viudo">Viudo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Nacionalidad</Label><Input value={datos.nacionalidad} onChange={e => setDatos({ ...datos, nacionalidad: e.target.value })} /></div>
                      <div className="col-span-2"><Label>Fecha nacimiento</Label><Input type="date" value={datos.fecha_nacimiento} max={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()).toISOString().split("T")[0]} onChange={e => setDatos({ ...datos, fecha_nacimiento: e.target.value })} /></div>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full h-11 font-display font-semibold" disabled={submitting}>
                  {submitting ? "Registrando..." : "Crear Cuenta"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}