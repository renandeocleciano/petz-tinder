# Banco de dados

- Schema em `schema/` (Drizzle). Migrations geradas em `migrations/` com `npm run db:generate` e aplicadas com `npm run db:migrate`.
- Toda tabela usa `.enableRLS()` sem policies: a Data API do Supabase (roles `anon`/`authenticated`) não lê nada. A API conecta como dono das tabelas e não é afetada. Policies só serão criadas quando o app precisar ler direto (Realtime do chat).
- Não aplique DDL pelo dashboard ou pelo MCP: o histórico de schema vive nas migrations do Drizzle.
