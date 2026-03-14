/**
 * VALORA by MTDX - API Routers
 * Routes for API endpoints
 */

const express = require('express');
const router = express.Router();

// Import API handlers
const useApisHandler = require('./api/v1/useapis');
const dataHandler = require('./api/v1/data');
const pdfHandler = require('./api/v1/pdf');

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'VALORA by MTDX',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// System status validation
router.get('/v1/status', async (req, res) => {
  try {
    const systemId = req.query.systemId || 'valora.metadax.com.br';

    // Call MTDX systemsStatus API
    const response = await fetch(`https://metadax.com.br/_functions/systemsStatus?systemId=${encodeURIComponent(systemId)}`);
    const data = await response.json();

    res.json({
      status: 'active',
      license: data.license || 'valid',
      validUntil: data.validUntil || null,
      ...data
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Unable to verify system status',
      fallback: true
    });
  }
});

// External APIs proxy
router.use('/v1/useapis', useApisHandler);

// Valuation data calculation
router.use('/v1/data', dataHandler);

// PDF generation
router.use('/v1/pdf', pdfHandler);

module.exports = router;