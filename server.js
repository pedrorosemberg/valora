/**
 * VALORA by METADAX - Server Entry Point
 * Valuation Application for Companies and Personal Equity
 *
 * METADAX TECNOLOGIA E SERVICOS LTDA
 * Technical Responsibility: Pedro Paulo Rosemberg da Silva Oliveira (CRA-SP 6-009145)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const routers = require('./routers');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Resilient File Checking Middleware (404 Catcher)
app.use((req, res, next) => {
  // Ignora APIs e rotas de página conhecidas
  if (req.path.startsWith('/api') || ['/', '/docs', '/status'].includes(req.path)) {
    return next();
  }
  
  // Verifica se o arquivo físico solicitado existe na pasta public
  const publicPath = path.join(__dirname, 'public', req.path);
  if (!fs.existsSync(publicPath)) {
    return res.status(404).sendFile(path.join(__dirname, 'error_page.html'));
  }
  
  next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', routers);

// Main routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'docs.html'));
});

app.get('/status', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'status.html'));
});

// Error handling
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'error_page.html'));
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server (for local development)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`VALORA server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;