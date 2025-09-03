/**
 * ChatManager.js - Gerenciador central do sistema de chat
 * Desenvolvido para SaaS Gestão
 * Última atualização: Implementação de comunicação com API e coordenação de componentes
 */

class ChatManager {
  /**
   * Construtor do gerenciador de chat
   * @param {Object} config - Configurações do chat manager
   */
  constructor(config = {}) {
    // Configurações
    let dynamicApiBaseUrl;
    let dynamicWsBaseUrl; // Usada para construir a baseUrl do WebSocketService

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Ambiente de Desenvolvimento
        dynamicApiBaseUrl = config.apiBaseUrl || 'http://localhost:3000/api'; // Adicionado /api para consistência
        dynamicWsBaseUrl = config.wsBaseUrl || 'ws://localhost:3000'; // O WebSocketService adicionará /ws se for o default dele, ou usamos abaixo
    } else {
        // Ambiente de Produção (Vercel ou outro)
        const protocol = window.location.protocol; 
        const hostname = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : '';

        dynamicApiBaseUrl = `${protocol}//${hostname}${port}/api`;
        dynamicWsBaseUrl = `wss://${hostname}${port}`; // wss para produção, sem /ws aqui
    }

    this.apiBaseUrl = dynamicApiBaseUrl;
    this.pollingInterval = config.pollingInterval || 5000;
    this.avatarPadrao = config.avatarPadrao || '../assets/logo.png';
    
    // Estado interno
    this.chats = [];
    this.chatAtivo = null;
    this.usuario = config.usuario || { id: 'user_self_007' };
    this.usuarios = [];
    this.wsService = null; // Serviço WebSocket
    this.isWebSocketConnected = false;
    
    // Componentes
    this.chatList = null;
    this.messageContainer = null;
    
    // Elementos DOM
    this.elements = {
      chatList: null,
      messageContainer: null,
      messageInput: null,
      sendButton: null,
      placeholder: null
    };
    
