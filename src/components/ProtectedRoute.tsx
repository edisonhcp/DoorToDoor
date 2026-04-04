import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, suspended, role, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  // Block ALL roles (except SUPER_ADMIN) when empresa or propietario is suspended
  if (suspended) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Cuenta Suspendida</h1>
          <p className="text-muted-foreground leading-relaxed">{suspended.message}</p>
          <div className="flex flex-col gap-3">
            <Button variant="outline" className="gap-2" asChild>
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4" />
                Contactar por WhatsApp
              </a>
            </Button>
            <Button variant="ghost" onClick={() => signOut()} className="text-muted-foreground">
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
