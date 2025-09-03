// Função para carregar um template HTML
async function loadTemplate(templatePath) {
    try {
        console.log(`Carregando template: ${templatePath}`);
        const response = await fetch(templatePath);
        if (!response.ok) {
            throw new Error(`Erro ao carregar template: ${response.status}`);
        }
        const html = await response.text();
        console.log(`Template carregado com sucesso: ${templatePath}`);
        return html;
    } catch (error) {
        console.error('Erro ao carregar template:', error);
        return '';
    }
}

// Função para inicializar o layout da página
async function initLayout(pageTitle) {
    try {
        console.log('Iniciando carregamento do layout...');
        
        // Carregar templates
        const sidebarTemplate = await loadTemplate('../templates/sidebar.html');
        const topbarTemplate = await loadTemplate('../templates/topbar.html');

        console.log('Templates carregados, inserindo no DOM...');

        // Inserir barra lateral
        const sidebarContainer = document.getElementById('mainSidebar');
        if (sidebarContainer) {
            console.log('Inserindo sidebar...');
            sidebarContainer.innerHTML = sidebarTemplate;
            // Inicializar eventos da sidebar
            if (window.initializeSidebarEvents) {
                window.initializeSidebarEvents();
            }
        }

        // Inserir barra superior
        const topbarContainer = document.getElementById('mainTopbarContainer');
        if (topbarContainer) {
            console.log('Inserindo topbar...');
            topbarContainer.innerHTML = topbarTemplate;
            // Inicializar o topbar após inserção
            if (window.inicializarTopbar) {
                window.inicializarTopbar();
            }
        }

        // Atualizar título da página
        const titleElement = document.getElementById('pageTitle');
        if (titleElement) {
            titleElement.textContent = pageTitle;
        }

        console.log('Layout inicializado com sucesso!');
    } catch (error) {
        console.error('Erro ao inicializar layout:', error);
    }
}

// Exportar funções para uso em outras páginas
window.templateLoader = {
    initLayout,
    loadTemplate
}; 