import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Route, Truck, Plus, Clock, MapPin, Users, DollarSign, Package, Pencil, X, CalendarIcon, Copy, User, Phone, FileText, MapPinned, Trash2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
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
  ASIGNADO: { label: "Reservado", variant: "secondary" },
  EN_RUTA: { label: "Ruta Iniciada", variant: "default" },
  FINALIZADO: { label: "Ruta Finalizada", variant: "outline" },
};

export default function AsignacionesPrueba() {
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const [vehiculosDisponibles, setVehiculosDisponibles] = useState<any[]>([]);
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingReservacionId, setEditingReservacionId] = useState<string | null>(null);

  // Form state
  const [selectedVehiculo, setSelectedVehiculo] = useState("");
  const [destino, setDestino] = useState("");
  const [origen, setOrigen] = useState("");
  const [parada, setParada] = useState("");
  const [horaSalida, setHoraSalida] = useState("");
  const [cantidadPasajeros, setCantidadPasajeros] = useState("");
  const [valorPasajeros, setValorPasajeros] = useState("");
  const [valorEncomienda, setValorEncomienda] = useState("");
  const [fechaSalida, setFechaSalida] = useState<Date | undefined>(undefined);
  const [pasajeroNombre, setPasajeroNombre] = useState("");
  const [pasajeroCelular, setPasajeroCelular] = useState("");
  const [pasajeroDetalle, setPasajeroDetalle] = useState("");
  const [pasajeroDireccion, setPasajeroDireccion] = useState("");

  const clearForm = () => {
    setSelectedVehiculo("");
    setDestino("");
    setOrigen("");
    setParada("");
    setHoraSalida("");
    setCantidadPasajeros("");
    setValorPasajeros("");
    setValorEncomienda("");
    setFechaSalida(undefined);
    setPasajeroNombre("");
    setPasajeroCelular("");
    setPasajeroDetalle("");
    setPasajeroDireccion("");
    setEditingId(null);
    setEditingReservacionId(null);
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

  const handleEdit = (a: any) => {
    setEditingId(a.id);
    setOrigen(a.origen);
    setDestino(a.destino);
    setHoraSalida(a.hora_salida || "");
    setCantidadPasajeros(String(a.cantidad_pasajeros || 0));
    setValorPasajeros(String(a.ingresos?.pasajeros_monto || 0));
    setValorEncomienda(String(a.ingresos?.encomiendas_monto || 0));
    setSelectedVehiculo(a.asignacion_id || "");
    setFechaSalida(a.fecha_salida ? new Date(a.fecha_salida) : undefined);
    setParada(a.reservacion?.parada || "");
    setPasajeroNombre(a.reservacion?.nombre_pasajero || "");
    setPasajeroCelular(a.reservacion?.celular_pasajero || "");
    setPasajeroDetalle(a.reservacion?.detalle || "");
    setPasajeroDireccion(a.reservacion?.direccion || "");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleEditReservacion = (viaje: any, reserva: any) => {
    setEditingId(viaje.id);
    setEditingReservacionId(reserva.id);
    setOrigen(viaje.origen);
    setDestino(viaje.destino);
    setHoraSalida(viaje.hora_salida || "");
    setCantidadPasajeros(String(viaje.cantidad_pasajeros || 0));
    setValorPasajeros(String(viaje.ingresos?.pasajeros_monto || 0));
    setValorEncomienda(String(viaje.ingresos?.encomiendas_monto || 0));
    setSelectedVehiculo(viaje.asignacion_id || "");
    setFechaSalida(viaje.fecha_salida ? new Date(viaje.fecha_salida) : undefined);
    setParada(reserva.parada || "");
    setPasajeroNombre(reserva.nombre_pasajero || "");
    setPasajeroCelular(reserva.celular_pasajero || "");
    setPasajeroDetalle(reserva.detalle || "");
    setPasajeroDireccion(reserva.direccion || "");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const saveReservacion = async (viajeId: string, empresaIdVal: string, reservacionId?: string) => {
    if (reservacionId) {
      await supabase.from("reservaciones").update({
        parada,
        nombre_pasajero: pasajeroNombre,
        celular_pasajero: pasajeroCelular,
        detalle: pasajeroDetalle,
        direccion: pasajeroDireccion,
      } as any).eq("id", reservacionId);
    } else {
      await supabase.from("reservaciones").insert({
        viaje_id: viajeId,
        empresa_id: empresaIdVal,
        parada,
        nombre_pasajero: pasajeroNombre,
        celular_pasajero: pasajeroCelular,
        detalle: pasajeroDetalle,
        direccion: pasajeroDireccion,
      } as any);
    }
  };

  const handleSubmit = async () => {
    if (!empresaId) return;

    if (editingId) {
      if (!destino || !origen) {
        toast({ title: "Completa todos los campos obligatorios", variant: "destructive" });
        return;
      }
      setSubmitting(true);

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

      if (!error) {
        await saveReservacion(editingId, empresaId, editingReservacionId || undefined);
      }

      setSubmitting(false);

      if (error) {
        toast({ title: "Error al editar reserva", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Reserva actualizada exitosamente" });
        clearForm();
        loadData();
      }
    } else {
      if (!selectedVehiculo || !destino || !origen) {
        toast({ title: "Completa todos los campos obligatorios", variant: "destructive" });
        return;
      }
      const vehiculoData = vehiculosDisponibles.find((v) => v.vehiculo_id === selectedVehiculo);
      if (!vehiculoData) return;

      setSubmitting(true);

      // Check if there's an existing viaje with same vehicle, origen, destino, fecha and hora
      const fechaISO = fechaSalida ? fechaSalida.toISOString() : new Date().toISOString();
      const fechaDate = fechaSalida ? format(fechaSalida, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");

      const { data: existingViajes } = await supabase
        .from("viajes")
        .select("id, origen, destino, hora_salida, fecha_salida, cantidad_pasajeros, asignacion_id, ingresos_viaje(pasajeros_monto, encomiendas_monto)")
        .eq("empresa_id", empresaId)
        .eq("asignacion_id", vehiculoData.id)
        .eq("origen", origen)
        .eq("destino", destino);

      // Find a viaje matching fecha (same day) and hora
      const matchingViaje = existingViajes?.find((v: any) => {
        const vFecha = v.fecha_salida ? format(new Date(v.fecha_salida), "yyyy-MM-dd") : "";
        const vHora = v.hora_salida || "";
        return vFecha === fechaDate && vHora === (horaSalida || "");
      });

      let error: any = null;
      let targetViajeId: string | null = null;

      if (matchingViaje) {
        // Add to existing viaje: update totals
        const newPax = (matchingViaje.cantidad_pasajeros || 0) + (parseInt(cantidadPasajeros) || 0);
        const existingIngresos = (matchingViaje as any).ingresos_viaje?.[0];
        const newPasajerosMonto = (existingIngresos?.pasajeros_monto || 0) + (parseFloat(valorPasajeros) || 0);
        const newEncomiendaMonto = (existingIngresos?.encomiendas_monto || 0) + (parseFloat(valorEncomienda) || 0);

        const { error: updateError } = await supabase
          .from("viajes")
          .update({ cantidad_pasajeros: newPax })
          .eq("id", matchingViaje.id);

        if (!updateError) {
          await supabase
            .from("ingresos_viaje")
            .update({
              pasajeros_monto: newPasajerosMonto,
              encomiendas_monto: newEncomiendaMonto,
              total_ingreso: newPasajerosMonto + newEncomiendaMonto,
            })
            .eq("viaje_id", matchingViaje.id);
          targetViajeId = matchingViaje.id;
        }
        error = updateError;
      } else {
        // Create new viaje
        const { data: viaje, error: createError } = await crearAsignacionRuta({
          asignacion_id: vehiculoData.id,
          destino,
          origen,
          hora_salida: horaSalida,
          cantidad_pasajeros: parseInt(cantidadPasajeros) || 0,
          pasajeros_monto: parseFloat(valorPasajeros) || 0,
          encomiendas_monto: parseFloat(valorEncomienda) || 0,
          empresa_id: empresaId,
          fecha_salida: fechaISO,
        });
        error = createError;
        if (viaje) targetViajeId = viaje.id;
      }

      if (!error && targetViajeId) {
        await saveReservacion(targetViajeId, empresaId);
      }

      setSubmitting(false);

      if (error) {
        toast({ title: "Error al reservar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Reserva creada exitosamente" });
        clearForm();
        loadData();
      }
    }
  };

  const handleCopiarReservaGrupo = async (viajes: any[], allReservaciones: any[]) => {
    const first = viajes[0];
    const fechaStr = first.fecha_salida ? format(new Date(first.fecha_salida), "dd/MM/yyyy") : "—";
    const horaStr = first.hora_salida || "—";
    const totalPasajeros = viajes.reduce((s: number, v: any) => s + (v.cantidad_pasajeros || 0), 0);
    const totalPrecio = viajes.reduce((s: number, v: any) => s + (v.ingresos?.pasajeros_monto || 0), 0);
    const totalEncomienda = viajes.reduce((s: number, v: any) => s + (v.ingresos?.encomiendas_monto || 0), 0);

    let texto = `*RESERVA DE VIAJE PARA ${totalPasajeros} PASAJERO${totalPasajeros > 1 ? "S" : ""}*, PARA EL ${fechaStr} ${horaStr} EN LA RUTA: ${first.origen} → ${first.destino}\n\n`;

    allReservaciones.forEach((reserva: any, idx: number) => {
      const detalle = reserva.detalle ? `, ${reserva.detalle}` : "";
      const pasajeros = reserva._viaje?.cantidad_pasajeros || 1;
      texto += `${idx + 1}. PASAJERO (${pasajeros}): ${reserva.nombre_pasajero || "—"}${detalle}\n`;
      if (reserva.celular_pasajero) texto += `   Celular: ${reserva.celular_pasajero}\n`;
      if (reserva.direccion) texto += `   Dirección: ${reserva.direccion}\n`;
      texto += `   Precio: $${reserva._viaje?.ingresos?.pasajeros_monto?.toFixed(2) || "0.00"}\n`;
      texto += `   Encomienda: $${reserva._viaje?.ingresos?.encomiendas_monto?.toFixed(2) || "0.00"}\n\n`;
    });

    texto += `*TOTAL*: ${totalPasajeros} pasajero${totalPasajeros > 1 ? "s" : ""} | Precio: $${totalPrecio.toFixed(2)} | Encomienda: $${totalEncomienda.toFixed(2)}`;

    try {
      await navigator.clipboard.writeText(texto);
      toast({ title: "Reserva copiada", description: "Pega el texto en WhatsApp para enviarlo al conductor" });
    } catch {
      toast({ title: "Error", description: "No se pudo copiar al portapapeles", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        <motion.div variants={item}>
          <h1 className="text-3xl font-display font-bold text-foreground">Asignaciones Prueba</h1>
          <p className="text-muted-foreground mt-1">Reserva asientos y gestiona pasajeros por ruta</p>
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
                      Editando Reserva
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-primary" />
                      Nueva Reserva
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
                {/* Vehículo */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Vehículo disponible</Label>
                  <Select value={selectedVehiculo} onValueChange={setSelectedVehiculo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar vehículo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vehiculosDisponibles.map((v) => {
                        const estadoLabel = v.ultimo_viaje?.estado === "ASIGNADO" ? `Reservado → ${v.ultimo_viaje?.destino || ""}`
                          : v.ultimo_viaje?.estado === "EN_RUTA" ? `Ruta Iniciada → ${v.ultimo_viaje?.destino || ""}`
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

                {/* Parada */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <MapPinned className="w-3.5 h-3.5" />
                    Parada
                  </Label>
                  <Input placeholder="Parada intermedia (opcional)" value={parada} onChange={(e) => setParada(e.target.value)} />
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

                {/* Datos del pasajero */}
                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                  <div className="border border-border rounded-lg p-4 bg-muted/30">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      Datos del pasajero
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          Nombre
                        </Label>
                        <Input placeholder="Nombre del pasajero" value={pasajeroNombre} onChange={(e) => setPasajeroNombre(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          Celular
                        </Label>
                        <Input 
                          placeholder="Número de celular" 
                          value={pasajeroCelular} 
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                            setPasajeroCelular(val);
                          }}
                          maxLength={10}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          Detalle
                        </Label>
                        <Input placeholder="Detalle adicional" value={pasajeroDetalle} onChange={(e) => setPasajeroDetalle(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          Dirección/Ubicación
                        </Label>
                        <Input placeholder="Dirección o ubicación del pasajero" value={pasajeroDireccion} onChange={(e) => setPasajeroDireccion(e.target.value)} />
                      </div>
                    </div>
                  </div>
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
                        {submitting ? "Reservando..." : "Reservar"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Reservations list */}
        <motion.div variants={item}>
          <h2 className="text-xl font-display font-semibold text-foreground mb-4">Reservaciones</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (() => {
            const filteredAsignaciones = asignaciones.filter(a => {
              if (a.estado === "FINALIZADO" && a.fecha_llegada) {
                const finalizadoTime = new Date(a.fecha_llegada).getTime();
                if (Date.now() - finalizadoTime > 24 * 60 * 60 * 1000) return false;
              }
              return true;
            });

            return filteredAsignaciones.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                  <Route className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No hay reservaciones</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {(() => {
                  // Group viajes by vehicle (asignacion_id + origen + destino + fecha + hora)
                  const vehicleGroups: Record<string, any[]> = {};
                  for (const viaje of filteredAsignaciones) {
                    const vehKey = viaje.asignacion_id || viaje.id;
                    if (!vehicleGroups[vehKey]) vehicleGroups[vehKey] = [];
                    vehicleGroups[vehKey].push(viaje);
                  }

                  return Object.entries(vehicleGroups).map(([vehKey, viajes]) => {
                    const first = viajes[0];
                    const totalPasajeros = viajes.reduce((s: number, v: any) => s + (v.cantidad_pasajeros || 0), 0);
                    const totalPasajerosMonto = viajes.reduce((s: number, v: any) => s + (v.ingresos?.pasajeros_monto || 0), 0);
                    const totalEncomienda = viajes.reduce((s: number, v: any) => s + (v.ingresos?.encomiendas_monto || 0), 0);
                    const allReservaciones = viajes.flatMap((v: any) => 
                      (v.reservaciones || []).map((r: any) => ({ ...r, _viaje: v }))
                    );
                    const badge = estadoBadge[first.estado] || { label: first.estado, variant: "secondary" as const };

                    return (
                      <Card key={vehKey} className="border-0 shadow-sm">
                        <CardContent className="p-5">
                          {/* Vehicle header */}
                          <div className="flex items-start gap-4 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <Truck className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-display font-semibold text-foreground">
                                  {first.vehiculo?.placa || "—"} · {first.vehiculo?.marca} {first.vehiculo?.modelo}
                                </span>
                                <Badge variant={badge.variant}>{badge.label}</Badge>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {first.origen} → {first.destino}
                                </span>
                                {first.fecha_salida && (
                                  <span className="flex items-center gap-1">
                                    <CalendarIcon className="w-3 h-3" />
                                    {format(new Date(first.fecha_salida), "dd/MM/yyyy")}
                                  </span>
                                )}
                                {first.hora_salida && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {first.hora_salida}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {totalPasajeros} pasajero{totalPasajeros > 1 ? "s" : ""} total
                                </span>
                              </div>
                              {first.conductor && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Conductor: {first.conductor.nombres} {first.conductor.apellidos}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                <span>Total Pasajeros: ${totalPasajerosMonto.toFixed(2)}</span>
                                <span>Total Encomienda: ${totalEncomienda.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          {/* All reservations under this vehicle */}
                          {allReservaciones.length > 0 && (
                            <div className="border-t border-border pt-3 space-y-3">
                              {allReservaciones.map((reserva: any, idx: number) => (
                                <div key={reserva.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg bg-muted/30">
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <span className="text-xs font-semibold text-foreground">Reserva #{idx + 1} — {reserva._viaje?.cantidad_pasajeros || 0} pasajero{(reserva._viaje?.cantidad_pasajeros || 0) !== 1 ? "s" : ""}</span>
                                    {reserva.parada && (
                                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <MapPinned className="w-3 h-3" />
                                        Parada: {reserva.parada}
                                      </span>
                                    )}
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                      {reserva.nombre_pasajero && (
                                        <span className="flex items-center gap-1">
                                          <User className="w-3 h-3" />
                                          {reserva.nombre_pasajero}
                                        </span>
                                      )}
                                      {reserva.celular_pasajero && (
                                        <span className="flex items-center gap-1">
                                          <Phone className="w-3 h-3" />
                                          {reserva.celular_pasajero}
                                        </span>
                                      )}
                                      {reserva.detalle && (
                                        <span className="flex items-center gap-1">
                                          <FileText className="w-3 h-3" />
                                          {reserva.detalle}
                                        </span>
                                      )}
                                      {reserva.direccion && (
                                        <span className="flex items-center gap-1">
                                          <MapPin className="w-3 h-3" />
                                          {reserva.direccion}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-2 shrink-0">
                                    <Button variant="outline" size="sm" className="gap-1" onClick={() => handleEditReservacion(reserva._viaje, reserva)}>
                                      <Pencil className="w-3.5 h-3.5" />
                                      Editar
                                    </Button>
                                    <Button variant="destructive" size="sm" className="gap-1" onClick={async () => {
                                      const viajeId = reserva._viaje?.id;
                                      const { error } = await supabase.from("reservaciones").delete().eq("id", reserva.id);
                                      if (error) {
                                        toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
                                      } else {
                                        // Check if viaje has remaining reservaciones
                                        if (viajeId) {
                                          const { data: remaining } = await supabase
                                            .from("reservaciones")
                                            .select("id")
                                            .eq("viaje_id", viajeId);
                                          if (!remaining || remaining.length === 0) {
                                            // Delete ingresos and viaje too
                                            await supabase.from("ingresos_viaje").delete().eq("viaje_id", viajeId);
                                            await supabase.from("egresos_viaje").delete().eq("viaje_id", viajeId);
                                            await supabase.from("viaje_dia_control").delete().eq("viaje_id", viajeId);
                                            await supabase.from("viajes").delete().eq("id", viajeId);
                                          } else {
                                            // Recalculate viaje totals from remaining reservaciones
                                            const { data: remainingFull } = await supabase
                                              .from("reservaciones")
                                              .select("*")
                                              .eq("viaje_id", viajeId);
                                            if (remainingFull && remainingFull.length > 0) {
                                              const totalPax = remainingFull.reduce((s: number, r: any) => s + (r.cantidad_pasajeros || 0), 0);
                                              const totalMonto = remainingFull.reduce((s: number, r: any) => s + (r.pasajeros_monto || 0), 0);
                                              const totalEnc = remainingFull.reduce((s: number, r: any) => s + (r.encomiendas_monto || 0), 0);
                                              await supabase.from("viajes").update({ cantidad_pasajeros: totalPax }).eq("id", viajeId);
                                              await supabase.from("ingresos_viaje").update({
                                                pasajeros_monto: totalMonto,
                                                encomiendas_monto: totalEnc,
                                                total_ingreso: totalMonto + totalEnc,
                                              }).eq("viaje_id", viajeId);
                                            }
                                          }
                                        }
                                        toast({ title: "Reserva eliminada" });
                                        loadData();
                                      }
                                    }}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Eliminar
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Copy button */}
                          <div className="flex justify-end mt-3">
                            <Button variant="outline" size="sm" className="gap-1" onClick={() => handleCopiarReservaGrupo(viajes, allReservaciones)}>
                              <Copy className="w-3.5 h-3.5" />
                              Copiar Reserva
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  });
                })()}
              </div>
            );
          })()}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
