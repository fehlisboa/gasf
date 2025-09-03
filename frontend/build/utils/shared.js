// Importa o inicializador do aplicativo
import { initApp, canWorkOffline } from '../services/initApp';

// Funções compartilhadas entre as páginas
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializa o banco de dados local e a sincronização
    try {
        const offlineSupport = await canWorkOffline();
        
        if (offlineSupport.canWorkOffline) {
            console.log('Inicializando suporte offline...');
            
            const result = await initApp({
                showSyncStatus: true,
                syncInterval: 60000 // 1 minuto
            });
            
            if (result.success) {
                console.log('Suporte offline inicializado com sucesso!');
            } else {
                console.error('Erro ao inicializar suporte offline:', result.error);
            }
        } else {
            console.warn('Este navegador não suporta funcionalidades offline:', offlineSupport.reason);
        }
    } catch (error) {
        console.error('Erro ao verificar suporte offline:', error);
    }
    
    console.log('Iniciando aplicação...');
    
    // Inicializar toggle da sidebar
    initializeSidebarToggle();
});

// Função para inicializar o toggle da sidebar
function initializeSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        });

        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
        }
    }
}

// Função para mostrar notificações
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Função para logout
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Adicionar evento de logout ao botão da sidebar
document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logoutSidebar');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});

// Adicionar evento de logout
const logoutButton = document.getElementById('logoutButton');
if (logoutButton) {
    logoutButton.addEventListener('click', logout);
}

// Verificação de token
const authToken = localStorage.getItem('authToken');
if (!authToken) {
    console.warn("Token não encontrado. Redirecionando para login.");
    // Redireciona para a página de login se não houver token
    window.location.href = 'index.html'; 
    return false;
} 