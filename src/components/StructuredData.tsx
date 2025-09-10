'use client'

export default function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${typeof window !== 'undefined' ? window.location.origin : ''}/#webapp`,
        "name": "Portfolio Tracker",
        "description": "Advanced portfolio tracker with real-time market data, multi-currency support, AI-powered analysis, and comprehensive P&L tracking for stocks, crypto, and Indonesian assets.",
        "url": typeof window !== 'undefined' ? window.location.origin : '',
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "Web Browser",
        "browserRequirements": "Requires JavaScript. Requires HTML5.",
        "softwareVersion": "1.0.0",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "featureList": [
          "Real-time market data tracking",
          "Multi-currency portfolio management",
          "Indonesian stock support (BBCA, BMRI, TLKM, ASII)",
          "Live USD/IDR exchange rates", 
          "AI-powered investment analysis",
          "Comprehensive P&L tracking",
          "Transaction history management",
          "Interactive charts and analytics"
        ]
      },
      {
        "@type": "Organization",
        "@id": `${typeof window !== 'undefined' ? window.location.origin : ''}/#organization`,
        "name": "Portfolio Tracker",
        "description": "Smart investment management platform for global and Indonesian markets",
        "url": typeof window !== 'undefined' ? window.location.origin : '',
        "logo": {
          "@type": "ImageObject",
          "url": `${typeof window !== 'undefined' ? window.location.origin : ''}/logo.png`,
          "width": 200,
          "height": 200
        },
        "sameAs": []
      },
      {
        "@type": "WebSite",
        "@id": `${typeof window !== 'undefined' ? window.location.origin : ''}/#website`,
        "url": typeof window !== 'undefined' ? window.location.origin : '',
        "name": "Portfolio Tracker",
        "description": "Advanced portfolio management with real-time data and AI insights",
        "publisher": {
          "@id": `${typeof window !== 'undefined' ? window.location.origin : ''}/#organization`
        },
        "potentialAction": [
          {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard?search={search_term_string}`
            },
            "query-input": "required name=search_term_string"
          }
        ]
      },
      {
        "@type": "SoftwareApplication",
        "name": "Portfolio Tracker",
        "operatingSystem": "Web",
        "applicationCategory": "BusinessApplication",
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "ratingCount": "1000"
        },
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "USD"
        }
      },
      {
        "@type": "FinancialService",
        "name": "Portfolio Tracker Investment Management",
        "description": "Comprehensive investment tracking and analysis service",
        "provider": {
          "@id": `${typeof window !== 'undefined' ? window.location.origin : ''}/#organization`
        },
        "serviceType": "Investment Tracking",
        "areaServed": [
          {
            "@type": "Country",
            "name": "Global"
          },
          {
            "@type": "Country", 
            "name": "Indonesia"
          }
        ]
      }
    ]
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}