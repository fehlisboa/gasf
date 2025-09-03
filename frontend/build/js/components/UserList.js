/**
 * UserList.js - Componente para exibição e gerenciamento da lista de usuários (agenda de contatos)
 * Desenvolvido para SaaS Gestão
 * Última atualização: Implementação de lista de contatos estilo WhatsApp
 */

class UserList {
  /**
   * Construtor do componente de lista de usuários
   * @param {HTMLElement} containerElement - Elemento HTML onde a lista será renderizada
   * @param {Function} onUserSelected - Função chamada quando um usuário é selecionado para chat
   */
  constructor(containerElement, onUserSelected) {
    this.containerElement = containerElement;
    this.onUserSelected = onUserSelected;
    this.usuarios = [];
    this.filteredUsuarios = [];
    this.searchTerm = '';
    this.isLoading = false;
  }

  /**
   * Define os dados dos usuários
   * @param {Array} usuarios - Array de objetos de usuário
   */
  setUsuarios(usuarios) {
    this.usuarios = usuarios;
    this.filteredUsuarios = [...usuarios];
    this.renderizar();
  }

  /**
   * Define o estado de carregamento
   * @param {Boolean} isLoading - Estado de carregamento
   */
  setLoading(isLoading) {
    this.isLoading = isLoading;
    this.renderizar();
  }

  /**
   * Filtra a lista de usuários com base no termo de busca
   * @param {String} termo - Termo de busca
   */
  filtrarUsuarios(termo) {
    this.searchTerm = termo.toLowerCase().trim();
    
    if (!this.searchTerm) {
      this.filteredUsuarios = [...this.usuarios];
    } else {
      this.filteredUsuarios = this.usuarios.filter(usuario => 
        (usuario.nome || '').toLowerCase().includes(this.searchTerm) || 
        (usuario.email && usuario.email.toLowerCase().includes(this.searchTerm)) ||
        (usuario.status && usuario.status.toLowerCase().includes(this.searchTerm))
      );
    }
    
    this.renderizar();
  }

