/**
 * Configuração central do frontend
 */

const config = {
    development: {
    apiBaseUrl: 'https://SEU-BACKEND.onrender.com/api',
    wsBaseUrl: 'ws://localhost:3000'
},
production: {
    apiBaseUrl: 'https://SEU-BACKEND.onrender.com/api',
    wsBaseUrl: 'wss://SEU-BACKEND.onrender.com'
}
};

// Determina o ambiente atual
const environment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'development' 
    : 'production';

// Exporta a configuração do ambiente atual
export default config[environment]; 