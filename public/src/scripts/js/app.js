/**
 * VALORA by METADAX — Application State & Controller
 * Handles navigation, validation, API calls, UI feedback
 */

// ─── State ──────────────────────────────────────────
const AppState = {
  currentStep: 1,
  totalSteps: 8,
  formData: {},
  companyData: null,
  isAuthenticated: false,
  sessionToken: null,
  userID: null,
  userName: null
};

const API_BASE = '/api/v1';

// ─── DOM ────────────────────────────────────────────
const DOM = {};

function initDOM() {
  DOM.progressFill    = document.getElementById('progressFill');
  DOM.progressSteps   = document.getElementById('progressSteps');
  DOM.form            = document.getElementById('valuationForm');
  DOM.formSteps       = document.querySelectorAll('.form-step');
  DOM.prevBtn         = document.getElementById('prevBtn');
  DOM.nextBtn         = document.getElementById('nextBtn');
  DOM.submitBtn       = document.getElementById('submitBtn');
  DOM.stepCounter     = document.getElementById('stepCounter');
  DOM.loginModal      = document.getElementById('loginModal');
  DOM.loginBtn        = document.getElementById('loginBtn');
  DOM.logoutBtn       = document.getElementById('logoutBtn');
  DOM.modalClose      = document.getElementById('modalClose');
  DOM.loginSubmitBtn  = document.getElementById('loginSubmitBtn');
  DOM.loginError      = document.getElementById('loginError');
  DOM.userTagContainer= document.getElementById('userTagContainer');
  DOM.userTagName     = document.getElementById('userTagName');
  DOM.companyInfo     = document.getElementById('companyInfo');
  DOM.searchCnpjBtn   = document.getElementById('searchCnpjBtn');
  DOM.searchCepBtn    = document.getElementById('searchCepBtn');
  DOM.startupFields   = document.getElementById('startupFields');
  DOM.summaryContainer= document.getElementById('summaryContainer');
  DOM.loadingOverlay  = document.getElementById('loadingOverlay');
}

// ─── Utilities ──────────────────────────────────────
function formatCurrency(value) {
  const num = typeof value === 'string'
    ? parseFloat(value.replace(/\D/g, '')) || 0
    : parseFloat(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(num);
}

function formatCNPJ(v) {
  return v.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function formatCEP(v) {
  return v.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
}

function showLoading(msg = 'Processando...') {
  if (DOM.loadingOverlay) {
    DOM.loadingOverlay.querySelector('p').textContent = msg;
    DOM.loadingOverlay.classList.remove('hidden');
  }
}

function hideLoading() {
  DOM.loadingOverlay?.classList.add('hidden');
}

function showAlert(containerId, message, type = 'error') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = message;
  el.className = `alert alert-${type}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

// ─── Toast Feedback ─────────────────────────────────
function showToast(message, type = 'success') {
  let toast = document.getElementById('valoraGlobalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'valoraGlobalToast';
    document.body.appendChild(toast);
  }
  toast.className = `valora-toast ${type} show`;
  toast.innerHTML = type === 'success' ? `✓ ${message}` : `⚠ ${message}`;
  
  // Haptic feedback for mobile
  if (window.navigator && window.navigator.vibrate) {
    if (type === 'error') window.navigator.vibrate([50, 50, 50]);
    else window.navigator.vibrate([50]);
  }

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// ─── API ────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (AppState.sessionToken) headers['Authorization'] = `Bearer ${AppState.sessionToken}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return res.json();
}

async function fetchCNPJData(cnpj) {
  const data = await apiFetch('/useapis/cnpj', {
    method: 'POST',
    body: JSON.stringify({ cnpj: cnpj.replace(/\D/g, '') })
  });
  if (!data.success) throw new Error(data.error || 'Erro ao buscar CNPJ');
  return data.data;
}

async function fetchCEPData(cep) {
  const data = await apiFetch('/useapis/cep', {
    method: 'POST',
    body: JSON.stringify({ cep: cep.replace(/\D/g, '') })
  });
  if (!data.success) throw new Error(data.error || 'Erro ao buscar CEP');
  return data.data;
}

async function loginUser(userID) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userID })
  });
  return data;
}

