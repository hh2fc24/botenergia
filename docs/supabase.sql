-- energybot-embed / Supabase schema
--
-- Tabla: leads
--
-- Nota: Por ahora, RLS está DESACTIVADO (por requerimiento) y el backend usa
-- SUPABASE_SERVICE_ROLE_KEY para escribir.
--
-- Para producción, se recomienda:
-- 1) Activar RLS: ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
-- 2) Crear políticas (por ejemplo) para permitir lectura solo a usuarios autenticados/admin.
-- 3) Reemplazar el dashboard sin auth por auth (JWT, Supabase Auth, etc.)

create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  email text null,
  intent_main text not null,  -- "eficiencia_energetica" | "producto_tecnologia" | "otras"
  intent_sub text null,       -- "casa" | "empresa" | "colegio"
  message text null,
  consent boolean not null,
  source text not null default 'wordpress_widget',
  page_url text null,
  user_agent text null,
  ai_summary text null
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_intent_main_idx on public.leads (intent_main);

-- RLS (opcional, recomendado luego):
-- alter table public.leads enable row level security;
--
-- Ejemplo (NO aplicar ahora):
-- create policy "read_leads_admin" on public.leads
--   for select
--   to authenticated
--   using (auth.jwt() ->> 'role' = 'admin');
