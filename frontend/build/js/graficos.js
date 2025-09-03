/**
 * graficos.js - Script para geração e atualização de gráficos no dashboard
 * Utiliza a biblioteca Chart.js para criar visualizações de dados
 */

// Cores para os gráficos (estilo consistente)
const CORES = {
    azul: 'rgba(54, 162, 235, 0.8)',
    azulClaro: 'rgba(54, 162, 235, 0.2)',
    verde: 'rgba(75, 192, 192, 0.8)',
    verdeClaro: 'rgba(75, 192, 192, 0.2)',
    vermelho: 'rgba(255, 99, 132, 0.8)',
    vermelhoClaro: 'rgba(255, 99, 132, 0.2)',
    amarelo: 'rgba(255, 206, 86, 0.8)',
    amareloClaro: 'rgba(255, 206, 86, 0.2)',
    roxo: 'rgba(153, 102, 255, 0.8)',
    roxoClaro: 'rgba(153, 102, 255, 0.2)',
    laranja: 'rgba(255, 159, 64, 0.8)',
    laranjaClaro: 'rgba(255, 159, 64, 0.2)'
};

// Array de cores para múltiplos usuários
const CORES_USUARIOS = [
    'rgba(54, 162, 235, 0.7)',
    'rgba(75, 192, 192, 0.7)',
    'rgba(255, 99, 132, 0.7)',
    'rgba(255, 206, 86, 0.7)',
    'rgba(153, 102, 255, 0.7)',
    'rgba(255, 159, 64, 0.7)',
    'rgba(201, 203, 207, 0.7)',
    'rgba(0, 162, 120, 0.7)',
    'rgba(120, 99, 250, 0.7)',
    'rgba(230, 126, 34, 0.7)'
];

// Configurações da API
const API_BASE_URL = 'https://backend-4ybn.vercel.app';
const ACOES_API_URL = `${API_BASE_URL}/api/kanban/acoes`;
const EIXOS_API_URL = `${API_BASE_URL}/api/kanban/eixos`;
const USUARIOS_API_URL = `${API_BASE_URL}/api/usuarios`;

// Configurações globais para os gráficos
Chart.defaults.font.family = "'Segoe UI', 'Roboto', 'Arial', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#495057';
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;

// Objetos para armazenar instâncias de gráficos (para facilitar atualizações)
let graficos = {
    acoes: null,
    eixos: null,
    mensal: null,
    prioridades: null,
    usuarios: null
};

/**
 * Inicializa todos os gráficos do dashboard
 */
function inicializarGraficos() {
    // Obter dados das ações da API
    obterDadosAcoes().then(dados => {
        criarGraficoAcoes(dados);
        criarGraficoEixos(dados);
        criarGraficoMensal(dados);
        criarGraficoPrioridades(dados);
        criarGraficoUsuarios(dados);
        atualizarContadores(dados);
        renderizarAcoesAtrasadas(dados.acoesAtrasadas);
    }).catch(error => {
        console.error('Erro ao inicializar gráficos:', error);
        mostrarNotificacao('Erro ao carregar gráficos. Tente novamente mais tarde.', 'danger');
    });
}

/**
 * Função auxiliar para obter o token de autenticação
 * @returns {string} Token de autenticação
 */
function getAuthToken() {
    return localStorage.getItem('authToken');
}

/**
 * Cria gráfico de progresso das ações (tipo pie)
 * @param {Object} dados - Dados obtidos da API
 */
function criarGraficoAcoes(dados) {
    const ctx = document.getElementById('graficoAcoes').getContext('2d');
    graficos.acoes = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['A Fazer', 'Em Andamento', 'Concluído'],
            datasets: [{
                data: [dados.contadores.aFazer, dados.contadores.emAndamento, dados.contadores.concluido],
                backgroundColor: [CORES.vermelho, CORES.amarelo, CORES.verde],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 10
            },
            plugins: {
                legend: {
                    display: false
                },
                customLegend: true
            }
        },
        plugins: [customLegendPlugin]
    });
}

/**
 * Cria gráfico de ações por eixo (tipo bar)
 * @param {Object} dados - Dados obtidos da API
 */
