/**
 * VALORA by METADAX — PDF Generation & Chart Logic
 * Uses jsPDF (CDN) and Chart.js (CDN) loaded in index.html
 */

// ─── PDF Config ──────────────────────────────────────
const PDF_COLORS = {
  primary:    [8, 12, 20],    // --ink
  secondary:  [26, 34, 51],   // --ink-mid
  gold:       [201, 168, 76], // --gold
  goldLight:  [228, 196, 107],
  text:       [232, 237, 245],
  textMuted:  [138, 155, 184],
  emerald:    [0, 214, 143],
  scarlet:    [255, 71, 87]
};

const PDF_COMPANY = {
  name:        'METADAX TECNOLOGIA E SERVICOS LTDA',
  cnpj:        '59.324.751/0001-06',
  address:     'Av. Paulista, 1106, Sala 01, Andar 16, Bela Vista, São Paulo/SP — CEP 01310-914',
  phone:       '+55 (11) 96136-0594',
  email:       'contato@metadax.com.br',
  website:     'metadax.com.br',
  responsible: 'Pedro Paulo Rosemberg da Silva Oliveira',
  cra:         'CRA-SP 6-009145'
};

// ─── Client-side PDF generation ──────────────────────
window.generateClientPDF = function(formData, valuationResult, reportType) {
  if (typeof window.jspdf === 'undefined') {
    console.warn('jsPDF not loaded, skipping PDF generation');
    return null;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210, H = 297;
  const margin = 20;
  let y = margin;

  // ── Background
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, W, H, 'F');

  // ── Gold top bar
  doc.setFillColor(...PDF_COLORS.gold);
  doc.rect(0, 0, W, 3, 'F');

  // ── Header
  doc.setTextColor(...PDF_COLORS.gold);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'italic');
  doc.text('VALORA', margin, y + 14);

  doc.setTextColor(...PDF_COLORS.textMuted);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('by METADAX — Parecer Técnico de Valuation', margin, y + 22);

  y += 36;

  // ── Separator
  doc.setDrawColor(...PDF_COLORS.gold);
  doc.setLineWidth(0.3);
  doc.line(margin, y, W - margin, y);
  y += 10;

  // ── Company name
  const companyName = formData.razao_social || formData.nome_fantasia || 'Empresa';
  doc.setTextColor(...PDF_COLORS.text);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, margin, y);
  y += 8;

  doc.setTextColor(...PDF_COLORS.textMuted);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const today = new Date().toLocaleDateString('pt-BR');
  const validUntil = new Date(Date.now() + 90 * 864e5).toLocaleDateString('pt-BR');
  doc.text(`Emitido em: ${today}  |  Válido até: ${validUntil}  |  Tipo: ${getReportLabel(reportType)}`, margin, y);
  y += 16;

  // ── Valuation box
  doc.setFillColor(...PDF_COLORS.secondary);
  doc.roundedRect(margin, y, W - margin * 2, 44, 3, 3, 'F');
  doc.setDrawColor(...PDF_COLORS.gold);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, W - margin * 2, 44, 3, 3, 'S');

  const fmtCur = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

  doc.setTextColor(...PDF_COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('VALUATION ESTIMADO', margin + 8, y + 10);

  doc.setTextColor(...PDF_COLORS.gold);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(fmtCur(valuationResult.companyValuation || 0), margin + 8, y + 24);

  if (valuationResult.valuationRange) {
    doc.setTextColor(...PDF_COLORS.textMuted);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Faixa: ${fmtCur(valuationResult.valuationRange.min)} — ${fmtCur(valuationResult.valuationRange.max)}`, margin + 8, y + 34);
  }

  // Score badge
  if (valuationResult.score?.rating) {
    doc.setFillColor(...PDF_COLORS.gold);
    doc.circle(W - margin - 18, y + 22, 12, 'F');
    doc.setTextColor(...PDF_COLORS.primary);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bolditalic');
    doc.text(valuationResult.score.rating, W - margin - 22, y + 27);
  }

  y += 56;

  // ── Methodologies
  if (valuationResult.valuations?.length > 0) {
    doc.setTextColor(...PDF_COLORS.gold);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('METODOLOGIAS APLICADAS', margin, y);
    y += 6;

    valuationResult.valuations.forEach(v => {
      doc.setFillColor(26, 34, 51);
      doc.rect(margin, y, W - margin * 2, 10, 'F');
      doc.setTextColor(...PDF_COLORS.text);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(v.method, margin + 4, y + 7);
      doc.setFont('helvetica', 'bold');
      doc.text(fmtCur(v.value), W - margin - 4, y + 7, { align: 'right' });
      y += 12;
    });
    y += 8;
  }

  // ── Disclaimer
  doc.setFillColor(15, 22, 35);
  doc.rect(margin, y, W - margin * 2, 26, 'F');
  doc.setTextColor(...PDF_COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const disclaimer = `Este relatório é uma avaliação estratégica de marketing e inovação. Não constitui avaliação financeira oficial.\nValidade: 90 dias. Responsável Técnico: ${PDF_COMPANY.responsible} (${PDF_COMPANY.cra})`;
  doc.text(disclaimer, margin + 4, y + 8, { maxWidth: W - margin * 2 - 8 });

  y = H - 28;

  // ── Footer
  doc.setDrawColor(...PDF_COLORS.gold);
  doc.setLineWidth(0.2);
  doc.line(margin, y, W - margin, y);
  y += 6;

  doc.setTextColor(...PDF_COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(PDF_COMPANY.name, margin, y);
  doc.text(`${PDF_COMPANY.email}  |  ${PDF_COMPANY.website}`, margin, y + 5);
  doc.text(`© ${new Date().getFullYear()} METADAX. Todos os direitos reservados.`, W - margin, y, { align: 'right' });

  // Gold bottom bar
  doc.setFillColor(...PDF_COLORS.gold);
  doc.rect(0, H - 2, W, 2, 'F');

  return doc;
};

function getReportLabel(type) {
  return { personal: 'Relatório Pessoal', business: 'Relatório Empresarial', complete: 'Relatório Completo' }[type] || 'Relatório';
}

// Override downloadPDF to use client-side jsPDF
window.downloadPDF = function() {
  const result = window._lastValuationResult;
  if (!result) { alert('Nenhum resultado disponível.'); return; }
  const doc = window.generateClientPDF(window.AppState?.formData || {}, result, window.AppState?.formData?.reportType || 'complete');
  if (doc) {
    doc.save(`VALORA_${Date.now()}.pdf`);
  } else {
    alert('PDF indisponível. Tente novamente.');
  }
};

// ─── Chart.js Radar ──────────────────────────────────
window.renderRadarChart = function(canvasId, scores) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;

  const labels = ['Desempenho', 'Mercado', 'Pessoas', 'Capital\nInterno', 'Capital\nExterno', 'Capital\nResultado'];
  const values = labels.map((_, i) => {
    const keys = [['P','Q','R','S'], ['T','U','V','W','X','Y','Z','AA'], ['BB','CC','DD','EE','FF','GG'],
                  ['HH','II','JJ','KK','LL','MM','NN','OO','PP','QQ','RR','SS'],
                  ['TT','UU','VV','WW','XX','YY','ZZ','AAA','BBB','CCC','DDD','EEE'],
                  ['FFF','GGG','HHH','III','JJJ','KKK','LLL','MMM','NNN']];
    const group = keys[i];
    const total = group.reduce((s, k) => s + (parseInt(scores[k]) || 0), 0);
    return Math.round((total / (group.length * 4)) * 100);
  });

  new Chart(canvas, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: 'rgba(201,168,76,0.12)',
        borderColor: 'rgba(201,168,76,0.8)',
        borderWidth: 1.5,
        pointBackgroundColor: 'rgba(201,168,76,1)',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { display: false },
          grid: { color: 'rgba(42,63,95,0.6)' },
          angleLines: { color: 'rgba(42,63,95,0.6)' },
          pointLabels: { color: '#8a9bb8', font: { size: 10 } }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
};
