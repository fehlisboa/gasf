/**
 * Componente para exibir o status de sincronização
 */
import { isOnline, forceSyncAll } from '../services/syncService';

// Classe para o componente de status de sincronização
class SyncStatus {
  constructor() {
    this.container = null;
    this.statusIndicator = null;
    this.syncButton = null;
    this.pendingCount = 0;
    this.isOnline = isOnline();
    this.isSyncing = false;
  }
  
  /**
   * Inicializa o componente
   * @param {string} containerId - ID do elemento container
   */
  init(containerId = 'sync-status-container') {
    // Verifica se o container já existe
    let container = document.getElementById(containerId);
    
    // Se não existir, cria um novo
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.className = 'sync-status-container';
      document.body.appendChild(container);
    }
    
    this.container = container;
    this.render();
    this.setupEventListeners();
    
    // Atualiza o status inicial
    this.updateStatus();
    
    // Configura atualizações periódicas do status
    setInterval(() => this.updateStatus(), 30000); // A cada 30 segundos
    
    return this;
  }
  
  /**
   * Renderiza o componente
   */
  render() {
    this.container.innerHTML = `
      <div class="sync-status">
        <div class="sync-status-indicator ${this.isOnline ? 'online' : 'offline'}">
          <span class="sync-status-icon"></span>
          <span class="sync-status-text">${this.isOnline ? 'Online' : 'Offline'}</span>
        </div>
        <div class="sync-pending ${this.pendingCount > 0 ? 'has-pending' : ''}">
          <span class="sync-pending-count">${this.pendingCount}</span>
          <span class="sync-pending-text">pendente${this.pendingCount !== 1 ? 's' : ''}</span>
        </div>
        <button class="sync-button" ${this.isSyncing ? 'disabled' : ''}>
          <span class="sync-button-icon"></span>
          <span class="sync-button-text">${this.isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
        </button>
      </div>
    `;
    
    // Adiciona estilos CSS
    this.addStyles();
    
    // Armazena referências aos elementos
    this.statusIndicator = this.container.querySelector('.sync-status-indicator');
    this.syncButton = this.container.querySelector('.sync-button');
  }
  
  /**
   * Adiciona estilos CSS ao componente
   */
  addStyles() {
    // Verifica se os estilos já foram adicionados
    if (document.getElementById('sync-status-styles')) {
      return;
    }
    
    // Cria o elemento de estilo
    const style = document.createElement('style');
    style.id = 'sync-status-styles';
    style.textContent = `
      .sync-status-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        font-family: Arial, sans-serif;
      }
      
      .sync-status {
        display: flex;
        align-items: center;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        padding: 10px 15px;
      }
      
      .sync-status-indicator {
        display: flex;
        align-items: center;
        margin-right: 15px;
      }
      
      .sync-status-icon {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-right: 5px;
      }
      
      .online .sync-status-icon {
        background-color: #4CAF50;
      }
      
      .offline .sync-status-icon {
        background-color: #F44336;
      }
      
      .sync-status-text {
        font-size: 12px;
        font-weight: bold;
      }
      
      .online .sync-status-text {
        color: #4CAF50;
      }
      
      .offline .sync-status-text {
        color: #F44336;
      }
      
      .sync-pending {
        display: flex;
        align-items: center;
        margin-right: 15px;
        font-size: 12px;
        color: #757575;
      }
      
      .sync-pending.has-pending {
        color: #FF9800;
        font-weight: bold;
      }
      
      .sync-pending-count {
        margin-right: 5px;
      }
      
      .sync-button {
        display: flex;
        align-items: center;
        background-color: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 5px 10px;
        cursor: pointer;
        font-size: 12px;
        transition: background-color 0.3s;
      }
      
      .sync-button:hover {
        background-color: #1976D2;
      }
      
      .sync-button:disabled {
        background-color: #BBDEFB;
        cursor: not-allowed;
      }
      
      .sync-button-icon {
        display: inline-block;
        width: 14px;
        height: 14px;
        margin-right: 5px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .sync-button:disabled .sync-button-icon {
        animation: spin 1s linear infinite;
      }
    `;
    
    // Adiciona o estilo ao documento
    document.head.appendChild(style);
  }
  
  /**
   * Configura os event listeners
   */
  setupEventListeners() {
    // Event listener para o botão de sincronização
    this.syncButton.addEventListener('click', () => this.handleSync());
    
    // Event listeners para status de conexão
    window.addEventListener('online', () => this.handleConnectionChange(true));
    window.addEventListener('offline', () => this.handleConnectionChange(false));
  }
  
  /**
   * Lida com mudanças de conexão
   * @param {boolean} isOnline - Status da conexão
   */
  handleConnectionChange(isOnline) {
    this.isOnline = isOnline;
    this.updateStatus();
  }
  
  /**
   * Lida com o clique no botão de sincronização
   */
  async handleSync() {
    if (this.isSyncing || !this.isOnline) {
      return;
    }
    
    this.isSyncing = true;
    this.render();
    
    try {
      // Força a sincronização
      await forceSyncAll();
      
      // Atualiza o status após a sincronização
      this.updateStatus();
      
      // Exibe mensagem de sucesso
      this.showNotification('Sincronização concluída com sucesso!', 'success');
    } catch (error) {
      console.error('Erro durante a sincronização:', error);
      this.showNotification('Erro durante a sincronização. Tente novamente.', 'error');
    } finally {
      this.isSyncing = false;
      this.render();
    }
  }
  
  /**
   * Atualiza o status de sincronização
   */
  async updateStatus() {
    // Atualiza o status de conexão
    this.isOnline = isOnline();
    
    // Conta as operações pendentes
    try {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('saasGestaoLocalDB');
        request.onerror = (event) => reject(event.target.error);
        request.onsuccess = (event) => resolve(event.target.result);
      });
      
      const transaction = db.transaction(['pendingSyncs'], 'readonly');
      const store = transaction.objectStore('pendingSyncs');
      const countRequest = store.count();
      
      countRequest.onsuccess = () => {
        this.pendingCount = countRequest.result;
        this.render();
      };
      
      countRequest.onerror = (event) => {
        console.error('Erro ao contar operações pendentes:', event.target.error);
        this.pendingCount = 0;
        this.render();
      };
    } catch (error) {
      console.error('Erro ao acessar o banco de dados local:', error);
      this.pendingCount = 0;
      this.render();
    }
  }
  
  /**
   * Exibe uma notificação
   * @param {string} message - Mensagem da notificação
   * @param {string} type - Tipo da notificação (success, error, info)
   */
  showNotification(message, type = 'info') {
    // Verifica se já existe uma notificação
    let notification = document.querySelector('.sync-notification');
    
    // Se existir, remove
    if (notification) {
      notification.remove();
    }
    
    // Cria uma nova notificação
    notification = document.createElement('div');
    notification.className = `sync-notification ${type}`;
    notification.textContent = message;
    
    // Adiciona a notificação ao documento
    document.body.appendChild(notification);
    
    // Adiciona estilos
    if (!document.getElementById('sync-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'sync-notification-styles';
      style.textContent = `
        .sync-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 10px 15px;
          border-radius: 4px;
          color: white;
          font-family: Arial, sans-serif;
          font-size: 14px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          z-index: 10000;
          animation: fadeIn 0.3s, fadeOut 0.3s 2.7s;
          opacity: 0;
        }
        
        .sync-notification.success {
          background-color: #4CAF50;
        }
        
        .sync-notification.error {
          background-color: #F44336;
        }
        
        .sync-notification.info {
          background-color: #2196F3;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `;
      
      document.head.appendChild(style);
    }
    
    // Remove a notificação após 3 segundos
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Exporta uma instância única do componente
export default new SyncStatus(); 