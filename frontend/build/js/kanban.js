// frontend/src/js/kanban.js
// Lógica do Kanban será adicionada aqui nas próximas etapas. 

// Ajuste para ambiente sem suporte a import/export
// let cache;
// try {
//   cache = require('./utils/cache.js').default || require('./utils/cache.js');
// } catch {
//   cache = window.cache;
// }

document.addEventListener('DOMContentLoaded', () => {
    // Elementos do DOM
    const novaAcaoBtn = document.getElementById('novaAcaoBtn');
    const modalNovaAcao = document.getElementById('modalNovaAcao');
    const closeModalNovaAcaoBtn = document.getElementById('closeModalNovaAcaoBtn');
    const cancelarNovaAcaoBtn = document.getElementById('cancelarNovaAcaoBtn');
    const formNovaAcao = document.getElementById('formNovaAcao');
    
    // Elementos do Checklist no Modal Nova Ação
    const checklistTituloInputNovaAcao = document.getElementById('checklistTituloInput');
    const checklistItensContainerNovaAcao = document.getElementById('checklistItensContainerNovaAcao');
    const adicionarItemChecklistNovaAcaoBtn = document.getElementById('adicionarItemChecklistNovaAcaoBtn');

    // Elementos do Modal Ver Ação
    const modalVerAcao = document.getElementById('modalVerAcao');
    const closeModalVerAcaoBtn = document.getElementById('closeModalVerAcaoBtn');
    const fecharModalVerAcaoBtn = document.getElementById('fecharModalVerAcaoBtn'); // Botão no rodapé
    const verAcaoModalTitle = document.getElementById('verAcaoModalTitle');
    const verAcaoTitulo = document.getElementById('verAcaoTitulo');
    const verAcaoDescricao = document.getElementById('verAcaoDescricao');
    const verAcaoStatus = document.getElementById('verAcaoStatus');
    const verAcaoPrioridade = document.getElementById('verAcaoPrioridade');
    const verAcaoResponsaveis = document.getElementById('verAcaoResponsaveis');
    const verAcaoEixo = document.getElementById('verAcaoEixo');
    const verAcaoPrazo = document.getElementById('verAcaoPrazo');
    const verAcaoChecklistTitulo = document.getElementById('verAcaoChecklistTitulo');
    const checklistItensContainerVerAcao = document.getElementById('checklistItensContainerVerAcao');
    
    const actionsTableBody = document.getElementById('actions-table-body');
    const countTodo = document.getElementById('count-todo');
    const countInProgress = document.getElementById('count-inprogress');
    const countDone = document.getElementById('count-done');
    
    const kanbanColumns = {
        'A Fazer': document.querySelector('#column-todo .kanban-cards-container'),
        'Em Andamento': document.querySelector('#column-inprogress .kanban-cards-container'),
        'Concluído': document.querySelector('#column-done .kanban-cards-container'),
    };

    // Endpoints da API
    const API_BASE_URL = 'https://gasf-app.onrender.com';
    const ACOES_API_URL = `${API_BASE_URL}/api/kanban/acoes`; 
    const EIXOS_API_URL = `${API_BASE_URL}/api/kanban/eixos`;

    // Elementos dos Filtros e Pesquisa
    const filterStatus = document.getElementById('filter-status');
    const filterResponsaveis = document.getElementById('filter-responsaveis');
    const filterEixos = document.getElementById('filter-eixos'); 
    const searchInput = document.getElementById('search-actions');

    // Armazenamento local dos dados (serão populados pela API)
    let todasAcoes = []; // Substitui acoesMocadas
    let todosEixos = []; // Substitui eixosMocados
    let todosUsuarios = []; // Armazenamento para usuários do sistema
    
    let proximoIdMocado = 1; // Será removido ou gerenciado pelo backend
    let proximoEixoIdMocado = 1; // Será removido ou gerenciado pelo backend

    let proximoChecklistItemId = 1; // Para IDs únicos de itens de checklist no cliente

    let editMode = false;
    let editAcaoId = null;

    // Dados Mocado para Eixos - SERÁ SUBSTITUÍDO PELA API
    // let eixosMocados = [
    //     { id: 1, nome: 'Gestão da Educação e Trabalho' },
    //     { id: 2, nome: 'Gestão da Assistência' },
    //     { id: 3, nome: 'APS' },
    //     { id: 4, nome: 'Capacitação' },
    //     { id: 5, nome: 'Documentação' },
    //     { id: 6, nome: 'Sistemas' }
    // ];
    let eixoEditMode = false;
    let eixoEditId = null;

    // Elementos do DOM para Eixos
    const adicionarEixoBtn = document.getElementById('adicionarEixoBtn');
    const eixosListContainer = document.getElementById('eixosListContainer');
    const modalAdicionarEditarEixo = document.getElementById('modalAdicionarEditarEixo');
    const closeModalEixoBtn = document.getElementById('closeModalEixoBtn');
    const cancelarEixoBtn = document.getElementById('cancelarEixoBtn');
    const formAdicionarEditarEixo = document.getElementById('formAdicionarEditarEixo');
    const modalEixoTitle = document.getElementById('modalEixoTitle');
    const nomeEixoInput = document.getElementById('nomeEixoInput');
    const salvarEixoBtn = document.getElementById('salvarEixoBtn');
    const hiddenEixoEditIdInput = document.getElementById('eixoEditId'); 
    const eixoAcaoSelect = document.getElementById('eixoAcaoSelect'); 
    const responsaveisAcaoSelectMultiple = document.getElementById('responsaveisAcaoSelectMultiple');

    // Função auxiliar para obter o token de autenticação
    function getAuthToken() {
        return localStorage.getItem('authToken');
    }
    
    // Função auxiliar para obter informações do usuário atual
    function obterUsuarioAtual() {
        // Tentativa 1: Obter do localStorage como objeto
        try {
            const currentUserString = localStorage.getItem('currentUser');
            if (currentUserString) {
                const currentUser = JSON.parse(currentUserString);
                if (currentUser && (currentUser.name || currentUser.nome || currentUser.email)) {
                    return {
                        id: currentUser._id || currentUser.id,
                        nome: currentUser.name || currentUser.nome || currentUser.email,
                        email: currentUser.email
                    };
                }
            }
        } catch (e) {
            console.warn('Erro ao obter usuário atual do localStorage:', e);
        }
        
        // Tentativa 2: Decodificar token JWT
        try {
            const token = getAuthToken();
            if (token) {
                const partes = token.split('.');
                if (partes.length === 3) {
                    const payload = JSON.parse(atob(partes[1]));
                    if (payload) {
                        return {
                            id: payload._id || payload.id || payload.sub,
                            nome: payload.name || payload.nome || payload.email || 'Usuário Atual',
                            email: payload.email
                        };
                    }
                }
            }
        } catch (e) {
            console.warn('Erro ao decodificar token JWT:', e);
        }
        
        // Tentativa 3: Usar 'admin' como fallback
        return {
            id: 'current-user',
            nome: 'Admin',
            email: 'admin@gmail.com'
        };
    }

    // --- Funções de Renderização (sem alterações diretas, mas dependerão dos dados da API) ---
    function renderizarTabelaAcoes(acoes) {
        actionsTableBody.innerHTML = '';
        if (!acoes || acoes.length === 0) {
            actionsTableBody.innerHTML = '<tr><td colspan="6">Nenhuma ação encontrada.</td></tr>';
            return;
        }
        
        // Definir altura da tabela para mostrar aproximadamente 8 linhas e adicionar scroll
        const actionTableContainer = document.querySelector('.actions-table-container');
        if (actionTableContainer) {
            actionTableContainer.style.maxHeight = '400px'; // Altura adequada para ~8 linhas
            actionTableContainer.style.overflowY = 'auto'; // Adicionar barra de rolagem vertical
        }
        
        acoes.forEach(acao => {
            const tr = document.createElement('tr');
            const acaoId = acao._id || acao.id;
            tr.dataset.id = acaoId;

            // Buscar nome do Eixo
            let nomeEixoText = '-';
            if (acao.eixo) {
                // Se o backend retornou um objeto de eixo populado
                if (typeof acao.eixo === 'object' && acao.eixo !== null && acao.eixo.nome) {
                    nomeEixoText = acao.eixo.nome;
                } else {
                    // Se o backend retornou apenas o ID do eixo
                    const eixoId = acao.eixo.toString();
                    const eixoObj = todosEixos.find(e => (e._id || e.id)?.toString() === eixoId);
                if (eixoObj) {
                    nomeEixoText = eixoObj.nome;
                    }
                }
            }

            // Exibir o título completo, sem truncar
            let tituloTruncado = acao.titulo || '';

            // Formatação dos responsáveis
            let responsaveisText = '-';
            if (acao.responsaveis && acao.responsaveis.length > 0) {
                if (Array.isArray(acao.responsaveis)) {
                    responsaveisText = acao.responsaveis.map(resp => {
                        let responsavelId, responsavelNome;
                        if (typeof resp === 'object' && resp !== null) {
                            responsavelId = resp._id || resp.id;
                            responsavelNome = undefined;
                        } else {
                            responsavelId = resp;
                            responsavelNome = undefined;
                        }
                        // Buscar nome completo na lista de usuários, se possível
                        const usuario = todosUsuarios.find(u => (u._id || u.id)?.toString() === responsavelId?.toString());
                        responsavelNome = (usuario && (usuario.nome || usuario.name))
                            || (typeof resp === 'object' && (resp.name || resp.nome))
                            || (typeof resp === 'object' && resp.email ? resp.email.split('@')[0] : undefined)
                            || (typeof resp === 'string' && resp.includes('@') ? resp.split('@')[0] : resp)
                            || 'Usuário';
                        return responsavelNome;
                    }).join(', ');
                } else if (typeof acao.responsaveis === 'string') {
                    const responsavelId = acao.responsaveis.trim();
                    const usuario = todosUsuarios.find(u => (u._id || u.id)?.toString() === responsavelId);
                    let responsavelNome = (usuario && (usuario.nome || usuario.name))
                        || (responsavelId.includes('@') ? responsavelId.split('@')[0] : responsavelId);
                    responsaveisText = responsavelNome;
                }
            }

            // Garantir que o status seja exibido corretamente (mesmo se vier null ou undefined)
            const statusText = acao.status || 'A Fazer';
            const statusClass = statusText.toLowerCase().replace(/\s+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            // Garantir que a prioridade seja exibida corretamente
            const prioridadeText = acao.prioridade || 'Média';
            const prioridadeClass = prioridadeText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            tr.innerHTML = `
                <td>${tituloTruncado}</td>
                <td>${nomeEixoText}</td> 
                <td>${responsaveisText}</td>
                <td><span class="status-tag status-${statusClass}">${statusText}</span></td>
                <td><span class="prioridade-tag prioridade-${prioridadeClass}">${prioridadeText}</span></td>
                <td>${acao.prazo ? new Date(acao.prazo).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                <td><div class="acoes-btns">
                    <button class="btn-icon btn-view-action" data-id="${acao._id || acao.id}" title="Visualizar Detalhes e Checklist" aria-label="Visualizar Ação"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon btn-edit" data-id="${acao._id || acao.id}" title="Editar Ação" aria-label="Editar Ação"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon btn-delete" data-id="${acao._id || acao.id}" title="Excluir Ação" aria-label="Excluir Ação"><i class="fas fa-trash"></i></button>
                </div></td>
            `;
            actionsTableBody.appendChild(tr);
        });
        
        // Adicionar event listeners aos botões de visualizar, editar e excluir APÓS renderizar a tabela
        actionsTableBody.querySelectorAll('.btn-view-action').forEach(button => {
            button.addEventListener('click', (event) => {
                const acaoId = event.currentTarget.dataset.id;
                abrirModalVerAcaoComDetalhes(acaoId);
            });
        });
        actionsTableBody.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', (event) => {
                const acaoId = event.currentTarget.dataset.id;
                abrirModalParaEditarAcao(acaoId);
            });
        });
        actionsTableBody.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', async (event) => {
                const acaoId = event.currentTarget.dataset.id;
                const showConfirmDialog = getShowConfirmDialog();
                if (showConfirmDialog) {
                    showConfirmDialog('Tem certeza que deseja excluir esta ação?', async () => {
                        await excluirAcaoAPI(acaoId);
                    });
                } else {
                    if (confirm('Tem certeza que deseja excluir esta ação?')) {
                        await excluirAcaoAPI(acaoId);
                    }
                }
            });
        });

        // Log para depuração
        console.log('Ações renderizadas na tabela:', acoes);
    }

    function atualizarContadores(acoes) {
        let todo = 0;
        let inProgress = 0;
        let done = 0;
        acoes.forEach(acao => {
            if (acao.status === 'A Fazer') todo++;
            else if (acao.status === 'Em Andamento') inProgress++;
            else if (acao.status === 'Concluído') done++;
        });
        countTodo.textContent = todo;
        countInProgress.textContent = inProgress;
        countDone.textContent = done;
    }

    function renderizarKanbanCards(acoes) {
        // Limpar todos os contêineres
        Object.values(kanbanColumns).forEach(col => col.innerHTML = '');
        
        // Verificar se há ações
        if (!acoes || !Array.isArray(acoes) || acoes.length === 0) {
            console.log('Sem ações para renderizar no Kanban');
            // Mesmo sem ações, garantir altura fixa dos contêineres para manter o layout uniforme
            Object.values(kanbanColumns).forEach(col => {
                col.style.minHeight = '480px'; // Mesma altura definida no CSS para comportar ~4 cards
            });
            return;
        }
        
        console.log('Renderizando cards Kanban com ações:', acoes);
        
        // Mapear status para garantir compatibilidade
        const statusMapping = {
            'A FAZER': 'A Fazer',
            'EM ANDAMENTO': 'Em Andamento',
            'CONCLUÍDO': 'Concluído',
            'CONCLUIDO': 'Concluído'
        };
        
        // Contador de cards por coluna para logs e feedback
        const contadorCardsPorColuna = {
            'A Fazer': 0,
            'Em Andamento': 0,
            'Concluído': 0
        };
        
        acoes.forEach(acao => {
            // Garantir que o status seja válido
            let statusNormalizado = acao.status || 'A Fazer';
            
            // Normalizar status para um dos três valores aceitos
            statusNormalizado = statusMapping[statusNormalizado.toUpperCase()] || statusNormalizado;
            
            // Criar o cartão
            const card = document.createElement('div');
            card.className = 'kanban-card';
            card.draggable = true;
            card.dataset.id = acao._id || acao.id;

            if (acao.prioridade) {
                card.classList.add(`prioridade-${acao.prioridade.toLowerCase()}`);
            }

            // Formatação dos responsáveis
            let responsaveisText = '-';
            if (acao.responsaveis && acao.responsaveis.length > 0) {
                if (Array.isArray(acao.responsaveis)) {
                    responsaveisText = acao.responsaveis.map(resp => {
                        let responsavelId, responsavelNome;
                        if (typeof resp === 'object' && resp !== null) {
                            responsavelId = resp._id || resp.id;
                            responsavelNome = undefined;
                        } else {
                            responsavelId = resp;
                            responsavelNome = undefined;
                        }
                        // Buscar nome completo na lista de usuários, se possível
                        const usuario = todosUsuarios.find(u => (u._id || u.id)?.toString() === responsavelId?.toString());
                        responsavelNome = (usuario && (usuario.nome || usuario.name))
                            || (typeof resp === 'object' && (resp.name || resp.nome))
                            || (typeof resp === 'object' && resp.email ? resp.email.split('@')[0] : undefined)
                            || (typeof resp === 'string' && resp.includes('@') ? resp.split('@')[0] : resp)
                            || 'Usuário';
                        return responsavelNome;
                    }).join(', ');
                } else if (typeof acao.responsaveis === 'string') {
                    const responsavelId = acao.responsaveis.trim();
                    const usuario = todosUsuarios.find(u => (u._id || u.id)?.toString() === responsavelId);
                    let responsavelNome = (usuario && (usuario.nome || usuario.name))
                        || (responsavelId.includes('@') ? responsavelId.split('@')[0] : responsavelId);
                    responsaveisText = responsavelNome;
                }
            }

            card.innerHTML = `
                <h4>${acao.titulo}</h4>
                <p class="card-responsaveis">${responsaveisText}</p>
                <div class="card-footer">
                    ${acao.prazo ? `<span class="card-prazo"><i class="fas fa-calendar-alt"></i> ${new Date(acao.prazo).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>` : ''}
                    ${acao.prioridade ? `<span class="card-prioridade ${acao.prioridade.toLowerCase()}">${acao.prioridade}</span>` : ''}
                </div>
            `;
            
            // Verificar se existe uma coluna para este status
            if (kanbanColumns[statusNormalizado]) {
                kanbanColumns[statusNormalizado].appendChild(card);
                contadorCardsPorColuna[statusNormalizado]++;
                console.log(`Card adicionado à coluna "${statusNormalizado}" (${contadorCardsPorColuna[statusNormalizado]})`, acao.titulo);
            } else {
                console.warn(`Coluna não encontrada para status "${statusNormalizado}"`, 
                    `Status disponíveis: ${Object.keys(kanbanColumns).join(', ')}`);
                // Adicionar à coluna "A Fazer" como fallback
                if (kanbanColumns['A Fazer']) {
                    kanbanColumns['A Fazer'].appendChild(card);
                    contadorCardsPorColuna['A Fazer']++;
                    console.log(`Card adicionado à coluna "A Fazer" (fallback) (${contadorCardsPorColuna['A Fazer']})`, acao.titulo);
                }
            }
        });
        
        // Log para feedback da quantidade de cards em cada coluna
        console.log('Total de cards por coluna:', contadorCardsPorColuna);
        
        adicionarEventListenersDragDrop();
    }

    // --- Funções de API para Ações ---
    async function buscarAcoesAPI() {
        const token = getAuthToken();
        if (!token) {
            console.error('Usuário não autenticado.');
            // Idealmente, redirecionar para login ou mostrar mensagem
            todasAcoes = []; // Limpa ações se não autenticado
            popularFiltroResponsaveisSelect(); // Garante atualização do filtro
            aplicarFiltrosERenderizar(); // Chama uma nova função para aplicar filtros e renderizar
            return;
        }
        // Tentar cache
        const cacheKey = 'acoes_kanban';
        const cacheAcoes = cache.get(cacheKey);
        if (cacheAcoes) {
            todasAcoes = cacheAcoes;
            popularFiltroResponsaveisSelect();
            aplicarFiltrosERenderizar();
            return;
        }
        try {
            console.log('Buscando ações da API...');
            const response = await fetch(ACOES_API_URL, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Erro ao buscar ações: ${response.statusText}`);
            }
            
            let acoes = await response.json();
            console.log('Ações recebidas da API:', acoes);
            
            // Normalizar os dados das ações (garantir que status exista)
            if (Array.isArray(acoes)) {
                acoes = acoes.map(acao => {
                    // Garantir valores padrão para as propriedades
                    return {
                        ...acao,
                        status: acao.status || 'A Fazer',
                        responsaveis: acao.responsaveis || [],
                        titulo: acao.titulo || 'Sem título',
                        prioridade: acao.prioridade || 'Média'
                    };
                });
                
                // Verificar status das ações que vieram da API
                const statusesExistentes = acoes.map(a => a.status).filter(s => s);
                console.log('Status presentes nas ações:', statusesExistentes);
            }
            
            todasAcoes = acoes;
            cache.set(cacheKey, acoes, 2); // 2 minutos de cache
            popularFiltroResponsaveisSelect();
            aplicarFiltrosERenderizar();
        } catch (error) {
            console.error('Falha ao buscar ações da API:', error);
            todasAcoes = []; // Limpa em caso de erro
            popularFiltroResponsaveisSelect(); // Garante atualização do filtro mesmo em erro
            aplicarFiltrosERenderizar();
            mostrarNotificacao(`Erro ao carregar ações: ${error.message}`, 'danger');
        }
    }
    
    // Nova função para aplicar filtros locais e renderizar
    function aplicarFiltrosERenderizar() {
        let acoesFiltradas = [...todasAcoes];

        const statusValue = filterStatus.value;
        if (statusValue && statusValue !== 'todos') {
            acoesFiltradas = acoesFiltradas.filter(acao => acao.status === statusValue);
        }

        const responsavelValue = filterResponsaveis.value;
        if (responsavelValue && responsavelValue !== 'todos') {
            acoesFiltradas = acoesFiltradas.filter(acao => {
                if (!acao.responsaveis) return false;
                
                // Backend deve idealmente retornar responsáveis como array de strings ou objetos
                const responsaveisDaAcao = Array.isArray(acao.responsaveis) ? acao.responsaveis : (acao.responsaveis || '').split(',').map(r => r.trim());
                
                // Verificar se o responsável selecionado está na lista de responsáveis da ação
                return responsaveisDaAcao.some(resp => {
                    let idResp;
                    if (typeof resp === 'object' && resp !== null) {
                        idResp = resp._id || resp.id || (resp.email ? resp.email : undefined);
                    } else {
                        idResp = resp;
                    }
                    return idResp && idResp.toString() === responsavelValue;
                });
            });
        }

        const eixoValue = filterEixos.value;
        if (eixoValue && eixoValue !== 'todos') {
            acoesFiltradas = acoesFiltradas.filter(acao => {
                if (!acao.eixo) return false;
                
                // Se o backend retornou um objeto eixo
                if (typeof acao.eixo === 'object' && acao.eixo !== null) {
                    const eixoId = acao.eixo._id || acao.eixo.id;
                    return eixoId?.toString() === eixoValue;
                }
                
                // Se o backend retornou apenas o ID do eixo
                return acao.eixo.toString() === eixoValue;
            });
        }

        const searchTerm = searchInput.value.trim().toLowerCase();
        if (searchTerm) {
            acoesFiltradas = acoesFiltradas.filter(acao => {
                // Verificar título
                const tituloMatch = (acao.titulo || '').toLowerCase().includes(searchTerm);
                
                // Verificar descrição
                const descricaoMatch = (acao.descricao || '').toLowerCase().includes(searchTerm);
                
                // Verificar responsáveis
                let responsaveisMatch = false;
                
                if (acao.responsaveis) {
                    if (Array.isArray(acao.responsaveis)) {
                        // Verificar cada responsável
                        responsaveisMatch = acao.responsaveis.some(resp => {
                            // Se for um objeto com nome/email
                            if (typeof resp === 'object' && resp !== null) {
                                const nome = resp.name || resp.nome || '';
                                const email = resp.email || '';
                                
                                // Verificar nome
                                if (nome.toLowerCase().includes(searchTerm)) {
                                    return true;
                                }
                                
                                // Verificar email ou parte do email (nome de usuário)
                                if (email.toLowerCase().includes(searchTerm)) {
                                    return true;
                                }
                                
                                // Verificar username do email
                                if (email.includes('@') && email.split('@')[0].toLowerCase().includes(searchTerm)) {
                                    return true;
                                }
                            }
                            // Se for uma string (nome ou email)
                            else if (typeof resp === 'string') {
                                // Verificar a string diretamente
                                if (resp.toLowerCase().includes(searchTerm)) {
                                    return true;
                                }
                                
                                // Se for email, verificar parte do nome de usuário
                                if (resp.includes('@') && resp.split('@')[0].toLowerCase().includes(searchTerm)) {
                                    return true;
                                }
                            }
                            
                            return false;
                        });
                    }
                    // Se for uma string única
                    else if (typeof acao.responsaveis === 'string') {
                        const responsaveisStr = acao.responsaveis.toLowerCase();
                        responsaveisMatch = responsaveisStr.includes(searchTerm);
                        
                        // Verificar partes de emails, se houver
                        if (!responsaveisMatch && responsaveisStr.includes('@')) {
                            const partes = responsaveisStr.split(',').map(r => r.trim());
                            responsaveisMatch = partes.some(parte => {
                                if (parte.includes('@')) {
                                    return parte.split('@')[0].includes(searchTerm);
                                }
                                return false;
                            });
                        }
                    }
                }
                
                // Retornar true se qualquer um dos campos corresponder
                return tituloMatch || descricaoMatch || responsaveisMatch;
            });
        }

        renderizarTabelaAcoes(acoesFiltradas);
        atualizarContadores(acoesFiltradas);
        renderizarKanbanCards(acoesFiltradas);
    }


    async function adicionarAcaoAPI(dadosAcao) {
        const token = getAuthToken();
        if (!token) { 
            mostrarNotificacao('Você precisa estar autenticado para adicionar uma ação.', 'danger');
            return; 
        }
        try {
            // Adicionar o usuário atual como responsável se a lista estiver vazia
            const usuarioAtual = obterUsuarioAtual();
            if ((!dadosAcao.responsaveis || dadosAcao.responsaveis.length === 0) && usuarioAtual) {
                if (!dadosAcao.responsaveis) dadosAcao.responsaveis = [];
                dadosAcao.responsaveis.push(usuarioAtual.id || usuarioAtual.nome);
            }
            // Garante que só IDs válidos sejam enviados
            if (Array.isArray(dadosAcao.responsaveis)) {
                dadosAcao.responsaveis = dadosAcao.responsaveis.filter(id => typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/));
            }
            const response = await fetch(ACOES_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dadosAcao)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`Erro ao salvar ação: ${response.status} ${errorData.message || response.statusText}`);
            }
            const acaoAdicionada = await response.json();
            mostrarNotificacao('Ação adicionada com sucesso!', 'success');
            cache.remove('acoes_kanban');
            await buscarAcoesAPI(); 
            // Atualiza o cache imediatamente após adicionar
            cache.set('acoes_kanban', todasAcoes, 2);
            if (typeof atualizarGraficos === 'function') atualizarGraficos();
            return acaoAdicionada;
        } catch (error) {
            mostrarNotificacao(error.message, 'danger');
            throw error;
        }
    }

    async function atualizarAcaoAPI(acaoId, dadosAcao) {
        if (!acaoId) {
            throw new Error('ID da ação é obrigatório para atualização');
        }
        const token = getAuthToken();
        if (!token) { 
            mostrarNotificacao('Você precisa estar autenticado para atualizar uma ação.', 'danger');
            return; 
        }
        fecharModalNovaAcao();
        const linhaAcao = document.querySelector(`tr[data-id="${acaoId}"]`);
        if (linhaAcao) {
            linhaAcao.style.opacity = '0.7';
            linhaAcao.style.backgroundColor = '#f0f8ff';
        }
        try {
            // Garante que só IDs válidos sejam enviados
            if (Array.isArray(dadosAcao.responsaveis)) {
                dadosAcao.responsaveis = dadosAcao.responsaveis.filter(id => typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/));
            }
            const response = await fetch(`${ACOES_API_URL}/${acaoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dadosAcao)
            });
            if (!response.ok) {
                if (linhaAcao) {
                    linhaAcao.style.opacity = '1';
                    linhaAcao.style.backgroundColor = '';
                }
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                mostrarNotificacao(`Erro ao atualizar ação: ${response.status} ${errorData.message || response.statusText}`, 'danger');
                return;
            }
            cache.remove('acoes_kanban');
            await buscarAcoesAPI();
            // Atualiza o cache imediatamente após atualizar
            cache.set('acoes_kanban', todasAcoes, 2);
            localStorage.setItem('acoes_kanban', JSON.stringify({ value: todasAcoes, expires: Date.now() + 2*60*1000 }));
            if (typeof atualizarGraficos === 'function') atualizarGraficos();
            const linhaAtualizada = document.querySelector(`tr[data-id="${acaoId}"]`);
            if (linhaAtualizada) {
                linhaAtualizada.style.backgroundColor = '#e6ffe6';
                linhaAtualizada.style.transition = 'background-color 1s';
                setTimeout(() => {
                    linhaAtualizada.style.backgroundColor = '';
                }, 2000);
            }
            mostrarNotificacao('Ação atualizada com sucesso!', 'success');
        } catch (error) {
            mostrarNotificacao(`Erro ao atualizar ação: ${error.message}`, 'danger');
            if (linhaAcao) {
                linhaAcao.style.opacity = '1';
                linhaAcao.style.backgroundColor = '';
            }
        }
    }

    async function excluirAcaoAPI(id) {
        const token = getAuthToken();
        if (!token) { 
            mostrarNotificacao('Você precisa estar autenticado para excluir uma ação.', 'danger');
            return; 
        }
        try {
            // Feedback visual (apenas opacidade)
            const linhaAcao = document.querySelector(`tr[data-id="${id}"]`);
            if (linhaAcao) {
                linhaAcao.style.opacity = '0.5';
                linhaAcao.style.backgroundColor = '#ffeeee';
            }
            const cardAcao = document.querySelector(`.kanban-card[data-id="${id}"]`);
            if (cardAcao) {
                cardAcao.style.opacity = '0.5';
                cardAcao.style.backgroundColor = '#ffeeee';
            }
            const response = await fetch(`${ACOES_API_URL}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                if (response.status === 404) {
                    // Se for 404, não mostrar notificação de erro (ação já não existe)
                    await buscarAcoesAPI();
                    return;
                }
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                mostrarNotificacao(`Erro ao excluir ação: ${response.status} ${errorData.message || response.statusText}`, 'danger');
                if (linhaAcao) {
                    linhaAcao.style.opacity = '1';
                    linhaAcao.style.backgroundColor = '';
                }
                if (cardAcao) {
                    cardAcao.style.opacity = '1';
                    cardAcao.style.backgroundColor = '';
                }
                return;
            }
            // Só aqui, após sucesso, atualize a lista e mostre sucesso
            setTimeout(async () => {
                cache.remove('acoes_kanban');
                await buscarAcoesAPI();
                // Atualiza o cache imediatamente após excluir
                cache.set('acoes_kanban', todasAcoes, 2);
                if (typeof atualizarGraficos === 'function') atualizarGraficos();
                mostrarNotificacao('Ação excluída com sucesso!', 'success');
            }, 300);
        } catch (error) {
            mostrarNotificacao(`Erro ao excluir ação: ${error.message}`, 'danger');
        }
    }
    
    // Modificar para usar API
    async function atualizarStatusAcaoAPI(acaoId, novoStatus) {
        const token = getAuthToken();
        if (!token) { return; }
        const acao = todasAcoes.find(a => (a._id || a.id) == acaoId);
        if (!acao) { return; }
        const dadosAtualizados = { ...acao, status: novoStatus };
        // Garante que só IDs válidos sejam enviados
        if (Array.isArray(dadosAtualizados.responsaveis)) {
            dadosAtualizados.responsaveis = dadosAtualizados.responsaveis.filter(id => typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/));
        }
        try {
            const response = await fetch(`${ACOES_API_URL}/${acaoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dadosAtualizados)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                mostrarNotificacao(`Erro ao atualizar status: ${response.status} ${errorData.message || response.statusText}`, 'danger');
                await buscarAcoesAPI();
                return;
            }
            cache.remove('acoes_kanban');
            await buscarAcoesAPI();
            if (typeof atualizarGraficos === 'function') atualizarGraficos();
            mostrarNotificacao(`Status atualizado para: ${novoStatus}`, 'success');
        } catch (error) {
            mostrarNotificacao(`Erro ao atualizar status: ${error.message}`, 'danger');
            await buscarAcoesAPI();
        }
    }

    // --- Lógica de Arrastar e Soltar (Drag and Drop) ---
    let draggedItem = null;

    // Nova função para obter usuários "reais" do localStorage ou da API
    function obterUsuariosDoSistema() {
        try {
            const usuarios = [];
            
            // Primeiro obter o usuário atual e garantir que ele esteja na lista
            const usuarioAtual = obterUsuarioAtual();
            if (usuarioAtual && usuarioAtual.nome) {
                usuarios.push({
                    id: usuarioAtual.id,
                    name: usuarioAtual.nome,
                    email: usuarioAtual.email
                });
            }
            
            // Adicionar outros usuários do localStorage
            const usuariosString = localStorage.getItem('users');
            if (usuariosString) {
                const usuariosDoStorage = JSON.parse(usuariosString);
                if (Array.isArray(usuariosDoStorage)) {
                    // Filtrar usuários do storage para não duplicar o usuário atual
                    const usuariosUnicos = usuariosDoStorage.filter(u => {
                        const nomeUsuario = u.name || u.nome || u.email;
                        return nomeUsuario !== usuarioAtual.nome;
                    });
                    
                    usuarios.push(...usuariosUnicos);
                    console.log('Total de usuários carregados:', usuarios.length);
                    return usuarios;
                }
            }
            
            // Se não encontrou outros usuários, retorna pelo menos o usuário atual
            console.log('Usando apenas o usuário atual como responsável possível');
            return usuarios;
            
        } catch (error) {
            console.error('Erro ao obter usuários:', error);
            
            // Em caso de erro, ainda tenta retornar o usuário atual
            const usuarioAtual = obterUsuarioAtual();
            return usuarioAtual ? [{ 
                id: usuarioAtual.id, 
                name: usuarioAtual.nome,
                email: usuarioAtual.email
            }] : [];
        }
    }

    // Substituir o select múltiplo de responsáveis por um checklist de responsáveis
    function popularResponsaveisChecklist() {
        const container = document.getElementById('responsaveisChecklistContainer');
        if (!container) return;
        container.innerHTML = '';
        const usuarios = obterUsuariosDoSistema();
        if (usuarios.length === 0) {
            container.innerHTML = '<p>Nenhum usuário disponível</p>';
            return;
        }
        usuarios.forEach((user, idx) => {
            const nomeUsuario = user.name || user.nome || user.email || 'Usuário';
            const idUsuario = user._id || user.id || idx;
            // Gera um id único para cada checkbox
            const checkboxId = `resp_${idUsuario}`;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = idUsuario;
            checkbox.id = checkboxId;
            checkbox.className = 'responsavel-checkbox';
            const label = document.createElement('label');
            label.htmlFor = checkboxId;
            label.textContent = nomeUsuario;
            const div = document.createElement('div');
            div.className = 'responsavel-checkbox-item';
            div.appendChild(checkbox);
            div.appendChild(label);
            container.appendChild(div);
        });
    }

    // Função para obter os IDs dos responsáveis marcados
    function obterResponsaveisMarcados() {
        const container = document.getElementById('responsaveisChecklistContainer');
        if (!container) return [];
        return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    }

    function adicionarEventListenersDragDrop() {
        const cards = document.querySelectorAll('.kanban-card');
        const containers = document.querySelectorAll('.kanban-cards-container');

        cards.forEach(card => {
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
        });

        containers.forEach(container => {
            container.addEventListener('dragover', handleDragOver);
            container.addEventListener('dragleave', handleDragLeave);
            container.addEventListener('drop', handleDrop);
        });
    }

    function handleDragStart(event) {
        draggedItem = event.target;
        event.dataTransfer.setData('text/plain', event.target.dataset.id);
        setTimeout(() => {
            event.target.classList.add('dragging');
        }, 0);
    }

    function handleDragEnd(event) {
        event.target.classList.remove('dragging');
        draggedItem = null;
    }

    function handleDragOver(event) {
        event.preventDefault();
        if (event.target.classList.contains('kanban-cards-container')){
            event.target.classList.add('drag-over');
        }
    }

    function handleDragLeave(event) {
        if (event.target.classList.contains('kanban-cards-container')){
            event.target.classList.remove('drag-over');
        }
    }

    async function handleDrop(event) { // Modificada para async
        event.preventDefault();
        const targetContainer = event.target.closest('.kanban-cards-container');
        if (targetContainer) {
            targetContainer.classList.remove('drag-over');
            if (draggedItem) {
                const acaoId = draggedItem.dataset.id;
                const targetColumnElement = targetContainer.closest('.kanban-column');
                
                if (!targetColumnElement || !acaoId) {
                    console.error('Não foi possível determinar o card ou a coluna de destino.');
                    return;
                }

                let novoStatus = '';
                if (targetColumnElement.id === 'column-todo') novoStatus = 'A Fazer';
                else if (targetColumnElement.id === 'column-inprogress') novoStatus = 'Em Andamento';
                else if (targetColumnElement.id === 'column-done') novoStatus = 'Concluído';
                else {
                    console.error('Coluna de destino desconhecida:', targetColumnElement.id);
                    return;
                }
                
                // Chamar a função da API para atualizar o status
                await atualizarStatusAcaoAPI(acaoId, novoStatus);
            }
        }
    }

    // --- Funções de Renderização de Eixos (Ainda usam dados mocados/locais) ---
    // SERÃO MODIFICADAS PARA USAR API
    function renderizarListaEixos() {
        eixosListContainer.innerHTML = '';
        if (!todosEixos || todosEixos.length === 0) { // Usa todosEixos
            eixosListContainer.innerHTML = '<p>Nenhum eixo cadastrado.</p>';
            return;
        }
        todosEixos.forEach(eixo => { // Usa todosEixos
            const itemDiv = document.createElement('div');
            itemDiv.className = 'list-item';
            itemDiv.innerHTML = `
                <span>${eixo.nome}</span>
                <div class="item-actions">
                    <button class="btn-icon btn-edit-eixo" data-id="${eixo._id || eixo.id}" aria-label="Editar Eixo"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon btn-delete-eixo" data-id="${eixo._id || eixo.id}" aria-label="Excluir Eixo"><i class="fas fa-trash"></i></button>
                </div>
            `;
            eixosListContainer.appendChild(itemDiv);
        });
    }

    function popularSelectEixos() {
        if (!eixoAcaoSelect) return;
        const valorSelecionadoAnteriormente = eixoAcaoSelect.value;
        eixoAcaoSelect.innerHTML = '<option value="">Selecione um Eixo</option>'; 
        todosEixos.forEach(eixo => { // Usa todosEixos
            const option = document.createElement('option');
            option.value = eixo._id || eixo.id; // Usa o ID do eixo como valor
            option.textContent = eixo.nome;
            eixoAcaoSelect.appendChild(option);
        });
        // Tenta manter o eixo selecionado anteriormente
        if (valorSelecionadoAnteriormente) {
            eixoAcaoSelect.value = valorSelecionadoAnteriormente;
        }
    }

    function popularFiltroEixosSelect() {
        if (!filterEixos) return;
        const valorSelecionadoAnteriormente = filterEixos.value;
        filterEixos.innerHTML = '<option value="todos">Todos os Eixos</option>'; 
        todosEixos.forEach(eixo => { // Usa todosEixos
            const option = document.createElement('option');
            option.value = eixo._id || eixo.id; // Usa o ID do eixo como valor
            option.textContent = eixo.nome;
            filterEixos.appendChild(option);
        });
        // Tenta manter o filtro selecionado anteriormente
        if (valorSelecionadoAnteriormente === 'todos' || todosEixos.some(e => (e._id || e.id) === valorSelecionadoAnteriormente)) {
            filterEixos.value = valorSelecionadoAnteriormente;
        } else {
            filterEixos.value = 'todos'; 
        }
    }

    // --- CRUD Mock para Eixos (SERÁ SUBSTITUÍDO PELA API) ---
    function adicionarEixoMock(nome) {
        const novoEixo = { id: proximoEixoIdMocado++, nome }; // Ainda usa ID mocado
        todosEixos.push(novoEixo); // Usa todosEixos
        console.log('Eixo adicionado (mock):', novoEixo);
        renderizarListaEixos();
        popularSelectEixos(); 
        popularFiltroEixosSelect(); 
    }

    function atualizarEixoDataMock(id, nome) {
        const index = todosEixos.findIndex(e => (e._id || e.id) == id); // Usa todosEixos
        if (index !== -1) {
            const nomeAntigoEixo = todosEixos[index].nome;
            if (nomeAntigoEixo !== nome) {
                todasAcoes.forEach(acao => { // Atualiza em todasAcoes
                    if (acao.eixo === nomeAntigoEixo) {
                        acao.eixo = nome; 
                    }
                });
            }
            todosEixos[index].nome = nome;
            console.log('Eixo atualizado (mock):', todosEixos[index]);
            renderizarListaEixos();
            popularSelectEixos();
            popularFiltroEixosSelect();
            aplicarFiltrosERenderizar(); 
        } else {
            console.error('Erro ao atualizar: Eixo não encontrado (mock)', id);
        }
    }

    function excluirEixoDataMockLocal(id) { 
        const eixoExcluido = todosEixos.find(e => (e._id || e.id) == id); // Usa todosEixos
        if (!eixoExcluido) return;

        const nomeEixoExcluido = eixoExcluido.nome;
        todosEixos = todosEixos.filter(e => (e._id || e.id) != id);
        console.log('Eixo excluído (mock), ID:', id);
        
        todasAcoes.forEach(acao => { // Atualiza em todasAcoes
            if (acao.eixo === nomeEixoExcluido) {
                acao.eixo = ''; 
            }
        });

        renderizarListaEixos();
        popularSelectEixos();
        popularFiltroEixosSelect();
        aplicarFiltrosERenderizar(); 
    }

    // --- Manipulação do Modal de Eixos (Lógica de Abertura/Fechamento OK)---
    // As submissões chamarão funções da API de Eixos
    function abrirModalNovoEixo() {
        eixoEditMode = false;
        eixoEditId = null;
        formAdicionarEditarEixo.reset();
        hiddenEixoEditIdInput.value = '';
        modalEixoTitle.textContent = 'Adicionar Eixo';
        salvarEixoBtn.textContent = 'Salvar Eixo';
        modalAdicionarEditarEixo.style.display = 'block';
    }

    function abrirModalEditarEixo(id) {
        const eixo = todosEixos.find(e => (e._id || e.id) == id); // Usa todosEixos
        if (!eixo) return;
        eixoEditMode = true;
        eixoEditId = id;
        hiddenEixoEditIdInput.value = id;
        nomeEixoInput.value = eixo.nome;
        modalEixoTitle.textContent = 'Editar Eixo';
        salvarEixoBtn.textContent = 'Atualizar Eixo';
        modalAdicionarEditarEixo.style.display = 'block';
    }

    function fecharModalEixo() {
        modalAdicionarEditarEixo.style.display = 'none';
    }

    // --- Event Listeners para Eixos ---
    // O submit do formAdicionarEditarEixo chamará as funções da API de Eixos
    if (adicionarEixoBtn) adicionarEixoBtn.addEventListener('click', abrirModalNovoEixo);
    if (closeModalEixoBtn) closeModalEixoBtn.addEventListener('click', fecharModalEixo);
    if (cancelarEixoBtn) cancelarEixoBtn.addEventListener('click', fecharModalEixo);
    
    // Evento de fechar modal ao clicar fora (mantido)
    // window.addEventListener('click', (event) => {
    //     if (event.target === modalAdicionarEditarEixo) fecharModalEixo();
    //     if (event.target === modalNovaAcao) {
    //         fecharModalNovaAcao();
    //     }
    // }); // COMBINAR OS DOIS LISTENERS DE WINDOW CLICK ABAIXO

    if (formAdicionarEditarEixo) {
        formAdicionarEditarEixo.addEventListener('submit', async (event) => { // Modificado para async
            event.preventDefault();
            const nome = nomeEixoInput.value.trim();
            const id = hiddenEixoEditIdInput.value; // Este é eixoEditId
            if (!nome) {
                alert('O nome do eixo é obrigatório.'); // Usar toast/notificação melhor
                return;
            }
            if (eixoEditMode && id) {
                await atualizarEixoAPI(id, { nome }); // Usar API real
            } else {
                await adicionarEixoAPI({ nome }); // Usar API real
            }
            fecharModalEixo();
        });
    }

    if (eixosListContainer) {
        eixosListContainer.addEventListener('click', async (event) => { // Modificado para async
            const targetButton = event.target.closest('button');
            if (!targetButton) return;
            const id = targetButton.dataset.id;
            if (targetButton.classList.contains('btn-edit-eixo')) {
                abrirModalEditarEixo(id);
            }
            if (targetButton.classList.contains('btn-delete-eixo')) {
                const showConfirmDialog = getShowConfirmDialog();
                if (showConfirmDialog) {
                    showConfirmDialog('Tem certeza que deseja excluir este eixo?', async () => {
                        await excluirEixoAPI(id); // Usar API real
                    });
                } else {
                    if (confirm('Tem certeza que deseja excluir este eixo?')) {
                        await excluirEixoAPI(id); // Usar API real
                    }
                }
            }
        });
    }

    // --- Manipulação do Modal de Ações (Abertura/Fechamento OK) ---
    // Submit do formNovaAcao já está adaptado para chamar funções da API de Ações
    function abrirModalParaNovaAcao() {
        editMode = false;
        editAcaoId = null;
        formNovaAcao.reset();
        popularSelectEixos(); 
        popularResponsaveisChecklist();
        modalNovaAcao.querySelector('.modal-header h2').textContent = 'Nova Ação';
        modalNovaAcao.querySelector('button[type="submit"]').textContent = 'Salvar Ação';
        modalNovaAcao.style.display = 'block';
    }

    function abrirModalParaEditarAcao(id) {
        editMode = true;
        editAcaoId = id.toString();
        const acao = todasAcoes.find(a => (a._id || a.id).toString() === editAcaoId);

        if (acao) {
            const modalHeader = modalNovaAcao.querySelector('.modal-header h2');
            if (modalHeader) modalHeader.textContent = 'Editar Ação';
            const submitBtn = modalNovaAcao.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Atualizar Ação';

            // Preencher campos do formulário
            document.getElementById('tituloAcaoInput').value = acao.titulo || '';
            document.getElementById('descricaoAcaoInput').value = acao.descricao || '';
            document.getElementById('statusAcaoSelect').value = acao.status || 'A Fazer';
            document.getElementById('prioridadeAcaoSelect').value = acao.prioridade || 'Média';
            
            // Preencher o prazo se existir
            document.getElementById('prazoAcaoInput').value = acao.prazo ? new Date(acao.prazo).toISOString().split('T')[0] : '';
            
            // Pré-selecionar eixo com o ID correto
            let eixoId = null;
            if (acao.eixo) {
                // Se o backend retornou um objeto eixo
                if (typeof acao.eixo === 'object' && acao.eixo !== null) {
                    eixoId = acao.eixo._id || acao.eixo.id;
                } else {
                    // Se o backend retornou apenas o ID do eixo
                    eixoId = acao.eixo;
                }
            }

            // Garantir que o select de eixos esteja populado
            popularSelectEixos();
            
            const eixoSelect = document.getElementById('eixoAcaoSelect');
            if (eixoSelect) {
                setTimeout(() => {
                    eixoSelect.value = eixoId || '';
                }, 100); // Pequeno delay para garantir que o select esteja populado
            }

            // Pré-selecionar múltiplos responsáveis
            popularResponsaveisChecklist();
            
            if (acao.responsaveis && responsaveisAcaoSelectMultiple) {
                setTimeout(() => {
                    try {
                        // Desmarcar todas as opções primeiro
                        Array.from(responsaveisAcaoSelectMultiple.options).forEach(option => option.selected = false);
                        
                        // Processar responsáveis, que podem ser objetos ou strings
                        const responsaveisParaSelecionar = [];
                        if (Array.isArray(acao.responsaveis)) {
                            acao.responsaveis.forEach(resp => {
                                if (typeof resp === 'object' && resp !== null) {
                                    // Se for um objeto, pegar o nome ou email
                                    const nomeResp = resp.name || resp.nome || resp.email;
                                    if (nomeResp) responsaveisParaSelecionar.push(nomeResp);
                                } else if (typeof resp === 'string') {
                                    // Se for string diretamente
                                    responsaveisParaSelecionar.push(resp);
                                }
                            });
                        } else if (typeof acao.responsaveis === 'string') {
                            // Se for uma string separada por vírgulas
                            acao.responsaveis.split(',').forEach(r => {
                                const trim = r.trim();
                                if (trim) responsaveisParaSelecionar.push(trim);
                            });
                        }
                        
                        // Selecionar as opções correspondentes
                Array.from(responsaveisAcaoSelectMultiple.options).forEach(option => {
                            if (responsaveisParaSelecionar.includes(option.value)) {
                                option.selected = true;
                            }
                        });
                        
                        console.log('Responsáveis selecionados:', responsaveisParaSelecionar);
                    } catch (error) {
                        console.error('Erro ao selecionar responsáveis:', error);
                    }
                }, 100); // Pequeno delay para garantir que o select esteja populado
            }

            // Popular o checklist se existir
            if (acao.checklist) {
                popularChecklistNovaAcao(acao.checklist);
            } else {
                limparFormularioChecklistNovaAcao(); // Garantir que esteja limpo se não houver checklist
            }

            // Marcar os responsáveis já atribuídos
            if (acao.responsaveis && Array.isArray(acao.responsaveis)) {
                setTimeout(() => {
                    acao.responsaveis.forEach(resp => {
                        const id = typeof resp === 'object' ? (resp._id || resp.id) : resp;
                        const cb = document.getElementById(`resp_${id}`);
                        if (cb) cb.checked = true;
                    });
                }, 100);
            }
        }

        modalNovaAcao.style.display = 'block';
    }

    if (novaAcaoBtn) {
        novaAcaoBtn.addEventListener('click', abrirModalParaNovaAcao);
    }

    function fecharModalNovaAcao() {
        if (modalNovaAcao) modalNovaAcao.style.display = 'none';
        if (formNovaAcao) formNovaAcao.reset();
        editMode = false;
        editAcaoId = null;
        // Limpar campos de seleção múltipla e outros específicos, se necessário
        if (responsaveisAcaoSelectMultiple) {
            Array.from(responsaveisAcaoSelectMultiple.options).forEach(option => option.selected = false);
        }
        // Limpar o formulário do checklist
        limparFormularioChecklistNovaAcao(); 
    }

    if (closeModalNovaAcaoBtn) {
        closeModalNovaAcaoBtn.addEventListener('click', fecharModalNovaAcao);
    }
    if (cancelarNovaAcaoBtn) {
        cancelarNovaAcaoBtn.addEventListener('click', fecharModalNovaAcao);
    }

    // Combinar os dois listeners de window click
    window.addEventListener('click', (event) => {
        if (event.target === modalNovaAcao) {
            fecharModalNovaAcao();
        }
        if (event.target === modalAdicionarEditarEixo) { // Adicionado
            fecharModalEixo();
        }
    });

    // --- Submissão do Formulário de Ação (Adaptado para API) ---
    if (formNovaAcao) {
        formNovaAcao.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const formData = new FormData(formNovaAcao);
            const dadosAcao = {
                titulo: formData.get('titulo'),
                descricao: formData.get('descricao'),
                status: formData.get('status'),
                prioridade: formData.get('prioridade'),
                responsaveis: obterResponsaveisMarcados(),
                eixo: formData.get('eixo') || null,
                prazo: formData.get('prazo') || null,
                // Adicionar dados do checklist
                checklist: obterDadosChecklistNovaAcao()
            };

            console.log('Enviando ação para API (corrigido):', dadosAcao);

            if (!dadosAcao.titulo || !dadosAcao.status) {
                alert('Título e Status são obrigatórios.'); // Melhorar com notificação
                return;
            }

            try {
            if (editMode && editAcaoId !== null) {
                await atualizarAcaoAPI(editAcaoId, dadosAcao);
            } else {
                await adicionarAcaoAPI(dadosAcao);
            }
            fecharModalNovaAcao();
            } catch (error) {
                console.error('Erro ao salvar ação:', error);
                alert(`Erro ao salvar ação: ${error.message}`);
            }
        });
    }

    // --- Event Listeners para Ações na Tabela (Adaptado para API) ---
    actionsTableBody.addEventListener('click', async (event) => { // Modificado para async
        const targetButton = event.target.closest('button');
        if (!targetButton) return;

        const acaoId = targetButton.dataset.id;
        if (!acaoId) {
            console.error('ID da ação não encontrado no botão');
            return;
        }

        // Buscar os dados da ação para mostrar informações nos alertas
        const acao = todasAcoes.find(a => (a._id || a.id).toString() === acaoId.toString());
        const tituloAcao = acao ? acao.titulo : `ID ${acaoId}`;

        if (targetButton.classList.contains('btn-edit')) {
            // Impedir cliques múltiplos
            if (targetButton.disabled) return;
            targetButton.disabled = true;
            
            try {
            abrirModalParaEditarAcao(acaoId);
            } catch (error) {
                console.error('Erro ao abrir modal de edição:', error);
                alert(`Erro ao abrir editor: ${error.message}`);
            } finally {
                setTimeout(() => {
                    targetButton.disabled = false;
                }, 500);
            }
        }

        if (targetButton.classList.contains('btn-delete')) {
            // Impedir cliques múltiplos
            if (targetButton.disabled) return;
            targetButton.disabled = true;
            
            try {
                const showConfirmDialog = getShowConfirmDialog();
                if (showConfirmDialog) {
                    showConfirmDialog(`Tem certeza que deseja excluir a ação "${tituloAcao}"?`, async () => {
                        await excluirAcaoAPI(acaoId);
                    });
                } else {
                    if (confirm(`Tem certeza que deseja excluir a ação "${tituloAcao}"?`)) {
                        await excluirAcaoAPI(acaoId);
                    }
                }
            } catch (error) {
                console.error('Erro ao excluir ação:', error);
                alert(`Erro ao excluir: ${error.message}`);
            } finally {
                setTimeout(() => {
                    targetButton.disabled = false;
                }, 500);
            }
        }
    });

    // --- Event Listeners para os Filtros e Pesquisa ---
    // Estes agora chamam aplicarFiltrosERenderizar() que opera sobre `todasAcoes`
    if (filterStatus) {
        filterStatus.addEventListener('change', aplicarFiltrosERenderizar);
    }
    if (filterResponsaveis) {
        filterResponsaveis.addEventListener('change', aplicarFiltrosERenderizar);
    }
    if (filterEixos) {
        filterEixos.addEventListener('change', aplicarFiltrosERenderizar);
    }

    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                aplicarFiltrosERenderizar();
            }, 300); 
        });
    }

    // --- Funções para obter e popular responsáveis (filtros/modais) ---
    function obterResponsaveisUnicos(listaDeAcoes) {
        // Usar um Map para armazenar responsáveis por ID para evitar duplicações
        const responsaveisMap = new Map();
        (listaDeAcoes || todasAcoes).forEach(acao => {
            if (acao.responsaveis) {
                if (Array.isArray(acao.responsaveis)) {
                    acao.responsaveis.forEach(r => {
                        let id, nomeResponsavel;
                        if (typeof r === 'object' && r !== null) {
                            id = r._id || r.id || (r.email ? r.email : undefined);
                            // Buscar nome completo na lista de usuários, se possível
                            const usuario = todosUsuarios.find(u => (u._id || u.id) === id);
                            nomeResponsavel = (usuario && (usuario.nome || usuario.name)) || r.name || r.nome || (r.email ? r.email.split('@')[0] : 'Usuário');
                        } else if (r && typeof r === 'string' && r.trim()) {
                            id = r.trim();
                            // Buscar nome completo na lista de usuários, se possível
                            const usuario = todosUsuarios.find(u => (u._id || u.id) === id);
                            nomeResponsavel = (usuario && (usuario.nome || usuario.name)) || id;
                            // Se for email, extrair apenas o nome
                            if (!usuario && id.includes('@')) {
                                nomeResponsavel = id.split('@')[0];
                            }
                        }
                        if (id && nomeResponsavel) {
                            responsaveisMap.set(id.toString(), nomeResponsavel);
                        }
                    });
                } else if (typeof acao.responsaveis === 'string') {
                    acao.responsaveis.split(',').forEach(r => {
                        const id = r.trim();
                        if (id) {
                            // Buscar nome completo na lista de usuários, se possível
                            const usuario = todosUsuarios.find(u => (u._id || u.id) === id);
                            let nomeResponsavel = (usuario && (usuario.nome || usuario.name)) || id;
                            if (!usuario && id.includes('@')) {
                                nomeResponsavel = id.split('@')[0];
                            }
                            responsaveisMap.set(id, nomeResponsavel);
                        }
                    });
                }
            }
        });
        // Converter para array de objetos {id, nome} e ordenar por nome
        const responsaveisArray = Array.from(responsaveisMap.entries()).map(([id, nome]) => ({ id, nome }));
        responsaveisArray.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        return responsaveisArray;
    }

    function popularFiltroResponsaveisSelect() {
        if (!filterResponsaveis) return;
        const responsaveisUnicos = obterResponsaveisUnicos(todasAcoes); // Agora retorna array de objetos {id, nome}
        const valorSelecionadoAnteriormente = filterResponsaveis.value;

        filterResponsaveis.innerHTML = '<option value="todos">Todos os Responsáveis</option>';
        
        responsaveisUnicos.forEach(responsavel => {
            const option = document.createElement('option');
            option.value = responsavel.id; // O value será o ID/email/nome único
            option.textContent = responsavel.nome; // Exibe o nome completo
            filterResponsaveis.appendChild(option);
        });

        if (responsaveisUnicos.some(r => r.id === valorSelecionadoAnteriormente) || valorSelecionadoAnteriormente === 'todos') {
            filterResponsaveis.value = valorSelecionadoAnteriormente;
        } else {
            filterResponsaveis.value = 'todos';
        }
    }
    
    // --- Inicialização ---
    async function inicializarKanban() { // Modificada para async
        await buscarEixosAPI(); // Busca eixos da API
        todosUsuarios = await buscarUsuariosAPI(); // Buscar todos os usuários da API
        await buscarAcoesAPI(); // Busca ações da API
        
        // Removido: popularResponsaveisSelectMultiple();
        popularFiltroResponsaveisSelect();
        
        // Garantir que os gráficos sejam atualizados na inicialização
        if (typeof window.atualizarGraficos === 'function') {
            window.atualizarGraficos();
        }
    }

    inicializarKanban();

    // --- Funções de API para Eixos ---
    async function buscarEixosAPI() {
        const token = getAuthToken();
        if (!token) {
            console.error('Usuário não autenticado.');
            todosEixos = []; // Limpa eixos se não autenticado
            renderizarListaEixos();
            popularSelectEixos();
            popularFiltroEixosSelect();
            return;
        }
        const cacheKey = 'eixos_kanban';
        const cacheEixos = cache.get(cacheKey);
        if (cacheEixos) {
            todosEixos = cacheEixos;
            renderizarListaEixos();
            popularSelectEixos();
            popularFiltroEixosSelect();
            return;
        }
        try {
            const response = await fetch(EIXOS_API_URL, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error(`Erro ao buscar eixos: ${response.statusText}`);
            }
            todosEixos = await response.json();
            cache.set(cacheKey, todosEixos, 2);
            renderizarListaEixos();
            popularSelectEixos();
            popularFiltroEixosSelect();
        } catch (error) {
            console.error('Falha ao buscar eixos da API:', error);
            todosEixos = []; // Limpa em caso de erro
            renderizarListaEixos();
            popularSelectEixos();
            popularFiltroEixosSelect();
        }
    }

    async function adicionarEixoAPI(dadosEixo) {
        const token = getAuthToken();
        if (!token) { console.error('Não autenticado'); return; }
        try {
            const response = await fetch(EIXOS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dadosEixo)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`Erro ao adicionar eixo: ${errorData.message || response.statusText}`);
            }
            await buscarEixosAPI(); // Atualiza a lista de eixos após adicionar
        } catch (error) {
            console.error('Falha ao adicionar eixo via API:', error);
            alert(`Erro ao adicionar eixo: ${error.message}`);
        }
    }

    async function atualizarEixoAPI(id, dadosEixo) {
        const token = getAuthToken();
        if (!token) { console.error('Não autenticado'); return; }
        try {
            const response = await fetch(`${EIXOS_API_URL}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dadosEixo)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`Erro ao atualizar eixo: ${errorData.message || response.statusText}`);
            }
            await buscarEixosAPI(); // Atualiza a lista de eixos após editar
        } catch (error) {
            console.error('Falha ao atualizar eixo via API:', error);
            alert(`Erro ao atualizar eixo: ${error.message}`);
        }
    }

    async function excluirEixoAPI(id) {
        const token = getAuthToken();
        if (!token) { console.error('Não autenticado'); return; }
        try {
            const response = await fetch(`${EIXOS_API_URL}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`Erro ao excluir eixo: ${errorData.message || response.statusText}`);
            }
            await buscarEixosAPI(); // Atualiza a lista de eixos após excluir
        } catch (error) {
            console.error('Falha ao excluir eixo via API:', error);
            alert(`Erro ao excluir eixo: ${error.message}`);
        }
    }

    // Função para buscar IDs de usuários por nome
    async function buscarIdsUsuariosPorNomes(nomes) {
        if (!nomes) return [];
        
        // Converter para array se for uma string
        if (typeof nomes === 'string') {
            nomes = [nomes];
        } else if (!Array.isArray(nomes)) {
            return [];
        }
        
        // Filtrar valores nulos ou undefined
        nomes = nomes.filter(n => n);
        if (nomes.length === 0) return [];
        
        // Se já for um ID, manter
        const idsValidos = nomes.filter(n => {
            if (typeof n === 'string') {
                return n.match(/^[0-9a-fA-F]{24}$/);
            }
            return false;
        });
        
        // Obter apenas nomes (strings que não são IDs)
        const apenasNomes = nomes.filter(n => {
            if (typeof n === 'string') {
                return !n.match(/^[0-9a-fA-F]{24}$/);
            } else if (typeof n === 'object' && n !== null) {
                // Se for objeto, extrair o nome
                return true;
            }
            return false;
        }).map(n => {
            if (typeof n === 'object' && n !== null) {
                return n.nome || n.name || '';
            }
            return n;
        }).filter(n => n); // Remover strings vazias

        // Se não tiver nomes para buscar, retornar apenas os IDs válidos
        if (apenasNomes.length === 0) {
            return idsValidos;
        }
        
        // Remover duplicatas dos nomes
        const nomesUnicos = [...new Set(apenasNomes)];
        console.log('Buscando IDs para os nomes:', nomesUnicos);
        
        try {
            // Primeiro, tentar obter o usuário atual (caso esteja na lista)
            const usuarioAtual = obterUsuarioAtual();
            const idsRecuperados = [...idsValidos]; // Começar com os IDs já válidos
            
            if (usuarioAtual && usuarioAtual.id && usuarioAtual.nome) {
                if (apenasNomes.includes(usuarioAtual.nome)) {
                    idsRecuperados.push(usuarioAtual.id);
                    console.log(`Convertido nome do usuário atual "${usuarioAtual.nome}" para ID: ${usuarioAtual.id}`);
                }
            }
            
            // Em seguida, tentar usar a API para buscar outros usuários
            const token = getAuthToken();
            if (!token) {
                console.warn('Sem token para buscar IDs de usuários, usando apenas IDs já conhecidos');
                return idsRecuperados;
            }
            
            try {
                // Tentar o endpoint específico para buscar usuários por nome
                console.log('Tentando endpoint específico para buscar usuários por nome');
                const queryString = nomesUnicos.map(nome => `nome=${encodeURIComponent(nome)}`).join('&');
                const response = await fetch(`${API_BASE_URL}/api/usuarios/por-nome?${queryString}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const usuarios = await response.json();
                    console.log('Usuários encontrados pelo endpoint específico:', usuarios);
                    
                    if (Array.isArray(usuarios) && usuarios.length > 0) {
                        usuarios.forEach(u => {
                            if (u && u._id) {
                                idsRecuperados.push(u._id);
                            }
                        });
                    }
                    
                    return [...new Set(idsRecuperados)]; // Remover duplicatas
                }
            } catch (error) {
                console.warn('Erro ao usar endpoint específico:', error);
                // Continuar para próxima tentativa
            }
            
            // Tentar buscar todos os usuários como fallback
            console.log('Tentando buscar todos os usuários');
            try {
                const allResponse = await fetch(`${API_BASE_URL}/api/usuarios`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (allResponse.ok) {
                    const todosUsuariosAPI = await allResponse.json();
                    console.log('Todos os usuários obtidos:', todosUsuariosAPI);
                    
                    // Atualizar cache
                    todosUsuarios = todosUsuariosAPI;
                    
                    // Filtrar usuários pelos nomes
                    nomesUnicos.forEach(nome => {
                        const usuarioEncontrado = todosUsuariosAPI.find(u => 
                            (u.nome && u.nome.toLowerCase() === nome.toLowerCase()) ||
                            (u.name && u.name.toLowerCase() === nome.toLowerCase()) ||
                            (u.email && u.email.toLowerCase() === nome.toLowerCase())
                        );
                        
                        if (usuarioEncontrado && usuarioEncontrado._id) {
                            idsRecuperados.push(usuarioEncontrado._id);
                            console.log(`Encontrado ID ${usuarioEncontrado._id} para o nome "${nome}"`);
                        }
                    });
                    
                    return [...new Set(idsRecuperados)]; // Remover duplicatas
                }
            } catch (error) {
                console.warn('Erro ao buscar todos os usuários:', error);
            }
            
            // Se chegou aqui, retornar os IDs que conseguimos recuperar
            return idsRecuperados;
        } catch (error) {
            console.error('Erro geral ao buscar IDs de usuários:', error);
            return idsValidos; // Retornar os IDs válidos que já tínhamos
        }
    }

    // --- Edição de Ação ---
    async function editarAcao(acaoId) {
        console.log('Editando ação ID:', acaoId);
        editMode = true;
        editAcaoId = acaoId;
        
        try {
            const acao = await buscarAcaoPorId(acaoId);
            if (!acao) {
                console.error('Ação não encontrada para edição');
                alert('Ação não encontrada');
                return;
            }
            
            // Preencher o formulário com os dados da ação
            formNovaAcao.querySelector('input[name="titulo"]').value = acao.titulo || '';
            formNovaAcao.querySelector('textarea[name="descricao"]').value = acao.descricao || '';
            
            // Selecionar o status correto
            const statusSelect = formNovaAcao.querySelector('select[name="status"]');
            if (statusSelect) {
                for (let i = 0; i < statusSelect.options.length; i++) {
                    if (statusSelect.options[i].value === acao.status) {
                        statusSelect.selectedIndex = i;
                        break;
                    }
                }
            }
            
            // Selecionar a prioridade correta
            const prioridadeSelect = formNovaAcao.querySelector('select[name="prioridade"]');
            if (prioridadeSelect && acao.prioridade) {
                for (let i = 0; i < prioridadeSelect.options.length; i++) {
                    if (prioridadeSelect.options[i].value === acao.prioridade) {
                        prioridadeSelect.selectedIndex = i;
                        break;
                    }
                }
            }
            
            // Selecionar o eixo correto
            const eixoSelect = formNovaAcao.querySelector('select[name="eixo"]');
            if (eixoSelect && acao.eixo) {
                const eixoId = typeof acao.eixo === 'object' ? acao.eixo._id : acao.eixo;
                for (let i = 0; i < eixoSelect.options.length; i++) {
                    if (eixoSelect.options[i].value === eixoId) {
                        eixoSelect.selectedIndex = i;
                        break;
                    }
                }
            }
            
            // Selecionar os responsáveis corretos no select multiple
            if (responsaveisAcaoSelectMultiple && Array.isArray(acao.responsaveis)) {
                // A API pode retornar tanto objetos completos de usuário quanto apenas IDs
                // Precisamos extrair os nomes ou IDs para selecionar no dropdown
                const responsaveisNomes = acao.responsaveis.map(resp => {
                    if (typeof resp === 'object' && resp !== null) {
                        return resp.nome;
                    }
                    // Se for apenas o ID ou string, verificar se temos o nome mapeado
                    const usuario = todosUsuarios.find(u => u._id === resp || u.nome === resp);
                    return usuario ? usuario.nome : resp;
                });
                
                // Limpar seleções anteriores
                for (let i = 0; i < responsaveisAcaoSelectMultiple.options.length; i++) {
                    responsaveisAcaoSelectMultiple.options[i].selected = false;
                }
                
                // Selecionar os responsáveis
                for (let i = 0; i < responsaveisAcaoSelectMultiple.options.length; i++) {
                    const option = responsaveisAcaoSelectMultiple.options[i];
                    if (responsaveisNomes.includes(option.value)) {
                        option.selected = true;
                    }
                }
            }
            
            // Preencher o prazo (se existir)
            const prazoInput = formNovaAcao.querySelector('input[name="prazo"]');
            if (prazoInput && acao.prazo) {
                // Converter de ISO para o formato aceito pelo input date (YYYY-MM-DD)
                const data = new Date(acao.prazo);
                const dataFormatada = data.toISOString().split('T')[0];
                prazoInput.value = dataFormatada;
            } else if (prazoInput) {
                prazoInput.value = '';
            }
            
            // Atualizar título do modal e botão
            const tituloModal = modalNovaAcao.querySelector('.modal-header h2');
            if (tituloModal) tituloModal.textContent = 'Editar Ação';
            
            const btnSalvar = formNovaAcao.querySelector('button[type="submit"]');
            if (btnSalvar) btnSalvar.textContent = 'Atualizar Ação';
            
            // Abrir o modal
            modalNovaAcao.style.display = 'block';
        } catch (error) {
            console.error('Erro ao buscar dados para edição:', error);
            alert('Erro ao buscar dados da ação para edição');
        }
    }

    // --- Função para atualizar uma ação na API ---
    async function atualizarAcaoAPI(acaoId, dadosAcao) {
        if (!acaoId) {
            throw new Error('ID da ação é obrigatório para atualização');
        }
        const token = getAuthToken();
        if (!token) { 
            mostrarNotificacao('Você precisa estar autenticado para atualizar uma ação.', 'danger');
            return; 
        }
        fecharModalNovaAcao();
        const linhaAcao = document.querySelector(`tr[data-id="${acaoId}"]`);
        if (linhaAcao) {
            linhaAcao.style.opacity = '0.7';
            linhaAcao.style.backgroundColor = '#f0f8ff';
        }
        try {
            // Garante que só IDs válidos sejam enviados
            if (Array.isArray(dadosAcao.responsaveis)) {
                dadosAcao.responsaveis = dadosAcao.responsaveis.filter(id => typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/));
            }
            const response = await fetch(`${ACOES_API_URL}/${acaoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dadosAcao)
            });
            if (!response.ok) {
                if (linhaAcao) {
                    linhaAcao.style.opacity = '1';
                    linhaAcao.style.backgroundColor = '';
                }
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                mostrarNotificacao(`Erro ao atualizar ação: ${response.status} ${errorData.message || response.statusText}`, 'danger');
                return;
            }
            cache.remove('acoes_kanban');
            await buscarAcoesAPI();
            // Atualiza o cache imediatamente após atualizar
            cache.set('acoes_kanban', todasAcoes, 2);
            if (typeof atualizarGraficos === 'function') atualizarGraficos();
            const linhaAtualizada = document.querySelector(`tr[data-id="${acaoId}"]`);
            if (linhaAtualizada) {
                linhaAtualizada.style.backgroundColor = '#e6ffe6';
                linhaAtualizada.style.transition = 'background-color 1s';
                setTimeout(() => {
                    linhaAtualizada.style.backgroundColor = '';
                }, 2000);
            }
            mostrarNotificacao('Ação atualizada com sucesso!', 'success');
        } catch (error) {
            mostrarNotificacao(`Erro ao atualizar ação: ${error.message}`, 'danger');
            if (linhaAcao) {
                linhaAcao.style.opacity = '1';
                linhaAcao.style.backgroundColor = '';
            }
        }
    }

    // --- Utilitário para exibir notificações ---
    function mostrarNotificacao(mensagem, tipo = 'info', duracao = 5000) {
        // Verificar se já existe o container de notificações
        let notificacoesContainer = document.getElementById('notificacoes-container');
        
        if (!notificacoesContainer) {
            // Criar container se não existir
            notificacoesContainer = document.createElement('div');
            notificacoesContainer.id = 'notificacoes-container';
            notificacoesContainer.style.position = 'fixed';
            notificacoesContainer.style.top = '20px';
            notificacoesContainer.style.right = '20px';
            notificacoesContainer.style.zIndex = '9999';
            notificacoesContainer.style.maxWidth = '350px';
            document.body.appendChild(notificacoesContainer);
        }
        
        // Criar elemento de notificação
        const notificacao = document.createElement('div');
        notificacao.className = `alert alert-${tipo} alert-dismissible fade show`;
        notificacao.role = 'alert';
        notificacao.style.marginBottom = '10px';
        notificacao.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
        
        // Adicionar conteúdo
        notificacao.innerHTML = `
            ${mensagem}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
        `;
        
        // Adicionar ao container
        notificacoesContainer.appendChild(notificacao);
        
        // Auto-remover após a duração especificada
        setTimeout(() => {
            if (notificacao && notificacao.parentNode) {
                // Adicionar classe para animar saída
                notificacao.classList.remove('show');
                
                // Remover após animação
                setTimeout(() => {
                    if (notificacao && notificacao.parentNode) {
                        notificacao.parentNode.removeChild(notificacao);
                    }
                }, 300); // Tempo da animação de fade
            }
        }, duracao);
        
        // Adicionar evento de clique para fechar
        const btnClose = notificacao.querySelector('.btn-close');
        if (btnClose) {
            btnClose.addEventListener('click', () => {
                if (notificacao && notificacao.parentNode) {
                    notificacao.parentNode.removeChild(notificacao);
                }
            });
        }
        
        return notificacao;
    }

    // --- Buscar ação por ID ---
    async function buscarAcaoPorId(acaoId) {
        if (!acaoId) {
            console.error('ID da ação é obrigatório');
            return null;
        }
        
        // Primeiro verificar se a ação está no cache
        if (Array.isArray(todasAcoes) && todasAcoes.length > 0) {
            const acaoCache = todasAcoes.find(a => 
                (a._id === acaoId || a.id === acaoId)
            );
            
            if (acaoCache) {
                console.log('Ação encontrada em cache:', acaoCache);
                return acaoCache;
            }
        }
        
        // Se não estiver em cache, buscar da API
        try {
            const token = getAuthToken();
            if (!token) {
                console.error('Token não encontrado ao buscar ação');
                return null;
            }
            
            console.log(`Buscando ação ${acaoId} da API...`);
            const response = await fetch(`${ACOES_API_URL}/${acaoId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                console.error(`Erro ao buscar ação: ${response.status} ${response.statusText}`);
                return null;
            }
            
            const acao = await response.json();
            console.log('Ação obtida da API:', acao);
            return acao;
        } catch (error) {
            console.error('Erro ao buscar ação por ID:', error);
            return null;
        }
    }

    // --- Funções do Checklist (Modal Nova Ação) ---
    function criarItemChecklistElementoNovaAcao(item = { id: `temp-${proximoChecklistItemId++}`, texto: '', concluido: false }, ehEdicao = false, posicao = null, total = null) {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('checklist-item');
        // Gera um id único para cada item
        const uniqueId = item.id || `temp-${proximoChecklistItemId++}`;
        itemDiv.dataset.itemId = uniqueId;
        // Cria um id único para o checkbox e para o input de texto
        const checkboxId = `checklist_item_checkbox_${uniqueId}`;
        const textInputId = `checklist_item_text_${uniqueId}`;
        
        // Criar o label que envolve o checkbox e o input de texto
        const label = document.createElement('label');
        label.setAttribute('for', checkboxId);
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.classList.add('checklist-item-checkbox');
        checkbox.checked = item.concluido;
        checkbox.id = checkboxId;
        if (ehEdicao) checkbox.disabled = true;
        
        // Usar textarea em vez de input para permitir múltiplas linhas
        const textInput = document.createElement('textarea');
        textInput.classList.add('checklist-item-text', 'form-control');
        textInput.placeholder = 'Descrever item';
        textInput.value = item.texto;
        textInput.id = textInputId;
        
        // Ajustar altura do textarea automaticamente conforme o conteúdo
        textInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
        
        label.appendChild(checkbox);
        label.appendChild(textInput);
        
        // Criar div para os botões de ação
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('checklist-item-actions');
        
        // Primeiro adicionar o botão de remover (excluir)
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.classList.add('btn-icon', 'btn-remover-item-checklist');
        removeButton.innerHTML = '<i class="fas fa-trash"></i>';
        removeButton.title = "Remover item";
        removeButton.addEventListener('click', () => {
            itemDiv.remove();
            atualizarSetas(); // Atualizar as setas após remover um item
        });
        actionsDiv.appendChild(removeButton);
        
        // Criar contêiner específico para as setas
        const setasContainer = document.createElement('div');
        setasContainer.classList.add('setas-container');
        
        // Adicionar botões de seta conforme a posição
        if (posicao !== null && total !== null) {
            // Se não for o primeiro item, adicionar botão para mover para cima
            if (posicao > 0) {
                const moveUpBtn = document.createElement('button');
                moveUpBtn.type = 'button';
                moveUpBtn.classList.add('btn-move-item-up');
                moveUpBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
                moveUpBtn.title = "Mover para cima";
                moveUpBtn.addEventListener('click', () => {
                    moverItemChecklistParaCima(itemDiv);
                });
                setasContainer.appendChild(moveUpBtn);
            }
            
            // Se não for o último item, adicionar botão para mover para baixo
            if (posicao < total - 1) {
                const moveDownBtn = document.createElement('button');
                moveDownBtn.type = 'button';
                moveDownBtn.classList.add('btn-move-item-down');
                moveDownBtn.innerHTML = '<i class="fas fa-arrow-down"></i>';
                moveDownBtn.title = "Mover para baixo";
                moveDownBtn.addEventListener('click', () => {
                    moverItemChecklistParaBaixo(itemDiv);
                });
                setasContainer.appendChild(moveDownBtn);
            }
        }
        
        // Adicionar o contêiner de setas aos botões de ação
        actionsDiv.appendChild(setasContainer);
        
        itemDiv.appendChild(label);
        itemDiv.appendChild(actionsDiv);
        
        // Ajustar altura inicial do textarea se já tiver conteúdo
        setTimeout(() => {
            if (item.texto) {
                textInput.style.height = 'auto';
                textInput.style.height = (textInput.scrollHeight) + 'px';
            }
        }, 0);
        
        return itemDiv;
    }
    
    // Função para mover um item do checklist para cima
    function moverItemChecklistParaCima(itemElement) {
        const prevItem = itemElement.previousElementSibling;
        if (prevItem) {
            itemElement.parentNode.insertBefore(itemElement, prevItem);
            atualizarSetas(); // Atualizar as setas após a movimentação
        }
    }
    
    // Função para mover um item do checklist para baixo
    function moverItemChecklistParaBaixo(itemElement) {
        const nextItem = itemElement.nextElementSibling;
        if (nextItem) {
            itemElement.parentNode.insertBefore(nextItem, itemElement);
            atualizarSetas(); // Atualizar as setas após a movimentação
        }
    }
    
    // Função para atualizar os botões de seta em todos os itens
    function atualizarSetas() {
        if (!checklistItensContainerNovaAcao) return;
        
        const items = checklistItensContainerNovaAcao.querySelectorAll('.checklist-item');
        const total = items.length;
        
        items.forEach((item, index) => {
            const actions = item.querySelector('.checklist-item-actions');
            if (!actions) return;
            
            // Remover o contêiner de setas existente, se houver
            let setasContainer = actions.querySelector('.setas-container');
            if (setasContainer) {
                setasContainer.remove();
            }
            
            // Criar novo contêiner de setas
            setasContainer = document.createElement('div');
            setasContainer.classList.add('setas-container');
            
            // Adicionar novo botão para cima se não for o primeiro item
            if (index > 0) {
                const moveUpBtn = document.createElement('button');
                moveUpBtn.type = 'button';
                moveUpBtn.classList.add('btn-move-item-up');
                moveUpBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
                moveUpBtn.title = "Mover para cima";
                moveUpBtn.addEventListener('click', () => {
                    moverItemChecklistParaCima(item);
                });
                setasContainer.appendChild(moveUpBtn);
            }
            
            // Adicionar novo botão para baixo se não for o último item
            if (index < total - 1) {
                const moveDownBtn = document.createElement('button');
                moveDownBtn.type = 'button';
                moveDownBtn.classList.add('btn-move-item-down');
                moveDownBtn.innerHTML = '<i class="fas fa-arrow-down"></i>';
                moveDownBtn.title = "Mover para baixo";
                moveDownBtn.addEventListener('click', () => {
                    moverItemChecklistParaBaixo(item);
                });
                setasContainer.appendChild(moveDownBtn);
            }
            
            // Adicionar o contêiner de setas aos botões de ação
            actions.appendChild(setasContainer);
        });
    }

    if (adicionarItemChecklistNovaAcaoBtn) {
        adicionarItemChecklistNovaAcaoBtn.addEventListener('click', () => {
            const items = checklistItensContainerNovaAcao.querySelectorAll('.checklist-item');
            const total = items.length;
            const novoItemEl = criarItemChecklistElementoNovaAcao(
                { id: `temp-${proximoChecklistItemId++}`, texto: '', concluido: false },
                false,
                total, // Posição será o total atual (último índice + 1)
                total + 1 // O novo total será o total atual + 1
            );
            checklistItensContainerNovaAcao.appendChild(novoItemEl);
            
            // Atualizar as setas após adicionar um novo item
            atualizarSetas();
            
            // Dar foco ao novo input de texto
            const novoInputTexto = novoItemEl.querySelector('.checklist-item-text');
            if (novoInputTexto) {
                novoInputTexto.focus();
            }
        });
    }
    
    function limparFormularioChecklistNovaAcao() {
        if(checklistTituloInputNovaAcao) checklistTituloInputNovaAcao.value = '';
        if(checklistItensContainerNovaAcao) checklistItensContainerNovaAcao.innerHTML = '';
        proximoChecklistItemId = 1; // Resetar contador de ID temporário
    }

    function obterDadosChecklistNovaAcao() {
        if (!checklistTituloInputNovaAcao || !checklistItensContainerNovaAcao) {
            return null; // Retorna null se os elementos do checklist não estiverem presentes
        }

        const titulo = checklistTituloInputNovaAcao.value.trim();
        const itens = [];
        const itemElements = checklistItensContainerNovaAcao.querySelectorAll('.checklist-item');
        
        itemElements.forEach(itemEl => {
            const textoInput = itemEl.querySelector('.checklist-item-text');
            const checkbox = itemEl.querySelector('.checklist-item-checkbox');
            // Garante que cada item tenha um id único
            let itemId = itemEl.dataset.itemId || `novo-${proximoChecklistItemId++}`;
            if (!itemId) {
                itemId = `novo-${proximoChecklistItemId++}`;
            }
            // Verifica se é um textarea ou input e obtém o valor adequadamente
            const textoValue = textoInput ? textoInput.value.trim() : '';
            
            if (textoValue !== '') {
                itens.push({
                    id: itemId,
                    texto: textoValue,
                    concluido: checkbox ? checkbox.checked : false
                });
            }
        });

        // Só retorna o objeto checklist se houver um título ou pelo menos um item
        if (titulo || itens.length > 0) {
            return {
                titulo: titulo || 'Checklist', // Título padrão se vazio mas com itens
                itens: itens
            };
        }
        return null; // Retorna null se o checklist estiver vazio
    }
    
    function popularChecklistNovaAcao(checklist) {
        limparFormularioChecklistNovaAcao();
        if (!checklist || !checklistItensContainerNovaAcao) return;

        if (checklistTituloInputNovaAcao && checklist.titulo) {
            checklistTituloInputNovaAcao.value = checklist.titulo;
        }

        if (checklist.itens && Array.isArray(checklist.itens)) {
            // Obter o total de itens para passar para a função de criação
            const total = checklist.itens.length;
            
            checklist.itens.forEach((item, index) => {
                // Garante que cada item tenha um id único
                if (!item.id) {
                    item.id = `temp-${proximoChecklistItemId++}`;
                }
                // Ao popular para edição, o 'concluido' vem do dado salvo, mas o checkbox ainda é visual.
                // A interação de marcar/desmarcar é só no modal de visualização.
                const itemEl = criarItemChecklistElementoNovaAcao(
                    item, 
                    true, 
                    index, // Posição atual do item
                    total // Total de itens
                ); 
                checklistItensContainerNovaAcao.appendChild(itemEl);
            });
            
            // Atualizar as setas após popular todos os itens
            atualizarSetas();
        }
    }

    // --- Lógica para Modal Ver Ação ---
    function fecharModalVerAcao() {
        if (modalVerAcao) modalVerAcao.style.display = 'none';
        // Limpar conteúdo dinâmico se necessário, especialmente o checklist
        if (checklistItensContainerVerAcao) checklistItensContainerVerAcao.innerHTML = '';
    }

    if (closeModalVerAcaoBtn) {
        closeModalVerAcaoBtn.addEventListener('click', fecharModalVerAcao);
    }
    if (fecharModalVerAcaoBtn) {
        fecharModalVerAcaoBtn.addEventListener('click', fecharModalVerAcao);
    }
    
    // Event listener para fechar modais com a tecla Escape
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (modalNovaAcao && modalNovaAcao.style.display === 'block') {
                fecharModalNovaAcao();
            }
            if (modalAdicionarEditarEixo && modalAdicionarEditarEixo.style.display === 'block') {
                fecharModalEixo();
            }
            if (modalVerAcao && modalVerAcao.style.display === 'block') {
                fecharModalVerAcao();
            }
        }
    });

    // Event listener para fechar modais ao clicar fora deles
    window.addEventListener('click', (event) => {
        if (event.target === modalNovaAcao) {
            fecharModalNovaAcao();
        }
        if (event.target === modalAdicionarEditarEixo) {
            fecharModalEixo();
        }
        if (event.target === modalVerAcao) {
            fecharModalVerAcao();
        }
    });
    
    // Inicialização
    inicializarKanban();

    // --- Funções do Modal de Visualização de Ação e Checklist ---
    async function abrirModalVerAcaoComDetalhes(acaoId) {
        const acao = todasAcoes.find(a => (a._id || a.id) === acaoId);
        if (!acao) {
            mostrarNotificacao('Ação não encontrada.', 'error');
            return;
        }

        if (!modalVerAcao) return; // Garantir que o modal exista

        // Popular dados básicos da ação
        verAcaoModalTitle.textContent = `Detalhes: ${acao.titulo}`;
        verAcaoTitulo.textContent = acao.titulo || '-';
        verAcaoDescricao.textContent = acao.descricao || '-';
        verAcaoStatus.textContent = acao.status || '-';
        verAcaoPrioridade.textContent = acao.prioridade || '-';
        verAcaoPrazo.textContent = acao.prazo ? new Date(acao.prazo).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-';

        // Popular Eixo
        let nomeEixoText = '-';
        if (acao.eixo) {
            if (typeof acao.eixo === 'object' && acao.eixo !== null && acao.eixo.nome) {
                nomeEixoText = acao.eixo.nome;
            } else {
                const eixoObj = todosEixos.find(e => (e._id || e.id)?.toString() === acao.eixo.toString());
                if (eixoObj) nomeEixoText = eixoObj.nome;
            }
        }
        verAcaoEixo.textContent = nomeEixoText;

        // Popular Responsáveis
        let responsaveisText = '-';
        if (acao.responsaveis && acao.responsaveis.length > 0) {
            if (Array.isArray(acao.responsaveis)) {
                responsaveisText = acao.responsaveis.map(resp => {
                    let responsavelId, responsavelNome;
                    if (typeof resp === 'object' && resp !== null) {
                        responsavelId = resp._id || resp.id;
                        responsavelNome = undefined;
                    } else {
                        responsavelId = resp;
                        responsavelNome = undefined;
                    }
                    // Buscar nome completo na lista de usuários, se possível
                    const usuario = todosUsuarios.find(u => (u._id || u.id)?.toString() === responsavelId?.toString() || u.email === responsavelId || u.nome === responsavelId || u.name === responsavelId);
                    responsavelNome = (usuario && (usuario.nome || usuario.name))
                        || (typeof resp === 'object' && (resp.name || resp.nome))
                        || (typeof resp === 'object' && resp.email ? resp.email.split('@')[0] : undefined)
                        || (typeof resp === 'string' && resp.includes('@') ? resp.split('@')[0] : resp)
                        || 'Usuário';
                    return responsavelNome;
                }).join(', ');
            } else if (typeof acao.responsaveis === 'string') {
                const responsavelId = acao.responsaveis.trim();
                const usuario = todosUsuarios.find(u => (u._id || u.id)?.toString() === responsavelId || u.email === responsavelId || u.nome === responsavelId || u.name === responsavelId);
                let responsavelNome = (usuario && (usuario.nome || usuario.name))
                    || (responsavelId.includes('@') ? responsavelId.split('@')[0] : responsavelId);
                responsaveisText = responsavelNome;
            }
        }
        verAcaoResponsaveis.textContent = responsaveisText;

        // Popular Checklist
        checklistItensContainerVerAcao.innerHTML = ''; // Limpar itens anteriores
        if (acao.checklist && acao.checklist.itens) {
            verAcaoChecklistTitulo.textContent = acao.checklist.titulo || 'Checklist';
            if (acao.checklist.itens.length > 0) {
                renderizarChecklistParaVisualizacao(acao.checklist.itens, checklistItensContainerVerAcao, acaoId);
            } else {
                checklistItensContainerVerAcao.innerHTML = '<p><em>Nenhum item no checklist.</em></p>';
            }
            verAcaoChecklistTitulo.style.display = 'block';
            checklistItensContainerVerAcao.style.display = 'block';
        } else {
            verAcaoChecklistTitulo.style.display = 'none';
            checklistItensContainerVerAcao.innerHTML = '';
            checklistItensContainerVerAcao.style.display = 'none';
        }
        
        modalVerAcao.style.display = 'block';
    }

    function renderizarChecklistParaVisualizacao(itensChecklist, containerEl, acaoId) {
        itensChecklist.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('checklist-item');
            itemDiv.dataset.itemId = item.id;

            // Cria um id único para o checkbox
            const checkboxId = `checklist_view_checkbox_${acaoId}_${item.id}`;

            // Cria o label para o checkbox e o texto
            const label = document.createElement('label');
            label.setAttribute('for', checkboxId);

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.classList.add('checklist-item-checkbox');
            checkbox.checked = item.concluido;
            checkbox.id = checkboxId;
            checkbox.name = `checklist_view_checkbox_${acaoId}_${item.id}`;
            checkbox.dataset.itemId = item.id; // Adicionar ID do item ao checkbox para referência

            checkbox.addEventListener('change', async (e) => {
                const itemId = e.target.dataset.itemId;
                const novoEstado = e.target.checked;
                await atualizarEstadoItemChecklist(acaoId, itemId, novoEstado);
            });

            // Usar div em vez de span para melhor controle de texto longo
            const textDiv = document.createElement('div');
            textDiv.classList.add('checklist-item-text');
            
            // Preservar quebras de linha e espaços
            textDiv.style.whiteSpace = 'pre-wrap';
            textDiv.style.wordBreak = 'break-word';
            textDiv.style.maxHeight = '150px'; // Altura máxima
            textDiv.style.overflowY = 'auto'; // Barra de rolagem quando necessário
            textDiv.textContent = item.texto;
            
            if (item.concluido) {
                textDiv.style.textDecoration = 'line-through';
                textDiv.style.color = '#777';
            }

            label.appendChild(checkbox);
            label.appendChild(textDiv);
            itemDiv.appendChild(label);
            containerEl.appendChild(itemDiv);
        });
    }

    async function atualizarEstadoItemChecklist(acaoId, itemId, novoEstado) {
        const acao = todasAcoes.find(a => (a._id || a.id) === acaoId);
        if (!acao || !acao.checklist || !acao.checklist.itens) {
            console.error('Ação ou checklist não encontrado para atualizar item.');
            mostrarNotificacao('Erro ao atualizar item do checklist.', 'error');
            return;
        }

        const itemIndex = acao.checklist.itens.findIndex(i => i.id === itemId);
        if (itemIndex === -1) {
            console.error('Item do checklist não encontrado.');
            mostrarNotificacao('Erro: item do checklist não encontrado.', 'error');
            return;
        }

        acao.checklist.itens[itemIndex].concluido = novoEstado;

        try {
            // Prepara apenas os dados do checklist para enviar
            const dadosParaAtualizar = { 
                checklist: acao.checklist 
            };
            
            // Tentativa 1: PUT padrão
            const token = getAuthToken();
            console.log(`Tentativa 1: PUT para ${ACOES_API_URL}/${acaoId} (atualizar checklist)`);
            let response = await fetch(`${ACOES_API_URL}/${acaoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dadosParaAtualizar)
            });
            
            // Se falhar, tentar com endpoint específico para checklist
            if (!response.ok) {
                console.log(`Tentativa 1 falhou. Tentando endpoint específico para checklist...`);
                
                console.log(`Tentativa 2: PATCH para ${ACOES_API_URL}/${acaoId}/checklist`);
                response = await fetch(`${ACOES_API_URL}/${acaoId}/checklist`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ checklist: acao.checklist })
                });
                
                // Se ainda falhar, tentar com endpoint de administrador
                if (!response.ok) {
                    console.log(`Tentativa 2 falhou. Tentando endpoint de administrador...`);
                    
                    console.log(`Tentativa 3: PUT para ${API_BASE_URL}/api/admin/kanban/acoes/${acaoId}`);
                    response = await fetch(`${API_BASE_URL}/api/admin/kanban/acoes/${acaoId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(dadosParaAtualizar)
                    });
                }
            }
            
            if (!response.ok) {
                throw new Error(`Falha em todas as tentativas de atualização do checklist. Última resposta: ${response.status} ${response.statusText}`);
            }
            
            mostrarNotificacao('Checklist atualizado com sucesso!', 'success');

            // Atualizar a UI do modal
            const itemTextSpan = checklistItensContainerVerAcao.querySelector(`.checklist-item[data-item-id="${itemId}"] .checklist-item-text`);
            if (itemTextSpan) {
                itemTextSpan.style.textDecoration = novoEstado ? 'line-through' : 'none';
                itemTextSpan.style.color = novoEstado ? '#777' : 'inherit';
            }
            
            // Atualizar contadores e Kanban board
            atualizarContadores(todasAcoes);
            renderizarKanbanCards(todasAcoes);
            
            // Atualizar os gráficos após modificar o checklist
            if (typeof atualizarGraficos === 'function') {
                atualizarGraficos();
            }

        } catch (error) {
            console.error('Falha ao atualizar o checklist na API:', error);
            mostrarNotificacao('Falha ao salvar atualização do checklist.', 'error');
            
            // Reverter a mudança na UI
            acao.checklist.itens[itemIndex].concluido = !novoEstado; // Reverte
            const checkbox = checklistItensContainerVerAcao.querySelector(`.checklist-item[data-item-id="${itemId}"] .checklist-item-checkbox`);
            if (checkbox) checkbox.checked = !novoEstado;
            const itemTextSpan = checklistItensContainerVerAcao.querySelector(`.checklist-item[data-item-id="${itemId}"] .checklist-item-text`);
            if (itemTextSpan) {
                 itemTextSpan.style.textDecoration = !novoEstado ? 'line-through' : 'none';
                 itemTextSpan.style.color = !novoEstado ? '#777' : 'inherit';
            }
        }
    }

    // Garantir que showConfirmDialog está disponível no escopo global
    function getShowConfirmDialog() {
        if (typeof showConfirmDialog !== 'undefined') return showConfirmDialog;
        if (typeof window !== 'undefined' && typeof window.showConfirmDialog !== 'undefined') {
            return window.showConfirmDialog;
        }
        return null;
    }

    // Função para buscar todos os usuários da API
    async function buscarUsuariosAPI() {
        const token = getAuthToken();
        if (!token) return [];
        const cacheKey = 'usuarios_kanban';
        const cacheUsuarios = cache.get(cacheKey);
        if (cacheUsuarios) return cacheUsuarios;
        try {
            const response = await fetch('https://gasf-app.onrender.com/api/usuarios', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return [];
            const usuarios = await response.json();
            cache.set(cacheKey, usuarios, 2);
            return usuarios;
        } catch {
            return [];
        }
    }

    // === MELHORIA: Sincronização de cache entre abas ===
    window.addEventListener('storage', function(event) {
        if (event.key === 'acoes_kanban') {
            // Atualiza a lista de ações e re-renderiza a interface
            const novasAcoes = cache.get('acoes_kanban') || [];
            todasAcoes = novasAcoes;
            popularFiltroResponsaveisSelect();
            aplicarFiltrosERenderizar();
        }
    });
}); 
