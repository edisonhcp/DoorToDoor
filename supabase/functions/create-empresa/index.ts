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
    // Verify the caller is a SUPER_ADMIN
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsError } = await anonClient.auth.getClaims(
      authHeader.replace('Bearer ', '')
    );
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claims.claims.sub;

    // Check SUPER_ADMIN role
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'SUPER_ADMIN')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Solo SUPER_ADMIN puede crear empresas' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { empresa, adminUser } = body;

    // Validate required fields
    if (!empresa?.nombre || !empresa?.ruc || !empresa?.ciudad || !empresa?.direccion || 
        !empresa?.celular || !empresa?.email || !empresa?.propietario_nombre) {
      return new Response(JSON.stringify({ error: 'Faltan datos de la empresa' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!adminUser?.email || !adminUser?.password || !adminUser?.username) {
      return new Response(JSON.stringify({ error: 'Faltan datos del usuario administrador' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Create the empresa
    const { data: empresaData, error: empresaError } = await adminClient
      .from('empresas')
      .insert({
        nombre: empresa.nombre,
        ruc: empresa.ruc,
        ciudad: empresa.ciudad,
        direccion: empresa.direccion,
        celular: empresa.celular,
        email: empresa.email,
        propietario_nombre: empresa.propietario_nombre,
        tipo_comision: empresa.tipo_comision || 'PORCENTAJE',
        comision_pct: empresa.comision_pct || 0.10,
        comision_fija: empresa.comision_fija || 0,
      })
      .select()
      .single();

    if (empresaError) {
      return new Response(JSON.stringify({ error: `Error creando empresa: ${empresaError.message}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Create the GERENCIA user
    const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
      email: adminUser.email,
      password: adminUser.password,
      email_confirm: true,
      user_metadata: {
        username: adminUser.username,
        empresa_id: empresaData.id,
        role: 'GERENCIA',
      },
    });

    if (userError) {
      // Rollback: delete the empresa
      await adminClient.from('empresas').delete().eq('id', empresaData.id);
      return new Response(JSON.stringify({ error: `Error creando usuario: ${userError.message}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      empresa: { id: empresaData.id, nombre: empresaData.nombre },
      user: { id: userData.user.id, email: userData.user.email },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
