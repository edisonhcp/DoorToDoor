import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserCheck, Search, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export default function AdminPropietarios() {
  const { role } = useAuth();
  const [propietarios, setPropietarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("propietarios")
        .select("*, empresas(nombre), vehiculos(placa, marca, modelo, anio)")
        .order("created_at", { ascending: false });
      setPropietarios(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  if (role !== "SUPER_ADMIN") return <Navigate to="/dashboard" replace />;

  const filtered = propietarios.filter((p: any) =>
    p.nombres.toLowerCase().includes(search.toLowerCase()) ||
    p.identificacion.includes(search) ||
    (p.empresas?.nombre || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <Badge className="bg-primary/10 text-primary border-0 font-medium">Super Admin</Badge>
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Propietarios</h1>
          <p className="text-muted-foreground mt-1">Todos los propietarios registrados en las compañías</p>
        </motion.div>

        <motion.div variants={item} className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, cédula o compañía..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Cargando...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <UserCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No se encontraron propietarios</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Identificación</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead>Compañía</TableHead>
                      <TableHead>Vehículos</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nombres}</TableCell>
                        <TableCell>{p.identificacion}</TableCell>
                        <TableCell>{p.celular}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{p.empresas?.nombre || "—"}</Badge>
                        </TableCell>
                        <TableCell>
                          {p.vehiculos && p.vehiculos.length > 0
                            ? p.vehiculos.map((v: any, i: number) => (
                                <div key={i} className="text-xs text-muted-foreground">
                                  {v.marca} {v.modelo} {v.anio || ""} · {v.placa}
                                </div>
                              ))
                            : <span className="text-xs text-muted-foreground">Sin vehículos</span>
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.estado === "HABILITADO" ? "default" : "destructive"} className="text-xs">
                            {p.estado}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
