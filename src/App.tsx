import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SuperAdminPanel from "./pages/SuperAdminPanel";
import AdminVehiculos from "./pages/admin/AdminVehiculos";
import AdminConductores from "./pages/admin/AdminConductores";
import AdminPropietarios from "./pages/admin/AdminPropietarios";
import AdminConsolidadoViajes from "./pages/admin/AdminConsolidadoViajes";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AgencyPropietarios from "./pages/agency/AgencyPropietarios";
import AgencyVehiculos from "./pages/agency/AgencyVehiculos";
import AgencyConductores from "./pages/agency/AgencyConductores";
import RegistroInvitacion from "./pages/RegistroInvitacion";
import Invitaciones from "./pages/Invitaciones";
import PropietarioVehiculos from "./pages/PropietarioVehiculos";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import Asignaciones from "./pages/Asignaciones";
import GerenciaViajes from "./pages/GerenciaViajes";
import ConductorAsignaciones from "./pages/conductor/ConductorAsignaciones";
import ConductorRutas from "./pages/conductor/ConductorRutas";
import PropietarioAsignaciones from "./pages/propietario/PropietarioAsignaciones";
import PropietarioViajes from "./pages/propietario/PropietarioViajes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro/:token" element={<RegistroInvitacion />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/mis-vehiculos" element={<ProtectedRoute><PropietarioVehiculos /></ProtectedRoute>} />
            <Route path="/dashboard/propietarios" element={<ProtectedRoute><AgencyPropietarios /></ProtectedRoute>} />
            <Route path="/dashboard/vehiculos" element={<ProtectedRoute><AgencyVehiculos /></ProtectedRoute>} />
            <Route path="/dashboard/conductores" element={<ProtectedRoute><AgencyConductores /></ProtectedRoute>} />
            <Route path="/dashboard/invitaciones" element={<ProtectedRoute><Invitaciones /></ProtectedRoute>} />
            <Route path="/dashboard/asignaciones" element={<ProtectedRoute><Asignaciones /></ProtectedRoute>} />
            <Route path="/dashboard/viajes" element={<ProtectedRoute><GerenciaViajes /></ProtectedRoute>} />
            <Route path="/dashboard/conductor-asignaciones" element={<ProtectedRoute><ConductorAsignaciones /></ProtectedRoute>} />
            <Route path="/dashboard/conductor-rutas" element={<ProtectedRoute><ConductorRutas /></ProtectedRoute>} />
            <Route path="/dashboard/propietario-asignaciones" element={<ProtectedRoute><PropietarioAsignaciones /></ProtectedRoute>} />
            <Route path="/dashboard/propietario-viajes" element={<ProtectedRoute><PropietarioViajes /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><SuperAdminPanel /></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/vehiculos" element={<ProtectedRoute><AdminVehiculos /></ProtectedRoute>} />
            <Route path="/admin/conductores" element={<ProtectedRoute><AdminConductores /></ProtectedRoute>} />
            <Route path="/admin/propietarios" element={<ProtectedRoute><AdminPropietarios /></ProtectedRoute>} />
            <Route path="/admin/consolidado-viajes" element={<ProtectedRoute><AdminConsolidadoViajes /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
