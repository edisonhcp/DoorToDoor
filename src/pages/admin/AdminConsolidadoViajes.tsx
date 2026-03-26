import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Search } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchConsolidadoEmpresas } from "@/services/empresasService";
import { Input } from "@/components/ui/input";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const FRECUENCIA_LABEL: Record<string, string> = {
  SEMANAL: "Semanal",
  QUINCENAL: "Quincenal",
  MENSUAL: "Mensual",
};

function formatComision(emp: any) {
  if (emp.tipoComision === "PORCENTAJE") return `${((emp.comisionPct || 0) * 100).toFixed(0)}%`;
  if (emp.tipoComision === "FIJO") return `$${(emp.comisionFija || 0).toFixed(2)}`;
  if (emp.tipoComision === "MIXTO") return `${((emp.comisionPct || 0) * 100).toFixed(0)}% + $${(emp.comisionFija || 0).toFixed(2)}`;
  return emp.tipoComision;
}

export default function AdminConsolidadoViajes() {
  const { role } = useAuth();
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const data = await fetchConsolidadoEmpresas();
      setEmpresas(data);
      setLoading(false);
    };
    load();
  }, []);

  if (role !== "SUPER_ADMIN") return <Navigate to="/admin" replace />;

  const filtered = empresas.filter(emp =>
    !search || emp.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <h1 className="text-3xl font-display font-bold text-foreground">Consolidado Viajes</h1>
          <p className="text-muted-foreground mt-1">Resumen financiero por compañía</p>
        </motion.div>

        <motion.div variants={item} className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre de compañía..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </motion.div>

        {loading ? (
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
        ) : filtered.length === 0 ? (
          <motion.div variants={item}>
            <Card><CardContent className="py-12 text-center"><Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" /><p className="text-muted-foreground">No hay compañías</p></CardContent></Card>
          </motion.div>
        ) : (
          <motion.div variants={item}>
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Compañía</TableHead>
                        <TableHead className="text-center">Vehículos</TableHead>
                        <TableHead className="text-center">Forma de Cobro</TableHead>
                        <TableHead className="text-center">Periodo</TableHead>
                        <TableHead className="text-right">Total Compañía</TableHead>
                        <TableHead className="text-right">Total Ingresos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((emp, idx) => (
                        <TableRow key={emp.id}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="font-medium">{emp.nombre}</TableCell>
                          <TableCell className="text-center">{emp.totalVehiculos}</TableCell>
                          <TableCell className="text-center">{formatComision(emp)}</TableCell>
                          <TableCell className="text-center">{FRECUENCIA_LABEL[emp.frecuenciaComision] || emp.frecuenciaComision}</TableCell>
                          <TableCell className="text-right">${emp.totalComision.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${emp.totalIngresos.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={5} className="font-bold">TOTAL GENERAL</TableCell>
                        <TableCell className="text-right font-bold">
                          ${filtered.reduce((s, e) => s + e.totalComision, 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${filtered.reduce((s, e) => s + e.totalIngresos, 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
