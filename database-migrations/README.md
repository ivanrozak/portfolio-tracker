# Database Migrations

This directory contains database migration scripts for the Portfolio Tracker application.

## Migration Scripts

### 001-deprecate-positions-table.sql

**Purpose**: Adds constraints to prevent new inserts into the deprecated `positions` table.

**What it does**:
- Adds a comment to the `positions` table indicating it's deprecated
- Creates a trigger function that prevents new INSERT operations
- Allows existing operations (SELECT, UPDATE, DELETE) for data migration and cleanup

**How to apply**:

1. Open your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `001-deprecate-positions-table.sql`
4. Run the query

Alternatively, if you have direct database access:
```bash
psql "your-connection-string" < database-migrations/001-deprecate-positions-table.sql
```

## Data Migration

Before applying the deprecation constraint, you should migrate existing data from the `positions` table to the `transactions` table.

### Running the Migration Script

The migration script is located at `scripts/migrate-positions-to-transactions.ts`.

**Prerequisites**:
- Ensure your `.env` file contains valid Supabase credentials:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

**To run the migration**:
```bash
npm run migrate:positions
```

This script will:
1. Fetch all records from the `positions` table
2. Convert each position to a "buy" transaction
3. Insert them into the `transactions` table
4. Provide a summary of the migration

**Important Notes**:
- The script is idempotent - you can run it multiple times safely
- Each migrated transaction will have a note indicating it was migrated from the positions table
- The script does NOT delete data from the positions table
- After successful migration and verification, you can apply the deprecation constraint

## Migration Checklist

- [ ] 1. Backup your database
- [ ] 2. Run the data migration script: `npm run migrate:positions`
- [ ] 3. Verify data in Current view mode matches your expectations
- [ ] 4. Check all view modes (Current, Aggregated, History) show data correctly
- [ ] 5. Apply the deprecation constraint: `001-deprecate-positions-table.sql`
- [ ] 6. Test that new transactions still work via the TransactionForm
- [ ] 7. Verify that direct inserts to positions table are blocked (expected behavior)

## Rollback

If you need to rollback the deprecation constraint:

```sql
-- Remove the trigger
DROP TRIGGER IF EXISTS prevent_positions_insert_trigger ON positions;

-- Remove the function
DROP FUNCTION IF EXISTS prevent_positions_insert();

-- Remove the comment
COMMENT ON TABLE positions IS NULL;
```

Note: This only removes the constraint. Data migration is a separate concern and may require manual cleanup if needed to rollback.
