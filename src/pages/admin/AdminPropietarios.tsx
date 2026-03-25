import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserCheck, Shield, Building2, ChevronDown, ChevronUp, Search } from "lucide-react";
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

export default function AdminPropietarios() {
  const { role } = useAuth();
  const [empresaMap, setEmpresaMap] = useState<Record<string, { nombre: string; propietarios: any[] }>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("propietarios")
        .select("*, empresas(nombre), vehiculos(placa, marca, modelo, anio, estado)")
        .order("created_at", { ascending: false });

      const map: Record<string, { nombre: string; propietarios: any[] }> = {};
      (data || []).forEach((p: any) => {
        const empId = p.empresa_id;
        if (!map[empId]) {
          map[empId] = { nombre: p.empresas?.nombre || "—", propietarios: [] };
        }
        map[empId].propietarios.push(p);
      });
      setEmpresaMap(map);
      setLoading(false);
    };
    fetch();
  }, []);

  if (role !== "SUPER_ADMIN") return <Navigate to="/dashboard" replace />;

  const q = search.toLowerCase();
  const empresaKeys = Object.keys(empresaMap).filter((empId) => {
    if (!q) return true;
    const emp = empresaMap[empId];
    if (emp.nombre.toLowerCase().includes(q)) return true;
    return emp.propietarios.some((p: any) =>
      p.nombres?.toLowerCase().includes(q) ||
      p.apellidos?.toLowerCase().includes(q) ||
      p.identificacion?.includes(q) ||
      p.celular?.includes(q)
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
          <h1 className="text-3xl font-display font-bold text-foreground">Propietarios</h1>
          <p className="text-muted-foreground mt-1">Todos los propietarios registrados, agrupados por compañía</p>
        </motion.div>

        <motion.div variants={item} className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, identificación o celular..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </motion.div>

        {loading ? (
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
        ) : empresaKeys.length === 0 ? (
          <div className="p-8 text-center">
            <UserCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">{search ? "No se encontraron propietarios" : "No hay propietarios registrados"}</p>
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
                        <span className="text-muted-foreground text-xs">({emp.propietarios.length} propietarios)</span>
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
                              <TableHead>Correo</TableHead>
                              <TableHead>Vehículos</TableHead>
                              <TableHead>Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {emp.propietarios.map((p: any) => (
                              <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.nombres}</TableCell>
                                <TableCell>{p.apellidos}</TableCell>
                                <TableCell>{p.identificacion}</TableCell>
                                <TableCell>{p.celular}</TableCell>
                                <TableCell className="text-xs">{p.email}</TableCell>
                                <TableCell>
                                  <div className="divide-y divide-border">
                                    {p.vehiculos && p.vehiculos.length > 0
                                      ? p.vehiculos.map((v: any, i: number) => (
                                          <div key={i} className="text-xs text-muted-foreground py-1.5 first:pt-0 last:pb-0">
                                            {v.marca} {v.modelo} {v.anio || ""} · {v.placa}
                                          </div>
                                        ))
                                      : <span className="text-xs text-muted-foreground">Sin vehículos</span>
                                    }
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="divide-y divide-border">
                                    {p.vehiculos && p.vehiculos.length > 0
                                      ? p.vehiculos.map((v: any, i: number) => (
                                          <div key={i} className="py-1.5 first:pt-0 last:pb-0">
                                            <Badge
                                              variant={v.estado === "INHABILITADO" ? "destructive" : "default"}
                                              className="text-[10px] px-1.5 py-0"
                                            >
                                              {v.estado}
                                            </Badge>
                                          </div>
                                        ))
                                      : <Badge variant={p.estado === "HABILITADO" ? "default" : "destructive"} className="text-xs">{p.estado}</Badge>
                                    }
                                  </div>
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
