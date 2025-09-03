/**
 * Serviço de API que usa o banco de dados local quando offline
 */
import { isOnline } from './syncService';
import config from '../js/config';
import { 
  addToLocalDB, 
  updateLocalDB, 
  deleteFromLocalDB, 
  getAllFromLocalDB, 
  getByIdFromLocalDB 
} from './localDatabase';

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
 * Obtém todos os itens de uma coleção
 * @param {string} collectionName - Nome da coleção
 * @param {Object} options - Opções adicionais (query params)
 */
export const getAll = async (collectionName, options = {}) => {
  // Verifica se a coleção está configurada
  if (!API_ROUTES[collectionName]) {
    throw new Error(`Coleção ${collectionName} não configurada`);
  }
  
  // Se estiver online, tenta buscar do servidor
  if (isOnline()) {
    try {
      // Constrói a URL com os parâmetros de consulta
      const url = new URL(API_ROUTES[collectionName], window.location.origin);
      
      // Adiciona os parâmetros de consulta, se houver
      if (options.query) {
        Object.keys(options.query).forEach(key => {
          if (options.query[key] !== undefined && options.query[key] !== null) {
            url.searchParams.append(key, options.query[key]);
          }
        });
      }
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar ${collectionName}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Armazena os dados no banco local para uso offline
      if (Array.isArray(data)) {
        await addToLocalDB(collectionName, data);
      } else if (data.data && Array.isArray(data.data)) {
        await addToLocalDB(collectionName, data.data);
      }
      
      return data;
    } catch (error) {
      console.error(`Erro ao buscar ${collectionName} do servidor:`, error);
      console.log('Tentando buscar dados do banco local...');
      
      // Se falhar, busca do banco local
      const localData = await getAllFromLocalDB(collectionName);
      return localData;
    }
  } else {
    // Se estiver offline, busca do banco local
    console.log(`Dispositivo offline. Buscando ${collectionName} do banco local...`);
    const localData = await getAllFromLocalDB(collectionName);
    return localData;
  }
};

/**
 * Obtém um item específico de uma coleção
 * @param {string} collectionName - Nome da coleção
 * @param {string} id - ID do item
 */
export const getById = async (collectionName, id) => {
  // Verifica se a coleção está configurada
  if (!API_ROUTES[collectionName]) {
    throw new Error(`Coleção ${collectionName} não configurada`);
  }
  
  // Se estiver online, tenta buscar do servidor
  if (isOnline()) {
    try {
      const response = await fetch(`${API_ROUTES[collectionName]}/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar ${collectionName}/${id}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Armazena o item no banco local para uso offline
      await addToLocalDB(collectionName, data);
      
      return data;
    } catch (error) {
      console.error(`Erro ao buscar ${collectionName}/${id} do servidor:`, error);
      console.log('Tentando buscar dados do banco local...');
      
      // Se falhar, busca do banco local
      const localData = await getByIdFromLocalDB(collectionName, id);
      return localData;
    }
  } else {
    // Se estiver offline, busca do banco local
    console.log(`Dispositivo offline. Buscando ${collectionName}/${id} do banco local...`);
    const localData = await getByIdFromLocalDB(collectionName, id);
    return localData;
  }
};

/**
 * Cria um novo item em uma coleção
 * @param {string} collectionName - Nome da coleção
 * @param {Object} data - Dados do item
 */
export const create = async (collectionName, data) => {
  // Verifica se a coleção está configurada
  if (!API_ROUTES[collectionName]) {
    throw new Error(`Coleção ${collectionName} não configurada`);
  }
  
  // Se estiver online, tenta criar no servidor
  if (isOnline()) {
    try {
      const response = await fetch(API_ROUTES[collectionName], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao criar ${collectionName}: ${response.statusText}`);
      }
      
      const createdData = await response.json();
      
      // Armazena o item no banco local
      await addToLocalDB(collectionName, createdData);
      
      return createdData;
    } catch (error) {
      console.error(`Erro ao criar ${collectionName} no servidor:`, error);
      
      if (!isOnline()) {
        console.log('Dispositivo offline. Armazenando localmente para sincronização posterior...');
        
        // Se estiver offline, armazena localmente para sincronização posterior
        // Gera um ID temporário para o item
        const tempData = { 
          ...data, 
          _id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          _tempId: true, // Marca como temporário para sincronização posterior
          _createdAt: new Date().toISOString()
        };
        
        await addToLocalDB(collectionName, tempData);
        return tempData;
      }
      
      throw error;
    }
  } else {
    // Se estiver offline, armazena localmente para sincronização posterior
    console.log(`Dispositivo offline. Armazenando ${collectionName} localmente para sincronização posterior...`);
    
    // Gera um ID temporário para o item
    const tempData = { 
      ...data, 
      _id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      _tempId: true, // Marca como temporário para sincronização posterior
      _createdAt: new Date().toISOString()
    };
    
    await addToLocalDB(collectionName, tempData);
    return tempData;
  }
};

