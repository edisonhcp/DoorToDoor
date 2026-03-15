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
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { token, email, password, username, datos_extra } = body;

    if (!token || !email || !password || !username) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate token
    const { data: invitacion, error: invError } = await adminClient
      .from('invitaciones')
      .select('*')
      .eq('token', token)
      .eq('usada', false)
      .single();

    if (invError || !invitacion) {
      return new Response(JSON.stringify({ error: 'Invitación inválida o ya utilizada' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (new Date(invitacion.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'La invitación ha expirado' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rol = invitacion.rol;
    const empresaId = invitacion.empresa_id;

    // Map rol to app_role
    const appRole = rol === 'GERENCIA' ? 'GERENCIA' : rol === 'CONDUCTOR' ? 'CONDUCTOR' : 'PROPIETARIO';

    // Create user
    const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        empresa_id: empresaId,
        role: appRole,
      },
    });

    if (userError) {
      return new Response(JSON.stringify({ error: userError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If CONDUCTOR, create conductor record
    if (rol === 'CONDUCTOR' && datos_extra) {
      const { data: conductorData, error: conductorError } = await adminClient
        .from('conductores')
        .insert({
          empresa_id: empresaId,
          nombres: datos_extra.nombres || username,
          identificacion: datos_extra.identificacion || '',
          codigo: datos_extra.codigo || `C-${Date.now()}`,
          celular: datos_extra.celular || '',
          email: email,
          domicilio: datos_extra.domicilio || '',
          tipo_licencia: datos_extra.tipo_licencia || '',
          estado_civil: datos_extra.estado_civil || '',
          nacionalidad: datos_extra.nacionalidad || 'Ecuatoriana',
          fecha_nacimiento: datos_extra.fecha_nacimiento || '2000-01-01',
          fecha_caducidad_licencia: datos_extra.fecha_caducidad_licencia || '2030-01-01',
        })
        .select()
        .single();

      if (!conductorError && conductorData) {
        // Link profile to conductor
        await adminClient
          .from('profiles')
          .update({ conductor_id: conductorData.id })
          .eq('user_id', userData.user.id);
      }
    }

    // If PROPIETARIO, create propietario record
    if (rol === 'PROPIETARIO' && datos_extra) {
      const { data: propData, error: propError } = await adminClient
        .from('propietarios')
        .insert({
          empresa_id: empresaId,
          nombres: datos_extra.nombres || username,
          identificacion: datos_extra.identificacion || '',
          codigo: datos_extra.codigo || `P-${Date.now()}`,
          celular: datos_extra.celular || '',
          email: email,
          direccion: datos_extra.direccion || '',
          estado_civil: datos_extra.estado_civil || '',
          nacionalidad: datos_extra.nacionalidad || 'Ecuatoriana',
          fecha_nacimiento: datos_extra.fecha_nacimiento || '2000-01-01',
        })
        .select()
        .single();

      if (!propError && propData) {
        await adminClient
          .from('profiles')
          .update({ propietario_id: propData.id })
          .eq('user_id', userData.user.id);
      }
    }

    // Mark invitation as used
    await adminClient
      .from('invitaciones')
      .update({ usada: true })
      .eq('id', invitacion.id);

    return new Response(JSON.stringify({
      success: true,
      user: { id: userData.user.id, email: userData.user.email },
      rol: appRole,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