  /**
   * Renderiza a lista de usuários no elemento container
   */
  renderizar() {
    console.log('UserList: Iniciando renderização');
    
    // Limpar o container antes de renderizar
    this.containerElement.innerHTML = '';
    
    // Adicionar classe para força visibilidade
    this.containerElement.classList.add('force-visible');
    this.containerElement.style.display = 'flex';
    
    // Criar elemento de pesquisa
    const searchContainer = document.createElement('div');
    searchContainer.className = 'user-search-container';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Pesquisar contatos...';
    searchInput.className = 'user-search-input';
    
    searchContainer.appendChild(searchInput);
    this.containerElement.appendChild(searchContainer);
    
    // Criar container para a lista de usuários
    const userListElement = document.createElement('div');
    userListElement.className = 'user-list';
    
    // Verificar se há usuários para renderizar
    if (!this.filteredUsuarios || this.filteredUsuarios.length === 0) {
      console.log('UserList: Nenhum usuário para renderizar, usando dados de demonstração');
      // Renderizar mensagem ou dados de demonstração
      const demoUsers = [
        { id: 1, nome: 'Ana Silva', foto: null, status: 'online' },
        { id: 2, nome: 'Carlos Oliveira', foto: null, status: 'offline' },
        { id: 3, nome: 'Maria Santos', foto: null, status: 'online' },
        { id: 4, nome: 'João Pereira', foto: null, status: 'ausente' }
      ];
      
      demoUsers.forEach(user => {
        const userItem = this._criarItemUsuario(user);
        userListElement.appendChild(userItem);
      });
    } else {
      console.log(`UserList: Renderizando ${this.filteredUsuarios.length} usuários`);
      // Renderizar usuários reais
      this.filteredUsuarios.forEach(user => {
        const userItem = this._criarItemUsuario(user);
        userListElement.appendChild(userItem);
      });
    }
    
    this.containerElement.appendChild(userListElement);
    
    // Adicionar manipulador de eventos para pesquisa
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      
      // Obter todos os itens da lista de usuários
      const userItems = userListElement.querySelectorAll('.user-item');
      
      userItems.forEach(item => {
        const userName = item.querySelector('.user-name').textContent.toLowerCase();
        
        if (userName.includes(searchTerm)) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
    
    console.log('UserList: Renderização concluída');
    
    // Garantir visibilidade
    setTimeout(() => {
      if (this.containerElement.style.display !== 'flex') {
        console.log('UserList: Container ainda não visível, forçando exibição');
        this.containerElement.style.display = 'flex';
        this.containerElement.setAttribute('style', 'display: flex !important; visibility: visible !important;');
      }
    }, 200);
    
    return this.containerElement;
  }
  
  /**
   * Renderização de emergência em caso de falha na renderização principal
   */
  renderizacaoEmergencia() {
    try {
      if (!this.containerElement) return;
      
      this.containerElement.innerHTML = '';
      
      const mensagemErro = document.createElement('div');
      mensagemErro.className = 'empty-user-list';
      mensagemErro.innerHTML = 'Não foi possível carregar a lista de contatos.<br>Clique em <i class="fas fa-sync-alt"></i> para tentar novamente.';
      
      this.containerElement.appendChild(mensagemErro);
    } catch (e) {
      console.error('Falha crítica na renderização de emergência:', e);
    }
  }
  
  /**
   * Retorna a classe CSS correspondente ao status
   * @param {String} status - Status do usuário
   * @returns {String} Classe CSS para o status
   */
  getStatusClass(status) {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('disponível') || statusLower.includes('disponivel') || statusLower.includes('online')) {
      return 'status-disponivel';
    } else if (statusLower.includes('ocupado') || statusLower.includes('não perturbe') || statusLower.includes('busy')) {
      return 'status-ocupado';
    } else if (statusLower.includes('ausente') || statusLower.includes('offline') || statusLower.includes('away')) {
      return 'status-ausente';
    } else if (statusLower.includes('reunião') || statusLower.includes('reuniao') || statusLower.includes('meeting')) {
      return 'status-reuniao';
    } else {
      return 'status-offline';
    }
  }
  
  /**
   * Renderiza a barra de pesquisa
   */
  renderizarBarraPesquisa() {
    const searchBar = document.createElement('div');
    searchBar.className = 'user-search-bar';
    
    const searchIcon = document.createElement('i');
    searchIcon.className = 'fas fa-search';
    searchBar.appendChild(searchIcon);
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Buscar usuários...';
    searchInput.className = 'user-search-input';
    searchInput.value = this.searchTerm;
    
    // Adicionar evento de input para filtrar em tempo real
    searchInput.addEventListener('input', (e) => {
      this.filtrarUsuarios(e.target.value);
    });
    
    searchBar.appendChild(searchInput);
    
    if (this.searchTerm) {
      const clearButton = document.createElement('button');
      clearButton.className = 'user-search-clear';
      clearButton.innerHTML = '<i class="fas fa-times"></i>';
      clearButton.title = 'Limpar pesquisa';
      
      clearButton.addEventListener('click', () => {
        searchInput.value = '';
        this.filtrarUsuarios('');
      });
      
      searchBar.appendChild(clearButton);
    }
    
    this.containerElement.appendChild(searchBar);
  }

  /**
   * Cria elemento de avatar com as iniciais do nome
   * @param {String} nome - Nome para extrair as iniciais
   * @returns {HTMLElement} Elemento do avatar
   */
  criarAvatarIniciais(nome) {
    const avatarIniciais = document.createElement('div');
    avatarIniciais.className = 'user-avatar-iniciais';
    avatarIniciais.title = nome;
    
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

  _criarItemUsuario(usuario) {
    const userItem = document.createElement('li');
    userItem.className = 'user-item';
    userItem.dataset.userId = usuario.id || usuario._id || `usuario_${usuario.id || usuario._id || 0}`;
    
    const avatarUrl = usuario.avatar || usuario.foto || null;
    const nomeUsuario = usuario.nome || usuario.name || 'Usuário sem nome';
    
    // Container para avatar e status
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'avatar-container';
    avatarContainer.style.position = 'relative';
    
    // Verificar se existe um avatar válido
    if (avatarUrl) {
      // Avatar como imagem
      const avatar = document.createElement('img');
      avatar.src = avatarUrl;
      avatar.alt = `Avatar de ${nomeUsuario}`;
      avatar.className = 'user-avatar';
      avatar.onerror = () => {
        // Se a imagem falhar, substituir por iniciais
        avatarContainer.removeChild(avatar);
        avatarContainer.appendChild(this.criarAvatarIniciais(nomeUsuario));
      };
      avatarContainer.appendChild(avatar);
    } else {
      // Avatar com iniciais
      avatarContainer.appendChild(this.criarAvatarIniciais(nomeUsuario));
    }
    
    // Adicionar indicador de status ao avatar
    if (usuario.status) {
      const statusClass = this.getStatusClass(usuario.status);
      const statusIndicator = document.createElement('span');
      statusIndicator.className = `avatar-status ${statusClass}`;
      avatarContainer.appendChild(statusIndicator);
    }
    
    userItem.appendChild(avatarContainer);
    
    // Informações do usuário
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    
    // Nome do usuário
    const userName = document.createElement('div');
    userName.className = 'user-name';
    userName.textContent = nomeUsuario;
    userInfo.appendChild(userName);
    
    // Email/status do usuário (se disponível)
    if (usuario.email || usuario.status) {
      const userStatus = document.createElement('div');
      userStatus.className = 'user-status';
      
      // Adicionar indicador de status
      if (usuario.status) {
        const statusIndicator = document.createElement('span');
        statusIndicator.className = `user-status-indicator ${this.getStatusClass(usuario.status)}`;
        userStatus.appendChild(statusIndicator);
      }
      
      const statusText = document.createElement('span');
      statusText.textContent = usuario.status || usuario.email || '';
      userStatus.appendChild(statusText);
      
      userInfo.appendChild(userStatus);
    }
    
    userItem.appendChild(userInfo);
    
    // Botão de iniciar chat
    const iniciarChatBtn = document.createElement('button');
    iniciarChatBtn.className = 'btn-iniciar-chat';
    iniciarChatBtn.innerHTML = '<i class="fas fa-comment"></i>';
    iniciarChatBtn.title = `Iniciar conversa com ${nomeUsuario}`;
    
    iniciarChatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onUserSelected) {
        this.onUserSelected(usuario);
      }
    });
    
    userItem.appendChild(iniciarChatBtn);
    
    // Adicionar evento de clique no item
    userItem.addEventListener('click', () => {
      if (this.onUserSelected) {
        this.onUserSelected(usuario);
      }
    });
    
    return userItem;
  }
}

// Exportar para uso global
window.UserList = UserList; 