function criarGraficoEixos(dados) {
    const ctx = document.getElementById('graficoEixos').getContext('2d');
    
    graficos.eixos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dados.eixos.map(eixo => eixo.nome),
            datasets: [{
                label: 'Número de Ações',
                data: dados.eixos.map(eixo => eixo.totalAcoes),
                backgroundColor: CORES.azul,
                borderColor: CORES.azul,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

/**
 * Cria gráfico de desempenho mensal (tipo line)
 * @param {Object} dados - Dados obtidos da API
 */
function criarGraficoMensal(dados) {
    const ctx = document.getElementById('graficoMensal').getContext('2d');
    
    graficos.mensal = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dados.mensal.meses,
            datasets: [{
                label: 'Ações Concluídas',
                data: dados.mensal.acoesConcluidas,
                backgroundColor: CORES.verdeClaro,
                borderColor: CORES.verde,
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

/**
 * Cria gráfico de distribuição por prioridade (tipo pie)
 * @param {Object} dados - Dados obtidos da API
 */
function criarGraficoPrioridades(dados) {
    const ctx = document.getElementById('graficoPrioridades').getContext('2d');
    graficos.prioridades = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Alta', 'Média', 'Baixa'],
            datasets: [{
                data: [dados.prioridades.alta, dados.prioridades.media, dados.prioridades.baixa],
                backgroundColor: [CORES.vermelho, CORES.amarelo, CORES.verde],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 10
            },
            plugins: {
                legend: {
                    display: false
                },
                customLegend: true
            }
        },
        plugins: [customLegendPlugin]
    });
}

/**
 * Cria gráfico de ações por usuário (tipo horizontalBar)
 * @param {Object} dados - Dados obtidos da API
 */
function criarGraficoUsuarios(dados) {
    const ctx = document.getElementById('graficoUsuarios').getContext('2d');
    // Ordenar usuários pelo número de ações (decrescente)
    const usuariosOrdenados = [...dados.usuarios].sort((a, b) => b.totalAcoes - a.totalAcoes);
    graficos.usuarios = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: usuariosOrdenados.map(usuario => usuario.name || usuario.nome || usuario.email),
            datasets: [{
                data: usuariosOrdenados.map(usuario => usuario.totalAcoes),
                backgroundColor: usuariosOrdenados.map((_, i) => CORES_USUARIOS[i % CORES_USUARIOS.length]),
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 10
            },
            plugins: {
                legend: {
                    display: false
                },
                customLegend: true
            }
        },
        plugins: [customLegendPlugin]
    });
}

/**
 * Renderiza informações sobre ações atrasadas
 * @param {Array} acoesAtrasadas - Lista de ações atrasadas
 */
function renderizarAcoesAtrasadas(acoesAtrasadas) {
    const contadorEl = document.getElementById('contador-atrasadas');
    const listaEl = document.getElementById('lista-acoes-atrasadas');
    
    // Atualizar contador
    contadorEl.textContent = acoesAtrasadas.length;
    
    // Limpar lista atual
    listaEl.innerHTML = '';
    
    // Se não há ações atrasadas
    if (acoesAtrasadas.length === 0) {
        listaEl.innerHTML = '<li class="sem-acoes-atrasadas">Nenhuma ação atrasada!</li>';
        return;
    }
    
    // Ordenar ações por prazo (mais antigas primeiro)
    const acoesOrdenadas = [...acoesAtrasadas].sort((a, b) => {
        return new Date(a.prazo) - new Date(b.prazo);
    });
    
    // Renderizar cada ação atrasada
    acoesOrdenadas.forEach(acao => {
        const li = document.createElement('li');
        // Calcular dias de atraso
        const prazo = new Date(acao.prazo);
        const hoje = new Date();
        const diasAtraso = Math.ceil((hoje - prazo) / (1000 * 60 * 60 * 24));
        // Exibir o título completo, sem truncar
        let tituloCompleto = acao.titulo;
        li.innerHTML = `
            <span class="acao-atrasada-titulo" style="display:block;width:100%">
                <span class="atrasada-badge">${diasAtraso}d</span>
                ${tituloCompleto}
            </span>
            <span class="acao-atrasada-prazo">
                ${prazo.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
            </span>
        `;
        listaEl.appendChild(li);
    });
}

/**
 * Obtém dados para os gráficos da API
 * @returns {Promise} Promise com os dados para os gráficos
 */
async function obterDadosAcoes() {
    const token = getAuthToken();
    if (!token) {
        console.error('Usuário não autenticado.');
        mostrarNotificacao('Erro: Usuário não autenticado. Faça login novamente.', 'danger');
        throw new Error('Usuário não autenticado');
    }

    try {
        // 1. Buscar todas as ações
        const acoes = await buscarAcoesAPI();
        if (!acoes || !Array.isArray(acoes)) {
            throw new Error('Dados de ações inválidos');
        }
        
        // 2. Buscar todos os eixos
        const eixos = await buscarEixosAPI();
        if (!eixos || !Array.isArray(eixos)) {
            throw new Error('Dados de eixos inválidos');
        }
        
        // 3. Buscar todos os usuários
        const usuarios = await buscarUsuariosAPI();
        if (!usuarios || !Array.isArray(usuarios)) {
            console.warn('Dados de usuários inválidos ou não disponíveis');
            usuarios = [];
        }
        
        // 4. Processar dados para os gráficos
        const dados = {
            contadores: contarAcoesPorStatus(acoes),
            eixos: contarAcoesPorEixo(acoes, eixos),
            mensal: calcularAcoesMensais(acoes),
            prioridades: contarAcoesPorPrioridade(acoes),
            usuarios: contarAcoesPorUsuario(acoes, usuarios),
            acoesAtrasadas: identificarAcoesAtrasadas(acoes)
        };
        
        // Validar dados processados
        if (!validarDadosProcessados(dados)) {
            throw new Error('Dados processados inválidos');
        }
        
        console.log('Dados processados para gráficos:', dados);
        return dados;
    } catch (error) {
        console.error('Erro ao obter dados para gráficos:', error);
        mostrarNotificacao(`Erro ao carregar dados: ${error.message}`, 'danger');
        throw error; // Propagar o erro em vez de retornar dados mock
    }
}

/**
 * Valida os dados processados para os gráficos
 * @param {Object} dados - Dados a serem validados
 * @returns {boolean} true se os dados são válidos
 */
function validarDadosProcessados(dados) {
    if (!dados) return false;
    
    // Validar contadores
    if (!dados.contadores || 
        typeof dados.contadores.aFazer !== 'number' ||
        typeof dados.contadores.emAndamento !== 'number' ||
        typeof dados.contadores.concluido !== 'number') {
        return false;
    }
    
    // Validar eixos
    if (!Array.isArray(dados.eixos)) return false;
    
    // Validar dados mensais
    if (!dados.mensal || 
        !Array.isArray(dados.mensal.meses) || 
        !Array.isArray(dados.mensal.acoesConcluidas)) {
        return false;
    }
    
    // Validar prioridades
    if (!dados.prioridades ||
        typeof dados.prioridades.alta !== 'number' ||
        typeof dados.prioridades.media !== 'number' ||
        typeof dados.prioridades.baixa !== 'number') {
        return false;
    }
    
    // Validar usuários
    if (!Array.isArray(dados.usuarios)) return false;
    
    // Validar ações atrasadas
    if (!Array.isArray(dados.acoesAtrasadas)) return false;
    
    return true;
}

/**
 * Busca todas as ações da API
 * @returns {Promise<Array>} Array de ações
 */
async function buscarAcoesAPI() {
    const token = getAuthToken();
    const cacheKey = 'acoes_kanban';
    const cacheAcoes = cache.get(cacheKey);
    if (cacheAcoes) return cacheAcoes;
    const response = await fetch(ACOES_API_URL, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        throw new Error(`Erro ao buscar ações: ${response.statusText}`);
    }
    const acoes = await response.json();
    cache.set(cacheKey, acoes, 2);
    return acoes;
}

/**
 * Busca todos os eixos da API
 * @returns {Promise<Array>} Array de eixos
 */
async function buscarEixosAPI() {
    const token = getAuthToken();
    const cacheKey = 'eixos_kanban';
    const cacheEixos = cache.get(cacheKey);
    if (cacheEixos) return cacheEixos;
    const response = await fetch(EIXOS_API_URL, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        throw new Error(`Erro ao buscar eixos: ${response.statusText}`);
    }
    const eixos = await response.json();
    cache.set(cacheKey, eixos, 2);
    return eixos;
}

/**
 * Busca todos os usuários da API
 * @returns {Promise<Array>} Array de usuários
 */
async function buscarUsuariosAPI() {
    const token = getAuthToken();
    const cacheKey = 'usuarios_kanban';
    const cacheUsuarios = cache.get(cacheKey);
    if (cacheUsuarios) return cacheUsuarios;
    try {
        const response = await fetch(USUARIOS_API_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error(`Erro ao buscar usuários: ${response.statusText}`);
        }
        const usuarios = await response.json();
        cache.set(cacheKey, usuarios, 2);
        return usuarios;
    } catch (error) {
        console.warn('Erro ao buscar usuários:', error);
        return [];
    }
}

/**
 * Conta ações por status
 * @param {Array} acoes - Array de ações
 * @returns {Object} Contadores por status
 */
function contarAcoesPorStatus(acoes) {
    const contadores = {
        aFazer: 0,
        emAndamento: 0,
        concluido: 0
    };

    acoes.forEach(acao => {
        if (!acao || typeof acao !== 'object') return;
        
        const status = acao.status;
        if (!status) return; // Ignorar ações sem status
        
        if (status === 'A Fazer') contadores.aFazer++;
        else if (status === 'Em Andamento') contadores.emAndamento++;
        else if (status === 'Concluído') contadores.concluido++;
    });

    return contadores;
}

/**
 * Conta ações por eixo
 * @param {Array} acoes - Array de ações
 * @param {Array} eixos - Array de eixos
 * @returns {Array} Eixos com contagem de ações
 */
function contarAcoesPorEixo(acoes, eixos) {
    // Inicializar contador para cada eixo
    const eixosComContagem = eixos.map(eixo => ({
        id: eixo._id || eixo.id,
        nome: eixo.nome,
        totalAcoes: 0
    }));

    // Contar ações por eixo
    acoes.forEach(acao => {
        if (!acao.eixo) return;
        
        let eixoId;
        // Verificar se eixo é um objeto ou ID
        if (typeof acao.eixo === 'object' && acao.eixo !== null) {
            eixoId = acao.eixo._id || acao.eixo.id;
        } else {
            eixoId = acao.eixo.toString();
        }
        
        // Encontrar e incrementar o contador do eixo
        const eixoIndex = eixosComContagem.findIndex(e => e.id.toString() === eixoId);
        if (eixoIndex !== -1) {
            eixosComContagem[eixoIndex].totalAcoes++;
        }
    });

    return eixosComContagem;
}

/**
 * Calcula ações concluídas por mês
 * @param {Array} acoes - Array de ações
 * @returns {Object} Dados para gráfico mensal
 */
function calcularAcoesMensais(acoes) {
    // Obter últimos 6 meses
    const hoje = new Date();
    const meses = [];
    const acoesConcluidas = [];
    
    // Popular array com os últimos 6 meses
    for (let i = 5; i >= 0; i--) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        meses.push(
            data.toLocaleDateString('pt-BR', { month: 'short' })
                .replace('.', '')
                .charAt(0).toUpperCase() + 
            data.toLocaleDateString('pt-BR', { month: 'short' })
                .replace('.', '')
                .slice(1)
        );
    }
    
    // Contar ações concluídas por mês
    for (let i = 0; i < 6; i++) {
        const mesInicio = new Date(hoje.getFullYear(), hoje.getMonth() - (5-i), 1);
        const mesFim = new Date(hoje.getFullYear(), hoje.getMonth() - (5-i) + 1, 0);
        
        // Contar ações concluídas neste mês
        const concluidas = acoes.filter(acao => {
            // Verificar se a ação foi concluída
            if (acao.status !== 'Concluído') return false;
            
            // Se não tem dataAtualizacao, usar dataCriacao
            const dataAtualizacao = acao.dataAtualizacao ? new Date(acao.dataAtualizacao) : 
                                  (acao.updatedAt ? new Date(acao.updatedAt) : null);
            
            if (!dataAtualizacao) return false;
            
            // Verificar se está dentro do mês
            return dataAtualizacao >= mesInicio && dataAtualizacao <= mesFim;
        }).length;
        
        acoesConcluidas.push(concluidas);
    }
    
    return {
        meses,
        acoesConcluidas
    };
}

/**
 * Conta ações por prioridade
 * @param {Array} acoes - Array de ações
 * @returns {Object} Contadores por prioridade
 */
function contarAcoesPorPrioridade(acoes) {
    const contadores = {
        alta: 0,
        media: 0,
        baixa: 0
    };

    acoes.forEach(acao => {
        const prioridade = acao.prioridade || 'Média';
        if (prioridade === 'Alta') contadores.alta++;
        else if (prioridade === 'Média') contadores.media++;
        else if (prioridade === 'Baixa') contadores.baixa++;
    });

    return contadores;
}

/**
 * Conta ações por usuário
 * @param {Array} acoes - Array de ações
 * @param {Array} usuarios - Array de usuários
 * @returns {Array} Usuários com contagem de ações
 */
function contarAcoesPorUsuario(acoes, usuarios) {
    // Mapa para mapear IDs de usuários para seus nomes completos
    const usuariosMap = new Map();
    usuarios.forEach(usuario => {
        const id = usuario._id || usuario.id;
        const nome = usuario.nome || usuario.name || usuario.email || 'Usuário sem nome';
        if (id) usuariosMap.set(id.toString(), nome);
    });
    
    // Contador de ações por usuário
    const contadores = new Map();
    
    acoes.forEach(acao => {
        // Verificar se a ação tem responsáveis
        if (!acao.responsaveis || !Array.isArray(acao.responsaveis) || acao.responsaveis.length === 0) {
            return;
        }
        
        // Processar cada responsável
        acao.responsaveis.forEach(responsavel => {
            let responsavelId, responsavelNome;
            
            // Verificar se o responsável é um objeto ou ID
            if (typeof responsavel === 'object' && responsavel !== null) {
                responsavelId = responsavel._id || responsavel.id;
                // Buscar nome completo na lista de usuários, se possível
                responsavelNome = usuariosMap.get(responsavelId?.toString()) || responsavel.name || responsavel.nome || (responsavel.email ? responsavel.email.split('@')[0] : 'Usuário sem nome');
            } else if (typeof responsavel === 'string') {
                // Se for string, pode ser um ID ou nome/email direto
                if (responsavel.match(/^[0-9a-fA-F]{24}$/)) {
                    // Parece ser um ID MongoDB, buscar nome no mapa
                    responsavelId = responsavel;
                    responsavelNome = usuariosMap.get(responsavel) || responsavel.substring(0, 8) + '...';
                } else if (responsavel.includes('@')) {
                    // Parece ser um email, usar parte antes do @
                    responsavelId = responsavel; // Usar o email como ID provisório ou buscar ID real
                    responsavelNome = responsavel.split('@')[0];
                } else {
                    // Provavelmente é um nome direto
                    responsavelId = responsavel;
                    responsavelNome = responsavel;
                }
            } else {
                return; // Tipo desconhecido
            }
            // Sempre priorizar o nome completo do mapa, se existir
            if (usuariosMap.has(responsavelId?.toString())) {
                responsavelNome = usuariosMap.get(responsavelId?.toString());
            }
            // Incrementar contador para este usuário
            if (!contadores.has(responsavelId)) {
                contadores.set(responsavelId, {
                    id: responsavelId,
                    nome: responsavelNome,
                    totalAcoes: 0
                });
            }
            contadores.get(responsavelId).totalAcoes++;
        });
    });
    // Converter mapa para array
    return Array.from(contadores.values());
}

/**
 * Identifica ações atrasadas
 * @param {Array} acoes - Array de ações
 * @returns {Array} Ações atrasadas
 */
function identificarAcoesAtrasadas(acoes) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    return acoes.filter(acao => {
        if (!acao || typeof acao !== 'object') return false;
        
        // Verificar se tem prazo
        if (!acao.prazo) return false;
        
        // Verificar se não está concluída
        if (acao.status === 'Concluído') return false;
        
        try {
            // Verificar se está atrasada
            const prazo = new Date(acao.prazo);
            if (isNaN(prazo.getTime())) return false; // Data inválida
            
            prazo.setHours(0, 0, 0, 0);
            return prazo < hoje;
        } catch (error) {
            console.error('Erro ao processar data:', error);
            return false;
        }
    });
}

