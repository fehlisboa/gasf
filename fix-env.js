/**
 * Script para verificar e corrigir o arquivo .env do backend
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const backendEnvPath = path.join(__dirname, 'backend', '.env');
const backendEnvExamplePath = path.join(__dirname, 'backend', 'env.example');

// Cores para console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

/**
 * Verifica se o arquivo .env existe e está configurado corretamente
 */
async function checkAndFixEnv() {
  console.log(`${colors.blue}Verificando arquivo .env do backend...${colors.reset}`);
  
  // Verifica se o arquivo .env existe
  if (!fs.existsSync(backendEnvPath)) {
    console.log(`${colors.yellow}Arquivo .env não encontrado. Criando a partir do exemplo...${colors.reset}`);
    
    // Copia o arquivo env.example para .env
    fs.copyFileSync(backendEnvExamplePath, backendEnvPath);
    console.log(`${colors.green}Arquivo .env criado com sucesso!${colors.reset}`);
  }
  
  // Lê o conteúdo do arquivo .env
  let envContent = fs.readFileSync(backendEnvPath, 'utf8');
  
  // Verifica se as variáveis obrigatórias estão definidas
  const requiredVars = [
    'MONGODB_URI',
    'ADMIN_PASSWORD',
    'JWT_SECRET',
    'PORT',
    'NODE_ENV'
  ];
  
  let missingVars = [];
  let hasChanged = false;
  
  // Verifica cada variável obrigatória
  for (const varName of requiredVars) {
    if (!envContent.includes(`${varName}=`)) {
      missingVars.push(varName);
    }
  }
  
  // Se houver variáveis faltando, adiciona-as ao arquivo
  if (missingVars.length > 0) {
    console.log(`${colors.yellow}Variáveis faltando no arquivo .env: ${missingVars.join(', ')}${colors.reset}`);
    
    // Adiciona as variáveis faltando ao arquivo
    for (const varName of missingVars) {
      let defaultValue = '';
      
      switch (varName) {
        case 'MONGODB_URI':
          defaultValue = 'mongodb+srv://seu_usuario:sua_senha@seu_cluster.mongodb.net/seu_banco_de_dados';
          break;
        case 'ADMIN_PASSWORD':
          defaultValue = 'senha_forte_admin';
          break;
        case 'JWT_SECRET':
          defaultValue = 'sua_chave_jwt_secreta_complexa_e_aleatoria';
          break;
        case 'PORT':
          defaultValue = '3000';
          break;
        case 'NODE_ENV':
          defaultValue = 'development';
          break;
      }
      
      envContent += `\n${varName}=${defaultValue}`;
      hasChanged = true;
    }
    
    // Escreve o conteúdo atualizado no arquivo
    fs.writeFileSync(backendEnvPath, envContent);
    console.log(`${colors.green}Variáveis adicionadas ao arquivo .env!${colors.reset}`);
  }
  
  // Verifica se a variável PORT está definida corretamente
  if (!envContent.includes('PORT=3000')) {
    console.log(`${colors.yellow}Variável PORT não está definida como 3000. Corrigindo...${colors.reset}`);
    
    // Substitui a linha PORT=* por PORT=3000
    envContent = envContent.replace(/PORT=.*$/m, 'PORT=3000');
    
    // Se a substituição não funcionou, adiciona a variável
    if (!envContent.includes('PORT=3000')) {
      envContent += '\nPORT=3000';
    }
    
    // Escreve o conteúdo atualizado no arquivo
    fs.writeFileSync(backendEnvPath, envContent);
    console.log(`${colors.green}Variável PORT corrigida!${colors.reset}`);
    hasChanged = true;
  }
  
  if (!hasChanged) {
    console.log(`${colors.green}Arquivo .env está configurado corretamente!${colors.reset}`);
  } else {
    console.log(`${colors.yellow}Arquivo .env foi atualizado. Por favor, verifique e edite os valores conforme necessário.${colors.reset}`);
  }
  
  // Exibe o conteúdo atual do arquivo .env
  console.log(`\n${colors.blue}Conteúdo atual do arquivo .env:${colors.reset}`);
  console.log(envContent);
  
  console.log(`\n${colors.yellow}IMPORTANTE: Substitua os valores padrão pelos valores reais antes de executar o servidor.${colors.reset}`);
}

// Executa a verificação
checkAndFixEnv().catch(error => {
  console.error(`${colors.red}Erro ao verificar arquivo .env:${colors.reset}`, error);
}); 