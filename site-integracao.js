// ============================================================
// LEGACY MOVING — Integração Site → ERP
// Cole este bloco no final do main.js do site
// ============================================================

const LEGACY_API = 'https://SEU-BACKEND-AQUI.onrender.com'; // Trocar pela URL do backend em produção
const LEGACY_TOKEN = 'legacy-site-2026-token';

async function enviarLeadParaERP(payload) {
  try {
    const res = await fetch(`${LEGACY_API}/api/leads/site`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Site-Token': LEGACY_TOKEN,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      console.log('[Legacy ERP] Lead registrado:', data);
      return true;
    } else {
      console.warn('[Legacy ERP] Erro ao registrar lead:', data);
      return false;
    }
  } catch (e) {
    console.warn('[Legacy ERP] Falha na conexão com ERP:', e.message);
    return false;
  }
}

// Escuta eventos de lead emitidos pelo site
window.addEventListener('legacy:lead', async function(e) {
  const ok = await enviarLeadParaERP(e.detail);
  if (ok) {
    console.log('[Legacy ERP] Lead do site enviado com sucesso para o ERP.');
  }
});

// Intercepta formulário de orçamento diretamente (data-form="orcamento")
document.addEventListener('DOMContentLoaded', function() {
  const formOrcamento = document.querySelector('[data-form="orcamento"]');
  if (formOrcamento) {
    formOrcamento.addEventListener('submit', async function(e) {
      const fd = new FormData(formOrcamento);
      const payload = {
        source: 'orcamento',
        nome: fd.get('nome') || '',
        telefone: fd.get('telefone') || '',
        email: fd.get('email') || '',
        servico: fd.get('servico') || 'naosei',
        origem_cep: fd.get('origem_cep') || fd.get('cep_origem') || '',
        destino_cep: fd.get('destino_cep') || fd.get('cep_destino') || '',
        data_desejada: fd.get('data_desejada') || fd.get('data') || '',
        tamanho: fd.get('tamanho') || '',
        observacoes: fd.get('observacoes') || fd.get('mensagem') || '',
        timestamp: new Date().toISOString(),
      };
      await enviarLeadParaERP(payload);
    });
  }

  // Intercepta formulário do Guia (data-form="guia")
  const formGuia = document.querySelector('[data-form="guia"]');
  if (formGuia) {
    formGuia.addEventListener('submit', async function(e) {
      const fd = new FormData(formGuia);
      const email = fd.get('email') || '';
      const whatsapp = fd.get('whatsapp') || fd.get('telefone') || '';
      const payload = {
        source: 'guia-legacy',
        channel: email ? 'email' : 'whatsapp',
        contact: email || whatsapp,
        timestamp: new Date().toISOString(),
      };
      await enviarLeadParaERP(payload);
    });
  }
});
