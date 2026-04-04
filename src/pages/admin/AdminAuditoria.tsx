import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Filter, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { fetchAuditLogs, ACCION_LABELS } from "@/services/auditService";
import { supabase } from "@/integrations/supabase/client";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function AdminAuditoria() {
  const { role } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresas, setEmpresas] = useState<{ id: string; nombre: string }[]>([]);
  const [empresaMap, setEmpresaMap] = useState<Record<string, string>>({});

  // Filters
  const [filterEmpresa, setFilterEmpresa] = useState("all");
  
  const [filterMes, setFilterMes] = useState("all");

  useEffect(() => {
    supabase.from("empresas").select("id, nombre").order("nombre").then(({ data }) => {
      const list = data || [];
      setEmpresas(list);
      const map: Record<string, string> = {};
      list.forEach((e: any) => { map[e.id] = e.nombre; });
      setEmpresaMap(map);
    });
  }, []);

  const getMonthRange = (mesValue: string) => {
    if (mesValue === "all") return { desde: undefined, hasta: undefined };
    const [year, month] = mesValue.split("-").map(Number);
    const desde = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const hasta = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
    return { desde, hasta };
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { desde, hasta } = getMonthRange(filterMes);
      const data = await fetchAuditLogs({
        empresaId: filterEmpresa !== "all" ? filterEmpresa : undefined,
        desde,
        hasta,
      });
      setLogs(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, [filterEmpresa, filterMes]);

  if (role !== "SUPER_ADMIN") return <Navigate to="/dashboard" replace />;

  

  // Generate last 12 months for the month picker
  const mesesDisponibles = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("es-EC", { month: "long", year: "numeric" });
    return { value, label: label.charAt(0).toUpperCase() + label.slice(1) };
  });

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <Badge className="bg-primary/10 text-primary border-0 font-medium">Super Admin</Badge>
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Auditoría</h1>
          <p className="text-muted-foreground mt-1">Historial de todas las acciones realizadas por las agencias</p>
        </motion.div>

        {/* Filters */}
        <motion.div variants={item}>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Filtros</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las agencias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las agencias</SelectItem>
                    {empresas.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterAccion} onValueChange={setFilterAccion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las acciones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las acciones</SelectItem>
                    {accionesDisponibles.map(a => (
                      <SelectItem key={a} value={a}>{ACCION_LABELS[a]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterMes} onValueChange={setFilterMes}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los meses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los meses</SelectItem>
                    {mesesDisponibles.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Table */}
        <motion.div variants={item}>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Cargando registros...</div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  No se encontraron registros de auditoría
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Agencia</TableHead>
                        <TableHead>Acción</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Detalles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {new Date(log.created_at).toLocaleDateString("es-EC", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}{" "}
                            <span className="text-muted-foreground">
                              {new Date(log.created_at).toLocaleTimeString("es-EC", {
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">
                            {empresaMap[log.empresa_id] || <span className="text-muted-foreground text-xs">Eliminada</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal">
                              {ACCION_LABELS[log.accion] || log.accion}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.rol || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                            {log.despues ? (
                              typeof log.despues === "object"
                                ? Object.entries(log.despues).map(([k, v]) => `${k}: ${v}`).join(", ")
                                : String(log.despues)
                            ) : log.antes ? (
                              typeof log.antes === "object"
                                ? Object.entries(log.antes).map(([k, v]) => `${k}: ${v}`).join(", ")
                                : String(log.antes)
                            ) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {!loading && logs.length > 0 && (
                <div className="px-4 py-3 text-xs text-muted-foreground border-t">
                  Mostrando {logs.length} registros (máximo 500)
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
