import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  MessageCircle, 
  Lightbulb, 
  HelpCircle, 
  Zap,
  Brain,
  Sparkles,
  User,
  Settings,
  RefreshCw,
  Copy,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

const IAMirante = ({ isOpen, onToggle, onClose }) => {
  const [mensagem, setMensagem] = useState('');
  const [conversas, setConversas] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sugestoes, setSugestoes] = useState([]);
  const messagesEndRef = useRef(null);

  // Sugestões predefinidas
  const sugestoesPredefinidas = [
    "Como usar o sistema de orçamentos?",
    "Gerar relatório de vendas",
    "Configurar notificações",
    "Exportar dados financeiros",
    "Agendar visita técnica",
    "Criar nova campanha de marketing",
    "Verificar status dos boxes",
    "Gerar contrato automático"
  ];

  // Respostas mockadas da IA Mirante
  const respostasMock = {
    "como usar": "Para usar o sistema de orçamentos, acesse o menu 'Orçamentos' na sidebar. Clique em 'Novo Orçamento', preencha os dados do cliente e adicione os itens. O sistema calculará automaticamente os totais e você poderá enviar por email ou WhatsApp.",
    
    "relatório": "Para gerar relatórios de vendas, vá em 'Gráficos' > 'Analytics'. Você pode filtrar por período, vendedor ou tipo de serviço. Use o botão 'Exportar' para baixar em PDF ou Excel.",
    
    "notificações": "Configure notificações em 'Configurações' > 'Notificações'. Você pode ativar alertas por email para: vencimento de contratos, boxes vagos, estoque baixo e novos leads.",
    
    "financeiro": "No módulo 'Financeiro', você encontra duas abas: Self Storage e Mudanças. Use os filtros de data e categoria. O botão 'Exportar' gera relatórios detalhados em Excel.",
    
    "visita": "Para agendar visitas, acesse 'Visitas' > 'Nova Visita'. Preencha os dados, selecione o técnico responsável e a data. O sistema sincroniza automaticamente com o Google Agenda.",
    
    "marketing": "No módulo 'Marketing', clique em 'Nova Campanha'. Escolha o tipo de mídia, defina orçamento e período. O sistema acompanha ROI e métricas automaticamente.",
    
    "boxes": "Verifique o status dos boxes em 'Self Storage'. Use os filtros para ver apenas livres, ocupados ou em manutenção. O mapa visual mostra a ocupação em tempo real.",
    
    "contrato": "Contratos são gerados automaticamente quando um orçamento é aprovado. Acesse 'Contratos' > 'Gerar Novo' ou use o botão na tela do orçamento aprovado.",
    
    "default": "Olá! Sou o Mirante, seu assistente inteligente da VIP Mudanças. Posso ajudar com dúvidas sobre o sistema, gerar sugestões de texto, explicar funcionalidades e muito mais. Como posso ajudar você hoje?"
  };

  useEffect(() => {
    if (isOpen && conversas.length === 0) {
      // Mensagem de boas-vindas
      setConversas([{
        id: 1,
        tipo: 'bot',
        mensagem: "👋 Olá! Sou o **Mirante**, seu assistente inteligente da VIP Mudanças!\n\nPosso ajudar você com:\n• Explicações sobre o sistema\n• Sugestões de texto para clientes\n• Geração de mensagens automáticas\n• Dicas de uso dos módulos\n\nComo posso ajudar você hoje?",
        timestamp: new Date()
      }]);
      
      setSugestoes(sugestoesPredefinidas.slice(0, 4));
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [conversas]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const enviarMensagem = async (texto = mensagem) => {
    if (!texto.trim()) return;

    const novaMensagem = {
      id: Date.now(),
      tipo: 'user',
      mensagem: texto,
      timestamp: new Date()
    };

    setConversas(prev => [...prev, novaMensagem]);
    setMensagem('');
    setIsTyping(true);

    // Simular delay de resposta
    setTimeout(() => {
      const resposta = gerarResposta(texto);
      const respostaMirante = {
        id: Date.now() + 1,
        tipo: 'bot',
        mensagem: resposta,
        timestamp: new Date()
      };

      setConversas(prev => [...prev, respostaMirante]);
      setIsTyping(false);
      
      // Atualizar sugestões
      atualizarSugestoes();
    }, 1500);
  };

  const gerarResposta = (pergunta) => {
    const perguntaLower = pergunta.toLowerCase();
    
    if (perguntaLower.includes('orçamento') || perguntaLower.includes('como usar')) {
      return respostasMock["como usar"];
    } else if (perguntaLower.includes('relatório') || perguntaLower.includes('vendas')) {
      return respostasMock["relatório"];
    } else if (perguntaLower.includes('notificação') || perguntaLower.includes('configurar')) {
      return respostasMock["notificações"];
    } else if (perguntaLower.includes('financeiro') || perguntaLower.includes('exportar')) {
      return respostasMock["financeiro"];
    } else if (perguntaLower.includes('visita') || perguntaLower.includes('agendar')) {
      return respostasMock["visita"];
    } else if (perguntaLower.includes('marketing') || perguntaLower.includes('campanha')) {
      return respostasMock["marketing"];
    } else if (perguntaLower.includes('box') || perguntaLower.includes('storage')) {
      return respostasMock["boxes"];
    } else if (perguntaLower.includes('contrato') || perguntaLower.includes('gerar')) {
      return respostasMock["contrato"];
    } else if (perguntaLower.includes('mensagem') || perguntaLower.includes('cliente')) {
      return "Posso ajudar a criar mensagens personalizadas! Aqui estão alguns modelos:\n\n**Pós-mudança:**\n'Olá [Nome]! Sua mudança foi concluída com sucesso. Esperamos que esteja satisfeito com nosso serviço. Avalie-nos no Google: [link]'\n\n**Lembrete de pagamento:**\n'Olá [Nome], seu box [número] vence em 3 dias. Acesse nosso site para renovar: [link]'\n\nQue tipo de mensagem você precisa?";
    } else if (perguntaLower.includes('ajuda') || perguntaLower.includes('help')) {
      return "Claro! Aqui estão as principais funcionalidades que posso ajudar:\n\n🏠 **Dashboard** - Visão geral do negócio\n📋 **Orçamentos** - Criar e gerenciar propostas\n📄 **Contratos** - Gerar contratos automáticos\n🚛 **Ordens de Serviço** - Organizar equipes\n💰 **Financeiro** - Controle de receitas/despesas\n📦 **Self Storage** - Gestão de boxes\n📊 **Gráficos** - Analytics e relatórios\n🎯 **Marketing** - Campanhas e ROI\n\nSobre qual módulo você gostaria de saber mais?";
    } else {
      return respostasMock["default"];
    }
  };

  const atualizarSugestoes = () => {
    const novasSugestoes = sugestoesPredefinidas
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    setSugestoes(novasSugestoes);
  };

  const copiarMensagem = (texto) => {
    navigator.clipboard.writeText(texto);
    alert('Mensagem copiada para a área de transferência!');
  };

  const avaliarResposta = (id, tipo) => {
    alert(`Obrigado pelo feedback! Sua avaliação (${tipo}) foi registrada.`);
  };

  const limparConversa = () => {
    setConversas([{
      id: 1,
      tipo: 'bot',
      mensagem: "Conversa limpa! Como posso ajudar você agora?",
      timestamp: new Date()
    }]);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${isMinimized ? 'w-80' : 'w-96'} transition-all duration-300`}>
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Bot className="h-8 w-8" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h3 className="font-bold text-lg">Mirante</h3>
                <p className="text-blue-100 text-sm">Assistente IA da VIP</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-white/20 rounded"
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/20 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Chat Area */}
            <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {conversas.map((conversa) => (
                <div key={conversa.id} className={`flex ${conversa.tipo === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    conversa.tipo === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-800 shadow-sm border'
                  }`}>
                    <div className="flex items-start space-x-2">
                      {conversa.tipo === 'bot' && (
                        <Bot className="h-4 w-4 mt-1 text-blue-600 flex-shrink-0" />
                      )}
                      {conversa.tipo === 'user' && (
                        <User className="h-4 w-4 mt-1 text-white flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="text-sm whitespace-pre-line">{conversa.mensagem}</div>
                        <div className="flex items-center justify-between mt-2">
                          <div className={`text-xs ${conversa.tipo === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                            {conversa.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {conversa.tipo === 'bot' && (
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => copiarMensagem(conversa.mensagem)}
                                className="p-1 hover:bg-gray-100 rounded"
                                title="Copiar"
                              >
                                <Copy className="h-3 w-3 text-gray-400" />
                              </button>
                              <button
                                onClick={() => avaliarResposta(conversa.id, 'positiva')}
                                className="p-1 hover:bg-gray-100 rounded"
                                title="Útil"
                              >
                                <ThumbsUp className="h-3 w-3 text-gray-400" />
                              </button>
                              <button
                                onClick={() => avaliarResposta(conversa.id, 'negativa')}
                                className="p-1 hover:bg-gray-100 rounded"
                                title="Não útil"
                              >
                                <ThumbsDown className="h-3 w-3 text-gray-400" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 shadow-sm border px-4 py-2 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-4 w-4 text-blue-600" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Sugestões */}
            {sugestoes.length > 0 && (
              <div className="p-3 bg-white border-t">
                <div className="flex items-center space-x-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs font-medium text-gray-600">Sugestões:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sugestoes.map((sugestao, index) => (
                    <button
                      key={index}
                      onClick={() => enviarMensagem(sugestao)}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs hover:bg-blue-100 transition-colors"
                    >
                      {sugestao}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-white border-t">
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()}
                    placeholder="Digite sua pergunta..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button
                    onClick={limparConversa}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                    title="Limpar conversa"
                  >
                    <RefreshCw className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
                <button
                  onClick={() => enviarMensagem()}
                  disabled={!mensagem.trim() || isTyping}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Sparkles className="h-3 w-3" />
                  <span>Powered by IA Mirante</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-gray-500">Online</span>
                </div>
              </div>
            </div>
          </>
        )}

        {isMinimized && (
          <div className="p-4 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bot className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Mirante</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-xs text-gray-500">Online</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IAMirante;