/**
 * Atualiza um item em uma coleção
 * @param {string} collectionName - Nome da coleção
 * @param {string} id - ID do item
 * @param {Object} data - Dados atualizados
 */
export const update = async (collectionName, id, data) => {
  // Verifica se a coleção está configurada
  if (!API_ROUTES[collectionName]) {
    throw new Error(`Coleção ${collectionName} não configurada`);
  }
  
  // Se estiver online, tenta atualizar no servidor
  if (isOnline()) {
    try {
      const response = await fetch(`${API_ROUTES[collectionName]}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao atualizar ${collectionName}/${id}: ${response.statusText}`);
      }
      
      const updatedData = await response.json();
      
      // Atualiza o item no banco local
      await updateLocalDB(collectionName, id, updatedData);
      
      return updatedData;
    } catch (error) {
      console.error(`Erro ao atualizar ${collectionName}/${id} no servidor:`, error);
      
      if (!isOnline()) {
        console.log('Dispositivo offline. Atualizando localmente para sincronização posterior...');
        
        // Se estiver offline, atualiza localmente para sincronização posterior
        await updateLocalDB(collectionName, id, {
          ...data,
          _updatedAt: new Date().toISOString()
        });
        
        return { ...data, _id: id };
      }
      
      throw error;
    }
  } else {
    // Se estiver offline, atualiza localmente para sincronização posterior
    console.log(`Dispositivo offline. Atualizando ${collectionName}/${id} localmente para sincronização posterior...`);
    
    await updateLocalDB(collectionName, id, {
      ...data,
      _updatedAt: new Date().toISOString()
    });
    
    return { ...data, _id: id };
  }
};

/**
 * Remove um item de uma coleção
 * @param {string} collectionName - Nome da coleção
 * @param {string} id - ID do item
 */
export const remove = async (collectionName, id) => {
  // Verifica se a coleção está configurada
  if (!API_ROUTES[collectionName]) {
    throw new Error(`Coleção ${collectionName} não configurada`);
  }
  
  // Se estiver online, tenta remover do servidor
  if (isOnline()) {
    try {
      const response = await fetch(`${API_ROUTES[collectionName]}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao remover ${collectionName}/${id}: ${response.statusText}`);
      }
      
      // Remove o item do banco local
      await deleteFromLocalDB(collectionName, id);
      
      return { success: true, id };
    } catch (error) {
      console.error(`Erro ao remover ${collectionName}/${id} do servidor:`, error);
      
      if (!isOnline()) {
        console.log('Dispositivo offline. Removendo localmente para sincronização posterior...');
        
        // Se estiver offline, remove localmente para sincronização posterior
        await deleteFromLocalDB(collectionName, id);
        
        return { success: true, id };
      }
      
      throw error;
    }
  } else {
    // Se estiver offline, remove localmente para sincronização posterior
    console.log(`Dispositivo offline. Removendo ${collectionName}/${id} localmente para sincronização posterior...`);
    
    await deleteFromLocalDB(collectionName, id);
    
    return { success: true, id };
  }
}; 