import { supabase } from "@/integrations/supabase/client";

export async function fetchPropietarios() {
  const { data } = await supabase
    .from("propietarios")
    .select("*, vehiculos(id, placa, marca, modelo, tipo, anio, estado)")
    .order("created_at", { ascending: false });
  return data || [];
}

export async function deletePropietario(propietario: any) {
  const propEmail = propietario.email;
  await supabase.from("profiles").update({ propietario_id: null }).eq("propietario_id", propietario.id);
  await supabase.from("vehiculos").delete().eq("propietario_id", propietario.id);
  const { error } = await supabase.from("propietarios").delete().eq("id", propietario.id);
  if (error) return { error };

  if (propEmail) {
    await supabase.functions.invoke("delete-auth-user", { body: { email: propEmail } });
  }
  return { error: null };
}

export async function deletePropietarioAccount(userId: string) {
  const { data: prof } = await supabase.from("profiles").select("propietario_id").eq("user_id", userId).single();
  if (prof?.propietario_id) {
    await supabase.from("profiles").update({ propietario_id: null }).eq("user_id", userId);
    await supabase.from("vehiculos").delete().eq("propietario_id", prof.propietario_id);
    await supabase.from("propietarios").delete().eq("id", prof.propietario_id);
  }
  await supabase.auth.signOut();
}
