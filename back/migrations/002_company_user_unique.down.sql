-- 002_company_user_unique.down.sql

ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_user_id_key;
