-- =============================================================================
-- Multivate — PostgreSQL bootstrap (all-in-one or psql orchestration)
-- =============================================================================
--
-- pgAdmin (recommended): open and run, in order, as superuser on database postgres:
--   database/pgadmin/01-role.sql
--   database/pgadmin/02-databases.sql
-- Optional if you hit public-schema errors (PG 15+), on each DB as superuser:
--   database/pgadmin/03-grant-public.sql
--
-- psql (from repo root "multivate-edtech", paths below assume that cwd):
--   psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f database/manual-init.sql
--
-- backend/.env:
--   DATABASE_URL=postgresql://multivate:multivate@localhost:5432/multivate
-- =============================================================================

\ir pgadmin/01-role.sql
\ir pgadmin/02-databases.sql
