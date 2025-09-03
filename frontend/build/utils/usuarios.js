const API_BASE_URL = 'https://backend-4ybn.vercel.app';

// Variável global para cache dos cargos
window.cargosCache = [];

// Função para alternar visibilidade da senha
function setupPasswordToggle(buttonId, inputId) {
    const toggleButton = document.getElementById(buttonId);
    const passwordInput = document.getElementById(inputId);
    
    if (toggleButton && passwordInput) {
        // Remover listeners existentes para evitar duplicação
        const newButton = toggleButton.cloneNode(true);
        toggleButton.parentNode.replaceChild(newButton, toggleButton);
        
        newButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Impedir propagação do evento
            
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    }
}

// Função para formatar o cargo para exibição
function formatarCargo(cargoId) {
    if (!cargoId) return 'Sem cargo';
    const cargos = window.cargosCache || [];
    const cargoObj = cargos.find(c => c.id === cargoId);
    if (cargoObj) return cargoObj.nome;
    // Fallback para nomes antigos
    const nomesPadrao = {
        'admin': 'Administrador',
        'gerente': 'Gerente',
        'atendente': 'Atendente',
        'vendedor': 'Vendedor',
        'producao': 'Produção',
        'outro': 'Outro'
    };
    if (nomesPadrao[(cargoId || '').toLowerCase()]) {
        return nomesPadrao[cargoId.toLowerCase()];
    }
    return 'Sem cargo';
}

// Função para gerar um salt aleatório
function generateSalt() {
    return crypto.getRandomValues(new Uint8Array(16));
}

// Função para criptografar senha usando PBKDF2
async function encryptPassword(password) {
    try {
        const salt = generateSalt();
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
        );
        const key = await window.crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            256
        );
        return {
            salt: Array.from(salt).join(','),
            key: Array.from(new Uint8Array(key))
        };
    } catch (error) {
        console.error('Erro ao criptografar senha:', error);
        throw error;
    }
}

// Função para verificar senha
async function verifyPassword(password, encryptedData) {
    try {
        const salt = new Uint8Array(encryptedData.salt.split(',').map(Number));
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
        );
        const key = await window.crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            256
        );
        const keyArray = Array.from(new Uint8Array(key));
        return keyArray.every((byte, index) => byte === encryptedData.key[index]);
    } catch (error) {
        console.error('Erro na verificação de senha:', error);
        return false;
    }
}

// Função para processar a foto do usuário - melhorar para comprimir imagens grandes
function processUserPhoto(fileInput) {
    return new Promise((resolve, reject) => {
        try {
            if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                console.log('Nenhum arquivo de imagem selecionado');
                resolve(null); // Sem foto
                return;
            }

            const file = fileInput.files[0];
            if (!file.type.match('image.*')) {
                reject(new Error('O arquivo selecionado não é uma imagem válida.'));
                return;
            }

            // Verificar tamanho do arquivo
            console.log(`Processando imagem: ${file.name}, tamanho: ${file.size} bytes, tipo: ${file.type}`);
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    try {
                        console.log(`Dimensões originais: ${img.width}x${img.height}`);
                        
                        // Determinar se a imagem precisa de compressão (>500KB ou dimensões muito grandes)
                        const compressionNeeded = file.size > 500000 || img.width > 1200 || img.height > 1200;
                        
                        if (compressionNeeded) {
                            console.log('Imagem grande detectada, aplicando compressão...');
                            
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            
                            // Calcular nova dimensão mantendo proporção
                            let width = img.width;
                            let height = img.height;
                            const maxDimension = 800; // Dimensão máxima
                            
                            if (width > height && width > maxDimension) {
                                height = Math.round(height * maxDimension / width);
                                width = maxDimension;
                            } else if (height > maxDimension) {
                                width = Math.round(width * maxDimension / height);
                                height = maxDimension;
                            }
                            
                            canvas.width = width;
                            canvas.height = height;
                            console.log(`Redimensionando para: ${width}x${height}`);
                            
                            // Desenhar imagem redimensionada
                            ctx.drawImage(img, 0, 0, width, height);
                            
                            // Converter para base64 com qualidade reduzida
                            const quality = file.size > 1000000 ? 0.6 : 0.8; // Usar qualidade menor para arquivos maiores
                            const compressedBase64 = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality);
                            
                            console.log(`Imagem comprimida: tamanho aproximado ${Math.round(compressedBase64.length * 0.75 / 1024)}KB`);
                            resolve(compressedBase64);
                        } else {
                            // Sem compressão para imagens pequenas
                            console.log('Imagem pequena, sem compressão necessária');
                            resolve(e.target.result);
                        }
                    } catch (err) {
                        console.error('Erro ao processar/comprimir imagem:', err);
                        // Se houver erro na compressão, tenta enviar a imagem original
                        console.log('Usando imagem original sem compressão devido a erro');
                        resolve(e.target.result);
                    }
                };
                
                img.onerror = (err) => {
                    console.error('Erro ao carregar imagem:', err);
                    reject(new Error('Erro ao carregar a imagem. Formato inválido ou corrompido.'));
                };
                
                // Adicionar um timeout para garantir que a imagem seja carregada
                setTimeout(() => {
                    if (!img.complete) {
                        console.warn('Timeout ao carregar imagem, tentando método alternativo');
                        img.onerror = null; // Remover onerror
                        // Tentar método alternativo - enviar dados brutos
                        resolve(e.target.result);
                    }
                }, 3000); // 3 segundos de timeout
                
                img.src = e.target.result;
            };
            
            reader.onerror = (err) => {
                console.error('Erro ao ler o arquivo:', err);
                reject(new Error('Erro ao processar a imagem. Tente novamente ou escolha outra imagem.'));
            };
            
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Erro global no processamento de imagem:', err);
            reject(new Error('Erro inesperado ao processar a imagem.'));
        }
    });
}

// Função para salvar usuário no backend
async function saveUser(user) {
    try {
        // Verificar token de autenticação
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        
        // Verificar campos obrigatórios
        if (!user.name || !user.email || !user.cargo || !user.role || !user.password) {
            throw new Error('Nome, e-mail, cargo, role e senha são obrigatórios');
        }
        
        // Processar a foto se existir
        let photoData = null;
        if (user.photoInput && user.photoInput.files && user.photoInput.files.length > 0) {
            try {
                console.log('Processando foto para novo usuário');
                // Usar diretamente o input do arquivo para processamento
                photoData = await processUserPhoto(user.photoInput);
                console.log('Foto processada com sucesso, tamanho:', photoData ? Math.round(photoData.length * 0.75 / 1024) + 'KB' : 'N/A');
            } catch (error) {
                console.error('Erro ao processar foto de novo usuário:', error);
                showToast('Aviso: Não foi possível processar a foto. Usuário será salvo sem foto.', 'warning');
                // Continua sem a foto
            }
        } else if (user.photoInput && user.photoInput.value) {
            // Se tiver uma string base64 direta
            photoData = user.photoInput.value;
            console.log('Usando foto já processada');
        }

        console.log('Enviando dados de novo usuário');
        
        // Preparando o corpo da requisição com todos os campos obrigatórios
        const requestBody = {
            nome: user.name,
            email: user.email,
            senha: user.password,
            cargo: user.cargo,
            role: user.role,
            isActive: true
        };
        
        // Adicionar foto apenas se for processada com sucesso
        if (photoData) {
            requestBody.photo = photoData;
            console.log('Foto incluída na requisição, tamanho:', Math.round(photoData.length * 0.75 / 1024) + 'KB');
        }
        
        console.log('Dados a enviar:', JSON.stringify({...requestBody, senha: '******', photo: photoData ? '[foto em base64]' : 'null'}));
        
        const response = await fetch('https://backend-4ybn.vercel.app/api/usuarios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken
            },
            body: JSON.stringify(requestBody),
        });
        
        // Verificar status da resposta em detalhes
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao cadastrar usuário');
            } else {
                // Se não for JSON, provavelmente é HTML de erro
                const errorText = await response.text();
                console.error('Resposta de erro não-JSON:', errorText);
                throw new Error(`Erro ao cadastrar usuário (Status ${response.status})`);
            }
        }
        
        return await response.json();
    } catch (error) {
        console.error('Erro detalhado ao salvar usuário:', error);
        throw error;
    }
}

// Função para verificar força da senha
function isStrongPassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= minLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasSpecialChar;
}

// Função para carregar usuários do backend
async function loadUsers() {
    try {
        // Verificar token de autenticação
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }

        // Tentar carregar do backend
        const response = await fetch(`${API_BASE_URL}/api/usuarios`, {
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });

        if (!response.ok) {
            const errorText = await response.text(); // Ler corpo da resposta para log
            console.error(`Erro na resposta da API (${response.status}):`, errorText); // Logar resposta de erro completa
            throw new Error(`Erro ao buscar usuários: ${response.status} ${response.statusText}`);
        }

        const users = await response.json();

        // Adicionar log da resposta JSON (apenas em ambiente de desenvolvimento, se necessário)
        console.log('Resposta JSON da API de usuários:', users);

        // Atualizar cache local
        localStorage.setItem('users', JSON.stringify(users));

        return users;
    } catch (error) {
        console.warn('Erro ao buscar usuários do backend:', error.message);
        console.log('Usando dados do cache local...');

        // Fallback: usar dados do localStorage
        return inicializarUsuarios(); // inicializarUsuarios() já trata cache inválido/vazio
    }
}

// Função para verificar login
async function loginUser(email, password) {
    const users = await loadUsers();
    
    // Verificar se o usuário existe e está ativo
    const user = users.find(u => u.email === email);
    
    if (!user) {
        throw new Error('Usuário não encontrado');
    }
    
    // Verificar explicitamente se o usuário está ativo
    if (!user.isActive) {
        throw new Error('Usuário desativado. Entre em contato com o administrador.');
    }
    
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
        throw new Error('Senha incorreta');
    }
    
    // Atualiza último login
    user.lastLogin = new Date().toISOString();
    
    // Atualizar o último login no backend
    try {
        await updateUserProfile(user._id || user.id, { lastLogin: user.lastLogin });
    } catch (error) {
        console.warn('Não foi possível atualizar o último login:', error);
    }
    
    return {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        cargo: user.cargo,
        lastLogin: user.lastLogin,
        photo: user.photo,
        isActive: user.isActive
    };
}

