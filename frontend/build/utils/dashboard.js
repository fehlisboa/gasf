// Função para inicializar a página de estoques
document.addEventListener('DOMContentLoaded', function() {
    // Verifica se o usuário está autenticado
    if (!checkAuth()) {
        window.location.href = 'index.html';
        return;
    }

    // Inicializa o layout da página
    initLayout('Dashboard');

    // Inicializa o dashboard
    initializeDashboard();

    // Carrega estatísticas de vendas
    loadVendasStats();
});

// Função para verificar autenticação
function checkAuth() {
    const authToken = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if (!authToken || !user) {
        return false;
    }
    
    return true;
}

// Função para inicializar o layout
function initLayout(pageTitle) {
    console.log('Inicializando layout com título:', pageTitle);
    // Aqui você pode adicionar qualquer inicialização adicional do layout
}

// Função principal do dashboard
async function initializeDashboard() {
    console.log('Inicializando dashboard...');

    // Elementos dos cards
    const totalProdutosCard = document.getElementById('totalProdutosCard');
    const produtosBaixaCard = document.getElementById('produtosBaixaCard');
    const valorEstoqueCard = document.getElementById('valorEstoque');
    const totalCategoriasCard = document.getElementById('totalCategorias');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // Função para mostrar/esconder indicador de carregamento
    function toggleLoading(show) {
        console.log('Toggle loading:', show);
        if (loadingIndicator) {
            if (show) {
                loadingIndicator.classList.add('show');
            } else {
                loadingIndicator.classList.remove('show');
            }
            
            // Adiciona ou remove classe de loading dos valores
            const statsValues = document.querySelectorAll('.stats-value');
            statsValues.forEach(value => {
                if (show) {
                    value.classList.add('loading');
                } else {
                    value.classList.remove('loading');
                }
            });
        }
    }

    // Função para buscar produtos adicionados hoje
    const buscarProdutosHoje = async () => {
        try {
            console.log('Buscando produtos de hoje...');
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            const response = await fetch('https://backend-4ybn.vercel.app/api/products/today');
            if (!response.ok) throw new Error('Erro ao buscar produtos de hoje');
            
            const produtosHoje = await response.json();
            console.log('Produtos de hoje:', produtosHoje);
            return produtosHoje.length;
        } catch (error) {
            console.error('Erro ao buscar produtos de hoje:', error);
            return 0;
        }
    };

    // Função para atualizar as estatísticas
    const updateStats = async () => {
        console.log('Atualizando estatísticas...');
        toggleLoading(true);
        
        try {
            const response = await fetch('https://backend-4ybn.vercel.app/api/products');
            if (!response.ok) throw new Error('Erro ao buscar produtos');
            
            const products = await response.json();
            console.log('Produtos carregados:', products);
            
            // Total de produtos
            const totalProdutosElement = document.getElementById('totalProdutos');
            if (totalProdutosElement) {
                totalProdutosElement.textContent = products.length;
            }

            // Produtos novos hoje
            const novosHoje = await buscarProdutosHoje();
            const novosHojeElement = document.getElementById('novosProdutos');
            if (novosHojeElement) {
                const statsChange = novosHojeElement.parentElement;
                if (novosHoje > 0) {
                    statsChange.innerHTML = `<i class="fas fa-arrow-up"></i> ${novosHoje} novos hoje`;
                    statsChange.classList.add('positive');
                } else {
                    statsChange.innerHTML = 'Nenhum novo hoje';
                    statsChange.classList.remove('positive');
                }
            }
            
            // Produtos em baixa
            const produtosBaixa = products.filter(p => p.quantity < p.minQuantity);
            const produtosBaixaElement = document.getElementById('produtosBaixa');
            if (produtosBaixaElement) {
                produtosBaixaElement.textContent = produtosBaixa.length;
                // Atualiza o estilo do card de produtos em baixa
                if (produtosBaixaCard) {
                    if (produtosBaixa.length > 0) {
                        produtosBaixaCard.classList.add('active');
                        // Atualiza o texto do card para "Abaixo do mínimo"
                        const statusText = produtosBaixaCard.querySelector('.stats-change');
                        if (statusText) {
                            statusText.textContent = 'Abaixo do mínimo';
                        }
                    } else {
                        produtosBaixaCard.classList.remove('active');
                        const statusText = produtosBaixaCard.querySelector('.stats-change');
                        if (statusText) {
                            statusText.textContent = 'Abaixo do mínimo';
                        }
                    }
                }
            }
            
            // Valor total em estoque
            const valorTotal = products.reduce((total, p) => total + (p.price * p.quantity), 0);
            if (valorEstoqueCard) {
                valorEstoqueCard.textContent = formatarPrecoParaExibicao(valorTotal);
            }

            // Total de categorias salvas no banco de dados (igual estoques.js)
            try {
                const response = await fetch('https://backend-4ybn.vercel.app/api/categories');
                if (response.ok) {
                    const categoriasDoBanco = await response.json();
                    if (totalCategoriasCard) {
                        totalCategoriasCard.textContent = categoriasDoBanco.length;
                    }
                } else {
                    if (totalCategoriasCard) {
                        totalCategoriasCard.textContent = '0';
                    }
                }
            } catch (e) {
                if (totalCategoriasCard) {
                    totalCategoriasCard.textContent = '0';
                }
            }

            toggleLoading(false);
            console.log('Estatísticas atualizadas com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar estatísticas:', error);
            showAlert('Erro ao carregar estatísticas. Tentando novamente em alguns segundos...', 'danger');
            toggleLoading(false);
            
            // Tenta atualizar novamente após 10 segundos em caso de erro
            setTimeout(updateStats, 10000);
        }
    };

    // Função para formatar preço
    const formatarPrecoParaExibicao = (valor) => {
        return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Função para mostrar alerta
    const showAlert = (message, type = 'success') => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        const dashboardContent = document.querySelector('.dashboard-content');
        if (dashboardContent) {
            dashboardContent.insertBefore(alertDiv, document.querySelector('.stats-container'));
            setTimeout(() => alertDiv.remove(), 5000);
        }
    };

    // Adiciona evento de clique no card de produtos em baixa
    if (produtosBaixaCard) {
        produtosBaixaCard.addEventListener('click', () => {
            console.warn('A página de estoques foi removida. Este card não tem mais ação.');
        });
    }

    // Atualiza as estatísticas ao carregar a página
    await updateStats();

    // Atualiza as estatísticas a cada 5 minutos
    setInterval(updateStats, 300000);

    // Carregar gráficos de tarefas
    await loadTarefasCharts();

    // Atualizar os gráficos a cada 5 minutos
    setInterval(loadTarefasCharts, 300000);
}

