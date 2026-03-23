import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, ChevronDown, ChevronUp, Search } from "lucide-react";
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
  const [expanded, setExpanded] = useState<string | null>(null);
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
        ) : (
          <>
            {filtered.map((emp, idx) => {
              const isOpen = expanded === emp.id;
              return (
                <motion.div key={emp.id} variants={item}>
                  <Card
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setExpanded(isOpen ? null : emp.id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-base">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-primary" />
                          <span>{emp.nombre}</span>
                          <span className="text-muted-foreground text-xs">
                            ({emp.totalVehiculos} vehículos · {emp.totalViajes} viajes)
                          </span>
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
                              <TableRow>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell className="font-medium">{emp.nombre}</TableCell>
                                <TableCell className="text-center">{emp.totalVehiculos}</TableCell>
                                <TableCell className="text-center">{formatComision(emp)}</TableCell>
                                <TableCell className="text-center">{FRECUENCIA_LABEL[emp.frecuenciaComision] || emp.frecuenciaComision}</TableCell>
                                <TableCell className="text-right font-semibold">${emp.totalComision.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-semibold">${emp.totalIngresos.toFixed(2)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </motion.div>
              );
            })}

            {/* Grand total */}
            {filtered.length > 0 && (
              <motion.div variants={item}>
                <Card className="border-primary/30">
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
          </>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
