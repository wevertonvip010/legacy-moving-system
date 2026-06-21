import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, Zap, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

// Atalhos de navegação reconhecidos pela Mirante
const NAVEGACAO = [
  { patterns: ['dashboard', 'início', 'home', 'painel'], path: '/dashboard', label: 'Dashboard' },
  { patterns: ['lead', 'leads', 'prospecção'], path: '/leads', label: 'Leads' },
  { patterns: ['cliente', 'clientes'], path: '/clientes', label: 'Clientes' },
  { patterns: ['organizer', 'organizers', 'parceira'], path: '/organizers', label: 'Organizers' },
  { patterns: ['orçamento', 'orcamento', 'orçamentos'], path: '/orcamentos', label: 'Orçamentos' },
  { patterns: ['contrato', 'contratos'], path: '/contratos', label: 'Contratos' },
  { patterns: ['ordem', 'os ', 'ordens', 'ordem de serviço'], path: '/ordens-servico', label: 'Ordens de Serviço' },
  { patterns: ['programação', 'programacao', 'agenda'], path: '/programacao', label: 'Programação' },
  { patterns: ['estoque', 'material', 'materiais'], path: '/estoque', label: 'Estoque' },
  { patterns: ['guarda', 'box', 'boxes', 'storage'], path: '/guarda-moveis', label: 'Guarda-Móveis' },
  { patterns: ['recibo', 'recibos', 'pagamento'], path: '/recibos', label: 'Recibos' },
  { patterns: ['financeiro', 'financeira', 'finanças'], path: '/financeiro', label: 'Financeiro' },
  { patterns: ['fechamento operacional', 'fechamento op'], path: '/fechamento-operacional', label: 'Fechamento Operacional' },
  { patterns: ['fechamento mensal', 'fechamento financeiro'], path: '/fechamento-financeiro', label: 'Fechamento Mensal' },
  { patterns: ['meta', 'metas', 'comercial'], path: '/metas', label: 'Painel Comercial' },
  { patterns: ['avaria', 'avarias', 'intercorrência'], path: '/avarias', label: 'Avarias' },
  { patterns: ['configuração', 'config', 'configurações'], path: '/configuracoes', label: 'Configurações' },
  { patterns: ['controladoria', 'atividade', 'usuários online', 'monitoramento'], path: '/controladoria', label: 'Controladoria' },
  { patterns: ['painel executivo', 'executivo', 'master'], path: '/painel-executivo', label: 'Painel Executivo' },
];

const ATALHOS = [
  { label: 'Como criar uma OS?', msg: 'Como criar uma Ordem de Serviço no sistema?' },
  { label: 'Status financeiro', msg: 'Como está o financeiro do mês atual?' },
  { label: 'Leads pendentes', msg: 'Quantos leads estão sem contato há mais de 3 dias?' },
  { label: 'Estoque crítico', msg: 'Quais itens do estoque estão em nível crítico?' },
  { label: 'Como gerar recibo?', msg: 'Como gerar um recibo para uma OS?' },
  { label: 'Saúde operacional', msg: 'Avalie a saúde operacional da empresa com base nos dados atuais.' },
];

