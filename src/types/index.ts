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
}