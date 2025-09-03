/**
 * Inicialização do aplicativo com banco de dados local e sincronização
 */
import { initLocalDB } from './localDatabase';
import { setupAutoSync } from './syncService';
import SyncStatus from '../components/SyncStatus';

/**
 * Inicializa o aplicativo com suporte a banco de dados local
 * @param {Object} options - Opções de inicialização
 * @param {boolean} options.showSyncStatus - Exibe o componente de status de sincronização
 * @param {number} options.syncInterval - Intervalo de sincronização em milissegundos
 */
export const initApp = async (options = {}) => {
  const { 
    showSyncStatus = true,
    syncInterval = 60000 // 1 minuto por padrão
  } = options;
  
  try {
    console.log('Inicializando banco de dados local...');
    
    // Inicializa o banco de dados local
    await initLocalDB();
    
    console.log('Banco de dados local inicializado com sucesso.');
    
    // Configura a sincronização automática
    setupAutoSync(syncInterval);
    
    console.log(`Sincronização automática configurada com intervalo de ${syncInterval / 1000} segundos.`);
    
    // Exibe o componente de status de sincronização, se necessário
    if (showSyncStatus) {
      SyncStatus.init();
      console.log('Componente de status de sincronização inicializado.');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao inicializar o aplicativo:', error);
    return { success: false, error };
  }
};

/**
 * Verifica se o navegador suporta IndexedDB
 */
export const checkIndexedDBSupport = () => {
  if (!window.indexedDB) {
    if (window.mozIndexedDB) {
      window.indexedDB = window.mozIndexedDB;
    } else if (window.webkitIndexedDB) {
      window.indexedDB = window.webkitIndexedDB;
    } else if (window.msIndexedDB) {
      window.indexedDB = window.msIndexedDB;
    } else {
      return false;
    }
  }
  
  return true;
};

/**
 * Verifica se o aplicativo pode funcionar offline
 */
export const canWorkOffline = async () => {
  // Verifica se o navegador suporta IndexedDB
  const hasIndexedDB = checkIndexedDBSupport();
  
  if (!hasIndexedDB) {
    return { 
      canWorkOffline: false, 
      reason: 'O navegador não suporta IndexedDB, necessário para armazenamento local.' 
    };
  }
  
  // Verifica se o navegador suporta Service Workers (para PWA)
  const hasServiceWorker = 'serviceWorker' in navigator;
  
  // Verifica se o banco de dados local pode ser inicializado
  let dbWorks = false;
  try {
    await initLocalDB();
    dbWorks = true;
  } catch (error) {
    console.error('Erro ao verificar o banco de dados local:', error);
  }
  
  return { 
    canWorkOffline: dbWorks,
    hasServiceWorker,
    hasIndexedDB
  };
};

// Exporta funções de verificação de suporte
export { isOnline } from './syncService'; 