const AssistenteMirante = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    if (isOpen && chatHistory.length === 0) {
      setChatHistory([{
        type: 'assistant',
        content: `Olá${user?.name ? ', ' + user.name.split(' ')[0] : ''}! 👋 Sou a **Mirante**, sua assistente de IA da Legacy Moving.\n\nPosso ajudar você a:\n• Navegar pelo sistema ("abrir leads", "ir para financeiro")\n• Analisar dados operacionais\n• Responder dúvidas sobre o sistema\n• Sugerir ações estratégicas\n\nO que você precisa?`,
        timestamp: new Date(),
      }]);
    }
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]); // eslint-disable-line

  const detectarNavegacao = (msg) => {
    const lower = msg.toLowerCase();
    for (const nav of NAVEGACAO) {
      if (nav.patterns.some(p => lower.includes(p))) {
        return nav;
      }
    }
    return null;
  };

  const enviarMensagem = async (msgOverride) => {
    const userMsg = (msgOverride || message).trim();
    if (!userMsg || loading) return;
    setMessage('');

    const nav = detectarNavegacao(userMsg);
    const userEntry = { type: 'user', content: userMsg, timestamp: new Date() };
    setChatHistory(prev => [...prev, userEntry]);
    setLoading(true);

    try {
      // Navegação local imediata
      if (nav && (userMsg.toLowerCase().includes('abrir') || userMsg.toLowerCase().includes('ir para') || userMsg.toLowerCase().includes('acessar') || userMsg.toLowerCase().includes('navegar'))) {
        setChatHistory(prev => [...prev, {
          type: 'assistant',
          content: `Abrindo ${nav.label}...`,
          timestamp: new Date(),
          nav: nav.path,
        }]);
        setTimeout(() => { navigate(nav.path); setIsOpen(false); }, 600);
        setLoading(false);
        return;
      }

      const historico = chatHistory
        .filter(m => m.type !== 'system')
        .slice(-10)
        .map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content }));
      const data = await api.miranteChat(userMsg, historico);

      // Detecta se resposta menciona página
      let navSugerida = null;
      if (data.resposta) {
        for (const nav of NAVEGACAO) {
          if (nav.patterns.some(p => data.resposta.toLowerCase().includes(p))) {
            navSugerida = nav;
            break;
          }
        }
      }

      setChatHistory(prev => [...prev, {
        type: 'assistant',
        content: data.resposta || 'Não consegui processar sua mensagem.',
        timestamp: new Date(),
        nav: navSugerida?.path,
        navLabel: navSugerida?.label,
      }]);
    } catch (e) {
      setChatHistory(prev => [...prev, {
        type: 'assistant',
        content: 'Desculpe, estou com dificuldades técnicas. Verifique se o backend está rodando e se a chave ANTHROPIC_API_KEY está configurada.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const formatText = (text) => {
    if (!text) return '';
    const lines = text.split('\n');
    const html = [];
    let inTable = false;
    let inList = false;
    let inOl = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const bold = s => s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');

      // Tabela markdown
      if (line.trim().startsWith('|')) {
        if (!inTable) {
          if (inList) { html.push('</ul>'); inList = false; }
          if (inOl) { html.push('</ol>'); inOl = false; }
          html.push('<table style="border-collapse:collapse;width:100%;font-size:11px;margin:6px 0">');
          inTable = true;
        }
        if (line.match(/^\|[\s\-:|]+\|/)) continue; // separador
        const cells = line.split('|').slice(1, -1);
        const nextIsSep = lines[i + 1] && lines[i + 1].match(/^\|[\s\-:|]+\|/);
        const tag = nextIsSep ? 'th' : 'td';
        const style = nextIsSep
          ? 'style="border:1px solid #d1d5db;padding:3px 7px;background:#f3f4f6;font-weight:600"'
          : 'style="border:1px solid #e5e7eb;padding:3px 7px"';
        html.push(`<tr>${cells.map(c => `<${tag} ${style}>${bold(c.trim())}</${tag}>`).join('')}</tr>`);
        continue;
      } else if (inTable) {
        html.push('</table>');
        inTable = false;
      }

      // Headers
      const h3 = line.match(/^###\s+(.*)/);
      const h2 = line.match(/^##\s+(.*)/);
      const h1 = line.match(/^#\s+(.*)/);
      if (h3) {
        if (inList) { html.push('</ul>'); inList = false; }
        if (inOl) { html.push('</ol>'); inOl = false; }
        html.push(`<p style="font-weight:700;font-size:12px;margin:8px 0 3px;color:#374151">${bold(h3[1])}</p>`);
      } else if (h2) {
        if (inList) { html.push('</ul>'); inList = false; }
        if (inOl) { html.push('</ol>'); inOl = false; }
        html.push(`<p style="font-weight:700;font-size:13px;margin:10px 0 4px;color:#1f2937">${bold(h2[1])}</p>`);
      } else if (h1) {
        if (inList) { html.push('</ul>'); inList = false; }
        if (inOl) { html.push('</ol>'); inOl = false; }
        html.push(`<p style="font-weight:700;font-size:14px;margin:10px 0 4px;color:#111827">${bold(h1[1])}</p>`);
      }
      // Lista com marcador
      else if (line.match(/^[-*•]\s/)) {
        if (inOl) { html.push('</ol>'); inOl = false; }
        if (!inList) { html.push('<ul style="margin:4px 0;padding-left:18px">'); inList = true; }
        html.push(`<li style="margin:2px 0">${bold(line.replace(/^[-*•]\s/, ''))}</li>`);
      }
      // Lista numerada
      else if (line.match(/^\d+\.\s/)) {
        if (inList) { html.push('</ul>'); inList = false; }
        if (!inOl) { html.push('<ol style="margin:4px 0;padding-left:18px">'); inOl = true; }
        html.push(`<li style="margin:2px 0">${bold(line.replace(/^\d+\.\s/, ''))}</li>`);
      }
      // Linha vazia
      else if (line.trim() === '') {
        if (inList) { html.push('</ul>'); inList = false; }
        if (inOl) { html.push('</ol>'); inOl = false; }
        html.push('<br style="line-height:0.5"/>');
      }
      // Texto normal
      else {
        if (inList) { html.push('</ul>'); inList = false; }
        if (inOl) { html.push('</ol>'); inOl = false; }
        html.push(`<span style="display:block;margin:1px 0">${bold(line)}</span>`);
      }
    }

    if (inTable) html.push('</table>');
    if (inList) html.push('</ul>');
    if (inOl) html.push('</ol>');
    return html.join('');
  };

  if (!user) return null;

  return (
    <>
      {/* Botão flutuante */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000 }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: isOpen ? '#374151' : 'linear-gradient(135deg, #7c3aed, #2563eb)',
            color: 'white', border: 'none', borderRadius: '50%',
            width: '52px', height: '52px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(124,58,237,0.4)', transition: 'all 0.2s',
          }}
          title="Mirante — IA Assistente"
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isOpen ? <X size={22} /> : <Bot size={22} />}
        </button>
      </div>

      {/* Painel */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '88px', right: '24px',
          width: '380px', height: '580px',
          background: 'white', borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          border: '1px solid #e5e7eb',
          zIndex: 999, display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={18} color="white" />
              </div>
              <div>
                <p style={{ color: 'white', fontWeight: '700', fontSize: '14px', margin: 0 }}>Mirante IA</p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', margin: 0 }}>Claude · Assistente operacional</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', opacity: 0.7 }}>
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {chatHistory.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 14px', borderRadius: msg.type === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.type === 'user' ? 'linear-gradient(135deg, #7c3aed, #2563eb)' : '#f3f4f6',
                  color: msg.type === 'user' ? 'white' : '#1a1a1a',
                  fontSize: '13px', lineHeight: '1.5',
                }}>
                  <p style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: formatText(msg.content) }} />
                  {msg.nav && msg.type === 'assistant' && (
                    <button onClick={() => { navigate(msg.nav); setIsOpen(false); }}
                      style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}>
                      Abrir {msg.navLabel} <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#f3f4f6', padding: '12px 16px', borderRadius: '16px 16px 16px 4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0, 0.15, 0.3].map((d, i) => (
                    <div key={i} style={{ width: '7px', height: '7px', background: '#7c3aed', borderRadius: '50%', animation: 'bounce 1s infinite', animationDelay: `${d}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Atalhos rápidos */}
          {chatHistory.length <= 1 && (
            <div style={{ padding: '0 14px 12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {ATALHOS.map((a, i) => (
                <button key={i} onClick={() => enviarMensagem(a.msg)}
                  style={{ padding: '4px 10px', background: '#f0f4ff', color: '#2563eb', border: '1px solid #dbeafe', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={10} /> {a.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
              placeholder="Pergunte algo ou diga 'ir para leads'..."
              disabled={loading}
              rows={1}
              style={{
                flex: 1, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '10px',
                fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit',
                background: loading ? '#f9fafb' : 'white', lineHeight: '1.4',
                maxHeight: '80px', overflowY: 'auto',
              }}
            />
            <button
              onClick={() => enviarMensagem()}
              disabled={loading || !message.trim()}
              style={{
                background: loading || !message.trim() ? '#e5e7eb' : 'linear-gradient(135deg, #7c3aed, #2563eb)',
                color: loading || !message.trim() ? '#9ca3af' : 'white',
                border: 'none', borderRadius: '10px', padding: '9px 12px',
                cursor: loading || !message.trim() ? 'not-allowed' : 'pointer',
                flexShrink: 0, display: 'flex', alignItems: 'center',
              }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  );
};

export default AssistenteMirante;
