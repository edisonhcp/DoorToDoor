import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Create a "system" empresa for the super admin
  const { data: empresa, error: empError } = await adminClient
    .from('empresas')
    .insert({
      nombre: 'DoorToDoor Platform',
      ruc: '0000000000001',
      ciudad: 'Sistema',
      direccion: 'N/A',
      celular: '0000000000',
      email: 'platform@doortodoor.ec',
      propietario_nombre: 'Super Admin',
    })
    .select()
    .single();

  if (empError) {
    return new Response(JSON.stringify({ error: empError.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email: 'superadmin@doortodoor.ec',
    password: 'SuperAdmin123!',
    email_confirm: true,
    user_metadata: {
      username: 'SuperAdmin',
      empresa_id: empresa.id,
      role: 'SUPER_ADMIN',
    },
  });

  if (error) {
    await adminClient.from('empresas').delete().eq('id', empresa.id);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, user_id: data.user.id, empresa_id: empresa.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
