import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Truck, Building2, ChevronDown, ChevronUp, Shield } from "lucide-react";
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

export default function AdminVehiculos() {
  const { role } = useAuth();
  const [empresaMap, setEmpresaMap] = useState<Record<string, { nombre: string; vehiculos: any[] }>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("vehiculos")
        .select("*, empresas(nombre), propietarios(nombres, apellidos)")
        .order("created_at", { ascending: false });

      const map: Record<string, { nombre: string; vehiculos: any[] }> = {};
      (data || []).forEach((v: any) => {
        const empId = v.empresa_id;
        if (!map[empId]) {
          map[empId] = { nombre: v.empresas?.nombre || "—", vehiculos: [] };
        }
        map[empId].vehiculos.push(v);
      });
      setEmpresaMap(map);
      setLoading(false);
    };
    fetch();
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
          <h1 className="text-3xl font-display font-bold text-foreground">Vehículos</h1>
          <p className="text-muted-foreground mt-1">Todos los vehículos registrados, agrupados por compañía</p>
        </motion.div>

        {loading ? (
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
        ) : empresaKeys.length === 0 ? (
          <div className="p-8 text-center">
            <Truck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">No se encontraron vehículos</p>
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
                        <span className="text-muted-foreground text-xs">({emp.vehiculos.length} vehículos)</span>
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
                              <TableHead>Placa</TableHead>
                              <TableHead>Marca / Modelo</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Color</TableHead>
                              <TableHead>Año</TableHead>
                              <TableHead>Propietario</TableHead>
                              <TableHead>Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {emp.vehiculos.map((v: any) => (
                              <TableRow key={v.id}>
                                <TableCell className="font-medium">{v.placa}</TableCell>
                                <TableCell>{v.marca} {v.modelo}</TableCell>
                                <TableCell>{v.tipo}</TableCell>
                                <TableCell>{v.color}</TableCell>
                                <TableCell>{v.anio || "—"}</TableCell>
                                <TableCell>
                                  {v.propietarios ? `${v.propietarios.nombres} ${v.propietarios.apellidos}` : "—"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={v.estado === "HABILITADO" ? "default" : "destructive"} className="text-xs">
                                    {v.estado}
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
