// Função para carregar o template do topbar
async function loadTopbar() {
    try {
        const response = await fetch('../templates/topbar.html');
        if (!response.ok) throw new Error('Erro ao carregar o topbar');

        const topbarHtml = await response.text();
        const topbarContainer = document.getElementById('mainTopbarContainer');

        if (topbarContainer) {
            topbarContainer.innerHTML = topbarHtml;
            // Inicializar o relógio e as informações do usuário após carregar o template
            inicializarTopbar();
        }
    } catch (error) {
        console.error('Erro ao carregar o topbar:', error);
    }
}

// Função para atualizar o relógio digital
function atualizarRelogio() {
    const clockTime = document.getElementById('clockTime');
    const clockDate = document.getElementById('clockDate');
    if (!clockTime || !clockDate) return;

    const now = new Date();
    
    // Formata apenas horas e minutos
    const horas = String(now.getHours()).padStart(2, '0');
    const minutos = String(now.getMinutes()).padStart(2, '0');
    const novoHorario = `${horas}:${minutos}`;
    
    // Atualiza o horário apenas se mudou
    if (clockTime.getAttribute('data-time') !== novoHorario) {
        clockTime.setAttribute('data-time', novoHorario);
        clockTime.textContent = novoHorario;
    }
    
    // Formata a data com o dia da semana
    const diasSemana = [
        'Domingo', 'Segunda', 'Terça', 
        'Quarta', 'Quinta', 'Sexta', 'Sábado'
    ];
    const diaSemana = diasSemana[now.getDay()];
    const dia = String(now.getDate()).padStart(2, '0');
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const mes = meses[now.getMonth()];
    const ano = now.getFullYear();
    
    const novaData = `${diaSemana}, ${dia} ${mes} ${ano}`;
    
    // Atualiza a data apenas se mudou
    if (clockDate.textContent !== novaData) {
        clockDate.textContent = novaData;
    }
}

// Função para atualizar as informações do usuário no topbar
function atualizarInfoUsuario() {
    try {
        // Obter os dados do usuário
        const userStr = localStorage.getItem('user');
        
        let userData = null;
        
        if (userStr) {
            userData = JSON.parse(userStr);
        }
        
        // Atualizar o nome do usuário
        const userNameElement = document.getElementById('headerUserName');
        if (userNameElement && userData) {
            const displayName = userData.name || userData.nome || 'Usuário';
            // Formata o nome para capitalizar cada palavra
            const formattedName = displayName
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            
            // Cria elementos separados para "Olá" e o nome
            userNameElement.innerHTML = `
                <span class="greeting">Olá,</span>
                <span class="user-display-name">${formattedName}</span>
            `;
        }
        
        // Atualizar a foto do usuário
        const userAvatarElement = document.getElementById('headerUserAvatar');
        if (userAvatarElement && userData) {
            // Limpar o conteúdo atual
            while (userAvatarElement.firstChild) {
                userAvatarElement.removeChild(userAvatarElement.firstChild);
            }
            
            // Verificar se o usuário tem uma foto
            if (userData.photo) {
                console.log('Atualizando foto do usuário no topbar');
                const timestamp = new Date().getTime(); // Adicionar timestamp para evitar cache
                const photoUrl = userData.photo.includes('base64') 
                    ? userData.photo // Já é uma string base64
                    : `${userData.photo}?t=${timestamp}`; // URL com timestamp
                
                const img = document.createElement('img');
                img.src = photoUrl;
                img.alt = userData.name || 'Usuário';
                
                // Adicionar tratamento de erro para imagens que não carregam
                img.onerror = function() {
                    console.error('Erro ao carregar imagem de perfil, usando ícone padrão');
                    userAvatarElement.innerHTML = '<i class="fas fa-user"></i>';
                };
                
                userAvatarElement.appendChild(img);
                console.log('Foto de perfil atualizada no topbar');
            } else {
                // Se não tiver foto, mostrar o ícone padrão
                console.log('Usuário sem foto, usando ícone padrão');
                const icon = document.createElement('i');
                icon.className = 'fas fa-user';
                userAvatarElement.appendChild(icon);
            }
            
            // Adicionar tooltip com o nome do usuário
            userAvatarElement.title = userData.name || userData.nome || 'Usuário';
        }
    } catch (error) {
        console.error('Erro ao atualizar informações do usuário:', error);
    }
}

// Função para inicializar todas as funcionalidades do topbar
function inicializarTopbar() {
    // Inicializa o relógio
    atualizarRelogio();
    // Atualiza a cada minuto, não a cada segundo
    setInterval(atualizarRelogio, 60000);
    
    // Atualiza informações do usuário
    atualizarInfoUsuario();
    
    // Inicializar o dropdown do usuário
    inicializarUserDropdown();
}

// Função para inicializar o dropdown do usuário
function inicializarUserDropdown() {
    const userAvatar = document.getElementById('headerUserAvatar');
    const userDropdown = document.getElementById('userDropdown');
    const profileSettingsBtn = document.getElementById('profileSettingsBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (!userAvatar || !userDropdown) return;
    
    // Função para mostrar/esconder o dropdown
    const toggleDropdown = (e) => {
        e.stopPropagation(); // Impedir que o clique se propague para o document
        userDropdown.classList.toggle('show');
        userAvatar.classList.toggle('active');
    };
    
    // Adicionar evento de clique ao avatar
    userAvatar.addEventListener('click', toggleDropdown);
    
    // Fechar dropdown ao clicar fora dele
    document.addEventListener('click', (e) => {
        if (userDropdown.classList.contains('show') && 
            !userDropdown.contains(e.target) && 
            !userAvatar.contains(e.target)) {
            userDropdown.classList.remove('show');
            userAvatar.classList.remove('active');
        }
    });
    
    // Evento para ir para a página de configurações de perfil
    if (profileSettingsBtn) {
        profileSettingsBtn.addEventListener('click', () => {
            // Verificar se estamos na página de usuários
            if (window.location.href.includes('/usuarios')) {
                // Se estamos na página de usuários, mostrar a seção de perfil
                const sections = document.querySelectorAll('.user-section');
                if (sections.length > 0) {
                    sections.forEach(s => s.classList.add('hidden'));
                    const perfilSection = document.getElementById('section-perfil');
                    if (perfilSection) {
                        perfilSection.classList.remove('hidden');
                        perfilSection.scrollIntoView({ behavior: 'smooth' });
                        
                        // Remover qualquer ID de edição para garantir que estamos editando o próprio perfil
                        localStorage.removeItem('editingUserId');
                        
                        // Atualizar o título
                        const formTitle = perfilSection.querySelector('h3');
                        if (formTitle) {
                            formTitle.innerHTML = '<i class="fas fa-user-cog"></i> Editar Meu Perfil';
                        }
                        
                        // Preencher o formulário com os dados do usuário atual
                        preencherPerfilUsuario();
                    }
                    userDropdown.classList.remove('show');
                    userAvatar.classList.remove('active');
                }
            } else {
                // Se não estamos na página de usuários, redirecionar
                window.location.href = '/usuarios?section=perfil';
            }
        });
    }
    
    // Evento para logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Confirmar logout
            const confirmLogout = confirm('Tem certeza que deseja sair?');
            if (confirmLogout) {
                // Limpar dados de autenticação
                localStorage.removeItem('user');
                localStorage.removeItem('authToken');
                localStorage.removeItem('rememberedEmail');
                // Redireciona para a página de login após logout
                window.location.href = 'index.html';
            }
        });
    }
}

// Inicialização do topbar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    loadTopbar();
});