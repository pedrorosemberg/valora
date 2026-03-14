/**
 * VALORA by MTDX - Valuation Calculation Engine
 * Implements multiple valuation methodologies with variable weights
 *
 * METADAX TECNOLOGIA E SERVICOS LTDA
 * Technical Responsibility: Pedro Paulo Rosemberg da Silva Oliveira (CRA-SP 6-009145)
 */

const express = require('express');
const router = express.Router();

// ============================================================================
// VALUATION MODEL WEIGHTS BY COMPANY TYPE
// ============================================================================

const MODEL_WEIGHTS = {
  traditional: {
    dcf: 0.25,
    ebitdaMultiple: 0.30,
    revenueFactor: 0.25,
    multiples: 0.20,
    scorecard: 0.00
  },
  newEconomy: {
    dcf: 0.25,
    ebitdaMultiple: 0.20,
    revenueFactor: 0.30,
    multiples: 0.00,
    scorecard: 0.25
  },
  startup: {
    dcf: 0.10,
    ebitdaMultiple: 0.00,
    revenueFactor: 0.30,
    multiples: 0.20,
    scorecard: 0.40
  },
  personalEquity: {
    dcf: 0.00,
    ebitdaMultiple: 0.00,
    revenueFactor: 0.00,
    multiples: 0.00,
    scorecard: 1.00
  }
};

// ============================================================================
// INDUSTRY MULTIPLES (Base values - to be refined)
// ============================================================================

const INDUSTRY_MULTIPLES = {
  'Tecnologia/SaaS': { revenueMultiple: 5.0, ebitdaMultiple: 15.0 },
  'E-commerce/Marketplace': { revenueMultiple: 2.5, ebitdaMultiple: 10.0 },
  'Indústria tradicional': { revenueMultiple: 1.5, ebitdaMultiple: 8.0 },
  'Serviços financeiros e bancários/fintech': { revenueMultiple: 4.0, ebitdaMultiple: 12.0 },
  'Saúde': { revenueMultiple: 2.0, ebitdaMultiple: 10.0 },
  'Educação': { revenueMultiple: 2.0, ebitdaMultiple: 8.0 },
  'Agronegócio': { revenueMultiple: 1.2, ebitdaMultiple: 6.0 },
  'Foodtech': { revenueMultiple: 3.0, ebitdaMultiple: 12.0 },
  'Serviços B2B Tradicionais': { revenueMultiple: 1.5, ebitdaMultiple: 7.0 },
  'Energia e Sustentabilidade': { revenueMultiple: 2.5, ebitdaMultiple: 10.0 },
  'Varejo físico': { revenueMultiple: 0.8, ebitdaMultiple: 5.0 },
  'Logística e Transporte': { revenueMultiple: 1.5, ebitdaMultiple: 7.0 }
};

// Default for unknown industries
const DEFAULT_MULTIPLES = { revenueMultiple: 2.0, ebitdaMultiple: 8.0 };

// ============================================================================
// SCORE QUESTION MAPPINGS
// ============================================================================

// Each question has 4 options with values 1-4 (Low to High)
const SCORE_BLOCKS = {
  performance: ['P', 'Q', 'R', 'S'],
  market: ['T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA'],
  people: ['BB', 'CC', 'DD', 'EE', 'FF', 'GG'],
  internalCapital: ['HH', 'II', 'JJ', 'KK', 'LL', 'MM', 'NN', 'OO', 'PP', 'QQ', 'RR', 'SS'],
  externalCapital: ['TT', 'UU', 'VV', 'WW', 'XX', 'YY', 'ZZ', 'AAA', 'BBB', 'CCC', 'DDD', 'EEE'],
  resultCapital: ['FFF', 'GGG', 'HHH', 'III', 'JJJ', 'KKK', 'LLL', 'MMM', 'NNN']
};

// Block weights for overall score
const BLOCK_WEIGHTS = {
  performance: 0.15,
  market: 0.20,
  people: 0.15,
  internalCapital: 0.20,
  externalCapital: 0.15,
  resultCapital: 0.15
};

// ============================================================================
// PERSONAL EQUITY DIMENSIONS
// ============================================================================

