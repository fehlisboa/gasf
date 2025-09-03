document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberCheckbox = document.getElementById('remember');
    const loginButton = document.getElementById('loginButton');
    const buttonText = loginButton.querySelector('.button-text');
    const loadingSpinner = loginButton.querySelector('.loading-spinner');
    const togglePassword = document.getElementById('togglePassword');
    const eyeIcon = togglePassword.querySelector('i');
    const generalError = document.getElementById('generalError');

    // Função para mostrar loading
    function showLoading() {
        buttonText.classList.add('hide');
        loadingSpinner.classList.add('show');
        loginButton.disabled = true;
    }

    // Função para esconder loading
    function hideLoading() {
        buttonText.classList.remove('hide');
        loadingSpinner.classList.remove('show');
        loginButton.disabled = false;
    }

    // Função para mostrar mensagem de erro
    function showError(message) {
        generalError.textContent = message;
        generalError.classList.add('show');
    }

    // Função para esconder mensagem de erro
    function hideError() {
        generalError.classList.remove('show');
    }

    // Event listener para o formulário de login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Validação básica
        if (!email || !password) {
            showError('Por favor, preencha todos os campos');
            return;
        }

        showLoading();
        hideError();

        try {
            // Fazer a requisição de login
            const response = await fetch('https://backend-4ybn.vercel.app/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            // Verificar a resposta
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao fazer login');
            }

            // Obter os dados da resposta
            const data = await response.json();

            // Salvar o token de autenticação
            if (data.token) {
                localStorage.setItem('authToken', data.token);
            }

            // Salvar as informações do usuário
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }

            // Gerenciar o email salvo baseado no checkbox
            if (rememberCheckbox.checked) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            // Redirecionar para o dashboard
            window.location.href = '/dashboard';

        } catch (error) {
            console.error('Erro no login:', error);
            showError(error.message || 'Erro ao fazer login. Por favor, tente novamente.');
        } finally {
            hideLoading();
        }
    });

    // Verificar se há email salvo
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberCheckbox.checked = true;
    }

    // Adiciona funcionalidade de mostrar/ocultar senha
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        eyeIcon.classList.toggle('fa-eye');
        eyeIcon.classList.toggle('fa-eye-slash');
    });
});
