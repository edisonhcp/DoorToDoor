import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Image } from "lucide-react";

interface ViajeRow {
  id: string;
  origen: string;
  destino: string;
  hora_salida: string | null;
  cantidad_pasajeros: number | null;
  fecha_salida: string;
  estado?: string;
  vehiculo?: { placa: string; marca: string; modelo: string } | null;
  conductor?: { nombres: string; apellidos: string } | null;
  ingresos?: { pasajeros_monto: number; encomiendas_monto: number; total_ingreso: number } | null;
  egresos?: {
    peaje: number; hotel: number; pago_conductor: number; combustible: number; varios: number;
    total_egreso: number; desayuno: boolean; almuerzo: boolean; merienda: boolean;
    alimentacion?: number;
    combustible_foto_url?: string | null; varios_foto_url?: string | null; varios_texto?: string | null;
  } | null;
  valor_comida?: number;
}

function calcAlimentacion(eg: ViajeRow["egresos"], valorComida: number = 3): number {
  if (!eg) return 0;
  let count = 0;
  if (eg.desayuno) count++;
  if (eg.almuerzo) count++;
  if (eg.merienda) count++;
  return count * valorComida;
}

interface ViajesTableProps {
  viajes: ViajeRow[];
  showEgresos?: boolean;
  showConductorColumn?: boolean;
  showSummary?: boolean;
  comisionPct?: number;
  comisionFija?: number;
  tipoComision?: "PORCENTAJE" | "FIJO" | "MIXTO";
  frecuenciaComision?: string;
}

