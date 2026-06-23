"""
google_calendar_service.py — Legacy Moving
Integração com Google Calendar usando Service Account.

Variáveis de ambiente necessárias:
  GOOGLE_SERVICE_ACCOUNT_JSON  JSON do service account (string ou base64)
  GOOGLE_CALENDAR_ID           ID do calendário (padrão: 'primary')

Setup:
  1. Google Cloud Console → Criar projeto → Ativar Google Calendar API
  2. IAM e Admin → Contas de serviço → Criar → Baixar JSON
  3. Google Calendar → Configurações do calendário → Compartilhar com a conta de serviço (editor)
  4. Copiar o JSON da conta de serviço como string e colocar em GOOGLE_SERVICE_ACCOUNT_JSON
"""

import os
import json
import base64
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Cores por tipo de serviço (colorId do Google Calendar)
# https://developers.google.com/calendar/api/v3/reference/events
TIPO_COLOR = {
    'mudanca':    '11',   # Tomate (vermelho)
    'embalagem':  '3',    # Uva (roxo)
    'transporte': '9',    # Mirtilo (azul)
    'icamento':   '7',    # Pavão (ciano)
    'montagem':   '10',   # Sálvia (verde)
    'guarda':     '5',    # Banana (amarelo)
    'outro':      '8',    # Grafite (cinza)
}

TIPO_EMOJI = {
    'mudanca':    '🚚',
    'embalagem':  '📦',
    'transporte': '🛻',
    'icamento':   '🏗️',
    'montagem':   '🔧',
    'guarda':     '🏠',
    'outro':      '📋',
}

TIPO_LABEL = {
    'mudanca':    'Mudança',
    'embalagem':  'Embalagem',
    'transporte': 'Transporte',
    'icamento':   'Içamento',
    'montagem':   'Montagem',
    'guarda':     'Guarda-Móveis',
    'outro':      'Serviço',
}


def _get_service():
    """
    Retorna o serviço Google Calendar autenticado via service account.
    Retorna None se as credenciais não estiverem configuradas.
    """
    json_str = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON', '').strip()
    if not json_str:
        return None

    try:
        # Suporte a base64 (para facilitar colocar no .env)
        if not json_str.startswith('{'):
            json_str = base64.b64decode(json_str).decode('utf-8')

        creds_info = json.loads(json_str)

        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        SCOPES = ['https://www.googleapis.com/auth/calendar']
        creds = service_account.Credentials.from_service_account_info(
            creds_info, scopes=SCOPES
        )
        service = build('calendar', 'v3', credentials=creds, cache_discovery=False)
        return service
    except Exception as e:
        logger.warning(f'[GoogleCalendar] Falha ao inicializar serviço: {e}')
        return None


def _calendar_id():
    return os.environ.get('GOOGLE_CALENDAR_ID', 'primary')


def _build_event(cliente, tipo, data_inicio, data_fim=None,
                 equipe='', veiculo='', observacoes='', os_numero=''):
    """Monta o payload de evento para a API do Google Calendar."""
    tipo_label = TIPO_LABEL.get(tipo, 'Serviço')
    emoji = TIPO_EMOJI.get(tipo, '📋')
    color_id = TIPO_COLOR.get(tipo, '8')

    # Título: "📦 Embalagem — João da Silva"
    summary = f"{emoji} {tipo_label} — {cliente}"
    if os_numero:
        summary += f" ({os_numero})"

    # Descrição com detalhes operacionais
    desc_parts = []
    if os_numero:
        desc_parts.append(f"OS: {os_numero}")
    if equipe:
        desc_parts.append(f"Equipe: {equipe}")
    if veiculo:
        desc_parts.append(f"Veículo: {veiculo}")
    if observacoes:
        desc_parts.append(f"Obs: {observacoes}")
    desc_parts.append("— Legacy Moving ERP")
    description = '\n'.join(desc_parts)

    # Datas — se não tiver hora, cria evento de dia inteiro
    if isinstance(data_inicio, str):
        try:
            data_inicio = datetime.fromisoformat(data_inicio)
        except Exception:
            return None

    # Eventos de etapa sem hora → dia inteiro
    if data_inicio.hour == 0 and data_inicio.minute == 0:
        date_str = data_inicio.strftime('%Y-%m-%d')
        start = {'date': date_str}
        end   = {'date': date_str}
    else:
        start_iso = data_inicio.isoformat()
        if data_fim:
            end_iso = data_fim.isoformat() if not isinstance(data_fim, str) else data_fim
        else:
            # Duração padrão 8h se não especificada
            from datetime import timedelta
            end_iso = (data_inicio + timedelta(hours=8)).isoformat()
        start = {'dateTime': start_iso, 'timeZone': 'America/Sao_Paulo'}
        end   = {'dateTime': end_iso,   'timeZone': 'America/Sao_Paulo'}

    return {
        'summary':     summary,
        'description': description,
        'start':       start,
        'end':         end,
        'colorId':     color_id,
        'reminders': {
            'useDefault': False,
            'overrides': [
                {'method': 'popup', 'minutes': 60},
                {'method': 'email', 'minutes': 1440},  # 24h antes
            ],
        },
        # Tag para identificar eventos criados pelo ERP
        'extendedProperties': {
            'private': {
                'legacy_moving_erp': 'true',
                'os_numero': os_numero or '',
            }
        },
    }


