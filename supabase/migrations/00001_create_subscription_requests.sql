-- Create subscription_requests table
CREATE TABLE public.subscription_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  -- Datos del administrador
  admin_full_name text NOT NULL,
  admin_email text NOT NULL,
  admin_phone text NOT NULL,
  -- Datos de la empresa
  company_name text NOT NULL,
  company_address text NOT NULL,
  company_phone text NOT NULL,
  company_description text NOT NULL,
  company_type text NOT NULL,
  estimated_monthly_appointments text NOT NULL,
  -- Estado
  status text NOT NULL DEFAULT 'pending',
  -- 'pending' | 'approved' | 'rejected'
  notes text,
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  CONSTRAINT subscription_requests_pkey PRIMARY KEY (id)
);

-- Habilitar RLS
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserciones públicas (para nuevas solicitudes)
CREATE POLICY "Anyone can insert subscription requests"
  ON public.subscription_requests
  FOR INSERT
  WITH CHECK (true);

-- Nota: Solo el rol de servicio o administradores del sistema deberían poder leer/editar.
-- Por defecto, RLS bloqueará el acceso de lectura a otros roles.