/**
 * Atualiza os contadores no resumo do Kanban
 * @param {Object} dados - Dados obtidos da API
 */
function atualizarContadores(dados) {
    if (dados && dados.contadores) {
        document.getElementById('count-todo').textContent = dados.contadores.aFazer;
        document.getElementById('count-inprogress').textContent = dados.contadores.emAndamento;
        document.getElementById('count-done').textContent = dados.contadores.concluido;
    }
}

/**
 * Mostra notificação na interface
 * @param {string} mensagem - Mensagem a ser exibida
 * @param {string} tipo - Tipo de notificação (success, info, warning, danger)
 * @param {number} duracao - Duração em milissegundos
 */
function mostrarNotificacao(mensagem, tipo = 'info', duracao = 5000) {
    // Verificar se o container de notificações existe
    let notifContainer = document.getElementById('notificacoes-container');
    if (!notifContainer) {
        notifContainer = document.createElement('div');
        notifContainer.id = 'notificacoes-container';
        notifContainer.className = 'notificacoes-container';
        document.body.appendChild(notifContainer);
    }
    
    // Criar elemento de notificação
    const notificacao = document.createElement('div');
    notificacao.className = `notificacao notificacao-${tipo}`;
    notificacao.innerHTML = `
        <span class="notificacao-mensagem">${mensagem}</span>
        <button class="notificacao-fechar">&times;</button>
    `;
    
    // Adicionar notificação ao container
    notifContainer.appendChild(notificacao);
    
    // Configurar botão de fechar
    const btnFechar = notificacao.querySelector('.notificacao-fechar');
    btnFechar.addEventListener('click', () => {
        notificacao.classList.add('fechando');
        setTimeout(() => {
            notificacao.remove();
        }, 300);
    });
    
    // Auto-remover após a duração especificada
    setTimeout(() => {
        notificacao.classList.add('fechando');
        setTimeout(() => {
            if (notificacao.parentNode) {
                notificacao.remove();
            }
        }, 300);
    }, duracao);
}