async function calculateValuation(formData) {
  const data = await apiFetch('/data/calculate', {
    method: 'POST',
    body: JSON.stringify(formData)
  });
  if (!data.success) throw new Error(data.error || 'Erro ao calcular valuation');
  return data.data;
}

async function generatePDFReport(formData, valuationResult, reportType) {
  const data = await apiFetch('/pdf/generate', {
    method: 'POST',
    body: JSON.stringify({ formData, valuationResult, reportType })
  });
  if (!data.success) throw new Error(data.error || 'Erro ao gerar PDF');
  return data.data;
}

// ─── Auth UI ─────────────────────────────────────────
function setAuthUI(authenticated, name) {
  if (authenticated) {
    DOM.loginBtn?.classList.add('hidden');
    DOM.logoutBtn?.classList.remove('hidden');
    DOM.userTagContainer?.classList.remove('hidden');
    if (DOM.userTagName) DOM.userTagName.textContent = name || AppState.userID;
  } else {
    DOM.loginBtn?.classList.remove('hidden');
    DOM.logoutBtn?.classList.add('hidden');
    DOM.userTagContainer?.classList.add('hidden');
  }
}

// ─── Progress ────────────────────────────────────────
function updateProgress() {
  const pct = (AppState.currentStep / AppState.totalSteps) * 100;
  if (DOM.progressFill) DOM.progressFill.style.width = `${pct}%`;
  if (DOM.stepCounter) DOM.stepCounter.textContent = `Passo ${AppState.currentStep} de ${AppState.totalSteps}`;

  document.querySelectorAll('#progressSteps .step').forEach((step, i) => {
    const n = i + 1;
    step.classList.remove('active', 'completed');
    if (n < AppState.currentStep) step.classList.add('completed');
    else if (n === AppState.currentStep) step.classList.add('active');
  });
}

// ─── Step Navigation ─────────────────────────────────
function showStep(n) {
  DOM.formSteps.forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.step) === n);
  });

  DOM.prevBtn.disabled = n === 1;

  if (n === AppState.totalSteps) {
    DOM.nextBtn.classList.add('hidden');
    DOM.submitBtn.classList.remove('hidden');
    generateSummary();
  } else {
    DOM.nextBtn.classList.remove('hidden');
    DOM.submitBtn.classList.add('hidden');
  }

  updateProgress();
}

function collectFormData() {
  const stepEl = document.querySelector(`.form-step[data-step="${AppState.currentStep}"]`);
  stepEl?.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.type === 'radio') { if (el.checked) AppState.formData[el.name] = el.value; }
    else if (el.type === 'checkbox') AppState.formData[el.name] = el.checked;
    else if (el.name) AppState.formData[el.name] = el.value;
  });
}

function validateStep() {
  const stepEl = document.querySelector(`.form-step[data-step="${AppState.currentStep}"]`);
  let valid = true;

  stepEl?.querySelectorAll('[required]').forEach(field => {
    if (field.type === 'radio') {
      const name = field.name;
      const checked = stepEl.querySelector(`input[name="${name}"]:checked`);
      if (!checked) valid = false;
    } else if (field.type === 'checkbox') {
      if (!field.checked) valid = false;
    } else if (!field.value.trim()) {
      valid = false;
      field.style.borderColor = 'var(--scarlet)';
      setTimeout(() => field.style.borderColor = '', 2500);
    }
  });
  return valid;
}

