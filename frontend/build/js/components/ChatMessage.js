/**
 * ChatMessage.js - Componente para exibição e gerenciamento de mensagens do chat
 * Desenvolvido para SaaS Gestão
 * Última atualização: Implementação de funcionalidades de exibição de foto e nome do usuário
 */

class ChatMessage {
  /**
   * Construtor do componente de mensagem
   * @param {Object} mensagem - Objeto com dados da mensagem
   * @param {Function} onEditar - Função chamada quando a mensagem for editada
   * @param {Function} onExcluir - Função chamada quando a mensagem for excluída
   */
  constructor(mensagem, onEditar, onExcluir) {
    this.mensagem = mensagem;
    this.onEditar = onEditar;
    this.onExcluir = onExcluir;
    this.elemento = null;
    this.avatarUrl = mensagem.remetenteAvatar || null;
    this.nomeRemetente = mensagem.remetenteNome || 'Usuário';
  }

  /**
   * Renderiza a mensagem no DOM
   * @returns {HTMLElement} Elemento HTML da mensagem
   */
  renderizar() {
    // Criar container geral da mensagem (incluirá avatar + bolha)
    const container = document.createElement('div');
    container.className = `message-container ${this.mensagem.tipo === 'sent' ? 'message-sent' : 'message-received'}`;
    container.dataset.id = this.mensagem.id;
    container.dataset.remetente = this.mensagem.remetenteId;
    
    // Criar avatar (visível para mensagens recebidas e enviadas)
    const avatarContainer = document.createElement('div');
    avatarContainer.className = `message-avatar-container ${this.mensagem.tipo === 'sent' ? 'sent' : ''}`;
    
    if (this.avatarUrl) {
      // Usar avatar como imagem
      const avatar = document.createElement('img');
      avatar.className = 'message-avatar';
      avatar.src = this.avatarUrl;
      avatar.alt = this.nomeRemetente;
      avatar.title = this.nomeRemetente;
      
      // Se a imagem falhar, substituir por iniciais
      avatar.onerror = () => {
        avatarContainer.removeChild(avatar);
        avatarContainer.appendChild(this.criarAvatarIniciais(this.nomeRemetente));
      };
      
      avatarContainer.appendChild(avatar);
    } else {
      // Usar iniciais como avatar
      avatarContainer.appendChild(this.criarAvatarIniciais(this.nomeRemetente));
    }
    
    // Criar elemento principal (bolha da mensagem)
    const elemento = document.createElement('div');
    elemento.className = `message-bubble ${this.mensagem.tipo}`;
    elemento.dataset.id = this.mensagem.id;

    // Adicionar avatar antes da mensagem para mensagens recebidas
    if (this.mensagem.tipo === 'received') {
      container.appendChild(avatarContainer);
    }

    // Exibir nome do remetente para todas as mensagens
    const nomeRemetente = document.createElement('div');
    nomeRemetente.className = 'message-sender-name';
    nomeRemetente.textContent = this.mensagem.tipo === 'sent' ? 'Você' : this.nomeRemetente;
    elemento.appendChild(nomeRemetente);

    // Conteúdo da mensagem
    const conteudo = document.createElement('p');
    conteudo.textContent = this.mensagem.texto;
    elemento.appendChild(conteudo);

    // Criar opções para mensagens enviadas (editar/excluir)
    if (this.mensagem.tipo === 'sent') {
      const opcoesContainer = document.createElement('div');
      opcoesContainer.className = 'message-options';
      
      // Botão de editar
      const btnEditar = document.createElement('button');
      btnEditar.className = 'message-option-btn';
      btnEditar.innerHTML = '<i class="fas fa-edit"></i>';
      btnEditar.title = 'Editar mensagem';
      btnEditar.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onEditar(this.mensagem);
      });
      
