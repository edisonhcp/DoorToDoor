import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
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
  vehiculo?: { placa: string; marca: string; modelo: string } | null;
  conductor?: { nombres: string; apellidos: string } | null;
  ingresos?: { pasajeros_monto: number; encomiendas_monto: number; total_ingreso: number } | null;
  egresos?: {
    peaje: number; hotel: number; pago_conductor: number; combustible: number; varios: number;
    total_egreso: number; desayuno: boolean; almuerzo: boolean; merienda: boolean;
    combustible_foto_url?: string | null; varios_foto_url?: string | null; varios_texto?: string | null;
  } | null;
}

interface ViajesTableProps {
  viajes: ViajeRow[];
  showEgresos?: boolean;
  showConductorColumn?: boolean;
}

export function ViajesTable({ viajes, showEgresos = true, showConductorColumn = true }: ViajesTableProps) {
  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" }); }
    catch { return d; }
  };

  return (
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
                  <TableHead className="text-xs font-semibold text-center border-l border-border">Alim.</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Peaje</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Hotel</TableHead>
                  {showConductorColumn && <TableHead className="text-xs font-semibold text-right">Conductor</TableHead>}
                  <TableHead className="text-xs font-semibold text-right">Combust.</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Varios</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Total Eg.</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {viajes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showEgresos ? 15 : 8} className="text-center py-8 text-muted-foreground">
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
                            <div className="flex gap-0.5 justify-center">
                              {alimParts.map(l => (
                                <Badge key={l} variant="secondary" className="text-[10px] px-1 py-0">{l}</Badge>
                              ))}
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
                        <TableCell className="text-xs text-right font-medium">{(eg?.total_egreso || 0).toFixed(2)}</TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
