/**
 * ChatList.js - Componente para gerenciamento da lista de chats
 * Desenvolvido para SaaS Gestão
 * Última atualização: Implementação de funcionalidade de exclusão de conversas
 */

class ChatList {
  /**
   * Construtor do componente de lista de chats
   * @param {HTMLElement} containerElement - Elemento HTML onde a lista será renderizada
   * @param {Function} onChatSelecionado - Função chamada quando um chat é selecionado
   * @param {Function} onChatExcluido - Função chamada quando um chat é excluído
   */
  constructor(containerElement, onChatSelecionado, onChatExcluido) {
    this.containerElement = containerElement;
    this.onChatSelecionado = onChatSelecionado;
    this.onChatExcluido = onChatExcluido;
    this.chats = [];
    this.chatAtivoId = null;
  }

  /**
   * Define os dados dos chats
   * @param {Array} chats - Array de objetos de chat
   */
  setChats(chats) {
    this.chats = chats;
    this.renderizar();
  }

  /**
   * Define o chat ativo
   * @param {String} chatId - ID do chat ativo
   */
  setChatAtivo(chatId) {
    this.chatAtivoId = chatId;
    
    // Atualizar classes nos elementos
    const items = this.containerElement.querySelectorAll('.chat-item');
    items.forEach(item => {
      const isActive = item.dataset.chatId === chatId;
      item.classList.toggle('active', isActive);
    });
  }

  /**
   * Atualiza dados específicos de um chat
   * @param {Object|String} chatOrId - Objeto do chat ou ID do chat a ser atualizado
   * @param {Object} novosDados - Novos dados para o chat (opcional se o primeiro parâmetro for um objeto chat)
   */
  atualizarChat(chatOrId, novosDados) {
    // Verificar se o primeiro parâmetro é um objeto de chat completo
    if (typeof chatOrId === 'object' && chatOrId.id) {
      const chatId = chatOrId.id;
      const chatIndex = this.chats.findIndex(c => c.id === chatId);
      
      if (chatIndex === -1) {
        // Se não encontrado, pode ser um chat novo
        this.adicionarChat(chatOrId);
        return;
      }
      
      // Usar o objeto de chat como novosDados
      novosDados = chatOrId;
      chatOrId = chatId;
    }
    
    const chatId = chatOrId;
    const chatIndex = this.chats.findIndex(c => c.id === chatId);
    if (chatIndex === -1) return;
    
    // Atualizar dados
    Object.assign(this.chats[chatIndex], novosDados);
    
    // Se for uma nova mensagem, mover o chat para o topo
    if (novosDados.ultimaMensagemTexto) {
      // Remover o chat atual da lista
      const chat = this.chats.splice(chatIndex, 1)[0];
      // Inseri-lo no topo
      this.chats.unshift(chat);
    }
    
    // Renderizar a lista atualizada
    this.renderizar();
  }

  /**
   * Adiciona um novo chat à lista
   * @param {Object} chat - Objeto com dados do novo chat
   */
  adicionarChat(chat) {
    // Verificar se o chat já existe
    if (!chat || this.chats.some(c => c.id === chat.id)) {
      return;
    }
    
    // Adicionar ao início da lista (topo)
    this.chats.unshift(chat);
    this.renderizar();
  }

  /**
   * Remove um chat da lista
   * @param {String} chatId - ID do chat a ser removido
   */
  removerChat(chatId) {
    const chatIndex = this.chats.findIndex(c => c.id === chatId);
    if (chatIndex === -1) return;
    
    // Remover o chat da lista
    this.chats.splice(chatIndex, 1);
    
    // Se o chat excluído era o ativo, limpar chatAtivoId
    if (this.chatAtivoId === chatId) {
      this.chatAtivoId = null;
    }
    
    // Renderizar a lista atualizada
    this.renderizar();
  }

