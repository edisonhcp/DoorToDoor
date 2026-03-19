import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link2, Users, UserCheck, Copy, Search, Plus, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { fetchInvitaciones, generateInvitation } from "@/services/invitacionesService";

interface InvitacionRow {
  id: string;
  token: string;
  rol: string;
  usada: boolean;
  expires_at: string;
  created_at: string;
  used_by_email?: string | null;
  registro_status?: "activo" | "eliminado" | "pendiente" | null;
  registro_nombre?: string;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function Invitaciones() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [invitaciones, setInvitaciones] = useState<InvitacionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedRol, setSelectedRol] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");

  const loadData = async () => {
    setInvitaciones(await fetchInvitaciones());
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (role !== "GERENCIA") return <Navigate to="/dashboard" replace />;

  const handleGenerate = async () => {
    if (!selectedRol) return;
    setGenerating(true);
    try {
      const data = await generateInvitation(selectedRol);
      const link = `${window.location.origin}/registro/${data.token}`;
      setGeneratedLink(link);
      setGenerateOpen(false);
      setLinkDialogOpen(true);
      setSelectedRol("");
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast({ title: "Link copiado al portapapeles" });
  };

  const getStatus = (inv: InvitacionRow) => {
    if (inv.registro_status === "activo") return { label: "Registrado", variant: "default" as const, icon: CheckCircle2, color: "text-green-600" };
    if (inv.registro_status === "eliminado") return { label: "Eliminado", variant: "destructive" as const, icon: XCircle, color: "text-destructive" };
    if (new Date(inv.expires_at) < new Date()) return { label: "Expirada", variant: "destructive" as const, icon: XCircle, color: "text-destructive" };
    return { label: "Pendiente", variant: "default" as const, icon: Clock, color: "text-primary" };
  };

  const rolLabels: Record<string, string> = { CONDUCTOR: "Conductor", PROPIETARIO: "Propietario" };

  const filtered = invitaciones.filter(inv =>
    rolLabels[inv.rol]?.toLowerCase().includes(search.toLowerCase()) ||
    inv.token.includes(search)
  );

  const stats = {
    total: invitaciones.length,
    activas: invitaciones.filter(i => !i.usada && new Date(i.expires_at) >= new Date()).length,
    usadas: invitaciones.filter(i => i.usada).length,
  };

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Invitaciones</h1>
            <p className="text-muted-foreground mt-1">Genera links de registro para conductores y propietarios</p>
          </div>
          <Button onClick={() => setGenerateOpen(true)} className="gap-2 font-display">
            <Plus className="w-4 h-4" />
            Generar Invitación
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: "Total", value: stats.total, icon: Link2, color: "text-primary", bg: "bg-primary/10" },
            { title: "Activas", value: stats.activas, icon: Clock, color: "text-accent", bg: "bg-accent/10" },
            { title: "Usadas", value: stats.usadas, icon: CheckCircle2, color: "text-secondary", bg: "bg-secondary/10" },
          ].map((stat) => (
            <motion.div key={stat.title} variants={item}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-display font-bold text-foreground mt-1">
                      {loading ? "—" : stat.value}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div variants={item} className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por rol o token..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Cargando...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <Link2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground">
                    {search ? "No se encontraron invitaciones" : "No has generado invitaciones aún"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rol</TableHead>
                      <TableHead>Correo</TableHead>
                      <TableHead>Token</TableHead>
                      <TableHead>Creada</TableHead>
                      <TableHead>Expira</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(inv => {
                      const link = `${window.location.origin}/registro/${inv.token}`;
                      return (
                        <TableRow key={inv.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {inv.rol === "CONDUCTOR" ? <Users className="w-4 h-4 text-muted-foreground" /> : <UserCheck className="w-4 h-4 text-muted-foreground" />}
                              <span className="font-medium">{rolLabels[inv.rol] || inv.rol}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {inv.used_by_email || "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground max-w-[120px] truncate">
                            {inv.token.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(inv.created_at).toLocaleDateString("es-ES")}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(inv.expires_at).toLocaleDateString("es-ES")}
                          </TableCell>
                          <TableCell>
                            {inv.registro_status === "activo" ? (
                              <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-200 bg-green-50">
                                <CheckCircle2 className="w-3 h-3" />
                                Registrado
                              </Badge>
                            ) : inv.registro_status === "eliminado" ? (
                              <Badge variant="outline" className="text-xs gap-1 text-destructive border-destructive/20 bg-destructive/5">
                                <XCircle className="w-3 h-3" />
                                Eliminado
                              </Badge>
                            ) : !inv.usada && new Date(inv.expires_at) >= new Date() ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  Pendiente
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 text-xs"
                                  onClick={() => {
                                    navigator.clipboard.writeText(link);
                                    toast({ title: "Link copiado" });
                                  }}
                                >
                                  <Copy className="w-3 h-3" /> Copiar
                                </Button>
                              </div>
                            ) : !inv.usada ? (
                              <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                Pendiente
                              </Badge>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Generar Invitación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Selecciona el tipo de usuario que deseas invitar. El link generado expirará en 7 días y solo podrá ser usado una vez.
            </p>
            <Select value={selectedRol} onValueChange={setSelectedRol}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rol..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONDUCTOR">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" /> Conductor
                  </div>
                </SelectItem>
                <SelectItem value="PROPIETARIO">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4" /> Propietario
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancelar</Button>
            <Button onClick={handleGenerate} disabled={!selectedRol || generating}>
              {generating ? "Generando..." : "Generar Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Link de Registro Generado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Envía este enlace al usuario para que se registre. El link expira en 7 días y solo puede usarse una vez.
            </p>
            <div className="flex gap-2">
              <Input value={generatedLink} readOnly className="text-xs" />
              <Button variant="outline" size="icon" onClick={copyLink}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setLinkDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}