const PERSONAL_DIMENSIONS = {
  intellectual: ['HH'], // Knowledge relevance
  productive: ['II', 'JJ'], // Knowledge application
  conscience: ['LL', 'MM', 'NN', 'OO', 'PP', 'QQ', 'RR', 'SS'], // Self-management
  reputational: ['TT', 'UU', 'VV', 'WW'], // External perception
  relational: ['XX', 'YY', 'ZZ', 'AAA'], // Relationships
  personalBrand: ['BBB', 'CCC', 'DDD', 'EEE'], // Positioning
  financial: ['FFF', 'GGG'], // Financial results
  audience: ['III', 'JJJ', 'KKK', 'LLL', 'MMM', 'NNN'] // Reach and impact
};

// ============================================================================
// VALUATION METHODS
// ============================================================================

/**
 * DCF (Discounted Cash Flow) Simplified
 * Calculates present value of future cash flows
 */
function calculateDCF(data) {
  const { revenue, ebitda, growthRate } = data;

  if (!revenue || !ebitda) return null;

  // Simplified DCF assumptions
  const discountRate = 0.15; // 15% WACC assumption
  const terminalGrowth = 0.02; // 2% perpetual growth
  const projectionYears = 5;

  // Project cash flows
  const ebitdaMargin = ebitda / revenue;
  const cashFlows = [];

  for (let year = 1; year <= projectionYears; year++) {
    const projectedRevenue = revenue * Math.pow(1 + (growthRate || 0.05), year);
    const projectedEBITDA = projectedRevenue * ebitdaMargin;
    // Assume 80% of EBITDA converts to free cash flow
    cashFlows.push(projectedEBITDA * 0.80);
  }

  // Calculate present value of cash flows
  let pvCashFlows = 0;
  cashFlows.forEach((cf, year) => {
    pvCashFlows += cf / Math.pow(1 + discountRate, year + 1);
  });

  // Terminal value
  const terminalValue = cashFlows[cashFlows.length - 1] * (1 + terminalGrowth) / (discountRate - terminalGrowth);
  const pvTerminalValue = terminalValue / Math.pow(1 + discountRate, projectionYears);

  return {
    value: pvCashFlows + pvTerminalValue,
    method: 'DCF',
    assumptions: {
      discountRate,
      terminalGrowth,
      projectionYears
    }
  };
}

/**
 * EBITDA Multiple Method
 * Enterprise Value = EBITDA × Multiple
 */
function calculateEBITDAMultiple(data) {
  const { ebitda, industry } = data;

  if (!ebitda || ebitda <= 0) return null;

  const multiples = INDUSTRY_MULTIPLES[industry] || DEFAULT_MULTIPLES;
  const multiple = multiples.ebitdaMultiple;

  return {
    value: ebitda * multiple,
    method: 'EBITDA Multiple',
    assumptions: {
      multiple,
      industry
    }
  };
}

/**
 * Revenue × Factor Method
 * Enterprise Value = Revenue × Factor
 */
function calculateRevenueFactor(data) {
  const { revenue, growthRate, industry } = data;

  if (!revenue || revenue <= 0) return null;

  const multiples = INDUSTRY_MULTIPLES[industry] || DEFAULT_MULTIPLES;
  let factor = multiples.revenueMultiple;

  // Adjust factor based on growth rate
  if (growthRate > 0.30) {
    factor *= 1.3; // Premium for high growth
  } else if (growthRate > 0.15) {
    factor *= 1.15;
  } else if (growthRate < 0.05) {
    factor *= 0.85; // Discount for low growth
  }

  return {
    value: revenue * factor,
    method: 'Revenue × Factor',
    assumptions: {
      factor,
      industry,
      growthAdjustment: growthRate
    }
  };
}

/**
 * Multiples Method (Comparable Companies)
 * Uses industry benchmarks
 */
function calculateMultiples(data) {
  const { revenue, ebitda, assets, industry } = data;

  if (!revenue) return null;

  const multiples = INDUSTRY_MULTIPLES[industry] || DEFAULT_MULTIPLES;

  // Weighted average of different approaches
  let value = 0;
  let weight = 0;

  if (ebitda && ebitda > 0) {
    value += ebitda * multiples.ebitdaMultiple * 0.5;
    weight += 0.5;
  }

  value += revenue * multiples.revenueMultiple * 0.5;
  weight += 0.5;

  // Asset adjustment
  if (assets) {
    value += assets * 0.3;
  }

  return {
    value: value / weight + (assets || 0) * 0.2,
    method: 'Multiples',
    assumptions: {
      industryMultiples: multiples
    }
  };
}

