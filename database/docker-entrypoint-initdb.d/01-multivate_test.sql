-- Docker only: user "multivate" already exists (see docker-compose POSTGRES_USER).
-- Second database for backend pytest. Do not paste this alone into pgAdmin;
-- Manual install: database/pgadmin/01-role.sql then 02-databases.sql (or database/manual-init.sql via psql).
CREATE DATABASE multivate_test OWNER multivate;
