-- Agregar columna de especialidad a la tabla staff
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS specialty text;

-- Asegurar que RLS esté habilitado y existan las políticas necesarias (si no se aplicó en el paso anterior)
-- ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
