-- Run in Render → Postgres (multivate_app_db) → Connect → SQL if login still returns 500.
-- Safe to run more than once.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT TRUE;
