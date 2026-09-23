# Diretriz para Criação de Tabelas no Supabase (Data API Grants)

A partir de 30 de Outubro de 2026/mudança do Supabase, o Supabase não concede mais permissões automáticas da Data API para novas tabelas no schema `public`.

## Regra Obrigatória
Sempre que criar uma nova tabela no banco de dados (seja via arquivo de migration SQL ou scripts de setup), é **obrigatório** incluir comandos explícitos de `GRANT` para as roles da API após habilitar o RLS:

```sql
-- Exemplo obrigatório em novas tabelas:
CREATE TABLE IF NOT EXISTS public.nome_da_tabela (
    ...
);

ALTER TABLE public.nome_da_tabela ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS necessárias...
CREATE POLICY ...;

-- Permissões explícitas para a API do Supabase (Data API)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nome_da_tabela TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nome_da_tabela TO service_role;

-- Se a tabela precisar de acesso público deslogado (anon):
-- GRANT SELECT ON public.nome_da_tabela TO anon;
```

Essa prática previne erros de `permission denied` nas chamadas via `supabase-js`, PostgREST e em resets de banco locais (`supabase db reset`).