// Função para verificar disponibilidade de email
async function checkEmailAvailability(email, userId = null) {
    try {
        // Verificar token de autenticação
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        
        const endpoint = `https://backend-4ybn.vercel.app/api/usuarios/check-email?email=${encodeURIComponent(email)}${userId ? `&userId=${userId}` : ''}`;
        
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            return { available: false, message: error.message || 'Erro ao verificar email' };
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Erro ao verificar disponibilidade de email:', error);
        return { available: false, message: error.message || 'Erro ao verificar disponibilidade de email' };
    }
}

// Função para atualizar perfil do usuário
async function updateUserProfile(userId, updates) {
    try {
        // Verificar token de autenticação
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        
        console.log('Dados recebidos para atualização:', updates);
        
        // Garantir que todos os campos obrigatórios estejam presentes
        // Se algum campo vier como null ou undefined, usar os dados do usuário atual
        const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
        
        // Verificar campos obrigatórios - permitir uso de nome ou name
        const nome = updates.nome || updates.name || '';
        const email = updates.email || '';
        const cargo = updates.cargo || '';
        const role = updates.role || currentUser.role || 'user';
        
        if (!nome || !email || !cargo || !role) {
            console.error('Campos obrigatórios ausentes:', { nome, email, cargo, role });
            throw new Error('Nome, e-mail, cargo e role são obrigatórios');
        }
        
        // Processar a foto se existir
        let photoData = null;
        if (updates.photoInput && updates.photoInput.files && updates.photoInput.files.length > 0) {
            try {
                console.log('Processando foto para atualização de perfil');
                photoData = await processUserPhoto(updates.photoInput);
                console.log('Foto processada com sucesso, tamanho:', photoData ? Math.round(photoData.length * 0.75 / 1024) + 'KB' : 'N/A');
            } catch (error) {
                console.error('Erro ao processar foto para atualização:', error);
                showToast('Aviso: Não foi possível processar a foto. Tentando método alternativo...', 'warning');
                
                // Método alternativo para processar a foto
                try {
                    const file = updates.photoInput.files[0];
                    const reader = new FileReader();
                    
                    // Usar Promise para aguardar a leitura
                    photoData = await new Promise((resolve, reject) => {
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = (e) => reject(new Error('Erro ao ler arquivo de imagem'));
                        reader.readAsDataURL(file);
                    });
                    
                    console.log('Foto processada com método alternativo, tamanho:', photoData ? Math.round(photoData.length * 0.75 / 1024) + 'KB' : 'N/A');
                } catch (altError) {
                    console.error('Falha no método alternativo:', altError);
                    showToast('Erro ao processar a foto. Perfil será atualizado sem alterar a foto.', 'error');
                }
            }
        } else if (updates.photo !== undefined) {
            // Se tiver uma string base64 direta
            photoData = updates.photo;
            console.log('Usando foto já processada');
        }
        
        // Preparar dados para envio
        const requestBody = {
            id: userId,
            nome: nome,
            email: email,
            cargo: cargo,
            role: role
        };
        
        // Adicionar senha apenas se for fornecida
        if (updates.senha && updates.senha.trim()) {
            requestBody.senha = updates.senha;
        } else if (updates.password && updates.password.trim()) {
            requestBody.senha = updates.password;
        }
        
        // Adicionar foto apenas se for processada com sucesso
        if (photoData !== null) {
            requestBody.photo = photoData;
            console.log('Foto incluída na requisição de atualização');
        }
        
        console.log('Dados a enviar para atualização:', JSON.stringify({
            ...requestBody, 
            senha: requestBody.senha ? '******' : undefined, 
            photo: photoData ? '[foto em base64]' : 'não modificada'
        }));
        
        // Adicionar um timeout maior para requisições com fotos
        const timeoutMs = photoData ? 30000 : 10000; // 30s se tiver foto, 10s caso contrário
        
        // Criar um controlador de timeout para abortar a requisição se demorar muito
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        try {
            const response = await fetch('https://backend-4ybn.vercel.app/api/usuarios/perfil', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + authToken
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });
            
            // Limpar o timeout, pois a requisição completou
            clearTimeout(timeoutId);
            
            // Verificar status da resposta em detalhes
            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Erro ao atualizar usuário');
                } else {
                    // Se não for JSON, provavelmente é HTML de erro
                    const errorText = await response.text();
                    console.error('Resposta de erro não-JSON:', errorText);
                    throw new Error(`Erro ao atualizar usuário (Status ${response.status})`);
                }
            }
            
            const updatedUser = await response.json();
            console.log('Resposta da API após atualização:', updatedUser);
            
            // Se a resposta não contiver a foto mas temos uma foto nova, verificar se precisamos recuperar os dados completos
            if (photoData && (!updatedUser.user || !updatedUser.user.photo)) {
                console.log('Foto não retornada na resposta. Buscando dados completos do usuário...');
                
                try {
                    // Buscar usuário completo
                    const userResponse = await fetch(`https://backend-4ybn.vercel.app/api/usuarios/${userId}`, {
                        headers: {
                            'Authorization': 'Bearer ' + authToken
                        }
                    });
                    
                    if (userResponse.ok) {
                        const fullUserData = await userResponse.json();
                        
                        // Atualizar o objeto de resposta
                        if (updatedUser.user) {
                            updatedUser.user.photo = fullUserData.photo;
                        } else {
                            updatedUser.photo = fullUserData.photo;
                        }
                        
                        console.log('Dados completos do usuário obtidos, incluindo foto');
                    }
                } catch (fetchError) {
                    console.error('Erro ao buscar dados completos do usuário:', fetchError);
                }
            }
            
            // Atualizar o usuário atual no localStorage se for o mesmo
            if (currentUser && (currentUser._id === userId || currentUser.id === userId)) {
                const updatedData = updatedUser.user || updatedUser;
                
                localStorage.setItem('currentUser', JSON.stringify({
                    ...currentUser,
                    ...updatedData
                }));
                
                // Acionar atualização de UI
                if (typeof atualizarInfoUsuario === 'function') {
                    setTimeout(atualizarInfoUsuario, 100);
                }
            }
            
            return updatedUser;
        } catch (fetchError) {
            // Limpar o timeout se ocorrer erro
            clearTimeout(timeoutId);
            
            // Tratar erro de timeout
            if (fetchError.name === 'AbortError') {
                console.error('Requisição abortada por timeout:', fetchError);
                throw new Error('A requisição demorou muito tempo para completar. Tente novamente com uma imagem menor.');
            }
            
            throw fetchError;
        }
    } catch (error) {
        console.error('Erro detalhado na atualização:', error);
        throw error;
    }
}

// Função para verificar se o usuário está autenticado
function checkAuth() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Função para exibir diálogo de confirmação personalizado
function showConfirmDialog(message, confirmCallback, cancelCallback = null) {
    console.log('[showConfirmDialog] Iniciada com mensagem:', message);
    // Verificar se já existe um diálogo e removê-lo
    const existingDialogContainer = document.querySelector('.confirm-dialog-container');
    if (existingDialogContainer) {
        console.log('[showConfirmDialog] Diálogo container existente encontrado e removido.');
        existingDialogContainer.remove();
    }
    
    // Verificar se é um diálogo de exclusão
    const isDeleteDialog = message.toLowerCase().includes('excluir') || message.toLowerCase().includes('deletar');
    const dialogSpecificClass = isDeleteDialog ? 'confirm-dialog-delete' : ''; // Classe específica para o diálogo interno
    const btnConfirmClass = isDeleteDialog ? 'btn-danger' : 'btn-confirm';
    const confirmText = isDeleteDialog ? 'Excluir' : 'Confirmar';
    
    // Criar o container do diálogo (overlay)
    const dialogOverlayContainer = document.createElement('div');
    dialogOverlayContainer.className = 'confirm-dialog-container'; // Classe base do container
    console.log('[showConfirmDialog] Container overlay do diálogo criado com classe:', dialogOverlayContainer.className);

    // Criar o diálogo em si (o conteúdo)
    const dialogContentElement = document.createElement('div');
    dialogContentElement.className = 'confirm-dialog ' + dialogSpecificClass; // Classe base do diálogo + específica
    console.log('[showConfirmDialog] Elemento de conteúdo do diálogo criado com classes:', dialogContentElement.className);
    
    // Montar o HTML interno do diálogo
    dialogContentElement.innerHTML = `
        <div class="confirm-dialog-header">
            <i class="fas fa-${isDeleteDialog ? 'exclamation-triangle' : 'question-circle'}"></i>
            <h3>${isDeleteDialog ? 'Confirmar Exclusão' : 'Confirmação'}</h3>
        </div>
        <div class="confirm-dialog-body">
            <p>${message}</p>
        </div>
        <div class="confirm-dialog-footer">
            <button class="btn-cancel">Cancelar</button>
            <button class="${btnConfirmClass}">${confirmText}</button>
        </div>
    `;
    
    // Adicionar o conteúdo do diálogo ao container overlay
    dialogOverlayContainer.appendChild(dialogContentElement);
    
    // Adicionar o container overlay ao corpo do documento
    document.body.appendChild(dialogOverlayContainer);
    console.log('[showConfirmDialog] Container overlay do diálogo adicionado ao document.body.');
    
    // Animar entrada aplicando 'active' ao container overlay
    setTimeout(() => {
        dialogOverlayContainer.classList.add('active');
        console.log("[showConfirmDialog] Classe 'active' adicionada ao dialogOverlayContainer.");
    }, 10); // Pequeno delay para garantir que a transição CSS ocorra
    
    // Adicionar eventos aos botões DENTRO do dialogContentElement
    const confirmBtn = dialogContentElement.querySelector(`.${btnConfirmClass}`);
    const cancelBtn = dialogContentElement.querySelector('.btn-cancel');
    
    // Função para fechar o diálogo
    const closeDialog = () => {
        dialogOverlayContainer.classList.remove('active');
        setTimeout(() => {
            if (dialogOverlayContainer.parentElement) { // Verificar se ainda está no DOM
                dialogOverlayContainer.remove();
            }
        }, 300); // Tempo para a animação de saída do CSS
    };
    
    // Evento para confirmar
    confirmBtn.addEventListener('click', () => {
        console.log('[showConfirmDialog] Botão Confirmar clicado.');
        closeDialog();
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
    });
    
    // Evento para cancelar
    cancelBtn.addEventListener('click', () => {
        console.log('[showConfirmDialog] Botão Cancelar clicado.');
        closeDialog();
        if (typeof cancelCallback === 'function') {
            cancelCallback();
        }
    });
    
    // Permitir fechar ao clicar fora do diálogo (no overlay)
    dialogOverlayContainer.addEventListener('click', (e) => {
        if (e.target === dialogOverlayContainer) { // Se o clique foi no próprio overlay
            console.log('[showConfirmDialog] Clique no overlay (fora do conteúdo do diálogo).');
            closeDialog();
            if (typeof cancelCallback === 'function') {
                cancelCallback(); // Chama o callback de cancelamento também ao clicar fora
            }
        }
    });
}

