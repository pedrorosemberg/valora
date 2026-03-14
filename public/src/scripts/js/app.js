/**
 * VALORA by MTDX - Application State Management
 * Handles form navigation, validation, data persistence, and API calls
 */

// Application State
const AppState = {
  currentStep: 1,
  totalSteps: 8,
  formData: {},
  companyData: null,
  rfnData: null,
  isAuthenticated: false,
  userID: null,
  history: []
};

// API Configuration
const API_BASE = '/api/v1';

// ============================================================================
// DOM Elements
// ============================================================================

const DOM = {
  // Progress
  progressFill: document.getElementById('progressFill'),
  progressSteps: document.getElementById('progressSteps'),

  // Form
  form: document.getElementById('valuationForm'),
  formSteps: document.querySelectorAll('.form-step'),

  // Navigation
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  submitBtn: document.getElementById('submitBtn'),

  // Modal
  loginModal: document.getElementById('loginModal'),
  loginBtn: document.getElementById('loginBtn'),
  loginForm: document.getElementById('loginForm'),
  modalClose: document.querySelector('.modal-close'),

  // Company Info
  companyInfo: document.getElementById('companyInfo'),
  searchCnpjBtn: document.getElementById('searchCnpjBtn'),
  searchCepBtn: document.getElementById('searchCepBtn'),

  // Startup Fields
  startupFields: document.getElementById('startupFields'),

  // Summary
  summaryContainer: document.getElementById('summaryContainer'),

  // Loading
  loadingOverlay: document.getElementById('loadingOverlay')
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format number as Brazilian Real currency
 */
function formatCurrency(value) {
  if (!value) return '';
  const num = parseFloat(value.replace(/\D/g, '')) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Format CNPJ
 */
function formatCNPJ(value) {
  const cleaned = value.replace(/\D/g, '');
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Format CEP
 */
function formatCEP(value) {
  const cleaned = value.replace(/\D/g, '');
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
}

/**
 * Show loading overlay
 */
function showLoading(message = 'Processando...') {
  DOM.loadingOverlay.classList.remove('hidden');
  DOM.loadingOverlay.querySelector('p').textContent = message;
}

/**
 * Hide loading overlay
 */
function hideLoading() {
  DOM.loadingOverlay.classList.add('hidden');
}

/**
 * Show error message
 */
function showError(message) {
  alert(message); // TODO: Replace with toast notification
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch CNPJ data from BrasilAPI
 */
async function fetchCNPJData(cnpj) {
  try {
    const response = await fetch(`${API_BASE}/useapis/cnpj/${cnpj.replace(/\D/g, '')}`);
    const data = await response.json();

    if (data.success) {
      return data.data;
    }
    throw new Error(data.error || 'Erro ao buscar CNPJ');
  } catch (error) {
    console.error('CNPJ API Error:', error);
    throw error;
  }
}

/**
 * Fetch CEP data from ViaCEP
 */
async function fetchCEPData(cep) {
  try {
    const response = await fetch(`${API_BASE}/useapis/cep/${cep.replace(/\D/g, '')}`);
    const data = await response.json();

    if (data.success) {
      return data.data;
    }
    throw new Error(data.error || 'Erro ao buscar CEP');
  } catch (error) {
    console.error('CEP API Error:', error);
    throw error;
  }
}

/**
 * Validate user access
 */
async function validateAccess(userID) {
  try {
    const response = await fetch(`${API_BASE}/useapis/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userID })
    });
    const data = await response.json();

    return data.success && data.data?.valid;
  } catch (error) {
    console.error('Validate Access Error:', error);
    return false;
  }
}

/**
 * Calculate valuation
 */
async function calculateValuation(formData) {
  try {
    const response = await fetch(`${API_BASE}/data/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await response.json();

    if (data.success) {
      return data.data;
    }
    throw new Error(data.error || 'Erro ao calcular valuation');
  } catch (error) {
    console.error('Calculation Error:', error);
    throw error;
  }
}

/**
 * Generate PDF report
 */
async function generatePDF(formData, valuationResult, reportType) {
  try {
    const response = await fetch(`${API_BASE}/pdf/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formData, valuationResult, reportType })
    });
    const data = await response.json();

    if (data.success) {
      return data.data;
    }
    throw new Error(data.error || 'Erro ao gerar relatório');
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
}

// ============================================================================
// Form Functions
// ============================================================================

/**
 * Update progress bar
 */
function updateProgress() {
  const progress = (AppState.currentStep / AppState.totalSteps) * 100;
  DOM.progressFill.style.width = `${progress}%`;

  // Update step indicators
  DOM.progressSteps.querySelectorAll('.step').forEach((step, index) => {
    const stepNum = index + 1;
    step.classList.remove('active', 'completed');

    if (stepNum < AppState.currentStep) {
      step.classList.add('completed');
    } else if (stepNum === AppState.currentStep) {
      step.classList.add('active');
    }
  });
}

/**
 * Show specific form step
 */
function showStep(stepNumber) {
  DOM.formSteps.forEach(step => {
    step.classList.remove('active');
    if (parseInt(step.dataset.step) === stepNumber) {
      step.classList.add('active');
    }
  });

  // Update navigation buttons
  DOM.prevBtn.disabled = stepNumber === 1;

  if (stepNumber === AppState.totalSteps) {
    DOM.nextBtn.classList.add('hidden');
    DOM.submitBtn.classList.remove('hidden');
    generateSummary();
  } else {
    DOM.nextBtn.classList.remove('hidden');
    DOM.submitBtn.classList.add('hidden');
  }

  updateProgress();
}

/**
 * Collect form data from current step
 */
function collectFormData() {
  const currentStepEl = document.querySelector(`.form-step[data-step="${AppState.currentStep}"]`);
  const inputs = currentStepEl.querySelectorAll('input, select, textarea');

  inputs.forEach(input => {
    if (input.type === 'radio') {
      if (input.checked) {
        AppState.formData[input.name] = input.value;
      }
    } else if (input.type === 'checkbox') {
      AppState.formData[input.name] = input.checked;
    } else {
      AppState.formData[input.name] = input.value;
    }
  });
}

/**
 * Validate current step
 */
function validateStep() {
  const currentStepEl = document.querySelector(`.form-step[data-step="${AppState.currentStep}"]`);
  const requiredFields = currentStepEl.querySelectorAll('[required]');
  let isValid = true;

  requiredFields.forEach(field => {
    if (field.type === 'radio') {
      const groupName = field.name;
      const checked = currentStepEl.querySelector(`input[name="${groupName}"]:checked`);
      if (!checked) {
        isValid = false;
        field.closest('.option-card')?.classList.add('error');
      }
    } else if (!field.value.trim()) {
      isValid = false;
      field.classList.add('error');
    }
  });

  return isValid;
}

/**
 * Navigate to next step
 */
function nextStep() {
  if (!validateStep()) {
    showError('Por favor, preencha todos os campos obrigatórios.');
    return;
  }

  collectFormData();

  // Show/hide startup fields based on company type
  if (AppState.currentStep === 1) {
    const companyType = AppState.formData.companyType;
    if (companyType === 'startup') {
      DOM.startupFields?.classList.remove('hidden');
    } else {
      DOM.startupFields?.classList.add('hidden');
    }
  }

  if (AppState.currentStep < AppState.totalSteps) {
    AppState.currentStep++;
    showStep(AppState.currentStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Navigate to previous step
 */
function prevStep() {
  if (AppState.currentStep > 1) {
    AppState.currentStep--;
    showStep(AppState.currentStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Generate summary for final step
 */
function generateSummary() {
  const summaryHTML = `
    <div class="summary-section">
      <h4>Dados da Empresa</h4>
      <div class="summary-row">
        <span class="summary-label">Tipo de Empresa</span>
        <span class="summary-value">${getCompanyTypeLabel(AppState.formData.companyType)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Setor de Atuação</span>
        <span class="summary-value">${AppState.formData.industry || 'Não informado'}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Faturamento LTM</span>
        <span class="summary-value">${formatCurrency(AppState.formData.revenue) || 'Não informado'}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">EBITDA</span>
        <span class="summary-value">${AppState.formData.ebitda || 0}%</span>
      </div>
    </div>

    <div class="summary-section">
      <h4>Score de Valorização</h4>
      <div class="summary-row">
        <span class="summary-label">Desempenho</span>
        <span class="summary-value">${AppState.formData.P || '-'} / 4</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Mercado</span>
        <span class="summary-value">${AppState.formData.U || '-'} / 4</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Pessoas</span>
        <span class="summary-value">${AppState.formData.BB || '-'} / 4</span>
      </div>
    </div>

    <div class="summary-section">
      <h4>Dados Cadastrais</h4>
      <div class="summary-row">
        <span class="summary-label">CNPJ</span>
        <span class="summary-value">${AppState.formData.cnpj || 'Não informado'}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Website</span>
        <span class="summary-value">${AppState.formData.website || 'Não informado'}</span>
      </div>
    </div>
  `;

  DOM.summaryContainer.innerHTML = summaryHTML;
}

/**
 * Get company type label
 */
function getCompanyTypeLabel(type) {
  const labels = {
    traditional: 'Empresa Tradicional',
    newEconomy: 'Nova Economia',
    startup: 'Startup',
    personalEquity: 'Equity Pessoal'
  };
  return labels[type] || 'Não informado';
}

/**
 * Handle CNPJ search
 */
async function handleCNPJSearch() {
  const cnpjInput = document.getElementById('cnpj');
  const cnpj = cnpjInput.value.replace(/\D/g, '');

  if (cnpj.length !== 14) {
    showError('CNPJ deve conter 14 dígitos.');
    return;
  }

  showLoading('Buscando dados do CNPJ...');

  try {
    const data = await fetchCNPJData(cnpj);
    AppState.companyData = data;

    // Populate company info
    document.getElementById('razaoSocial').textContent = data.razao_social || '-';
    document.getElementById('nomeFantasia').textContent = data.nome_fantasia || '-';
    document.getElementById('situacaoCadastral').textContent = data.situacao_cadastral || '-';
    document.getElementById('porte').textContent = data.porte || '-';
    document.getElementById('dataAbertura').textContent = data.abertura || '-';

    if (data.endereco) {
      const endereco = `${data.endereco.logradouro || ''}, ${data.endereco.numero || ''} ${data.endereco.complemento || ''} - ${data.endereco.bairro || ''}, ${data.endereco.municipio || ''} - ${data.endereco.uf || ''}`;
      document.getElementById('endereco').textContent = endereco;
    }

    // Populate address fields
    document.getElementById('cep').value = data.endereco?.cep || '';
    document.getElementById('logradouro').value = data.endereco?.logradouro || '';
    document.getElementById('cidade').value = data.endereco?.municipio || '';
    document.getElementById('estado').value = data.endereco?.uf || '';

    // Store in form data
    AppState.formData.razao_social = data.razao_social;
    AppState.formData.nome_fantasia = data.nome_fantasia;

    // Show company info
    DOM.companyInfo.classList.remove('hidden');

  } catch (error) {
    showError('Erro ao buscar CNPJ. Verifique o número e tente novamente.');
  } finally {
    hideLoading();
  }
}

/**
 * Handle CEP search
 */
async function handleCEPSearch() {
  const cepInput = document.getElementById('cep');
  const cep = cepInput.value.replace(/\D/g, '');

  if (cep.length !== 8) {
    showError('CEP deve conter 8 dígitos.');
    return;
  }

  showLoading('Buscando CEP...');

  try {
    const data = await fetchCEPData(cep);

    document.getElementById('logradouro').value = data.logradouro || '';
    document.getElementById('bairro').value = data.bairro || '';
    document.getElementById('cidade').value = data.localidade || '';
    document.getElementById('estado').value = data.uf || '';

  } catch (error) {
    showError('Erro ao buscar CEP. Verifique o número e tente novamente.');
  } finally {
    hideLoading();
  }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  if (!validateStep()) {
    showError('Por favor, preencha todos os campos obrigatórios.');
    return;
  }

  // Check if terms accepted
  if (!document.getElementById('acceptTerms').checked) {
    showError('Você precisa aceitar os Termos de Uso e Política de Privacidade.');
    return;
  }

  collectFormData();

  showLoading('Calculando valuation...');

  try {
    // Calculate valuation
    const valuationResult = await calculateValuation(AppState.formData);

    showLoading('Gerando relatório...');

    // Generate PDF
    const reportData = await generatePDF(
      AppState.formData,
      valuationResult,
      AppState.formData.reportType
    );

    // Store in history
    AppState.history.push({
      timestamp: new Date().toISOString(),
      formData: { ...AppState.formData },
      result: valuationResult
    });

    // Show result
    showResult(valuationResult, reportData);

  } catch (error) {
    showError('Erro ao processar solicitação. Tente novamente.');
    console.error(error);
  } finally {
    hideLoading();
  }
}

/**
 * Show valuation result
 */
function showResult(valuation, reportData) {
  // Create result modal
  const resultHTML = `
    <div class="result-container">
      <div class="result-header">
        <h2>Valuation Calculado</h2>
        <p class="result-company">${AppState.formData.razao_social || AppState.formData.companyName || 'Empresa'}</p>
      </div>

      <div class="result-value">
        <span class="value-label">Valor Estimado</span>
        <span class="value-amount">${formatCurrency(valuation.companyValuation)}</span>
        <span class="value-range">Faixa: ${formatCurrency(valuation.valuationRange?.min)} - ${formatCurrency(valuation.valuationRange?.max)}</span>
      </div>

      <div class="result-score">
        <span class="score-label">Score de Valorização</span>
        <span class="score-value">${valuation.score?.rating || 'N/A'}</span>
        <span class="score-desc">${getScoreDescription(valuation.score?.rating)}</span>
      </div>

      <div class="result-actions">
        <button class="btn btn-primary" onclick="downloadPDF()">Baixar Relatório PDF</button>
        <button class="btn btn-outline" onclick="newValuation()">Nova Avaliação</button>
      </div>
    </div>
  `;

  // Replace form with result
  document.querySelector('.form-container').innerHTML = resultHTML;
}

/**
 * Get score description
 */
function getScoreDescription(rating) {
  const descriptions = {
    'A': 'Excelente - Alto potencial de valorização',
    'B': 'Muito Bom - Bom potencial de valorização',
    'C': 'Bom - Potencial de valorização',
    'D': 'Regular - Oportunidades de melhoria',
    'E': 'Em Desenvolvimento - Fase de estruturação',
    'F': 'Inicial - Amplo espaço para desenvolvimento'
  };
  return descriptions[rating] || 'Não avaliado';
}

/**
 * Download PDF
 */
function downloadPDF() {
  // TODO: Implement PDF download using jsPDF
  alert('Funcionalidade em desenvolvimento. O PDF será gerado em breve.');
}

/**
 * Start new valuation
 */
function newValuation() {
  location.reload();
}

// ============================================================================
// Event Listeners
// ============================================================================

/**
 * Initialize application
 */
function init() {
  // Progress navigation
  DOM.prevBtn?.addEventListener('click', prevStep);
  DOM.nextBtn?.addEventListener('click', nextStep);

  // Form submission
  DOM.form?.addEventListener('submit', handleFormSubmit);

  // CNPJ search
  DOM.searchCnpjBtn?.addEventListener('click', handleCNPJSearch);

  // CEP search
  DOM.searchCepBtn?.addEventListener('click', handleCEPSearch);

  // Login modal
  DOM.loginBtn?.addEventListener('click', () => {
    DOM.loginModal.classList.remove('hidden');
  });

  DOM.modalClose?.addEventListener('click', () => {
    DOM.loginModal.classList.add('hidden');
  });

  DOM.loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userID = document.getElementById('userID').value;

    showLoading('Validando acesso...');

    const isValid = await validateAccess(userID);

    hideLoading();

    if (isValid) {
      AppState.isAuthenticated = true;
      AppState.userID = userID;
      DOM.loginModal.classList.add('hidden');
      alert('Acesso autorizado com sucesso!');
    } else {
      showError('Acesso não autorizado. Verifique seu ID de usuário.');
    }
  });

  // Currency input formatting
  document.querySelectorAll('#revenue, #revenueNTM, #assets, #investments, #debt, #tam, #sam, #funding').forEach(input => {
    input.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value) {
        e.target.value = new Intl.NumberFormat('pt-BR').format(value);
      }
    });
  });

  // CNPJ formatting
  document.getElementById('cnpj')?.addEventListener('input', (e) => {
    e.target.value = formatCNPJ(e.target.value);
  });

  // CEP formatting
  document.getElementById('cep')?.addEventListener('input', (e) => {
    e.target.value = formatCEP(e.target.value);
  });

  // Load saved data from localStorage
  const savedData = localStorage.getItem('valoraFormData');
  if (savedData) {
    AppState.formData = JSON.parse(savedData);
  }

  // Initialize first step
  showStep(1);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);

// Export for use in logic.js
window.AppState = AppState;
window.API = {
  calculateValuation,
  generatePDF,
  fetchCNPJData,
  fetchCEPData
};