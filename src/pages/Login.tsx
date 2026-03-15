import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Truck, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast({
        title: "Error de autenticación",
        description: "Credenciales incorrectas. Verifica tu email y contraseña.",
        variant: "destructive",
      });
    } else {
      navigate("/dashboard");
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) return;
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSendingReset(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Correo enviado", description: "Revisa tu bandeja de entrada para restablecer tu contraseña." });
      setForgotOpen(false);
      setForgotEmail("");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary blur-[100px]" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-secondary blur-[120px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary mb-8">
            <Truck className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-display font-bold text-sidebar-foreground mb-4 tracking-tight">
            DoorToDoor
          </h1>
          <p className="text-sidebar-foreground/60 text-lg max-w-md">
            Sistema integral de gestión de transporte puerta a puerta. Control total de tu flota.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-sidebar-foreground/50">
            <div>
              <div className="text-3xl font-display font-bold text-primary">100%</div>
              <div className="text-sm mt-1">Digital</div>
            </div>
            <div>
              <div className="text-3xl font-display font-bold text-secondary">24/7</div>
              <div className="text-sm mt-1">Monitoreo</div>
            </div>
            <div>
              <div className="text-3xl font-display font-bold text-accent">GPS</div>
              <div className="text-sm mt-1">Tracking</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary">
              <Truck className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-display font-bold text-foreground">DoorToDoor</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-foreground">Bienvenido</h2>
            <p className="text-muted-foreground mt-2">Ingresa a tu cuenta para continuar</p>
          </div>

          <Card className="border-0 shadow-xl shadow-primary/5">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Correo electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-11"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 font-display font-semibold text-base"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                      Ingresando...
                    </div>
                  ) : (
                    "Ingresar"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            ¿No tienes cuenta? Contacta al administrador de tu empresa.
          </p>
        </motion.div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Recuperar contraseña</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p>
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Correo electrónico</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="tu@empresa.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotOpen(false)}>Cancelar</Button>
            <Button onClick={handleForgotPassword} disabled={sendingReset || !forgotEmail}>
              {sendingReset ? "Enviando..." : "Enviar enlace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
