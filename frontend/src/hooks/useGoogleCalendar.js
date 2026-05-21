import { useState, useEffect, useCallback } from 'react';
import googleCalendarService from '../services/googleCalendar';

export const useGoogleCalendar = () => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);

  // Verificar se está configurado
  useEffect(() => {
    const configured = googleCalendarService.isConfigured();
    setIsConfigured(configured);
    
    if (configured) {
      syncEvents();
    }
  }, []);

  // Configurar credenciais
  const configure = useCallback((apiKey, accessToken) => {
    try {
      googleCalendarService.setCredentials(apiKey, accessToken);
      setIsConfigured(true);
      setError(null);
      
      // Salvar no localStorage para persistência
      localStorage.setItem('google_calendar_configured', 'true');
      
      // Sincronizar eventos após configurar
      syncEvents();
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  // Sincronizar eventos
  const syncEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await googleCalendarService.syncEvents(events);
      
      if (result.success) {
        setEvents(result.googleEvents);
        setLastSync(new Date());
        
        // Notificar sucesso
        if (window.showNotification) {
          window.showNotification('success', result.message);
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
      console.error('Erro na sincronização:', err);
    } finally {
      setIsLoading(false);
    }
  }, [events]);

  // Criar evento
  const createEvent = useCallback(async (evento) => {
    setIsLoading(true);
    
    try {
      const result = await googleCalendarService.createEvent(evento);
      
      if (result.success) {
        // Atualizar lista local
        const newEvent = {
          ...evento,
          googleEventId: result.eventId,
          htmlLink: result.htmlLink,
          status: result.mock ? 'mock' : 'sincronizado'
        };
        
        setEvents(prev => [...prev, newEvent]);
        
        if (window.showNotification) {
          const message = result.mock 
            ? 'Evento criado (modo demonstração)' 
            : 'Evento criado e sincronizado com Google Calendar';
          window.showNotification('success', message);
        }
        
        return { success: true, event: newEvent };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Atualizar evento
  const updateEvent = useCallback(async (eventId, evento) => {
    setIsLoading(true);
    
    try {
      const result = await googleCalendarService.updateEvent(eventId, evento);
      
      if (result.success) {
        // Atualizar lista local
        setEvents(prev => prev.map(e => 
          e.googleEventId === eventId 
            ? { ...e, ...evento, status: result.mock ? 'mock' : 'sincronizado' }
            : e
        ));
        
        if (window.showNotification) {
          const message = result.mock 
            ? 'Evento atualizado (modo demonstração)' 
            : 'Evento atualizado no Google Calendar';
          window.showNotification('success', message);
        }
        
        return { success: true };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Deletar evento
  const deleteEvent = useCallback(async (eventId) => {
    setIsLoading(true);
    
    try {
      const result = await googleCalendarService.deleteEvent(eventId);
      
      if (result.success) {
        // Remover da lista local
        setEvents(prev => prev.filter(e => e.googleEventId !== eventId));
        
        if (window.showNotification) {
          const message = result.mock 
            ? 'Evento removido (modo demonstração)' 
            : 'Evento removido do Google Calendar';
          window.showNotification('success', message);
        }
        
        return { success: true };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Obter eventos por data
  const getEventsByDate = useCallback((date) => {
    const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
    return events.filter(event => event.data === dateStr);
  }, [events]);

  // Obter eventos do mês
  const getEventsByMonth = useCallback((year, month) => {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    return events.filter(event => event.data.startsWith(monthStr));
  }, [events]);

  // Status da sincronização
  const getSyncStatus = useCallback(() => {
    if (!isConfigured) {
      return {
        status: 'not_configured',
        message: 'Google Calendar não configurado',
        color: 'yellow'
      };
    }
    
    if (isLoading) {
      return {
        status: 'syncing',
        message: 'Sincronizando...',
        color: 'blue'
      };
    }
    
    if (error) {
      return {
        status: 'error',
        message: `Erro: ${error}`,
        color: 'red'
      };
    }
    
    if (lastSync) {
      const timeDiff = Date.now() - lastSync.getTime();
      const minutes = Math.floor(timeDiff / 60000);
      
      return {
        status: 'synced',
        message: minutes < 1 ? 'Sincronizado agora' : `Sincronizado há ${minutes} min`,
        color: 'green'
      };
    }
    
    return {
      status: 'ready',
      message: 'Pronto para sincronizar',
      color: 'gray'
    };
  }, [isConfigured, isLoading, error, lastSync]);

  return {
    // Estado
    isConfigured,
    isLoading,
    events,
    lastSync,
    error,
    
    // Ações
    configure,
    syncEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    
    // Utilitários
    getEventsByDate,
    getEventsByMonth,
    getSyncStatus
  };
};

