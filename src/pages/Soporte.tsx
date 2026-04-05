import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Mail, Building2, CreditCard, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const cuentas = [
  { banco: "BANCO DE GUAYAQUIL", tipo: "Cta Ahorros", numero: "0040510562" },
  { banco: "BANCO SOLIDARIO", tipo: "Cta Ahorros", numero: "5927006609869" },
  { banco: "BANCO PICHINCHA", tipo: "Cta Ahorros", numero: "2208542847" },
  { banco: "COOP 29 DE OCTUBRE", tipo: "Cta Ahorros", numero: "401010055751" },
  { banco: "BANCO BGR", tipo: "Cta Ahorros", numero: "8300405800" },
  { banco: "BANCO AMAZONAS", tipo: "Cta Ahorros", numero: "4032260255" },
];

const copiar = (texto: string) => {
  navigator.clipboard.writeText(texto);
  toast.success("Copiado al portapapeles");
};

export default function Soporte() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold">Soporte</h1>

        {/* Company Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-primary" />
              EC Esfera Software S.A.S
            </CardTitle>
            <p className="text-sm text-muted-foreground italic">"Software a tu medida"</p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              EC Esfera Software S.A.S es una empresa ecuatoriana dedicada al desarrollo de soluciones tecnológicas a medida, enfocada en pymes y emprendedores. Ofrecemos servicios de desarrollo de aplicaciones web, móviles (iOS y Android) y sistemas informáticos, diseñados para optimizar procesos, mejorar la eficiencia operativa y potenciar el crecimiento de nuestros clientes mediante innovación tecnológica.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <h3 className="font-semibold text-primary mb-1">Misión</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Desarrollar soluciones de software personalizadas, innovadoras y eficientes, orientadas principalmente a pymes, adaptadas a las necesidades específicas de empresas y emprendedores en Ecuador, mediante el uso de tecnologías modernas. Ofrecemos desarrollo de aplicaciones web, iOS y Android que optimicen procesos, mejoren la productividad y generen valor en cada cliente.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border">
                <h3 className="font-semibold text-primary mb-1">Visión</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Ser una empresa líder en el desarrollo de software en Ecuador, enfocada en brindar soluciones tecnológicas a pymes, reconocida por su innovación, calidad y compromiso con la transformación digital, expandiendo nuestros servicios a nivel nacional e internacional.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Contacto</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="gap-2 text-green-600 border-green-300 hover:bg-green-50"
              onClick={() => window.open("https://wa.me/593994146357", "_blank")}
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open("mailto:ecsoftware2026@hotmail.com")}
            >
              <Mail className="w-4 h-4" />
              ecsoftware2026@hotmail.com
            </Button>
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="w-5 h-5 text-primary" />
              Formas de Pago
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              <p><span className="font-medium text-foreground">Nombre:</span> Edison Carvajal</p>
              <p><span className="font-medium text-foreground">Cédula:</span> 1723108542</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {cuentas.map((c) => (
                <div
                  key={c.numero}
                  className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-muted/30 text-sm"
                >
                  <div>
                    <p className="font-medium text-xs">{c.banco}</p>
                    <p className="text-muted-foreground text-xs">{c.tipo}: {c.numero}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => copiar(c.numero)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
