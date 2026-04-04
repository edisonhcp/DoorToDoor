import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StorageImage } from "@/components/StorageImage";

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
      {/* Logo centered 30mm x 30mm */}
      {empresa.logo_url && (
        <div className="flex justify-center mb-2">
          <img
            src={empresa.logo_url}
            alt="Logo"
            className="object-contain rounded"
            style={{ width: "30mm", height: "30mm" }}
          />
        </div>
      )}

      {/* Company name centered, 14pt Arial bold */}
      <div className="text-center mb-3">
        <h2 style={{ fontSize: "14pt", fontFamily: "Arial, sans-serif", fontWeight: "bold" }}>
          {empresa.nombre}
        </h2>
      </div>

      {/* Rest of header info */}
      <div className="flex items-start justify-between border-b-2 border-foreground pb-3 mb-3">
        <div>
          <p className="text-xs text-muted-foreground">RUC: {empresa.ruc}</p>
          <p className="text-xs text-muted-foreground">{empresa.direccion}, {empresa.ciudad}</p>
          <p className="text-xs text-muted-foreground">Tel: {empresa.celular} · {empresa.email}</p>
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