// Função para atualizar status do usuário (ativar/desativar)
async function updateUserStatus(userId, isActive) {
    try {
        // Verificar token de autenticação
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        
        console.log(`Atualizando status do usuário ${userId} para ${isActive ? 'Ativo' : 'Inativo'}`);
        
        // Usar a rota correta para atualizar status
        const response = await fetch(`https://backend-4ybn.vercel.app/api/usuarios/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken
            },
            body: JSON.stringify({ id: userId, isActive })
        });
        
        // Verificar status da resposta
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao atualizar status do usuário');
            } else {
                // Se não for JSON, provavelmente é HTML de erro
                const errorText = await response.text();
                console.error('Resposta de erro não-JSON:', errorText);
                throw new Error(`Erro ao atualizar status (Status ${response.status})`);
            }
        }
        
        const result = await response.json();
        console.log('Resultado da atualização de status:', result);
        return result;
    } catch (error) {
        console.error('Erro ao atualizar status do usuário:', error);
        throw error;
    }
}

// Função para desativar/ativar usuário (agora global)
window.toggleUserStatus = async function(userId, currentActive) {
    console.log('[toggleUserStatus] Iniciada para userId:', userId, 'currentActive:', currentActive);
    if (!checkAuth()) {
        console.log('[toggleUserStatus] checkAuth() falhou. Retornando.');
        return;
    }
    console.log('[toggleUserStatus] checkAuth() passou.');
    
    try {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = users.findIndex(u => (u._id || u.id) === userId);
        
        if (userIndex === -1) {
            throw new Error('Usuário não encontrado');
        }
        
        // Não permite desativar o próprio usuário
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if ((currentUser.id === userId) || (currentUser._id === userId)) {
            showNotification('Você não pode desativar sua própria conta', 'error');
            return;
        }
        
        const user = users[userIndex];
        const isActive = typeof currentActive === 'boolean' ? !currentActive : !(user.isActive !== false);
        
        console.log('Alterando status do usuário:', user.name, 'Novo status:', isActive ? 'Ativo' : 'Inativo');
        
        // Confirmar desativação com uma mensagem específica
        let confirmMessage = !isActive 
            ? `Tem certeza que deseja desativar o usuário <strong>${user.name}</strong>? <br><br>O usuário não poderá mais fazer login no sistema.` 
            : `Deseja reativar o usuário <strong>${user.name}</strong>?`;
        
        // Usar diálogo de confirmação personalizado
        showConfirmDialog(confirmMessage, async () => {
            try {
                // Mostrar notificação de carregamento
                const loadingId = showNotification('Excluindo usuário...', 'info');
                
                // Usar a função específica para atualizar status
                const result = await updateUserStatus(userId, isActive);
                console.log('Resultado da atualização de status:', result);
                
                // Atualizar o usuário na lista local
                if (users[userIndex]) {
                    users[userIndex].isActive = isActive;
                    localStorage.setItem('users', JSON.stringify(users));
                }
                
                // Recarregar a lista de usuários
                await carregarUsuarios();
                
                // Mostrar notificação de sucesso
                const statusMessage = isActive 
                    ? `Usuário ${user.name} ativado com sucesso` 
                    : `Usuário ${user.name} desativado com sucesso`;
                    
                showNotification(statusMessage, 'success');
            } catch (error) {
                console.error('Erro ao atualizar status:', error);
                showNotification(`Erro ao ${isActive ? 'ativar' : 'desativar'} usuário: ${error.message}`, 'error');
                
                // Recarregar a lista mesmo em caso de erro
                await carregarUsuarios();
            }
        });
        
    } catch (error) {
        console.error('Erro ao alternar status:', error);
        showNotification(error.message, 'error');
    }
}

// Função para editar cargo do usuário
async function editarCargoUsuario(id, novoCargo) {
    try {
        // Verificar token de autenticação
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        
        // Usar a rota correta para editar cargo
        const response = await fetch(`https://backend-4ybn.vercel.app/api/usuarios/cargo`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken
            },
            body: JSON.stringify({ id, cargo: novoCargo })
        });
        
        // Verificar status da resposta
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao editar cargo');
            } else {
                // Se não for JSON, provavelmente é HTML de erro
                const errorText = await response.text();
                console.error('Resposta de erro não-JSON:', errorText);
                throw new Error(`Erro ao editar cargo (Status ${response.status})`);
            }
        }
        
        return await response.json();
    } catch (error) {
        console.error('Erro ao editar cargo:', error);
        throw error;
    }
}

// Função para deletar usuário
async function deletarUsuario(id) {
    console.log(`[deletarUsuario] Iniciando exclusão para ID: ${id}`);
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        
        console.log('[deletarUsuario] Tentando excluir usuário com ID:', id);
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && (currentUser.id === id || currentUser._id === id)) {
            throw new Error('Você não pode excluir seu próprio usuário.');
        }
        
        // Tentativa de exclusão direta - ROTA CORRIGIDA
        console.log('[deletarUsuario] Fazendo solicitação para ROTA 1: DELETE /api/usuarios/' + id);
        const response = await fetch(`https://backend-4ybn.vercel.app/api/usuarios/${id}`, { // URL CORRIGIDA AQUI
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });
        console.log('[deletarUsuario] ROTA 1 - Status da resposta:', response.status);
        
        if (!response.ok) {
            const errorTextR1 = await response.text(); 
            console.log(`[deletarUsuario] ROTA 1 falhou com status ${response.status}. Resposta: ${errorTextR1}. Tentando ROTA 2 (desativação)...`);
            
            const statusResponse = await fetch(`https://backend-4ybn.vercel.app/api/usuarios/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + authToken
                },
                body: JSON.stringify({ 
                    id: id,
                    isActive: false 
                })
            });
            console.log('[deletarUsuario] ROTA 2 (desativação) - Status da resposta:', statusResponse.status);
            
            if (statusResponse.ok) {
                const resultR2 = await statusResponse.json();
                console.log('[deletarUsuario] ROTA 2 (desativação) bem-sucedida. Resultado:', JSON.stringify(resultR2));
                // Se a exclusão falhou mas a desativação funcionou, retorne com a propriedade 'user' para que o frontend possa tratar adequadamente
                return { success: true, message: 'Usuário foi desativado (exclusão direta falhou).', user: resultR2.user }; 
            }
            
            // Se a desativação também falhou, lançar erro
            const errorTextR2 = await statusResponse.text();
            console.error(`[deletarUsuario] ROTA 2 (desativação) também falhou. Status: ${statusResponse.status}. Resposta: ${errorTextR2}`);
            throw new Error('Não foi possível excluir ou desativar o usuário. Ambas as tentativas falharam.');
        }
        
        // Se a ROTA 1 (exclusão direta) foi bem-sucedida
        // Tentar obter uma resposta JSON. Se não houver corpo (ex: status 204), retornar um objeto de sucesso padrão.
        let resultR1;
        try {
            resultR1 = await response.json();
        } catch (e) {
            // Se response.json() falhar (ex: corpo vazio para 204 No Content), considerar sucesso
            if (response.status === 204) {
                resultR1 = { success: true, message: 'Usuário excluído permanentemente.' };
            } else {
                // Se for outro erro de parsing com status OK, ainda é um problema
                console.error('[deletarUsuario] Erro ao fazer parse do JSON da ROTA 1, mas status era OK:', e);
                resultR1 = { success: false, message: 'Exclusão pode ter ocorrido, mas resposta da API foi inesperada.' };
            }
        }
        console.log('[deletarUsuario] ROTA 1 (exclusão direta) bem-sucedida. Resultado Processado:', JSON.stringify(resultR1));
        return resultR1; // Este resultado NÃO deve ter a propriedade 'user' para exclusão bem-sucedida

    } catch (error) {
        console.error('[deletarUsuario] Erro capturado na função:', error);
        throw error;
    }
}

// Adicionar sistema de notificações para feedback ao usuário
function showToast(message, type = 'info') {
    // Verificar se o container de toast já existe
    let toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
        // Criar o container de toast
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        `;
        document.body.appendChild(toastContainer);
    }
    
    // Criar o toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        min-width: 250px;
        margin-bottom: 10px;
        background-color: white;
        color: #333;
        padding: 15px;
        border-radius: 6px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        font-size: 14px;
        line-height: 1.4;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        overflow: hidden;
        position: relative;
    `;
    
    // Adicionar borda esquerda colorida
    let borderColor = '#667eea'; // Default azul
    if (type === 'success') borderColor = '#48bb78';
    if (type === 'error') borderColor = '#e53e3e';
    if (type === 'warning') borderColor = '#f6993f';
    
    toast.style.borderLeft = `4px solid ${borderColor}`;
    
    // Adicionar ícone baseado no tipo
    let icon = 'fas fa-info-circle';
    if (type === 'success') icon = 'fas fa-check-circle';
    if (type === 'error') icon = 'fas fa-exclamation-circle';
    if (type === 'warning') icon = 'fas fa-exclamation-triangle';
    
    toast.innerHTML = `
        <div style="margin-right: 10px;"><i class="${icon}" style="color:${borderColor}"></i></div>
        <div style="flex-grow: 1;">${message}</div>
        <button style="background: none; border: none; cursor: pointer; font-size: 16px; color: #999;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Adicionar ao container
    toastContainer.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Adicionar funcionalidade ao botão de fechar
    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => {
        removeToast(toast);
    });
    
    // Auto remover após 5 segundos
    setTimeout(() => {
        removeToast(toast);
    }, 5000);
    
    // Função para remover o toast
    function removeToast(toastElement) {
        toastElement.style.transform = 'translateX(100%)';
        setTimeout(() => {
            toastElement.remove();
            // Remover o container se não houver mais toasts
            if (toastContainer.children.length === 0) {
                toastContainer.remove();
            }
        }, 300);
    }
}

