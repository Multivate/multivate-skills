-- Step 1 of 2: create login role (pgAdmin: run this file alone, as superuser, database postgres).
-- SQLSTATE 42710 "already exists" → role is fine; continue with 02-databases.sql

CREATE ROLE multivate WITH LOGIN PASSWORD 'multivate';
