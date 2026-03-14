/**
 * VALORA by MTDX — PDF API Endpoint
 * Returns structured report data; actual PDF rendered client-side via jsPDF CDN.
 * Server-side PDF generation is available as fallback if needed.
 *
 * METADAX TECNOLOGIA E SERVICOS LTDA
 * Responsável Técnico: Pedro Paulo Rosemberg da Silva Oliveira (CRA-SP 6-009145)
 */

const express = require('express');
const router = express.Router();

const PDF_CONFIG = {
  company: {
    name: 'METADAX TECNOLOGIA E SERVICOS LTDA',
    cnpj: '59.324.751/0001-06',
    address: 'Av. Paulista, 1106, Sala 01, Andar 16, Bela Vista, São Paulo/SP — CEP 01310-914',
    phone: '+55 (11) 96136-0594',
    email: 'contato@metadax.com.br',
    website: 'metadax.com.br',
    responsible: 'Pedro Paulo Rosemberg da Silva Oliveira',
    cra: 'CRA-SP 6-009145'
  }
};

function getReportTypeLabel(type) {
  const labels = { personal: 'Relatório Pessoal', business: 'Relatório Empresarial', complete: 'Relatório Completo' };
  return labels[type] || 'Relatório';
}

/**
 * POST /api/v1/pdf/generate
 * Returns structured report metadata.
 * PDF is generated client-side using jsPDF loaded via CDN.
 */
router.post('/generate', async (req, res) => {
  try {
    const { formData, valuationResult, reportType } = req.body;

    if (!formData || !valuationResult) {
      return res.status(400).json({ success: false, error: 'formData and valuationResult are required' });
    }

    const timestamp = new Date();
    const validUntil = new Date(timestamp.getTime() + 90 * 24 * 60 * 60 * 1000);

    const formatDate = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', {
      style: 'currency', currency: 'BRL', maximumFractionDigits: 0
    }).format(v || 0);

    const documentId = `VAL-${timestamp.getTime().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const reportData = {
      documentId,
      reportType: getReportTypeLabel(reportType),
      generatedAt: formatDate(timestamp),
      validUntil: formatDate(validUntil),
      companyName: formData.razao_social || formData.nome_fantasia || 'Empresa',
      cnpj: formData.cnpj || null,
      valuation: {
        main: formatCurrency(valuationResult.companyValuation),
        rangeMin: formatCurrency(valuationResult.valuationRange?.min),
        rangeMax: formatCurrency(valuationResult.valuationRange?.max),
        rating: valuationResult.score?.rating || null,
        score: valuationResult.score?.overallScore || null
      },
      methodologies: (valuationResult.valuations || []).map(v => ({
        method: v.method,
        value: formatCurrency(v.value)
      })),
      responsible: PDF_CONFIG.company.responsible,
      cra: PDF_CONFIG.company.cra,
      company: PDF_CONFIG.company,
      disclaimer: 'Este relatório é uma avaliação estratégica de marketing e inovação, elaborada com base em dados fornecidos pelo cliente. Não constitui avaliação financeira oficial para fins contábeis, societários ou judiciais. Validade: 90 dias.'
    };

    res.json({ success: true, data: reportData });

  } catch (error) {
    console.error('PDF Report Error:', error);
    res.status(500).json({ success: false, error: 'Erro ao gerar dados do relatório', message: error.message });
  }
});

/**
 * GET /api/v1/pdf/config
 * Returns PDF/report configuration
 */
router.get('/config', (req, res) => {
  res.json({ success: true, data: { company: PDF_CONFIG.company } });
});

module.exports = router;