// Função para carregar estatísticas de vendas (reutilizando vendas.js)
async function loadVendasStats() {
    try {
        // Funções auxiliares de vendas.js
        function formatCurrency(value) {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(value);
        }
        function getYYYYMMDD(date) {
            const d = new Date(date);
            return d.toISOString().slice(0, 10);
        }
        const token = localStorage.getItem('authToken');
        const API_BASE = 'https://backend-4ybn.vercel.app/api/vendas';
        const response = await fetch(`${API_BASE}?page=1&limit=10000`, {
            headers: {
                'Authorization': 'Bearer ' + (token || '')
            }
        });
        if (!response.ok) throw new Error('Erro ao carregar dados de vendas');
        const data = await response.json();
        const vendas = Array.isArray(data.sales) ? data.sales : [];

        // Datas de referência
        const hojeStr = getYYYYMMDD(new Date());
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 29);
        const trintaDiasAtrasStr = getYYYYMMDD(trintaDiasAtras);

        // Vendas do dia
        const vendasHoje = vendas.filter(v => getYYYYMMDD(v.data) === hojeStr);
        const totalHoje = vendasHoje.reduce((soma, v) => soma + (v.valor || 0), 0);

        // Vendas dos últimos 30 dias
        const vendas30Dias = vendas.filter(v => getYYYYMMDD(v.data) >= trintaDiasAtrasStr && getYYYYMMDD(v.data) <= hojeStr);
        const total30Dias = vendas30Dias.reduce((soma, v) => soma + (v.valor || 0), 0);

        // Clientes únicos dos últimos 30 dias
        const clientesUnicos = new Set();
        vendas30Dias.forEach(v => {
            if (v.cliente && (v.cliente._id || v.cliente.id)) {
                clientesUnicos.add(v.cliente._id || v.cliente.id);
            }
        });

        // Preencher os cards
        const dailySalesEl = document.getElementById('dailySales');
        const monthlySalesEl = document.getElementById('monthlySales');
        const activeCustomersEl = document.getElementById('activeCustomers');
        if (dailySalesEl) dailySalesEl.textContent = formatCurrency(totalHoje);
        if (monthlySalesEl) monthlySalesEl.textContent = formatCurrency(total30Dias);
        if (activeCustomersEl) activeCustomersEl.textContent = clientesUnicos.size;
    } catch (error) {
        console.error('Erro ao carregar estatísticas de vendas:', error);
        alert('Sua sessão expirou ou o token é inválido. Faça login novamente.');
        // Redireciona para a página de login se a sessão expirar ou token for inválido
        window.location.href = 'index.html';
    }
}