// Função para carregar usuários
async function carregarUsuarios() {
    try {
        // Verificar token de autenticação
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showNotification('Sessão expirada. Por favor, faça login novamente.', 'error');
            return;
        }

        const userListElement = document.getElementById('userList');
        if (!userListElement) {
            console.warn('Elemento de lista de usuários não encontrado');
            return;
        }

        // Mostrar loader
        userListElement.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 30px;">
                    <div class="loader">
                        <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #667eea;"></i>
                        <span style="display: block; margin-top: 10px;">Carregando usuários...</span>
                    </div>
                </td>
            </tr>
        `;

        // Carregar usuários do backend
        console.log('Carregando usuários do backend...');
        const usuarios = await loadUsers();

        // *** Correção aplicada aqui: Verificar se 'usuarios' é um array válido antes de tentar iterar ***
        if (!Array.isArray(usuarios) || usuarios.length === 0) {
             console.log('Lista de usuários vazia ou inválida recebida:', usuarios); // Logar o que foi recebido

            // Se não há usuários ou a lista é inválida
            userListElement.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px;">
                        <div style="display: flex; justify-content: center; align-items: center; flex-direction: column;">
                            <div style="margin-bottom: 15px;">
                                <i class="fas fa-users-slash" style="font-size: 24px; color: #667eea;"></i>
                            </div>
                            <span>Nenhum usuário cadastrado.</span>
                            <button onclick="openModal('addUserModal')" class="config-save-btn" style="margin-top: 15px; padding: 8px 12px;">
                                <i class="fas fa-user-plus"></i> Adicionar Usuário
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return; // Importante: sair da função se não há usuários ou a lista é inválida
        }

        // Renderizar usuários
        userListElement.innerHTML = ''; // Limpa o loader ou mensagem

        // Obter usuário atual
        const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
        console.log('Usuário atual:', currentUser);
        const currentUserRole = currentUser.role || currentUser.cargo;
        const isAdmin = currentUserRole === 'admin';

        console.log('Renderizando', usuarios.length, 'usuário(s)...'); // Log antes do loop

        // Iterar e construir linhas da tabela
        usuarios.forEach(user => {
             // *** Pode adicionar um try-catch individual para cada iteração se houver suspeita de erro na renderização ***
             try {
                const userId = user._id || user.id;
                const isCurrentUser = currentUser._id === userId || currentUser.id === userId;
                const userActive = user.isActive !== false;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div class="user-photo">
                            ${isImagemValida(user.photo)
                                ? `<img src="${user.photo}" alt="${user.name || user.nome || 'Usuário'}" class="user-photo" />`
                                : `<div class="no-avatar"><i class="fas fa-user"></i></div>`
                            }
                        </div>
                        <div class="user-name">
                            ${user.name || user.nome || 'Sem nome'}
                            ${isCurrentUser ? '<span class="current-user-badge">Você</span>' : ''}
                        </div>
                    </td>
                    <td>${user.email || 'Sem email'}</td>
                    <td>${formatarCargo(user.cargo)}</td>
                    <td><span class="user-id">${userId}</span></td>
                    <td>
                        <span class="status-badge ${userActive ? 'status-active' : 'status-inactive'}">
                            ${userActive ? 'Ativo' : 'Inativo'}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <!-- Botão de editar (visível para todos) -->
                            <button class="action-btn" onclick="openEditUserModal('${userId}')" title="Editar Usuário">
                                <i class="fas fa-edit"></i>
                            </button>

                            ${!isCurrentUser ? `
                                <!-- Botão de ativar/desativar (não disponível para o próprio usuário) -->
                                <button class="action-btn ${userActive ? 'status-inactive' : 'status-active'}"
                                        onclick="toggleUserStatus('${userId}', ${userActive})"
                                        title="${userActive ? 'Desativar' : 'Ativar'} Usuário">
                                    <i class="fas fa-${userActive ? 'ban' : 'check'}"></i>
                                </button>

                                <!-- Botão de excluir (apenas para administradores) -->
                                ${isAdmin ? `
                                    <button class="action-btn delete-btn" onclick="confirmDeleteUser('${userId}')" title="Deletar Usuário">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                ` : ''}
                                ` : ''}
                        </div>
                    </td>
                `;
                userListElement.appendChild(row);
             } catch(renderError) {
                 console.error('Erro ao renderizar usuário:', user, renderError);
                 // Continuar o loop, mas logar o erro para este usuário específico
             }
        });

        console.log('Renderização da lista de usuários completa.'); // Log após o loop

    } catch (error) {
        console.error('Erro ao carregar usuários (capturado no bloco principal):', error); // Log mais detalhado do erro
        const userListElement = document.getElementById('userList');
        if (userListElement) {
            userListElement.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px; color: #e53e3e;">
                        <div style="margin-bottom: 15px;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 24px;"></i>
                        </div>
                        <span>Erro ao carregar usuários: ${error.message}</span>
                        <button onclick="carregarUsuarios()" class="config-save-btn" style="margin-top: 15px; padding: 8px 12px; background: #4a5568;">
                            <i class="fas fa-sync"></i> Tentar Novamente
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

// Função para editar usuário
window.editarUsuario = function(id) {
    try {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => (u._id || u.id) === id);
        
        if (!user) {
            showNotification('Usuário não encontrado', 'error');
            return;
        }
        
        // Usar a função openEditUserModal que já existe
        openEditUserModal(id);
        
        // Mostrar notificação informativa
        showNotification(`Editando usuário: ${user.name}. Altere os dados e clique em Salvar Alterações.`, 'info');
    } catch (error) {
        console.error('Erro ao editar usuário:', error);
        showNotification('Erro ao editar usuário', 'error');
    }
};

// Adicionar função para confirmar exclusão de usuário
window.confirmDeleteUser = function(userId) {
    console.log('[confirmDeleteUser] Iniciada para userId:', userId);
    if (!checkAuth()) {
        console.log('[confirmDeleteUser] checkAuth() falhou. Retornando.');
        return;
    }
    console.log('[confirmDeleteUser] checkAuth() passou.');
    
    try {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => (u._id || u.id) === userId);
        
        if (!user) {
            showNotification('Usuário não encontrado', 'error');
            return;
        }
        
        // Não permite excluir o próprio usuário
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && (currentUser.id === userId || currentUser._id === userId)) {
            showNotification('Você não pode excluir sua própria conta', 'error');
            return;
        }
        
        console.log('Confirmando exclusão do usuário:', user.name, 'ID:', userId);
        
        // Usar diálogo de confirmação personalizado
        showConfirmDialog(
            `Tem certeza que deseja <strong>excluir permanentemente</strong> o usuário <strong>${user.name}</strong>?<br><br>Esta ação não pode ser desfeita.`, 
            async () => {
                try {
                    // Mostrar indicador de carregamento
                    const loadingNotification = showNotification('Excluindo usuário...', 'info');
                    
                    // Chamar a API para excluir o usuário
                    const result = await deletarUsuario(userId);
                    
                    console.log('Resultado da exclusão:', result);
                    
                    // Remover o usuário da lista local se for exclusão real
                    // ou atualizar o status se foi apenas desativado
                    if (result.user) {
                        // Usuário foi apenas desativado
                        const userIndex = users.findIndex(u => (u._id || u.id) === userId);
                        if (userIndex !== -1) {
                            users[userIndex].isActive = false;
                            localStorage.setItem('users', JSON.stringify(users));
                        }
                        showNotification(result.message || 'Usuário desativado com sucesso', 'success');
                    } else {
                        // Usuário foi realmente excluído
                        const updatedUsers = users.filter(u => (u._id || u.id) !== userId);
                        localStorage.setItem('users', JSON.stringify(updatedUsers));
                        showNotification(`Usuário ${user.name} excluído com sucesso`, 'success');
                    }
                    
                    // Recarregar a lista em qualquer caso
                    await carregarUsuarios();
                } catch (error) {
                    console.error('Erro ao excluir usuário:', error);
                    
                    // Se o erro for 403, provavelmente é porque o usuário não tem permissão
                    if (error.message && error.message.includes('403')) {
                        showNotification('Você não tem permissão para excluir este usuário. Tente desativá-lo em vez disso.', 'error');
                    } else {
                        showNotification(`Erro ao excluir usuário: ${error.message}. Tente desativá-lo em vez de excluí-lo.`, 'error');
                    }
                    
                    // Atualizar a lista mesmo em caso de erro
                    await carregarUsuarios();
                }
            }
        );
    } catch (error) {
        console.error('Erro ao preparar exclusão de usuário:', error);
        showNotification(`Erro: ${error.message}`, 'error');
    }
}

