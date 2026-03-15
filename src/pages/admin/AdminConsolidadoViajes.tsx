import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, ChevronDown, ChevronUp } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchConsolidadoEmpresas } from "@/services/empresasService";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const TIPO_COMISION_LABEL: Record<string, string> = {
  PORCENTAJE: "Porcentaje",
  FIJO: "Fijo",
  MIXTO: "Mixto",
};

export default function AdminConsolidadoViajes() {
  const { role } = useAuth();
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const data = await fetchConsolidadoEmpresas();
      setEmpresas(data);
      setLoading(false);
    };
    load();
  }, []);

  if (role !== "SUPER_ADMIN") return <Navigate to="/admin" replace />;

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <h1 className="text-3xl font-display font-bold text-foreground">Consolidado Viajes</h1>
          <p className="text-muted-foreground mt-1">Resumen financiero por compañía</p>
        </motion.div>

        {loading ? (
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
        ) : (
          <>
            {empresas.map((emp, idx) => {
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
                                <TableHead className="text-right">Total Compañía</TableHead>
                                <TableHead className="text-right">Total Ingresos</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell className="font-medium">{emp.nombre}</TableCell>
                                <TableCell className="text-center">{emp.totalVehiculos}</TableCell>
                                <TableCell className="text-center">{TIPO_COMISION_LABEL[emp.tipoComision] || emp.tipoComision}</TableCell>
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
            {empresas.length > 0 && (
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
                            <TableHead className="text-right">Total Compañía</TableHead>
                            <TableHead className="text-right">Total Ingresos</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {empresas.map((emp, idx) => (
                            <TableRow key={emp.id}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell className="font-medium">{emp.nombre}</TableCell>
                              <TableCell className="text-center">{emp.totalVehiculos}</TableCell>
                              <TableCell className="text-center">{TIPO_COMISION_LABEL[emp.tipoComision] || emp.tipoComision}</TableCell>
                              <TableCell className="text-right">${emp.totalComision.toFixed(2)}</TableCell>
                              <TableCell className="text-right">${emp.totalIngresos.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell colSpan={4} className="font-bold">TOTAL GENERAL</TableCell>
                            <TableCell className="text-right font-bold">
                              ${empresas.reduce((s, e) => s + e.totalComision, 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              ${empresas.reduce((s, e) => s + e.totalIngresos, 0).toFixed(2)}
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
