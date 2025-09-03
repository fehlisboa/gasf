// Função para carregar o template do topbar GS-FAM
async function loadTopbarGSFAM() {
    try {
        const response = await fetch('../templates/topbargesfam.html');
        if (!response.ok) throw new Error('Erro ao carregar o topbar GS-FAM');

        const topbarHtml = await response.text();
        const topbarContainer = document.getElementById('mainTopbarContainer');

        if (topbarContainer) {
            topbarContainer.innerHTML = topbarHtml;
            inicializarTopbarGSFAM();
        }
    } catch (error) {
        console.error('Erro ao carregar o topbar GS-FAM:', error);
    }
}

// Função para atualizar o relógio digital
function atualizarRelogioGSFAM() {
    const clockTime = document.querySelector('#mainTopbarGSFAM #clockTime');
    const clockDate = document.querySelector('#mainTopbarGSFAM #clockDate');
    if (!clockTime || !clockDate) return;

    const now = new Date();
    const horas = String(now.getHours()).padStart(2, '0');
    const minutos = String(now.getMinutes()).padStart(2, '0');
    const novoHorario = `${horas}:${minutos}`;
    if (clockTime.getAttribute('data-time') !== novoHorario) {
        clockTime.setAttribute('data-time', novoHorario);
        clockTime.textContent = novoHorario;
    }
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
    if (clockDate.textContent !== novaData) {
        clockDate.textContent = novaData;
    }
}

// Função para inicializar todas as funcionalidades do topbar GS-FAM
function inicializarTopbarGSFAM() {
    atualizarRelogioGSFAM();
    setInterval(atualizarRelogioGSFAM, 60000);
}

document.addEventListener('DOMContentLoaded', () => {
    loadTopbarGSFAM();
}); 