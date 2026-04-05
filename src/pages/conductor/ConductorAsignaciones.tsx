import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Route, Truck, Clock, Users, CheckCircle2, Save, Upload, Image, DollarSign, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import {
  fetchConductorViajes,
  upsertEgresos,
  uploadRecibo,
} from "@/services/egresosService";
import { iniciarRuta, finalizarRuta } from "@/services/asignacionesRutaService";
import { fetchAlimentacionByVehiculos, VehiculoAlimentacion } from "@/services/alimentacionService";
import { fetchEmpresaInfo } from "@/services/dashboardService";
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

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const estadoBadge: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  ASIGNADO: { label: "Asignado", variant: "secondary" },
  EN_RUTA: { label: "Ruta Iniciada", variant: "default" },
  FINALIZADO: { label: "Ruta Finalizada", variant: "outline" },
};

/**
 * Hide FINALIZADO trips 24 hours after fecha_llegada.
 */

function shouldHideFinalizadoViaje(viaje: any): boolean {
  if (viaje.estado !== "FINALIZADO") return false;
  const fechaLlegada = viaje.fecha_llegada ? new Date(viaje.fecha_llegada) : null;
  if (!fechaLlegada) return false;
  const now = new Date();
  return now.getTime() - fechaLlegada.getTime() > 24 * 60 * 60 * 1000;
}

