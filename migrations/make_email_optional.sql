-- Migration: Make email column optional in users table
-- This removes the NOT NULL constraint from the email column

ALTER TABLE users 
ALTER COLUMN email DROP NOT NULL;

-- Verify the change
-- SELECT column_name, is_nullable, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'email';
