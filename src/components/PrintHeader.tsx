import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PrintHeaderProps {
  reportTitle: string;
  subtitle?: string;
  vehicleInfo?: string;
  periodInfo?: string;
}

export function PrintHeader({ reportTitle, subtitle, vehicleInfo, periodInfo }: PrintHeaderProps) {
  const { empresaId } = useAuth();
  const [empresa, setEmpresa] = useState<any>(null);

  useEffect(() => {
    if (!empresaId) return;
    supabase
      .from("empresas")
      .select("nombre, ruc, direccion, ciudad, celular, email, logo_url")
      .eq("id", empresaId)
      .single()
      .then(({ data }) => {
        if (data) setEmpresa(data);
      });
  }, [empresaId]);

  if (!empresa) return null;

  const today = new Date().toLocaleDateString("es-EC", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="print-header hidden print:block mb-6">
      <div className="flex items-start justify-between border-b-2 border-foreground pb-3 mb-3">
        {/* Logo + Company Info */}
        <div className="flex items-start gap-4">
          {empresa.logo_url && (
            <img
              src={empresa.logo_url}
              alt="Logo"
              className="w-16 h-16 object-contain rounded"
            />
          )}
          <div>
            <h2 className="text-lg font-bold">{empresa.nombre}</h2>
            <p className="text-xs text-muted-foreground">RUC: {empresa.ruc}</p>
            <p className="text-xs text-muted-foreground">{empresa.direccion}, {empresa.ciudad}</p>
            <p className="text-xs text-muted-foreground">Tel: {empresa.celular} · {empresa.email}</p>
          </div>
        </div>

        {/* Report title + date */}
        <div className="text-right">
          <h3 className="text-base font-bold">{reportTitle}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          <p className="text-xs text-muted-foreground mt-1">Fecha: {today}</p>
        </div>
      </div>

      {/* Vehicle / Period info */}
      {(vehicleInfo || periodInfo) && (
        <div className="flex gap-6 text-xs mb-3">
          {vehicleInfo && (
            <p><span className="font-semibold">Vehículo:</span> {vehicleInfo}</p>
          )}
          {periodInfo && (
            <p><span className="font-semibold">Periodo:</span> {periodInfo}</p>
          )}
        </div>
      )}
    </div>
  );
}