// Função para mostrar notificações
function showNotification(message, type = 'info') {
    // Remover notificações existentes do mesmo tipo
    const existingNotifications = document.querySelectorAll(`.notification.${type}`);
    existingNotifications.forEach(notification => {
        // Adicionar classe de saída para animação
        notification.classList.add('notification-exit');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    });
    
    // Definir ícones e cores com base no tipo
    const icons = {
        'success': '<i class="fas fa-check-circle"></i>',
        'error': '<i class="fas fa-exclamation-circle"></i>',
        'warning': '<i class="fas fa-exclamation-triangle"></i>',
        'info': '<i class="fas fa-info-circle"></i>'
    };
    
    // Criar elemento de notificação
    const notification = document.createElement('div');
    const notificationId = 'notification-' + Date.now();
    notification.id = notificationId;
    notification.className = `notification ${type}`;
    
    // Adicionar título com base no tipo
    const titles = {
        'success': 'Sucesso!',
        'error': 'Erro!',
        'warning': 'Atenção!',
        'info': 'Informação'
    };
    
    notification.innerHTML = `
        <div class="notification-icon">${icons[type] || icons.info}</div>
        <div class="notification-content">
            <div class="notification-title">${titles[type] || titles.info}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" aria-label="Fechar notificação">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Adicionar ao corpo do documento
    document.body.appendChild(notification);
    
    // Adicionar evento de clique para fechar a notificação
    const closeButton = notification.querySelector('.notification-close');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            notification.classList.add('notification-exit');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        });
    }
    
    // Remover notificação após 5 segundos (apenas para sucesso e info)
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            if (notification && notification.parentElement) {
                notification.classList.add('notification-exit');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
    
    // Retornar o ID da notificação para referência futura
    return notificationId;
}

// Adicionar estilos dinâmicos para notificações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .status-badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
    }
    
    .status-badge.active {
        background: #e8f5e9;
        color: #2e7d32;
    }
    
    .status-badge.inactive {
        background: #ffebee;
        color: #c62828;
    }
`;
document.head.appendChild(style);

// Adicionar estilos para cargo-badge
const cargoStyle = document.createElement('style');
cargoStyle.textContent = `
    .cargo-badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 500;
        background: #e3e8f0;
        color: #333;
        text-transform: capitalize;
        display: inline-block;
    }
    .cargo-badge.cargo-admin { background: #e8f5e9; color: #2e7d32; }
    .cargo-badge.cargo-gerente { background: #fffde7; color: #fbc02d; }
    .cargo-badge.cargo-atendente { background: #e3f2fd; color: #1976d2; }
    .cargo-badge.cargo-vendedor { background: #fce4ec; color: #c2185b; }
    .cargo-badge.cargo-producao { background: #ede7f6; color: #512da8; }
    .cargo-badge.cargo-outro { background: #f5f5f5; color: #616161; }
`;
document.head.appendChild(cargoStyle);

// Adicionar estilos para role-badge e id-badge
const roleStyle = document.createElement('style');
roleStyle.textContent = `
    .role-badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 500;
        background: #e3e8f0;
        color: #333;
        text-transform: capitalize;
        display: inline-block;
    }
    .role-badge.role-admin { background: #e8f5e9; color: #2e7d32; }
    .role-badge.role-user { background: #e3f2fd; color: #1976d2; }
    .id-badge {
        font-family: monospace;
        font-size: 12px;
        background: #f5f5f5;
        color: #616161;
        padding: 2px 8px;
        border-radius: 8px;
        display: inline-block;
    }
`;
document.head.appendChild(roleStyle);

// Adicionar eventos para pré-visualização de fotos
document.addEventListener('DOMContentLoaded', function() {
    // Configurar pré-visualização para foto de novo usuário
    const novoPhotoInput = document.getElementById('novoPhotoInput');
    const novoPhotoPreview = document.getElementById('novoPhotoPreview');
    
    if (novoPhotoInput && novoPhotoPreview) {
        novoPhotoInput.addEventListener('change', function() {
            previewPhoto(this, novoPhotoPreview);
        });
    }
    
    // Configurar pré-visualização para foto de perfil
    const perfilPhotoInput = document.getElementById('perfilPhotoInput');
    const perfilPhotoPreview = document.getElementById('perfilPhotoPreview');
    
    if (perfilPhotoInput && perfilPhotoPreview) {
        perfilPhotoInput.addEventListener('change', function() {
            previewPhoto(this, perfilPhotoPreview);
        });
    }
});

// Função para pré-visualizar foto
function previewPhoto(input, previewElement) {
    if (!input.files || !input.files[0]) {
        return;
    }
    
    const file = input.files[0];
    
    // Verificar se é uma imagem
    if (!file.type.match('image.*')) {
        showNotification('O arquivo selecionado não é uma imagem válida.', 'error');
        input.value = '';
        return;
    }
    
    // Verificar tamanho (limitar a 5MB)
    if (file.size > 5000000) {
        showNotification('A imagem é muito grande (máximo 5MB). Será comprimida ao salvar.', 'warning');
    }
    
    // Limpar o conteúdo atual do preview
    while (previewElement.firstChild) {
        previewElement.removeChild(previewElement.firstChild);
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.onload = function() {
            // Adicionar classe para animação de entrada
            img.classList.add('photo-preview-fade-in');
        };
        img.onerror = function() {
            showNotification('Erro ao carregar a imagem.', 'error');
            const icon = document.createElement('i');
            icon.className = 'fas fa-user';
            previewElement.appendChild(icon);
        };
        previewElement.appendChild(img);
    };
    reader.onerror = function() {
        showNotification('Erro ao ler o arquivo.', 'error');
    };
    reader.readAsDataURL(file);
}

// Função para verificar parâmetros da URL
function checkUrlParameters() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const section = urlParams.get('section');
        
        if (section === 'perfil') {
            // Abrir modal de edição de perfil
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (currentUser) {
                document.getElementById('modalProfileNome').value = currentUser.name || '';
                document.getElementById('modalProfileEmail').value = currentUser.email || '';
                document.getElementById('modalProfileCargo').value = currentUser.cargo || '';
                document.getElementById('modalProfileSenha').value = '';
                
                // Carregar foto do perfil
                const photoPreview = document.getElementById('modalProfilePhotoPreview');
                if (photoPreview) {
                    while (photoPreview.firstChild) {
                        photoPreview.removeChild(photoPreview.firstChild);
                    }
                    
                    if (currentUser.photo) {
                        const img = document.createElement('img');
                        img.src = currentUser.photo;
                        photoPreview.appendChild(img);
                    } else {
                        const icon = document.createElement('i');
                        icon.className = 'fas fa-user';
                        photoPreview.appendChild(icon);
                    }
                }
                
                openModal('editProfileModal');
            }
        } else if (section === 'adicionar') {
            // Abrir modal de adicionar usuário
            const form = document.getElementById('addUserModalForm');
            if (form) form.reset();
            
            const photoPreview = document.getElementById('modalNovoPhotoPreview');
            if (photoPreview) {
                while (photoPreview.firstChild) {
                    photoPreview.removeChild(photoPreview.firstChild);
                }
                const icon = document.createElement('i');
                icon.className = 'fas fa-user';
                photoPreview.appendChild(icon);
            }
            
            openModal('addUserModal');
        }
        
        // Limpar a URL para não repetir a ação se a página for recarregada
        history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
        console.error('Erro ao verificar parâmetros da URL:', error);
    }
}

// Funções para gerenciar os modais
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        
        // Importante: Reconfigurar os botões de toggle de senha quando o modal é aberto
        setupPasswordToggles();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Configurar todos os toggles de senha
function setupPasswordToggles() {
    console.log("Configurando botões de toggle de senha...");
    
    const toggleElements = [
        { buttonId: 'toggleModalNovaSenha', inputId: 'modalNovaSenha' },
        { buttonId: 'toggleModalEditSenha', inputId: 'modalEditSenha' },
        { buttonId: 'toggleModalProfileSenha', inputId: 'modalProfileSenha' }
    ];
    
    toggleElements.forEach(element => {
        const toggleButton = document.getElementById(element.buttonId);
        const passwordInput = document.getElementById(element.inputId);
        
        if (toggleButton && passwordInput) {
            // Remover evento anterior para evitar duplicação
            const newButton = toggleButton.cloneNode(true);
            toggleButton.parentNode.replaceChild(newButton, toggleButton);
            
            newButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            });
        } else {
            console.warn(`Botão de toggle de senha não encontrado: ${element.buttonId} ou ${element.inputId}`);
        }
    });
}

// Adicionar evento para abrir modal de adicionar usuário
function setupAddUserModal() {
    const formElement = document.getElementById('addUserModalForm');
    if (!formElement) {
        console.error('Formulário de adicionar usuário não encontrado');
        return;
    }
    
    console.log('Configurando modal de adicionar usuário');
    
    // Configurar botões de upload de foto
    setupPhotoUpload('modalNovoPhotoBtn', 'modalNovoPhotoInput', 'modalNovoPhotoPreview');
    
    // Adicionar evento de submit
    formElement.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            const nome = document.getElementById('modalNovoNome').value.trim();
            const email = document.getElementById('modalNovoEmail').value.trim();
            const cargo = document.getElementById('modalNovoCargo').value;
            const role = "admin"; // Forçando o papel para admin, independentemente do campo no formulário
            const senha = document.getElementById('modalNovaSenha').value;
            const photoInput = document.getElementById('modalNovoPhotoInput');
            
            // Validar campos obrigatórios
            if (!nome || !email || !cargo || !role || !senha) {
                showToast('Preencha todos os campos obrigatórios', 'error');
                return;
            }
            
            // Mostrar indicador de carregamento
            const submitBtn = formElement.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adicionando...';
            submitBtn.disabled = true;
            
            try {
                // Criar o objeto de dados do usuário
                const userData = {
                    name: nome,
                    email: email,
                    cargo: cargo,
                    role: role,
                    password: senha
                };
                
                // Adicionar a foto se existir
                if (photoInput && photoInput.files && photoInput.files.length > 0) {
                    console.log('Foto selecionada para o novo usuário:', photoInput.files[0].name);
                    userData.photoInput = photoInput;
                }
                
                // Salvar o usuário
                console.log('Enviando dados para criar usuário:', {...userData, password: '******'});
                const result = await saveUser(userData);
                
                if (result && result.user) {
                    console.log('Usuário criado com sucesso:', result.user.name);
                    showToast('Usuário adicionado com sucesso!', 'success');
                    
                    // Fechar o modal
                    closeModal('addUserModal');
                    
                    // Recarregar a lista de usuários
                    await carregarUsuarios();
                }
            } catch (error) {
                console.error('Erro ao salvar usuário:', error);
                showToast(error.message || 'Erro ao adicionar usuário', 'error');
            } finally {
                // Restaurar o botão
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error('Erro ao processar formulário:', error);
            showToast('Erro ao processar formulário: ' + (error.message || 'Erro desconhecido'), 'error');
        }
    });
}