/**
 * Atualiza todos os gráficos com novos dados
 */
function atualizarGraficos() {
    obterDadosAcoes().then(dados => {
        // Atualizar dados nos gráficos
        try {
            if (graficos.acoes && graficos.acoes.data && graficos.acoes.data.datasets && graficos.acoes.data.datasets[0]) {
                graficos.acoes.data.datasets[0].data = [
                    dados.contadores.aFazer,
                    dados.contadores.emAndamento,
                    dados.contadores.concluido
                ];
                graficos.acoes.update();
            }
        } catch (error) {
            mostrarNotificacao('Erro ao atualizar gráfico de ações: ' + (error.message || error), 'danger', 8000);
            console.error('Erro ao atualizar gráfico de ações:', error);
        }
        try {
            if (graficos.eixos && graficos.eixos.data && graficos.eixos.data.datasets && graficos.eixos.data.datasets[0]) {
                graficos.eixos.data.labels = dados.eixos.map(eixo => eixo.nome);
                graficos.eixos.data.datasets[0].data = dados.eixos.map(eixo => eixo.totalAcoes);
                graficos.eixos.update();
            }
        } catch (error) {
            mostrarNotificacao('Erro ao atualizar gráfico de eixos: ' + (error.message || error), 'danger', 8000);
            console.error('Erro ao atualizar gráfico de eixos:', error);
        }
        try {
            if (graficos.mensal && graficos.mensal.data && graficos.mensal.data.datasets && graficos.mensal.data.datasets[0]) {
                graficos.mensal.data.labels = dados.mensal.meses;
                graficos.mensal.data.datasets[0].data = dados.mensal.acoesConcluidas;
                graficos.mensal.update();
            }
        } catch (error) {
            mostrarNotificacao('Erro ao atualizar gráfico mensal: ' + (error.message || error), 'danger', 8000);
            console.error('Erro ao atualizar gráfico mensal:', error);
        }
        try {
            if (graficos.prioridades && graficos.prioridades.data && graficos.prioridades.data.datasets && graficos.prioridades.data.datasets[0]) {
                graficos.prioridades.data.datasets[0].data = [
                    dados.prioridades.alta,
                    dados.prioridades.media,
                    dados.prioridades.baixa
                ];
                graficos.prioridades.update();
            }
        } catch (error) {
            mostrarNotificacao('Erro ao atualizar gráfico de prioridades: ' + (error.message || error), 'danger', 8000);
            console.error('Erro ao atualizar gráfico de prioridades:', error);
        }
        try {
            if (graficos.usuarios && graficos.usuarios.data && graficos.usuarios.data.datasets && graficos.usuarios.data.datasets[0]) {
                const usuariosOrdenados = [...dados.usuarios].sort((a, b) => b.totalAcoes - a.totalAcoes);
                graficos.usuarios.data.labels = usuariosOrdenados.map(usuario => usuario.name || usuario.nome || usuario.email);
                graficos.usuarios.data.datasets[0].data = usuariosOrdenados.map(usuario => usuario.totalAcoes);
                graficos.usuarios.data.datasets[0].backgroundColor = usuariosOrdenados.map((_, i) => 
                    CORES_USUARIOS[i % CORES_USUARIOS.length]
                );
                graficos.usuarios.update();
            }
        } catch (error) {
            mostrarNotificacao('Erro ao atualizar gráfico de usuários: ' + (error.message || error), 'danger', 8000);
            console.error('Erro ao atualizar gráfico de usuários:', error);
        }
        // Atualizar componente de ações atrasadas
        try {
            renderizarAcoesAtrasadas(dados.acoesAtrasadas);
        } catch (error) {
            mostrarNotificacao('Erro ao renderizar ações atrasadas: ' + (error.message || error), 'danger', 8000);
            console.error('Erro ao renderizar ações atrasadas:', error);
        }
        // Atualizar contadores
        try {
            atualizarContadores(dados);
        } catch (error) {
            mostrarNotificacao('Erro ao atualizar contadores: ' + (error.message || error), 'danger', 8000);
            console.error('Erro ao atualizar contadores:', error);
        }
    }).catch(error => {
        mostrarNotificacao('Erro ao atualizar gráficos: ' + (error.message || error), 'danger', 8000);
        console.error('Erro ao atualizar gráficos:', error);
    });
}

