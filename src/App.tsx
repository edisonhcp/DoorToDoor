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
import RegistroInvitacion from "./pages/RegistroInvitacion";
import Invitaciones from "./pages/Invitaciones";
import NotFound from "./pages/NotFound";

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
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><SuperAdminPanel /></ProtectedRoute>} />
            <Route path="/admin/vehiculos" element={<ProtectedRoute><AdminVehiculos /></ProtectedRoute>} />
            <Route path="/admin/conductores" element={<ProtectedRoute><AdminConductores /></ProtectedRoute>} />
            <Route path="/admin/propietarios" element={<ProtectedRoute><AdminPropietarios /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