// Configurar modal de edição de usuário
function setupEditUserModal() {
    // Configurar botões de upload de foto
    setupPhotoUpload('modalEditPhotoBtn', 'modalEditPhotoInput', 'modalEditPhotoPreview');
    
    // Adicionar evento de submit
    const form = document.getElementById('editUserModalForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                const userId = document.getElementById('editUserId').value;
                const nome = document.getElementById('modalEditNome').value.trim();
                const email = document.getElementById('modalEditEmail').value.trim();
                const cargo = document.getElementById('modalEditCargo').value;
                // Sempre usar 'admin' como papel para todos os usuários
                const role = 'admin';
                const status = document.getElementById('modalEditStatus').value;
                const senha = document.getElementById('modalEditSenha').value;
                const photoInput = document.getElementById('modalEditPhotoInput');
                
                // Validar campos obrigatórios
                if (!userId || !nome || !email || !cargo) {
                    showToast('Preencha todos os campos obrigatórios', 'error');
                    return;
                }
                
                // Mostrar indicador de carregamento
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
                submitBtn.disabled = true;
                
                try {
                    // Preparar dados para atualização com TODOS os campos obrigatórios
                    const updateData = {
                        nome: nome,
                        email: email,
                        cargo: cargo,
                        role: role, // Sempre usar 'admin'
                        isActive: status === 'ativo'
                    };
                    
                    // Adicionar senha apenas se foi fornecida
                    if (senha && senha.trim()) {
                        updateData.senha = senha;
                    }
                    
                    // Adicionar foto se foi selecionada
                    if (photoInput && photoInput.files && photoInput.files.length > 0) {
                        console.log('Foto selecionada para edição de usuário');
                        updateData.photoInput = photoInput;
                    }
                    
                    console.log('Enviando atualização de usuário:', userId);
                    console.log('Dados de atualização:', {
                        ...updateData,
                        senha: updateData.senha ? '******' : undefined,
                        photoInput: updateData.photoInput ? 'present' : 'absent'
                    });
                    
                    // Atualizar usuário
                    const result = await updateUserProfile(userId, updateData);
                    
                    if (result && result.user) {
                        // Recarregar lista de usuários
                        await carregarUsuarios();
                        
                        // Fechar modal
                        closeModal('editUserModal');
                        
                        // Mostrar notificação de sucesso
                        showToast('Usuário atualizado com sucesso!', 'success');
                    }
                } catch (error) {
                    console.error('Erro ao atualizar usuário:', error);
                    showToast(error.message || 'Erro ao atualizar usuário', 'error');
                } finally {
                    // Resetar botão de submit
                    submitBtn.innerHTML = originalText || '<i class="fas fa-save"></i> Salvar Alterações';
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error('Erro ao processar formulário:', error);
                showToast('Erro ao processar formulário: ' + (error.message || 'Erro desconhecido'), 'error');
            }
        });
    } else {
        console.error('Formulário de edição de usuário não encontrado');
    }
}

// Configurar modal de edição de perfil próprio
function setupEditProfileModal() {
    const editProfileForm = document.getElementById('editProfileModalForm');
    
    if (editProfileForm) {
        // Remover o event listener anterior com clone
        const newForm = editProfileForm.cloneNode(true);
        editProfileForm.parentNode.replaceChild(newForm, editProfileForm);
        
        // Referência ao formulário clonado
        const form = newForm;
        
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                const userAvatar = document.getElementById('headerUserAvatar');
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                
                if (!currentUser || !currentUser._id) {
                    showToast('Sessão expirada. Por favor, faça login novamente.', 'error');
                    return;
                }
                
                // Obter os valores do formulário
                const nome = document.getElementById('modalProfileNome').value;
                const email = document.getElementById('modalProfileEmail').value;
                const cargo = document.getElementById('modalProfileCargo').value;
                const senha = document.getElementById('modalProfileSenha').value;
                
                // Obter o input de foto mais recente (após clonagem)
                const photoInput = form.querySelector('#modalProfilePhotoInput');
                if (!photoInput) {
                    console.error('Input de foto do perfil não encontrado no formulário!');
                }
                
                // Verificar se o usuário selecionou uma nova foto
                let hasNewPhoto = photoInput && photoInput.files && photoInput.files.length > 0;
                if (hasNewPhoto) {
                    console.log('Arquivo de foto selecionado:', photoInput.files[0]);
                } else {
                    console.log('Nenhuma nova foto selecionada.');
                }
                
                // Mostrar loading
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
                
                // Construir dados para enviar
                const userData = {
                    id: currentUser._id,
                    name: nome,
                    nome: nome,
                    email: email,
                    cargo: cargo,
                    role: currentUser.role || 'user'
                };
                
                // Adicionar senha apenas se preenchida
                if (senha && senha.trim()) {
                    userData.senha = senha;
                }
                
                // Processar a foto se uma nova foi selecionada
                if (hasNewPhoto) {
                    console.log('Nova foto selecionada, processando...');
                    userData.photoInput = photoInput;
                }
                
                try {
                    console.log('Atualizando perfil do usuário...');
                    const updatedUser = await updateUserProfile(currentUser._id, userData);
                    
                    console.log('Perfil atualizado com sucesso:', updatedUser);
                    
                    // Atualizar dados no localStorage
                    const updatedUserData = updatedUser.user || updatedUser;
                    
                    // Garantir que a foto foi corretamente atualizada
                    if (hasNewPhoto && !updatedUserData.photo) {
                        // Se a foto não foi incluída na resposta, buscar os dados atualizados do usuário
                        console.log('Foto não incluída na resposta, buscando dados atualizados do usuário...');
                        
                        try {
                            const authToken = localStorage.getItem('authToken');
                            if (authToken) {
                                const userResponse = await fetch(`https://backend-4ybn.vercel.app/api/usuarios/${currentUser._id}`, {
                                    headers: {
                                        'Authorization': `Bearer ${authToken}`
                                    }
                                });
                                
                                if (userResponse.ok) {
                                    const fullUserData = await userResponse.json();
                                    updatedUserData.photo = fullUserData.photo;
                                    console.log('Dados completos do usuário obtidos com sucesso, incluindo foto');
                                }
                            }
                        } catch (fetchError) {
                            console.error('Erro ao buscar dados completos do usuário:', fetchError);
                        }
                    }
                    
                    // Atualizar o localStorage
                    localStorage.setItem('currentUser', JSON.stringify({
                        ...currentUser,
                        ...updatedUserData
                    }));
                    
                    // Atualizar a foto no header
                    if (userAvatar) {
                        // Limpar conteúdo atual
                        while (userAvatar.firstChild) {
                            userAvatar.removeChild(userAvatar.firstChild);
                        }
                        
                        if (updatedUserData.photo) {
                            const img = document.createElement('img');
                            img.src = updatedUserData.photo;
                            img.alt = updatedUserData.name || 'Usuário';
                            userAvatar.appendChild(img);
                        } else {
                            const icon = document.createElement('i');
                            icon.className = 'fas fa-user';
                            userAvatar.appendChild(icon);
                        }
                    }
                    
                    showToast('Perfil atualizado com sucesso!', 'success');
                    
                    // Atualizar informações do usuário no topbar
                    if (typeof atualizarInfoUsuario === 'function') {
                        atualizarInfoUsuario();
                    }
                    
                    // Fechar o modal
                    closeModal('editProfileModal');
                } catch (error) {
                    console.error('Erro ao atualizar perfil:', error);
                    showToast(`Erro ao atualizar perfil: ${error.message || 'Erro desconhecido'}`, 'error');
                } finally {
                    // Restaurar o botão
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            } catch (error) {
                console.error('Erro no processamento do formulário:', error);
                showToast('Erro ao processar o formulário', 'error');
            }
        });
    }
}

