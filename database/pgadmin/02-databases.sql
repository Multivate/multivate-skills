-- Step 2 of 2: create databases (requires role from 01-role.sql).
-- Run each statement separately in pgAdmin if you get "cannot run inside a transaction block".
-- SQLSTATE 42P04 "already exists" → skip that line.

CREATE DATABASE multivate
    OWNER = multivate
    ENCODING = 'UTF8'
    TEMPLATE = template0;

CREATE DATABASE multivate_test
    OWNER = multivate
    ENCODING = 'UTF8'
    TEMPLATE = template0;