/**
 * Scorecard Method (for Startups)
 * Berkus Method variant with score adjustments
 */
function calculateScorecard(data) {
  const {
    tam, // Total Addressable Market
    sam, // Serviceable Addressable Market
    users,
    growthRate,
    funding,
    productStage
  } = data;

  // Base value
  let baseValue = 1000000; // Base startup value

  // Adjustment factors
  const adjustments = {
    idea: -0.50,
    prototype: -0.25,
    mvp: 0,
    growth: 0.25,
    mature: 0.50
  };

  // Score adjustments (0-5 scale for each category)
  let scoreMultiplier = 1;

  // Market Score (TAM/SAM)
  if (tam && sam) {
    const marketScore = Math.min(sam / 10000000, 5); // Max 5 for 10M+ SAM
    scoreMultiplier *= (1 + marketScore * 0.1);
  }

  // Traction Score
  if (users) {
    const userScore = Math.min(Math.log10(users), 3); // Max 3 for 1000+ users
    scoreMultiplier *= (1 + userScore * 0.15);
  }

  // Growth Score
  if (growthRate) {
    const growthScore = Math.min(growthRate / 0.5, 3); // Max 3 for 50%+ growth
    scoreMultiplier *= (1 + growthScore * 0.1);
  }

  // Product Stage
  if (productStage) {
    scoreMultiplier *= (1 + (adjustments[productStage] || 0));
  }

  // Funding adjustment
  if (funding) {
    baseValue += funding * 0.5; // Add 50% of funding to base
  }

  return {
    value: baseValue * scoreMultiplier,
    method: 'Scorecard',
    assumptions: {
      baseValue,
      scoreMultiplier,
      productStage,
      funding
    }
  };
}

// ============================================================================
// SCORE CALCULATION
// ============================================================================

/**
 * Calculate score from form answers
 * Returns score percentage (0-100)
 */
function calculateScore(answers, blockKey) {
  const questions = SCORE_BLOCKS[blockKey];
  if (!questions) return { score: 0, percentage: 0, maxScore: 0, achievedScore: 0 };

  let achievedScore = 0;
  let maxScore = questions.length * 4; // Max 4 points per question

  questions.forEach(q => {
    const answer = answers[q];
    // Answers are 1-4 scale (from the form options)
    achievedScore += answer ? Math.min(answer, 4) : 0;
  });

  const percentage = (achievedScore / maxScore) * 100;

  return {
    score: achievedScore,
    percentage: Math.round(percentage),
    maxScore,
    achievedScore
  };
}

/**
 * Calculate overall score from all blocks
 */
function calculateOverallScore(answers) {
  const blockScores = {};
  let weightedScore = 0;

  Object.keys(SCORE_BLOCKS).forEach(blockKey => {
    const blockResult = calculateScore(answers, blockKey);
    blockScores[blockKey] = blockResult;
    weightedScore += blockResult.percentage * BLOCK_WEIGHTS[blockKey];
  });

  // Convert to A-F rating
  let rating;
  if (weightedScore >= 90) rating = 'A';
  else if (weightedScore >= 75) rating = 'B';
  else if (weightedScore >= 60) rating = 'C';
  else if (weightedScore >= 45) rating = 'D';
  else if (weightedScore >= 30) rating = 'E';
  else rating = 'F';

  return {
    overallScore: Math.round(weightedScore),
    rating,
    blockScores
  };
}

// ============================================================================
// PERSONAL EQUITY CALCULATION
// ============================================================================

/**
 * Calculate Personal Equity score
 */
function calculatePersonalEquity(answers) {
  const dimensionScores = {};
  let totalScore = 0;

  Object.keys(PERSONAL_DIMENSIONS).forEach(dimension => {
    const questions = PERSONAL_DIMENSIONS[dimension];
    let dimensionTotal = 0;

    questions.forEach(q => {
      dimensionTotal += answers[q] ? Math.min(answers[q], 4) : 0;
    });

    const maxScore = questions.length * 4;
    const percentage = (dimensionTotal / maxScore) * 100;

    dimensionScores[dimension] = {
      score: dimensionTotal,
      maxScore,
      percentage: Math.round(percentage)
    };

    totalScore += percentage;
  });

  const overallPercentage = totalScore / Object.keys(PERSONAL_DIMENSIONS).length;

  let rating;
  if (overallPercentage >= 90) rating = 'A';
  else if (overallPercentage >= 75) rating = 'B';
  else if (overallPercentage >= 60) rating = 'C';
  else if (overallPercentage >= 45) rating = 'D';
  else if (overallPercentage >= 30) rating = 'E';
  else rating = 'F';

  return {
    overallScore: Math.round(overallPercentage),
    rating,
    dimensionScores
  };
}

