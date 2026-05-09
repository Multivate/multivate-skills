-- PostgreSQL 15+: if create_all / migrations fail with "permission denied for schema public",
-- run this while connected as a superuser to each application database (multivate, then multivate_test).

GRANT ALL ON SCHEMA public TO multivate;
GRANT CREATE ON SCHEMA public TO multivate;
