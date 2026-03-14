/**
 * VALORA by MTDX - External APIs Handler
 * Proxy for BrasilAPI, ViaCEP, MTDX Internal APIs, and AXIO API
 *
 * Environment Variables (configure in Vercel Dashboard):
 * - UPSTASH_REDIS_REST_URL: Redis URL for caching (optional)
 * - UPSTASH_REDIS_REST_TOKEN: Redis token (optional)
 */

const express = require('express');
const router = express.Router();

// Cache for API responses (simple in-memory cache with TTL)
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hour
const AXIO_CACHE_TTL = 86400000; // 24 hours for AXIO data (changes less frequently)

/**
 * Fetch with cache - improved error handling and retries
 */
async function fetchWithCache(url, key, options = {}) {
  const cacheKey = key || url;
  const ttl = options.ttl || CACHE_TTL;
  const retries = options.retries || 2;

  // Check cache
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const defaultHeaders = {
        'User-Agent': 'ValoraApp/1.0',
        'Accept': 'application/json'
      };
      
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: { ...defaultHeaders, ...options.headers },
        body: options.body || undefined
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Failed to fetch data');
}

/**
 * BrasilAPI - CNPJ Data
 * GET /api/v1/useapis/cnpj/:cnpj
 */
router.get('/cnpj/:cnpj', async (req, res) => {
  try {
    const { cnpj } = req.params;

    // Validate CNPJ format (14 digits)
    const cnpjClean = cnpj.replace(/\D/g, '');
    if (cnpjClean.length !== 14) {
      return res.status(400).json({
        error: 'Invalid CNPJ',
        message: 'CNPJ must contain 14 digits'
      });
    }

    const data = await fetchWithCache(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpjClean}`,
      `cnpj:${cnpjClean}`
    );

    res.json({
      success: true,
      source: 'BrasilAPI',
      data: {
        cnpj: data.cnpj,
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia,
        situacao_cadastral: data.situacao_cadastral,
        data_situacao_cadastral: data.data_situacao_cadastral,
        tipo: data.tipo,
        porte: data.porte,
        natureza_juridica: data.natureza_juridica,
        atividade_principal: data.atividade_principal,
        atividades_secundarias: data.atividades_secundarias,
        qsa: data.qsa, // Quadro de Sócios e Administradores
        endereco: {
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cep: data.cep,
          municipio: data.municipio,
          uf: data.uf
        },
        abertura: data.abertura,
        capital_social: data.capital_social
      }
    });
  } catch (error) {
    console.error('CNPJ API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch CNPJ data',
      message: error.message
    });
  }
});

/**
 * ViaCEP - Address Validation
 * GET /api/v1/useapis/cep/:cep
 */
router.get('/cep/:cep', async (req, res) => {
  try {
    const { cep } = req.params;

    // Validate CEP format (8 digits)
    const cepClean = cep.replace(/\D/g, '');
    if (cepClean.length !== 8) {
      return res.status(400).json({
        error: 'Invalid CEP',
        message: 'CEP must contain 8 digits'
      });
    }

    const data = await fetchWithCache(
      `https://viacep.com.br/ws/${cepClean}/json/`,
      `cep:${cepClean}`
    );

    if (data.erro) {
      return res.status(404).json({
        success: false,
        error: 'CEP not found'
      });
    }

    res.json({
      success: true,
      source: 'ViaCEP',
      data: {
        cep: data.cep,
        logradouro: data.logradouro,
        complemento: data.complemento,
        bairro: data.bairro,
        localidade: data.municipio || data.localidade,
        uf: data.uf,
        ibge: data.ibge,
        gia: data.gia,
        ddd: data.ddd,
        siafi: data.siafi
      }
    });
  } catch (error) {
    console.error('CEP API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch CEP data',
      message: error.message
    });
  }
});

/**
 * MTDX RFN API - Rating Data
 * GET /api/v1/useapis/rfn/:cnpj
 */
router.get('/rfn/:cnpj', async (req, res) => {
  try {
    const { cnpj } = req.params;

    // Validate CNPJ format
    const cnpjClean = cnpj.replace(/\D/g, '');
    if (cnpjClean.length !== 14) {
      return res.status(400).json({
        error: 'Invalid CNPJ',
        message: 'CNPJ must contain 14 digits'
      });
    }

    const data = await fetchWithCache(
      `https://rfn.metadax.com.br/api/data?cnpj=${cnpjClean}`,
      `rfn:${cnpjClean}`
    );

    res.json({
      success: true,
      source: 'MTDX RFN',
      data: data
    });
  } catch (error) {
    console.error('RFN API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch RFN data',
      message: error.message
    });
  }
});

/**
 * AXIO API - Business Data
 * POST /api/v1/useapis/axio/:cnpj
 * Fetches business data from AXIO API (https://axio.metadax.com.br/api/data)
 */