// ============================================================================
// MAIN VALUATION ENDPOINT
// ============================================================================

/**
 * POST /api/v1/data/calculate
 * Main valuation calculation endpoint
 */
router.post('/calculate', async (req, res) => {
  try {
    const formData = req.body;

    // Determine company type
    const companyType = formData.companyType || 'traditional';
    const weights = MODEL_WEIGHTS[companyType] || MODEL_WEIGHTS.traditional;

    // Calculate valuations using different methods
    const valuations = [];
    let totalValue = 0;
    let totalWeight = 0;

    // DCF
    if (weights.dcf > 0) {
      const dcfResult = calculateDCF(formData);
      if (dcfResult) {
        valuations.push(dcfResult);
        totalValue += dcfResult.value * weights.dcf;
        totalWeight += weights.dcf;
      }
    }

    // EBITDA Multiple
    if (weights.ebitdaMultiple > 0 && formData.ebitda > 0) {
      const ebitdaResult = calculateEBITDAMultiple(formData);
      if (ebitdaResult) {
        valuations.push(ebitdaResult);
        totalValue += ebitdaResult.value * weights.ebitdaMultiple;
        totalWeight += weights.ebitdaMultiple;
      }
    }

    // Revenue Factor
    if (weights.revenueFactor > 0) {
      const revenueResult = calculateRevenueFactor(formData);
      if (revenueResult) {
        valuations.push(revenueResult);
        totalValue += revenueResult.value * weights.revenueFactor;
        totalWeight += weights.revenueFactor;
      }
    }

    // Multiples
    if (weights.multiples > 0) {
      const multiplesResult = calculateMultiples(formData);
      if (multiplesResult) {
        valuations.push(multiplesResult);
        totalValue += multiplesResult.value * weights.multiples;
        totalWeight += weights.multiples;
      }
    }

    // Scorecard (for startups)
    if (weights.scorecard > 0) {
      const scorecardResult = calculateScorecard(formData);
      if (scorecardResult) {
        valuations.push(scorecardResult);
        totalValue += scorecardResult.value * weights.scorecard;
        totalWeight += weights.scorecard;
      }
    }

    // Normalize by actual weights used
    const companyValuation = totalWeight > 0 ? totalValue / totalWeight : 0;

    // Calculate score (A-F rating)
    const scoreResult = calculateOverallScore(formData);

    // Calculate Personal Equity if provided
    let personalEquityResult = null;
    if (formData.includePersonalEquity) {
      personalEquityResult = calculatePersonalEquity(formData);

      // Add personal equity value if applicable
      if (formData.partnerOperational) {
        const personalEquityFactor = 0.15; // 15% factor for operational partners
        const personalEquityValue = personalEquityResult.overallScore * personalEquityFactor * (formData.revenue || 100000);
        personalEquityResult.monetaryValue = personalEquityValue;
      }
    }

    // Calculate valuation range
    const range = {
      min: companyValuation * 0.85,
      max: companyValuation * 1.15
    };

    // Total valuation (company + personal equity if applicable)
    const totalValuation = companyValuation + (personalEquityResult?.monetaryValue || 0);

    res.json({
      success: true,
      data: {
        companyValuation,
        valuationRange: range,
        totalValuation,
        valuations,
        score: scoreResult,
        personalEquity: personalEquityResult,
        weights: weights,
        companyType,
        generatedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 3 months
      }
    });

  } catch (error) {
    console.error('Valuation Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate valuation',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/data/weights
 * Returns model weights for each company type
 */
router.get('/weights', (req, res) => {
  res.json({
    success: true,
    data: MODEL_WEIGHTS
  });
});

/**
 * GET /api/v1/data/industries
 * Returns industry multiples
 */
router.get('/industries', (req, res) => {
  res.json({
    success: true,
    data: INDUSTRY_MULTIPLES
  });
});

module.exports = router;