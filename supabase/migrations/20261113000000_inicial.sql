-- Sabor & Lucro — estrutura inicial
-- Cada usuário só enxerga e altera os próprios dados (Row Level Security).

create table if not exists public.negocios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade default auth.uid(),
  nome text not null,
  mao_obra_pct numeric not null default 30,
  gas_pct numeric not null default 5,
  luz_pct numeric not null default 3,
  agua_pct numeric not null default 2,
  embalagem_pct numeric not null default 10,
  markup_padrao numeric not null default 2.5,
  created_at timestamptz not null default now()
);

create table if not exists public.insumos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nome text not null,
  preco numeric not null default 0,
  quantidade numeric not null default 1,
  unidade text not null default 'un' check (unidade in ('g','kg','ml','L','un')),
  created_at timestamptz not null default now()
);

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nome text not null,
  rendimento integer not null default 1 check (rendimento > 0),
  tipo_porcao text not null default 'fatias',
  markup numeric not null default 2.5,
  embalagem_unit numeric not null default 0,
  ingredientes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.vendas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  produto_id uuid references public.produtos(id) on delete set null,
  produto_nome text not null,
  tipo text not null check (tipo in ('inteiro','porcao')),
  quantidade integer not null default 1 check (quantidade > 0),
  preco_unit numeric not null,
  custo_unit numeric not null default 0,
  data date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists insumos_user_idx on public.insumos(user_id);
create index if not exists produtos_user_idx on public.produtos(user_id);
create index if not exists vendas_user_data_idx on public.vendas(user_id, data desc);

alter table public.negocios enable row level security;
alter table public.insumos  enable row level security;
alter table public.produtos enable row level security;
alter table public.vendas   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['negocios','insumos','produtos','vendas'] loop
    execute format('drop policy if exists "dono_%1$s" on public.%1$I', t);
    execute format(
      'create policy "dono_%1$s" on public.%1$I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
