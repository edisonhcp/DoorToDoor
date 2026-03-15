
-- Create missing conductor record for ecar1cc@hotmail.com
INSERT INTO public.conductores (empresa_id, nombres, identificacion, codigo, celular, email, domicilio, tipo_licencia, estado_civil, nacionalidad, fecha_nacimiento, fecha_caducidad_licencia)
VALUES ('dbc74fac-7f55-4896-bc9e-996eb9e5c76f', 'Conductor 2', 'PENDIENTE', 'C-1002', 'PENDIENTE', 'ecar1cc@hotmail.com', 'PENDIENTE', 'PENDIENTE', 'Soltero', 'Ecuatoriana', '2000-01-01', '2030-01-01');

-- Create missing conductor record for ecar1ccc@hotmail.com
INSERT INTO public.conductores (empresa_id, nombres, identificacion, codigo, celular, email, domicilio, tipo_licencia, estado_civil, nacionalidad, fecha_nacimiento, fecha_caducidad_licencia)
VALUES ('dbc74fac-7f55-4896-bc9e-996eb9e5c76f', 'Conductor 3', 'PENDIENTE2', 'C-1003', 'PENDIENTE', 'ecar1ccc@hotmail.com', 'PENDIENTE', 'PENDIENTE', 'Soltero', 'Ecuatoriana', '2000-01-01', '2030-01-01');

-- Link profiles to conductor records
UPDATE public.profiles SET conductor_id = (SELECT id FROM public.conductores WHERE email = 'ecar1cc@hotmail.com' LIMIT 1) WHERE user_id = '914f082e-92e1-4629-be55-514421a51c83';
UPDATE public.profiles SET conductor_id = (SELECT id FROM public.conductores WHERE email = 'ecar1ccc@hotmail.com' LIMIT 1) WHERE user_id = '7ca1763d-e218-45f0-b3dd-5163e49f7a22';
