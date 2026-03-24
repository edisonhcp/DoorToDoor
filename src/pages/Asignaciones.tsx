import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Route, Truck, Plus, Clock, MapPin, Users, DollarSign, Package, Pencil, X, CalendarIcon, Copy } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
  const [fechaSalida, setFechaSalida] = useState<Date | undefined>(undefined);
  const clearForm = () => {
    setSelectedVehiculo("");
    setDestino("");
    setOrigen("");
    setHoraSalida("");
    setCantidadPasajeros("");
    setValorPasajeros("");
    setValorEncomienda("");
    setFechaSalida(undefined);
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
    setFechaSalida(a.fecha_salida ? new Date(a.fecha_salida) : undefined);
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

      // Validate date/time is after the last assignment for this vehicle
      if (vehiculoData.ultimo_viaje) {
        const ultimaFecha = new Date(vehiculoData.ultimo_viaje.fecha_salida);
        const nuevaFecha = fechaSalida || new Date();
        
        // Compare dates first
        const ultimaDateOnly = new Date(ultimaFecha.getFullYear(), ultimaFecha.getMonth(), ultimaFecha.getDate());
        const nuevaDateOnly = new Date(nuevaFecha.getFullYear(), nuevaFecha.getMonth(), nuevaFecha.getDate());
        
        if (nuevaDateOnly < ultimaDateOnly) {
          toast({ title: "Fecha no permitida", description: "La fecha de salida debe ser posterior a la última ruta asignada para este vehículo", variant: "destructive" });
          return;
        }
        
        if (nuevaDateOnly.getTime() === ultimaDateOnly.getTime() && horaSalida && vehiculoData.ultimo_viaje.hora_salida) {
          if (horaSalida <= vehiculoData.ultimo_viaje.hora_salida) {
            toast({ title: "Hora no permitida", description: "La hora de salida debe ser posterior a la última ruta asignada para este vehículo", variant: "destructive" });
            return;
          }
        }
      }

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
        fecha_salida: fechaSalida ? fechaSalida.toISOString() : new Date().toISOString(),
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
                {/* Vehículo - show on create and edit */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Vehículo disponible</Label>
                  <Select value={selectedVehiculo} onValueChange={setSelectedVehiculo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar vehículo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vehiculosDisponibles.map((v) => {
                        const estadoLabel = v.ultimo_viaje?.estado === "ASIGNADO" ? "Asignado"
                          : v.ultimo_viaje?.estado === "EN_RUTA" ? "Ruta Iniciada"
                          : v.ultimo_viaje?.estado === "FINALIZADO" ? `Ruta Finalizada → ${v.ultimo_viaje?.destino || ""}`
                          : "Disponible";
                        const estadoColor = v.ultimo_viaje?.estado === "EN_RUTA" ? "text-orange-600"
                          : v.ultimo_viaje?.estado === "ASIGNADO" ? "text-blue-600"
                          : v.ultimo_viaje?.estado === "FINALIZADO" ? "text-green-600"
                          : "text-muted-foreground";
                        return (
                          <SelectItem key={v.vehiculo_id} value={v.vehiculo_id}>
                            <span>{v.placa} — {v.marca} {v.modelo} ({v.conductor_nombre})</span>
                            <span className={`ml-2 text-xs font-medium ${estadoColor}`}>• {estadoLabel}</span>
                          </SelectItem>
                        );
                      })}
                      {/* If editing, show current vehicle option too */}
                      {editingId && !vehiculosDisponibles.find(v => v.vehiculo_id === selectedVehiculo) && selectedVehiculo && (
                        <SelectItem value={selectedVehiculo} disabled>
                          Vehículo actual (no cambiar)
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Origen</Label>
                  <Input placeholder="Ciudad de origen" value={origen} onChange={(e) => setOrigen(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Destino</Label>
                  <Input placeholder="Ciudad de destino" value={destino} onChange={(e) => setDestino(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Fecha de salida</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !fechaSalida && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fechaSalida ? format(fechaSalida, "dd/MM/yyyy") : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fechaSalida}
                        onSelect={setFechaSalida}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
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
          ) : (() => {
            const filteredAsignaciones = asignaciones.filter(a => {
              if (a.estado === "FINALIZADO" && (a as any).fecha_llegada) {
                const finalizadoTime = new Date((a as any).fecha_llegada).getTime();
                if (Date.now() - finalizadoTime > 24 * 60 * 60 * 1000) return false;
              }
              return true;
            });
            return filteredAsignaciones.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <Route className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground">No hay rutas asignadas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAsignaciones.map((a) => {
                const badge = estadoBadge[a.estado] || { label: a.estado, variant: "secondary" as const };
                const isFinalized24h = a.estado === "FINALIZADO" && (a as any).fecha_llegada && (Date.now() - new Date((a as any).fecha_llegada).getTime() > 24 * 60 * 60 * 1000);
                const canEdit = !isFinalized24h;
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
                              {a.fecha_salida && (
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="w-3 h-3" />
                                  {format(new Date(a.fecha_salida), "dd/MM/yyyy")}
                                </span>
                              )}
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
                        <div className="flex gap-2 shrink-0">
                          <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => handleEdit(a)}
                              disabled={!canEdit}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Editar
                            </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              const fechaStr = a.fecha_salida ? format(new Date(a.fecha_salida), "dd/MM/yyyy") : "—";
                              const horaStr = a.hora_salida || "—";
                              const texto = `*FECHA Y HORA:* ${fechaStr} ${horaStr}\n*RUTA:* ${a.origen} → ${a.destino}\n*CANTIDAD DE PASAJEROS:* ${a.cantidad_pasajeros}\n*PRECIO TOTAL:* $${a.ingresos?.pasajeros_monto?.toFixed(2) || "0.00"}\n*TOTAL ENCOMIENDA:* $${a.ingresos?.encomiendas_monto?.toFixed(2) || "0.00"}`;
                              navigator.clipboard.writeText(texto);
                              toast({ title: "Copiado al portapapeles", description: "Información lista para pegar en WhatsApp" });
                            }}
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copiar a WhatsApp
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
          })()}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
