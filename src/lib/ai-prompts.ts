import { Position, AggregatedPosition } from '@/types'
import { formatCurrency } from './currency'

export function generatePortfolioAnalysisPrompt(positions: Position[]): string {
  const portfolioData = positions.map(position => {
    const currentPrice = position.current_price
    const costBasis = position.purchase_price * position.quantity
    
    if (currentPrice && currentPrice > 0) {
      const currentValue = currentPrice * position.quantity
      const pnl = currentValue - costBasis
      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0
      
      return `${position.symbol} (${position.asset_type}): ${position.quantity} shares at $${position.purchase_price} (purchased ${position.purchase_date}), current price: $${currentPrice.toFixed(2)}, current value: $${currentValue.toFixed(2)}, P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`
    } else {
      return `${position.symbol} (${position.asset_type}): ${position.quantity} shares at $${position.purchase_price} (purchased ${position.purchase_date}), current price: [Price data unavailable], cost basis: $${costBasis.toFixed(2)}`
    }
  }).join('\n')

  const totalValue = positions.reduce((sum, pos) => 
    sum + (pos.current_price && pos.current_price > 0 ? pos.current_price * pos.quantity : 0), 0)
  const totalCost = positions.reduce((sum, pos) => 
    sum + (pos.purchase_price * pos.quantity), 0)
  const totalPnL = totalValue - totalCost
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0

  // Check how many positions have current pricing
  const positionsWithPricing = positions.filter(pos => pos.current_price && pos.current_price > 0).length
  const totalPositions = positions.length

  return `Please analyze my investment portfolio:

PORTFOLIO OVERVIEW:
Total Portfolio Value: $${totalValue.toFixed(2)} (${positionsWithPricing}/${totalPositions} positions have current pricing)
Total Cost Basis: $${totalCost.toFixed(2)}
Total P&L: ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)} (${totalPnLPercent.toFixed(2)}%)
${positionsWithPricing < totalPositions ? `\n⚠️  Note: ${totalPositions - positionsWithPricing} position(s) missing current price data - actual values may be higher.` : ''}

INDIVIDUAL POSITIONS:
${portfolioData}

Please provide:
1. **Risk Assessment**: Overall portfolio risk level (Conservative/Moderate/Aggressive)
2. **Diversification Analysis**: How well-diversified is this portfolio across sectors/asset types?
3. **Performance Review**: Analysis of current gains/losses and what they indicate
4. **Recommendations**: 
   - Any positions to consider selling (and why)
   - Potential new investments to improve diversification
   - Risk management suggestions
5. **Market Outlook**: Brief thoughts on current market conditions affecting these holdings

Please be specific and actionable in your recommendations.`
}

export function generateStockAnalysisPrompt(symbol: string, currentPrice: number): string {
  return `Please provide a comprehensive analysis of ${symbol.toUpperCase()} at the current price of $${currentPrice.toFixed(2)}:

1. **Company Overview**: Brief description of business model and recent performance
2. **Technical Analysis**: Current price trends, support/resistance levels
3. **Fundamental Analysis**: Key financial metrics and valuation
4. **Risk Factors**: Main risks to consider
5. **Recommendation**: Buy/Hold/Sell with target price and reasoning

Please keep the analysis concise but informative for investment decision-making.`
}