// Expor a função para uso global (acessível de outros scripts)
window.atualizarGraficos = atualizarGraficos;

// Inicializar gráficos quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    inicializarGraficos();
    
    // Configurar atualização periódica (a cada 5 minutos)
    setInterval(atualizarGraficos, 5 * 60 * 1000);
});

// Plugin para legenda customizada centralizada abaixo do gráfico
const customLegendPlugin = {
    id: 'customLegend',
    afterDraw(chart) {
        const chartId = chart.canvas.id;
        const container = chart.canvas.closest('.grafico-card');
        if (!container) return;
        let legendDiv = container.querySelector('.custom-legend');
        if (!legendDiv) {
            legendDiv = document.createElement('div');
            legendDiv.className = 'custom-legend';
            container.appendChild(legendDiv);
        }
        // Limpa e monta a legenda
        legendDiv.innerHTML = '';
        const data = chart.data;
        if (!data.labels || !data.datasets.length) return;
        const bgColors = data.datasets[0].backgroundColor || [];
        const items = data.labels.map((label, i) => {
            let value = data.datasets[0].data[i];
            let color = bgColors[i];
            // Fallback para cor padrão se não houver cor definida
            if (!color || color === 'undefined' || color === 'null') {
                // Tenta usar a primeira cor, ou fallback para #ccc
                color = bgColors[0] || '#ccc';
            }
            // Garante que seja um quadrado
            if (chartId === 'graficoUsuarios') {
                return `<span class="legend-item"><span class="legend-color-box" style="background:${color};"></span><span style="font-size:12px;white-space:nowrap;">${label} (${value})</span></span>`;
            } else {
                return `<span class="legend-item"><span class="legend-color-box" style="background:${color};"></span><span style="font-size:12px;white-space:nowrap;">${value} ${label}</span></span>`;
            }
        });
        // Agrupa em linhas de até 3 itens
        let html = '';
        for (let i = 0; i < items.length; i += 3) {
            html += `<div class=\"legend-row\">${items.slice(i, i+3).join('')}</div>`;
        }
        legendDiv.innerHTML = html;
    }
}; 