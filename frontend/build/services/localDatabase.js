/**
 * Serviço para gerenciar o banco de dados local usando IndexedDB
 */

const DB_NAME = 'saasGestaoLocalDB';
const DB_VERSION = 1;

// Armazena as coleções que serão sincronizadas
const COLLECTIONS = [
  { name: 'products', keyPath: '_id' },
  { name: 'clients', keyPath: '_id' },
  { name: 'sales', keyPath: '_id' },
  { name: 'suppliers', keyPath: '_id' },
  { name: 'categories', keyPath: '_id' },
  { name: 'users', keyPath: '_id' }
];

// Armazena registros pendentes para sincronização
const SYNC_STORE = 'pendingSyncs';

/**
 * Inicializa o banco de dados local
 */
export const initLocalDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('Erro ao abrir o banco de dados local:', event.target.error);
      reject(event.target.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Cria as stores para cada coleção
      COLLECTIONS.forEach(collection => {
        if (!db.objectStoreNames.contains(collection.name)) {
          db.createObjectStore(collection.name, { keyPath: collection.keyPath });
          console.log(`Store ${collection.name} criada`);
        }
      });
      
      // Cria store para operações pendentes de sincronização
      if (!db.objectStoreNames.contains(SYNC_STORE)) {
        const syncStore = db.createObjectStore(SYNC_STORE, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('collection', 'collection', { unique: false });
        syncStore.createIndex('operation', 'operation', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('Store de sincronização criada');
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      console.log('Banco de dados local inicializado com sucesso');
      resolve(db);
    };
  });
};

/**
 * Adiciona dados a uma coleção
 */
export const addToLocalDB = async (collectionName, data) => {
  if (!COLLECTIONS.some(c => c.name === collectionName)) {
    throw new Error(`Coleção ${collectionName} não configurada`);
  }
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    
    request.onerror = (event) => reject(event.target.error);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([collectionName, SYNC_STORE], 'readwrite');
      const store = transaction.objectStore(collectionName);
      const syncStore = transaction.objectStore(SYNC_STORE);
      
      // Se for um array, adiciona cada item individualmente
      if (Array.isArray(data)) {
        data.forEach(item => {
          store.put(item);
        });
      } else {
        store.put(data);
        
        // Registra operação para sincronização posterior
        syncStore.add({
          collection: collectionName,
          operation: 'add',
          data: data,
          timestamp: new Date().getTime(),
          synced: false
        });
      }
      
      transaction.oncomplete = () => resolve(data);
      transaction.onerror = (event) => reject(event.target.error);
    };
  });
};

/**
 * Atualiza dados em uma coleção
 */
export const updateLocalDB = async (collectionName, id, data) => {
  if (!COLLECTIONS.some(c => c.name === collectionName)) {
    throw new Error(`Coleção ${collectionName} não configurada`);
  }
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    
    request.onerror = (event) => reject(event.target.error);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([collectionName, SYNC_STORE], 'readwrite');
      const store = transaction.objectStore(collectionName);
      const syncStore = transaction.objectStore(SYNC_STORE);
      
      // Primeiro obtém o item existente
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const existingItem = getRequest.result;
        if (!existingItem) {
          reject(new Error(`Item com ID ${id} não encontrado`));
          return;
        }
        
        // Atualiza o item com os novos dados
        const updatedItem = { ...existingItem, ...data };
        store.put(updatedItem);
        
        // Registra operação para sincronização posterior
        syncStore.add({
          collection: collectionName,
          operation: 'update',
          itemId: id,
          data: updatedItem,
          timestamp: new Date().getTime(),
          synced: false
        });
      };
      
      transaction.oncomplete = () => resolve(data);
      transaction.onerror = (event) => reject(event.target.error);
    };
  });
};

/**
 * Remove dados de uma coleção
 */
export const deleteFromLocalDB = async (collectionName, id) => {
  if (!COLLECTIONS.some(c => c.name === collectionName)) {
    throw new Error(`Coleção ${collectionName} não configurada`);
  }
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    
    request.onerror = (event) => reject(event.target.error);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([collectionName, SYNC_STORE], 'readwrite');
      const store = transaction.objectStore(collectionName);
      const syncStore = transaction.objectStore(SYNC_STORE);
      
      store.delete(id);
      
      // Registra operação para sincronização posterior
      syncStore.add({
        collection: collectionName,
        operation: 'delete',
        itemId: id,
        timestamp: new Date().getTime(),
        synced: false
      });
      
      transaction.oncomplete = () => resolve({ success: true, id });
      transaction.onerror = (event) => reject(event.target.error);
    };
  });
};

/**
 * Obtém todos os dados de uma coleção
 */
export const getAllFromLocalDB = async (collectionName) => {
  if (!COLLECTIONS.some(c => c.name === collectionName)) {
    throw new Error(`Coleção ${collectionName} não configurada`);
  }
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    
    request.onerror = (event) => reject(event.target.error);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(collectionName, 'readonly');
      const store = transaction.objectStore(collectionName);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result);
      };
      
      getAllRequest.onerror = (event) => {
        reject(event.target.error);
      };
    };
  });
};

/**
 * Obtém um item específico de uma coleção
 */
export const getByIdFromLocalDB = async (collectionName, id) => {
  if (!COLLECTIONS.some(c => c.name === collectionName)) {
    throw new Error(`Coleção ${collectionName} não configurada`);
  }
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    
    request.onerror = (event) => reject(event.target.error);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(collectionName, 'readonly');
      const store = transaction.objectStore(collectionName);
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        resolve(getRequest.result);
      };
      
      getRequest.onerror = (event) => {
        reject(event.target.error);
      };
    };
  });
};

/**
 * Limpa todos os dados de uma coleção
 */
export const clearLocalCollection = async (collectionName) => {
  if (!COLLECTIONS.some(c => c.name === collectionName)) {
    throw new Error(`Coleção ${collectionName} não configurada`);
  }
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    
    request.onerror = (event) => reject(event.target.error);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(collectionName, 'readwrite');
      const store = transaction.objectStore(collectionName);
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        resolve({ success: true });
      };
      
      clearRequest.onerror = (event) => {
        reject(event.target.error);
      };
    };
  });
}; 