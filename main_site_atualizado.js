// LEGACY MOVING — Interações v1.3
// Integração Site → ERP (Legacy Moving System)
(function () {
  'use strict';

  // ─── Configuração do ERP ──────────────────────────────────────────────────
  // Altere LEGACY_API para a URL do backend em produção.
  // Ex: 'https://legacy-erp.fly.dev' ou 'https://legacy-moving-api.onrender.com'
  var LEGACY_CONFIG = window.LEGACY_CONFIG || {};
  var LEGACY_API   = LEGACY_CONFIG.api   || 'https://legacy-moving-api.onrender.com';
  var LEGACY_TOKEN = LEGACY_CONFIG.token || 'legacy-site-2026-token';

  // ─── Hero carrossel — fade automático ────────────────────────────────────
  var slides     = document.querySelectorAll('.hero__slide');
  var indicators = document.querySelectorAll('.hero__indicator');
  if (slides.length > 1) {
    var current = 0;
    var timer   = null;
    var goTo = function (idx) {
      slides[current].classList.remove('active');
      if (indicators[current]) indicators[current].classList.remove('active');
      current = idx;
      slides[current].classList.add('active');
      if (indicators[current]) indicators[current].classList.add('active');
    };
    var next       = function () { goTo((current + 1) % slides.length); };
    var startAuto  = function () { timer = setInterval(next, 5500); };
    var stopAuto   = function () { clearInterval(timer); };
    indicators.forEach(function (btn, idx) {
      btn.addEventListener('click', function () { stopAuto(); goTo(idx); startAuto(); });
    });
    startAuto();
  }

  // ─── Menu mobile toggle ───────────────────────────────────────────────────
  var menuToggle = document.querySelector('.menu-toggle');
  var siteNav    = document.querySelector('.site-nav');
  if (menuToggle && siteNav) {
    menuToggle.addEventListener('click', function () {
      siteNav.classList.toggle('active');
    });
  }

  // ─── Reveal on scroll ─────────────────────────────────────────────────────
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { obs.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  // ─── Enviar lead ao ERP (em background, silencioso) ──────────────────────
  function enviarLeadERP(payload) {
    if (!LEGACY_API) return;
    fetch(LEGACY_API + '/api/leads/site', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Site-Token': LEGACY_TOKEN
      },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (res.ok) {
        console.info('[Legacy ERP] Lead registrado com sucesso:', payload.source);
      } else {
        console.warn('[Legacy ERP] Resposta inesperada:', res.status);
      }
    }).catch(function (e) {
      console.warn('[Legacy ERP] Backend offline ou URL não configurada:', e.message);
    });
  }

  // ─── Feedback visual nos formulários ──────────────────────────────────────
  function mostrarFeedback(form, tipo, msg) {
    // Remove feedback anterior
    var anterior = form.querySelector('.form__feedback');
    if (anterior) anterior.remove();

    var div = document.createElement('div');
    div.className = 'form__feedback form__feedback--' + tipo;
    div.setAttribute('role', 'alert');
    div.style.cssText = [
      'padding: 14px 20px',
      'border-radius: 6px',
      'margin-top: 16px',
      'font-size: 15px',
      'font-weight: 500',
      tipo === 'sucesso'
        ? 'background:#d4edda;color:#155724;border:1px solid #c3e6cb'
        : 'background:#f8d7da;color:#721c24;border:1px solid #f5c6cb'
    ].join(';');
    div.textContent = msg;
    form.appendChild(div);

    if (tipo === 'sucesso') {
      setTimeout(function () { if (div.parentNode) div.remove(); }, 6000);
    }
  }

  function setBotaoEstado(btn, estado) {
    if (!btn) return;
    if (estado === 'enviando') {
      btn.dataset.textoOriginal = btn.textContent;
      btn.textContent = 'Enviando…';
      btn.disabled = true;
      btn.style.opacity = '0.7';
    } else {
      btn.textContent = btn.dataset.textoOriginal || 'Enviar';
      btn.disabled = false;
      btn.style.opacity = '';
    }
  }

  // ─── Formulário Guia (captura de lead) ───────────────────────────────────
  var guideForm = document.querySelector('[data-form="guia"]');
  if (guideForm) {
    guideForm.addEventListener('submit', function (e) {
      e.preventDefault(); // impede envio nativo / reload da página

      var channelEl = guideForm.querySelector('input[name="canal"]:checked');
      var contactEl = guideForm.querySelector('[name="contato"]');
      var channel   = channelEl ? channelEl.value : 'email';
      var contact   = contactEl ? contactEl.value.trim() : '';

      if (!contact) {
        mostrarFeedback(guideForm, 'erro', 'Por favor, informe seu e-mail ou WhatsApp.');
        return;
      }

      var btn = guideForm.querySelector('[type="submit"]');
      setBotaoEstado(btn, 'enviando');

      var payload = {
        source:    'guia-legacy',
        channel:   channel,
        contact:   contact,
        timestamp: new Date().toISOString()
      };

      // Envia ao ERP
      enviarLeadERP(payload);

      // Emite evento global (compatibilidade)
      window.dispatchEvent(new CustomEvent('legacy:lead', { detail: payload }));

      // Feedback ao usuário
      setBotaoEstado(btn, 'normal');
      mostrarFeedback(guideForm, 'sucesso',
        'Recebemos seu contato! Falaremos com você em breve.');
      guideForm.reset();
    });
  }

  // ─── Formulário Orçamento ─────────────────────────────────────────────────
  var orcForm = document.querySelector('[data-form="orcamento"]');
  if (orcForm) {
    orcForm.addEventListener('submit', function (e) {
      e.preventDefault(); // impede envio nativo / reload da página

      var data = new FormData(orcForm);

      var nome     = (data.get('nome')     || '').trim();
      var telefone = (data.get('telefone') || '').trim();
      var email    = (data.get('email')    || '').trim();

      if (!nome || !telefone) {
        mostrarFeedback(orcForm, 'erro', 'Preencha nome e telefone para continuar.');
        return;
      }

      var btn = orcForm.querySelector('[type="submit"]');
      setBotaoEstado(btn, 'enviando');

      var payload = {
        source:        'orcamento',
        nome:          nome,
        telefone:      telefone,
        email:         email,
        servico:       data.get('servico')       || '',
        origem_cep:    data.get('origem')        || '',
        destino_cep:   data.get('destino')       || '',
        data_desejada: data.get('data')          || '',
        tamanho:       data.get('tamanho')       || '',
        observacoes:   data.get('observacoes')   || '',
        timestamp:     new Date().toISOString()
      };

      // Envia ao ERP
      enviarLeadERP(payload);

      // Emite evento global (compatibilidade)
      window.dispatchEvent(new CustomEvent('legacy:lead', { detail: payload }));

      // Feedback ao usuário
      setBotaoEstado(btn, 'normal');
      mostrarFeedback(orcForm, 'sucesso',
        'Orçamento solicitado com sucesso! Retornaremos em até 24 horas úteis.');
      orcForm.reset();
    });
  }

})();
