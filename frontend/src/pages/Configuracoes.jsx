import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Users, 
  Shield, 
  Key, 
  Building2, 
  Mail, 
  Phone, 
  MapPin,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Lock,
  Unlock,
  UserCheck,
  Calendar,
  CheckCircle,
  AlertCircle,
  UserX,
  Bot,
  Globe,
  Database,
  Bell,
  Palette
} from 'lucide-react';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';

const Configuracoes = () => {
  const [abaAtiva, setAbaAtiva] = useState('usuarios');
  const [modalUsuario, setModalUsuario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  
  // Google Calendar
  const { 
    isConfigured, 
    configure, 
    syncEvents, 
    getSyncStatus,
    isLoading 
  } = useGoogleCalendar();
  
  const [googleCalendarConfig, setGoogleCalendarConfig] = useState({
    apiKey: '',
    accessToken: '',
    calendarId: 'vip@vipmudancas.com.br'
  });
  
  const [configEmpresa, setConfigEmpresa] = useState({
    nome: 'VIP Mudanças',
    cnpj: '12.345.678/0001-90',
    email: 'contato@vipmudancas.com.br',
    telefone: '(11) 99999-9999',
    endereco: 'Rua das Mudanças, 123 - São Paulo/SP',
    site: 'https://vipmudancas.com.br'
  });

  // Dados mockados de usuários
  const [usuarios, setUsuarios] = useState([
    {
      id: 1,
      nome: 'Administrador VIP',
      email: 'admin@vip.com.br',
      cargo: 'Admin',
      permissoes: ['dashboard', 'clientes', 'financeiro', 'vendas', 'estoque', 'configuracoes'],
      status: 'ativo',
      ultimoAcesso: '21/06/2024 15:30',
      dataCriacao: '01/01/2024'
    },
    {
      id: 2,
      nome: 'Kenneth Silva',
      email: 'kenneth@vip.com.br',
      cargo: 'Comercial',
      permissoes: ['dashboard', 'clientes', 'vendas', 'orcamentos', 'contratos'],
      status: 'ativo',
      ultimoAcesso: '21/06/2024 14:15',
      dataCriacao: '15/01/2024'
    },
    {
      id: 3,
      nome: 'Douglas Santos',
      email: 'douglas@vip.com.br',
      cargo: 'Financeiro',
      permissoes: ['dashboard', 'financeiro', 'clientes'],
      status: 'ativo',
      ultimoAcesso: '21/06/2024 13:45',
      dataCriacao: '20/01/2024'
    },
    {
      id: 4,
      nome: 'Maciel Oliveira',
      email: 'maciel@vip.com.br',
      cargo: 'Operacional',
      permissoes: ['dashboard', 'ordens-servico', 'estoque', 'visitas'],
      status: 'ativo',
      ultimoAcesso: '21/06/2024 12:30',
      dataCriacao: '25/01/2024'
    },
    {
      id: 5,
      nome: 'Diego Costa',
      email: 'diego@vip.com.br',
      cargo: 'Operacional',
      permissoes: ['dashboard', 'ordens-servico', 'estoque'],
      status: 'inativo',
      ultimoAcesso: '15/06/2024 16:20',
      dataCriacao: '30/01/2024'
    }
  ]);

  const [configSistema, setConfigSistema] = useState({
    anthropicApiKey: '',
    urlWebhook: '',
    emailNotificacoes: true,
    backupAutomatico: true,
    manutencaoAgendada: false,
    versaoSistema: 'v2.0',
    ultimoBackup: '21/05/2026 02:00'
  });

  const permissoesDisponiveis = [
    { id: 'dashboard', nome: 'Dashboard', descricao: 'Acesso ao painel principal' },
    { id: 'clientes', nome: 'Clientes', descricao: 'Gerenciar clientes' },
    { id: 'vendas', nome: 'Vendas', descricao: 'Pipeline de vendas e CRM' },
    { id: 'financeiro', nome: 'Financeiro', descricao: 'Gestão financeira completa' },
    { id: 'estoque', nome: 'Estoque', descricao: 'Controle de estoque' },
    { id: 'orcamentos', nome: 'Orçamentos', descricao: 'Criar e gerenciar orçamentos' },
    { id: 'contratos', nome: 'Contratos', descricao: 'Gestão de contratos' },
    { id: 'ordens-servico', nome: 'Ordens de Serviço', descricao: 'Gerenciar ordens de serviço' },
    { id: 'visitas', nome: 'Visitas', descricao: 'Agendar e gerenciar visitas' },
    { id: 'self-storage', nome: 'Self Storage', descricao: 'Gestão de boxes' },
    { id: 'marketing', nome: 'Marketing', descricao: 'Campanhas e marketing' },
    { id: 'graficos', nome: 'Gráficos', descricao: 'Relatórios e análises' },
    { id: 'configuracoes', nome: 'Configurações', descricao: 'Configurações do sistema' }
  ];

  const cargosPermissoes = {
    'Admin': ['dashboard', 'clientes', 'vendas', 'financeiro', 'estoque', 'orcamentos', 'contratos', 'ordens-servico', 'visitas', 'self-storage', 'marketing', 'graficos', 'configuracoes'],
    'Comercial': ['dashboard', 'clientes', 'vendas', 'orcamentos', 'contratos', 'visitas', 'marketing'],
    'Operacional': ['dashboard', 'ordens-servico', 'estoque', 'visitas', 'self-storage'],
    'Financeiro': ['dashboard', 'financeiro', 'clientes', 'contratos', 'graficos']
  };

  const adicionarUsuario = () => {
    setUsuarioEditando(null);
    setModalUsuario(true);
  };

  const editarUsuario = (usuario) => {
    setUsuarioEditando(usuario);
    setModalUsuario(true);
  };

  const salvarUsuario = () => {
    alert('Usuário salvo com sucesso! (Mock)');
    setModalUsuario(false);
    setUsuarioEditando(null);
  };

  const alterarStatusUsuario = (id, novoStatus) => {
    setUsuarios(usuarios.map(user => 
      user.id === id ? { ...user, status: novoStatus } : user
    ));
    alert(`Usuário ${novoStatus === 'ativo' ? 'ativado' : 'desativado'} com sucesso!`);
  };

  const excluirUsuario = (id) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      setUsuarios(usuarios.filter(user => user.id !== id));
      alert('Usuário excluído com sucesso!');
    }
  };

  const salvarConfigEmpresa = () => {
    alert('Configurações da empresa salvas com sucesso! (Mock)');
  };

  const salvarConfigSistema = () => {
    alert('Configurações do sistema salvas com sucesso! (Mock)');
  };

  const testarIA = async () => {
    if (!configSistema.anthropicApiKey) {
      alert('Por favor, configure a chave da API Anthropic primeiro.');
      return;
    }
    try {
      const { api } = await import('../lib/api');
      const res = await api.miranteChat('Olá! Apenas confirmando que a integração está funcionando.', []);
      if (res?.resposta) {
        alert('✅ Conexão com IA Mirante (Claude) funcionando!\n\nResposta: ' + res.resposta.substring(0, 100) + '...');
      } else {
        alert('✅ API Anthropic conectada com sucesso!');
      }
    } catch (e) {
      alert('❌ Erro ao conectar com a IA Mirante. Verifique se o backend está rodando e se a chave ANTHROPIC_API_KEY está configurada no servidor.');
    }
  };

  // Função para configurar Google Calendar
  const configurarGoogleCalendar = async () => {
    if (!googleCalendarConfig.apiKey || !googleCalendarConfig.accessToken) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const result = configure(googleCalendarConfig.apiKey, googleCalendarConfig.accessToken);
    
    if (result.success) {
      alert('Google Calendar configurado com sucesso! Sincronização ativada.');
    } else {
      alert(`Erro ao configurar: ${result.error}`);
    }
  };

  const testarSincronizacao = async () => {
    if (!isConfigured) {
      alert('Configure o Google Calendar primeiro.');
      return;
    }
    
    await syncEvents();
    alert('Sincronização testada com sucesso!');
  };

  const renderAbaGoogleCalendar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Integração Google Calendar</h3>
        <p className="text-sm text-gray-600">Configure a sincronização automática com o Google Agenda</p>
      </div>

      {/* Status da Configuração */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-blue-600" />
            <h4 className="text-lg font-medium text-gray-900">Status da Integração</h4>
          </div>
          
          {(() => {
            const status = getSyncStatus();
            return (
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                status.color === 'green' ? 'bg-green-100 text-green-800' :
                status.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                status.color === 'red' ? 'bg-red-100 text-red-800' :
                status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {status.color === 'green' ? <CheckCircle className="h-4 w-4" /> :
                 status.color === 'red' ? <AlertCircle className="h-4 w-4" /> :
                 <Calendar className="h-4 w-4" />}
                <span>{status.message}</span>
              </div>
            );
          })()}
        </div>

        {!isConfigured && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h5 className="text-sm font-medium text-yellow-800">Configuração Necessária</h5>
                <p className="text-sm text-yellow-700 mt-1">
                  Para ativar a sincronização automática com o Google Calendar, você precisa configurar as credenciais da API.
                </p>
              </div>
            </div>
          </div>
        )}

        {isConfigured && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h5 className="text-sm font-medium text-green-800">Integração Ativa</h5>
                <p className="text-sm text-green-700 mt-1">
                  O Google Calendar está configurado e sincronizando automaticamente com o sistema.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Configuração */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Key className="h-6 w-6 text-gray-600" />
          <h4 className="text-lg font-medium text-gray-900">Credenciais da API</h4>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Google API Key *
            </label>
            <input
              type="text"
              value={googleCalendarConfig.apiKey}
              onChange={(e) => setGoogleCalendarConfig({
                ...googleCalendarConfig,
                apiKey: e.target.value
              })}
              placeholder="AIzaSyC..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Obtenha em: Google Cloud Console → APIs & Services → Credentials
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Token *
            </label>
            <input
              type="password"
              value={googleCalendarConfig.accessToken}
              onChange={(e) => setGoogleCalendarConfig({
                ...googleCalendarConfig,
                accessToken: e.target.value
              })}
              placeholder="ya29.a0..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Token de acesso OAuth 2.0 para a conta vip@vipmudancas.com.br
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calendar ID
            </label>
            <input
              type="email"
              value={googleCalendarConfig.calendarId}
              onChange={(e) => setGoogleCalendarConfig({
                ...googleCalendarConfig,
                calendarId: e.target.value
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Email da conta Google Calendar (padrão: vip@vipmudancas.com.br)
            </p>
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={configurarGoogleCalendar}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save className="h-4 w-4" />
            <span>Salvar Configuração</span>
          </button>

          {isConfigured && (
            <button
              onClick={testarSincronizacao}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Testando...' : 'Testar Sincronização'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertCircle className="h-6 w-6 text-blue-600" />
          <h4 className="text-lg font-medium text-gray-900">Como Configurar</h4>
        </div>

        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <h5 className="font-medium text-gray-900 mb-2">1. Criar Projeto no Google Cloud</h5>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Acesse <a href="https://console.cloud.google.com" target="_blank" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
              <li>Crie um novo projeto ou selecione um existente</li>
              <li>Ative a API do Google Calendar</li>
            </ul>
          </div>

          <div>
            <h5 className="font-medium text-gray-900 mb-2">2. Configurar Credenciais</h5>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Vá em "APIs & Services" → "Credentials"</li>
              <li>Clique em "Create Credentials" → "API Key"</li>
              <li>Configure OAuth 2.0 para obter o Access Token</li>
            </ul>
          </div>

          <div>
            <h5 className="font-medium text-gray-900 mb-2">3. Permissões Necessárias</h5>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>https://www.googleapis.com/auth/calendar</li>
              <li>https://www.googleapis.com/auth/calendar.events</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAbaUsuarios = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Gestão de Usuários</h3>
          <p className="text-sm text-gray-600">Gerencie usuários e suas permissões</p>
        </div>
        <button
          onClick={adicionarUsuario}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Total Usuários</p>
              <p className="text-2xl font-bold text-blue-900">{usuarios.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <UserCheck className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Ativos</p>
              <p className="text-2xl font-bold text-green-900">
                {usuarios.filter(u => u.status === 'ativo').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center">
            <UserX className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-600">Inativos</p>
              <p className="text-2xl font-bold text-red-900">
                {usuarios.filter(u => u.status === 'inativo').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">Admins</p>
              <p className="text-2xl font-bold text-purple-900">
                {usuarios.filter(u => u.cargo === 'Admin').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissões</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último Acesso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-white font-medium">
                            {usuario.nome.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{usuario.nome}</div>
                        <div className="text-sm text-gray-500">{usuario.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      usuario.cargo === 'Admin' ? 'bg-purple-100 text-purple-800' :
                      usuario.cargo === 'Comercial' ? 'bg-blue-100 text-blue-800' :
                      usuario.cargo === 'Financeiro' ? 'bg-green-100 text-green-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {usuario.cargo}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{usuario.permissoes.length} permissões</div>
                    <div className="text-sm text-gray-500">
                      {usuario.permissoes.slice(0, 2).join(', ')}
                      {usuario.permissoes.length > 2 && ` +${usuario.permissoes.length - 2}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      usuario.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {usuario.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {usuario.ultimoAcesso}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => editarUsuario(usuario)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => alterarStatusUsuario(usuario.id, usuario.status === 'ativo' ? 'inativo' : 'ativo')}
                        className={`${usuario.status === 'ativo' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                        title={usuario.status === 'ativo' ? 'Desativar' : 'Ativar'}
                      >
                        {usuario.status === 'ativo' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      </button>
                      {usuario.cargo !== 'Admin' && (
                        <button
                          onClick={() => excluirUsuario(usuario.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAbaEmpresa = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Informações da Empresa</h3>
        <p className="text-sm text-gray-600">Configure os dados da sua empresa</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Empresa</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={configEmpresa.nome}
                onChange={(e) => setConfigEmpresa({...configEmpresa, nome: e.target.value})}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CNPJ</label>
            <input
              type="text"
              value={configEmpresa.cnpj}
              onChange={(e) => setConfigEmpresa({...configEmpresa, cnpj: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="email"
                value={configEmpresa.email}
                onChange={(e) => setConfigEmpresa({...configEmpresa, email: e.target.value})}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={configEmpresa.telefone}
                onChange={(e) => setConfigEmpresa({...configEmpresa, telefone: e.target.value})}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={configEmpresa.endereco}
                onChange={(e) => setConfigEmpresa({...configEmpresa, endereco: e.target.value})}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Site</label>
            <div className="relative">
              <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="url"
                value={configEmpresa.site}
                onChange={(e) => setConfigEmpresa({...configEmpresa, site: e.target.value})}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={salvarConfigEmpresa}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save className="h-4 w-4" />
            <span>Salvar Configurações</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderAbaSistema = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Configurações do Sistema</h3>
        <p className="text-sm text-gray-600">Configure integrações e funcionalidades avançadas</p>
      </div>

      {/* IA Mirante */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Bot className="h-6 w-6 text-purple-600" />
          <h4 className="text-lg font-medium text-gray-900">IA Mirante</h4>
        </div>
        
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-2">
            <div className="flex items-start space-x-2">
              <Bot className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-purple-800">
                A <strong>Mirante</strong> utiliza o modelo <strong>Claude (Anthropic)</strong>. A chave da API deve ser configurada
                na variável de ambiente <code className="bg-purple-100 px-1 rounded">ANTHROPIC_API_KEY</code> do servidor backend.
                O campo abaixo é apenas para referência e testes.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chave API Anthropic (Claude)</label>
            <div className="relative">
              <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={configSistema.anthropicApiKey}
                onChange={(e) => setConfigSistema({...configSistema, anthropicApiKey: e.target.value})}
                placeholder="sk-ant-api03-..."
                className="pl-10 pr-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Obtenha em: <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-purple-600 hover:underline">console.anthropic.com</a> → API Keys
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={testarIA}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Bot className="h-4 w-4" />
              <span>Testar Mirante</span>
            </button>
            <span className="text-sm text-blue-600 font-medium">
              ● Claude · Anthropic
            </span>
          </div>
        </div>
      </div>

      {/* Integrações */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Globe className="h-6 w-6 text-blue-600" />
          <h4 className="text-lg font-medium text-gray-900">Integrações</h4>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">URL Webhook</label>
            <input
              type="url"
              value={configSistema.urlWebhook}
              onChange={(e) => setConfigSistema({...configSistema, urlWebhook: e.target.value})}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              URL para receber notificações de eventos do sistema
            </p>
          </div>
        </div>
      </div>

      {/* Notificações */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Bell className="h-6 w-6 text-yellow-600" />
          <h4 className="text-lg font-medium text-gray-900">Notificações</h4>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Notificações por Email</p>
              <p className="text-xs text-gray-500">Receber alertas importantes por email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={configSistema.emailNotificacoes}
                onChange={(e) => setConfigSistema({...configSistema, emailNotificacoes: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Backup Automático</p>
              <p className="text-xs text-gray-500">Backup diário dos dados do sistema</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={configSistema.backupAutomatico}
                onChange={(e) => setConfigSistema({...configSistema, backupAutomatico: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Modo Manutenção</p>
              <p className="text-xs text-gray-500">Ativar para manutenções programadas</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={configSistema.manutencaoAgendada}
                onChange={(e) => setConfigSistema({...configSistema, manutencaoAgendada: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Informações do Sistema */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Database className="h-6 w-6 text-gray-600" />
          <h4 className="text-lg font-medium text-gray-900">Informações do Sistema</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-700">Versão do Sistema</p>
            <p className="text-lg font-bold text-gray-900">{configSistema.versaoSistema}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-700">Último Backup</p>
            <p className="text-lg font-bold text-gray-900">{configSistema.ultimoBackup}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={salvarConfigSistema}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Save className="h-4 w-4" />
          <span>Salvar Configurações</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
              <p className="text-gray-600 mt-1">Gerencie usuários, empresa e sistema</p>
            </div>
            <div className="flex items-center space-x-2">
              <Settings className="h-6 w-6 text-gray-400" />
              <span className="text-sm text-gray-600">Sistema v2.0</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Abas */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setAbaAtiva('usuarios')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  abaAtiva === 'usuarios'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Usuários</span>
                </div>
              </button>
              <button
                onClick={() => setAbaAtiva('empresa')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  abaAtiva === 'empresa'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4" />
                  <span>Empresa</span>
                </div>
              </button>
              <button
                onClick={() => setAbaAtiva('google-calendar')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  abaAtiva === 'google-calendar'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Google Calendar</span>
                  {isConfigured && <CheckCircle className="h-3 w-3 text-green-500" />}
                </div>
              </button>
              <button
                onClick={() => setAbaAtiva('sistema')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  abaAtiva === 'sistema'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Sistema</span>
                </div>
              </button>
            </nav>
          </div>

          <div className="p-6">
            {abaAtiva === 'usuarios' && renderAbaUsuarios()}
            {abaAtiva === 'empresa' && renderAbaEmpresa()}
            {abaAtiva === 'google-calendar' && renderAbaGoogleCalendar()}
            {abaAtiva === 'sistema' && renderAbaSistema()}
          </div>
        </div>
      </div>

      {/* Modal Usuário */}
      {modalUsuario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {usuarioEditando ? 'Editar Usuário' : 'Novo Usuário'}
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    defaultValue={usuarioEditando?.nome || ''}
                    placeholder="Nome completo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    defaultValue={usuarioEditando?.email || ''}
                    placeholder="email@vip.com.br"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                  <select
                    defaultValue={usuarioEditando?.cargo || 'Comercial'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Financeiro">Financeiro</option>
                    <option value="Operacional">Operacional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                  <input
                    type="password"
                    placeholder={usuarioEditando ? 'Deixe em branco para manter' : 'Senha temporária'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissões</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                  {permissoesDisponiveis.map((permissao) => (
                    <label key={permissao.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        defaultChecked={usuarioEditando?.permissoes.includes(permissao.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{permissao.nome}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setModalUsuario(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={salvarUsuario}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {usuarioEditando ? 'Atualizar' : 'Criar'} Usuário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuracoes;

