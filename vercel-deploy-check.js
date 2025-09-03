/**
 * Script para verificar se o deploy está configurado corretamente
 * Execute este script após o deploy para verificar se tudo está funcionando
 * 
 * Uso: node vercel-deploy-check.js https://seu-dominio.vercel.app
 */

const fetch = require('node-fetch');

// Obtém a URL base do argumento de linha de comando
const baseUrl = process.argv[2];

if (!baseUrl) {
  console.error('Por favor, forneça a URL base do seu deploy.');
  console.error('Exemplo: node vercel-deploy-check.js https://seu-dominio.vercel.app');
  process.exit(1);
}

// Cores para console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

/**
 * Verifica uma URL e retorna o resultado
 */
async function checkUrl(url, description) {
  console.log(`\n${colors.blue}Verificando ${description}...${colors.reset}`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url);
    const status = response.status;
    
    if (status >= 200 && status < 300) {
      console.log(`${colors.green}✓ OK (${status})${colors.reset}`);
      
      try {
        const data = await response.json();
        console.log(`${colors.blue}Resposta:${colors.reset}`);
        console.log(JSON.stringify(data, null, 2));
        return { success: true, data };
      } catch (e) {
        console.log(`${colors.yellow}Resposta não é JSON válido${colors.reset}`);
        const text = await response.text();
        console.log(`${colors.blue}Resposta (texto):${colors.reset}`);
        console.log(text.substring(0, 500) + (text.length > 500 ? '...' : ''));
        return { success: true, text };
      }
    } else {
      console.log(`${colors.red}✗ Erro (${status})${colors.reset}`);
      try {
        const text = await response.text();
        console.log(`${colors.red}Resposta:${colors.reset}`);
        console.log(text.substring(0, 500) + (text.length > 500 ? '...' : ''));
      } catch (e) {
        console.log(`${colors.red}Não foi possível ler a resposta${colors.reset}`);
      }
      return { success: false, status };
    }
  } catch (error) {
    console.log(`${colors.red}✗ Erro: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

/**
 * Verifica todas as URLs importantes
 */
async function checkDeploy() {
  console.log(`${colors.blue}Verificando deploy em: ${baseUrl}${colors.reset}\n`);
  
  // Verifica a página principal
  const mainResult = await checkUrl(baseUrl, 'página principal');
  
  // Verifica o health check do backend
  const backendHealthResult = await checkUrl(`${baseUrl}/api/health`, 'health check do backend');
  
  // Verifica o health check do frontend
  const frontendHealthResult = await checkUrl(`${baseUrl}/frontend-health`, 'health check do frontend');
  
  // Resumo
  console.log(`\n${colors.blue}=== RESUMO ====${colors.reset}`);
  console.log(`Página principal: ${mainResult.success ? colors.green + '✓ OK' : colors.red + '✗ Erro'}${colors.reset}`);
  console.log(`Health check do backend: ${backendHealthResult.success ? colors.green + '✓ OK' : colors.red + '✗ Erro'}${colors.reset}`);
  console.log(`Health check do frontend: ${frontendHealthResult.success ? colors.green + '✓ OK' : colors.red + '✗ Erro'}${colors.reset}`);
  
  // Verifica se o backend está se comunicando com o MongoDB
  if (backendHealthResult.success && backendHealthResult.data && backendHealthResult.data.database) {
    console.log(`\n${colors.blue}Status do banco de dados: ${backendHealthResult.data.database === 'connected' ? colors.green + 'Conectado' : colors.red + 'Desconectado'}${colors.reset}`);
  }
  
  // Verifica se o frontend está se comunicando com o backend
  if (frontendHealthResult.success && frontendHealthResult.data && frontendHealthResult.data.backend) {
    console.log(`\n${colors.blue}Comunicação frontend-backend: ${frontendHealthResult.data.backend.status === 'ok' ? colors.green + 'OK' : colors.red + 'Falha'}${colors.reset}`);
  }
  
  // Recomendações
  console.log(`\n${colors.yellow}=== RECOMENDAÇÕES ====${colors.reset}`);
  
  if (!backendHealthResult.success) {
    console.log(`${colors.red}✗ O backend não está respondendo. Verifique:${colors.reset}`);
    console.log(`  - As variáveis de ambiente no Vercel (MONGODB_URI, JWT_SECRET, etc.)`);
    console.log(`  - Os logs do Vercel para erros específicos`);
    console.log(`  - Se o arquivo vercel.json está configurado corretamente`);
  }
  
  if (!frontendHealthResult.success) {
    console.log(`${colors.red}✗ O frontend não está conseguindo se comunicar com o backend. Verifique:${colors.reset}`);
    console.log(`  - Se as URLs da API estão configuradas corretamente`);
    console.log(`  - Se o CORS está configurado corretamente`);
  }
  
  if (backendHealthResult.success && backendHealthResult.data && backendHealthResult.data.database !== 'connected') {
    console.log(`${colors.red}✗ O backend não está conectado ao MongoDB. Verifique:${colors.reset}`);
    console.log(`  - Se a variável MONGODB_URI está configurada corretamente`);
    console.log(`  - Se o MongoDB Atlas está acessível`);
    console.log(`  - Se o IP do Vercel está na lista de IPs permitidos do MongoDB Atlas`);
  }
}

// Executa a verificação
checkDeploy().catch(error => {
  console.error(`${colors.red}Erro não tratado:${colors.reset}`, error);
}); 