export interface Position {
  id: string;
  user_id: string;
  symbol: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  asset_type: 'stock' | 'crypto';
  created_at: string;
  current_price?: number;
}

export interface Analysis {
  id: string;
  user_id: string;
  analysis_type: string;
  prompt_used: string;
  result: string;
  created_at: string;
}

export interface PortfolioSummary {
  total_value: number;
  total_cost: number;
  total_pnl: number;
  total_pnl_percentage: number;
}

export interface MarketPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  symbol: string;
  transaction_type: 'buy' | 'sell';
  quantity: number;
  price: number;
  transaction_date: string;
  asset_type: 'stock' | 'crypto';
  currency: string;
  realized_pnl?: number;
  notes?: string;
  created_at: string;
}

export interface CurrentPosition {
  user_id: string;
  symbol: string;
  asset_type: 'stock' | 'crypto';
  currency: string;
  current_quantity: number;
  average_cost: number;
  total_cost_basis: number;
  first_purchase_date: string;
  last_transaction_date: string;
  transaction_count: number;
  total_realized_pnl: number;
  current_price?: number;
  usd_equivalent?: {
    current_price: number;
    average_cost: number;
    total_cost_basis: number;
    market_value: number;
  };
}

export interface AggregatedPosition {
  symbol: string;
  asset_type: 'stock' | 'crypto';
  total_quantity: number;
  average_price: number;
  total_cost: number;
  first_purchase_date: string;
  last_purchase_date: string;
  purchase_count: number;
  current_price?: number;
  currency?: string;
  total_realized_pnl?: number;
}

export interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  date: string;
  source: string;
  created_at: string;
}