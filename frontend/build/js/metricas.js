let usuariosMapMetricas = new Map();

// === INÍCIO: Gráficos de Métricas ===
let graficosMetricas = {
    acoes: null,
    eixos: null,
    prioridades: null
};

function destruirGraficosMetricas() {
    Object.values(graficosMetricas).forEach(g => { if (g) g.destroy && g.destroy(); });
    graficosMetricas = { acoes: null, eixos: null, prioridades: null };
}

function renderizarGraficosMetricas(acoes, eixos) {
    console.log('Eixos recebidos:', eixos);
    console.log('Ações recebidas:', acoes);
    destruirGraficosMetricas();
    // Progresso das ações (agora como gráfico de pizza com legenda à esquerda)
    const contadores = contarAcoesPorStatus(acoes);
    const totalAcoes = contadores.aFazer + contadores.emAndamento + contadores.concluido;
    const ctxAcoes = document.getElementById('graficoMetricasAcoes').getContext('2d');
    graficosMetricas.acoes = new Chart(ctxAcoes, {
        type: 'pie',
        data: {
            labels: ['A Fazer', 'Em Andamento', 'Concluído'],
            datasets: [{
                data: [contadores.aFazer, contadores.emAndamento, contadores.concluido],
                backgroundColor: [CORES.vermelho, CORES.amarelo, CORES.verde],
                borderColor: ['white', 'white', 'white'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'left',
                    labels: {
                        boxWidth: 18,
                        maxWidth: 300,
                        whiteSpace: 'normal',
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map(function(label, i) {
                                    const value = data.datasets[0].data[i];
                                    const texto = truncarTexto(label, 15);
                                    return {
                                        text: `${value} ${texto}`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        strokeStyle: data.datasets[0].borderColor ? data.datasets[0].borderColor[i] : '#fff',
                                        lineWidth: 2,
                                        hidden: isNaN(data.datasets[0].data[i]) || chart.getDataVisibility(i) === false,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                }
            }
        }
    });
    // Ações por eixo (agora como gráfico de pizza com legenda à esquerda e cores distintas)
    const eixosContagem = contarAcoesPorEixo(acoes, eixos);
    const ctxEixos = document.getElementById('graficoMetricasEixos').getContext('2d');
    // Ajuste extra: limitar largura máxima do canvas para 400px quando só houver um eixo
    const canvasEixos = document.getElementById('graficoMetricasEixos');
    if (eixosContagem.length === 1) {
        canvasEixos.style.maxWidth = '400px';
        canvasEixos.parentElement.style.display = 'flex';
        canvasEixos.parentElement.style.justifyContent = 'center';
    } else {
        canvasEixos.style.maxWidth = '';
        canvasEixos.parentElement.style.display = '';
        canvasEixos.parentElement.style.justifyContent = '';
    }
    graficosMetricas.eixos = new Chart(ctxEixos, {
        type: 'pie',
        data: {
            labels: eixosContagem.map(e => e.nome),
            datasets: [{
                data: eixosContagem.map(e => e.totalAcoes),
                backgroundColor: eixosContagem.map((_, i) => CORES_EIXOS[i % CORES_EIXOS.length]),
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'left',
                    labels: {
                        boxWidth: 18,
                        maxWidth: 300,
                        whiteSpace: 'normal',
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map(function(label, i) {
                                    const value = data.datasets[0].data[i];
                                    const texto = truncarTexto(label, 15);
                                    return {
                                        text: `${value} ${texto}`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        strokeStyle: '#fff',
                                        lineWidth: 2,
                                        hidden: isNaN(data.datasets[0].data[i]) || chart.getDataVisibility(i) === false,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                }
            }
        }
    });
    // Distribuição por prioridade (pie chart, cores exclusivas)
    const prioridades = contarAcoesPorPrioridade(acoes);
    const ctxPrioridades = document.getElementById('graficoMetricasPrioridades').getContext('2d');
    graficosMetricas.prioridades = new Chart(ctxPrioridades, {
        type: 'pie',
        data: {
            labels: ['Alta', 'Média', 'Baixa'],
            datasets: [{
                data: [prioridades.alta, prioridades.media, prioridades.baixa],
                backgroundColor: CORES_PRIORIDADES,
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'left',
                    labels: {
                        boxWidth: 18,
                        maxWidth: 300,
                        whiteSpace: 'normal',
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map(function(label, i) {
                                    const value = data.datasets[0].data[i];
                                    const texto = truncarTexto(label, 15);
                                    return {
                                        text: `${value} ${texto}`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        strokeStyle: '#fff',
                                        lineWidth: 2,
                                        hidden: isNaN(data.datasets[0].data[i]) || chart.getDataVisibility(i) === false,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                }
            }
        }
    });
}
// === FIM: Gráficos de Métricas ===

// === INÍCIO: Dependências e Funções Utilitárias para Gráficos ===
// Certifique-se de que Chart.js está disponível globalmente (já está no dashboard)
// Copiando as constantes e funções necessárias do graficos.js
const CORES = {
    azul: '#0057b7', // Azul escuro vibrante
    azulClaro: '#3399ff',
    verde: '#008000', // Verde escuro vibrante
    verdeClaro: '#33cc33',
    vermelho: '#d90429', // Vermelho escuro vibrante
    vermelhoClaro: '#ff595e',
    amarelo: '#ffb300', // Amarelo forte
    amareloClaro: '#ffe066',
    roxo: '#6f42c1', // Roxo escuro vibrante
    roxoClaro: '#b983ff',
    laranja: '#ff8800', // Laranja escuro vibrante
    laranjaClaro: '#ffb347'
};

// Paleta de cores vibrantes e distintas para múltiplos eixos
const CORES_EIXOS = [
    '#0057b7', // Azul escuro
    '#d90429', // Vermelho escuro
    '#008000', // Verde escuro
    '#ffb300', // Amarelo forte
    '#6f42c1', // Roxo escuro
    '#ff8800', // Laranja escuro
    '#b983ff', // Roxo claro
    '#3399ff', // Azul claro
    '#ff595e', // Vermelho claro
    '#33cc33', // Verde claro
    '#ffe066', // Amarelo claro
    '#ffb347', // Laranja claro
    '#22223b', // Azul quase preto
    '#3a86ff', // Azul vibrante
    '#8338ec', // Roxo vibrante
    '#ff006e', // Rosa vibrante
    '#fb5607', // Laranja vibrante
    '#ffbe0b', // Amarelo vibrante
    '#43aa8b', // Verde vibrante
    '#f15bb5'  // Rosa claro
];

// Paleta exclusiva para Distribuição por Prioridade
const CORES_PRIORIDADES = ['#6f42c1', '#ff8800', '#0057b7']; // Roxo, Laranja, Azul

function contarAcoesPorStatus(acoes) {
    const contadores = { aFazer: 0, emAndamento: 0, concluido: 0 };
    acoes.forEach(acao => {
        if (!acao || typeof acao !== 'object') return;
        const status = acao.status;
        if (!status) return;
        if (status === 'A Fazer') contadores.aFazer++;
        else if (status === 'Em Andamento') contadores.emAndamento++;
        else if (status === 'Concluído') contadores.concluido++;
    });
    return contadores;
}
function contarAcoesPorEixo(acoes, eixos) {
    const eixosComContagem = eixos.map(eixo => ({
        id: eixo._id || eixo.id,
        nome: eixo.nome,
        totalAcoes: 0
    }));
    acoes.forEach(acao => {
        if (!acao.eixo) return;
        let eixoId;
        if (typeof acao.eixo === 'object' && acao.eixo !== null) {
            eixoId = acao.eixo._id || acao.eixo.id;
        } else {
            eixoId = acao.eixo.toString();
        }
        const eixoIndex = eixosComContagem.findIndex(e => e.id.toString() === eixoId);
        if (eixoIndex !== -1) {
            eixosComContagem[eixoIndex].totalAcoes++;
        }
    });
    return eixosComContagem;
}
function contarAcoesPorPrioridade(acoes) {
    const contadores = { alta: 0, media: 0, baixa: 0 };
    acoes.forEach(acao => {
        const prioridade = acao.prioridade || 'Média';
        if (prioridade === 'Alta') contadores.alta++;
        else if (prioridade === 'Média') contadores.media++;
        else if (prioridade === 'Baixa') contadores.baixa++;
    });
    return contadores;
}
// === FIM: Dependências e Funções Utilitárias para Gráficos ===

async function buscarUsuariosMetricas() {
    const token = localStorage.getItem('authToken');
    try {
        const resp = await fetch('https://backend-4ybn.vercel.app/api/usuarios', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) return;
        const usuarios = await resp.json();
        usuariosMapMetricas = new Map();
        usuarios.forEach(u => {
            const id = u._id || u.id;
            const nome = u.nome || u.name || 'Sem nome';
            if (id) usuariosMapMetricas.set(id.toString(), nome);
        });
    } catch {}
}

document.addEventListener('DOMContentLoaded', async function() {
    await buscarUsuariosMetricas();
    popularSelectResponsaveisMetricas();
    carregarMetricas();
    const filtroForm = document.getElementById('filtroMetricasForm');
    if (filtroForm) {
        filtroForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            filtrarAcoesPorPeriodo();
        });
    }
    const btnExportarPDF = document.getElementById('btnExportarPDF');
    if (btnExportarPDF) {
        btnExportarPDF.addEventListener('click', exportarListaParaPDF);
    }
});

function popularSelectResponsaveisMetricas() {
    const select = document.getElementById('responsavelFiltro');
    if (!select) return;
    // Limpa e adiciona opção 'Todos'
    select.innerHTML = '<option value="">Todos</option>';
    usuariosMapMetricas.forEach((nome, id) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = nome;
        select.appendChild(opt);
    });
}

function carregarMetricas() {
    const graficosContainer = document.getElementById('metricasGraficos');
    const erroDiv = document.getElementById('metricasErro');
    erroDiv.style.display = 'none';
}

async function filtrarAcoesPorPeriodo() {
    const dataInicio = document.getElementById('dataInicio').value;
    const dataFim = document.getElementById('dataFim').value;
    const tipoData = document.querySelector('input[name="tipoData"]:checked')?.value || 'criacao';
    const responsavelId = document.getElementById('responsavelFiltro')?.value || '';
    const erroDiv = document.getElementById('metricasErro');
    const listaContainer = document.getElementById('listaAcoesContainer');
    const tabelaBody = document.querySelector('#tabelaAcoes tbody');
    erroDiv.style.display = 'none';
    tabelaBody.innerHTML = '';
    listaContainer.style.display = 'none';

    if (!dataInicio || !dataFim) {
        mostrarErroMetricas('Selecione o período corretamente.');
        return;
    }
    if (dataFim < dataInicio) {
        mostrarErroMetricas('A data final não pode ser menor que a data inicial.');
        return;
    }
    try {
        const token = localStorage.getItem('authToken');
        let url = '';
        if (tipoData === 'criacao') {
            url = `https://backend-4ybn.vercel.app/api/kanban/acoes?dataCriacaoInicio=${dataInicio}&dataCriacaoFim=${dataFim}`;
        } else {
            url = `https://backend-4ybn.vercel.app/api/kanban/acoes`;
        }
        const resp = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error('Erro ao buscar ações: ' + resp.statusText);
        let acoes = await resp.json();
        // Filtro por responsável
        if (responsavelId) {
            acoes = acoes.filter(acao => {
                if (!acao.responsaveis || !Array.isArray(acao.responsaveis)) return false;
                return acao.responsaveis.some(r => {
                    let id = r._id || r.id || r;
                    id = typeof id === 'object' ? '' : id;
                    return id?.toString() === responsavelId;
                });
            });
        }
        if (tipoData === 'prazo') {
            // Filtrar no frontend: ações cujo prazo esteja no período
            const dataInicioObj = parseDateLocal(dataInicio);
            const dataFimObj = parseDateLocalFim(dataFim);
            acoes = acoes.filter(acao => {
                if (!acao.prazo) return false;
                const prazoDate = new Date(acao.prazo);
                const resultado = prazoDate >= dataInicioObj && prazoDate <= dataFimObj;
                console.log('Comparando:', {
                  dataInicio: dataInicioObj,
                  dataFim: dataFimObj,
                  prazo: prazoDate,
                  resultado
                });
                return resultado;
            });
        } else if (tipoData === 'todas') {
            // Filtrar no frontend: ações cuja data de criação OU prazo estejam no período
            const dataInicioObj = parseDateLocal(dataInicio);
            const dataFimObj = parseDateLocalFim(dataFim);
            acoes = acoes.filter(acao => {
                let inCriacao = false, inPrazo = false;
                if (acao.dataCriacao) {
                    const criacaoDate = new Date(acao.dataCriacao);
                    inCriacao = criacaoDate >= dataInicioObj && criacaoDate <= dataFimObj;
                }
                if (acao.prazo) {
                    const prazoDate = new Date(acao.prazo);
                    inPrazo = prazoDate >= dataInicioObj && prazoDate <= dataFimObj;
                    console.log('Comparando (ambas):', {
                      dataInicio: dataInicioObj,
                      dataFim: dataFimObj,
                      prazo: prazoDate,
                      inPrazo
                    });
                }
                return inCriacao || inPrazo;
            });
        }
        if (!Array.isArray(acoes) || acoes.length === 0) {
            mostrarErroMetricas('Nenhuma ação encontrada para o período e filtro selecionados.');
            document.getElementById('metricasGraficos').style.display = 'none';
            return;
        }
        document.getElementById('metricasGraficos').style.display = '';
        // Buscar eixos
        const eixosResp = await fetch('https://backend-4ybn.vercel.app/api/kanban/eixos', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const eixos = eixosResp.ok ? await eixosResp.json() : [];
        // Renderizar gráficos
        renderizarGraficosMetricas(acoes, eixos);
        // Preencher tabela
        acoes.forEach(acao => {
            const tr = document.createElement('tr');
            let responsaveis = '-';
            if (Array.isArray(acao.responsaveis) && acao.responsaveis.length > 0) {
                responsaveis = acao.responsaveis.map(r => {
                    let id = r._id || r.id || r;
                    id = typeof id === 'object' ? '' : id;
                    return usuariosMapMetricas.get(id?.toString()) || r.nome || r.name || 'Sem nome';
                }).join(', ');
            }
            tr.innerHTML = `
                <td class="titulo-col">${acao.titulo || '-'}</td>
                <td class="status-col">${acao.status || '-'}</td>
                <td class="prioridade-col">${acao.prioridade || '-'}</td>
                <td class="prazo-col">${acao.prazo ? new Date(acao.prazo).toLocaleDateString('pt-BR') : '-'}</td>
                <td>${responsaveis}</td>
            `;
            tabelaBody.appendChild(tr);
        });
        listaContainer.style.display = 'block';
    } catch (error) {
        mostrarErroMetricas('Erro ao buscar ações: ' + (error.message || error));
    }
}

// Função para formatar data do input YYYY-MM-DD para DD/MM/YYYY sem fuso horário
function formatarDataInput(dataStr) {
    if (!dataStr) return '-';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
}

function exportarListaParaPDF() {
    const tabela = document.getElementById('tabelaAcoes');
    if (!tabela) return;
    // Obter datas do filtro
    const dataInicio = document.getElementById('dataInicio').value;
    const dataFim = document.getElementById('dataFim').value;
    const dataInicioFormatada = formatarDataInput(dataInicio);
    const dataFimFormatada = formatarDataInput(dataFim);
    const nomePDF = `Lista de Ações do Período: ${dataInicioFormatada} até ${dataFimFormatada}`;

    // Função utilitária para truncar texto (garante uso no PDF)
    function truncarTextoPDF(texto, max) {
        if (!texto) return '';
        return texto.length > max ? texto.slice(0, max) + '...' : texto;
    }

    // Capturar os gráficos como imagens
    const canvasAcoes = document.getElementById('graficoMetricasAcoes');
    const canvasEixos = document.getElementById('graficoMetricasEixos');
    const canvasPrioridades = document.getElementById('graficoMetricasPrioridades');
    const imgAcoes = canvasAcoes ? `<div class='pdf-grafico-img'><img src='${canvasAcoes.toDataURL()}' style='max-width:100%;max-height:180px;'></div>` : '';
    const imgEixos = canvasEixos ? `<div class='pdf-grafico-img'><img src='${canvasEixos.toDataURL()}' style='max-width:100%;max-height:180px;'></div>` : '';
    const imgPrioridades = canvasPrioridades ? `<div class='pdf-grafico-img'><img src='${canvasPrioridades.toDataURL()}' style='max-width:100%;max-height:180px;'></div>` : '';

    // Legendas dos gráficos (com melhorias)
    function gerarLegendaGrafico(labels, data, cores, maxTexto = 15) {
        return `<ul style='list-style:none;padding:0;margin:8px 0 0 0;'>` +
            labels.map((label, i) => {
                const value = data[i];
                const texto = truncarTextoPDF(label, maxTexto);
                return `<li style='display:flex;align-items:center;margin-bottom:2px;'>` +
                    `<span style='display:inline-block;width:14px;height:14px;background:${cores[i]};margin-right:7px;border-radius:2px;'></span>` +
                    `<span style='font-size:12px;'>${value} ${texto}</span>` +
                `</li>`;
            }).join('') +
        `</ul>`;
    }

    // Obter dados dos gráficos para legendas
    let legendasGraficos = '';
    try {
        // Progresso das Ações
        const chartAcoes = window.graficosMetricas?.acoes;
        if (chartAcoes) {
            const d = chartAcoes.data;
            legendasGraficos += gerarLegendaGrafico(d.labels, d.datasets[0].data, d.datasets[0].backgroundColor);
        }
        // Distribuição por Prioridade
        const chartPrioridades = window.graficosMetricas?.prioridades;
        if (chartPrioridades) {
            const d = chartPrioridades.data;
            legendasGraficos += gerarLegendaGrafico(d.labels, d.datasets[0].data, d.datasets[0].backgroundColor);
        }
        // Ações por Eixo
        const chartEixos = window.graficosMetricas?.eixos;
        if (chartEixos) {
            const d = chartEixos.data;
            legendasGraficos += gerarLegendaGrafico(d.labels, d.datasets[0].data, d.datasets[0].backgroundColor);
        }
    } catch {}

    // Montar o HTML do PDF
    const html = `
        <html><head><title>${nomePDF}</title>
        <style>
            body { font-family: Segoe UI, Arial, sans-serif; margin: 32px; background: #f8f9fa; font-size: 10px; }
            .pdf-title {
                text-align: center;
                color: #00008B;
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 2px;
                margin-top: 10px;
                letter-spacing: 0.5px;
            }
            .pdf-divider {
                border: none;
                border-top: 2px solid #00008B;
                margin: 10px 0 18px 0;
            }
            .pdf-graficos-container {
                display: flex;
                justify-content: center;
                align-items: flex-start;
                gap: 8px;
                margin-bottom: 18px;
                flex-wrap: nowrap;
                width: 100%;
            }
            .pdf-grafico-img {
                flex: 1 1 33%;
                max-width: 33%;
                min-width: 120px;
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 0 4px;
            }
            .pdf-legenda-graficos {
                display: flex;
                justify-content: center;
                gap: 24px;
                flex-wrap: wrap;
                margin-bottom: 8px;
            }
            table { width: 100%; border-collapse: collapse; background: #fff; margin-top: 0; }
            th, td { border: 1px solid #e0e0e0; padding: 7px 8px; text-align: left; font-size: 10px; }
            th {
                background: #00008B;
                color: #fff;
                font-weight: bold;
                letter-spacing: 0.5px;
                text-align: center;
            }
            tr:nth-child(even) { background: #f3f4f6; }
            td { vertical-align: top; }
            @page {
                margin: 20px 0 0 0;
                size: auto;
            }
            @media print {
                body { margin-bottom: 0 !important; }
                @page { margin: 20px 0 0 0; size: auto; }
                html, body {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
            }
        </style>
        </head><body>
        <div class="pdf-title">${nomePDF}</div>
        <hr class="pdf-divider" />
        <div class="pdf-graficos-container">
            ${imgAcoes}
            ${imgPrioridades}
            ${imgEixos}
        </div>
        <div class="pdf-legenda-graficos">
            ${legendasGraficos}
        </div>
        ${tabela.outerHTML}
        </body></html>
    `;
    // Criar iframe oculto
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    iframe.contentWindow.focus();
    setTimeout(() => {
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
}

function mostrarErroMetricas(msg) {
    const erroDiv = document.getElementById('metricasErro');
    erroDiv.textContent = msg;
    erroDiv.style.display = 'block';
}

// Função utilitária para truncar texto
function truncarTexto(texto, max) {
    if (!texto) return '';
    return texto.length > max ? texto.slice(0, max) + '...' : texto;
}

// Funções para criar datas locais corretamente
function parseDateLocal(dateStr) {
    const [ano, mes, dia] = dateStr.split('-').map(Number);
    return new Date(ano, mes - 1, dia, 0, 0, 0, 0);
}
function parseDateLocalFim(dateStr) {
    const [ano, mes, dia] = dateStr.split('-').map(Number);
    return new Date(ano, mes - 1, dia, 23, 59, 59, 999);
} 