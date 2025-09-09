-- Portfolio Tracker Database Schema

-- Positions table
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

-- Enable Row Level Security
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only see their positions" ON positions;
DROP POLICY IF EXISTS "Users can only see their analyses" ON analyses;

-- Policies for positions
CREATE POLICY "Users can only see their positions" ON positions
  FOR ALL USING (auth.uid() = user_id);

-- Policies for analyses  
CREATE POLICY "Users can only see their analyses" ON analyses
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS positions_user_id_idx ON positions(user_id);
CREATE INDEX IF NOT EXISTS positions_symbol_idx ON positions(symbol);
CREATE INDEX IF NOT EXISTS analyses_user_id_idx ON analyses(user_id);