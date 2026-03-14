# VALORA by METADAX

Valuation Application for Companies and Personal Equity

## About

VALORA is a web application developed by METADAX (METADAX) for calculating company valuations and personal equity scores. It uses multiple valuation methodologies and integrates with external APIs to provide comprehensive analysis.

## Features

- **Multi-Method Valuation**: DCF, EBITDA Multiple, Revenue × Factor, Multiples, Scorecard
- **Personal Equity Calculation**: 8 capital dimensions scoring
- **Three Report Types**: Personal, Business, Complete
- **API Integration**: BrasilAPI (CNPJ) and ViaCEP (Address) with anti-blocking headers, METADAX Internal APIs
- **Real-Time Data Sync**: Silent background POST to AXIO API (`/api/data`) for continuous data enrichment
- **Premium UI/UX**: "Glassmorphism" design with deep dark themes, glowing gold accents, and fluid micro-animations
- **PDF Generation**: Immediate client-side professional reports with METADAX branding via jsPDF

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Backend**: Node.js/Express (serverless on Vercel)
- **Database**: Vercel KV (Redis)
- **Deployment**: Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Deploy to Vercel
vercel
```

## API Endpoints

- `GET /api/v1/useapis` - External API proxy (BrasilAPI, ViaCEP)
- `POST /api/v1/data` - Valuation calculation
- `POST /api/v1/pdf` - PDF generation

## License

ISC - METADAX TECNOLOGIA E SERVICOS LTDA

## Technical Responsibility

Pedro Paulo Rosemberg da Silva Oliveira (CRA-SP 6-009145)