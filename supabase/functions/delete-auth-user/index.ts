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
    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify caller's token
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is GERENCIA or SUPER_ADMIN
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .single();

    if (!roleData || (roleData.role !== 'GERENCIA' && roleData.role !== 'SUPER_ADMIN')) {
      return new Response(JSON.stringify({ error: 'No tienes permisos para esta acción' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Deleting auth user for email:', email);

    // Find the auth user by email
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError.message);
      return new Response(JSON.stringify({ error: 'Error buscando usuario' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetUser = users.find(u => u.email === email);
    
    if (!targetUser) {
      console.log('No auth user found for email:', email);
      return new Response(JSON.stringify({ success: true, message: 'No se encontró cuenta de autenticación' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete profile and user_roles first (they reference auth.users)
    await adminClient.from('profiles').delete().eq('user_id', targetUser.id);
    await adminClient.from('user_roles').delete().eq('user_id', targetUser.id);

    // Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUser.id);

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError.message);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Auth user deleted:', targetUser.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
