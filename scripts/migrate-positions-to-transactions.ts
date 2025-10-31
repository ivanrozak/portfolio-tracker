/**
 * Migration Script: Positions to Transactions
 *
 * This script migrates existing data from the deprecated 'positions' table
 * to the new 'transactions' table. Each position is converted to a 'buy' transaction.
 *
 * Usage: npx tsx scripts/migrate-positions-to-transactions.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migratePositionsToTransactions() {
  console.log('🚀 Starting migration: positions → transactions\n');

  try {
    // 1. Check if there are any positions to migrate
    const { data: positions, error: fetchError } = await supabase
      .from('positions')
      .select('*')
      .order('purchase_date', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch positions: ${fetchError.message}`);
    }

    if (!positions || positions.length === 0) {
      console.log('✅ No positions found to migrate. Database is already clean.');
      return;
    }

    console.log(`📊 Found ${positions.length} positions to migrate\n`);

    // 2. Check for existing transactions to avoid duplicates
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('id');

    if (existingTransactions && existingTransactions.length > 0) {
      console.log(`⚠️  Warning: ${existingTransactions.length} transactions already exist.`);
      console.log('   This migration will ADD to existing transactions.\n');
    }

    // 3. Convert positions to transactions
    const transactions = positions.map(position => ({
      user_id: position.user_id,
      symbol: position.symbol,
      transaction_type: 'buy',
      quantity: position.quantity,
      price: position.purchase_price,
      transaction_date: position.purchase_date,
      asset_type: position.asset_type,
      currency: 'USD', // Default currency for old positions
      realized_pnl: 0, // Buy transactions have no realized P&L
      notes: `Migrated from positions table (original ID: ${position.id})`,
      created_at: position.created_at
    }));

    // 4. Insert transactions in batches (Supabase recommends max 1000 per batch)
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('transactions')
        .insert(batch)
        .select();

      if (error) {
        console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error.message);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`✅ Migrated batch ${i / batchSize + 1}: ${batch.length} positions → transactions`);
      }
    }

    // 5. Summary
    console.log('\n📈 Migration Summary:');
    console.log(`   Total positions: ${positions.length}`);
    console.log(`   Successfully migrated: ${successCount}`);
    console.log(`   Failed: ${errorCount}`);

    if (successCount > 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. Verify data in current_positions view');
      console.log('   2. Check that all view modes show consistent data');
      console.log('   3. Once verified, you can deprecate the positions table');
    } else {
      console.log('\n❌ Migration failed. Please check errors above.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed with error:', error);
    process.exit(1);
  }
}

// Run migration
migratePositionsToTransactions();
