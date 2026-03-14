/**
 * VALORA by MTDX - Valuation Logic
 * Client-side calculation and validation logic
 *
 * METADAX TECNOLOGIA E SERVICOS LTDA
 * Technical Responsibility: Pedro Paulo Rosemberg da Silva Oliveira (CRA-SP 6-009145)
 */

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Model weights by company type
  MODEL_WEIGHTS: {
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
  },

  // Industry multiples
  INDUSTRY_MULTIPLES: {
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
  },

  DEFAULT_MULTIPLES: { revenueMultiple: 2.0, ebitdaMultiple: 8.0 },

  // Score blocks mapping
  SCORE_BLOCKS: {
    performance: ['P', 'Q', 'R', 'S'],
    market: ['T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA'],
    people: ['BB', 'CC', 'DD', 'EE', 'FF', 'GG'],
    internalCapital: ['HH', 'II', 'JJ', 'KK', 'LL', 'MM', 'NN', 'OO', 'PP', 'QQ', 'RR', 'SS'],
    externalCapital: ['TT', 'UU', 'VV', 'WW', 'XX', 'YY', 'ZZ', 'AAA', 'BBB', 'CCC', 'DDD', 'EEE'],
    resultCapital: ['FFF', 'GGG', 'HHH', 'III', 'JJJ', 'KKK', 'LLL', 'MMM', 'NNN']
  },

  // Block weights for overall score
  BLOCK_WEIGHTS: {
    performance: 0.15,
    market: 0.20,
    people: 0.15,
    internalCapital: 0.20,
    externalCapital: 0.15,
    resultCapital: 0.15
  },

  // Personal equity dimensions
  PERSONAL_DIMENSIONS: {
    intellectual: ['HH'],
    productive: ['II', 'JJ'],
    conscience: ['LL', 'MM', 'NN', 'OO', 'PP', 'QQ', 'RR', 'SS'],
    reputational: ['TT', 'UU', 'VV', 'WW'],
    relational: ['XX', 'YY', 'ZZ', 'AAA'],
    personalBrand: ['BBB', 'CCC', 'DDD', 'EEE'],
    financial: ['FFF', 'GGG'],
    audience: ['III', 'JJJ', 'KKK', 'LLL', 'MMM', 'NNN']
  }
};

// ============================================================================
// Valuation Methods
// ============================================================================

/**
 * Calculate DCF (Discounted Cash Flow)
 */
function calculateDCF(data) {
  const { revenue, ebitda, growthRate } = data;

  if (!revenue || !ebitda) return null;

  const discountRate = 0.15;
  const terminalGrowth = 0.02;
  const projectionYears = 5;

  const ebitdaMargin = ebitda / 100; // Convert percentage to decimal
  const cashFlows = [];

  for (let year = 1; year <= projectionYears; year++) {
    const projectedRevenue = revenue * Math.pow(1 + (growthRate || 0.05), year);
    const projectedEBITDA = projectedRevenue * ebitdaMargin;
    cashFlows.push(projectedEBITDA * 0.80);
  }

  let pvCashFlows = 0;
  cashFlows.forEach((cf, year) => {
    pvCashFlows += cf / Math.pow(1 + discountRate, year + 1);
  });

  const terminalValue = cashFlows[cashFlows.length - 1] * (1 + terminalGrowth) / (discountRate - terminalGrowth);
  const pvTerminalValue = terminalValue / Math.pow(1 + discountRate, projectionYears);

  return {
    value: pvCashFlows + pvTerminalValue,
    method: 'DCF',
    assumptions: { discountRate, terminalGrowth, projectionYears }
  };
}

/**
 * Calculate EBITDA Multiple valuation
 */
function calculateEBITDAMultiple(data) {
  const { revenue, ebitda, industry } = data;

  if (!revenue || !ebitda || ebitda <= 0) return null;

  const multiples = CONFIG.INDUSTRY_MULTIPLES[industry] || CONFIG.DEFAULT_MULTIPLES;
  const multiple = multiples.ebitdaMultiple;
  const ebitdaValue = revenue * (ebitda / 100);

  return {
    value: ebitdaValue * multiple,
    method: 'EBITDA Multiple',
    assumptions: { multiple, industry }
  };
}

/**
 * Calculate Revenue × Factor valuation
 */
