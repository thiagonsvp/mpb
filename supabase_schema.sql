-- ================================================
-- PELADA APP — Schema Supabase
-- Execute no SQL Editor do seu projeto Supabase
-- ================================================

-- Jogadores
create table if not exists jogadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  rating int not null check (rating between 1 and 10),
  posicao text,
  telefone text,
  tipo text default 'mensalista' check (tipo in ('mensalista','diarista')),
  ativo boolean default true,
  created_at timestamptz default now()
);

-- Sorteios
create table if not exists sorteios (
  id uuid primary key default gen_random_uuid(),
  data date default current_date,
  modo text default 'equilibrado',
  times jsonb not null,
  created_at timestamptz default now()
);

-- Mensalidades
create table if not exists mensalidades (
  id uuid primary key default gen_random_uuid(),
  jogador_id uuid references jogadores(id) on delete cascade,
  mes text not null,           -- formato: '2026-03'
  valor numeric(10,2) not null,
  status text default 'pendente' check (status in ('pendente','pago','atrasado')),
  data_pagamento date,
  created_at timestamptz default now(),
  unique(jogador_id, mes)
);

-- Transações financeiras
create table if not exists transacoes (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  valor numeric(10,2) not null,
  tipo text not null check (tipo in ('receita','despesa')),
  categoria text,
  data date default current_date,
  mensalidade_id uuid references mensalidades(id) on delete cascade,
  created_at timestamptz default now()
);

-- Gatilho para excluir mensalidade ao excluir transação (sincronização total)
CREATE OR REPLACE FUNCTION public.handle_delete_transacao()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.mensalidade_id IS NOT NULL THEN
    DELETE FROM public.mensalidades WHERE id = OLD.mensalidade_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_delete_transacao ON public.transacoes;
CREATE TRIGGER tr_delete_transacao
AFTER DELETE ON public.transacoes
FOR EACH ROW
EXECUTE FUNCTION public.handle_delete_transacao();

-- Resenhas Pós-Jogo
create table if not exists resenhas (
  id uuid primary key default gen_random_uuid(),
  comprador text not null,
  valor numeric(10,2) not null,
  pix text,
  data date default current_date,
  participantes jsonb not null,
  created_at timestamptz default now()
);

-- RLS (Row Level Security) — desabilitado para uso simples sem auth
-- Se quiser adicionar autenticação, habilite aqui:
-- alter table jogadores enable row level security;
-- alter table mensalidades enable row level security;
-- alter table transacoes enable row level security;
