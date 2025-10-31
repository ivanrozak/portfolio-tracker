-- Migration: Deprecate positions table
-- This migration adds constraints to prevent new inserts into the deprecated positions table
-- All new data should go into the transactions table instead

-- Add a comment to the table to indicate deprecation
COMMENT ON TABLE positions IS 'DEPRECATED: Use transactions table instead. This table is kept for backward compatibility only. Do not insert new data.';

-- Create a function that prevents new inserts
CREATE OR REPLACE FUNCTION prevent_positions_insert()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'The positions table is deprecated. Please use the transactions table instead. Use the TransactionForm component to add new buy/sell transactions.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that fires before insert
DROP TRIGGER IF EXISTS prevent_positions_insert_trigger ON positions;
CREATE TRIGGER prevent_positions_insert_trigger
  BEFORE INSERT ON positions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_positions_insert();

-- Note: We still allow SELECT, UPDATE, and DELETE for data migration and cleanup
-- This constraint only prevents NEW inserts

-- To apply this migration, run it in your Supabase SQL Editor or via psql
