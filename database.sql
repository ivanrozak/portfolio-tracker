-- Portfolio Tracker Database Schema V3

-- Transactions table (replaces positions - tracks all buy/sell activities)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol VARCHAR(10) NOT NULL,
  transaction_type VARCHAR(4) CHECK (transaction_type IN ('buy', 'sell')),
  quantity DECIMAL NOT NULL,
  price DECIMAL NOT NULL,
  transaction_date DATE DEFAULT CURRENT_DATE,
  asset_type VARCHAR(10) CHECK (asset_type IN ('stock', 'crypto')),
  currency VARCHAR(3) DEFAULT 'USD',
  realized_pnl DECIMAL DEFAULT 0, -- For sell transactions
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Current positions view (calculated from transactions)
CREATE OR REPLACE VIEW current_positions AS
SELECT 
  user_id,
  symbol,
  asset_type,
  currency,
  SUM(CASE WHEN transaction_type = 'buy' THEN quantity ELSE -quantity END) as current_quantity,
  -- Weighted average cost (only for remaining shares)
  CASE 
    WHEN SUM(CASE WHEN transaction_type = 'buy' THEN quantity ELSE -quantity END) > 0 
    THEN SUM(CASE WHEN transaction_type = 'buy' THEN quantity * price ELSE 0 END) / 
         SUM(CASE WHEN transaction_type = 'buy' THEN quantity ELSE 0 END)
    ELSE 0 
  END as average_cost,
  SUM(CASE WHEN transaction_type = 'buy' THEN quantity * price ELSE 0 END) as total_cost_basis,
  MIN(CASE WHEN transaction_type = 'buy' THEN transaction_date END) as first_purchase_date,
  MAX(transaction_date) as last_transaction_date,
  COUNT(*) as transaction_count,
  SUM(CASE WHEN transaction_type = 'sell' THEN realized_pnl ELSE 0 END) as total_realized_pnl
FROM transactions
GROUP BY user_id, symbol, asset_type, currency
HAVING SUM(CASE WHEN transaction_type = 'buy' THEN quantity ELSE -quantity END) > 0;

-- Keep positions table for backward compatibility (but mark as deprecated)
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol VARCHAR(10) NOT NULL,
  quantity DECIMAL NOT NULL,
  purchase_price DECIMAL NOT NULL,
  purchase_date DATE DEFAULT CURRENT_DATE,
  asset_type VARCHAR(10) CHECK (asset_type IN ('stock', 'crypto')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI Analysis results
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50),
  prompt_used TEXT,
  result TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Currency exchange rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  source VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert some default exchange rates (these should be updated via API)
INSERT INTO exchange_rates (from_currency, to_currency, rate, source) 
VALUES 
  ('IDR', 'USD', 0.000066, 'default'), -- Approximately 15,000 IDR = 1 USD
  ('USD', 'IDR', 15000, 'default')
ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only see their transactions" ON transactions;
DROP POLICY IF EXISTS "Users can only see their positions" ON positions;
DROP POLICY IF EXISTS "Users can only see their analyses" ON analyses;
DROP POLICY IF EXISTS "Exchange rates are readable by all authenticated users" ON exchange_rates;

-- Policies for transactions
CREATE POLICY "Users can only see their transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

-- Policies for positions (backward compatibility)
CREATE POLICY "Users can only see their positions" ON positions
  FOR ALL USING (auth.uid() = user_id);

-- Policies for analyses  
CREATE POLICY "Users can only see their analyses" ON analyses
  FOR ALL USING (auth.uid() = user_id);

-- Exchange rates are readable by all authenticated users
CREATE POLICY "Exchange rates are readable by all authenticated users" ON exchange_rates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_symbol_idx ON transactions(symbol);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS positions_user_id_idx ON positions(user_id);
CREATE INDEX IF NOT EXISTS positions_symbol_idx ON positions(symbol);
CREATE INDEX IF NOT EXISTS analyses_user_id_idx ON analyses(user_id);
CREATE INDEX IF NOT EXISTS exchange_rates_currencies_idx ON exchange_rates(from_currency, to_currency);