// auth-helper.js - Funções auxiliares para autenticação

// Função para verificar a autenticação do usuário
function verificarAutenticacao() {
    // Verificar token de autenticação - compatível com ambas as chaves
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    
    if (!token) {
        console.warn("Token não encontrado. Redirecionando para login.");
        window.location.href = 'index.html';
        return false;
    }
    
    // Verificar dados do usuário
    try {
        const userData = JSON.parse(localStorage.getItem('user') || localStorage.getItem('currentUser'));
        if (!userData) {
            console.warn("Dados de usuário não encontrados. Redirecionando para login.");
            window.location.href = 'index.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        window.location.href = 'index.html';
        return false;
    }
}

// Função para obter o token de autenticação
function obterToken() {
    return localStorage.getItem('authToken') || localStorage.getItem('token');
}

// Função para obter os dados do usuário
function obterUsuario() {
    try {
        return JSON.parse(localStorage.getItem('user') || localStorage.getItem('currentUser'));
    } catch (error) {
        console.error("Erro ao obter dados do usuário:", error);
        return null;
    }
}

// Função para logout
function logout() {
    // Remover todos os dados de autenticação para garantir consistência
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('rememberedEmail');
    
    // Redirecionar para login
    window.location.href = 'index.html';
}

// Verificar autenticação ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
    
    // Adicionar evento de logout aos botões, se existirem
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
    
    const logoutSidebar = document.getElementById('logoutSidebar');
    if (logoutSidebar) {
        logoutSidebar.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}); 