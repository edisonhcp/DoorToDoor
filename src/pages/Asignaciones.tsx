import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Route, Truck, Plus, Clock, MapPin, Users, DollarSign, Package, Pencil, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  fetchVehiculosDisponibles,
  crearAsignacionRuta,
  fetchAsignacionesActivas,
  editarAsignacionRuta,
  type RutaAsignada,
} from "@/services/asignacionesRutaService";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const estadoBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ASIGNADO: { label: "Asignado", variant: "secondary" },
  EN_RUTA: { label: "Ruta Iniciada", variant: "default" },
  FINALIZADO: { label: "Ruta Finalizada", variant: "outline" },
};

export default function Asignaciones() {
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const [vehiculosDisponibles, setVehiculosDisponibles] = useState<any[]>([]);
  const [asignaciones, setAsignaciones] = useState<RutaAsignada[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [selectedVehiculo, setSelectedVehiculo] = useState("");
  const [destino, setDestino] = useState("");
  const [origen, setOrigen] = useState("");
  const [horaSalida, setHoraSalida] = useState("");
  const [cantidadPasajeros, setCantidadPasajeros] = useState("");
  const [valorPasajeros, setValorPasajeros] = useState("");
  const [valorEncomienda, setValorEncomienda] = useState("");

  const clearForm = () => {
    setSelectedVehiculo("");
    setDestino("");
    setOrigen("");
    setHoraSalida("");
    setCantidadPasajeros("");
    setValorPasajeros("");
    setValorEncomienda("");
    setEditingId(null);
  };

  const loadData = async () => {
    if (!empresaId) return;
    const [vehiculos, asigs] = await Promise.all([
      fetchVehiculosDisponibles(empresaId),
      fetchAsignacionesActivas(empresaId),
    ]);
    setVehiculosDisponibles(vehiculos);
    setAsignaciones(asigs.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [empresaId]);

  const handleEdit = (a: RutaAsignada) => {
    setEditingId(a.id);
    setOrigen(a.origen);
    setDestino(a.destino);
    setHoraSalida(a.hora_salida || "");
    setCantidadPasajeros(String(a.cantidad_pasajeros || 0));
    setValorPasajeros(String(a.ingresos?.pasajeros_monto || 0));
    setValorEncomienda(String(a.ingresos?.encomiendas_monto || 0));
    setSelectedVehiculo(a.asignacion_id || "");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async () => {
    if (!empresaId) return;

    if (editingId) {
      // Edit mode
      if (!destino || !origen) {
        toast({ title: "Completa todos los campos obligatorios", variant: "destructive" });
        return;
      }
      setSubmitting(true);

      // Check if vehicle was changed (selectedVehiculo will be a vehiculo_id if changed, or the original asignacion_id)
      const vehiculoData = vehiculosDisponibles.find((v) => v.vehiculo_id === selectedVehiculo);
      const newAsignacionId = vehiculoData ? vehiculoData.id : undefined;

      const { error } = await editarAsignacionRuta({
        viaje_id: editingId,
        destino,
        origen,
        hora_salida: horaSalida,
        cantidad_pasajeros: parseInt(cantidadPasajeros) || 0,
        pasajeros_monto: parseFloat(valorPasajeros) || 0,
        encomiendas_monto: parseFloat(valorEncomienda) || 0,
        asignacion_id: newAsignacionId,
      });
      setSubmitting(false);

      if (error) {
        toast({ title: "Error al editar ruta", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Ruta actualizada exitosamente" });
        clearForm();
        loadData();
      }
    } else {
      // Create mode
      if (!selectedVehiculo || !destino || !origen) {
        toast({ title: "Completa todos los campos obligatorios", variant: "destructive" });
        return;
      }
      const vehiculoData = vehiculosDisponibles.find((v) => v.vehiculo_id === selectedVehiculo);
      if (!vehiculoData) return;

      setSubmitting(true);
      const { error } = await crearAsignacionRuta({
        asignacion_id: vehiculoData.id,
        destino,
        origen,
        hora_salida: horaSalida,
        cantidad_pasajeros: parseInt(cantidadPasajeros) || 0,
        pasajeros_monto: parseFloat(valorPasajeros) || 0,
        encomiendas_monto: parseFloat(valorEncomienda) || 0,
        empresa_id: empresaId,
      });
      setSubmitting(false);

      if (error) {
        toast({ title: "Error al asignar ruta", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Ruta asignada exitosamente" });
        clearForm();
        loadData();
      }
    }
  };

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        <motion.div variants={item}>
          <h1 className="text-3xl font-display font-bold text-foreground">Asignaciones de Ruta</h1>
          <p className="text-muted-foreground mt-1">Asigna vehículos a rutas y gestiona los ingresos</p>
        </motion.div>

        {/* Form */}
        <motion.div variants={item} ref={formRef}>
          <Card className={`border-0 shadow-sm border-l-4 ${editingId ? "border-l-amber-500" : "border-l-primary"}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  {editingId ? (
                    <>
                      <Pencil className="w-4 h-4 text-amber-500" />
                      Editando Asignación
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-primary" />
                      Nueva Asignación de Ruta
                    </>
                  )}
                </CardTitle>
                {editingId && (
                  <Button variant="ghost" size="sm" onClick={clearForm} className="gap-1 text-muted-foreground">
                    <X className="w-4 h-4" /> Cancelar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Vehículo - only show on create */}
                {!editingId && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Vehículo disponible</Label>
                    <Select value={selectedVehiculo} onValueChange={setSelectedVehiculo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar vehículo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {vehiculosDisponibles.map((v) => (
                          <SelectItem key={v.vehiculo_id} value={v.vehiculo_id}>
                            {v.placa} — {v.marca} {v.modelo} ({v.conductor_nombre})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Origen</Label>
                  <Input placeholder="Ciudad de origen" value={origen} onChange={(e) => setOrigen(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Destino</Label>
                  <Input placeholder="Ciudad de destino" value={destino} onChange={(e) => setDestino(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Hora de salida</Label>
                  <Input type="time" value={horaSalida} onChange={(e) => setHoraSalida(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Cantidad de pasajeros</Label>
                  <Input type="number" min="0" placeholder="0" value={cantidadPasajeros} onChange={(e) => setCantidadPasajeros(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Valor total pasajeros ($)</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={valorPasajeros} onChange={(e) => setValorPasajeros(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Valor de encomienda ($)</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={valorEncomienda} onChange={(e) => setValorEncomienda(e.target.value)} />
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={editingId ? (!destino || !origen || submitting) : (!selectedVehiculo || !destino || !origen || submitting)}
                    className={`gap-2 w-full ${editingId ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                  >
                    {editingId ? (
                      <>
                        <Pencil className="w-4 h-4" />
                        {submitting ? "Guardando..." : "Guardar cambios"}
                      </>
                    ) : (
                      <>
                        <Route className="w-4 h-4" />
                        {submitting ? "Asignando..." : "Asignar"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active assignments list */}
        <motion.div variants={item}>
          <h2 className="text-xl font-display font-semibold text-foreground mb-4">Rutas Asignadas</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : asignaciones.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <Route className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground">No hay rutas asignadas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {asignaciones.map((a) => {
                const badge = estadoBadge[a.estado] || { label: a.estado, variant: "secondary" as const };
                const canEdit = a.estado === "ASIGNADO" || a.estado === "EN_RUTA";
                return (
                  <Card key={a.id} className={`border-0 shadow-sm hover:shadow-md transition-shadow ${editingId === a.id ? "ring-2 ring-amber-500" : ""}`}>
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Truck className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-display font-semibold text-foreground">
                                {a.vehiculo?.placa || "—"} · {a.vehiculo?.marca} {a.vehiculo?.modelo}
                              </span>
                              <Badge variant={badge.variant}>{badge.label}</Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {a.origen} → {a.destino}
                              </span>
                              {a.hora_salida && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {a.hora_salida}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {a.cantidad_pasajeros} pasajeros
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                Pasajeros: ${a.ingresos?.pasajeros_monto?.toFixed(2) || "0.00"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                Encomienda: ${a.ingresos?.encomiendas_monto?.toFixed(2) || "0.00"}
                              </span>
                              {a.conductor && (
                                <span className="text-xs">
                                  Conductor: {a.conductor.nombres} {a.conductor.apellidos}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 shrink-0"
                            onClick={() => handleEdit(a)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Editar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
