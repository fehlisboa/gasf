/**
 * Configuração central do frontend
 */

const config = {
    development: {
    apiBaseUrl: 'https://gasf-backend.onrender.com',
    wsBaseUrl: 'wss://gasf-backend.onrender.com'
},
production: {
    apiBaseUrl: 'https://gasf-backend.onrender.com',
    wsBaseUrl: 'wss://gasf-backend.onrender.com'
}
};

// Determina o ambiente atual
const environment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'development' 
    : 'production';

// Exporta a configuração do ambiente atual
export default config[environment]; 