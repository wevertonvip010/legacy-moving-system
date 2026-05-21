// Serviço de integração com Google Calendar API
class GoogleCalendarService {
  constructor() {
    this.apiKey = null;
    this.accessToken = null;
    this.calendarId = 'vip@vipmudancas.com.br'; // Email da empresa
    this.baseUrl = 'https://www.googleapis.com/calendar/v3';
  }

  // Configurar credenciais (será chamado das configurações)
  setCredentials(apiKey, accessToken) {
    this.apiKey = apiKey;
    this.accessToken = accessToken;
  }

  // Verificar se está configurado
  isConfigured() {
    return this.apiKey && this.accessToken;
  }

  // Headers para requisições
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  // Converter evento do sistema para formato Google Calendar
  convertToGoogleEvent(evento) {
    const startDateTime = new Date(`${evento.data}T${evento.hora || '09:00'}`);
    const endDateTime = new Date(startDateTime.getTime() + (2 * 60 * 60 * 1000)); // +2 horas

    // Cores por tipo de evento
    const colorMap = {
      'mudanca': '10', // Verde
      'visita': '11',  // Vermelho
      'entrada_box': '5', // Amarelo
      'saida_box': '6'    // Laranja
    };

    return {
      summary: evento.titulo,
      description: `${evento.tipo.toUpperCase()}\nResponsável: ${evento.responsavel}\nEndereço: ${evento.endereco}\nStatus: ${evento.status}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/Sao_Paulo'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/Sao_Paulo'
      },
      colorId: colorMap[evento.tipo] || '1',
      attendees: [
        {
          email: this.calendarId,
          displayName: 'VIP Mudanças'
        }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 dia antes
          { method: 'popup', minutes: 60 }       // 1 hora antes
        ]
      }
    };
  }

  // Criar evento no Google Calendar
  async createEvent(evento) {
    if (!this.isConfigured()) {
      console.warn('Google Calendar não configurado. Usando modo mock.');
      return { success: true, mock: true, eventId: `mock_${Date.now()}` };
    }

    try {
      const googleEvent = this.convertToGoogleEvent(evento);
      
      const response = await fetch(`${this.baseUrl}/calendars/${this.calendarId}/events`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(googleEvent)
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        eventId: result.id,
        htmlLink: result.htmlLink
      };
    } catch (error) {
      console.error('Erro ao criar evento no Google Calendar:', error);
      return {
        success: false,
        error: error.message,
        mock: true,
        eventId: `mock_${Date.now()}`
      };
    }
  }

  // Buscar eventos do Google Calendar
  async getEvents(startDate, endDate) {
    if (!this.isConfigured()) {
      console.warn('Google Calendar não configurado. Retornando eventos mock.');
      return this.getMockEvents();
    }

    try {
      const timeMin = new Date(startDate).toISOString();
      const timeMax = new Date(endDate).toISOString();
      
      const url = `${this.baseUrl}/calendars/${this.calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
      
      const response = await fetch(url, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        events: result.items.map(this.convertFromGoogleEvent)
      };
    } catch (error) {
      console.error('Erro ao buscar eventos do Google Calendar:', error);
      return {
        success: false,
        error: error.message,
        events: this.getMockEvents()
      };
    }
  }

  // Converter evento do Google Calendar para formato do sistema
  convertFromGoogleEvent(googleEvent) {
    const startDate = new Date(googleEvent.start.dateTime || googleEvent.start.date);
    
    return {
      id: googleEvent.id,
      titulo: googleEvent.summary,
      data: startDate.toISOString().split('T')[0],
      hora: startDate.toTimeString().slice(0, 5),
      tipo: this.detectEventType(googleEvent.summary, googleEvent.description),
      responsavel: this.extractResponsavel(googleEvent.description),
      endereco: this.extractEndereco(googleEvent.description),
      status: 'sincronizado',
      googleEventId: googleEvent.id,
      htmlLink: googleEvent.htmlLink
    };
  }

  // Detectar tipo de evento baseado no título/descrição
  detectEventType(summary, description) {
    const text = (summary + ' ' + (description || '')).toLowerCase();
    
    if (text.includes('mudança') || text.includes('mudanca')) return 'mudanca';
    if (text.includes('visita')) return 'visita';
    if (text.includes('entrada') && text.includes('box')) return 'entrada_box';
    if (text.includes('saída') && text.includes('box')) return 'saida_box';
    
    return 'mudanca'; // Default
  }

  // Extrair responsável da descrição
  extractResponsavel(description) {
    if (!description) return 'Não informado';
    
    const match = description.match(/Responsável:\s*([^\n]+)/i);
    return match ? match[1].trim() : 'Não informado';
  }

  // Extrair endereço da descrição
  extractEndereco(description) {
    if (!description) return 'Não informado';
    
    const match = description.match(/Endereço:\s*([^\n]+)/i);
    return match ? match[1].trim() : 'Não informado';
  }

  // Atualizar evento no Google Calendar
  async updateEvent(eventId, evento) {
    if (!this.isConfigured()) {
      console.warn('Google Calendar não configurado. Usando modo mock.');
      return { success: true, mock: true };
    }

    try {
      const googleEvent = this.convertToGoogleEvent(evento);
      
      const response = await fetch(`${this.baseUrl}/calendars/${this.calendarId}/events/${eventId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(googleEvent)
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar evento no Google Calendar:', error);
      return { success: false, error: error.message, mock: true };
    }
  }

  // Deletar evento do Google Calendar
  async deleteEvent(eventId) {
    if (!this.isConfigured()) {
      console.warn('Google Calendar não configurado. Usando modo mock.');
      return { success: true, mock: true };
    }

    try {
      const response = await fetch(`${this.baseUrl}/calendars/${this.calendarId}/events/${eventId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar evento no Google Calendar:', error);
      return { success: false, error: error.message, mock: true };
    }
  }

  // Eventos mock para quando não há configuração
  getMockEvents() {
    return [
      {
        id: 'mock_1',
        titulo: 'Mudança João Silva (Sincronizado)',
        data: '2024-06-20',
        hora: '09:00',
        tipo: 'mudanca',
        responsavel: 'Carlos Mendes',
        endereco: 'Rua das Flores, 123',
        status: 'sincronizado'
      },
      {
        id: 'mock_2',
        titulo: 'Visita Cliente Cristina (Sincronizado)',
        data: '2024-06-08',
        hora: '14:30',
        tipo: 'visita',
        responsavel: 'Ana Santos',
        endereco: 'Av. Paulista, 456',
        status: 'sincronizado'
      }
    ];
  }

  // Sincronizar todos os eventos (bidirecional)
  async syncEvents(localEvents) {
    console.log('🔄 Iniciando sincronização com Google Calendar...');
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1); // 1 mês atrás
    
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 2); // 2 meses à frente
    
    // Buscar eventos do Google
    const googleResult = await this.getEvents(startDate, endDate);
    
    if (googleResult.success) {
      console.log(`✅ ${googleResult.events.length} eventos sincronizados do Google Calendar`);
      return {
        success: true,
        googleEvents: googleResult.events,
        message: `${googleResult.events.length} eventos sincronizados com sucesso`
      };
    } else {
      console.log('⚠️ Usando eventos mock - Google Calendar não configurado');
      return {
        success: true,
        googleEvents: this.getMockEvents(),
        message: 'Modo demonstração - Configure Google Calendar nas Configurações'
      };
    }
  }
}

// Instância singleton
const googleCalendarService = new GoogleCalendarService();

export default googleCalendarService;

