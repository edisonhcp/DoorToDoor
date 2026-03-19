import { supabase } from "@/integrations/supabase/client";

export async function fetchInvitaciones() {
  const [invRes, condRes, propRes] = await Promise.all([
    supabase.from("invitaciones").select("*").in("rol", ["CONDUCTOR", "PROPIETARIO"]).order("created_at", { ascending: false }),
    supabase.from("conductores").select("id, nombres, apellidos, email"),
    supabase.from("propietarios").select("id, nombres, apellidos, email"),
  ]);

  const invData = invRes.data || [];
  const conductores = condRes.data || [];
  const propietarios = propRes.data || [];

  const conductorEmailSet = new Set(conductores.map((c: any) => c.email?.toLowerCase()));
  const propietarioEmailSet = new Set(propietarios.map((p: any) => p.email?.toLowerCase()));

  const conductorByEmail = new Map(conductores.map((c: any) => [c.email?.toLowerCase(), `${c.nombres} ${c.apellidos}`.trim()]));
  const propietarioByEmail = new Map(propietarios.map((p: any) => [p.email?.toLowerCase(), `${p.nombres} ${p.apellidos}`.trim()]));

  return invData.map((inv: any) => {
    if (!inv.usada) return inv;

    const usedEmail = inv.used_by_email?.toLowerCase();

    if (inv.rol === "CONDUCTOR") {
      if (usedEmail && conductorEmailSet.has(usedEmail)) {
        return { ...inv, registro_status: "activo", registro_nombre: conductorByEmail.get(usedEmail) || "" };
      }
      return { ...inv, registro_status: "eliminado" };
    }
    if (inv.rol === "PROPIETARIO") {
      if (usedEmail && propietarioEmailSet.has(usedEmail)) {
        return { ...inv, registro_status: "activo", registro_nombre: propietarioByEmail.get(usedEmail) || "" };
      }
      return { ...inv, registro_status: "eliminado" };
    }
    return inv;
  });
}

export async function generateInvitation(rol: string, empresaId?: string) {
  const { data, error } = await supabase.functions.invoke("generate-invitation", {
    body: { rol, empresa_id: empresaId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function validateInvitation(token: string) {
  const { data, error } = await supabase.functions.invoke("validate-invitation", {
    body: { token },
  });
  if (error || data?.error) return { valid: false, error: data?.error || error?.message };
  return { valid: true, rol: data.rol, empresa_nombre: data.empresa_nombre };
}

export async function registerWithInvitation(body: any) {
  const { data, error } = await supabase.functions.invoke("register-with-invitation", { body });
  if (error) throw new Error(data?.error || error.message || "Error al registrar");
  if (data?.error) throw new Error(data.error);
  return data;
}