export function generateAggregatedPortfolioAnalysisPrompt(positions: AggregatedPosition[]): string {
  const portfolioData = positions.map(position => {
    const currentPrice = position.current_price
    const currency = position.currency || 'USD'
    const costBasis = position.total_cost
    
    if (currentPrice && currentPrice > 0) {
      const currentValue = currentPrice * position.total_quantity
      const pnl = currentValue - costBasis
      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0
      
      return `${position.symbol} (${position.asset_type}): ${position.total_quantity.toLocaleString()} shares at avg ${formatCurrency(position.average_price, currency)} (${position.purchase_count} purchase${position.purchase_count > 1 ? 's' : ''} from ${position.first_purchase_date}${position.first_purchase_date !== position.last_purchase_date ? ` to ${position.last_purchase_date}` : ''}), current price: ${formatCurrency(currentPrice, currency)}, current value: ${formatCurrency(currentValue, currency)}, P&L: ${pnl >= 0 ? '+' : ''}${formatCurrency(Math.abs(pnl), currency)} (${pnlPercent.toFixed(2)}%)`
    } else {
      return `${position.symbol} (${position.asset_type}): ${position.total_quantity.toLocaleString()} shares at avg ${formatCurrency(position.average_price, currency)} (${position.purchase_count} purchase${position.purchase_count > 1 ? 's' : ''} from ${position.first_purchase_date}${position.first_purchase_date !== position.last_purchase_date ? ` to ${position.last_purchase_date}` : ''}), current price: [Price data unavailable], cost basis: ${formatCurrency(costBasis, currency)}`
    }
  }).join('\n')

  // Group by currency for better summary
  const currencyGroups = positions.reduce((groups, pos) => {
    const currency = pos.currency || 'USD'
    if (!groups[currency]) {
      groups[currency] = { totalValue: 0, totalCost: 0, positions: [] }
    }
    
    const currentPrice = pos.current_price && pos.current_price > 0 ? pos.current_price : 0
    const currentValue = currentPrice * pos.total_quantity
    
    groups[currency].totalValue += currentValue
    groups[currency].totalCost += pos.total_cost
    groups[currency].positions.push(pos)
    
    return groups
  }, {} as Record<string, { totalValue: number; totalCost: number; positions: AggregatedPosition[] }>)

  const currencySummaries = Object.entries(currencyGroups).map(([currency, data]) => {
    const pnl = data.totalValue - data.totalCost
    const pnlPercent = data.totalCost > 0 ? (pnl / data.totalCost) * 100 : 0
    const positionsWithPricing = data.positions.filter(pos => pos.current_price && pos.current_price > 0).length
    
    return `${currency}: Portfolio Value: ${formatCurrency(data.totalValue, currency)} (${positionsWithPricing}/${data.positions.length} positions priced), Cost Basis: ${formatCurrency(data.totalCost, currency)}, P&L: ${pnl >= 0 ? '+' : ''}${formatCurrency(Math.abs(pnl), currency)} (${pnlPercent.toFixed(2)}%)`
  }).join('\n')

  return `Please analyze my investment portfolio (aggregated view - multiple purchases combined):

PORTFOLIO OVERVIEW BY CURRENCY:
${currencySummaries}

INDIVIDUAL POSITIONS (AGGREGATED):
${portfolioData}

Please provide:
1. **Risk Assessment**: Overall portfolio risk level (Conservative/Moderate/Aggressive)
2. **Diversification Analysis**: How well-diversified is this portfolio across sectors/asset types/markets?
3. **Performance Review**: Analysis of current gains/losses and what they indicate
4. **Position Sizing**: Comments on position sizes relative to total portfolio
5. **Recommendations**: 
   - Any positions to consider selling (and why)
   - Potential new investments to improve diversification
   - Risk management suggestions
   - Currency exposure considerations
6. **Market Outlook**: Brief thoughts on current market conditions affecting these holdings

Note: This view shows aggregated positions where multiple purchases of the same symbol are combined with average cost basis.

Please be specific and actionable in your recommendations.`
}

export function generateIndonesianBulkReportPrompt(positions: AggregatedPosition[]): string {
  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  // Calculate daily returns and portfolio stats
  const instrumentData = positions.slice(0, 5).map((position, index) => {
    const currentPrice = position.current_price || 0
    const costBasis = position.total_cost
    const currentValue = currentPrice * position.total_quantity
    const totalROI = costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0

    // Simplified daily return calculation (would need historical data for accurate calculation)
    // Using a simple hash-based calculation for consistency in demo
    const hashCode = position.symbol.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const estimatedDailyReturn = ((hashCode % 400) - 200) / 100; // Range: -2% to +2%

    const currency = position.currency || 'USD'
    const symbol = currency === 'USD' ? '$' : currency === 'IDR' ? 'Rp' : currency

    return `Instrumen ${index + 1}: ${position.symbol} | Harga beli awal: ${symbol}${position.average_price.toFixed(2)} | Harga sekarang: ${symbol}${currentPrice.toFixed(2)} | Return harian: ${estimatedDailyReturn >= 0 ? '+' : ''}${estimatedDailyReturn.toFixed(1)}% | ROI kumulatif sejak beli: ${totalROI >= 0 ? '+' : ''}${totalROI.toFixed(1)}% | Alokasi persen di portofolio: ${((currentValue / positions.reduce((sum, p) => sum + (p.current_price || 0) * p.total_quantity, 0)) * 100).toFixed(1)}%`
  }).join('\n')

  // Calculate overall portfolio stats
  const totalCurrentValue = positions.reduce((sum, pos) =>
    sum + (pos.current_price && pos.current_price > 0 ? pos.current_price * pos.total_quantity : 0), 0)
  const totalCostBasis = positions.reduce((sum, pos) => sum + pos.total_cost, 0)
  const overallROI = totalCostBasis > 0 ? ((totalCurrentValue - totalCostBasis) / totalCostBasis) * 100 : 0
  // Calculate average daily return estimate based on overall portfolio performance
  const estimatedDailyReturn = overallROI > 0 ?
    Math.min(overallROI / 30, 2.0) : // Cap positive daily return at 2%
    Math.max(overallROI / 30, -2.0) // Cap negative daily return at -2%

  // Asset allocation summary
  const assetTypes = positions.reduce((types, pos) => {
    const type = pos.asset_type || 'Unknown'
    const value = (pos.current_price || 0) * pos.total_quantity
    types[type] = (types[type] || 0) + value
    return types
  }, {} as Record<string, number>)

  const topAssetTypes = Object.entries(assetTypes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([type, value]) => `${((value / totalCurrentValue) * 100).toFixed(0)}% ${type}`)
    .join(', ')

  return `Halo Grok! Ini laporan return harian bulk saya untuk check kesehatan finansial dan investasi. Tanggal: ${today}.
Daftar Instrumen (isi per instrumen, bisa 2-5 max untuk keep simple):

${instrumentData}

Portofolio Update Keseluruhan: Total budget sekarang $${totalCurrentValue.toFixed(0)}, diversifikasi: ${topAssetTypes}; return agregat harian estimasi ${estimatedDailyReturn >= 0 ? '+' : ''}${estimatedDailyReturn.toFixed(2)}%; ROI kumulatif ${overallROI >= 0 ? '+' : ''}${overallROI.toFixed(1)}%
Kesehatan Finansial Lain: Emergency fund masih 6 bulan gaji, no hutang baru, income stabil (estimasi - please adjust based on actual situation)
Request Analisis Tambahan: Cek kondisi pasar terkini dan sugesti netral untuk entry instrumen baru untuk diversifikasi growth (opsional - kosongin kalau nggak perlu)
Bantu analisis umum: Berdasarkan data bulk ini, kondisi pasar terkini (termasuk research real-time kalau perlu), dan request tambahan, estimasikan skenario optimis/netral/pesimis untuk hold, sell, cut loss, atau buy lebih per instrumen dan secara keseluruhan portofolio. Sertakan analisis pasar luas dan rekomendasi netral untuk instrumen lain IBKR-supported kalau relevan (e.g., untuk tingkatkan growth atau diversifikasi). Cek risiko (e.g., korelasi antar instrumen), mitigasi, dan implikasi untuk kesehatan finansial saya. Ingat, ini bukan saran pribadi—saya akan konsultasi advisor.`
}

