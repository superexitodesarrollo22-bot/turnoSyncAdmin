-- ================================================================================
-- TURNOSYNCADMIN — PASO 12: SEGURIDAD RLS EN SUPABASE
-- ================================================================================

-- PASO 1 — HABILITAR RLS EN TODAS LAS TABLAS
ALTER TABLE public.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blackout_dates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices           ENABLE ROW LEVEL SECURITY;

-- PASO 2 — FUNCIÓN AUXILIAR (helper)
CREATE OR REPLACE FUNCTION public.get_my_business_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT bu.business_id
  FROM public.business_users bu
  INNER JOIN public.users u ON u.id = bu.user_id
  WHERE u.supabase_auth_uid = auth.uid()
    AND bu.role IN ('admin', 'owner')
  LIMIT 1;
$$;

-- PASO 3 — POLÍTICA: TABLA users
CREATE POLICY "Admin puede leer su perfil"
  ON public.users
  FOR SELECT
  USING (supabase_auth_uid = auth.uid());

CREATE POLICY "Admin puede actualizar su perfil"
  ON public.users
  FOR UPDATE
  USING (supabase_auth_uid = auth.uid())
  WITH CHECK (supabase_auth_uid = auth.uid());

CREATE POLICY "Admin puede leer clientes de su negocio"
  ON public.users
  FOR SELECT
  USING (
    id IN (
      SELECT client_user_id FROM public.appointments
      WHERE business_id = public.get_my_business_id()
    )
  );

-- PASO 4 — POLÍTICA: TABLA businesses
CREATE POLICY "Admin puede leer su negocio"
  ON public.businesses
  FOR SELECT
  USING (id = public.get_my_business_id());

CREATE POLICY "Admin puede actualizar su negocio"
  ON public.businesses
  FOR UPDATE
  USING (id = public.get_my_business_id())
  WITH CHECK (id = public.get_my_business_id());

-- PASO 5 — POLÍTICA: TABLA business_users
CREATE POLICY "Admin puede ver members de su negocio"
  ON public.business_users
  FOR SELECT
  USING (business_id = public.get_my_business_id());

-- PASO 6 — POLÍTICA: TABLA services
CREATE POLICY "Admin puede leer sus servicios"
  ON public.services
  FOR SELECT
  USING (business_id = public.get_my_business_id());

CREATE POLICY "Admin puede crear servicios en su negocio"
  ON public.services
  FOR INSERT
  WITH CHECK (business_id = public.get_my_business_id());

CREATE POLICY "Admin puede actualizar sus servicios"
  ON public.services
  FOR UPDATE
  USING (business_id = public.get_my_business_id())
  WITH CHECK (business_id = public.get_my_business_id());

CREATE POLICY "Admin puede eliminar sus servicios"
  ON public.services
  FOR DELETE
  USING (business_id = public.get_my_business_id());

CREATE POLICY "Usuarios pueden leer servicios activos"
  ON public.services
  FOR SELECT
  USING (active = true);

-- PASO 7 — POLÍTICA: TABLA schedules
CREATE POLICY "Admin puede leer sus horarios"
  ON public.schedules FOR SELECT
  USING (business_id = public.get_my_business_id());

CREATE POLICY "Admin puede crear sus horarios"
  ON public.schedules FOR INSERT
  WITH CHECK (business_id = public.get_my_business_id());

CREATE POLICY "Admin puede actualizar sus horarios"
  ON public.schedules FOR UPDATE
  USING (business_id = public.get_my_business_id())
  WITH CHECK (business_id = public.get_my_business_id());

CREATE POLICY "Admin puede eliminar sus horarios"
  ON public.schedules FOR DELETE
  USING (business_id = public.get_my_business_id());

CREATE POLICY "Usuarios pueden leer horarios"
  ON public.schedules FOR SELECT
  USING (true);

-- PASO 8 — POLÍTICA: TABLA blackout_dates
CREATE POLICY "Admin CRUD sus fechas bloqueadas"
  ON public.blackout_dates FOR ALL
  USING (business_id = public.get_my_business_id())
  WITH CHECK (business_id = public.get_my_business_id());

CREATE POLICY "Usuarios pueden leer fechas bloqueadas"
  ON public.blackout_dates FOR SELECT
  USING (true);

-- PASO 9 — POLÍTICA: TABLA staff
CREATE POLICY "Admin CRUD su staff"
  ON public.staff FOR ALL
  USING (business_id = public.get_my_business_id())
  WITH CHECK (business_id = public.get_my_business_id());

CREATE POLICY "Usuarios pueden leer staff activo"
  ON public.staff FOR SELECT
  USING (active = true);

-- PASO 10 — POLÍTICA: TABLA appointments
CREATE POLICY "Admin puede ver turnos de su negocio"
  ON public.appointments FOR SELECT
  USING (business_id = public.get_my_business_id());

CREATE POLICY "Admin puede actualizar turnos de su negocio"
  ON public.appointments FOR UPDATE
  USING (business_id = public.get_my_business_id())
  WITH CHECK (business_id = public.get_my_business_id());

CREATE POLICY "Cliente puede crear un turno"
  ON public.appointments FOR INSERT
  WITH CHECK (
    client_user_id IN (
      SELECT id FROM public.users
      WHERE supabase_auth_uid = auth.uid()
    )
  );

CREATE POLICY "Cliente puede ver sus turnos"
  ON public.appointments FOR SELECT
  USING (
    client_user_id IN (
      SELECT id FROM public.users
      WHERE supabase_auth_uid = auth.uid()
    )
  );

CREATE POLICY "Cliente puede cancelar sus turnos"
  ON public.appointments FOR UPDATE
  USING (
    client_user_id IN (
      SELECT id FROM public.users
      WHERE supabase_auth_uid = auth.uid()
    )
  );

-- PASO 11 — POLÍTICA: TABLA audit_logs
CREATE POLICY "Admin puede insertar audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (business_id = public.get_my_business_id());

CREATE POLICY "Admin puede leer sus audit logs"
  ON public.audit_logs FOR SELECT
  USING (business_id = public.get_my_business_id());

-- PASO 12 — POLÍTICA: TABLA user_devices
CREATE POLICY "Usuario puede gestionar sus dispositivos"
  ON public.user_devices FOR ALL
  USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE supabase_auth_uid = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users
      WHERE supabase_auth_uid = auth.uid()
    )
  );
