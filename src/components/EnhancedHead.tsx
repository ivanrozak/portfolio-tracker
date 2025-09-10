'use client'

import Head from 'next/head'

interface EnhancedHeadProps {
  title?: string
  description?: string
  keywords?: string
  canonical?: string
}

export default function EnhancedHead({ 
  title,
  description,
  keywords,
  canonical 
}: EnhancedHeadProps) {
  const defaultTitle = "Portfolio Tracker - Smart Investment Management"
  const defaultDescription = "Advanced portfolio tracker with real-time market data, multi-currency support, AI-powered analysis, and comprehensive P&L tracking."
  const defaultKeywords = "portfolio tracker, investment management, stock tracker, crypto tracker, Indonesian stocks, IDR USD conversion"

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title || defaultTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      <meta name="keywords" content={keywords || defaultKeywords} />
      <meta name="author" content="Portfolio Tracker Team" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      
      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}
      
      {/* Theme and Color */}
      <meta name="theme-color" content="#3B82F6" />
      <meta name="msapplication-TileColor" content="#3B82F6" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      
      {/* Apple Meta Tags */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="Portfolio Tracker" />
      <meta name="apple-touch-fullscreen" content="yes" />
      
      {/* Microsoft Meta Tags */}
      <meta name="msapplication-starturl" content="/" />
      <meta name="msapplication-tooltip" content="Portfolio Tracker - Investment Management" />
      <meta name="msapplication-task" content="name=Dashboard;action-uri=/dashboard;icon-uri=/favicon.ico" />
      
      {/* Security Headers */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-Frame-Options" content="DENY" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
      
      {/* Performance Hints */}
      <link rel="dns-prefetch" href="//api.exchangerate-api.com" />
      <link rel="dns-prefetch" href="//query1.finance.yahoo.com" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* Favicons */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/manifest.json" />
      
      {/* Open Graph Tags */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Portfolio Tracker" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@portfoliotracker" />
      <meta name="twitter:creator" content="@portfoliotracker" />
      
      {/* Additional SEO Tags */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <meta name="bingbot" content="index, follow" />
      
      {/* Language and Region */}
      <meta httpEquiv="content-language" content="en-US" />
      <meta name="geo.region" content="US" />
      <meta name="geo.placename" content="United States" />
      
      {/* Business Category */}
      <meta name="classification" content="Finance, Investment, Portfolio Management" />
      <meta name="category" content="finance" />
      <meta name="subject" content="Investment Portfolio Management" />
      
      {/* Mobile Optimization */}
      <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="mobile-web-app-status-bar-style" content="black-translucent" />
    </Head>
  )
}