export default function ConductorAsignaciones() {
  const { role, user, empresaId } = useAuth();
  const { toast } = useToast();
  const [viajes, setViajes] = useState<any[]>([]);
  const [empresaIdLocal, setEmpresaIdLocal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingEgresos, setEditingEgresos] = useState<string | null>(null);
  const [egresoForm, setEgresoForm] = useState({
    peaje: "", hotel: "", pago_conductor: "", combustible: "", varios: "",
    desayuno: false, almuerzo: false, merienda: false,
    varios_texto: "",
  });
  const [combustibleFile, setCombustibleFile] = useState<File | null>(null);
  const [variosFile, setVariosFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; viajeId: string; resumen: any } | null>(null);
  const [alimentacionMap, setAlimentacionMap] = useState<Record<string, VehiculoAlimentacion>>({});
  const [asigVehMap, setAsigVehMap] = useState<Record<string, string>>({});
  const [frecuenciaComision, setFrecuenciaComision] = useState<string>("SEMANAL");

  const loadData = async () => {
    if (!user?.id) return;
    const { data, empresaId: eid } = await fetchConductorViajes(user.id, ["ASIGNADO", "EN_RUTA", "FINALIZADO"]);
    setViajes(data);
    setEmpresaIdLocal(eid);

    // Fetch empresa config for frecuencia_comision
    if (eid || empresaId) {
      const info = await fetchEmpresaInfo((eid || empresaId)!);
      if (info?.frecuencia_comision) {
        setFrecuenciaComision(info.frecuencia_comision);
      }
    }

    const asignacionIds = [...new Set(data.map((v: any) => v.asignacion_id).filter(Boolean))];
    if (asignacionIds.length > 0) {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: asigs } = await supabase
        .from("asignaciones")
        .select("id, vehiculo_id")
        .in("id", asignacionIds);
      if (asigs) {
        const aToV: Record<string, string> = {};
        asigs.forEach(a => { aToV[a.id] = a.vehiculo_id; });
        setAsigVehMap(aToV);
        const vehIds = [...new Set(asigs.map(a => a.vehiculo_id))];
        const { data: configs } = await fetchAlimentacionByVehiculos(vehIds);
        const map: Record<string, VehiculoAlimentacion> = {};
        configs.forEach(c => { map[c.vehiculo_id] = c; });
        setAlimentacionMap(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const getAlimConfig = (viaje: any) => {
    const vehId = asigVehMap[viaje.asignacion_id];
    return vehId ? alimentacionMap[vehId] : null;
  };

  if (role !== "CONDUCTOR") return <Navigate to="/dashboard" replace />;

  // Filter out FINALIZADO trips that should be hidden based on cutoff + 24h
  const filteredViajes = viajes.filter(v => !shouldHideFinalizadoViaje(v));

  const handleIniciarRuta = async (viajeId: string) => {
    const { error } = await iniciarRuta(viajeId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Ruta iniciada" }); loadData(); }
  };

  const handleFinalizarRuta = async (viajeId: string) => {
    const { error } = await finalizarRuta(viajeId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Ruta finalizada" }); loadData(); }
  };

  const openEgresoEditor = (viaje: any) => {
    const eg = viaje.egresos;
    setEditingEgresos(viaje.id);
    setEgresoForm({
      peaje: eg?.peaje ? String(eg.peaje) : "",
      hotel: eg?.hotel ? String(eg.hotel) : "",
      pago_conductor: eg?.pago_conductor ? String(eg.pago_conductor) : "",
      combustible: eg?.combustible ? String(eg.combustible) : "",
      varios: eg?.varios ? String(eg.varios) : "",
      desayuno: eg?.desayuno || false,
      almuerzo: eg?.almuerzo || false,
      merienda: eg?.merienda || false,
      varios_texto: eg?.varios_texto || "",
    });
    setCombustibleFile(null);
    setVariosFile(null);
  };

  const handlePreSaveEgresos = (viajeId: string) => {
    const viaje = viajes.find(v => v.id === viajeId);
    const alimConfig = viaje ? getAlimConfig(viaje) : null;
    const valorComida = alimConfig?.valor_comida ?? 3;

    const alimentacionItems = [];
    if (egresoForm.desayuno) alimentacionItems.push("Desayuno");
    if (egresoForm.almuerzo) alimentacionItems.push("Almuerzo");
    if (egresoForm.merienda) alimentacionItems.push("Merienda");

    const alimentacionTotal = alimentacionItems.length * valorComida;

    const resumen = {
      peaje: parseFloat(egresoForm.peaje) || 0,
      hotel: parseFloat(egresoForm.hotel) || 0,
      pago_conductor: parseFloat(egresoForm.pago_conductor) || 0,
      combustible: parseFloat(egresoForm.combustible) || 0,
      varios: parseFloat(egresoForm.varios) || 0,
      alimentacion: alimentacionItems.length > 0 ? `${alimentacionItems.join(", ")} ($${alimentacionTotal.toFixed(2)})` : "Ninguna",
      alimentacion_total: alimentacionTotal,
      varios_texto: egresoForm.varios_texto || "",
      total: (parseFloat(egresoForm.peaje) || 0) + (parseFloat(egresoForm.hotel) || 0) +
        (parseFloat(egresoForm.pago_conductor) || 0) + (parseFloat(egresoForm.combustible) || 0) +
        (parseFloat(egresoForm.varios) || 0) + alimentacionTotal,
    };
    setConfirmDialog({ open: true, viajeId, resumen });
  };

  const handleConfirmSaveEgresos = async () => {
    if (!confirmDialog || !empresaIdLocal) return;
    const viajeId = confirmDialog.viajeId;
    setConfirmDialog(null);
    setSaving(true);

    let combustible_foto_url: string | null | undefined = undefined;
    let varios_foto_url: string | null | undefined = undefined;

    if (combustibleFile) {
      combustible_foto_url = await uploadRecibo(combustibleFile, "combustible");
    }
    if (variosFile) {
      varios_foto_url = await uploadRecibo(variosFile, "varios");
    }

    const { error } = await upsertEgresos({
      viaje_id: viajeId,
      empresa_id: empresaIdLocal,
      peaje: parseFloat(egresoForm.peaje) || 0,
      hotel: parseFloat(egresoForm.hotel) || 0,
      pago_conductor: parseFloat(egresoForm.pago_conductor) || 0,
      combustible: parseFloat(egresoForm.combustible) || 0,
      varios: parseFloat(egresoForm.varios) || 0,
      desayuno: egresoForm.desayuno,
      almuerzo: egresoForm.almuerzo,
      merienda: egresoForm.merienda,
      varios_texto: egresoForm.varios_texto || null,
      alimentacion: confirmDialog.resumen.alimentacion_total || 0,
      ...(combustible_foto_url !== undefined && { combustible_foto_url }),
      ...(varios_foto_url !== undefined && { varios_foto_url }),
    });

    setSaving(false);
    if (error) {
      toast({ title: "Error al guardar egresos", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Egresos guardados" });
      setEditingEgresos(null);
      loadData();
    }
  };

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <h1 className="text-3xl font-display font-bold text-foreground">Mis Asignaciones</h1>
          <p className="text-muted-foreground mt-1">Gestiona tus rutas asignadas y registra egresos</p>
        </motion.div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : filteredViajes.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Route className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No tienes rutas asignadas</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Summary cards — group viajes by route + date + time */}
            {(() => {
              const groups: Record<string, any[]> = {};
              for (const v of filteredViajes) {
                const fechaStr = v.fecha_salida ? new Date(v.fecha_salida).toLocaleDateString("es-EC") : "";
                const key = `${v.asignacion_id || ""}_${v.origen}_${v.destino}_${fechaStr}_${v.hora_salida || ""}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(v);
              }
              const multiGroups = Object.entries(groups).filter(([, items]) => items.length > 1);
              if (multiGroups.length === 0) return null;
              return multiGroups.map(([key, items]) => {
                const first = items[0];
                const totalPasajeros = items.reduce((s, v) => s + (v.cantidad_pasajeros || 0), 0);
                const totalPasajerosMonto = items.reduce((s, v) => s + (v.ingresos?.pasajeros_monto || 0), 0);
                const totalEncomienda = items.reduce((s, v) => s + (v.ingresos?.encomiendas_monto || 0), 0);
                return (
                  <Card key={`summary-${key}`} className="border-0 shadow-sm border-l-4 border-l-primary bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-primary" />
                        <span className="font-display font-semibold text-foreground">
                          Resumen: {first.origen} → {first.destino}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {first.fecha_salida ? new Date(first.fecha_salida).toLocaleDateString("es-EC") : ""} {first.hora_salida || ""}
                        </span>
                        {first.vehiculo && <span><Truck className="w-3 h-3 inline mr-1" />{first.vehiculo.placa}</span>}
                      </div>
                      <div className="flex items-center gap-6 mt-2 text-sm font-medium flex-wrap">
                        <span className="flex items-center gap-1 text-foreground">
                          <Users className="w-4 h-4 text-primary" />
                          {totalPasajeros} pasajeros total
                        </span>
                        <span className="flex items-center gap-1 text-foreground">
                          <DollarSign className="w-4 h-4 text-primary" />
                          Pasajeros: ${totalPasajerosMonto.toFixed(2)}
                        </span>
                        <span className="flex items-center gap-1 text-foreground">
                          <Package className="w-4 h-4 text-primary" />
                          Encomienda: ${totalEncomienda.toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              });
            })()}
            {filteredViajes.map((v) => {
              const badge = estadoBadge[v.estado] || { label: v.estado, variant: "secondary" as const };
              const isEditing = editingEgresos === v.id;
              const alimConfig = getAlimConfig(v);

              return (
                <motion.div key={v.id} variants={item}>
                  <Card className={`border-0 shadow-sm ${v.estado === "EN_RUTA" ? "border-l-4 border-l-primary" : "border-l-4 border-l-muted"}`}>
                    <CardContent className="p-5 space-y-4">
                      {/* Route info */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Route className="w-5 h-5 text-primary" />
                            <span className="font-display font-semibold text-foreground">
                              {v.origen} → {v.destino}
                            </span>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            {v.fecha_salida && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Salida: {new Date(v.fecha_salida).toLocaleDateString("es-EC")} {v.hora_salida || ""}</span>}
                            {v.estado === "FINALIZADO" && v.fecha_llegada && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Llegada: {new Date(v.fecha_llegada).toLocaleDateString("es-EC")} {new Date(v.fecha_llegada).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}</span>}
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{v.cantidad_pasajeros} pasajeros</span>
                            {v.vehiculo && <span><Truck className="w-3 h-3 inline mr-1" />{v.vehiculo.placa}</span>}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>Pasajeros: ${v.ingresos?.pasajeros_monto?.toFixed(2) || "0.00"}</span>
                            <span>Encomienda: ${v.ingresos?.encomiendas_monto?.toFixed(2) || "0.00"}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {v.estado === "ASIGNADO" && (
                            <Button onClick={() => handleIniciarRuta(v.id)} className="gap-2" size="sm">
                              <Route className="w-4 h-4" /> Iniciar Ruta
                            </Button>
                          )}
                          {v.estado === "EN_RUTA" && (
                            <Button onClick={() => handleFinalizarRuta(v.id)} variant="outline" className="gap-2" size="sm">
                              <CheckCircle2 className="w-4 h-4" /> Finalizar Ruta
                            </Button>
                          )}
                          <Button
                            variant={isEditing ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => isEditing ? setEditingEgresos(null) : openEgresoEditor(v)}
                            className="gap-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            {isEditing ? "Cerrar" : "Egresos"}
                          </Button>
                        </div>
                      </div>

                      {/* Egresos editor */}
                      {isEditing && (
                        <div className="border-t border-border pt-4 space-y-4">
                          <h4 className="text-sm font-semibold text-foreground">Registro de Egresos</h4>

                          {/* Alimentación checkboxes */}
                          {(!alimConfig || alimConfig.alimentacion_habilitada) && (
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Alimentación {alimConfig ? `($${alimConfig.valor_comida} c/u)` : "($3.00 c/u)"}
                            </Label>
                            <div className="flex gap-4">
                              {[
                                { key: "desayuno", label: "D (Desayuno)", enabled: !alimConfig || alimConfig.desayuno_habilitado },
                                { key: "almuerzo", label: "A (Almuerzo)", enabled: !alimConfig || alimConfig.almuerzo_habilitado },
                                { key: "merienda", label: "M (Merienda)", enabled: !alimConfig || alimConfig.merienda_habilitado },
                              ].filter(m => m.enabled).map(({ key, label }) => (
                                <div key={key} className="flex items-center gap-2">
                                  <Checkbox
                                    checked={egresoForm[key as keyof typeof egresoForm] as boolean}
                                    onCheckedChange={(checked) =>
                                      setEgresoForm(prev => ({ ...prev, [key]: !!checked }))
                                    }
                                  />
                                  <Label className="text-xs">{label}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                          )}

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Peaje ($)</Label>
                              <Input type="number" min="0" step="0.01" value={egresoForm.peaje}
                                onChange={e => setEgresoForm(prev => ({ ...prev, peaje: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Hotel ($)</Label>
                              <Input type="number" min="0" step="0.01" value={egresoForm.hotel}
                                onChange={e => setEgresoForm(prev => ({ ...prev, hotel: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Pago conductor ($)</Label>
                              <Input type="number" min="0" step="0.01" value={egresoForm.pago_conductor}
                                onChange={e => setEgresoForm(prev => ({ ...prev, pago_conductor: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Combustible ($)</Label>
                              <Input type="number" min="0" step="0.01" value={egresoForm.combustible}
                                onChange={e => setEgresoForm(prev => ({ ...prev, combustible: e.target.value }))} />
                            </div>
                          </div>

                          {/* Combustible photo */}
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Foto combustible (opcional)</Label>
                            <Input type="file" accept="image/*" onChange={e => setCombustibleFile(e.target.files?.[0] || null)} className="text-xs" />
                          </div>

                          {/* Varios */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Varios ($)</Label>
                              <Input type="number" min="0" step="0.01" value={egresoForm.varios}
                                onChange={e => setEgresoForm(prev => ({ ...prev, varios: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Nota (varios)</Label>
                              <Input value={egresoForm.varios_texto}
                                onChange={e => setEgresoForm(prev => ({ ...prev, varios_texto: e.target.value }))}
                                placeholder="Descripción..." />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Foto varios (opcional)</Label>
                            <Input type="file" accept="image/*" onChange={e => setVariosFile(e.target.files?.[0] || null)} className="text-xs" />
                          </div>

                          <Button onClick={() => handlePreSaveEgresos(v.id)} disabled={saving} className="gap-2" size="sm">
                            <Save className="w-4 h-4" />
                            {saving ? "Guardando..." : "Guardar Egresos"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirmDialog?.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resumen de Egresos</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <span className="text-muted-foreground">Peaje:</span>
                  <span className="font-medium text-foreground">${confirmDialog?.resumen?.peaje?.toFixed(2)}</span>
                  <span className="text-muted-foreground">Hotel:</span>
                  <span className="font-medium text-foreground">${confirmDialog?.resumen?.hotel?.toFixed(2)}</span>
                  <span className="text-muted-foreground">Pago conductor:</span>
                  <span className="font-medium text-foreground">${confirmDialog?.resumen?.pago_conductor?.toFixed(2)}</span>
                  <span className="text-muted-foreground">Combustible:</span>
                  <span className="font-medium text-foreground">${confirmDialog?.resumen?.combustible?.toFixed(2)}</span>
                  <span className="text-muted-foreground">Varios:</span>
                  <span className="font-medium text-foreground">${confirmDialog?.resumen?.varios?.toFixed(2)}</span>
                  <span className="text-muted-foreground">Alimentación:</span>
                  <span className="font-medium text-foreground">{confirmDialog?.resumen?.alimentacion}</span>
                  {confirmDialog?.resumen?.varios_texto && (
                    <>
                      <span className="text-muted-foreground">Nota:</span>
                      <span className="font-medium text-foreground">{confirmDialog?.resumen?.varios_texto}</span>
                    </>
                  )}
                </div>
                <div className="border-t border-border pt-2 mt-2 flex justify-between">
                  <span className="font-semibold text-foreground">Total Egresos:</span>
                  <span className="font-bold text-foreground text-base">${confirmDialog?.resumen?.total?.toFixed(2)}</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSaveEgresos}>Aceptar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
