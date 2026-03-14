# VALORA by MTDX

Valuation Application for Companies and Personal Equity

## About

VALORA is a web application developed by MTDX (METADAX) for calculating company valuations and personal equity scores. It uses multiple valuation methodologies and integrates with external APIs to provide comprehensive analysis.

## Features

- **Multi-Method Valuation**: DCF, EBITDA Multiple, Revenue × Factor, Multiples, Scorecard
- **Personal Equity Calculation**: 8 capital dimensions scoring
- **Three Report Types**: Personal, Business, Complete
- **API Integration**: BrasilAPI (CNPJ), ViaCEP (Address), MTDX Internal APIs
- **PDF Generation**: Professional reports with METADAX branding

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