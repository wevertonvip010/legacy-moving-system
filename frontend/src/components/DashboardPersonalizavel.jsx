import React, { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { 
  Calendar, 
  Users, 
  FileText, 
  TrendingUp, 
  DollarSign,
  MessageCircle,
  BarChart3,
  Clock,
  Settings,
  Move
} from 'lucide-react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const DashboardPersonalizavel = () => {
  const [layouts, setLayouts] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);

  // Layout padrão dos blocos
  const defaultLayout = [
    { i: 'calendario', x: 0, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'leads', x: 6, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'vendas', x: 0, y: 4, w: 4, h: 3, minW: 3, minH: 2 },
    { i: 'financeiro', x: 4, y: 4, w: 4, h: 3, minW: 3, minH: 2 },
    { i: 'atividades', x: 8, y: 4, w: 4, h: 3, minW: 3, minH: 2 },
    { i: 'graficos', x: 0, y: 7, w: 8, h: 4, minW: 6, minH: 3 },
    { i: 'notificacoes', x: 8, y: 7, w: 4, h: 4, minW: 3, minH: 3 }
  ];

  useEffect(() => {
    // Carregar layout salvo do localStorage
    const savedLayouts = localStorage.getItem('vip-dashboard-layouts');
    if (savedLayouts) {
      setLayouts(JSON.parse(savedLayouts));
    } else {
      setLayouts({ lg: defaultLayout });
    }
  }, []);

  const handleLayoutChange = (layout, layouts) => {
    setLayouts(layouts);
    // Salvar no localStorage
    localStorage.setItem('vip-dashboard-layouts', JSON.stringify(layouts));
  };

  const resetLayout = () => {
    setLayouts({ lg: defaultLayout });
    localStorage.setItem('vip-dashboard-layouts', JSON.stringify({ lg: defaultLayout }));
  };

  // Componentes dos blocos
  const CalendarioBloco = () => (
    <div className="bg-white rounded-lg shadow-md p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-blue-600" />
          Agenda do Dia
        </h3>
        {isEditMode && <Move className="w-4 h-4 text-gray-400" />}
      </div>
      <div className="space-y-2">
        <div className="flex items-center p-2 bg-blue-50 rounded">
          <Clock className="w-4 h-4 text-blue-600 mr-2" />
          <div>
            <p className="text-sm font-medium">09:00 - Visita Técnica</p>
            <p className="text-xs text-gray-600">Empresa TechCorp</p>
          </div>
        </div>
        <div className="flex items-center p-2 bg-green-50 rounded">
          <Clock className="w-4 h-4 text-green-600 mr-2" />
          <div>
            <p className="text-sm font-medium">14:00 - Mudança Residencial</p>
            <p className="text-xs text-gray-600">João Silva</p>
          </div>
        </div>
        <div className="flex items-center p-2 bg-orange-50 rounded">
          <Clock className="w-4 h-4 text-orange-600 mr-2" />
          <div>
            <p className="text-sm font-medium">16:00 - Follow-up</p>
            <p className="text-xs text-gray-600">Leads pendentes</p>
          </div>
        </div>
      </div>
    </div>
  );

  const LeadsBloco = () => (
    <div className="bg-white rounded-lg shadow-md p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <MessageCircle className="w-5 h-5 mr-2 text-green-600" />
          Leads Recentes
        </h3>
        {isEditMode && <Move className="w-4 h-4 text-gray-400" />}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center p-2 bg-green-50 rounded">
          <div>
            <p className="text-sm font-medium">Maria Silva</p>
            <p className="text-xs text-gray-600">WhatsApp - Novo</p>
          </div>
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Novo</span>
        </div>
        <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
          <div>
            <p className="text-sm font-medium">João Santos</p>
            <p className="text-xs text-gray-600">Instagram - Em atendimento</p>
          </div>
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Atendimento</span>
        </div>
        <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
          <div>
            <p className="text-sm font-medium">Ana Costa</p>
            <p className="text-xs text-gray-600">Site - Convertido</p>
          </div>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Convertido</span>
        </div>
      </div>
    </div>
  );

  const VendasBloco = () => (
    <div className="bg-white rounded-lg shadow-md p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
          Vendas
        </h3>
        {isEditMode && <Move className="w-4 h-4 text-gray-400" />}
      </div>
      <div className="text-center">
        <p className="text-3xl font-bold text-purple-600">12</p>
        <p className="text-sm text-gray-600">Vendas no mês</p>
        <div className="mt-2">
          <div className="bg-gray-200 rounded-full h-2">
            <div className="bg-purple-600 h-2 rounded-full" style={{ width: '80%' }}></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">80% da meta</p>
        </div>
      </div>
    </div>
  );

  const FinanceiroBloco = () => (
    <div className="bg-white rounded-lg shadow-md p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-green-600" />
          Financeiro
        </h3>
        {isEditMode && <Move className="w-4 h-4 text-gray-400" />}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Receita Mês</span>
          <span className="text-sm font-semibold text-green-600">R$ 45.000</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Despesas</span>
          <span className="text-sm font-semibold text-red-600">R$ 18.000</span>
        </div>
        <div className="flex justify-between border-t pt-2">
          <span className="text-sm font-semibold">Lucro</span>
          <span className="text-sm font-bold text-green-600">R$ 27.000</span>
        </div>
      </div>
    </div>
  );

  const AtividadesBloco = () => (
    <div className="bg-white rounded-lg shadow-md p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Users className="w-5 h-5 mr-2 text-blue-600" />
          Atividades
        </h3>
        {isEditMode && <Move className="w-4 h-4 text-gray-400" />}
      </div>
      <div className="space-y-2">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">8</p>
          <p className="text-xs text-gray-600">Visitas agendadas</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-orange-600">15</p>
          <p className="text-xs text-gray-600">Orçamentos pendentes</p>
        </div>
      </div>
    </div>
  );

  const GraficosBloco = () => (
    <div className="bg-white rounded-lg shadow-md p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
          Performance Mensal
        </h3>
        {isEditMode && <Move className="w-4 h-4 text-gray-400" />}
      </div>
      <div className="h-32 bg-gradient-to-r from-indigo-100 to-purple-100 rounded flex items-center justify-center">
        <p className="text-gray-600">Gráfico de Performance</p>
      </div>
    </div>
  );

  const NotificacoesBloco = () => (
    <div className="bg-white rounded-lg shadow-md p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-red-600" />
          Notificações
        </h3>
        {isEditMode && <Move className="w-4 h-4 text-gray-400" />}
      </div>
      <div className="space-y-2">
        <div className="p-2 bg-red-50 rounded border-l-4 border-red-400">
          <p className="text-sm font-medium text-red-800">Orçamento vencendo</p>
          <p className="text-xs text-red-600">Cliente: Ana Silva</p>
        </div>
        <div className="p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
          <p className="text-sm font-medium text-yellow-800">Follow-up pendente</p>
          <p className="text-xs text-yellow-600">3 leads aguardando</p>
        </div>
        <div className="p-2 bg-blue-50 rounded border-l-4 border-blue-400">
          <p className="text-sm font-medium text-blue-800">Nova avaliação</p>
          <p className="text-xs text-blue-600">5 estrelas recebidas</p>
        </div>
      </div>
    </div>
  );

  const blocosComponentes = {
    calendario: <CalendarioBloco />,
    leads: <LeadsBloco />,
    vendas: <VendasBloco />,
    financeiro: <FinanceiroBloco />,
    atividades: <AtividadesBloco />,
    graficos: <GraficosBloco />,
    notificacoes: <NotificacoesBloco />
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Personalizado</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isEditMode 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isEditMode ? 'Sair do Modo Edição' : 'Personalizar Layout'}
          </button>
          {isEditMode && (
            <button
              onClick={resetLayout}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Resetar Layout
            </button>
          )}
        </div>
      </div>

      {isEditMode && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            <Settings className="w-4 h-4 inline mr-2" />
            Modo de edição ativo: Arraste os blocos para reorganizar o dashboard. 
            Redimensione puxando os cantos. As alterações são salvas automaticamente.
          </p>
        </div>
      )}

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        rowHeight={60}
      >
        {Object.keys(blocosComponentes).map(key => (
          <div key={key} className={isEditMode ? 'cursor-move' : ''}>
            {blocosComponentes[key]}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};

export default DashboardPersonalizavel;

