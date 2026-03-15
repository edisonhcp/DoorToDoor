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
    const { token, email, password, datos_extra } = body;
    const username = body.username || email.split('@')[0];

    console.log('Registration attempt:', { token, email, rol: 'pending' });

    if (!token || !email || !password) {
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
      console.error('Invitation validation failed:', invError?.message);
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

    console.log('Invitation valid:', { rol, empresaId });

    // If GERENCIA registration, update the placeholder empresa with real data
    if (rol === 'GERENCIA' && datos_extra) {
      await adminClient
        .from('empresas')
        .update({
          nombre: datos_extra.nombre_empresa || 'Sin nombre',
          ruc: datos_extra.ruc || '0000000000000',
          ciudad: datos_extra.ciudad || '',
          direccion: datos_extra.direccion || '',
          celular: datos_extra.celular_empresa || '',
          email: datos_extra.email_empresa || email,
          propietario_nombre: datos_extra.propietario_nombre || username,
          activo: true,
        })
        .eq('id', empresaId);
    }

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
      console.error('User creation error:', userError.message);
      // Provide clearer error message for duplicate email
      const errorMsg = userError.message.includes('already been registered') || userError.message.includes('already exists')
        ? 'Este correo electrónico ya está registrado. Usa otro correo o contacta al administrador.'
        : userError.message;
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User created:', userData.user.id);

    // If CONDUCTOR, create conductor record
    if (rol === 'CONDUCTOR') {
      const extra = datos_extra || {};
      const { data: conductorData, error: conductorError } = await adminClient
        .from('conductores')
        .insert({
          empresa_id: empresaId,
          nombres: extra.nombres || username,
          apellidos: extra.apellidos || '',
          identificacion: extra.identificacion || `ID-${Date.now()}`,
          codigo: extra.codigo || `C-${Date.now()}`,
          celular: extra.celular || 'PENDIENTE',
          email: email,
          domicilio: extra.domicilio || 'PENDIENTE',
          tipo_licencia: extra.tipo_licencia || 'PENDIENTE',
          estado_civil: extra.estado_civil || 'Soltero',
          nacionalidad: extra.nacionalidad || 'Ecuatoriana',
          fecha_nacimiento: extra.fecha_nacimiento || '2000-01-01',
          fecha_caducidad_licencia: extra.fecha_caducidad_licencia || '2030-01-01',
        })
        .select()
        .single();

      if (conductorError) {
        console.error('Error creating conductor:', conductorError);
      }
      if (conductorData) {
        console.log('Conductor created:', conductorData.id);
        await adminClient
          .from('profiles')
          .update({ conductor_id: conductorData.id })
          .eq('user_id', userData.user.id);
      }
    }

    // If PROPIETARIO, create propietario record
    if (rol === 'PROPIETARIO') {
      const extra = datos_extra || {};
      const { data: propData, error: propError } = await adminClient
        .from('propietarios')
        .insert({
          empresa_id: empresaId,
          nombres: extra.nombres || username,
          apellidos: extra.apellidos || '',
          identificacion: extra.identificacion || `ID-${Date.now()}`,
          codigo: extra.codigo || `P-${Date.now()}`,
          celular: extra.celular || 'PENDIENTE',
          email: email,
          direccion: extra.direccion || 'PENDIENTE',
          estado_civil: extra.estado_civil || 'Soltero',
          nacionalidad: extra.nacionalidad || 'Ecuatoriana',
          fecha_nacimiento: extra.fecha_nacimiento || '2000-01-01',
        })
        .select()
        .single();

      if (propError) {
        console.error('Error creating propietario:', propError);
      }
      if (propData) {
        console.log('Propietario created:', propData.id);
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

    console.log('Registration complete for:', email);

    return new Response(JSON.stringify({
      success: true,
      user: { id: userData.user.id, email: userData.user.email },
      rol: appRole,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