router.post('/axio/:cnpj', async (req, res) => {
  try {
    const { cnpj } = req.params;

    // Validate CNPJ format
    const cnpjClean = cnpj.replace(/\D/g, '');
    if (cnpjClean.length !== 14) {
      return res.status(400).json({
        success: false,
        error: 'Invalid CNPJ',
        message: 'CNPJ must contain 14 digits'
      });
    }

    // Optional: Get additional data from request body for enriched queries
    const requestBody = req.body || {};

    const data = await fetchWithCache(
      `https://axio.metadax.com.br/api/data?cnpj=${cnpjClean}`,
      `axio:${cnpjClean}`,
      {
        ttl: AXIO_CACHE_TTL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined
      }
    );

    res.json({
      success: true,
      source: 'AXIO',
      cnpj: cnpjClean,
      data: data
    });
  } catch (error) {
    console.error('AXIO API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AXIO data',
      message: error.message
    });
  }
});

/**
 * AXIO API - GET version for simpler queries
 * GET /api/v1/useapis/axio/:cnpj
 */
router.get('/axio/:cnpj', async (req, res) => {
  try {
    const { cnpj } = req.params;

    // Validate CNPJ format
    const cnpjClean = cnpj.replace(/\D/g, '');
    if (cnpjClean.length !== 14) {
      return res.status(400).json({
        success: false,
        error: 'Invalid CNPJ',
        message: 'CNPJ must contain 14 digits'
      });
    }

    const data = await fetchWithCache(
      `https://axio.metadax.com.br/api/data?cnpj=${cnpjClean}`,
      `axio:${cnpjClean}`,
      { ttl: AXIO_CACHE_TTL }
    );

    res.json({
      success: true,
      source: 'AXIO',
      cnpj: cnpjClean,
      data: data
    });
  } catch (error) {
    console.error('AXIO API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AXIO data',
      message: error.message
    });
  }
});

/**
 * MTDX System Status
 * GET /api/v1/useapis/status
 */
router.get('/status', async (req, res) => {
  try {
    const systemId = req.query.systemId || 'valora.metadax.com.br';

    const data = await fetchWithCache(
      `https://metadax.com.br/_functions/systemsStatus?systemId=${encodeURIComponent(systemId)}`,
      `status:${systemId}`
    );

    res.json({
      success: true,
      source: 'MTDX System Status',
      data: data
    });
  } catch (error) {
    console.error('System Status API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify system status',
      message: error.message
    });
  }
});

/**
 * MTDX Validate Access
 * POST /api/v1/useapis/validate
 */
router.post('/validate', async (req, res) => {
  try {
    const { userID } = req.body;

    if (!userID) {
      return res.status(400).json({
        error: 'Missing userID',
        message: 'userID is required'
      });
    }

    const data = await fetchWithCache(
      `https://www.metadax.com.br/_functions/validateAccess?userID=${encodeURIComponent(userID)}`,
      `validate:${userID}`
    );

    res.json({
      success: true,
      source: 'MTDX Validate Access',
      data: data
    });
  } catch (error) {
    console.error('Validate Access API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate access',
      message: error.message
    });
  }
});

/**
 * Combined endpoint for initial data load
 * POST /api/v1/useapis/combined
 */
router.post('/combined', async (req, res) => {
  try {
    const { cnpj, cep } = req.body;

    const results = {};

    // Fetch CNPJ data if provided
    if (cnpj) {
      try {
        const cnpjClean = cnpj.replace(/\D/g, '');
        const cnpjData = await fetchWithCache(
          `https://brasilapi.com.br/api/cnpj/v1/${cnpjClean}`,
          `cnpj:${cnpjClean}`
        );
        results.cnpj = {
          success: true,
          source: 'BrasilAPI',
          data: cnpjData
        };

        // Also fetch RFN rating
        try {
          const rfnData = await fetchWithCache(
            `https://rfn.metadax.com.br/api/data?cnpj=${cnpjClean}`,
            `rfn:${cnpjClean}`
          );
          results.rfn = {
            success: true,
            source: 'MTDX RFN',
            data: rfnData
          };
        } catch (e) {
          results.rfn = { success: false, error: e.message };
        }
      } catch (e) {
        results.cnpj = { success: false, error: e.message };
      }
    }

    // Fetch CEP data if provided
    if (cep) {
      try {
        const cepClean = cep.replace(/\D/g, '');
        const cepData = await fetchWithCache(
          `https://viacep.com.br/ws/${cepClean}/json/`,
          `cep:${cepClean}`
        );
        results.cep = {
          success: true,
          source: 'ViaCEP',
          data: cepData
        };
      } catch (e) {
        results.cep = { success: false, error: e.message };
      }
    }

    res.json({
      success: true,
      results: results
    });
  } catch (error) {
    console.error('Combined API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch combined data',
      message: error.message
    });
  }
});

module.exports = router;