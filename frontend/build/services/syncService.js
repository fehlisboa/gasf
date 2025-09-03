/**
 * Serviço para gerenciar a sincronização entre o banco de dados local e o servidor
 */
import { initLocalDB } from './localDatabase';
import config from '../js/config';

const DB_NAME = 'saasGestaoLocalDB';
const SYNC_STORE = 'pendingSyncs';
const API_BASE = config.apiBaseUrl;

// Mapeia as coleções para suas respectivas rotas de API
const API_ROUTES = {
  products: `${API_BASE}/products`,
  clients: `${API_BASE}/clients`,
  sales: `${API_BASE}/vendas`,
  suppliers: `${API_BASE}/suppliers`,
  categories: `${API_BASE}/categories`,
  users: `${API_BASE}/usuarios`
};

/**
 * Verifica se o dispositivo está online
 */
export const isOnline = () => {
  return navigator.onLine;
};

/**
 * Sincroniza os dados do servidor para o banco de dados local
 */
export const syncFromServer = async () => {
  if (!isOnline()) {
    console.log('Dispositivo offline. Sincronização do servidor cancelada.');
    return { success: false, message: 'Dispositivo offline' };
  }

  try {
    // Para cada coleção configurada, busca os dados do servidor e armazena localmente
    const collections = Object.keys(API_ROUTES);
    
    for (const collection of collections) {
      try {
        const apiUrl = API_ROUTES[collection];
        console.log(`Sincronizando ${collection} do servidor...`);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          console.error(`Erro ao buscar ${collection} do servidor:`, response.statusText);
          continue;
        }
        
        const data = await response.json();
        
        // Inicializa o banco de dados local
        await initLocalDB();
        
        // Abre o banco de dados
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open(DB_NAME);
          request.onerror = (event) => reject(event.target.error);
          request.onsuccess = (event) => resolve(event.target.result);
        });
        
        // Limpa os dados existentes e adiciona os novos
        const transaction = db.transaction(collection, 'readwrite');
        const store = transaction.objectStore(collection);
        
        // Limpa a coleção
        await new Promise((resolve, reject) => {
          const clearRequest = store.clear();
          clearRequest.onsuccess = () => resolve();
          clearRequest.onerror = (event) => reject(event.target.error);
        });
        
        // Adiciona os novos dados
        if (Array.isArray(data)) {
          for (const item of data) {
            store.add(item);
          }
        } else if (data.data && Array.isArray(data.data)) {
          // Alguns endpoints podem retornar { data: [...] }
          for (const item of data.data) {
            store.add(item);
          }
        }
        
        console.log(`Sincronização de ${collection} concluída. ${Array.isArray(data) ? data.length : (data.data ? data.data.length : 0)} itens sincronizados.`);
      } catch (error) {
        console.error(`Erro ao sincronizar ${collection}:`, error);
      }
    }
    
    return { success: true, message: 'Sincronização do servidor concluída' };
  } catch (error) {
    console.error('Erro durante a sincronização do servidor:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Sincroniza os dados do banco de dados local para o servidor
 */
export const syncToServer = async () => {
  if (!isOnline()) {
    console.log('Dispositivo offline. Sincronização para o servidor cancelada.');
    return { success: false, message: 'Dispositivo offline' };
  }

  try {
    // Inicializa o banco de dados local
    await initLocalDB();
    
    // Abre o banco de dados
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      request.onerror = (event) => reject(event.target.error);
      request.onsuccess = (event) => resolve(event.target.result);
    });
    
    // Obtém todas as operações pendentes de sincronização
    const transaction = db.transaction(SYNC_STORE, 'readwrite');
    const syncStore = transaction.objectStore(SYNC_STORE);
    
    const pendingSyncs = await new Promise((resolve, reject) => {
      const getAllRequest = syncStore.getAll();
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = (event) => reject(event.target.error);
    });
    
    if (pendingSyncs.length === 0) {
      console.log('Não há operações pendentes para sincronizar com o servidor.');
      return { success: true, message: 'Nenhuma operação pendente' };
    }
    
    console.log(`Sincronizando ${pendingSyncs.length} operações pendentes com o servidor...`);
    
    // Processa cada operação pendente
    for (const sync of pendingSyncs) {
      try {
        const { collection, operation, data, itemId } = sync;
        const apiUrl = API_ROUTES[collection];
        
        if (!apiUrl) {
          console.error(`Rota de API não configurada para a coleção ${collection}`);
          continue;
        }
        
        let response;
        
        switch (operation) {
          case 'add':
            response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify(data)
            });
            break;
            
          case 'update':
            response = await fetch(`${apiUrl}/${itemId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify(data)
            });
            break;
            
          case 'delete':
            response = await fetch(`${apiUrl}/${itemId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            break;
            
          default:
            console.error(`Operação desconhecida: ${operation}`);
            continue;
        }
        
        if (!response.ok) {
          console.error(`Erro ao sincronizar operação ${operation} para ${collection}:`, response.statusText);
          continue;
        }
        
        // Remove a operação sincronizada
        await new Promise((resolve, reject) => {
          const deleteRequest = syncStore.delete(sync.id);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = (event) => reject(event.target.error);
        });
        
        console.log(`Operação ${operation} para ${collection} sincronizada com sucesso.`);
      } catch (error) {
        console.error(`Erro ao sincronizar operação:`, error);
      }
    }
    
    return { success: true, message: 'Sincronização para o servidor concluída' };
  } catch (error) {
    console.error('Erro durante a sincronização para o servidor:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Configura a sincronização automática
 * @param {number} interval - Intervalo de sincronização em milissegundos
 */
export const setupAutoSync = (interval = 60000) => {
  // Sincroniza ao iniciar
  syncFromServer();
  syncToServer();
  
  // Configura sincronização periódica
  setInterval(() => {
    if (isOnline()) {
      syncToServer().then(() => syncFromServer());
    }
  }, interval);
  
  // Sincroniza quando o dispositivo ficar online
  window.addEventListener('online', () => {
    console.log('Dispositivo online. Iniciando sincronização...');
    syncToServer().then(() => syncFromServer());
  });
  
  // Registra quando o dispositivo ficar offline
  window.addEventListener('offline', () => {
    console.log('Dispositivo offline. Operações serão armazenadas localmente.');
  });
};

/**
 * Força uma sincronização completa
 */
export const forceSyncAll = async () => {
  if (!isOnline()) {
    return { success: false, message: 'Dispositivo offline' };
  }
  
  try {
    // Primeiro envia dados locais para o servidor
    await syncToServer();
    
    // Depois busca dados atualizados do servidor
    await syncFromServer();
    
    return { success: true, message: 'Sincronização completa realizada com sucesso' };
  } catch (error) {
    console.error('Erro durante a sincronização forçada:', error);
    return { success: false, message: error.message };
  }
}; 