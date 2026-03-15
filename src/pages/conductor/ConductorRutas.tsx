import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Route } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { fetchConductorViajes } from "@/services/egresosService";
import { ViajesTable } from "@/components/ViajesTable";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function ConductorRutas() {
  const { role, user } = useAuth();
  const [viajes, setViajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data } = await fetchConductorViajes(user.id, ["FINALIZADO"]);
      setViajes(data);
      setLoading(false);
    };
    load();
  }, [user]);

  if (role !== "CONDUCTOR") return <Navigate to="/dashboard" replace />;

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <h1 className="text-3xl font-display font-bold text-foreground">Mis Rutas</h1>
          <p className="text-muted-foreground mt-1">Historial de rutas finalizadas con ingresos y egresos</p>
        </motion.div>

        <motion.div variants={item}>
          {loading ? (
            <div className="h-48 rounded-xl bg-muted animate-pulse" />
          ) : (
            <ViajesTable viajes={viajes} showEgresos showConductorColumn={false} />
          )}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
