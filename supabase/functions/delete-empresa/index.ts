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

    // Verify caller
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

    console.log('Deleting empresa in cascade:', empresa_id);

    // 1. Find all auth users linked to this empresa via profiles
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('user_id')
      .eq('empresa_id', empresa_id);

    const userIds = (profiles || []).map(p => p.user_id);
    console.log(`Found ${userIds.length} users to delete`);

    // 2. Delete all related data (order matters for FK constraints)
    // Delete viaje-related data first
    const { data: viajes } = await adminClient
      .from('viajes')
      .select('id')
      .eq('empresa_id', empresa_id);
    const viajeIds = (viajes || []).map(v => v.id);

    if (viajeIds.length > 0) {
      await adminClient.from('ingresos_viaje').delete().in('viaje_id', viajeIds);
      await adminClient.from('egresos_viaje').delete().in('viaje_id', viajeIds);
      await adminClient.from('viaje_dia_control').delete().in('viaje_id', viajeIds);
    }

    // Delete viajes
    await adminClient.from('viajes').delete().eq('empresa_id', empresa_id);

    // Delete dias_operacion
    await adminClient.from('dias_operacion').delete().eq('empresa_id', empresa_id);

    // Delete semanas
    await adminClient.from('semanas').delete().eq('empresa_id', empresa_id);

    // Delete asignaciones
    await adminClient.from('asignaciones').delete().eq('empresa_id', empresa_id);

    // Delete vehiculo config tables
    await adminClient.from('vehiculo_alimentacion').delete().eq('empresa_id', empresa_id);
    await adminClient.from('vehiculo_disponibilidad').delete().eq('empresa_id', empresa_id);

    // Delete vehiculos
    await adminClient.from('vehiculos').delete().eq('empresa_id', empresa_id);

    // Delete conductores
    await adminClient.from('conductores').delete().eq('empresa_id', empresa_id);

    // Delete propietarios
    await adminClient.from('propietarios').delete().eq('empresa_id', empresa_id);

    // Delete invitaciones
    await adminClient.from('invitaciones').delete().eq('empresa_id', empresa_id);

    // Delete audit_logs
    await adminClient.from('audit_logs').delete().eq('empresa_id', empresa_id);

    // 3. Delete profiles and user_roles for all users
    for (const userId of userIds) {
      await adminClient.from('profiles').delete().eq('user_id', userId);
      await adminClient.from('user_roles').delete().eq('user_id', userId);
    }

    // 4. Delete auth users
    for (const userId of userIds) {
      const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);
      if (delErr) {
        console.error(`Error deleting auth user ${userId}:`, delErr.message);
      } else {
        console.log(`Deleted auth user: ${userId}`);
      }
    }

    // 5. Finally delete the empresa
    const { error: empError } = await adminClient.from('empresas').delete().eq('id', empresa_id);
    if (empError) {
      console.error('Error deleting empresa:', empError.message);
      return new Response(JSON.stringify({ error: empError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