      // Botão de excluir
      const btnExcluir = document.createElement('button');
      btnExcluir.className = 'message-option-btn';
      btnExcluir.innerHTML = '<i class="fas fa-trash"></i>';
      btnExcluir.title = 'Excluir mensagem';
      btnExcluir.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onExcluir(this.mensagem);
      });
      
      opcoesContainer.appendChild(btnEditar);
      opcoesContainer.appendChild(btnExcluir);
      elemento.appendChild(opcoesContainer);
    }

    // Informações de tempo e edição
    const infoContainer = document.createElement('div');
    infoContainer.className = 'message-info';
    
    // Tag de mensagem editada
    if (this.mensagem.editada) {
      const editadaTag = document.createElement('span');
      editadaTag.className = 'message-edited-tag';
      editadaTag.textContent = '(editada)';
      infoContainer.appendChild(editadaTag);
    }
    
    // Timestamp
    const timestamp = document.createElement('span');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = this.mensagem.timestamp;
    infoContainer.appendChild(timestamp);
    
    elemento.appendChild(infoContainer);
    
    // Adicionar elemento da mensagem ao container
    container.appendChild(elemento);
    
    // Adicionar avatar depois da mensagem para mensagens enviadas
    if (this.mensagem.tipo === 'sent') {
      container.appendChild(avatarContainer);
    }
    
    this.elemento = container;
    return container;
  }

  /**
   * Cria elemento de avatar com as iniciais do nome
   * @param {String} nome - Nome para extrair as iniciais
   * @returns {HTMLElement} Elemento do avatar
   */
  criarAvatarIniciais(nome) {
    const avatarIniciais = document.createElement('div');
    avatarIniciais.className = 'message-avatar-iniciais';
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

  /**
   * Atualiza o conteúdo da mensagem no DOM
   * @param {Object} novosDados - Novos dados para atualizar a mensagem
   */
  atualizar(novosDados) {
    if (!this.elemento) return;
    
    // Atualizar as propriedades da mensagem
    Object.assign(this.mensagem, novosDados);
    
    // Atualizar o texto
    const conteudoP = this.elemento.querySelector('p');
    if (conteudoP) {
      conteudoP.textContent = this.mensagem.texto;
    }
    
    // Tratar a tag de editado
    let editadaTag = this.elemento.querySelector('.message-edited-tag');
    if (this.mensagem.editada) {
      if (!editadaTag) {
        editadaTag = document.createElement('span');
        editadaTag.className = 'message-edited-tag';
        editadaTag.textContent = '(editada)';
        const infoContainer = this.elemento.querySelector('.message-info');
        if (infoContainer) {
          infoContainer.insertBefore(editadaTag, infoContainer.firstChild);
        }
      }
    } else if (editadaTag) {
      editadaTag.remove();
    }
    
    // Atualizar timestamp se fornecido
    if (novosDados.timestamp) {
      const timestampSpan = this.elemento.querySelector('.message-timestamp');
      if (timestampSpan) {
        timestampSpan.textContent = novosDados.timestamp;
      }
    }
    
    // Atualizar avatar se fornecido
    if (novosDados.remetenteAvatar) {
      this.avatarUrl = novosDados.remetenteAvatar;
      const avatarImg = this.elemento.querySelector('.message-avatar');
      if (avatarImg) {
        avatarImg.src = novosDados.remetenteAvatar;
      }
    }
    
    // Atualizar nome se fornecido
    if (novosDados.remetenteNome) {
      this.nomeRemetente = novosDados.remetenteNome;
      const nomeRemetenteElem = this.elemento.querySelector('.message-sender-name');
      if (nomeRemetenteElem) {
        nomeRemetenteElem.textContent = this.mensagem.tipo === 'sent' ? 'Você' : this.nomeRemetente;
      }
    }
  }

  /**
   * Remove a mensagem do DOM
   */
  remover() {
    if (this.elemento && this.elemento.parentNode) {
      this.elemento.parentNode.removeChild(this.elemento);
    }
  }
}

// Exportar para uso global
window.ChatMessage = ChatMessage; 