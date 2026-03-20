import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { fetchConductorViajes } from "@/services/egresosService";
import { fetchEmpresaInfo } from "@/services/dashboardService";
import { ViajesTable } from "@/components/ViajesTable";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function ConductorRutas() {
  const { role, user, empresaId } = useAuth();
  const [viajes, setViajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresaInfo, setEmpresaInfo] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data } = await fetchConductorViajes(user.id, ["FINALIZADO", "EN_RUTA"]);
      setViajes(data);
      if (empresaId) {
        const info = await fetchEmpresaInfo(empresaId);
        setEmpresaInfo(info);
      }
      setLoading(false);
    };
    load();
  }, [user, empresaId]);

  if (role !== "CONDUCTOR") return <Navigate to="/dashboard" replace />;

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <h1 className="text-3xl font-display font-bold text-foreground">Mis Rutas</h1>
          <p className="text-muted-foreground mt-1">Historial de viajes finalizados con ingresos y egresos</p>
        </motion.div>

        <motion.div variants={item}>
          {loading ? (
            <div className="h-48 rounded-xl bg-muted animate-pulse" />
          ) : (
            <ViajesTable
              viajes={viajes}
              showEgresos
              showConductorColumn={false}
              comisionPct={empresaInfo?.comision_pct || 0.10}
              comisionFija={empresaInfo?.comision_fija || 0}
              tipoComision={empresaInfo?.tipo_comision || "PORCENTAJE"}
              frecuenciaComision={empresaInfo?.frecuencia_comision || "SEMANAL"}
            />
          )}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
