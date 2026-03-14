/**
 * VALORA by MTDX - PDF Report Generation
 * Professional PDF reports with METADAX branding
 *
 * METADAX TECNOLOGIA E SERVICOS LTDA
 * Technical Responsibility: Pedro Paulo Rosemberg da Silva Oliveira (CRA-SP 6-009145)
 */

const express = require('express');
const router = express.Router();

// PDF configuration constants
const PDF_CONFIG = {
  pageSize: 'A4',
  margins: {
    top: 40,
    right: 40,
    bottom: 40,
    left: 40
  },
  colors: {
    primary: '#1a1a2e',
    secondary: '#16213e',
    accent: '#e94560',
    text: '#333333',
    lightGray: '#f5f5f5',
    darkGray: '#666666'
  },
  fonts: {
    title: 24,
    heading: 18,
    subheading: 14,
    body: 11,
    small: 9
  },
  company: {
    name: 'METADAX TECNOLOGIA E SERVICOS LTDA',
    cnpj: '59.324.751/0001-06',
    address: 'Avenida Paulista, 1106, Sala 01, Andar 16, Bela Vista, São Paulo, SP - CEP 01310-914',
    phone: '+55 (11) 96136-0594',
    email: 'contato@metadax.com.br',
    website: 'metadax.com.br',
    responsible: 'Pedro Paulo Rosemberg da Silva Oliveira',
    cra: 'CRA-SP 6-009145'
  }
};

/**
 * Generate PDF report content
 */
