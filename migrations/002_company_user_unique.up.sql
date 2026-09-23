-- 002_company_user_unique.up.sql

-- Deduplicate: keep the oldest company per user, delete the rest.
DELETE FROM companies a USING companies b
WHERE a.user_id = b.user_id AND a.created_at > b.created_at;

DELETE FROM companies a USING companies b
WHERE a.user_id = b.user_id AND a.id > b.id AND a.created_at = b.created_at;

ALTER TABLE companies ADD CONSTRAINT companies_user_id_key UNIQUE (user_id);
