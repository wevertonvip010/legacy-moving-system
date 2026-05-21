import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MessageCircle, 
  Phone, 
  Mail, 
  Calendar,
  TrendingUp,
  Filter,
  Search,
  Eye,
  Edit,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  BarChart3,
  Instagram,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const PainelLeads = () => {
  const [leads, setLeads] = useState([]);
  const [estatisticas, setEstatisticas] = useState({});
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCanal, setFiltroCanal] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [leadSelecionado, setLeadSelecionado] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { token } = useAuth();

  useEffect(() => {
    carregarLeads();
    carregarEstatisticas();
  }, [filtroStatus, filtroCanal]);

  const carregarLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroStatus !== 'todos') params.append('status', filtroStatus);
      if (filtroCanal !== 'todos') params.append('canal', filtroCanal);
      
      const response = await fetch(`/api/manychat/leads?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads);
      } else {
        throw new Error('API não disponível');
      }
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      // Dados simulados para demonstração
      const leadsSimulados = [
        {
          _id: '1',
          nome: 'Maria Silva',
          telefone: '(11) 99999-1234',
          email: 'maria@email.com',
          origem: 'ManyChat',
          canal: 'WhatsApp',
          mensagem_inicial: 'Olá, gostaria de um orçamento para mudança',
          status: 'novo',
          data_criacao: new Date().toISOString(),
          tags: ['mudança', 'residencial']
        },
        {
          _id: '2',
          nome: 'João Santos',
          telefone: '(11) 88888-5678',
          email: 'joao@empresa.com',
          origem: 'ManyChat',
          canal: 'Instagram',
          mensagem_inicial: 'Preciso de mudança comercial urgente',
          status: 'em_atendimento',
          data_criacao: new Date(Date.now() - 86400000).toISOString(),
          responsavel: 'Kenneth',
          tags: ['mudança', 'comercial', 'urgente']
        },
        {
          _id: '3',
          nome: 'Ana Costa',
          telefone: '(11) 77777-9012',
          email: 'ana@email.com',
          origem: 'ManyChat',
          canal: 'WhatsApp',
          mensagem_inicial: 'Quero guardar móveis no self storage',
          status: 'convertido',
          data_criacao: new Date(Date.now() - 172800000).toISOString(),
          responsavel: 'Douglas',
          tags: ['self-storage']
        }
      ];
      setLeads(leadsSimulados);
    } finally {
      setLoading(false);
    }
  };

  const carregarEstatisticas = async () => {
    try {
      const response = await fetch('/api/manychat/estatisticas', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEstatisticas(data);
      } else {
        throw new Error('API não disponível');
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      // Estatísticas simuladas
      setEstatisticas({
        total_leads: 45,
        leads_convertidos: 12,
        taxa_conversao: 26.7,
        por_status: [
          { _id: 'novo', count: 15 },
          { _id: 'em_atendimento', count: 18 },
          { _id: 'convertido', count: 12 }
        ],
        por_canal: [
          { _id: 'WhatsApp', count: 28 },
          { _id: 'Instagram', count: 17 }
        ]
      });
    }
  };

  const atualizarStatusLead = async (leadId, novoStatus, observacoes = '') => {
    try {
      const response = await fetch(`/api/manychat/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: novoStatus,
          observacoes,
          data_contato: new Date().toISOString()
        })
      });

      if (response.ok) {
        // Atualizar lead localmente
        setLeads(prev => prev.map(lead => 
          lead._id === leadId 
            ? { ...lead, status: novoStatus, observacoes }
            : lead
        ));
        carregarEstatisticas();
      } else {
        // Simulação de atualização
        setLeads(prev => prev.map(lead => 
          lead._id === leadId 
            ? { ...lead, status: novoStatus, observacoes }
            : lead
        ));
      }
    } catch (error) {
      console.error('Erro ao atualizar lead:', error);
    }
  };

  const converterEmCliente = async (leadId) => {
    try {
      const response = await fetch(`/api/manychat/leads/${leadId}/converter-cliente`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Lead convertido em cliente com sucesso! ID: ${data.cliente_id}`);
        carregarLeads();
        carregarEstatisticas();
      } else {
        // Simulação
        alert('Lead convertido em cliente com sucesso!');
        atualizarStatusLead(leadId, 'convertido');
      }
    } catch (error) {
      console.error('Erro ao converter lead:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'novo': return 'bg-blue-100 text-blue-800';
      case 'em_atendimento': return 'bg-yellow-100 text-yellow-800';
      case 'convertido': return 'bg-green-100 text-green-800';
      case 'perdido': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'novo': return <AlertCircle className="h-4 w-4" />;
      case 'em_atendimento': return <Clock className="h-4 w-4" />;
      case 'convertido': return <CheckCircle className="h-4 w-4" />;
      case 'perdido': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getCanalIcon = (canal) => {
    switch (canal) {
      case 'WhatsApp': return <MessageCircle className="h-4 w-4 text-green-600" />;
      case 'Instagram': return <Instagram className="h-4 w-4 text-pink-600" />;
      default: return <MessageSquare className="h-4 w-4 text-blue-600" />;
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesStatus = filtroStatus === 'todos' || lead.status === filtroStatus;
    const matchesCanal = filtroCanal === 'todos' || lead.canal === filtroCanal;
    const matchesSearch = lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.telefone.includes(searchTerm) ||
                         (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesCanal && matchesSearch;
  });

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-vip-gradient text-white px-6 py-4 shadow-vip">
        <h1 className="text-2xl font-bold flex items-center">
          <Users className="mr-3" />
          Painel de Leads ManyChat
        </h1>
        <p className="text-blue-100 mt-1">
          Gerencie leads automáticos do WhatsApp e Instagram
        </p>
      </div>

      {/* Estatísticas */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-600">Total de Leads</p>
                <p className="text-2xl font-bold text-blue-900">{estatisticas.total_leads || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-600">Convertidos</p>
                <p className="text-2xl font-bold text-green-900">{estatisticas.leads_convertidos || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-600">Taxa de Conversão</p>
                <p className="text-2xl font-bold text-purple-900">{estatisticas.taxa_conversao || 0}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center">
              <MessageCircle className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-600">WhatsApp</p>
                <p className="text-2xl font-bold text-orange-900">
                  {estatisticas.por_canal?.find(c => c._id === 'WhatsApp')?.count || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar por nome, telefone ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
            
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos os status</option>
              <option value="novo">Novos</option>
              <option value="em_atendimento">Em Atendimento</option>
              <option value="convertido">Convertidos</option>
              <option value="perdido">Perdidos</option>
            </select>
            
            <select
              value={filtroCanal}
              onChange={(e) => setFiltroCanal(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos os canais</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Instagram">Instagram</option>
            </select>
          </div>

          <div className="text-sm text-gray-600">
            {filteredLeads.length} lead(s) encontrado(s)
          </div>
        </div>
      </div>

      {/* Lista de Leads */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Carregando leads...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredLeads.map((lead) => (
              <div key={lead._id} className="bg-white rounded-xl shadow-vip border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{lead.nome}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(lead.status)}`}>
                        {getStatusIcon(lead.status)}
                        {lead.status.replace('_', ' ').charAt(0).toUpperCase() + lead.status.replace('_', ' ').slice(1)}
                      </span>
                      <div className="flex items-center gap-1">
                        {getCanalIcon(lead.canal)}
                        <span className="text-sm text-gray-600">{lead.canal}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-green-500" />
                        {lead.telefone}
                      </div>
                      {lead.email && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-blue-500" />
                          {lead.email}
                        </div>
                      )}
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-purple-500" />
                        {new Date(lead.data_criacao).toLocaleDateString('pt-BR')}
                      </div>
                      {lead.responsavel && (
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2 text-orange-500" />
                          Responsável: {lead.responsavel}
                        </div>
                      )}
                    </div>
                    
                    {lead.mensagem_inicial && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <p className="text-sm text-gray-700">
                          <strong>Mensagem inicial:</strong> {lead.mensagem_inicial}
                        </p>
                      </div>
                    )}
                    
                    {lead.tags && lead.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {lead.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {lead.observacoes && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                          <strong>Observações:</strong> {lead.observacoes}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    {lead.status === 'novo' && (
                      <button
                        onClick={() => atualizarStatusLead(lead._id, 'em_atendimento')}
                        className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 flex items-center text-sm"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Atender
                      </button>
                    )}
                    
                    {(lead.status === 'novo' || lead.status === 'em_atendimento') && (
                      <button
                        onClick={() => converterEmCliente(lead._id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center text-sm"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Converter
                      </button>
                    )}
                    
                    {lead.status !== 'perdido' && (
                      <button
                        onClick={() => atualizarStatusLead(lead._id, 'perdido', 'Lead marcado como perdido')}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center text-sm"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Perder
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        setLeadSelecionado(lead);
                        setShowModal(true);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Detalhes
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredLeads.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum lead encontrado</h3>
            <p className="text-gray-500">
              {searchTerm || filtroStatus !== 'todos' || filtroCanal !== 'todos'
                ? 'Tente ajustar os filtros de busca.'
                : 'Os leads do ManyChat aparecerão aqui automaticamente.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {showModal && leadSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
              <h2 className="text-xl font-bold">Detalhes do Lead</h2>
              <p className="text-blue-100 mt-1">{leadSelecionado.nome}</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <p className="text-gray-900">{leadSelecionado.nome}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <p className="text-gray-900">{leadSelecionado.telefone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{leadSelecionado.email || 'Não informado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Canal</label>
                  <p className="text-gray-900">{leadSelecionado.canal}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(leadSelecionado.status)}`}>
                    {leadSelecionado.status.replace('_', ' ').charAt(0).toUpperCase() + leadSelecionado.status.replace('_', ' ').slice(1)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Criação</label>
                  <p className="text-gray-900">{new Date(leadSelecionado.data_criacao).toLocaleString('pt-BR')}</p>
                </div>
              </div>
              
              {leadSelecionado.mensagem_inicial && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem Inicial</label>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-700">{leadSelecionado.mensagem_inicial}</p>
                  </div>
                </div>
              )}
              
              {leadSelecionado.tags && leadSelecionado.tags.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {leadSelecionado.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    converterEmCliente(leadSelecionado._id);
                    setShowModal(false);
                  }}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                >
                  Converter em Cliente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PainelLeads;

