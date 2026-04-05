import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "GERENCIA" | "CONDUCTOR" | "PROPIETARIO" | "SUPER_ADMIN";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  empresaId: string | null;
  profile: { username: string; email: string; propietario_id?: string | null; conductor_id?: string | null } | null;
  loading: boolean;
  suspended: { type: "empresa" | "propietario"; message: string } | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata: { username: string; empresa_id: string; role: AppRole }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [loading, setLoading] = useState(true);
  const [suspended, setSuspended] = useState<AuthContextType["suspended"]>(null);

  const fetchUserData = async (userId: string) => {
    const [roleRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).single(),
      supabase.from("profiles").select("username, email, empresa_id, propietario_id, conductor_id").eq("user_id", userId).maybeSingle(),
    ]);

    const userRole = roleRes.data?.role as AppRole | undefined;
    if (userRole) setRole(userRole);

    // SUPER_ADMIN may not have a profile row — handle gracefully
    if (!profileRes.data) {
      if (userRole === "SUPER_ADMIN") {
        // Use auth metadata as fallback
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setProfile({
          username: authUser?.user_metadata?.username || authUser?.email?.split("@")[0] || "Admin",
          email: authUser?.email || "",
        });
        setEmpresaId(null);
      }
      return;
    }

    setProfile({
      username: profileRes.data.username,
      email: profileRes.data.email,
      propietario_id: profileRes.data.propietario_id,
      conductor_id: profileRes.data.conductor_id,
    });
    setEmpresaId(profileRes.data.empresa_id);

    // Check empresa suspension for ALL non-SUPER_ADMIN roles
    if (userRole && userRole !== "SUPER_ADMIN") {
      const { data: empresa } = await supabase
        .from("empresas")
        .select("nombre, activo")
        .eq("id", profileRes.data.empresa_id)
        .single();

      if (empresa && !empresa.activo) {
        setSuspended({
          type: "empresa",
          message: `Compañía ${empresa.nombre} se encuentra suspendida, por favor contáctese con soporte mediante WhatsApp.`,
        });
        return;
      }
    }

    // Check propietario suspension
    if (userRole === "PROPIETARIO" && profileRes.data.propietario_id) {
      const [propRes, empresaRes] = await Promise.all([
        supabase.from("propietarios").select("nombres, estado").eq("id", profileRes.data.propietario_id).single(),
        supabase.from("empresas").select("nombre").eq("id", profileRes.data.empresa_id).single(),
      ]);
      if (propRes.data && propRes.data.estado === "INHABILITADO") {
        setSuspended({
          type: "propietario",
          message: `${propRes.data.nombres}, su unidad se encuentra suspendida, por favor contáctese con ${empresaRes.data?.nombre || "la compañía"} mediante WhatsApp.`,
        });
        return;
      }
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setSuspended(null); // Reset before fetching
        setTimeout(() => fetchUserData(session.user.id), 0);
      } else {
        setRole(null);
        setEmpresaId(null);
        setProfile(null);
        setSuspended(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, metadata: { username: string; empresa_id: string; role: AppRole }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, empresaId, profile, loading, suspended, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
