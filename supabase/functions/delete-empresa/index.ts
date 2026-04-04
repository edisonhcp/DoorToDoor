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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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

    // Must be SUPER_ADMIN
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .single();

    if (!roleData || roleData.role !== 'SUPER_ADMIN') {
      return new Response(JSON.stringify({ error: 'Solo Super Admin puede eliminar compañías' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { empresa_id } = await req.json();
    if (!empresa_id) {
      return new Response(JSON.stringify({ error: 'empresa_id requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Deleting empresa (cascade auth only):', empresa_id);

    // 1. Find all auth users linked to this empresa via profiles
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('user_id')
      .eq('empresa_id', empresa_id);

    const userIds = (profiles || []).map(p => p.user_id);
    console.log(`Found ${userIds.length} users to delete`);

    // 2. Delete profiles and user_roles for all users
    for (const userId of userIds) {
      await adminClient.from('profiles').delete().eq('user_id', userId);
      await adminClient.from('user_roles').delete().eq('user_id', userId);
    }

    // 3. Delete auth users (frees emails for re-registration)
    for (const userId of userIds) {
      const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);
      if (delErr) {
        console.error(`Error deleting auth user ${userId}:`, delErr.message);
      } else {
        console.log(`Deleted auth user: ${userId}`);
      }
    }

    // 4. Delete the empresa record
    const { error: empError } = await adminClient.from('empresas').delete().eq('id', empresa_id);
    if (empError) {
      console.error('Error deleting empresa:', empError.message);
      return new Response(JSON.stringify({ error: empError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // NOTE: All operational data (viajes, ingresos, egresos, conductores, vehiculos, etc.)
    // remains in the database for Super Admin historical reports and auditing.

    console.log('Empresa deleted successfully:', empresa_id);

    return new Response(JSON.stringify({ success: true, deleted_users: userIds.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
