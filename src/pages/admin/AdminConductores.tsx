import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Building2, ChevronDown, ChevronUp, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function AdminConductores() {
  const { role } = useAuth();
  const [empresaMap, setEmpresaMap] = useState<Record<string, { nombre: string; conductores: any[] }>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [condRes, asigRes] = await Promise.all([
        supabase.from("conductores").select("*, empresas(nombre)").order("created_at", { ascending: false }),
        supabase.from("asignaciones").select("conductor_id, vehiculos(placa, marca, modelo, anio, propietarios(nombres, apellidos))").eq("estado", "ACTIVA"),
      ]);

      const asignaciones = asigRes.data || [];
      const map: Record<string, { nombre: string; conductores: any[] }> = {};

      (condRes.data || []).forEach((c: any) => {
        const asig = asignaciones.find((a: any) => a.conductor_id === c.id);
        const enriched = {
          ...c,
          vehiculo_marca: asig?.vehiculos?.marca || null,
          vehiculo_modelo: asig?.vehiculos?.modelo || null,
          vehiculo_anio: asig?.vehiculos?.anio || null,
          vehiculo_placa: asig?.vehiculos?.placa || null,
          propietario_nombre: asig?.vehiculos?.propietarios ? `${asig.vehiculos.propietarios.nombres} ${asig.vehiculos.propietarios.apellidos}` : null,
        };

        const empId = c.empresa_id;
        if (!map[empId]) {
          map[empId] = { nombre: c.empresas?.nombre || "—", conductores: [] };
        }
        map[empId].conductores.push(enriched);
      });

      setEmpresaMap(map);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (role !== "SUPER_ADMIN") return <Navigate to="/dashboard" replace />;

  const empresaKeys = Object.keys(empresaMap);

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <Badge className="bg-primary/10 text-primary border-0 font-medium">Super Admin</Badge>
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Conductores</h1>
          <p className="text-muted-foreground mt-1">Todos los conductores registrados, agrupados por compañía</p>
        </motion.div>

        {loading ? (
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
        ) : empresaKeys.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">No se encontraron conductores</p>
          </div>
        ) : (
          empresaKeys.map((empId) => {
            const emp = empresaMap[empId];
            const isOpen = expanded === empId;
            return (
              <motion.div key={empId} variants={item}>
                <Card
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setExpanded(isOpen ? null : empId)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        <span>{emp.nombre}</span>
                        <span className="text-muted-foreground text-xs">({emp.conductores.length} conductores)</span>
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </CardTitle>
                  </CardHeader>
                  {isOpen && (
                    <CardContent onClick={(e) => e.stopPropagation()}>
                      <div className="overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nombres</TableHead>
                              <TableHead>Apellidos</TableHead>
                              <TableHead>Identificación</TableHead>
                              <TableHead>Celular</TableHead>
                              <TableHead>Licencia</TableHead>
                              <TableHead>Vehículo</TableHead>
                              <TableHead>Propietario</TableHead>
                              <TableHead>Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {emp.conductores.map((c: any) => (
                              <TableRow key={c.id}>
                                <TableCell className="font-medium">{c.nombres}</TableCell>
                                <TableCell>{c.apellidos}</TableCell>
                                <TableCell>{c.identificacion}</TableCell>
                                <TableCell>{c.celular}</TableCell>
                                <TableCell>{c.tipo_licencia}</TableCell>
                                <TableCell>
                                  {c.vehiculo_placa ? (
                                    <span className="text-xs">{c.vehiculo_marca} {c.vehiculo_modelo} {c.vehiculo_anio || ""} · {c.vehiculo_placa}</span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Sin asignar</span>
                                  )}
                                </TableCell>
                                <TableCell>{c.propietario_nombre || "—"}</TableCell>
                                <TableCell>
                                  <Badge variant={c.estado === "HABILITADO" ? "default" : "destructive"} className="text-xs">
                                    {c.estado}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            );
          })
        )}
      </motion.div>
    </DashboardLayout>
  );
}
