-- Compras: cada nota/recibo lido (ou lançado à mão), com data, local, itens e total.
-- Serve para o app mostrar quanto foi gasto por dia e por mês.

create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  data date not null default current_date,
  local text not null default '',
  total numeric not null default 0,
  itens jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists compras_user_data_idx on public.compras(user_id, data desc);

alter table public.compras enable row level security;

drop policy if exists "dono_compras" on public.compras;
create policy "dono_compras" on public.compras for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