function generateReportContent(data) {
  const { formData, valuationResult, reportType } = data;
  const timestamp = new Date();
  const validUntil = new Date(timestamp.getTime() + 90 * 24 * 60 * 60 * 1000); // 3 months

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format date
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const content = {
    meta: {
      title: 'Parecer Técnico de Valuation',
      subtitle: 'VALORA by MTDX',
      generatedAt: formatDate(timestamp),
      validUntil: formatDate(validUntil),
      reportType: reportType,
      documentId: `VAL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    },
    cover: {
      companyName: formData.razao_social || formData.companyName || 'Empresa',
      cnpj: formData.cnpj || 'Não informado',
      reportType: getReportTypeLabel(reportType),
      valuation: formatCurrency(valuationResult.totalValuation),
      score: valuationResult.score?.rating || 'N/A',
      responsible: PDF_CONFIG.company.responsible,
      cra: PDF_CONFIG.company.cra
    },
    sections: generateSections(formData, valuationResult, reportType),
    footer: {
      company: PDF_CONFIG.company,
      disclaimer: 'Este relatório é uma avaliação estratégica de marketing e inovação. Não constitui uma avaliação financeira oficial. Validade: 3 meses a partir da data de emissão.',
      copyright: `© ${timestamp.getFullYear()} METADAX TECNOLOGIA E SERVICOS LTDA. Todos os direitos reservados.`
    }
  };

  return content;
}

/**
 * Get report type label
 */
function getReportTypeLabel(type) {
  const labels = {
    'personal': 'Relatório Pessoal',
    'business': 'Relatório Empresarial',
    'complete': 'Relatório Completo'
  };
  return labels[type] || 'Relatório';
}

/**
 * Generate report sections based on type
 */
function generateSections(formData, valuationResult, reportType) {
  const sections = [];

  // 1. Executive Summary
  sections.push({
    id: 'summary',
    title: 'Resumo Executivo',
    content: [
      {
        type: 'text',
        value: `Este parecer técnico apresenta uma análise de valuation da empresa ${formData.razao_social || formData.companyName || 'não identificada'}, considerando múltiplas metodologias de avaliação e fatores qualitativos relevantes.`
      },
      {
        type: 'highlight',
        label: 'Valuation Estimado',
        value: formatCurrency(valuationResult.totalValuation)
      },
      {
        type: 'range',
        label: 'Faixa de Valuation',
        min: formatCurrency(valuationResult.valuationRange?.min),
        max: formatCurrency(valuationResult.valuationRange?.max)
      },
      {
        type: 'score',
        label: 'Score de Valorização',
        value: valuationResult.score?.rating || 'N/A',
        description: getScoreDescription(valuationResult.score?.rating)
      }
    ]
  });

  // 2. Company Data (for business and complete reports)
  if (reportType !== 'personal') {
    sections.push({
      id: 'company',
      title: 'Dados da Empresa',
      content: [
        { type: 'field', label: 'Razão Social', value: formData.razao_social || 'Não informado' },
        { type: 'field', label: 'CNPJ', value: formData.cnpj || 'Não informado' },
        { type: 'field', label: 'Tipo de Empresa', value: getCompanyTypeLabel(formData.companyType) },
        { type: 'field', label: 'Setor de Atuação', value: formData.industry || 'Não informado' },
        { type: 'field', label: 'Faturamento LTM', value: formatCurrency(formData.revenue || 0) },
        { type: 'field', label: 'EBITDA (%)', value: `${formData.ebitda || 0}%` },
        { type: 'field', label: 'Taxa de Crescimento', value: `${(formData.growthRate || 0) * 100}%` }
      ]
    });
  }

  // 3. Valuation Methodology
  if (reportType !== 'personal') {
    sections.push({
      id: 'methodology',
      title: 'Metodologia de Valuation',
      content: [
        {
          type: 'text',
          value: 'A análise de valuation foi realizada utilizando múltiplas metodologias reconhecidas, com pesos variáveis conforme o tipo de empresa:'
        },
        {
          type: 'table',
          headers: ['Metodologia', 'Valor', 'Peso'],
          rows: valuationResult.valuations?.map(v => [
            v.method,
            formatCurrency(v.value),
            `${Math.round(v.weight * 100)}%`
          ]) || []
        }
      ]
    });
  }

  // 4. Score Analysis
  sections.push({
    id: 'score',
    title: 'Análise de Score',
    content: [
      {
        type: 'text',
        value: 'O score de valorização (A-F) reflete uma análise qualitativa multidimensional da empresa, considerando fatores internos e externos:'
      },
      {
        type: 'scores',
        blocks: [
          { name: 'Desempenho e Eficiência', score: valuationResult.score?.blockScores?.performance?.percentage || 0 },
          { name: 'Mercado e Estratégia', score: valuationResult.score?.blockScores?.market?.percentage || 0 },
          { name: 'Pessoas e Intangíveis', score: valuationResult.score?.blockScores?.people?.percentage || 0 },
          { name: 'Capital Interno', score: valuationResult.score?.blockScores?.internalCapital?.percentage || 0 },
          { name: 'Capital Externo', score: valuationResult.score?.blockScores?.externalCapital?.percentage || 0 },
          { name: 'Capital de Resultado', score: valuationResult.score?.blockScores?.resultCapital?.percentage || 0 }
        ]
      }
    ]
  });

  // 5. Personal Equity (for personal and complete reports)
  if (reportType !== 'business' && valuationResult.personalEquity) {
    sections.push({
      id: 'personalEquity',
      title: 'Equity Pessoal',
      content: [
        {
          type: 'text',
          value: 'O Equity Pessoal representa o valor do sócio/profissional como ativo estratégico da empresa:'
        },
        {
          type: 'dimensions',
          items: [
            { name: 'Capital Intelectual', score: valuationResult.personalEquity.dimensionScores?.intellectual?.percentage || 0 },
            { name: 'Capital Produtivo', score: valuationResult.personalEquity.dimensionScores?.productive?.percentage || 0 },
            { name: 'Capital de Consciência', score: valuationResult.personalEquity.dimensionScores?.conscience?.percentage || 0 },
            { name: 'Capital Reputacional', score: valuationResult.personalEquity.dimensionScores?.reputational?.percentage || 0 },
            { name: 'Capital Relacional', score: valuationResult.personalEquity.dimensionScores?.relational?.percentage || 0 },
            { name: 'Capital de Marca Pessoal', score: valuationResult.personalEquity.dimensionScores?.personalBrand?.percentage || 0 },
            { name: 'Capital Financeiro', score: valuationResult.personalEquity.dimensionScores?.financial?.percentage || 0 },
            { name: 'Capital de Audiência', score: valuationResult.personalEquity.dimensionScores?.audience?.percentage || 0 }
          ]
        },
        {
          type: 'highlight',
          label: 'Score Equity Pessoal',
          value: valuationResult.personalEquity.rating || 'N/A'
        }
      ]
    });
  }

  // 6. Strengths and Improvements
  sections.push({
    id: 'recommendations',
    title: 'Pontos Fortes e Recomendações',
    content: [
      {
        type: 'list',
        title: 'Pontos Fortes',
        items: identifyStrengths(formData, valuationResult)
      },
      {
        type: 'list',
        title: 'Pontos de Melhoria',
        items: identifyImprovements(formData, valuationResult)
      }
    ]
  });

  // 7. RFN Rating (for complete reports)
  if (reportType === 'complete' && formData.rfnRating) {
    sections.push({
      id: 'rfn',
      title: 'Rating RFN MTDX',
      content: [
        {
          type: 'text',
          value: 'O Rating RFN (Rating de Fontes Negativas) da MTDX é uma métrica independente que avalia aspectos não-financeiros da empresa:'
        },
        {
          type: 'highlight',
          label: 'Rating RFN',
          value: formData.rfnRating || 'N/A'
        },
        {
          type: 'note',
          value: 'Este rating não interfere no cálculo do valuation, sendo apresentado apenas para fins informativos.'
        }
      ]
    });
  }

  // 8. Disclaimer
  sections.push({
    id: 'disclaimer',
    title: 'Considerações Finais',
    content: [
      {
        type: 'text',
        value: 'Este parecer técnico foi elaborado com base nas informações fornecidas pelo solicitante e representa uma análise estratégica de marketing e inovação. Não constitui uma avaliação financeira oficial nem uma recomendação de investimento.'
      },
      {
        type: 'text',
        value: 'A análise de benchmarks e comparações de mercado está disponível como serviço adicional. Entre em contato com a equipe METADAX para mais informações.'
      },
      {
        type: 'validity',
        value: `Este relatório é válido até ${formatDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))}.`
      }
    ]
  });

  return sections;
}

/**
 * Identify strengths from data
 */
function identifyStrengths(formData, valuationResult) {
  const strengths = [];

  if (valuationResult.score?.blockScores?.performance?.percentage >= 70) {
    strengths.push('Desempenho operacional acima da média');
  }
  if (valuationResult.score?.blockScores?.market?.percentage >= 70) {
    strengths.push('Posicionamento de mercado favorável');
  }
  if (valuationResult.score?.blockScores?.people?.percentage >= 70) {
    strengths.push('Equipe e cultura organizacional sólidas');
  }
  if (valuationResult.score?.blockScores?.internalCapital?.percentage >= 70) {
    strengths.push('Capital interno bem desenvolvido');
  }
  if (valuationResult.score?.blockScores?.externalCapital?.percentage >= 70) {
    strengths.push('Boa reputação e networking');
  }
  if (valuationResult.score?.blockScores?.resultCapital?.percentage >= 70) {
    strengths.push('Resultados financeiros consistentes');
  }
  if (formData.growthRate > 0.20) {
    strengths.push('Taxa de crescimento expressiva');
  }
  if (formData.ebitda > 25) {
    strengths.push('Margem EBITDA saudável');
  }

  if (strengths.length === 0) {
    strengths.push('Potencial de desenvolvimento identificado');
  }

  return strengths;
}

/**
 * Identify improvements from data
 */
function identifyImprovements(formData, valuationResult) {
  const improvements = [];

  if (valuationResult.score?.blockScores?.performance?.percentage < 50) {
    improvements.push('Otimizar processos e aumentar eficiência operacional');
  }
  if (valuationResult.score?.blockScores?.market?.percentage < 50) {
    improvements.push('Fortalecer posicionamento estratégico no mercado');
  }
  if (valuationResult.score?.blockScores?.people?.percentage < 50) {
    improvements.push('Investir em desenvolvimento de equipe e cultura');
  }
  if (valuationResult.score?.blockScores?.internalCapital?.percentage < 50) {
    improvements.push('Desenvolver capacidades internas e executivas');
  }
  if (valuationResult.score?.blockScores?.externalCapital?.percentage < 50) {
    improvements.push('Ampliar networking e reputação externa');
  }
  if (valuationResult.score?.blockScores?.resultCapital?.percentage < 50) {
    improvements.push('Focar em resultados financeiros consistentes');
  }
  if (formData.growthRate < 0.05) {
    improvements.push('Desenvolver estratégias de crescimento');
  }
  if (formData.ebitda < 15) {
    improvements.push('Trabalhar margens e rentabilidade');
  }

  if (improvements.length === 0) {
    improvements.push('Manter boas práticas e continuar evoluindo');
  }

  return improvements;
}

/**
 * Get company type label
 */
function getCompanyTypeLabel(type) {
  const labels = {
    traditional: 'Empresa Tradicional',
    newEconomy: 'Empresa Nova Economia',
    startup: 'Empresa Startup',
    personalEquity: 'Equity Pessoal'
  };
  return labels[type] || 'Não informado';
}

/**
 * Get score description
 */
function getScoreDescription(rating) {
  const descriptions = {
    'A': 'Excelente - Empresa com alto potencial de valorização',
    'B': 'Muito Bom - Empresa com bom potencial de valorização',
    'C': 'Bom - Empresa com potencial de valorização',
    'D': 'Regular - Empresa com oportunidades de melhoria',
    'E': 'Em Desenvolvimento - Empresa em fase de estruturação',
    'F': 'Inicial - Empresa com amplo espaço para desenvolvimento'
  };
  return descriptions[rating] || 'Não avaliado';
}

/**
 * Format currency helper
 */
function formatCurrency(value) {
  if (!value || isNaN(value)) return 'R$ 0';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/pdf/generate
 * Generate PDF report
 */
router.post('/generate', async (req, res) => {
  try {
    const { formData, valuationResult, reportType } = req.body;

    if (!formData || !valuationResult) {
      return res.status(400).json({
        success: false,
        error: 'Missing required data',
        message: 'formData and valuationResult are required'
      });
    }

    // Generate report content
    const reportContent = generateReportContent({
      formData,
      valuationResult,
      reportType: reportType || 'complete'
    });

    // Return report content for client-side PDF generation
    res.json({
      success: true,
      data: {
        content: reportContent,
        config: PDF_CONFIG,
        message: 'Report content generated successfully. Use jsPDF on client side to generate the PDF.'
      }
    });

  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/pdf/preview
 * Preview report content
 */
router.post('/preview', async (req, res) => {
  try {
    const { formData, valuationResult, reportType } = req.body;

    const reportContent = generateReportContent({
      formData,
      valuationResult,
      reportType: reportType || 'complete'
    });

    res.json({
      success: true,
      data: reportContent
    });

  } catch (error) {
    console.error('Preview Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate preview',
      message: error.message
    });
  }
});

module.exports = router;