function nextStep() {
  if (!validateStep()) {
    // Brief shake animation on form nav
    DOM.nextBtn.style.animation = 'shake 0.3s ease';
    setTimeout(() => DOM.nextBtn.style.animation = '', 300);
    return;
  }
  collectFormData();

  // Show startup fields on step 7 if needed
  if (AppState.currentStep === 1 && AppState.formData.companyType === 'startup') {
    DOM.startupFields?.classList.remove('hidden');
  } else if (AppState.currentStep === 1) {
    DOM.startupFields?.classList.add('hidden');
  }

  if (AppState.currentStep < AppState.totalSteps) {
    AppState.currentStep++;
    showStep(AppState.currentStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function prevStep() {
  if (AppState.currentStep > 1) {
    AppState.currentStep--;
    showStep(AppState.currentStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ─── Summary ─────────────────────────────────────────
function getCompanyTypeLabel(t) {
  return { traditional: 'Empresa Tradicional', newEconomy: 'Nova Economia', startup: 'Startup', personalEquity: 'Equity Pessoal' }[t] || '—';
}

function generateSummary() {
  if (!DOM.summaryContainer) return;
  const d = AppState.formData;
  DOM.summaryContainer.innerHTML = `
    <div style="display:grid;gap:16px">
      <div>
        <div style="font-family:'DM Mono',monospace;font-size:0.65rem;letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px">Empresa</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${row('Tipo', getCompanyTypeLabel(d.companyType))}
          ${row('Setor', d.industry || '—')}
          ${row('Faturamento LTM', d.revenue ? formatCurrency(d.revenue.replace(/\D/g,'')) : '—')}
          ${row('EBITDA', d.ebitda ? d.ebitda + '%' : '—')}
          ${row('CNPJ', d.cnpj || '—')}
          ${row('Website', d.website || '—')}
        </div>
      </div>
      <div>
        <div style="font-family:'DM Mono',monospace;font-size:0.65rem;letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px">Scores Principais</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${row('Crescimento (P)', scoreLabel(d.P))}
          ${row('Recorrência (Q)', scoreLabel(d.Q))}
          ${row('Mercado (U)', scoreLabel(d.U))}
          ${row('Equipe (BB)', scoreLabel(d.BB))}
        </div>
      </div>
    </div>`;
}

function row(label, value) {
  return `<div style="background:var(--ink-soft);border:1px solid var(--border);border-radius:4px;padding:10px 12px">
    <div style="font-family:'DM Mono',monospace;font-size:0.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">${label}</div>
    <div style="font-size:0.85rem;color:var(--text-primary);font-weight:600">${value}</div>
  </div>`;
}

function scoreLabel(v) {
  return { '1': '1 — Baixo', '2': '2 — Básico', '3': '3 — Bom', '4': '4 — Alto' }[v] || '—';
}

// ─── CNPJ / CEP ──────────────────────────────────────
async function handleCNPJSearch() {
  const cnpjInput = document.getElementById('cnpj');
  const cnpj = cnpjInput?.value.replace(/\D/g, '');
  if (!cnpj || cnpj.length !== 14) { alert('CNPJ deve ter 14 dígitos.'); return; }

  showLoading('Buscando CNPJ via BrasilAPI...');
  try {
    const d = await fetchCNPJData(cnpj);
    AppState.companyData = d;
    
    // Dispara integracao AXIO de forma assincrona e silenciosa
    fetch(`${API_BASE}/useapis/axio/${cnpj}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d)
    }).catch(err => console.warn('Falha silenciosa ao registrar no AXIO', err));

    document.getElementById('razaoSocial').textContent = d.razao_social || '—';
    document.getElementById('nomeFantasia').textContent = d.nome_fantasia || '—';
    document.getElementById('situacaoCadastral').textContent = d.situacao_cadastral || '—';
    document.getElementById('porte').textContent = d.porte || '—';
    document.getElementById('dataAbertura').textContent = d.abertura || '—';
    if (d.endereco) {
      document.getElementById('endereco').textContent =
        `${d.endereco.logradouro || ''}, ${d.endereco.numero || ''} — ${d.endereco.municipio || ''} / ${d.endereco.uf || ''}`;
      document.getElementById('cep').value = d.endereco.cep || '';
      document.getElementById('logradouro').value = d.endereco.logradouro || '';
      document.getElementById('bairro').value = d.endereco.bairro || '';
      document.getElementById('cidade').value = d.endereco.municipio || '';
      document.getElementById('estado').value = d.endereco.uf || '';
    }
    AppState.formData.razao_social = d.razao_social;
    AppState.formData.nome_fantasia = d.nome_fantasia;
    DOM.companyInfo?.classList.remove('hidden');
  } catch {
    alert('Erro ao buscar CNPJ. Verifique o número e tente novamente.');
  } finally { hideLoading(); }
}

async function handleCEPSearch() {
  const cepInput = document.getElementById('cep');
  const cep = cepInput?.value.replace(/\D/g, '');
  if (!cep || cep.length !== 8) { alert('CEP deve ter 8 dígitos.'); return; }

  showLoading('Buscando endereço...');
  try {
    const d = await fetchCEPData(cep);
    document.getElementById('logradouro').value = d.logradouro || '';
    document.getElementById('bairro').value = d.bairro || '';
    document.getElementById('cidade').value = d.localidade || '';
    document.getElementById('estado').value = d.uf || '';
  } catch {
    alert('Erro ao buscar CEP. Verifique o número e tente novamente.');
  } finally { hideLoading(); }
}

// ─── Form Submit ─────────────────────────────────────
async function handleFormSubmit(e) {
  e.preventDefault();
  if (!validateStep()) return;
  if (!document.getElementById('acceptTerms')?.checked) {
    alert('Você precisa aceitar os Termos de Uso.'); return;
  }

  collectFormData();
  showLoading('Calculando valuation...');

  try {
    const result = await calculateValuation(AppState.formData);
    showLoading('Gerando relatório PDF...');
    let reportData = null;
    try { reportData = await generatePDFReport(AppState.formData, result, AppState.formData.reportType); } catch {}
    showResult(result, reportData);
  } catch (err) {
    console.error(err);
    alert('Erro ao processar. Tente novamente.');
  } finally { hideLoading(); }
}

// ─── Result Screen ───────────────────────────────────
function getScoreDesc(r) {
  return {
    A: 'Excelente — Alto potencial de valorização',
    B: 'Muito Bom — Forte potencial',
    C: 'Bom — Potencial moderado',
    D: 'Regular — Oportunidades de melhoria',
    E: 'Em desenvolvimento',
    F: 'Inicial — Amplo espaço para crescer'
  }[r] || 'Não avaliado';
}

function showResult(valuation, reportData) {
  const companyName = AppState.formData.razao_social || AppState.formData.nome_fantasia || 'Empresa';
  const fc = (v) => formatCurrency(v);

  document.querySelector('.form-container').innerHTML = `
    <div style="animation:fadeSlideIn .4s ease">
      <div style="text-align:center;margin-bottom:40px">
        <div style="font-family:'DM Mono',monospace;font-size:0.7rem;letter-spacing:.2em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px">Parecer Técnico de Valuation</div>
        <h1 style="font-family:'DM Serif Display',serif;font-size:1.5rem;font-style:italic;color:var(--text-primary)">${companyName}</h1>
      </div>

      <div class="result-section">
        <div class="result-main">
          <div class="result-label">Valuation Estimado</div>
          <div class="result-value">${fc(valuation.companyValuation)}</div>
          <div class="result-range">Faixa: ${fc(valuation.valuationRange?.min)} — ${fc(valuation.valuationRange?.max)}</div>
        </div>
        <div class="result-grid">
          <div class="result-item">
            <div class="result-item-label">Score</div>
            <div class="result-item-value" style="font-family:'DM Serif Display',serif;font-style:italic;color:var(--gold);font-size:2rem">${valuation.score?.rating || '—'}</div>
            <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:4px">${getScoreDesc(valuation.score?.rating)}</div>
          </div>
          <div class="result-item">
            <div class="result-item-label">Tipo</div>
            <div class="result-item-value">${getCompanyTypeLabel(AppState.formData.companyType)}</div>
          </div>
          <div class="result-item">
            <div class="result-item-label">Setor</div>
            <div class="result-item-value" style="font-size:0.9rem">${AppState.formData.industry || '—'}</div>
          </div>
          <div class="result-item">
            <div class="result-item-label">Validade</div>
            <div class="result-item-value" style="font-size:0.9rem">90 dias</div>
          </div>
        </div>
      </div>

      ${valuation.valuations?.length ? `
      <div class="card" style="margin-bottom:16px">
        <div class="card-header">
          <div class="card-icon">📐</div>
          <div><div class="card-title">Metodologias Aplicadas</div><div class="card-subtitle">Pesos compostos por tipo de empresa</div></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${valuation.valuations.map(v => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:0.85rem;color:var(--text-secondary)">${v.method}</span>
              <span style="font-family:'DM Mono',monospace;font-size:0.9rem;color:var(--text-primary)">${fc(v.value)}</span>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      <div style="display:flex;gap:12px;margin-top:32px">
        <button class="btn btn-primary btn-lg" onclick="downloadPDF()">↓ Baixar Relatório PDF</button>
        <button class="btn btn-outline btn-lg" onclick="location.reload()">Nova Avaliação</button>
      </div>

      <div style="margin-top:32px;padding:20px;background:var(--ink-soft);border:1px solid var(--border);border-radius:8px">
        <p style="font-family:'DM Mono',monospace;font-size:0.72rem;color:var(--text-muted);line-height:1.7">
          ⚠ Este relatório é uma avaliação estratégica de marketing e inovação. Não constitui avaliação financeira oficial.
          Responsável Técnico: Pedro Paulo Rosemberg da Silva Oliveira (CRA-SP 6-009145) — METADAX TECNOLOGIA E SERVICOS LTDA.
        </p>
      </div>
    </div>`;

  // Store result globally for PDF download
  window._lastValuationResult = valuation;
  window._lastReportData = reportData;

  document.querySelector('.progress-container').classList.add('hidden');
}

// downloadPDF é implementado e chamado do logic.js 
window.downloadPDFFromData = function() {
  console.warn("Função legada. Utilize downloadPDF() do logic.js");
};

// ─── Input Masking ───────────────────────────────────
function initInputMasks() {
  ['revenue','revenueNTM','assets','investments','debt','tam','sam','funding'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', e => {
      const raw = e.target.value.replace(/\D/g, '');
      if (raw) e.target.value = new Intl.NumberFormat('pt-BR').format(raw);
    });
  });
  document.getElementById('cnpj')?.addEventListener('input', e => {
    const clean = e.target.value.replace(/\D/g, '').substring(0, 14);
    e.target.value = formatCNPJ(clean);
  });
  document.getElementById('cep')?.addEventListener('input', e => {
    const clean = e.target.value.replace(/\D/g, '').substring(0, 8);
    e.target.value = formatCEP(clean);
  });
}

// ─── Init ────────────────────────────────────────────
function init() {
  initDOM();

  DOM.prevBtn?.addEventListener('click', prevStep);
  DOM.nextBtn?.addEventListener('click', nextStep);
  DOM.form?.addEventListener('submit', handleFormSubmit);
  DOM.searchCnpjBtn?.addEventListener('click', handleCNPJSearch);
  DOM.searchCepBtn?.addEventListener('click', handleCEPSearch);

  // Modal open
  DOM.loginBtn?.addEventListener('click', () => DOM.loginModal?.classList.remove('hidden'));
  DOM.modalClose?.addEventListener('click', () => DOM.loginModal?.classList.add('hidden'));
  DOM.loginModal?.addEventListener('click', e => { if (e.target === DOM.loginModal) DOM.loginModal.classList.add('hidden'); });

  // Login submit
  DOM.loginSubmitBtn?.addEventListener('click', async () => {
    const userID = document.getElementById('userID')?.value?.trim();
    if (!userID) { showAlert('loginError', 'Informe seu ID de usuário.'); return; }

    DOM.loginSubmitBtn.textContent = 'Verificando...';
    DOM.loginSubmitBtn.disabled = true;

    try {
      const res = await loginUser(userID);
      if (res.success) {
        AppState.isAuthenticated = true;
        AppState.sessionToken = res.data.sessionToken;
        AppState.userID = res.data.userID;
        AppState.userName = res.data.name;
        DOM.loginModal?.classList.add('hidden');
        setAuthUI(true, res.data.name);
      } else {
        showAlert('loginError', res.error || 'Acesso não autorizado.');
      }
    } catch {
      showAlert('loginError', 'Erro de conexão. Tente novamente.');
    } finally {
      DOM.loginSubmitBtn.textContent = 'Acessar';
      DOM.loginSubmitBtn.disabled = false;
    }
  });

  // Logout
  DOM.logoutBtn?.addEventListener('click', () => {
    AppState.isAuthenticated = false;
    AppState.sessionToken = null;
    AppState.userID = null;
    setAuthUI(false);
  });

  initInputMasks();
  showStep(1);
}

// Add shake keyframe if not present
const style = document.createElement('style');
style.textContent = `@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', init);

// Global exports
window.AppState = AppState;
window.API = { calculateValuation, generatePDFReport, fetchCNPJData, fetchCEPData };