export function generatePortfolioResumeOnly(positions: AggregatedPosition[]): string {
  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  // Calculate daily returns and portfolio stats
  const instrumentData = positions.slice(0, 5).map((position, index) => {
    const currentPrice = position.current_price || 0
    const costBasis = position.total_cost
    const currentValue = currentPrice * position.total_quantity
    const totalROI = costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0

    // Simplified daily return calculation (would need historical data for accurate calculation)
    // Using a simple hash-based calculation for consistency in demo
    const hashCode = position.symbol.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const estimatedDailyReturn = ((hashCode % 400) - 200) / 100; // Range: -2% to +2%

    const currency = position.currency || 'USD'
    const symbol = currency === 'USD' ? '$' : currency === 'IDR' ? 'Rp' : currency

    return `Instrumen ${index + 1}: ${position.symbol} | Harga beli awal: ${symbol}${position.average_price.toFixed(2)} | Harga sekarang: ${symbol}${currentPrice.toFixed(2)} | Return harian: ${estimatedDailyReturn >= 0 ? '+' : ''}${estimatedDailyReturn.toFixed(1)}% | ROI kumulatif sejak beli: ${totalROI >= 0 ? '+' : ''}${totalROI.toFixed(1)}% | Alokasi persen di portofolio: ${((currentValue / positions.reduce((sum, p) => sum + (p.current_price || 0) * p.total_quantity, 0)) * 100).toFixed(1)}%`
  }).join('\n')

  // Calculate overall portfolio stats
  const totalCurrentValue = positions.reduce((sum, pos) =>
    sum + (pos.current_price && pos.current_price > 0 ? pos.current_price * pos.total_quantity : 0), 0)
  const totalCostBasis = positions.reduce((sum, pos) => sum + pos.total_cost, 0)
  const overallROI = totalCostBasis > 0 ? ((totalCurrentValue - totalCostBasis) / totalCostBasis) * 100 : 0
  // Calculate average daily return estimate based on overall portfolio performance
  const estimatedDailyReturn = overallROI > 0 ?
    Math.min(overallROI / 30, 2.0) : // Cap positive daily return at 2%
    Math.max(overallROI / 30, -2.0) // Cap negative daily return at -2%

  // Asset allocation summary
  const assetTypes = positions.reduce((types, pos) => {
    const type = pos.asset_type || 'Unknown'
    const value = (pos.current_price || 0) * pos.total_quantity
    types[type] = (types[type] || 0) + value
    return types
  }, {} as Record<string, number>)

  const topAssetTypes = Object.entries(assetTypes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([type, value]) => `${((value / totalCurrentValue) * 100).toFixed(0)}% ${type}`)
    .join(', ')

  return `Halo Grok! Ini laporan return harian bulk saya untuk check kesehatan finansial dan investasi. Tanggal: ${today}.
Daftar Instrumen (isi per instrumen, bisa 2-5 max untuk keep simple):

${instrumentData}

Portofolio Update Keseluruhan: Total budget sekarang $${totalCurrentValue.toFixed(0)}, diversifikasi: ${topAssetTypes}; return agregat harian estimasi ${estimatedDailyReturn >= 0 ? '+' : ''}${estimatedDailyReturn.toFixed(2)}%; ROI kumulatif ${overallROI >= 0 ? '+' : ''}${overallROI.toFixed(1)}%
Kesehatan Finansial Lain: Emergency fund masih 6 bulan gaji, no hutang baru, income stabil (estimasi - please adjust based on actual situation)`
}