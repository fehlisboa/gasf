/**
 * WebSocketService.js - Serviço para comunicação em tempo real via WebSocket
 * Desenvolvido para SaaS Gestão
 */

class WebSocketService {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'ws://localhost:3000/ws';
    this.autoReconnect = config.autoReconnect ?? true;
    this.reconnectInterval = config.reconnectInterval || 3000;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 10;
    
    this.ws = null;
    this.reconnectAttempts = 0;
    this.connected = false;
    
    // Callbacks para eventos
    this.eventHandlers = {
      'connect': [],
      'disconnect': [],
      'message': [],
      'error': [],
      'new-message': [],
      'typing-indicator': [],
      'messages-read': []
    };
    
    // Map para promessas pendentes de autenticação e join-chat
    this.pendingPromises = new Map();
    
    // Bind methods
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.reconnect = this.reconnect.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onError = this.onError.bind(this);
    this.onOpen = this.onOpen.bind(this);
    this.send = this.send.bind(this);
    
    console.log('WebSocketService inicializado. URL base:', this.baseUrl);
  }

  /**
   * Conecta ao servidor WebSocket
   * @returns {Promise<boolean>} - Se a conexão foi estabelecida com sucesso
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log(`Tentando conexão WebSocket para: ${this.baseUrl}`);
        
        // Verificar se já existe uma conexão
        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
          console.warn('WebSocket já está conectado ou conectando. Fechando conexão existente...');
          this.ws.close();
        }
        
        this.ws = new WebSocket(this.baseUrl);
        console.log('Objeto WebSocket criado. Estado:', this.getReadyStateText());
        
        this.ws.onopen = this.onOpen.bind(this, resolve);
        this.ws.onmessage = this.onMessage;
        this.ws.onclose = this.onClose;
        this.ws.onerror = this.onError;
      } catch (error) {
        console.error('Erro ao criar conexão WebSocket:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Manipula o evento de abertura da conexão
   * @param {Function} resolve - Função resolver da promessa
   */
  onOpen(resolve) {
    console.log(`WebSocket conectado com sucesso. ReadyState: ${this.getReadyStateText()}`);
    this.connected = true;
    this.reconnectAttempts = 0;
    
    // Notificar eventos de conexão
    this.eventHandlers['connect'].forEach(handler => {
      try {
        handler();
      } catch (e) {
        console.error('Erro ao executar handler de conexão:', e);
      }
    });
    
    resolve(true);
  }

  /**
   * Retorna texto descritivo do estado atual do WebSocket
   */
  getReadyStateText() {
    if (!this.ws) return 'UNINITIATED';
    
    const states = {
      [WebSocket.CONNECTING]: 'CONNECTING (0)',
      [WebSocket.OPEN]: 'OPEN (1)',
      [WebSocket.CLOSING]: 'CLOSING (2)',
      [WebSocket.CLOSED]: 'CLOSED (3)'
    };
    
    return states[this.ws.readyState] || `UNKNOWN (${this.ws.readyState})`;
  }

  /**
   * Manipula mensagens recebidas do servidor
   * @param {MessageEvent} event - Evento de mensagem
   */
  onMessage(event) {
    try {
      console.log('WebSocket mensagem recebida:', event.data.substring(0, 100) + (event.data.length > 100 ? '...' : ''));
      const message = JSON.parse(event.data);
      
      // Resolver qualquer promessa pendente
      if (['auth-success', 'auth-fail', 'join-success', 'error', 'message-sent'].includes(message.type)) {
        const promiseId = this.getPromiseId(message.type);
        const promiseData = this.pendingPromises.get(promiseId);
        
        if (promiseData) {
          if (message.type === 'auth-fail' || message.type === 'error') {
            promiseData.reject(new Error(message.error || 'Erro na operação'));
          } else {
            promiseData.resolve(message);
          }
          this.pendingPromises.delete(promiseId);
        }
      }
      
      // Disparar eventos para o tipo de mensagem específico
      if (this.eventHandlers[message.type]) {
        this.eventHandlers[message.type].forEach(handler => handler(message));
      }
      
      // Disparar evento geral de mensagem
      this.eventHandlers['message'].forEach(handler => handler(message));
    } catch (error) {
      console.error('Erro ao processar mensagem WebSocket:', error);
    }
  }

  /**
   * Manipula eventos de fechamento da conexão
   */
  onClose(event) {
    this.connected = false;
    
    // Log detalhado sobre o fechamento
    console.log(`WebSocket desconectado, código: ${event.code}, razão: ${event.reason || 'Nenhuma razão fornecida'}`);
    
    // Códigos comuns de fechamento com explicações
    const closeReasons = {
      1000: 'Fechamento normal',
      1001: 'Indo embora (ex: navegador fechando)',
      1002: 'Erro de protocolo',
      1003: 'Dados não aceitos',
      1004: 'Reservado',
      1005: 'Código de status não fornecido',
      1006: 'Fechamento anormal (sem evento close)',
      1007: 'Dados inconsistentes',
      1008: 'Violação de política',
      1009: 'Mensagem muito grande',
      1010: 'Extensão necessária não negociada',
      1011: 'Erro inesperado',
      1012: 'Reinício do serviço',
      1013: 'Temporariamente indisponível',
      1014: 'Erro de gateway ou proxy',
      1015: 'Falha na verificação TLS'
    };
    
    const reasonText = closeReasons[event.code] || 'Código de fechamento desconhecido';
    console.log(`Explicação do código ${event.code}: ${reasonText}`);
    
    // Objeto com informações completas sobre o fechamento
    const closeInfo = {
      code: event.code,
      reason: event.reason,
      explanation: reasonText,
      wasClean: event.wasClean,
      timestamp: new Date().toISOString()
    };
    
    // Notificar eventos de desconexão com informações úteis
    this.eventHandlers['disconnect'].forEach(handler => {
      try {
        handler(closeInfo);
      } catch (e) {
        console.error('Erro ao executar handler de desconexão:', e);
      }
    });
    
    // Tentar reconectar se configurado e não foi um fechamento limpo
    if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      // Não tentar reconectar em casos de fechamento normal ou solicitado
      if (![1000, 1001].includes(event.code)) {
        this.reconnect();
      } else {
        console.log('Não tentando reconectar pois o fechamento foi normal ou solicitado.');
      }
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Número máximo de tentativas de reconexão atingido (${this.maxReconnectAttempts}). Desistindo.`);
    }
  }

  /**
   * Manipula erros na conexão
   */
  onError(error) {
    console.error('Erro na conexão WebSocket:', error);
    
    // Log adicional para depuração
    if (this.ws) {
      console.error('Estado do WebSocket no momento do erro:', this.getReadyStateText());
    }
    
    // Tentar identificar o tipo de erro
    let errorMessage = 'Erro desconhecido na conexão WebSocket';
    
    if (error.message) {
      errorMessage = error.message;
    } else if (error.type === 'error') {
      // Em alguns navegadores, o erro de conexão recusada vem como um evento
      errorMessage = 'Conexão recusada ou servidor indisponível';
    }
    
    console.error('Detalhes do erro WebSocket:', errorMessage);
    
    // Notificar eventos de erro com informações úteis
    this.eventHandlers['error'].forEach(handler => {
      try {
        handler({
          originalError: error,
          message: errorMessage,
          readyState: this.ws ? this.ws.readyState : null,
          readyStateText: this.getReadyStateText()
        });
      } catch (e) {
        console.error('Erro ao executar handler de erro:', e);
      }
    });
  }

  /**
   * Registra handler para eventos
   * @param {string} event - Nome do evento
   * @param {Function} handler - Função de callback
   */
  on(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler);
    } else {
      console.warn(`Evento não suportado: ${event}`);
    }
    
    return this; // Para encadeamento
  }

  /**
   * Remove handler de eventos
   * @param {string} event - Nome do evento
   * @param {Function} handler - Função de callback
   */
  off(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    }
    
    return this; // Para encadeamento
  }

  /**
   * Envia mensagem para o servidor
   * @param {Object} data - Dados a serem enviados
   */
  send(data) {
    if (!this.connected || !this.ws) {
      throw new Error('WebSocket não está conectado');
    }
    
    this.ws.send(JSON.stringify(data));
  }

  /**
   * Reconecta ao servidor WebSocket
   */
  reconnect() {
    this.reconnectAttempts++;
    console.log(`Tentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect().catch(err => {
        console.error('Falha na tentativa de reconexão:', err);
      });
    }, this.reconnectInterval);
  }

  /**
   * Desconecta do servidor WebSocket
   */
  disconnect() {
    if (this.ws && this.connected) {
      this.autoReconnect = false; // Desabilitar reconexão automática
      this.ws.close(1000, 'Desconexão solicitada pelo cliente');
      this.connected = false;
    }
  }

  /**
   * Autentica o usuário no WebSocket
   * @param {string} userId - ID do usuário
   * @param {string} token - Token JWT (opcional)
   * @returns {Promise<Object>} - Resposta da autenticação
   */
  authenticate(userId, token = '') {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.ws) {
        return reject(new Error('WebSocket não está conectado'));
      }
      
      const promiseId = this.getPromiseId('auth');
      this.pendingPromises.set(promiseId, { resolve, reject });
      
      this.send({
        type: 'auth',
        userId,
        token
      });
    });
  }

  /**
   * Entra em uma sala de chat
   * @param {string} chatId - ID do chat
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} - Resposta da entrada
   */
  joinChat(chatId, userId) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.ws) {
        return reject(new Error('WebSocket não está conectado'));
      }
      
      const promiseId = this.getPromiseId('join');
      this.pendingPromises.set(promiseId, { resolve, reject });
      
      this.send({
        type: 'join-chat',
        chatId,
        userId
      });
    });
  }

  /**
   * Sai de uma sala de chat
   * @param {string} chatId - ID do chat
   * @param {string} userId - ID do usuário
   */
  leaveChat(chatId, userId) {
    if (!this.connected || !this.ws) {
      console.warn('WebSocket não está conectado, não é possível sair da sala');
      return;
    }
    
    this.send({
      type: 'leave-chat',
      chatId,
      userId
    });
  }

  /**
   * Envia uma mensagem para um chat
   * @param {string} chatId - ID do chat
   * @param {string} text - Texto da mensagem
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} - Resposta do envio
   */
  sendMessage(chatId, text, userId) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.ws) {
        return reject(new Error('WebSocket não está conectado'));
      }
      
      const promiseId = this.getPromiseId('message');
      this.pendingPromises.set(promiseId, { resolve, reject });
      
      this.send({
        type: 'message',
        chatId,
        text,
        userId
      });
    });
  }

  /**
   * Marca mensagens como lidas
   * @param {string} chatId - ID do chat
   * @param {string} userId - ID do usuário
   */
  markAsRead(chatId, userId) {
    if (!this.connected || !this.ws) {
      console.warn('WebSocket não está conectado, não é possível marcar como lido');
      return;
    }
    
    this.send({
      type: 'mark-read',
      chatId,
      userId
    });
  }

  /**
   * Envia indicador de digitação
   * @param {string} chatId - ID do chat
   * @param {string} userId - ID do usuário
   * @param {boolean} isTyping - Se está digitando ou parou
   */
  sendTypingIndicator(chatId, userId, isTyping = true) {
    if (!this.connected || !this.ws) {
      return; // Silenciosamente falha se não estiver conectado
    }
    
    this.send({
      type: 'typing',
      chatId,
      userId,
      isTyping
    });
  }

  /**
   * Gera ID único para promessas pendentes
   * @private
   */
  getPromiseId(type) {
    return `${type}_${Date.now()}`;
  }
}

// Exportar para uso global
window.WebSocketService = WebSocketService; 