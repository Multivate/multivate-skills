-- Run once on production Postgres if the API has not redeployed yet (Render → Shell or psql).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT TRUE;
