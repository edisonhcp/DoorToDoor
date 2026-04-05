import { ReactNode, useState, useEffect } from "react";
import { StorageImage } from "@/components/StorageImage";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Truck, Users, Route, ClipboardList,
  Settings, LogOut, Menu, X, Building2, Shield, Link2, UserCheck, FileText, Layers, HeadsetIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const gerenciaNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Mi Flota", icon: Layers, href: "/dashboard/mi-flota" },
  { label: "Asignaciones", icon: ClipboardList, href: "/dashboard/asignaciones" },
  { label: "Consolidado Rutas", icon: Route, href: "/dashboard/viajes" },
  { label: "Invitaciones", icon: Link2, href: "/dashboard/invitaciones" },
  { label: "Gestión", icon: Building2, href: "/dashboard/gestion" },
  { label: "Soporte", icon: HeadsetIcon, href: "/dashboard/soporte" },
  { label: "Configuración", icon: Settings, href: "/dashboard/config" },
];

const propietarioNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Mis Vehículos", icon: Truck, href: "/dashboard/mis-vehiculos" },
  { label: "Asignaciones", icon: ClipboardList, href: "/dashboard/propietario-asignaciones" },
  { label: "Asignaciones Prueba", icon: ClipboardList, href: "/dashboard/propietario-asignaciones-prueba" },
  { label: "Consolidado Rutas", icon: Route, href: "/dashboard/propietario-viajes" },
  { label: "Configuración", icon: Settings, href: "/dashboard/propietario-config" },
];

const conductorNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Asignaciones de ruta", icon: ClipboardList, href: "/dashboard/conductor-asignaciones" },
  { label: "Consolidado rutas", icon: Route, href: "/dashboard/conductor-rutas" },
  { label: "Configuración", icon: Settings, href: "/dashboard/conductor-config" },
];

const superAdminNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
  { label: "Compañías", icon: Building2, href: "/admin" },
  { label: "Consolidado Viajes", icon: Route, href: "/admin/consolidado-viajes" },
  { label: "Auditoría", icon: FileText, href: "/admin/auditoria" },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, role, empresaId, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [empresaNombre, setEmpresaNombre] = useState<string | null>(null);
  const [propietarioFotoUrl, setPropietarioFotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaId || role === "SUPER_ADMIN") return;
    supabase.from("empresas").select("logo_url, nombre").eq("id", empresaId).single().then(({ data }) => {
      if (data?.logo_url) setLogoUrl(data.logo_url);
      if (data?.nombre) setEmpresaNombre(data.nombre);
    });
  }, [empresaId, role]);

  useEffect(() => {
    if (role !== "PROPIETARIO" || !profile?.propietario_id) return;
    supabase.from("propietarios").select("foto_url").eq("id", profile.propietario_id).single().then(({ data }) => {
      if (data?.foto_url) setPropietarioFotoUrl(data.foto_url);
    });
  }, [role, profile?.propietario_id]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const roleBadge: Record<string, string> = {
    GERENCIA: "Gerencia",
    CONDUCTOR: "Conductor",
    PROPIETARIO: "Propietario",
    SUPER_ADMIN: "Super Admin",
  };

  // Show different nav based on role
  const getNavItems = () => {
    switch (role) {
      case "SUPER_ADMIN": return superAdminNavItems;
      case "GERENCIA": return gerenciaNavItems;
      case "PROPIETARIO": return propietarioNavItems;
      case "CONDUCTOR": return conductorNavItems;
      default: return gerenciaNavItems;
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Truck className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-sidebar-foreground">DoorToDoor</span>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-sidebar-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {role === "SUPER_ADMIN" && (
            <div className="px-3 mb-3">
              <span className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> Admin
              </span>
            </div>
          )}
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center overflow-hidden">
              {propietarioFotoUrl ? (
                <StorageImage src={propietarioFotoUrl} alt="Propietario" className="w-full h-full object-cover" />
              ) : logoUrl ? (
                <StorageImage src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-sidebar-foreground">
                  {profile?.username?.charAt(0).toUpperCase() || "U"}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {empresaNombre || profile?.username || "Usuario"}
              </p>
              <p className="text-xs text-sidebar-foreground/50">
                {role ? roleBadge[role] : ""}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent mt-1"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center gap-4 px-6 border-b border-border bg-card">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="w-4 h-4" />
            <span>{role === "SUPER_ADMIN" ? "Panel Super Admin" : "Panel de Gestión"}</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