  /**
   * Renderiza a lista de chats no elemento container
   */
  renderizar() {
    if (!this.containerElement) return;
    
    // Limpar o container
    this.containerElement.innerHTML = '';
    
    // Mensagem para lista vazia
    if (!this.chats || this.chats.length === 0) {
      const emptyMessage = document.createElement('li');
      emptyMessage.className = 'empty-chat-list';
      emptyMessage.textContent = 'Nenhuma conversa iniciada';
      this.containerElement.appendChild(emptyMessage);
      return;
    }
    
    // Renderizar cada chat
    for (const chat of this.chats) {
      // Criar elemento de item
      const chatItem = document.createElement('li');
      chatItem.className = 'chat-item';
      chatItem.dataset.chatId = chat.id;
      
      if (chat.id === this.chatAtivoId) {
        chatItem.classList.add('active');
      }
      
      const avatarUrl = chat.tipo === 'individual' && chat.participanteAvatar 
        ? chat.participanteAvatar 
        : (chat.avatar || null);
        
      const nomeUsuario = chat.nome || 'Chat sem nome';
      
      // Verificar se existe um avatar válido
      if (avatarUrl) {
        // Avatar como imagem
        const avatar = document.createElement('img');
        avatar.src = avatarUrl;
        avatar.alt = `Avatar de ${nomeUsuario}`;
        avatar.className = 'chat-avatar';
        avatar.onerror = () => {
          // Se a imagem falhar, substituir por iniciais
          chatItem.removeChild(avatar);
          chatItem.insertBefore(this.criarAvatarIniciais(nomeUsuario), chatItem.firstChild);
        };
        chatItem.appendChild(avatar);
      } else {
        // Avatar com iniciais
        chatItem.appendChild(this.criarAvatarIniciais(nomeUsuario));
      }
      
      // Informações do chat
      const chatInfo = document.createElement('div');
      chatInfo.className = 'chat-info';
      
      // Nome do chat
      const chatName = document.createElement('div');
      chatName.className = 'chat-name';
      chatName.textContent = nomeUsuario;
      chatInfo.appendChild(chatName);
      
      // Última mensagem
      const lastMessage = document.createElement('div');
      lastMessage.className = 'chat-last-message';
      lastMessage.textContent = chat.ultimaMensagemTexto || 'Nenhuma mensagem...';
      chatInfo.appendChild(lastMessage);
      
      chatItem.appendChild(chatInfo);
      
      // Meta informações (timestamp e contagem não lida)
      const metaInfo = document.createElement('div');
      metaInfo.className = 'chat-meta-info-sidebar';
      
      // Timestamp
      if (chat.ultimaMensagemTimestamp) {
        const timestamp = document.createElement('span');
        timestamp.className = 'chat-timestamp';
        timestamp.textContent = chat.ultimaMensagemTimestamp;
        metaInfo.appendChild(timestamp);
      }
      
      // Contador de mensagens não lidas
      if (chat.naoLidas && chat.naoLidas > 0) {
        const unreadCount = document.createElement('span');
        unreadCount.className = 'chat-unread-count';
        unreadCount.textContent = chat.naoLidas > 99 ? '99+' : chat.naoLidas;
        metaInfo.appendChild(unreadCount);
      }
      
      chatItem.appendChild(metaInfo);
      
      // Adicionar botão de exclusão
      const excluirBtn = document.createElement('button');
      excluirBtn.className = 'btn-excluir-chat';
      excluirBtn.innerHTML = '<i class="fas fa-trash"></i>';
      excluirBtn.title = 'Excluir conversa';
      
      // Adicionar evento de clique no botão de exclusão
      excluirBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Evitar que o clique se propague para o item
        
        if (confirm(`Tem certeza que deseja excluir a conversa com ${nomeUsuario}?`)) {
          if (this.onChatExcluido) {
            this.onChatExcluido(chat.id);
          }
        }
      });
      
      chatItem.appendChild(excluirBtn);
      
      // Adicionar evento de clique no item
      chatItem.addEventListener('click', () => {
        this.onChatSelecionado(chat.id);
      });
      
      // Adicionar à lista
      this.containerElement.appendChild(chatItem);
    }
  }

  /**
   * Cria elemento de avatar com as iniciais do nome
   * @param {String} nome - Nome para extrair as iniciais
   * @returns {HTMLElement} Elemento do avatar
   */
  criarAvatarIniciais(nome) {
    const avatarIniciais = document.createElement('div');
    avatarIniciais.className = 'chat-avatar-iniciais';
    
    // Extrair iniciais (máximo 2)
    const iniciais = nome
      .split(' ')
      .filter(parte => parte.length > 0)
      .slice(0, 2)
      .map(parte => parte[0])
      .join('');
    
    avatarIniciais.textContent = iniciais;
    return avatarIniciais;
  }

  /**
   * Marca as mensagens de um chat como lidas
   * @param {String} chatId - ID do chat
   */
  marcarComoLido(chatId) {
    const chat = this.chats.find(c => c.id === chatId);
    if (chat) {
      chat.naoLidas = 0;
      this.renderizar();
    }
  }
}

// Exportar para uso global
window.ChatList = ChatList; 