def criar_evento(cliente, tipo, data, equipe='', veiculo='',
                 observacoes='', os_numero=''):
    """
    Cria evento no Google Calendar.
    Retorna o event_id (str) ou None se falhar/não configurado.
    """
    service = _get_service()
    if not service:
        return None

    payload = _build_event(cliente, tipo, data, None,
                           equipe, veiculo, observacoes, os_numero)
    if not payload:
        return None

    try:
        event = service.events().insert(
            calendarId=_calendar_id(),
            body=payload
        ).execute()
        event_id = event.get('id')
        logger.info(f'[GoogleCalendar] Evento criado: {event_id} — {cliente}')
        return event_id
    except Exception as e:
        logger.warning(f'[GoogleCalendar] Erro ao criar evento: {e}')
        return None


def atualizar_evento(event_id, cliente, tipo, data, equipe='', veiculo='',
                     observacoes='', os_numero=''):
    """
    Atualiza evento existente no Google Calendar.
    Retorna True se sucesso, False caso contrário.
    """
    if not event_id:
        return False

    service = _get_service()
    if not service:
        return False

    payload = _build_event(cliente, tipo, data, None,
                           equipe, veiculo, observacoes, os_numero)
    if not payload:
        return False

    try:
        service.events().update(
            calendarId=_calendar_id(),
            eventId=event_id,
            body=payload
        ).execute()
        logger.info(f'[GoogleCalendar] Evento atualizado: {event_id}')
        return True
    except Exception as e:
        logger.warning(f'[GoogleCalendar] Erro ao atualizar evento {event_id}: {e}')
        return False


def deletar_evento(event_id):
    """
    Remove evento do Google Calendar.
    Retorna True se sucesso, False caso contrário.
    """
    if not event_id:
        return False

    service = _get_service()
    if not service:
        return False

    try:
        service.events().delete(
            calendarId=_calendar_id(),
            eventId=event_id
        ).execute()
        logger.info(f'[GoogleCalendar] Evento deletado: {event_id}')
        return True
    except Exception as e:
        logger.warning(f'[GoogleCalendar] Erro ao deletar evento {event_id}: {e}')
        return False


def listar_proximos_eventos(dias=30):
    """
    Lista os próximos eventos do calendário criados pelo ERP.
    Útil para diagnóstico/painel de status.
    """
    service = _get_service()
    if not service:
        return []

    from datetime import timedelta
    agora = datetime.now(timezone.utc).isoformat()
    limite = (datetime.now(timezone.utc) + timedelta(days=dias)).isoformat()

    try:
        result = service.events().list(
            calendarId=_calendar_id(),
            timeMin=agora,
            timeMax=limite,
            singleEvents=True,
            orderBy='startTime',
            privateExtendedProperty='legacy_moving_erp=true',
            maxResults=250,
        ).execute()
        return result.get('items', [])
    except Exception as e:
        logger.warning(f'[GoogleCalendar] Erro ao listar eventos: {e}')
        return []


def status_integracao():
    """Verifica se a integração está configurada e funcionando."""
    configurado = bool(os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON', '').strip())
    if not configurado:
        return {'configurado': False, 'mensagem': 'GOOGLE_SERVICE_ACCOUNT_JSON não definido'}

    service = _get_service()
    if not service:
        return {'configurado': False, 'mensagem': 'Erro ao inicializar serviço (verifique as credenciais)'}

    try:
        cal = service.calendars().get(calendarId=_calendar_id()).execute()
        return {
            'configurado': True,
            'calendario': cal.get('summary', _calendar_id()),
            'calendar_id': _calendar_id(),
            'mensagem': 'Integração ativa',
        }
    except Exception as e:
        return {'configurado': False, 'mensagem': f'Erro ao acessar calendário: {e}'}
