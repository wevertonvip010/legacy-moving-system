import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, MapPin, Truck, Archive, RefreshCw, Settings } from 'lucide-react';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';

const CalendarioDashboard = () => {
  const [mesAtual, setMesAtual] = useState(new Date());
  const { 
    events, 
    isLoading, 
    syncEvents, 
    getSyncStatus, 
    getEventsByDate,
    isConfigured 
  } = useGoogleCalendar();

  // Sincronizar eventos ao carregar (apenas uma vez)
  useEffect(() => {
    syncEvents();
  }, []); // Removida dependência syncEvents para evitar loop

  // Dados mockados de atividades (fallback)
  const atividadesMock = [
    {
      id: 1,
      titulo: "Mudança João Silva",
      data: "2024-06-20",
      hora: "09:00",
      tipo: "mudanca",
      responsavel: "Carlos Mendes",
      endereco: "Rua das Flores, 123",
      status: "confirmada"
    },
    {
      id: 2,
      titulo: "Visita Cliente Cristina",
      data: "2024-06-08",
      hora: "14:30",
      tipo: "visita",
      responsavel: "Ana Santos",
      endereco: "Av. Paulista, 456",
      status: "realizada"
    },
    {
      id: 3,
      titulo: "Entrada Box 15 - Maria Costa",
      data: "2024-06-15",
      hora: "10:00",
      tipo: "entrada_box",
      responsavel: "Diego Oliveira",
      endereco: "Self Storage VIP",
      status: "confirmada"
    },
    {
      id: 4,
      titulo: "Saída Box 23 - Pedro Lima",
      data: "2024-06-25",
      hora: "16:00",
      tipo: "saida_box",
      responsavel: "Maciel Ferreira",
      endereco: "Self Storage VIP",
      status: "agendada"
    },
    {
      id: 5,
      titulo: "Mudança Empresa ABC",
      data: "2024-06-22",
      hora: "08:00",
      tipo: "mudanca",
      responsavel: "Carlos Mendes",
      endereco: "Centro Empresarial",
      status: "confirmada"
    },
    {
      id: 6,
      titulo: "Visita Orçamento - José Santos",
      data: "2024-06-28",
      hora: "15:00",
      tipo: "visita",
      responsavel: "Ana Santos",
      endereco: "Bairro Jardins",
      status: "agendada"
    },
    {
      id: 7,
      titulo: "Entrada Box 42 - Família Rodrigues",
      data: "2024-06-30",
      hora: "11:30",
      tipo: "entrada_box",
      responsavel: "Diego Oliveira",
      endereco: "Self Storage VIP",
      status: "agendada"
    },
    {
      id: 8,
      titulo: "Mudança Fernanda Lima",
      data: "2024-06-21",
      hora: "13:00",
      tipo: "mudanca",
      responsavel: "Maciel Ferreira",
      endereco: "Vila Madalena",
      status: "confirmada"
    },
    {
      id: 9,
      titulo: "Visita Técnica - Roberto",
      data: "2024-06-24",
      hora: "10:30",
      tipo: "visita",
      responsavel: "Kenneth Silva",
      endereco: "Moema",
      status: "agendada"
    },
    {
      id: 10,
      titulo: "Entrada Box 07 - Loja ABC",
      data: "2024-06-26",
      hora: "09:00",
      tipo: "entrada_box",
      responsavel: "Sebastião Costa",
      endereco: "Self Storage VIP",
      status: "agendada"
    },
    {
      id: 11,
      titulo: "Mudança Escritório XYZ",
      data: "2024-06-27",
      hora: "07:30",
      tipo: "mudanca",
      responsavel: "Carlos Mendes",
      endereco: "Faria Lima",
      status: "confirmada"
    },
    {
      id: 12,
      titulo: "Saída Box 18 - Família Santos",
      data: "2024-06-29",
      hora: "14:00",
      tipo: "saida_box",
      responsavel: "Diego Oliveira",
      endereco: "Self Storage VIP",
      status: "agendada"
    },
    {
      id: 13,
      titulo: "Visita Orçamento - Marina",
      data: "2024-06-23",
      hora: "16:30",
      tipo: "visita",
      responsavel: "Ana Santos",
      endereco: "Pinheiros",
      status: "agendada"
    },
    {
      id: 14,
      titulo: "Mudança Casa Grande",
      data: "2024-06-19",
      hora: "08:30",
      tipo: "mudanca",
      responsavel: "Maciel Ferreira",
      endereco: "Jardins",
      status: "realizada"
    },
    {
      id: 15,
      titulo: "Entrada Box 33 - Documentos",
      data: "2024-06-17",
      hora: "11:00",
      tipo: "entrada_box",
      responsavel: "Sebastião Costa",
      endereco: "Self Storage VIP",
      status: "realizada"
    }
  ];

  // Cores por tipo de atividade
  const coresTipo = {
    mudanca: "bg-green-500 border-green-600 text-white",
    visita: "bg-red-500 border-red-600 text-white",
    entrada_box: "bg-yellow-500 border-yellow-600 text-white",
    saida_box: "bg-orange-500 border-orange-600 text-white"
  };

  // Cores por responsável
  const coresResponsavel = {
    "Carlos Mendes": "border-l-4 border-l-blue-500",
    "Ana Santos": "border-l-4 border-l-purple-500",
    "Diego Oliveira": "border-l-4 border-l-green-500",
    "Maciel Ferreira": "border-l-4 border-l-red-500",
    "Kenneth Silva": "border-l-4 border-l-indigo-500",
    "Sebastião Costa": "border-l-4 border-l-pink-500"
  };

  // Ícones por tipo
  const iconesTipo = {
    mudanca: Truck,
    visita: MapPin,
    entrada_box: Archive,
    saida_box: Archive
  };

  const obterNomeMes = (data) => {
    return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const obterDiasDoMes = () => {
    const ano = mesAtual.getFullYear();
    const mes = mesAtual.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const diasNoMes = ultimoDia.getDate();
    const diaDaSemana = primeiroDia.getDay();

    const dias = [];
    
    // Dias vazios do início
    for (let i = 0; i < diaDaSemana; i++) {
      dias.push(null);
    }
    
    // Dias do mês
    for (let dia = 1; dia <= diasNoMes; dia++) {
      dias.push(dia);
    }
    
    return dias;
  };

  const obterAtividadesDoDia = (dia) => {
    if (!dia) return [];
    
    const dataFormatada = `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    
    // Usar eventos do Google Calendar se disponível, senão usar mock
    const eventosParaUsar = events.length > 0 ? events : atividadesMock;
    return eventosParaUsar.filter(atividade => atividade.data === dataFormatada);
  };

  const navegarMes = (direcao) => {
    const novoMes = new Date(mesAtual);
    novoMes.setMonth(mesAtual.getMonth() + direcao);
    setMesAtual(novoMes);
  };

  const formatarTipo = (tipo) => {
    const tipos = {
      mudanca: "Mudança",
      visita: "Visita",
      entrada_box: "Entrada Box",
      saida_box: "Saída Box"
    };
    return tipos[tipo] || tipo;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header do Calendário */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <CalendarIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">Calendário de Atividades</h3>
          
          {/* Status de Sincronização */}
          <div className="flex items-center space-x-2">
            {(() => {
              const status = getSyncStatus();
              return (
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                  status.color === 'green' ? 'bg-green-100 text-green-800' :
                  status.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                  status.color === 'red' ? 'bg-red-100 text-red-800' :
                  status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    status.color === 'green' ? 'bg-green-500' :
                    status.color === 'blue' ? 'bg-blue-500' :
                    status.color === 'red' ? 'bg-red-500' :
                    status.color === 'yellow' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }`}></div>
                  <span>{status.message}</span>
                </div>
              );
            })()}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Botão de Sincronização */}
          <button
            onClick={syncEvents}
            disabled={isLoading}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>
          
          {/* Navegação do Mês */}
          <button
            onClick={() => navegarMes(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          
          <h4 className="text-lg font-semibold text-gray-800 capitalize min-w-[200px] text-center">
            {obterNomeMes(mesAtual)}
          </h4>
          
          <button
            onClick={() => navegarMes(1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Legenda */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-2">Tipos de Atividade:</h5>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-500 text-white">
                <Truck className="h-3 w-3 mr-1" />
                Mudanças
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-red-500 text-white">
                <MapPin className="h-3 w-3 mr-1" />
                Visitas
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-500 text-white">
                <Archive className="h-3 w-3 mr-1" />
                Guarda-Móveis
              </span>
            </div>
          </div>
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-2">Responsáveis:</h5>
            <div className="grid grid-cols-2 gap-1">
              <div className="flex items-center text-xs">
                <div className="w-4 h-3 bg-blue-500 rounded mr-2"></div>
                Carlos Mendes
              </div>
              <div className="flex items-center text-xs">
                <div className="w-4 h-3 bg-purple-500 rounded mr-2"></div>
                Ana Santos
              </div>
              <div className="flex items-center text-xs">
                <div className="w-4 h-3 bg-green-500 rounded mr-2"></div>
                Diego Oliveira
              </div>
              <div className="flex items-center text-xs">
                <div className="w-4 h-3 bg-red-500 rounded mr-2"></div>
                Maciel Ferreira
              </div>
              <div className="flex items-center text-xs">
                <div className="w-4 h-3 bg-indigo-500 rounded mr-2"></div>
                Kenneth Silva
              </div>
              <div className="flex items-center text-xs">
                <div className="w-4 h-3 bg-pink-500 rounded mr-2"></div>
                Sebastião Costa
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
          <div key={dia} className="p-2 text-center text-sm font-semibold text-gray-600">
            {dia}
          </div>
        ))}
      </div>

      {/* Calendário */}
      <div className="grid grid-cols-7 gap-1">
        {obterDiasDoMes().map((dia, index) => {
          const atividadesDoDia = obterAtividadesDoDia(dia);
          
          return (
            <div
              key={index}
              className={`min-h-[100px] p-1 border border-gray-200 rounded-lg ${
                dia ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'
              }`}
            >
              {dia && (
                <>
                  <div className="text-sm font-semibold text-gray-700 mb-1">
                    {dia}
                  </div>
                  
                  <div className="space-y-1">
                    {atividadesDoDia.map(atividade => {
                      const IconeTipo = iconesTipo[atividade.tipo];
                      
                      return (
                        <div
                          key={atividade.id}
                          className={`
                            text-xs p-1 rounded border-l-2 
                            ${coresTipo[atividade.tipo]}
                            ${coresResponsavel[atividade.responsavel]}
                          `}
                          title={`${atividade.titulo} - ${atividade.hora} - ${atividade.responsavel}`}
                        >
                          <div className="flex items-center space-x-1">
                            <IconeTipo className="h-3 w-3" />
                            <span className="truncate font-medium">
                              {atividade.titulo.length > 15 
                                ? atividade.titulo.substring(0, 15) + '...' 
                                : atividade.titulo
                              }
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 mt-1 opacity-90">
                            <Clock className="h-2 w-2" />
                            <span>{atividade.hora}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Resumo do mês */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h5 className="text-sm font-semibold text-blue-800 mb-2">Resumo do Mês:</h5>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-green-600">
              {(() => {
                const eventosParaUsar = events.length > 0 ? events : atividadesMock;
                return eventosParaUsar.filter(a => a.tipo === 'mudanca' && a.data.startsWith(`${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}`)).length;
              })()}
            </div>
            <div className="text-xs text-gray-600">Mudanças</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-600">
              {(() => {
                const eventosParaUsar = events.length > 0 ? events : atividadesMock;
                return eventosParaUsar.filter(a => a.tipo === 'visita' && a.data.startsWith(`${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}`)).length;
              })()}
            </div>
            <div className="text-xs text-gray-600">Visitas</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-600">
              {(() => {
                const eventosParaUsar = events.length > 0 ? events : atividadesMock;
                return eventosParaUsar.filter(a => a.tipo === 'entrada_box' && a.data.startsWith(`${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}`)).length;
              })()}
            </div>
            <div className="text-xs text-gray-600">Entradas</div>
          </div>
          <div>
            <div className="text-lg font-bold text-orange-600">
              {(() => {
                const eventosParaUsar = events.length > 0 ? events : atividadesMock;
                return eventosParaUsar.filter(a => a.tipo === 'saida_box' && a.data.startsWith(`${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}`)).length;
              })()}
            </div>
            <div className="text-xs text-gray-600">Saídas</div>
          </div>
        </div>
        
        {/* Informação sobre sincronização */}
        {!isConfigured && (
          <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
            <strong>Modo Demonstração:</strong> Configure o Google Calendar nas Configurações para sincronização real.
          </div>
        )}
        
        {events.length > 0 && isConfigured && (
          <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-xs text-green-800">
            <strong>Sincronizado:</strong> {events.length} eventos carregados do Google Calendar.
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarioDashboard;

