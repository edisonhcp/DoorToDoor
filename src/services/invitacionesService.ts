import { supabase } from "@/integrations/supabase/client";

export async function fetchInvitaciones() {
  const [invRes, profRes, condRes, propRes] = await Promise.all([
    supabase.from("invitaciones").select("*").in("rol", ["CONDUCTOR", "PROPIETARIO"]).order("created_at", { ascending: false }),
    supabase.from("profiles").select("email, conductor_id, propietario_id"),
    supabase.from("conductores").select("id, nombres, apellidos, email"),
    supabase.from("propietarios").select("id, nombres, apellidos, email"),
  ]);

  const invData = invRes.data || [];
  const conductores = condRes.data || [];
  const propietarios = propRes.data || [];

  const conductorEmails = new Map(conductores.map((c: any) => [c.email, `${c.nombres} ${c.apellidos}`.trim()]));
  const propietarioEmails = new Map(propietarios.map((p: any) => [p.email, `${p.nombres} ${p.apellidos}`.trim()]));

  return invData.map((inv: any) => {
    if (!inv.usada) return inv;

    if (inv.rol === "CONDUCTOR") {
      const existing = conductores.find((c: any) => conductorEmails.has(c.email));
      if (existing) return { ...inv, registro_status: "activo", registro_nombre: `${existing.nombres} ${existing.apellidos}`.trim() };
      return { ...inv, registro_status: "eliminado" };
    }
    if (inv.rol === "PROPIETARIO") {
      const existing = propietarios.find((p: any) => propietarioEmails.has(p.email));
      if (existing) return { ...inv, registro_status: "activo", registro_nombre: `${existing.nombres} ${existing.apellidos}`.trim() };
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