export function ViajesTable({ viajes: rawViajes, showEgresos = true, showConductorColumn = true, showSummary = true, comisionPct = 0.10, comisionFija = 0, tipoComision = "PORCENTAJE", frecuenciaComision = "SEMANAL" }: ViajesTableProps) {
  // Sort viajes by fecha_salida descending (most recent first)
  const viajes = [...rawViajes].sort((a, b) => new Date(b.fecha_salida).getTime() - new Date(a.fecha_salida).getTime());
  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" }); }
    catch { return d; }
  };

  // Calculate totals - only sum FINALIZADO trips
  const totals = viajes.reduce((acc, v) => {
    if (v.estado !== "FINALIZADO") return acc;
    const ing = v.ingresos;
    const eg = v.egresos;
    const alim = calcAlimentacion(eg, v.valor_comida);
    acc.pasajeros += v.cantidad_pasajeros || 0;
    acc.pasajerosMonto += ing?.pasajeros_monto || 0;
    acc.encomiendas += ing?.encomiendas_monto || 0;
    acc.totalIngreso += (ing?.pasajeros_monto || 0) + (ing?.encomiendas_monto || 0);
    acc.alimentacion += alim;
    acc.peaje += eg?.peaje || 0;
    acc.hotel += eg?.hotel || 0;
    acc.conductor += eg?.pago_conductor || 0;
    acc.combustible += eg?.combustible || 0;
    acc.varios += eg?.varios || 0;
    acc.totalEgreso += (eg?.peaje || 0) + (eg?.hotel || 0) + (showConductorColumn ? (eg?.pago_conductor || 0) : 0) + (eg?.combustible || 0) + (eg?.varios || 0) + alim;
    return acc;
  }, {
    pasajeros: 0, pasajerosMonto: 0, encomiendas: 0, totalIngreso: 0,
    alimentacion: 0, peaje: 0, hotel: 0, conductor: 0, combustible: 0, varios: 0, totalEgreso: 0,
  });

  const comisionCompania = tipoComision === "PORCENTAJE" 
    ? totals.totalIngreso * comisionPct 
    : comisionFija;
  const totalPropietario = totals.totalIngreso - totals.totalEgreso - comisionCompania;

  const frecuenciaLabel: Record<string, string> = {
    SEMANAL: "Semanal",
    QUINCENAL: "Quincenal", 
    MENSUAL: "Mensual",
  };

  const comisionLabel = tipoComision === "PORCENTAJE"
    ? `Compañía (${(comisionPct * 100).toFixed(0)}%) - ${frecuenciaLabel[frecuenciaComision] || frecuenciaComision}`
    : `Compañía ($${comisionFija}) - ${frecuenciaLabel[frecuenciaComision] || frecuenciaComision}`;

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold w-12">#</TableHead>
                <TableHead className="text-xs font-semibold">Fecha</TableHead>
                <TableHead className="text-xs font-semibold">Hora</TableHead>
                <TableHead className="text-xs font-semibold">Ruta</TableHead>
                <TableHead className="text-xs font-semibold text-right">Pasaj.</TableHead>
                <TableHead className="text-xs font-semibold text-right">Valor ($)</TableHead>
                <TableHead className="text-xs font-semibold text-right">Encom. ($)</TableHead>
                <TableHead className="text-xs font-semibold text-right">Total ($)</TableHead>
                {showEgresos && (
                  <>
                    <TableHead className="text-xs font-semibold text-center border-l border-border">Alim. ($)</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Peaje</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Hotel</TableHead>
                    {showConductorColumn && <TableHead className="text-xs font-semibold text-right">Conductor</TableHead>}
                    <TableHead className="text-xs font-semibold text-right">Combust.</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Varios</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Total Eg.</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Estado</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {viajes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showEgresos ? (showConductorColumn ? 16 : 15) : 8} className="text-center py-8 text-muted-foreground">
                    No hay viajes registrados
                  </TableCell>
                </TableRow>
              ) : (
                viajes.map((v, idx) => {
                  const ing = v.ingresos;
                  const eg = v.egresos;
                  const totalIngreso = (ing?.pasajeros_monto || 0) + (ing?.encomiendas_monto || 0);
                  const alimParts: string[] = [];
                  if (eg?.desayuno) alimParts.push("D");
                  if (eg?.almuerzo) alimParts.push("A");
                  if (eg?.merienda) alimParts.push("M");
                  const alimCosto = calcAlimentacion(eg, v.valor_comida);
                  const rowTotalEgreso = (eg?.peaje || 0) + (eg?.hotel || 0) + (showConductorColumn ? (eg?.pago_conductor || 0) : 0) + (eg?.combustible || 0) + (eg?.varios || 0) + alimCosto;

                  return (
                    <TableRow key={v.id} className="text-sm">
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{formatDate(v.fecha_salida)}</TableCell>
                      <TableCell className="text-xs">{v.hora_salida || "—"}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {v.origen} → {v.destino}
                        {v.vehiculo && (
                          <span className="block text-muted-foreground">{v.vehiculo.placa}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right">{v.cantidad_pasajeros || 0}</TableCell>
                      <TableCell className="text-xs text-right">{(ing?.pasajeros_monto || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-right">{(ing?.encomiendas_monto || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-right font-medium">{totalIngreso.toFixed(2)}</TableCell>
                      {showEgresos && (
                        <>
                          <TableCell className="text-xs text-center border-l border-border">
                            {alimParts.length > 0 ? (
                              <div className="flex items-center gap-1 justify-center">
                                <div className="flex gap-0.5">
                                  {alimParts.map(l => (
                                    <Badge key={l} variant="secondary" className="text-[10px] px-1 py-0">{l}</Badge>
                                  ))}
                                </div>
                                <span className="text-muted-foreground">{alimCosto.toFixed(2)}</span>
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-right">{(eg?.peaje || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right">{(eg?.hotel || 0).toFixed(2)}</TableCell>
                          {showConductorColumn && (
                            <TableCell className="text-xs text-right">{(eg?.pago_conductor || 0).toFixed(2)}</TableCell>
                          )}
                          <TableCell className="text-xs text-right">
                            <div className="flex items-center justify-end gap-1">
                              {(eg?.combustible || 0).toFixed(2)}
                              {eg?.combustible_foto_url && (
                                <a href={eg.combustible_foto_url} target="_blank" rel="noopener noreferrer">
                                  <Image className="w-3 h-3 text-primary" />
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            <div className="flex items-center justify-end gap-1">
                              {(eg?.varios || 0).toFixed(2)}
                              {eg?.varios_foto_url && (
                                <a href={eg.varios_foto_url} target="_blank" rel="noopener noreferrer">
                                  <Image className="w-3 h-3 text-primary" />
                                </a>
                              )}
                              {eg?.varios_texto && (
                                <span className="text-muted-foreground" title={eg.varios_texto}>💬</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-right font-medium">{rowTotalEgreso.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-center">
                            <Badge variant={v.estado === "FINALIZADO" ? "default" : v.estado === "EN_RUTA" ? "secondary" : "outline"} className="text-[10px]">
                              {v.estado === "FINALIZADO" ? "Finalizado" : v.estado === "EN_RUTA" ? "En Ruta" : v.estado || "—"}
                            </Badge>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {viajes.length > 0 && (
              <TableFooter>
                <TableRow className="bg-muted/80 font-semibold text-xs">
                  <TableCell colSpan={4} className="text-right">TOTALES</TableCell>
                  <TableCell className="text-right">{totals.pasajeros}</TableCell>
                  <TableCell className="text-right">{totals.pasajerosMonto.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{totals.encomiendas.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{totals.totalIngreso.toFixed(2)}</TableCell>
                  {showEgresos && (
                    <>
                      <TableCell className="text-center border-l border-border">{totals.alimentacion.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{totals.peaje.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{totals.hotel.toFixed(2)}</TableCell>
                      {showConductorColumn && <TableCell className="text-right">{totals.conductor.toFixed(2)}</TableCell>}
                      <TableCell className="text-right">{totals.combustible.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{totals.varios.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{totals.totalEgreso.toFixed(2)}</TableCell>
                      <TableCell></TableCell>
                    </>
                  )}
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </div>

      {showSummary && showEgresos && viajes.length > 0 && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <h3 className="text-sm font-semibold mb-3">Resumen</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Total Ingreso</p>
              <p className="font-bold text-lg text-primary">${totals.totalIngreso.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Total Egreso</p>
              <p className="font-bold text-lg text-destructive">${totals.totalEgreso.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">{comisionLabel}</p>
              <p className="font-bold text-lg text-foreground">${comisionCompania.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Total a recibir Propietario</p>
              <p className="font-bold text-lg text-success">${totalPropietario.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Total a recibir Conductor</p>
              <p className="font-bold text-lg text-foreground">${totals.conductor.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
