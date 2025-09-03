// sidebar-loader.js (modificado)
// Carrega Sidebar
async function loadSidebar() {
    try {
        const response = await fetch('../templates/sidebar.html');
        if (!response.ok) throw new Error('Erro ao carregar o menu lateral');

        const sidebarHtml = await response.text();
        const sidebarContainer = document.getElementById('mainSidebar');

        if (sidebarContainer) {
            sidebarContainer.innerHTML = sidebarHtml;
            initializeSidebarEvents();
            // Verificar o estado salvo do sidebar e aplicar imediatamente
            applySidebarState();
            // Definir o título da página atual
            setCurrentPageTitle();
            // Filtrar menu baseado nas permissões
            // filterMenuByPermissions(); // Comentado para exibir todos os itens
        }
    } catch (error) {
        console.error('Erro ao carregar o menu lateral:', error);
    }
}

// Filtra o menu baseado nas permissões do usuário
function filterMenuByPermissions() {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser || !currentUser.permissions) return;

    const menuItems = document.querySelectorAll('.sidebar-menu li');
    menuItems.forEach(item => {
        const link = item.querySelector('a');
        if (link) {
            const href = link.getAttribute('href');
            const pageName = href.replace('.html', '');
            
            // Se não estiver nas permissões do usuário, esconde o item
            if (!currentUser.permissions.includes(pageName)) {
                item.style.display = 'none';
            }
        }
    });
}

// Atualiza o título da página no sidebar
function setCurrentPageTitle() {
    const pageTitle = document.title;
    const sidebarPageTitle = document.getElementById('sidebarPageTitle');
    
    if (sidebarPageTitle) {
        sidebarPageTitle.textContent = pageTitle;
    }
    
    // Marcar o link da página atual como ativo
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.sidebar-link');
    
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref === currentPage) {
            link.classList.add('active');
        }
    });
}

// Aplica o estado do sidebar e ajusta o conteúdo
function applySidebarState() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.dashboard-main');
    const sidebarState = localStorage.getItem('sidebarState');
    
    if (sidebar) {
        // Aplicar classe open baseado no estado salvo
        if (sidebarState === 'open') {
            sidebar.classList.add('open');
            if (mainContent) {
                mainContent.style.marginLeft = '250px';
            }
        } else {
            sidebar.classList.remove('open');
            if (mainContent) {
                mainContent.style.marginLeft = '60px';
            }
        }
    }
}

// Função para verificar autenticação
function checkAuth() {
    let currentUser = null;
    try {
        currentUser = JSON.parse(localStorage.getItem('user'));
    } catch (e) {
        currentUser = null;
    }
    if (!currentUser || !currentUser.email) {
        // Se não estiver autenticado, redireciona para login
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Função para alternar o estado do sidebar
function toggleSidebar(sidebar, mainContent) {
    const isOpen = sidebar.classList.toggle('open');
    localStorage.setItem('sidebarState', isOpen ? 'open' : 'closed');
    
    if (mainContent) {
        mainContent.style.marginLeft = isOpen ? '250px' : '60px';
    }
}

// Inicializa eventos da Sidebar
function initializeSidebarEvents() {
    // Verifica autenticação antes de inicializar
    if (!checkAuth()) return;

    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mainContent = document.querySelector('.dashboard-main');
    const logoutButton = document.getElementById('logoutButton');

    // Configura o toggle do sidebar
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            toggleSidebar(sidebar, mainContent);
        });
    }

    // Configura o botão de logout
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            // SweetAlert2 - Modal de confirmação estilizado
            if (typeof Swal === 'undefined') {
                // Carrega o SweetAlert2 via CDN se não estiver presente
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
                script.onload = showLogoutModal;
                document.head.appendChild(script);
            } else {
                showLogoutModal();
            }
            function showLogoutModal() {
                Swal.fire({
                    title: 'Tem certeza?',
                    text: 'Deseja realmente sair do sistema?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#a78bfa',
                    cancelButtonColor: '#7c3aed',
                    confirmButtonText: 'Sim, sair',
                    cancelButtonText: 'Cancelar',
                    background: '#232026',
                    color: '#fff',
                    customClass: {
                        popup: 'swal2-logout-modal',
                        confirmButton: 'swal2-confirm-btn',
                        cancelButton: 'swal2-cancel-btn'
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Remove todos os dados do usuário
                        localStorage.removeItem('user');
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('rememberedEmail');
                        // Redireciona para a página de login
                        window.location.href = 'index.html';
                    }
                });
            }
        });
    }
}

// Executa quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    const mainSidebar = document.getElementById('mainSidebar');
    
    if (mainSidebar) {
        loadSidebar();
    } else {
        // Se o elemento mainSidebar não existir, assume que o sidebar já está no HTML
        initializeSidebarEvents();
        applySidebarState();
        setCurrentPageTitle();
        // filterMenuByPermissions(); // Comentado para exibir todos os itens
    }
});