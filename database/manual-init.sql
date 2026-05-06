-- One-time setup when you run PostgreSQL yourself (not Docker).
-- Connect as a superuser, for example:
--   psql -U postgres -h localhost -f database/manual-init.sql
--
-- If role or database already exists, you can ignore duplicate-object errors.

CREATE ROLE multivate WITH LOGIN PASSWORD 'multivate';
CREATE DATABASE multivate OWNER multivate;