// Função para abrir o modal de edição de usuário a partir da lista
window.openEditUserModal = function(userId) {
    if (!checkAuth()) return;
    
    try {
        // Carregar dados atualizados do usuário
        const loadUserData = async () => {
            try {
                console.log('Carregando dados do usuário para edição:', userId);
                
                // Tentar buscar do backend primeiro
                const authToken = localStorage.getItem('authToken');
                if (!authToken) {
                    throw new Error('Sessão expirada. Por favor, faça login novamente.');
                }
                
                const response = await fetch(`https://backend-4ybn.vercel.app/api/usuarios/${userId}`, {
                    headers: {
                        'Authorization': 'Bearer ' + authToken
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Erro ao buscar usuário: ${response.status}`);
                }
                
                const user = await response.json();
                return user;
            } catch (error) {
                console.warn('Erro ao buscar do backend, tentando localStorage:', error);
                
                // Fallback para localStorage
                const users = JSON.parse(localStorage.getItem('users')) || [];
                const user = users.find(u => (u._id || u.id) === userId);
                
                if (!user) {
                    throw new Error('Usuário não encontrado');
                }
                
                return user;
            }
        };
        
        // Carregar e preencher dados do usuário
        loadUserData().then(user => {
            console.log('Dados do usuário carregados:', user);
            
            // Preparar o modal
            document.getElementById('editUserId').value = userId;
            document.getElementById('modalEditNome').value = user.name || user.nome || '';
            document.getElementById('modalEditEmail').value = user.email || '';
            document.getElementById('modalEditCargo').value = user.cargo || 'outro';
            // Definir o papel como 'admin' para todos os usuários - não mostrar opção de alterar
            document.getElementById('modalEditRole').value = 'admin';
            document.getElementById('modalEditStatus').value = user.isActive !== false ? 'ativo' : 'inativo';
            document.getElementById('modalEditSenha').value = '';
            
            // Carregar foto do usuário se existir
            const photoPreview = document.getElementById('modalEditPhotoPreview');
            if (photoPreview) {
                // Limpar o conteúdo atual
                while (photoPreview.firstChild) {
                    photoPreview.removeChild(photoPreview.firstChild);
                }
                
                if (user.photo) {
                    // Adicionar a imagem
                    const img = document.createElement('img');
                    img.src = user.photo;
                    photoPreview.appendChild(img);
                    photoPreview.classList.add('has-photo');
                    console.log('Foto do usuário carregada no preview');
                } else {
                    // Adicionar o ícone padrão
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-user';
                    photoPreview.appendChild(icon);
                    photoPreview.classList.remove('has-photo');
                    console.log('Usuário sem foto, exibindo ícone padrão');
                }
            }
            
            // Limpar qualquer arquivo selecionado anteriormente
            const photoInput = document.getElementById('modalEditPhotoInput');
            if (photoInput) {
                photoInput.value = '';
            }
            
            // Configurar os botões de toggle de senha
            setupPasswordToggles();
            
            // Abrir o modal
            openModal('editUserModal');
        }).catch(error => {
            console.error('Erro ao carregar dados do usuário:', error);
            showToast('Erro ao carregar dados do usuário: ' + error.message, 'error');
        });
    } catch (error) {
        console.error('Erro ao abrir modal de edição:', error);
        showToast('Erro ao preparar edição: ' + error.message, 'error');
    }
};

// Configurar fechamento de modais
function setupModalClosers() {
    // Fechar ao clicar no X
    document.querySelectorAll('.close-modal').forEach(closer => {
        closer.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            if (modalId) closeModal(modalId);
        });
    });
    
    // Fechar ao clicar no botão cancelar
    document.querySelectorAll('.btn-cancel').forEach(button => {
        button.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            if (modalId) closeModal(modalId);
        });
    });
    
    // Fechar ao clicar fora do modal
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
}

// Configurar botões de ação na tabela de usuários
function configurarBotoesAcao() {
    // Botões de editar usuário
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            openEditUserModal(id);
        });
    });
    
    // Botões de ativar/desativar usuário
    document.querySelectorAll('.activate-btn, .deactivate-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            toggleUserStatus(id);
        });
    });
    
    // Botões de excluir usuário
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            confirmarExclusao(id);
        });
    });
}

// Função para inicializar a lista de usuários no localStorage
function inicializarUsuarios() {
    try {
        // Tentar carregar usuários do localStorage
        let users = JSON.parse(localStorage.getItem('users')) || [];
        
        // Verificar se é um array válido
        if (!Array.isArray(users)) {
            console.warn('Dados de usuários inválidos, reinicializando...');
            users = [];
        }
        
        // Se não houver usuários, criar um administrador padrão
        if (users.length === 0) {
            const adminUser = {
                id: 'admin-' + Date.now(),
                name: 'Administrador',
                email: 'admin@sistema.com',
                cargo: 'admin',
                role: 'admin',
                password: btoa('admin123'), // Codificação básica para não armazenar em texto puro
                isActive: true,
                createdAt: new Date().toISOString()
            };
            users.push(adminUser);
            
            // Removido: showToast('Usuário administrador padrão criado!', 'info');
        }
        
        // Salvar de volta no localStorage
        localStorage.setItem('users', JSON.stringify(users));
        
        return users;
    } catch (error) {
        console.error('Erro ao inicializar usuários:', error);
        // Em caso de erro, retornar array vazio
        return [];
    }
}

// Adicionar eventos quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async function() {
    try {
        if (!checkAuth()) return;

        console.log('Inicializando página de usuários...');

        // Inicializar usuários
        inicializarUsuarios();

        // Carregar lista de cargos PRIMEIRO
        await carregarCargos();

        // Só depois carregar lista de usuários
        await carregarUsuarios();

        // Configurar toggles de senha
        setupPasswordToggles();
        
        // Configurar uploads de foto
        setupPhotoUpload('modalNovoPhotoBtn', 'modalNovoPhotoInput', 'modalNovoPhotoPreview');
        setupPhotoUpload('modalEditPhotoBtn', 'modalEditPhotoInput', 'modalEditPhotoPreview');
        setupPhotoUpload('modalProfilePhotoBtn', 'modalProfilePhotoInput', 'modalProfilePhotoPreview');
        
        // Configurar modais
        setupAddUserModal();
        setupEditUserModal();
        setupEditProfileModal();
        setupModalClosers();
        
        // Configurar visualização adequada dos cards e seções
        document.querySelectorAll('.stats-card.clickable').forEach(card => {
            card.addEventListener('click', function() {
                const section = this.getAttribute('data-section');
                console.log('Card clicado:', section);
                
                if (section === 'perfil') {
                    // Abrir modal de edição de perfil
                    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                    if (currentUser) {
                        document.getElementById('modalProfileNome').value = currentUser.name || '';
                        document.getElementById('modalProfileEmail').value = currentUser.email || '';
                        document.getElementById('modalProfileCargo').value = currentUser.cargo || '';
                        document.getElementById('modalProfileSenha').value = '';
                        
                        // Carregar foto do perfil
                        const photoPreview = document.getElementById('modalProfilePhotoPreview');
                        if (photoPreview) {
                            while (photoPreview.firstChild) {
                                photoPreview.removeChild(photoPreview.firstChild);
                            }
                            
                            if (currentUser.photo) {
                                const img = document.createElement('img');
                                img.src = currentUser.photo;
                                photoPreview.appendChild(img);
                            } else {
                                const icon = document.createElement('i');
                                icon.className = 'fas fa-user';
                                photoPreview.appendChild(icon);
                            }
                        }
                        
                        openModal('editProfileModal');
                    }
                } else if (section === 'adicionar') {
                    // Abrir modal de adicionar usuário
                    const form = document.getElementById('addUserModalForm');
                    if (form) form.reset();
                    
                    const photoPreview = document.getElementById('modalNovoPhotoPreview');
                    if (photoPreview) {
                        while (photoPreview.firstChild) {
                            photoPreview.removeChild(photoPreview.firstChild);
                        }
                        const icon = document.createElement('i');
                        icon.className = 'fas fa-user';
                        photoPreview.appendChild(icon);
                    }
                    
                    openModal('addUserModal');
                } else if (section === 'lista') {
                    carregarUsuarios();
                }
            });
        });
        
        console.log('Página de usuários inicializada com sucesso!');
    } catch (error) {
        console.error('Erro ao inicializar página de usuários:', error);
        showNotification('Erro ao carregar a página: ' + error.message, 'error');
    }
});

// Função para configurar upload de foto
function setupPhotoUpload(buttonId, inputId, previewId) {
    const uploadButton = document.getElementById(buttonId);
    const fileInput = document.getElementById(inputId);
    const photoPreview = document.getElementById(previewId);
    
    if (uploadButton && fileInput && photoPreview) {
        console.log(`Configurando upload de foto: ${buttonId} -> ${inputId} -> ${previewId}`);
        
        // Remover listeners existentes para evitar duplicação
        const newBtn = uploadButton.cloneNode(true);
        uploadButton.parentNode.replaceChild(newBtn, uploadButton);
        
        // Criar novo input para evitar problemas com eventos acumulados
        const newInput = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(newInput, fileInput);
        
        // Limpar qualquer valor existente
        newInput.value = '';
        
        // Adicionar evento de clique ao botão (dispara o seletor de arquivo)
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log(`Botão de upload clicado: ${buttonId}`);
            newInput.click();
        });
        
        // Adicionar evento de mudança ao input de arquivo
        newInput.addEventListener('change', function(e) {
            console.log(`Input de arquivo alterado: ${inputId}`, e.target.files);
            
            if (!this.files || !this.files[0]) {
                console.log('Nenhum arquivo selecionado');
                return;
            }
            
            const file = this.files[0];
            console.log(`Arquivo selecionado: ${file.name}, tipo: ${file.type}, tamanho: ${file.size} bytes`);
            
            // Verificar se é uma imagem
            if (!file.type.match('image.*')) {
                showToast('Por favor, selecione apenas arquivos de imagem.', 'error');
                this.value = ''; // Limpar o input
                return;
            }
            
            // Verificar tamanho máximo (10MB)
            if (file.size > 10000000) {
                console.warn('Arquivo muito grande:', file.size);
                showToast('A imagem é muito grande. Será redimensionada automaticamente.', 'warning');
            }
            
            const reader = new FileReader();
            
            reader.onload = function(e) {
                console.log(`Arquivo lido com sucesso: ${file.name}`);
                
                // Limpar preview
                while (photoPreview.firstChild) {
                    photoPreview.removeChild(photoPreview.firstChild);
                }
                
                // Adicionar imagem ao preview
                const img = document.createElement('img');
                img.src = e.target.result;
                photoPreview.appendChild(img);
                photoPreview.classList.add('has-photo');
                
                // Armazenar tamanho original para debug
                console.log(`Preview gerado, tamanho base64: ${Math.round(e.target.result.length * 0.75 / 1024)}KB`);
            };
            
            reader.onerror = function(error) {
                console.error(`Erro ao ler arquivo: ${file.name}`, error);
                showToast('Não foi possível ler o arquivo de imagem.', 'error');
                
                // Limpar o input
                newInput.value = '';
            };
            
            reader.readAsDataURL(file);
        });
    } else {
        const missing = [];
        if (!uploadButton) missing.push(`botão (${buttonId})`);
        if (!fileInput) missing.push(`input (${inputId})`);
        if (!photoPreview) missing.push(`preview (${previewId})`);
        
        console.error(`Falha ao configurar upload de foto: elementos não encontrados: ${missing.join(', ')}`);
    }
}

// Função para limpar o formulário de novo usuário
function limparFormularioNovoUsuario() {
    // Limpar campos
    document.getElementById('modalNovoNome').value = '';
    document.getElementById('modalNovoEmail').value = '';
    document.getElementById('modalNovoCargo').value = '';
    document.getElementById('modalNovoRole').value = '';
    document.getElementById('modalNovaSenha').value = '';
    
    // Limpar foto
    const photoPreview = document.getElementById('modalNovoPhotoPreview');
    if (photoPreview) {
        while (photoPreview.firstChild) {
            photoPreview.removeChild(photoPreview.firstChild);
        }
        const icon = document.createElement('i');
        icon.className = 'fas fa-user';
        photoPreview.appendChild(icon);
    }
    
    // Limpar arquivo
    const photoInput = document.getElementById('modalNovoPhotoInput');
    if (photoInput) {
        photoInput.value = '';
    }
}

// Função para inicializar cargos no localStorage
function inicializarCargos() {
    try {
        // Verificar se já existem cargos salvos
        let cargos = JSON.parse(localStorage.getItem('cargos')) || [];
        // Não criar cargos padrão automaticamente
        if (!Array.isArray(cargos)) {
            cargos = [];
            localStorage.setItem('cargos', JSON.stringify(cargos));
        }
        return cargos;
    } catch (error) {
        console.error('Erro ao inicializar cargos:', error);
        return [];
    }
}

// Função para carregar lista de cargos do backend
async function carregarCargos() {
    try {
        const cargosListElement = document.getElementById('cargosList');
        if (!cargosListElement) {
            console.warn('Elemento de lista de cargos não encontrado');
            return;
        }
        // Mostrar loader
        cargosListElement.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 30px;">
                    <div class="loader">
                        <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #667eea;"></i>
                        <span style="display: block; margin-top: 10px;">Carregando cargos...</span>
                    </div>
                </td>
            </tr>
        `;
        // Buscar cargos do backend
        const authToken = localStorage.getItem('authToken');
        if (!authToken) throw new Error('Sessão expirada. Faça login novamente.');
        const response = await fetch(`${API_BASE_URL}/api/cargos`, {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        if (!response.ok) throw new Error('Erro ao buscar cargos: ' + response.statusText);
        const cargosRaw = await response.json();
        // Garante que todos os cargos tenham o campo 'id'
        const cargos = cargosRaw.map(c => ({ ...c, id: c.id || c._id }));
        window.cargosCache = cargos;
        // Carregar todos os usuários para contar quantos existem por cargo
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const usuariosPorCargo = {};
        users.forEach(user => {
            const cargo = user.cargo || 'outro';
            usuariosPorCargo[cargo] = (usuariosPorCargo[cargo] || 0) + 1;
        });
        // Se não há cargos
        if (!cargos || cargos.length === 0) {
            cargosListElement.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px;">
                        <div style="display: flex; justify-content: center; align-items: center; flex-direction: column;">
                            <div style="margin-bottom: 15px;">
                                <i class="fas fa-briefcase" style="font-size: 24px; color: #667eea;"></i>
                            </div>
                            <span>Nenhum cargo cadastrado.</span>
                            <button onclick="openModal('cargoModal')" class="config-save-btn" style="margin-top: 15px; padding: 8px 12px;">
                                <i class="fas fa-plus"></i> Adicionar Cargo
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        // Renderizar cargos
        cargosListElement.innerHTML = '';
        cargos.forEach(cargo => {
            const totalUsuarios = usuariosPorCargo[cargo.id] || 0;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${cargo.nome}</td>
                <td>${cargo.descricao || '-'}</td>
                <td>${totalUsuarios}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" onclick="editarCargo('${cargo.id}')" title="Editar Cargo">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="excluirCargo('${cargo.id}')" title="Excluir Cargo">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            `;
            cargosListElement.appendChild(row);
        });
        atualizarSelectsCargo();
        console.log('Cargos carregados do backend:', cargos.length);
    } catch (error) {
        console.error('Erro ao carregar cargos:', error);
        const cargosListElement = document.getElementById('cargosList');
        if (cargosListElement) {
            cargosListElement.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px; color: #e53e3e;">
                        <div style="margin-bottom: 15px;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 24px;"></i>
                        </div>
                        <span>Erro ao carregar cargos: ${error.message}</span>
                        <button onclick="carregarCargos()" class="config-save-btn" style="margin-top: 15px; padding: 8px 12px; background: #4a5568;">
                            <i class="fas fa-sync"></i> Tentar Novamente
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

// Função para configurar o modal de cargo
function setupCargoModal() {
    const novoCargoBotao = document.getElementById('novoCargoBotao');
    const cargoModalForm = document.getElementById('cargoModalForm');
    if (novoCargoBotao) {
        novoCargoBotao.addEventListener('click', function() {
            document.getElementById('cargoEditId').value = '';
            document.getElementById('cargoNome').value = '';
            document.getElementById('cargoDescricao').value = '';
            document.getElementById('cargoModalTitle').innerHTML = '<i class="fas fa-briefcase"></i> Adicionar Cargo';
            openModal('cargoModal');
        });
    }
    if (cargoModalForm) {
        cargoModalForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const cargoId = document.getElementById('cargoEditId').value;
            const cargoNome = document.getElementById('cargoNome').value.trim();
            let cargoDescricao = document.getElementById('cargoDescricao').value.trim();
            if (!cargoNome) {
                showToast('Nome do cargo é obrigatório', 'error');
                return;
            }
            // Se a descrição estiver vazia, repete o nome do cargo
            if (!cargoDescricao) {
                cargoDescricao = cargoNome;
            }
            try {
                const authToken = localStorage.getItem('authToken');
                if (!authToken) throw new Error('Sessão expirada. Faça login novamente.');
                let response;
                if (cargoId) {
                    // Editar cargo
                    response = await fetch(`${API_BASE_URL}/api/cargos/${cargoId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + authToken
                        },
                        body: JSON.stringify({ nome: cargoNome, descricao: cargoDescricao })
                    });
                } else {
                    // Adicionar novo cargo
                    response = await fetch(`${API_BASE_URL}/api/cargos`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + authToken
                        },
                        body: JSON.stringify({ nome: cargoNome, descricao: cargoDescricao })
                    });
                }
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Erro ao salvar cargo');
                }
                showToast('Cargo salvo com sucesso', 'success');
                closeModal('cargoModal');
                await carregarCargos();
            } catch (error) {
                console.error('Erro ao salvar cargo:', error);
                showToast('Erro ao salvar cargo: ' + error.message, 'error');
            }
        });
    }
}

// Função para editar cargo
window.editarCargo = async function(cargoId) {
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) throw new Error('Sessão expirada. Faça login novamente.');
        const response = await fetch(`${API_BASE_URL}/api/cargos/${cargoId}`, {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        if (!response.ok) throw new Error('Cargo não encontrado');
        const cargo = await response.json();
        document.getElementById('cargoEditId').value = cargoId;
        document.getElementById('cargoNome').value = cargo.nome;
        document.getElementById('cargoDescricao').value = cargo.descricao || '';
        document.getElementById('cargoNome').disabled = false;
        document.getElementById('cargoModalTitle').innerHTML = `<i class="fas fa-briefcase"></i> Editar Cargo: ${cargo.nome}`;
        openModal('cargoModal');
    } catch (error) {
        console.error('Erro ao editar cargo:', error);
        showToast('Erro ao editar cargo: ' + error.message, 'error');
    }
};

// Função para excluir cargo
window.excluirCargo = async function(cargoId) {
    try {
        // Buscar usuários do backend para verificar se algum usa este cargo
        const authToken = localStorage.getItem('authToken');
        if (!authToken) throw new Error('Sessão expirada. Faça login novamente.');
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const usuariosComCargo = users.filter(u => u.cargo === cargoId);
        // Buscar o nome do cargo pelo id
        let nomeCargo = cargoId;
        if (window.cargosCache && Array.isArray(window.cargosCache)) {
            const cargoObj = window.cargosCache.find(c => c.id === cargoId);
            if (cargoObj && cargoObj.nome) nomeCargo = cargoObj.nome;
        }
        let mensagemConfirmacao = `Tem certeza que deseja excluir o cargo <strong>${nomeCargo}</strong>?`;
        if (usuariosComCargo.length > 0) {
            mensagemConfirmacao += `<br><br><strong>Atenção:</strong> Existem ${usuariosComCargo.length} usuário(s) com este cargo. Não é permitido excluir um cargo que está em uso!`;
        }
        showConfirmDialog(
            mensagemConfirmacao,
            async () => {
                try {
                    if (usuariosComCargo.length > 0) {
                        showToast('Não é permitido excluir um cargo que está em uso por usuários!', 'error');
                        return;
                    }
                    const response = await fetch(`${API_BASE_URL}/api/cargos/${cargoId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': 'Bearer ' + authToken }
                    });
                    if (!response.ok) throw new Error('Erro ao excluir cargo');
                    showToast('Cargo excluído com sucesso', 'success');
                    await carregarCargos();
                } catch (error) {
                    console.error('Erro ao excluir cargo:', error);
                    showToast('Erro ao excluir cargo: ' + error.message, 'error');
                }
            }
        );
    } catch (error) {
        console.error('Erro ao excluir cargo:', error);
        showToast('Erro ao excluir cargo: ' + error.message, 'error');
    }
};

// Função para atualizar todos os selects de cargo na aplicação
function atualizarSelectsCargo() {
    try {
        const cargos = window.cargosCache || [];
        const selectsCargo = [
            'modalNovoCargo',
            'modalEditCargo'
        ];
        selectsCargo.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const valorAtual = select.value;
                select.innerHTML = '';
                if (selectId === 'modalNovoCargo') {
                    const optionVazio = document.createElement('option');
                    optionVazio.value = '';
                    optionVazio.textContent = 'Selecione o cargo';
                    select.appendChild(optionVazio);
                }
                cargos.forEach(cargo => {
                    const option = document.createElement('option');
                    option.value = cargo.id;
                    option.textContent = cargo.nome;
                    select.appendChild(option);
                });
                if (valorAtual && cargos.some(c => c.id === valorAtual)) {
                    select.value = valorAtual;
                }
            }
        });
    } catch (error) {
        console.error('Erro ao atualizar selects de cargo:', error);
    }
}

// Adicionar à inicialização da página
// Remover inicializarCargos();
document.addEventListener('DOMContentLoaded', function() {
    carregarCargos();
    setupCargoModal();
}); 

// Função utilitária para validar se a foto é uma imagem válida
function isImagemValida(foto) {
    if (!foto) return false;
    return (
        foto.startsWith('data:image') ||
        foto.startsWith('http://') ||
        foto.startsWith('https://')
    );
} 