function calculateRevenueFactor(data) {
  const { revenue, growthRate, industry } = data;

  if (!revenue || revenue <= 0) return null;

  const multiples = CONFIG.INDUSTRY_MULTIPLES[industry] || CONFIG.DEFAULT_MULTIPLES;
  let factor = multiples.revenueMultiple;

  // Adjust factor based on growth rate
  if (growthRate > 0.30) {
    factor *= 1.3;
  } else if (growthRate > 0.15) {
    factor *= 1.15;
  } else if (growthRate < 0.05) {
    factor *= 0.85;
  }

  return {
    value: revenue * factor,
    method: 'Revenue × Factor',
    assumptions: { factor, industry, growthAdjustment: growthRate }
  };
}

/**
 * Calculate Multiples valuation
 */
function calculateMultiples(data) {
  const { revenue, ebitda, assets, industry } = data;

  if (!revenue) return null;

  const multiples = CONFIG.INDUSTRY_MULTIPLES[industry] || CONFIG.DEFAULT_MULTIPLES;

  let value = 0;
  let weight = 0;

  if (ebitda && ebitda > 0) {
    const ebitdaValue = revenue * (ebitda / 100);
    value += ebitdaValue * multiples.ebitdaMultiple * 0.5;
    weight += 0.5;
  }

  value += revenue * multiples.revenueMultiple * 0.5;
  weight += 0.5;

  if (assets) {
    value += assets * 0.3;
  }

  return {
    value: value / weight + (assets || 0) * 0.2,
    method: 'Multiples',
    assumptions: { industryMultiples: multiples }
  };
}

/**
 * Calculate Scorecard valuation (for startups)
 */
function calculateScorecard(data) {
  const { tam, sam, users, growthRate, funding, productStage } = data;

  let baseValue = 1000000;

  const adjustments = {
    idea: -0.50,
    prototype: -0.25,
    mvp: 0,
    growth: 0.25,
    mature: 0.50
  };

  let scoreMultiplier = 1;

  // Market Score
  if (tam && sam) {
    const marketScore = Math.min(sam / 10000000, 5);
    scoreMultiplier *= (1 + marketScore * 0.1);
  }

  // Traction Score
  if (users) {
    const userScore = Math.min(Math.log10(users + 1), 3);
    scoreMultiplier *= (1 + userScore * 0.15);
  }

  // Growth Score
  if (growthRate) {
    const growthScore = Math.min(growthRate / 0.5, 3);
    scoreMultiplier *= (1 + growthScore * 0.1);
  }

  // Product Stage
  if (productStage) {
    scoreMultiplier *= (1 + (adjustments[productStage] || 0));
  }

  // Funding adjustment
  if (funding) {
    baseValue += funding * 0.5;
  }

  return {
    value: baseValue * scoreMultiplier,
    method: 'Scorecard',
    assumptions: { baseValue, scoreMultiplier, productStage, funding }
  };
}

// ============================================================================
// Score Calculation
// ============================================================================

/**
 * Calculate score for a block
 */
