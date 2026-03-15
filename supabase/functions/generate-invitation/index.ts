import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get caller info
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get caller role and empresa
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const { data: profileData } = await adminClient
      .from('profiles')
      .select('empresa_id')
      .eq('user_id', user.id)
      .single();

    const body = await req.json();
    const { rol, empresa_id } = body;

    let targetEmpresaId: string | null = null;
    // Validate permissions
    if (rol === 'GERENCIA') {
      if (roleData?.role !== 'SUPER_ADMIN') {
        return new Response(JSON.stringify({ error: 'Solo SUPER_ADMIN puede generar links de agencia' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // If no empresa_id, create a placeholder empresa for the new registration
      if (!empresa_id) {
        const uniqueId = crypto.randomUUID().slice(0, 8);
        const { data: newEmpresa, error: empresaError } = await adminClient
          .from('empresas')
          .insert({
            nombre: 'Pendiente de registro',
            ruc: `PEND-${uniqueId}`,
            ciudad: 'Pendiente',
            direccion: 'Pendiente',
            celular: '0000000000',
            email: `pendiente-${uniqueId}@pendiente.com`,
            propietario_nombre: 'Pendiente',
            activo: false,
          })
          .select('id')
          .single();
        if (empresaError) {
          return new Response(JSON.stringify({ error: empresaError.message }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        targetEmpresaId = newEmpresa.id;
      } else {
        targetEmpresaId = empresa_id;
      }
    } else if (rol === 'CONDUCTOR' || rol === 'PROPIETARIO') {
      if (roleData?.role !== 'GERENCIA') {
        return new Response(JSON.stringify({ error: 'Solo GERENCIA puede generar links de conductor/propietario' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      targetEmpresaId = profileData?.empresa_id;
    } else {
      return new Response(JSON.stringify({ error: 'Rol inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!targetEmpresaId) {
      return new Response(JSON.stringify({ error: 'No se pudo determinar la empresa' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { error: insertError } = await adminClient
      .from('invitaciones')
      .insert({
        empresa_id: targetEmpresaId,
        token,
        rol,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, token, expires_at: expiresAt.toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