    // Bind de métodos
    this.iniciarWebSocket = this.iniciarWebSocket.bind(this);
    this.pararWebSocket = this.pararWebSocket.bind(this);
    this.buscarChats = this.buscarChats.bind(this);
    this.buscarMensagens = this.buscarMensagens.bind(this);
    this.enviarMensagem = this.enviarMensagem.bind(this);
    this.editarMensagem = this.editarMensagem.bind(this);
    this.excluirMensagem = this.excluirMensagem.bind(this);
    this.selecionarChat = this.selecionarChat.bind(this);
    this.criarChatIndividual = this.criarChatIndividual.bind(this);
    this.criarChatGrupo = this.criarChatGrupo.bind(this);
    this.excluirChat = this.excluirChat.bind(this);
    this.processarNovaMensagem = this.processarNovaMensagem.bind(this);
  }

  /**
   * Inicializa o gerenciador de chat
   * @param {Object} elements - Objeto com referências dos elementos DOM
   */
  async inicializar(elements) {
    // Salvar referências dos elementos
    this.elements = elements;
    
    // Inicializar componentes
    if (elements.chatList) {
      this.chatList = new ChatList(
        elements.chatList, 
        this.selecionarChat, 
        this.excluirChat
      );
    }
    
    // Inicializar eventos
    if (elements.sendButton && elements.messageInput) {
      elements.sendButton.addEventListener('click', () => {
        const texto = elements.messageInput.value.trim();
        if (texto) {
          this.enviarMensagem(texto);
        }
      });
      
      elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const texto = elements.messageInput.value.trim();
          if (texto) {
            this.enviarMensagem(texto);
          }
        }
      });
      
      // Adicionar evento de digitação
      if (elements.messageInput) {
        let typingTimeout = null;
        
        elements.messageInput.addEventListener('input', () => {
          if (this.chatAtivo && this.isWebSocketConnected) {
            // Enviar status de digitação
            this.wsService.send(JSON.stringify({
              type: 'typing',
              chatId: this.chatAtivo,
              userId: this.usuario.id,
              isTyping: true
            }));
            
            // Limpar timeout anterior
            if (typingTimeout) {
              clearTimeout(typingTimeout);
            }
            
            // Definir novo timeout para parar de digitação após 1.5 segundos
            typingTimeout = setTimeout(() => {
              if (this.isWebSocketConnected) {
                this.wsService.send(JSON.stringify({
                  type: 'typing',
                  chatId: this.chatAtivo,
                  userId: this.usuario.id,
                  isTyping: false
                }));
              }
            }, 1500);
          }
        });
      }
    }
    
    // Carregar dados iniciais
    try {
      // Carregar usuários primeiro (para nomes/avatares)
      await this.buscarUsuarios();
      
      // Depois carregar chats
      await this.buscarChats();
      
      // Iniciar WebSocket
      await this.iniciarWebSocket();
      
      console.log('ChatManager inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar ChatManager:', error);
    }
  }

  /**
   * Inicia o sistema de WebSocket para receber novas mensagens
   */
  async iniciarWebSocket() {
    // Limpar qualquer conexão existente
    this.pararWebSocket();
    
    try {
      // Atualizar indicador de status para "conectando"
      this.atualizarStatusWebSocket('connecting');
      
      // Verificar se temos o serviço WebSocket global
      if (!window.WebSocketService) {
        console.error('WebSocketService não encontrado');
        throw new Error('WebSocketService não encontrado');
      }
      
      // A `dynamicWsBaseUrl` foi definida no construtor.
      // O endpoint WebSocket específico (ex: /ws) deve ser parte da baseUrl que o WebSocketService recebe.
      // Em produção, dynamicWsBaseUrl é wss://<hostname>. Adicionamos /ws.
      // Em dev, dynamicWsBaseUrl é ws://localhost:3000. Adicionamos /ws.
      const finalWsUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                       ? (config.wsBaseUrl ? `${config.wsBaseUrl}/ws` : 'ws://localhost:3000/ws') // Se wsBaseUrl for passado na config, usa-o, senão default
                       : `${dynamicWsBaseUrl}/ws`; // Para produção, adiciona /ws.

      console.log('Tentando conectar ao WebSocket em:', finalWsUrl);
      
      this.wsService = new window.WebSocketService({
        baseUrl: finalWsUrl, 
        autoReconnect: true,
        reconnectInterval: 1000, 
        maxReconnectAttempts: 30
      });
      
      // Adicionar eventos para gerenciamento de status
      this.wsService.on('connect', () => {
        this.isWebSocketConnected = true;
        this.atualizarStatusWebSocket('online');
        console.log('WebSocket conectado com sucesso');
      });
      
      this.wsService.on('disconnect', () => {
        this.isWebSocketConnected = false;
        this.atualizarStatusWebSocket('offline');
        console.log('WebSocket desconectado');
      });
      
      this.wsService.on('error', (error) => {
        console.error('Erro detalhado no WebSocket:', error);
        
        // Adicionar informações de diagnóstico para depuração
        console.error('Estado atual da conexão:', this.wsService ? this.wsService.getReadyStateText() : 'WebSocket não iniciado');
        console.error('URL da conexão:', finalWsUrl);
        console.error('Dados do erro:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        
        // Tenta capturar informações específicas do erro de conexão
        let errorInfo = 'Erro desconhecido';
        if (error.message) {
          errorInfo = error.message;
        } else if (error.code) {
          switch (error.code) {
            case 1000: errorInfo = 'Normal closure'; break;
            case 1001: errorInfo = 'Going away'; break;
            case 1002: errorInfo = 'Protocol error'; break;
            case 1003: errorInfo = 'Unsupported data'; break;
            case 1005: errorInfo = 'No status code'; break;
            case 1006: errorInfo = 'Abnormal closure - Servidor não está rodando ou porta bloqueada'; break;
            case 1007: errorInfo = 'Invalid frame payload data'; break;
            case 1008: errorInfo = 'Policy violation'; break;
            case 1009: errorInfo = 'Message too big'; break;
            case 1010: errorInfo = 'Missing extension'; break;
            case 1011: errorInfo = 'Internal error'; break;
            case 1012: errorInfo = 'Service restart'; break;
            case 1013: errorInfo = 'Try again later'; break;
            case 1014: errorInfo = 'Bad gateway'; break;
            case 1015: errorInfo = 'TLS handshake error'; break;
            default: errorInfo = `Erro de WebSocket (código ${error.code})`;
          }
        }
        
        console.error('Diagnóstico do erro:', errorInfo);
        
        // Exibir erro no DOM para usuário (opcional)
        const statusElement = document.getElementById('websocketStatus');
        if (statusElement && statusElement.querySelector('span')) {
          statusElement.querySelector('span').textContent = `WebSocket: Desconectado (${errorInfo})`;
        }
        
        this.atualizarStatusWebSocket('offline');
        
        // Marcar para tentar reconectar se apropriado
        setTimeout(() => {
          if (!this.isWebSocketConnected) {
            console.log('Tentando reconectar automaticamente após erro...');
            this.iniciarWebSocket().catch(e => {
              console.error('Falha na reconexão automática:', e);
            });
          }
        }, 5000); // Tentar reconectar após 5 segundos
      });
      
      // Conectar ao servidor WebSocket
      await this.wsService.connect();
      
      // Autenticar usuário
      if (this.isWebSocketConnected) {
        try {
          await this.wsService.authenticate(this.usuario.id);
          console.log('Usuário autenticado no WebSocket');
          
          // Registrar handlers para mensagens
          this.wsService.on('new-message', this.processarNovaMensagem);
          this.wsService.on('typing-indicator', this.processarIndicadorDigitacao.bind(this));
          this.wsService.on('messages-read', this.processarMensagensLidas.bind(this));
          
          // Se há um chat ativo, entrar na sala
          if (this.chatAtivo) {
            await this.wsService.joinChat(this.chatAtivo, this.usuario.id);
          }
        } catch (authError) {
          console.error('Erro na autenticação WebSocket:', authError);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao inicializar WebSocket:', error);
      this.isWebSocketConnected = false;
      this.atualizarStatusWebSocket('offline');
      return false;
    }
  }

  /**
   * Tenta reconectar manualmente o WebSocket
   */
  async reconectarWebSocketManual() {
    console.log('Tentando reconectar WebSocket manualmente...');
    
    // Atualizar status visual para indicar que está tentando conectar
    this.atualizarStatusWebSocket('connecting');
    
    // Adicionar texto de ajuda no elemento de status
    const statusElement = document.getElementById('websocketStatus');
    if (statusElement && statusElement.querySelector('span')) {
      statusElement.querySelector('span').textContent = 'WebSocket: Tentando reconectar...';
    }
    
    // Adicionar classe de animação ao botão de reconexão
    const btnReconectar = document.getElementById('btnReconectarWS');
    if (btnReconectar) {
      btnReconectar.classList.add('rotating');
      btnReconectar.disabled = true;
    }
    
    try {
      // Verificar se o servidor está disponível antes de tentar reconectar
      try {
        const response = await fetch(`${this.apiBaseUrl}/api/health`, { 
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          mode: 'cors',
          cache: 'no-cache',
          timeout: 5000
        });
        
        if (response.ok) {
          console.log('Servidor HTTP está respondendo, tentando reconectar WebSocket...');
        } else {
          console.warn(`Servidor respondeu com status ${response.status}, pode indicar problemas no servidor`);
        }
      } catch (healthCheckError) {
        console.error('Erro ao verificar disponibilidade do servidor:', healthCheckError);
        console.warn('Continuando com tentativa de reconexão mesmo com falha no health check');
      }
      
      // Tenta realizar a reconexão
      const resultado = await this.iniciarWebSocket();
      
      console.log('Resultado da tentativa de reconexão:', resultado ? 'Sucesso' : 'Falha');
      
      // Remover classe de animação
      if (btnReconectar) {
        btnReconectar.classList.remove('rotating');
        btnReconectar.disabled = false;
      }
      
      // Feedback visual adicional
      if (resultado) {
        // Mostrar mensagem de sucesso temporária
        if (statusElement && statusElement.querySelector('span')) {
          statusElement.querySelector('span').textContent = 'WebSocket: Conectado com sucesso!';
          setTimeout(() => {
            if (this.isWebSocketConnected) {
              statusElement.querySelector('span').textContent = 'WebSocket: Conectado';
            }
          }, 3000);
        }
      }
      
      return resultado;
    } catch (error) {
      console.error('Erro durante tentativa de reconexão manual:', error);
      
      // Remover classe de animação em caso de erro
      if (btnReconectar) {
        btnReconectar.classList.remove('rotating');
        btnReconectar.disabled = false;
      }
      
      // Mostrar erro no status
      this.atualizarStatusWebSocket('offline');
      if (statusElement && statusElement.querySelector('span')) {
        statusElement.querySelector('span').textContent = `WebSocket: Falha na reconexão - ${error.message || 'Erro desconhecido'}`;
      }
      
      return false;
    }
  }

  /**
   * Atualiza o indicador visual de status do WebSocket
   * @param {string} status - Status do WebSocket (online, offline, connecting)
   */
  atualizarStatusWebSocket(status) {
    const statusElement = document.getElementById('websocketStatus');
    if (!statusElement) return;
    
    // Remover classes de status anteriores
    statusElement.classList.remove('ws-status-online', 'ws-status-offline', 'ws-status-connecting');
    
    // Adicionar classe de status atual
    statusElement.classList.add(`ws-status-${status}`);
    
    // Atualizar texto do status
    const statusText = {
      'online': 'WebSocket: Conectado',
      'offline': 'WebSocket: Desconectado',
      'connecting': 'WebSocket: Conectando...'
    }[status] || 'WebSocket: Desconectado';
    
    const spanElement = statusElement.querySelector('span');
    if (spanElement) {
      spanElement.textContent = statusText;
    }
    
    // Desativar botão de reconexão se estiver conectando
    const btnReconectar = document.getElementById('btnReconectarWS');
    if (btnReconectar) {
      btnReconectar.disabled = status === 'connecting';
    }
  }

  /**
   * Para o sistema de WebSocket
   */
  pararWebSocket() {
    if (this.wsService) {
      this.wsService.close();
      this.wsService = null;
    }
  }

  /**
   * Busca a lista de usuários disponíveis para chat
   */
  async buscarUsuarios() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/usuarios`);
      if (!response.ok) {
        throw new Error(`Erro ao buscar usuários: ${response.status}`);
      }
      
      const usuarios = await response.json();
      this.usuarios = usuarios.map(user => {
        // Verificar todos os possíveis campos de avatar e ID
        const avatar = user.avatar || user.foto || user.profilePic || user.image || this.avatarPadrao;
        const id = user.id || user._id;
        const nome = user.name || user.nome || user.username || 'Usuário';
        
        console.log(`Usuário carregado: ${nome}, avatar: ${avatar}`);
        
        return {
          id,
          nome,
          avatar,
          email: user.email
        };
      });
      
      console.log(`Carregados ${this.usuarios.length} usuários`);
      return this.usuarios;
    } catch (error) {
      console.error('Falha ao buscar usuários:', error);
      // Fallback para alguns usuários padrão em caso de falha
      this.usuarios = [
        { id: 'user_self_007', nome: 'Você (usuário atual)', avatar: this.usuario.avatar || this.avatarPadrao, email: 'usuario@exemplo.com' },
        { id: 'user_default1', nome: 'Maria Silva', avatar: null, email: 'maria@exemplo.com' },
        { id: 'user_default2', nome: 'João Santos', avatar: null, email: 'joao@exemplo.com' }
      ];
      return this.usuarios;
    }
  }

  /**
   * Obtém o nome de um usuário pelo seu ID
   * @param {String} userId - ID do usuário
   * @returns {String} Nome do usuário ou "Usuário" se não encontrado
   */
  getNomeUsuario(userId) {
    // Verificar se é o usuário atual
    if (userId === this.usuario.id) {
      return this.usuario.nome || 'Você';
    }
    
    // Procurar nos usuários carregados
    const usuario = this.usuarios.find(u => u.id === userId);
    return usuario ? (usuario.nome || usuario.name || 'Usuário') : 'Usuário';
  }
  
  /**
   * Obtém o avatar de um usuário pelo seu ID
   * @param {String} userId - ID do usuário
   * @returns {String} URL do avatar
   */
  getAvatarUsuario(userId) {
    if (userId === this.usuario.id) {
      return this.usuario.avatar || this.avatarPadrao;
    }
    
    const usuario = this.usuarios.find(u => u.id === userId);
    return usuario?.avatar || this.avatarPadrao;
  }

  /**
   * Busca a lista de chats do usuário
   */
  async buscarChats() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/chats/user/${this.usuario.id}`);
      
      if (!response.ok) {
        // Verificar se é apenas "nenhum chat" (não um erro)
        if (response.status === 404) {
          this.chats = [];
          if (this.chatList) {
            this.chatList.setChats([]);
          }
          return [];
        }
        throw new Error(`Erro ao buscar chats: ${response.status}`);
      }
      
      const chatsFromServer = await response.json();
      
      // Transformar os dados do servidor para o formato esperado
      this.chats = chatsFromServer.map(chat => {
        // Para chat individual, obter o nome do outro usuário
        let nome = chat.nome;
        let participanteAvatar = null;
        
        if (chat.tipo === 'individual') {
          const outroParticipanteId = chat.participanteId;
          nome = this.getNomeUsuario(outroParticipanteId);
          participanteAvatar = this.getAvatarUsuario(outroParticipanteId);
        }
        
        return {
          ...chat,
          nome,
          participanteAvatar,
          ultimaMensagemTexto: chat.ultimaMensagem?.texto || 'Nenhuma mensagem...',
          ultimaMensagemTimestamp: chat.ultimaMensagem?.timestamp
            ? new Date(chat.ultimaMensagem.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : '',
          naoLidas: chat.naoLidas || 0,
          mensagens: [] // Mensagens serão carregadas sob demanda
        };
      });
      
      // Atualizar a lista de chats
      if (this.chatList) {
        this.chatList.setChats(this.chats);
      }
      
      console.log(`Carregados ${this.chats.length} chats`);
      return this.chats;
    } catch (error) {
      console.error('Falha ao buscar chats:', error);
      return [];
    }
  }

  /**
   * Processa uma nova mensagem recebida
   * @param {String} chatId - ID do chat
   * @param {Object} mensagem - Dados da mensagem
   */
  processarNovaMensagem(chatId, mensagem) {
    // Encontrar o chat
    const chat = this.chats.find(c => c.id === chatId);
    if (!chat) return;
    
    // Verificar se já temos esta mensagem
    if (chat.mensagens && chat.mensagens.some(m => m.id === mensagem.id)) {
      return;
    }
    
    // Criar objeto de mensagem formatado
    const novaMensagem = {
      id: mensagem.id,
      texto: mensagem.texto,
      timestamp: new Date(mensagem.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      tipo: mensagem.remetenteId === this.usuario.id ? 'sent' : 'received',
      remetenteId: mensagem.remetenteId,
      remetenteNome: this.getNomeUsuario(mensagem.remetenteId),
      remetenteAvatar: this.getAvatarUsuario(mensagem.remetenteId),
      editada: mensagem.editada || false,
      ultimaEdicao: mensagem.ultimaEdicao
    };
    
    // Adicionar a mensagem ao chat
    if (!chat.mensagens) chat.mensagens = [];
    chat.mensagens.push(novaMensagem);
    
    // Atualizar dados do chat
    const novosDados = {
      ultimaMensagemTexto: mensagem.texto.substring(0, 30) + (mensagem.texto.length > 30 ? '...' : ''),
      ultimaMensagemTimestamp: novaMensagem.timestamp,
      ultimaAtividadeTimestamp: new Date().toISOString()
    };
    
    // Incrementar contador de não lidas se não for o chat ativo
    if (chatId !== this.chatAtivo) {
      novosDados.naoLidas = (chat.naoLidas || 0) + 1;
    }
    
    // Atualizar o chat na lista
    if (this.chatList) {
      this.chatList.atualizarChat(chatId, novosDados);
    }
    
    // Se for o chat ativo, renderizar a mensagem
    if (chatId === this.chatAtivo && this.elements.messageContainer) {
      this.renderizarNovaMensagem(novaMensagem);
    }
  }

  /**
   * Renderiza uma nova mensagem na interface
   * @param {Object} mensagem - Dados da mensagem
   * @returns {HTMLElement} Elemento DOM da mensagem renderizada
   */
  renderizarNovaMensagem(mensagem) {
    // Garantir que informações do remetente estejam preenchidas
    if (!mensagem.remetenteNome) {
      mensagem.remetenteNome = this.getNomeUsuario(mensagem.remetenteId);
    }
    
    if (!mensagem.remetenteAvatar) {
      mensagem.remetenteAvatar = this.getAvatarUsuario(mensagem.remetenteId);
    }
    
    const messageComponent = new ChatMessage(
      mensagem, 
      this.editarMensagem, 
      this.excluirMensagem
    );
    
    const messageElement = messageComponent.renderizar();
    
    if (this.elements.messageContainer) {
      this.elements.messageContainer.appendChild(messageElement);
      // Rolar para o final da conversa
    this.elements.messageContainer.scrollTop = this.elements.messageContainer.scrollHeight;
    }
    
    return messageElement;
  }

  /**
   * Seleciona um chat e carrega suas mensagens usando WebSocket
   * @param {String} chatId - ID do chat a ser selecionado
   */
  async selecionarChat(chatId) {
    this.chatAtivo = chatId;
    
    // Atualizar a seleção visual
    if (this.chatList) {
      this.chatList.setChatAtivo(chatId);
    }
    
    const chat = this.chats.find(c => c.id === chatId);
    if (!chat) {
      if (this.elements.placeholder) {
        this.elements.placeholder.classList.remove('hidden');
        this.elements.placeholder.classList.add('visible');
      }
      if (this.elements.messageContainer) {
        this.elements.messageContainer.innerHTML = '';
        this.elements.messageContainer.classList.remove('chat-messages-view--has-messages');
      }
      return;
    }
    
    // Exibir indicador de carregamento
    if (this.elements.messageContainer) {
      this.elements.messageContainer.innerHTML = '<p class="message-status message-status-info">Carregando mensagens...</p>';
      this.elements.messageContainer.classList.add('chat-messages-view--has-messages');
      
      if (this.elements.placeholder) {
        this.elements.placeholder.classList.add('hidden');
        this.elements.placeholder.classList.remove('visible');
      }
    }
    
    // Marcar mensagens como lidas via WebSocket se estiver conectado
    if (chat.naoLidas > 0) {
      if (this.isWebSocketConnected) {
        try {
          // Entrar na sala de chat via WebSocket
          await this.wsService.joinChat(chatId, this.usuario.id);
          
          // Marcar como lido via WebSocket
          this.wsService.markAsRead(chatId, this.usuario.id);
        
        // Atualizar contagem local
        chat.naoLidas = 0;
        
        // Atualizar a lista
        if (this.chatList) {
          this.chatList.marcarComoLido(chatId);
        }
        } catch (wsError) {
          console.warn('Erro WebSocket, recorrendo a API REST:', wsError);
          this.marcarComoLidoApi(chatId);
        }
      } else {
        // Usar API REST como fallback
        this.marcarComoLidoApi(chatId);
      }
    } else {
      // Apenas entrar na sala de chat via WebSocket
      if (this.isWebSocketConnected) {
        try {
          await this.wsService.joinChat(chatId, this.usuario.id);
        } catch (error) {
          console.warn('Erro ao entrar no chat via WebSocket:', error);
        }
      }
    }
    
    // Carregar mensagens
    await this.buscarMensagens(chatId);
  }

  /**
   * Busca as mensagens de um chat
   * @param {String} chatId - ID do chat
   */
  async buscarMensagens(chatId) {
    if (!chatId || !this.elements.messageContainer) return;
    
    try {
      // Exibir indicador de carregamento
      this.elements.messageContainer.innerHTML = '<p class="message-status message-status-info">Carregando mensagens...</p>';
      
      const response = await fetch(`${this.apiBaseUrl}/chats/${chatId}/messages`);
      
      if (!response.ok) {
        if (response.status === 403) {
          this.elements.messageContainer.innerHTML = '<p class="message-status message-status-error">Você não tem permissão para visualizar este chat.</p>';
        } else {
        throw new Error(`Erro ao buscar mensagens: ${response.status}`);
        }
        return;
      }
      
      const mensagens = await response.json();
      
      // Atualizar mensagens no chat
      const chat = this.chats.find(c => c.id === chatId);
      if (chat) {
        // Verificar se é um chat individual - esta verificação agora é feita pelo backend
        // então não precisamos verificar aqui novamente, o que evita o erro

        chat.mensagens = mensagens.map(msg => ({
          id: msg.id,
          texto: msg.texto,
          tipo: msg.remetenteId === this.usuario.id ? 'sent' : 'received',
          timestamp: new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          remetenteId: msg.remetenteId,
          remetenteNome: this.getNomeUsuario(msg.remetenteId),
          remetenteAvatar: this.getAvatarUsuario(msg.remetenteId),
          editada: msg.editada || false,
          ultimaEdicao: msg.ultimaEdicao
        }));
      }
      
      // Limpar e renderizar as mensagens
      this.elements.messageContainer.innerHTML = '';
      
      if (!chat || chat.mensagens.length === 0) {
        this.elements.messageContainer.innerHTML = '<p class="message-status message-status-empty">Nenhuma mensagem nesta conversa.</p>';
        return;
      }
      
      // Renderizar cada mensagem
      chat.mensagens.forEach(mensagem => {
        this.renderizarNovaMensagem(mensagem);
      });
      
      // Scrollar para a última mensagem
      this.elements.messageContainer.scrollTop = this.elements.messageContainer.scrollHeight;
      
    } catch (error) {
      console.error('Falha ao buscar mensagens:', error);
      this.elements.messageContainer.innerHTML = '<p class="message-status message-status-error">Erro ao carregar mensagens. Tente novamente.</p>';
    }
  }

  /**
   * Busca os participantes de um chat
   * @param {String} chatId - ID do chat
   * @returns {Array} Array com os participantes do chat
   */
  async buscarParticipantesChat(chatId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/chats/${chatId}/participantes`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar participantes: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Falha ao buscar participantes do chat:', error);
      return [];
    }
  }

  /**
   * Envia uma mensagem para o chat ativo usando WebSocket se disponível
   * @param {String} texto - Texto da mensagem
   */
  async enviarMensagem(texto) {
    if (!texto || texto.trim() === '' || !this.chatAtivo) return;
    
    // Verificar se o chat existe
    const chat = this.chats.find(c => c.id === this.chatAtivo);
    if (!chat) {
      console.error('Chat não encontrado');
      return;
    }
    
    // Limpar input
    if (this.elements.messageInput) {
      this.elements.messageInput.value = '';
    }
    
    try {
      // Criar mensagem temporária para exibição imediata (otimismo UI)
      const mensagemTempId = 'temp_' + new Date().getTime();
      const mensagemTemp = {
        id: mensagemTempId,
        texto,
        tipo: 'sent',
        remetenteId: this.usuario.id,
        remetenteNome: this.usuario.nome || 'Você',
        remetenteAvatar: this.usuario.avatar || '../assets/logo.png',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        enviando: true
      };
      
      // Adicionar a mensagem temporária ao chat
      chat.mensagens.push(mensagemTemp);
      
      // Renderizar a mensagem temporária
      const messageElement = this.renderizarNovaMensagem(mensagemTemp);
      
      // Tentar enviar via WebSocket primeiro
      if (this.isWebSocketConnected) {
        try {
          const response = await this.wsService.sendMessage(
            this.chatAtivo,
            texto,
            this.usuario.id
          );
          
          // Atualizar a mensagem temporária com a mensagem enviada
          this.atualizarMensagemEnviada(mensagemTempId, response.messageId, chat, messageElement);
          return;
        } catch (wsError) {
          console.warn('Erro ao enviar via WebSocket, recorrendo a API REST:', wsError);
          // Continuar com o método REST abaixo
        }
      }
      
      // Método REST (fallback)
      const response = await fetch(`${this.apiBaseUrl}/chats/${this.chatAtivo}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ texto })
      });
      
      if (!response.ok) {
        // Se não tiver permissão para enviar mensagens
        if (response.status === 403) {
          const errorMsg = document.createElement('div');
          errorMsg.className = 'message-error-text';
          errorMsg.textContent = 'Você não tem permissão para enviar mensagens neste chat.';
          this.elements.messageContainer.appendChild(errorMsg);
        }
        throw new Error(`Erro ao enviar mensagem: ${response.status}`);
      }
      
      const mensagemEnviada = await response.json();
      
      // Atualizar a mensagem temporária com os dados da mensagem enviada
      this.atualizarMensagemEnviada(mensagemTempId, mensagemEnviada.id, chat, messageElement, mensagemEnviada);
      
    } catch (error) {
      console.error('Falha ao enviar mensagem:', error);
      
      // Tratar erro na UI
      if (this.elements.messageContainer) {
        const errorMsg = document.createElement('div');
        errorMsg.className = 'message-error-text';
        errorMsg.textContent = 'Erro ao enviar mensagem. Tente novamente.';
        this.elements.messageContainer.appendChild(errorMsg);
      }
      
      // Remover a mensagem temporária do chat
      const index = chat.mensagens.findIndex(msg => msg.id === mensagemTempId);
      if (index !== -1) {
        chat.mensagens.splice(index, 1);
      }
      
      // Remover a mensagem temporária da UI
      if (messageElement && messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }
  }

  /**
   * Atualiza uma mensagem temporária com os dados da mensagem enviada
   * @param {String} tempId - ID temporário
   * @param {String} finalId - ID final
   * @param {Object} chat - Objeto do chat
   * @param {HTMLElement} element - Elemento DOM da mensagem
   * @param {Object} [mensagemEnviada] - Dados da mensagem enviada
   */
  atualizarMensagemEnviada(tempId, finalId, chat, element, mensagemEnviada = null) {
    // Atualizar o objeto no chat
    const index = chat.mensagens.findIndex(msg => msg.id === tempId);
    if (index !== -1) {
      const timestamp = mensagemEnviada ? 
        new Date(mensagemEnviada.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      // Substituir a mensagem temporária com a definitiva
      chat.mensagens[index] = {
        id: finalId,
        texto: mensagemEnviada ? mensagemEnviada.texto : chat.mensagens[index].texto,
      tipo: 'sent',
      remetenteId: this.usuario.id,
      remetenteNome: this.usuario.nome || 'Você',
        remetenteAvatar: this.usuario.avatar || '../assets/logo.png',
        timestamp: timestamp,
        enviando: false
      };
      
      // Atualizar a UI se necessário
      if (element) {
        element.dataset.id = finalId;
        // Remover qualquer indicador de "enviando"
        const enviandoIndicator = element.querySelector('.enviando-indicator');
        if (enviandoIndicator) {
          enviandoIndicator.remove();
        }
      }
    }
    
    // Atualizar a última mensagem do chat na lista
    chat.ultimaMensagemTexto = chat.mensagens[index].texto;
    chat.ultimaMensagemTimestamp = chat.mensagens[index].timestamp;
    
    // Se estiver usando ChatList, atualizá-la
    if (this.chatList) {
      this.chatList.atualizarChat(chat);
    }
  }

  /**
   * Marca mensagens como lidas via API REST (fallback)
   * @param {String} chatId - ID do chat
   */
  async marcarComoLidoApi(chatId) {
    try {
      await fetch(`${this.apiBaseUrl}/chats/${chatId}/ler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId: this.usuario.id })
      });
      
      // Atualizar contagem local
      const chat = this.chats.find(c => c.id === chatId);
      if (chat) {
        chat.naoLidas = 0;
      
      // Atualizar a lista
      if (this.chatList) {
          this.chatList.marcarComoLido(chatId);
        }
      }
    } catch (error) {
      console.warn('Falha ao marcar mensagens como lidas:', error);
    }
  }

  /**
   * Cria um novo chat individual
   * @param {String} participanteId - ID do usuário com quem iniciar o chat
   * @param {String} mensagemInicial - Texto da mensagem inicial (opcional)
   * @returns {Promise<Object>} Chat criado
   */
  async criarChatIndividual(participanteId, mensagemInicial) {
    if (!participanteId) {
      throw new Error('ID do participante é obrigatório');
    }
    
    // Verificar se já existe um chat com este usuário
    const chatExistente = this.chats.find(chat => 
      chat.tipo === 'individual' && 
      chat.participantes?.includes(participanteId) &&
      chat.participantes?.length === 2
    );
    
    if (chatExistente) {
      // Selecionar o chat existente
      this.selecionarChat(chatExistente.id);
      
      // Se tiver mensagem inicial, enviar
      if (mensagemInicial && mensagemInicial.trim()) {
        this.enviarMensagem(mensagemInicial);
      }
      
      return chatExistente;
    }
    
    // Criar novo chat
    try {
      const response = await fetch(`${this.apiBaseUrl}/chats/individual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participanteId,
          mensagemInicial: mensagemInicial || ''
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao criar chat: ${response.status}`);
      }
      
      const novoChat = await response.json();
      
      // Formatar para o formato interno
      const chatFormatado = {
        ...novoChat,
        nome: this.getNomeUsuario(participanteId),
        participanteAvatar: this.getAvatarUsuario(participanteId),
        ultimaMensagemTexto: novoChat.ultimaMensagem?.texto || 'Nenhuma mensagem...',
        ultimaMensagemTimestamp: novoChat.ultimaMensagem?.timestamp
          ? new Date(novoChat.ultimaMensagem.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : '',
        naoLidas: 0,
        mensagens: []
      };
      
      // Adicionar à lista e selecionar
      this.chats.unshift(chatFormatado);
      
      if (this.chatList) {
        this.chatList.adicionarChat(chatFormatado);
      }
      
      this.selecionarChat(chatFormatado.id);
      
      return chatFormatado;
    } catch (error) {
      console.error('Falha ao criar chat individual:', error);
      throw error;
    }
  }

  /**
   * Cria um novo chat em grupo
   * @param {String} nome - Nome do grupo
   * @param {Array} participantesIds - IDs dos participantes
   * @param {String} mensagemInicial - Texto da mensagem inicial (opcional)
   * @returns {Promise<Object>} Chat de grupo criado
   */
  async criarChatGrupo(nome, participantesIds, mensagemInicial) {
    if (!nome) {
      throw new Error('Nome do grupo é obrigatório');
    }
    
    if (!participantesIds || !Array.isArray(participantesIds) || participantesIds.length === 0) {
      throw new Error('É necessário informar pelo menos um participante');
    }
    
    // Garantir que o usuário atual esteja no grupo
    if (!participantesIds.includes(this.usuario.id)) {
      participantesIds.push(this.usuario.id);
    }
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/chats/group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome,
          criadorId: this.usuario.id,
          participanteIds: participantesIds,
          mensagemInicial: mensagemInicial || ''
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao criar grupo: ${response.status}`);
      }
      
      const novoGrupo = await response.json();
      
      // Formatar para o formato interno
      const grupoFormatado = {
        ...novoGrupo,
        ultimaMensagemTexto: novoGrupo.ultimaMensagem?.texto || 'Nenhuma mensagem...',
        ultimaMensagemTimestamp: novoGrupo.ultimaMensagem?.timestamp
          ? new Date(novoGrupo.ultimaMensagem.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : '',
        naoLidas: 0,
        mensagens: []
      };
      
      // Adicionar à lista e selecionar
      this.chats.unshift(grupoFormatado);
      
      if (this.chatList) {
        this.chatList.adicionarChat(grupoFormatado);
      }
      
      this.selecionarChat(grupoFormatado.id);
      
      return grupoFormatado;
    } catch (error) {
      console.error('Falha ao criar chat em grupo:', error);
      throw error;
    }
  }

  /**
   * Exclui um chat
   * @param {String} chatId - ID do chat a ser excluído
   */
  async excluirChat(chatId) {
    if (!chatId) return;
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/chats/${chatId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao excluir chat: ${response.status}`);
      }
      
      // Se for o chat ativo, limpar a área de mensagens
      if (this.chatAtivo === chatId) {
        this.chatAtivo = null;
        
        if (this.elements.messageContainer) {
          this.elements.messageContainer.innerHTML = '';
        }
        
        if (this.elements.placeholder) {
          this.elements.placeholder.classList.remove('hidden');
          this.elements.placeholder.classList.add('visible');
        }
      }
      
      // Remover o chat da lista local
      this.chats = this.chats.filter(c => c.id !== chatId);
      
      // Atualizar a UI
      if (this.chatList) {
        this.chatList.removerChat(chatId);
      }
      
      console.log(`Chat ${chatId} excluído com sucesso`);
    } catch (error) {
      console.error('Falha ao excluir chat:', error);
      alert('Erro ao excluir conversa. Tente novamente.');
    }
  }

  /**
   * Edita uma mensagem existente, usando WebSocket se disponível
   * @param {Object} mensagem - Mensagem a ser editada
   */
  async editarMensagem(mensagem) {
    if (!mensagem || !mensagem.id || mensagem.tipo !== 'sent') return;
    
    // Pedir o novo texto
    const novoTexto = prompt('Editar mensagem:', mensagem.texto);
    if (!novoTexto || novoTexto === mensagem.texto) return;
    
    try {
      // Atualizar visualmente antes (otimista)
      const chat = this.chats.find(c => c.id === this.chatAtivo);
      if (chat) {
        const mensagemLocal = chat.mensagens.find(m => m.id === mensagem.id);
        if (mensagemLocal) {
          const textoAntigo = mensagemLocal.texto;
          
          // Atualizar localmente
          mensagemLocal.texto = novoTexto;
          mensagemLocal.editada = true;
          mensagemLocal.ultimaEdicao = new Date();
          
          // Atualizar elemento visual
          const elementoMensagem = this.elements.messageContainer?.querySelector(`[data-id="${mensagem.id}"]`);
          if (elementoMensagem) {
            const textElement = elementoMensagem.querySelector('p');
            if (textElement) {
              textElement.textContent = novoTexto;
            }
            
            // Adicionar indicador de editado
            if (!elementoMensagem.querySelector('.message-edited-tag')) {
              const editadoTag = document.createElement('span');
              editadoTag.className = 'message-edited-tag';
              editadoTag.textContent = '(editada)';
              
              const infoContainer = elementoMensagem.querySelector('.message-info');
              if (infoContainer) {
                infoContainer.insertBefore(editadoTag, infoContainer.firstChild);
              }
            }
          }
          
          // Tentar enviar via WebSocket se disponível
          if (this.isWebSocketConnected) {
            try {
              // WebSocket ainda não implementa edição, então usamos API REST
              throw new Error('WebSocket não suporta edição ainda');
            } catch (wsError) {
              console.warn('Usando API REST para edição:', wsError);
              // Continuar com API REST abaixo
            }
          }
          
          // Usar API REST (principal ou fallback)
          const response = await fetch(`${this.apiBaseUrl}/chats/${this.chatAtivo}/messages/${mensagem.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto: novoTexto })
          });
          
          if (!response.ok) {
            // Reverter mudança local em caso de erro
            mensagemLocal.texto = textoAntigo;
            mensagemLocal.editada = false;
            
            if (elementoMensagem) {
              const textElement = elementoMensagem.querySelector('p');
              if (textElement) {
                textElement.textContent = textoAntigo;
              }
              const editadoTag = elementoMensagem.querySelector('.message-edited-tag');
              if (editadoTag) {
                editadoTag.remove();
              }
            }
            
            throw new Error(`Erro ao editar mensagem: ${response.status}`);
          }
        }
      }
    } catch (error) {
      console.error('Falha ao editar mensagem:', error);
      alert('Erro ao editar mensagem. Tente novamente.');
    }
  }

  /**
   * Exclui uma mensagem, usando WebSocket se disponível
   * @param {Object} mensagem - Mensagem a ser excluída
   */
  async excluirMensagem(mensagem) {
    if (!mensagem || !mensagem.id || mensagem.tipo !== 'sent') return;
    
    // Confirmar exclusão
    if (!confirm('Tem certeza que deseja excluir esta mensagem?')) {
      return;
    }
    
    try {
      // Excluir visualmente antes (otimista)
      const elementoMensagem = this.elements.messageContainer?.querySelector(`[data-id="${mensagem.id}"]`);
      if (elementoMensagem) {
        elementoMensagem.classList.add('removing');
        setTimeout(() => {
          elementoMensagem.remove();
        }, 300);
      }
      
      // Excluir do chat local
      const chat = this.chats.find(c => c.id === this.chatAtivo);
      if (chat) {
        const index = chat.mensagens.findIndex(m => m.id === mensagem.id);
        if (index !== -1) {
          const mensagemBackup = chat.mensagens[index]; // Backup para caso de erro
          chat.mensagens.splice(index, 1);
          
          // Tentar excluir via WebSocket se disponível
          if (this.isWebSocketConnected) {
            try {
              // WebSocket ainda não implementa exclusão, então usamos API REST
              throw new Error('WebSocket não suporta exclusão ainda');
            } catch (wsError) {
              console.warn('Usando API REST para exclusão:', wsError);
              // Continuar com API REST abaixo
            }
          }
          
          // Usar API REST (principal ou fallback)
          const response = await fetch(`${this.apiBaseUrl}/chats/${this.chatAtivo}/messages/${mensagem.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (!response.ok) {
            // Reverter exclusão local em caso de erro
            chat.mensagens.splice(index, 0, mensagemBackup);
            
            // Re-renderizar a mensagem
            if (elementoMensagem && !elementoMensagem.isConnected) {
              const messageComponent = new ChatMessage(
                mensagemBackup, 
                this.editarMensagem, 
                this.excluirMensagem
              );
              
              // Encontrar mensagem anterior ou posterior para inserir antes/depois
              const mensagens = chat.mensagens.filter(m => m.id !== mensagem.id);
              const proximoIndex = mensagens.findIndex(m => {
                const timestamp = new Date(m.timestamp);
                return timestamp > new Date(mensagemBackup.timestamp);
              });
              
              if (proximoIndex !== -1) {
                const proximaMensagemEl = this.elements.messageContainer?.querySelector(`[data-id="${mensagens[proximoIndex].id}"]`);
                if (proximaMensagemEl) {
                  this.elements.messageContainer?.insertBefore(messageComponent.renderizar(), proximaMensagemEl);
                } else {
                  this.elements.messageContainer?.appendChild(messageComponent.renderizar());
                }
              } else {
                this.elements.messageContainer?.appendChild(messageComponent.renderizar());
              }
            }
            
            throw new Error(`Erro ao excluir mensagem: ${response.status}`);
          }
        }
      }
    } catch (error) {
      console.error('Falha ao excluir mensagem:', error);
      alert('Erro ao excluir mensagem. Tente novamente.');
    }
  }

  /**
   * Processa indicadores de digitação recebidos via WebSocket
   * @param {Object} data - Dados do indicador de digitação
   */
  processarIndicadorDigitacao(data) {
    // Verificar se é para o chat ativo
    if (data.chatId === this.chatAtivo) {
      // Encontrar o usuário que está digitando
      const nomeUsuario = this.getNomeUsuario(data.userId);
      
      // Atualizar UI para mostrar que usuário está digitando
      const typingIndicator = document.getElementById('typingIndicator');
      
      if (data.isTyping) {
        if (!typingIndicator) {
          const indicator = document.createElement('div');
          indicator.id = 'typingIndicator';
          indicator.className = 'typing-indicator';
          indicator.textContent = `${nomeUsuario} está digitando...`;
          
          if (this.elements.messageContainer) {
            this.elements.messageContainer.appendChild(indicator);
            
            // Rolar para o final da conversa
            this.elements.messageContainer.scrollTop = this.elements.messageContainer.scrollHeight;
          }
        }
      } else {
        // Remover indicador se o usuário parou de digitar
        if (typingIndicator) {
          typingIndicator.remove();
        }
      }
    }
  }

  /**
   * Processa notificações de mensagens lidas recebidas via WebSocket
   * @param {Object} data - Dados das mensagens lidas
   */
  processarMensagensLidas(data) {
    if (data.chatId === this.chatAtivo) {
      // Atualizar UI para mostrar que mensagens foram lidas
      const readIndicator = document.createElement('div');
      readIndicator.className = 'read-indicator';
      readIndicator.textContent = 'Mensagens lidas';
      
      // Adicionar brevemente e depois remover
      if (this.elements.messageContainer) {
        this.elements.messageContainer.appendChild(readIndicator);
        setTimeout(() => readIndicator.remove(), 2000);
      }
    }
    
    // Atualizar contagem de não lidas
    const chat = this.chats.find(c => c.id === data.chatId);
    if (chat) {
      chat.naoLidas = 0;
      
      // Atualizar a lista
      if (this.chatList) {
        this.chatList.marcarComoLido(data.chatId);
      }
    }
  }
}

// Exportar para uso global
window.ChatManager = ChatManager; 