// Função para carregar e atualizar os gráficos de tarefas
async function loadTarefasCharts() {
    try {
        const response = await fetch('https://backend-4ybn.vercel.app/api/tasks', {
            headers: {
                'Authorization': 'Bearer ' + (localStorage.getItem('authToken') || '')
            }
        });
        
        if (!response.ok) throw new Error('Erro ao carregar tarefas');
        const tarefas = await response.json();

        // Gráfico de Status das Tarefas
        const statusCtx = document.getElementById('tarefasStatusChart').getContext('2d');
        const statusData = {
            pendente: tarefas.filter(t => t.status === 'pendente').length,
            em_andamento: tarefas.filter(t => t.status === 'em_andamento').length,
            concluida: tarefas.filter(t => t.status === 'concluida').length
        };

        new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pendente', 'Em Andamento', 'Concluída'],
                datasets: [{
                    data: [statusData.pendente, statusData.em_andamento, statusData.concluida],
                    backgroundColor: ['#FF6384', '#36A2EB', '#4BC0C0']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        // Gráfico de Tarefas por Prioridade
        const prioridadeCtx = document.getElementById('tarefasPrioridadeChart').getContext('2d');
        const prioridadeData = {
            normal: tarefas.filter(t => t.prioridade === 'normal').length,
            alta: tarefas.filter(t => t.prioridade === 'alta').length,
            urgente: tarefas.filter(t => t.prioridade === 'urgente').length
        };

        new Chart(prioridadeCtx, {
            type: 'bar',
            data: {
                labels: ['Normal', 'Alta', 'Urgente'],
                datasets: [{
                    label: 'Quantidade de Tarefas',
                    data: [prioridadeData.normal, prioridadeData.alta, prioridadeData.urgente],
                    backgroundColor: ['#4BC0C0', '#FFCE56', '#FF6384']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });

        // Gráfico de Tarefas por Período
        const periodoCtx = document.getElementById('tarefasPeriodoChart').getContext('2d');
        const hoje = new Date();
        const ultimos7Dias = Array.from({length: 7}, (_, i) => {
            const data = new Date(hoje);
            data.setDate(data.getDate() - i);
            return data.toISOString().split('T')[0];
        }).reverse();

        const tarefasPorDia = ultimos7Dias.map(dia => 
            tarefas.filter(t => t.data.split('T')[0] === dia).length
        );

        new Chart(periodoCtx, {
            type: 'line',
            data: {
                labels: ultimos7Dias.map(dia => new Date(dia).toLocaleDateString('pt-BR')),
                datasets: [{
                    label: 'Tarefas Criadas',
                    data: tarefasPorDia,
                    borderColor: '#667eea',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('Erro ao carregar gráficos de tarefas:', error);
    }
}

// Inicializa a página quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM carregado, verificando autenticação...');
    
    // Verifica se o usuário está autenticado
    if (!checkAuth()) {
        console.log('Usuário não autenticado, redirecionando...');
        window.location.href = 'index.html';
        return;
    }

    // Inicializa o layout da página
    console.log('Usuário autenticado, inicializando layout...');
    initLayout('Dashboard');

    // Inicializa o dashboard
    console.log('Iniciando dashboard...');
    await initializeDashboard();
}); 