function calculateBlockScore(answers, blockKey) {
  const questions = CONFIG.SCORE_BLOCKS[blockKey];
  if (!questions) return { score: 0, percentage: 0, maxScore: 0, achievedScore: 0 };

  let achievedScore = 0;
  const maxScore = questions.length * 4;

  questions.forEach(q => {
    const answer = answers[q];
    achievedScore += answer ? Math.min(parseInt(answer), 4) : 0;
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

  Object.keys(CONFIG.SCORE_BLOCKS).forEach(blockKey => {
    const blockResult = calculateBlockScore(answers, blockKey);
    blockScores[blockKey] = blockResult;
    weightedScore += blockResult.percentage * CONFIG.BLOCK_WEIGHTS[blockKey];
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

/**
 * Calculate personal equity score
 */
function calculatePersonalEquity(answers) {
  const dimensionScores = {};
  let totalScore = 0;

  Object.keys(CONFIG.PERSONAL_DIMENSIONS).forEach(dimension => {
    const questions = CONFIG.PERSONAL_DIMENSIONS[dimension];
    let dimensionTotal = 0;

    questions.forEach(q => {
      dimensionTotal += answers[q] ? Math.min(parseInt(answers[q]), 4) : 0;
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

  const overallPercentage = totalScore / Object.keys(CONFIG.PERSONAL_DIMENSIONS).length;

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
// Main Valuation Function
// ============================================================================

/**
 * Calculate complete valuation
 */
function calculateValuation(formData) {
  // Parse numeric values
  const data = {
    ...formData,
    revenue: parseCurrency(formData.revenue),
    revenueNTM: parseCurrency(formData.revenueNTM),
    ebitda: parseFloat(formData.ebitda) || 0,
    assets: parseCurrency(formData.assets),
    investments: parseCurrency(formData.investments),
    debt: parseCurrency(formData.debt),
    growthRate: parseFloat(formData.P) ? (parseInt(formData.P) / 10) : 0.05,
    tam: parseCurrency(formData.tam),
    sam: parseCurrency(formData.sam),
    users: parseInt(formData.users) || 0,
    funding: parseCurrency(formData.funding),
    productStage: formData.productStage,
    industry: formData.industry,
    companyType: formData.companyType
  };

  const companyType = formData.companyType || 'traditional';
  const weights = CONFIG.MODEL_WEIGHTS[companyType] || CONFIG.MODEL_WEIGHTS.traditional;

  const valuations = [];
  let totalValue = 0;
  let totalWeight = 0;

  // DCF
  if (weights.dcf > 0) {
    const dcfResult = calculateDCF(data);
    if (dcfResult) {
      dcfResult.weight = weights.dcf;
      valuations.push(dcfResult);
      totalValue += dcfResult.value * weights.dcf;
      totalWeight += weights.dcf;
    }
  }

  // EBITDA Multiple
  if (weights.ebitdaMultiple > 0 && data.ebitda > 0) {
    const ebitdaResult = calculateEBITDAMultiple(data);
    if (ebitdaResult) {
      ebitdaResult.weight = weights.ebitdaMultiple;
      valuations.push(ebitdaResult);
      totalValue += ebitdaResult.value * weights.ebitdaMultiple;
      totalWeight += weights.ebitdaMultiple;
    }
  }

  // Revenue Factor
  if (weights.revenueFactor > 0) {
    const revenueResult = calculateRevenueFactor(data);
    if (revenueResult) {
      revenueResult.weight = weights.revenueFactor;
      valuations.push(revenueResult);
      totalValue += revenueResult.value * weights.revenueFactor;
      totalWeight += weights.revenueFactor;
    }
  }

  // Multiples
  if (weights.multiples > 0) {
    const multiplesResult = calculateMultiples(data);
    if (multiplesResult) {
      multiplesResult.weight = weights.multiples;
      valuations.push(multiplesResult);
      totalValue += multiplesResult.value * weights.multiples;
      totalWeight += weights.multiples;
    }
  }

  // Scorecard (for startups)
  if (weights.scorecard > 0) {
    const scorecardResult = calculateScorecard(data);
    if (scorecardResult) {
      scorecardResult.weight = weights.scorecard;
      valuations.push(scorecardResult);
      totalValue += scorecardResult.value * weights.scorecard;
      totalWeight += weights.scorecard;
    }
  }

  // Normalize by actual weights used
  const companyValuation = totalWeight > 0 ? totalValue / totalWeight : 0;

  // Calculate score
  const scoreResult = calculateOverallScore(formData);

  // Calculate Personal Equity
  let personalEquityResult = null;
  if (formData.includePersonalEquity || formData.companyType === 'personalEquity') {
    personalEquityResult = calculatePersonalEquity(formData);

    if (formData.partnerOperational) {
      const personalEquityFactor = 0.15;
      const personalEquityValue = personalEquityResult.overallScore * personalEquityFactor * (data.revenue || 100000);
      personalEquityResult.monetaryValue = personalEquityValue;
    }
  }

  // Calculate valuation range
  const range = {
    min: companyValuation * 0.85,
    max: companyValuation * 1.15
  };

  // Total valuation
  const totalValuation = companyValuation + (personalEquityResult?.monetaryValue || 0);

  return {
    companyValuation,
    valuationRange: range,
    totalValuation,
    valuations,
    score: scoreResult,
    personalEquity: personalEquityResult,
    weights,
    companyType,
    generatedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
  };
}

/**
 * Parse currency string to number
 */
function parseCurrency(value) {
  if (!value) return 0;
  const cleaned = String(value).replace(/[^\d,.-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate form data
 */
function validateFormData(data) {
  const errors = [];

  // Required fields
  if (!data.companyType) {
    errors.push('Tipo de empresa é obrigatório');
  }

  if (!data.industry && data.companyType !== 'personalEquity') {
    errors.push('Setor de atuação é obrigatório');
  }

  if (!data.revenue && data.companyType !== 'personalEquity') {
    errors.push('Faturamento é obrigatório');
  }

  // Validate numeric values
  if (data.revenue && parseCurrency(data.revenue) < 0) {
    errors.push('Faturamento deve ser positivo');
  }

  if (data.ebitda && (parseFloat(data.ebitda) < -100 || parseFloat(data.ebitda) > 100)) {
    errors.push('EBITDA deve estar entre -100% e 100%');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// Export
// ============================================================================

window.ValuationLogic = {
  calculateValuation,
  calculateOverallScore,
  calculatePersonalEquity,
  validateFormData,
  parseCurrency,
  CONFIG
};