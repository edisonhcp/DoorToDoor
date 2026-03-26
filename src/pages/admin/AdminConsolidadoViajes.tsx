import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Search } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchConsolidadoEmpresas } from "@/services/empresasService";
import { Input } from "@/components/ui/input";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

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

type EmpresaData = any;

function MonthTable({ empresas, loading, search }: { empresas: EmpresaData[]; loading: boolean; search: string }) {
  const filtered = empresas.filter(emp =>
    !search || emp.nombre.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="h-48 rounded-xl bg-muted animate-pulse" />;

  if (filtered.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center"><Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" /><p className="text-muted-foreground">No hay datos para este mes</p></CardContent></Card>
    );
  }

  return (
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
  );
}

function ResumenAnualTable({ dataByMonth, search }: { dataByMonth: Record<number, EmpresaData[]>; search: string }) {
  // Build company -> month totals
  const companyMap: Record<string, { nombre: string; monthTotals: Record<number, number> }> = {};

  Object.entries(dataByMonth).forEach(([mesStr, empresas]) => {
    const mes = Number(mesStr);
    empresas.forEach((emp: EmpresaData) => {
      if (search && !emp.nombre.toLowerCase().includes(search.toLowerCase())) return;
      if (!companyMap[emp.id]) {
        companyMap[emp.id] = { nombre: emp.nombre, monthTotals: {} };
      }
      companyMap[emp.id].monthTotals[mes] = emp.totalComision;
    });
  });

  const companies = Object.values(companyMap).sort((a, b) => a.nombre.localeCompare(b.nombre));

  if (companies.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center"><Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" /><p className="text-muted-foreground">No hay datos</p></CardContent></Card>
    );
  }

  const monthTotals = MESES.map((_, i) =>
    companies.reduce((s, c) => s + (c.monthTotals[i] || 0), 0)
  );
  const grandTotal = monthTotals.reduce((s, v) => s + v, 0);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="sticky left-0 bg-background z-10">Compañía</TableHead>
                {MESES.map(m => (
                  <TableHead key={m} className="text-right text-xs whitespace-nowrap">{m.substring(0, 3)}</TableHead>
                ))}
                <TableHead className="text-right font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c, idx) => {
                const total = Object.values(c.monthTotals).reduce((s, v) => s + v, 0);
                return (
                  <TableRow key={idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium sticky left-0 bg-background z-10 whitespace-nowrap">{c.nombre}</TableCell>
                    {MESES.map((_, i) => (
                      <TableCell key={i} className="text-right">${(c.monthTotals[i] || 0).toFixed(2)}</TableCell>
                    ))}
                    <TableCell className="text-right font-bold">${total.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-bold sticky left-0 bg-muted/50 z-10">TOTAL</TableCell>
                {monthTotals.map((t, i) => (
                  <TableCell key={i} className="text-right font-bold">${t.toFixed(2)}</TableCell>
                ))}
                <TableCell className="text-right font-bold">${grandTotal.toFixed(2)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminConsolidadoViajes() {
  const { role } = useAuth();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [dataByMonth, setDataByMonth] = useState<Record<number, EmpresaData[]>>({});
  const [loadingMonths, setLoadingMonths] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(String(currentMonth));

  const loadMonth = async (mes: number) => {
    if (dataByMonth[mes] || loadingMonths[mes]) return;
    setLoadingMonths(prev => ({ ...prev, [mes]: true }));
    const data = await fetchConsolidadoEmpresas(mes, currentYear);
    setDataByMonth(prev => ({ ...prev, [mes]: data }));
    setLoadingMonths(prev => ({ ...prev, [mes]: false }));
  };

  useEffect(() => {
    loadMonth(currentMonth);
  }, []);

  useEffect(() => {
    const tabNum = Number(activeTab);
    if (activeTab === "resumen") {
      // Load all months for summary
      MESES.forEach((_, i) => loadMonth(i));
    } else {
      loadMonth(tabNum);
    }
  }, [activeTab]);

  if (role !== "SUPER_ADMIN") return <Navigate to="/admin" replace />;

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <h1 className="text-3xl font-display font-bold text-foreground">Consolidado Viajes</h1>
          <p className="text-muted-foreground mt-1">Resumen financiero por compañía — {currentYear}</p>
        </motion.div>

        <motion.div variants={item} className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre de compañía..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </motion.div>

        <motion.div variants={item}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              {MESES.map((mes, i) => (
                <TabsTrigger key={i} value={String(i)} className="text-xs px-2 py-1.5">
                  {mes.substring(0, 3)}
                </TabsTrigger>
              ))}
              <TabsTrigger value="resumen" className="text-xs px-3 py-1.5 font-bold">
                Resumen Anual
              </TabsTrigger>
            </TabsList>

            {MESES.map((_, i) => (
              <TabsContent key={i} value={String(i)}>
                <MonthTable
                  empresas={dataByMonth[i] || []}
                  loading={!!loadingMonths[i] && !dataByMonth[i]}
                  search={search}
                />
              </TabsContent>
            ))}

            <TabsContent value="resumen">
              <ResumenAnualTable dataByMonth={dataByMonth} search={search} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
