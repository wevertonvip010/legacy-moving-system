import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Calendar = ({ eventos = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Dias do mês anterior
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({
        date: prevDate.getDate(),
        isCurrentMonth: false,
        fullDate: prevDate
      });
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const fullDate = new Date(year, month, day);
      days.push({
        date: day,
        isCurrentMonth: true,
        fullDate: fullDate
      });
    }

    // Dias do próximo mês
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day);
      days.push({
        date: day,
        isCurrentMonth: false,
        fullDate: nextDate
      });
    }

    return days;
  };

  const getEventosForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return eventos.filter(evento => evento.data === dateStr);
  };

  const getEventColor = (tipo) => {
    const colors = {
      visita: 'bg-red-500',
      pagamento: 'bg-green-500',
      mudanca: 'bg-blue-500',
      contrato: 'bg-orange-500',
      default: 'bg-gray-500'
    };
    return colors[tipo] || colors.default;
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="bg-white rounded-xl shadow-vip p-6">
      {/* Header do calendário */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
          <span>📅</span>
          <span>Calendário de Atividades</span>
        </h3>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-vip"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          
          <h4 className="text-lg font-semibold text-gray-900 min-w-[150px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h4>
          
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-vip"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}
      </div>

      {/* Dias do mês */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const eventosDay = getEventosForDate(day.fullDate);
          const isToday = day.fullDate.toDateString() === new Date().toDateString();
          
          return (
            <div
              key={index}
              className={`
                min-h-[80px] p-1 border border-gray-100 rounded-lg cursor-pointer transition-vip
                ${day.isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 text-gray-400'}
                ${isToday ? 'ring-2 ring-blue-500' : ''}
              `}
              onClick={() => setSelectedDate(day.fullDate)}
            >
              <div className={`
                text-sm font-medium mb-1
                ${isToday ? 'text-blue-600 font-bold' : ''}
              `}>
                {day.date}
              </div>
              
              {/* Eventos do dia */}
              <div className="space-y-1">
                {eventosDay.slice(0, 2).map((evento, idx) => (
                  <div
                    key={idx}
                    className={`
                      text-xs px-1 py-0.5 rounded text-white truncate
                      ${getEventColor(evento.tipo)}
                    `}
                    title={evento.titulo}
                  >
                    {evento.titulo}
                  </div>
                ))}
                {eventosDay.length > 2 && (
                  <div className="text-xs text-gray-500 px-1">
                    +{eventosDay.length - 2} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Visitas</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Pagamentos</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Mudanças</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-orange-500 rounded"></div>
          <span>Contratos</span>
        </div>
      </div>
    </div>
  );
};

export default Calendar;

