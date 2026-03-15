import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Search, Shield } from "lucide-react";
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

export default function AdminConductores() {
  const { role } = useAuth();
  const [conductores, setConductores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const [condRes, asigRes] = await Promise.all([
        supabase.from("conductores").select("*, empresas(nombre)").order("created_at", { ascending: false }),
        supabase.from("asignaciones").select("conductor_id, vehiculos(placa, marca, modelo, anio, propietarios(nombres))").eq("estado", "ACTIVA"),
      ]);

      const asignaciones = asigRes.data || [];
      const enriched = (condRes.data || []).map((c: any) => {
        const asig = asignaciones.find((a: any) => a.conductor_id === c.id);
        return {
          ...c,
          vehiculo_marca: asig?.vehiculos?.marca || null,
          vehiculo_modelo: asig?.vehiculos?.modelo || null,
          vehiculo_anio: asig?.vehiculos?.anio || null,
          vehiculo_placa: asig?.vehiculos?.placa || null,
          propietario_nombre: asig?.vehiculos?.propietarios?.nombres || null,
        };
      });
      setConductores(enriched);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (role !== "SUPER_ADMIN") return <Navigate to="/dashboard" replace />;

  const filtered = conductores.filter((c: any) =>
    c.nombres.toLowerCase().includes(search.toLowerCase()) ||
    c.identificacion.includes(search) ||
    (c.empresas?.nombre || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <Badge className="bg-primary/10 text-primary border-0 font-medium">Super Admin</Badge>
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Conductores</h1>
          <p className="text-muted-foreground mt-1">Todos los conductores registrados en las compañías</p>
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
                  <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No se encontraron conductores</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Identificación</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead>Licencia</TableHead>
                      <TableHead>Compañía</TableHead>
                      <TableHead>Vehículo</TableHead>
                      <TableHead>Propietario</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nombres}</TableCell>
                        <TableCell>{c.identificacion}</TableCell>
                        <TableCell>{c.celular}</TableCell>
                        <TableCell>{c.tipo_licencia}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{c.empresas?.nombre || "—"}</Badge>
                        </TableCell>
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
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
