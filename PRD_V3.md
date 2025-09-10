# Portfolio Tracker - Simplified PRD

## Core Objective
Build a working portfolio tracker for stocks & crypto with basic AI analysis integration using Claude Pro.

## Tech Stack
- **Frontend**: Next.js 14 + shadcn/ui
- **Database**: Supabase PostgreSQL  
- **Auth**: Supabase Auth
- **Charts**: Recharts
- **API**: Yahoo Finance (free)

## MVP Features Only

### 1. Authentication
- Email login/signup via Supabase Auth
- Protected routes

### 2. Portfolio Management  
- Add assets (symbol, quantity, purchase price)
- View current portfolio
- Calculate P&L

### 3. Real-time Data
- Fetch current prices from Yahoo Finance
- Display portfolio value and gains/losses

### 4. AI Analysis
- Generate analysis prompts for Claude Pro
- Copy-to-clipboard functionality
- Save analysis results

### 5. Basic Charts
- Portfolio value chart
- Asset allocation pie chart

## Database Schema (Minimal)

```sql
-- Users (handled by Supabase Auth)

-- Positions table
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  quantity DECIMAL NOT NULL,
  purchase_price DECIMAL NOT NULL,
  purchase_date DATE DEFAULT CURRENT_DATE,
  asset_type VARCHAR(10) CHECK (asset_type IN ('stock', 'crypto')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI Analysis results
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  analysis_type VARCHAR(50),
  prompt_used TEXT,
  result TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can only see their positions" ON positions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their analyses" ON analyses  
  FOR ALL USING (auth.uid() = user_id);
```

## API Endpoints (Essential Only)

```typescript
// /api/positions
GET    - Get user positions
POST   - Add new position  
DELETE - Remove position

// /api/market/prices  
GET    - Get current prices for symbols

// /api/ai/prompt
POST   - Generate analysis prompt
```

## File Structure (Simplified)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── dashboard/page.tsx
│   ├── api/
│   │   ├── positions/route.ts
│   │   ├── market/prices/route.ts
│   │   └── ai/prompt/route.ts
│   └── layout.tsx
├── components/
│   ├── ui/              # shadcn components
│   ├── AddPosition.tsx
│   ├── PositionsList.tsx
│   ├── PortfolioChart.tsx
│   └── AIAnalysis.tsx
├── lib/
│   ├── supabase.ts
│   ├── yahoo-finance.ts
│   └── ai-prompts.ts
└── types/
    └── index.ts
```

## Core Components Design

### 1. Dashboard Layout
```typescript
// app/dashboard/page.tsx
export default function Dashboard() {
  return (
    <div className="container mx-auto p-6">
      <PortfolioSummary />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <PositionsList />
        <PortfolioChart />
      </div>
      <AIAnalysis />
    </div>
  );
}
```

### 2. Add Position Form
```typescript
// components/AddPosition.tsx  
const formSchema = z.object({
  symbol: z.string().min(1),
  quantity: z.number().positive(),
  purchasePrice: z.number().positive(),
  assetType: z.enum(['stock', 'crypto'])
});
```

### 3. AI Analysis Component
```typescript
// components/AIAnalysis.tsx
const generatePrompt = (positions: Position[]) => {
  return `Analyze this portfolio:
${positions.map(p => `${p.symbol}: ${p.quantity} shares at $${p.purchase_price}`).join('\n')}

Provide: Risk level, diversification advice, buy/sell recommendations.`;
};
```

## Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=  
SUPABASE_SERVICE_ROLE_KEY=
```

## Development Priority
1. **Setup** (30 min): Next.js + Supabase + shadcn/ui
2. **Auth** (45 min): Login/signup pages
3. **Database** (30 min): Run SQL schema, test connection
4. **Add Positions** (60 min): Form + API endpoint
5. **Display Data** (45 min): Positions list + current prices
6. **Charts** (45 min): Basic portfolio chart
7. **AI Prompts** (30 min): Generate and copy prompts
8. **Polish** (30 min): Basic styling and responsive

**Total: ~5 hours for working MVP**

## Key Files to Create

### 1. Supabase Client
```typescript
// lib/supabase.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
export const supabase = createClientComponentClient();
```

### 2. Yahoo Finance API
```typescript
// lib/yahoo-finance.ts
export async function getCurrentPrice(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
  // Implementation
}
```

### 3. Types
```typescript  
// types/index.ts
export interface Position {
  id: string;
  symbol: string;
  quantity: number;
  purchase_price: number;
  current_price?: number;
  asset_type: 'stock' | 'crypto';
}
```

## Installation Commands
```bash
npx create-next-app@latest portfolio-tracker --typescript --tailwind --app
cd portfolio-tracker
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input form card table
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install recharts react-hook-form @hookform/resolvers zod
npm install lucide-react
```

## Success Criteria
- ✅ User can login/signup
- ✅ User can add US stocks (AAPL, MSFT) and Indonesian stocks (BBCA, BMRI.JK)
- ✅ User can sell positions (partial or full) with P&L calculation
- ✅ Multiple purchases of same symbol automatically aggregate with average price
- ✅ App shows current portfolio value and P&L in USD (IDR stocks auto-converted)
- ✅ Individual positions show original currency + USD equivalent
- ✅ Transaction history tracks all buy/sell activities
- ✅ Basic chart displays portfolio performance in USD
- ✅ AI analysis prompts generate and copy to clipboard
- ✅ Responsive design works on mobile

**Indonesian Stock Examples**: BBCA.JK, BMRI.JK, TLKM.JK, ASII.JK
**Portfolio Summary**: Always displayed in USD for consistency

**Focus: Get it working first, optimize later.**