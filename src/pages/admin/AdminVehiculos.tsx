import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Truck, Building2, ChevronDown, ChevronUp, Shield, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function AdminVehiculos() {
  const { role } = useAuth();
  const [empresaMap, setEmpresaMap] = useState<Record<string, { nombre: string; vehiculos: any[] }>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const [vehRes, empRes, propRes] = await Promise.all([
        supabase.from("vehiculos").select("*").order("created_at", { ascending: false }),
        supabase.from("empresas").select("id, nombre"),
        supabase.from("propietarios").select("id, nombres, apellidos"),
      ]);

      const empresasById: Record<string, string> = {};
      (empRes.data || []).forEach((e: any) => { empresasById[e.id] = e.nombre; });

      const propsById: Record<string, { nombres: string; apellidos: string }> = {};
      (propRes.data || []).forEach((p: any) => { propsById[p.id] = { nombres: p.nombres, apellidos: p.apellidos }; });

      const map: Record<string, { nombre: string; vehiculos: any[] }> = {};
      (vehRes.data || []).forEach((v: any) => {
        const empId = v.empresa_id;
        if (!map[empId]) {
          map[empId] = { nombre: empresasById[empId] || "—", vehiculos: [] };
        }
        map[empId].vehiculos.push({
          ...v,
          propietario_nombre: propsById[v.propietario_id]
            ? `${propsById[v.propietario_id].nombres} ${propsById[v.propietario_id].apellidos}`
            : "—",
        });
      });
      setEmpresaMap(map);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (role !== "SUPER_ADMIN") return <Navigate to="/dashboard" replace />;

  const q = search.toLowerCase();
  const empresaKeys = Object.keys(empresaMap).filter((empId) => {
    if (!q) return true;
    const emp = empresaMap[empId];
    if (emp.nombre.toLowerCase().includes(q)) return true;
    return emp.vehiculos.some((v: any) =>
      v.placa?.toLowerCase().includes(q) ||
      v.marca?.toLowerCase().includes(q) ||
      v.modelo?.toLowerCase().includes(q) ||
      v.propietario_nombre?.toLowerCase().includes(q)
    );
  });

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

        <motion.div variants={item} className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por placa, marca, modelo o compañía..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </motion.div>

        {loading ? (
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
        ) : empresaKeys.length === 0 ? (
          <div className="p-8 text-center">
            <Truck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">{search ? "No se encontraron vehículos" : "No hay vehículos registrados"}</p>
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
                                <TableCell>{v.propietario_nombre}</TableCell>
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
