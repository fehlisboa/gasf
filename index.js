require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const fetch = require('node-fetch').default || require('node-fetch');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de todas as requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Rota de health check para verificar comunicação com o backend
app.get('/frontend-health', async (req, res) => {
  try {
    // Determina a URL do backend com base no ambiente
    const apiUrl = req.hostname === 'localhost' 
      ? 'https://gasf-backend.onrender.com/api/health'
      : `${req.protocol}://${req.hostname}/api/health`;
    
    console.log(`Verificando saúde do backend em: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Backend respondeu com status: ${response.status}`);
    }
    
    const backendData = await response.json();
    
    res.status(200).json({
      status: 'ok',
      frontend: {
        timestamp: new Date().toISOString(),
        server: 'Frontend Server',
        environment: process.env.NODE_ENV || 'development'
      },
      backend: backendData
    });
  } catch (error) {
    console.error('Erro ao verificar saúde do backend:', error);
    
    res.status(500).json({
      status: 'error',
      frontend: {
        timestamp: new Date().toISOString(),
        server: 'Frontend Server',
        environment: process.env.NODE_ENV || 'development'
      },
      backend: {
        status: 'error',
        message: error.message
      }
    });
  }
});

// Verificar se os diretórios e arquivos existem
const frontendDir = path.join(__dirname, 'frontend');
const buildDir = path.join(frontendDir, 'build');
const pagesDir = path.join(buildDir, 'pages');
const indexFile = path.join(buildDir, 'index.html');

console.log('Verificando estrutura de diretórios:');
console.log(`- Diretório frontend: ${fs.existsSync(frontendDir) ? 'Existe' : 'NÃO EXISTE'}`);
console.log(`- Diretório build: ${fs.existsSync(buildDir) ? 'Existe' : 'NÃO EXISTE'}`);
console.log(`- Diretório pages: ${fs.existsSync(pagesDir) ? 'Existe' : 'NÃO EXISTE'}`);
console.log(`- Arquivo index.html: ${fs.existsSync(indexFile) ? 'Existe' : 'NÃO EXISTE'}`);

// Servir arquivos estáticos da pasta /frontend/build
app.use(express.static(path.join(__dirname, 'frontend/build')));

// Rota para a página de login principal (frontend/build/index.html)
app.get('/', (req, res) => {
  console.log('Requisição para rota raiz (/)');
  const indexPath = path.join(__dirname, 'frontend/build/index.html');
  
  if (fs.existsSync(indexPath)) {
    console.log(`Arquivo index.html encontrado em: ${indexPath}`);
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Erro ao enviar index.html:', err);
        if (!res.headersSent) {
          res.status(500).send('Erro ao carregar a página principal.');
        }
      }
    });
  } else {
    console.error(`Arquivo index.html NÃO ENCONTRADO em: ${indexPath}`);
    res.status(404).send(`
      <html>
        <head><title>Erro 404</title></head>
        <body>
          <h1>Erro 404 - Arquivo não encontrado</h1>
          <p>O arquivo index.html não foi encontrado no caminho: ${indexPath}</p>
          <h2>Arquivos disponíveis:</h2>
          <pre>${listarArquivos(buildDir)}</pre>
        </body>
      </html>
    `);
  }
});

// Rota para servir outras páginas HTML diretamente de frontend/build/pages/
app.get('/:pageName.html', (req, res, next) => {
  const pageName = req.params.pageName;
  const filePath = path.join(__dirname, 'frontend/build/pages', `${pageName}.html`);
  
  console.log(`Requisição para página: ${pageName}.html`);
  console.log(`Procurando arquivo em: ${filePath}`);

  if (fs.existsSync(filePath)) {
    console.log(`Arquivo ${pageName}.html encontrado`);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`Erro ao enviar arquivo ${filePath}:`, err);
        if (!res.headersSent) {
          res.status(500).send('Erro ao carregar a página.');
        }
      }
    });
  } else {
    console.log(`Arquivo ${pageName}.html não encontrado`);
    next(); // Passa para a próxima rota
  }
});

// Função auxiliar para listar arquivos em um diretório
function listarArquivos(diretorio) {
  try {
    if (!fs.existsSync(diretorio)) {
      return `Diretório não encontrado: ${diretorio}`;
    }
    
    const arquivos = fs.readdirSync(diretorio);
    return arquivos.join('\n');
  } catch (err) {
    return `Erro ao listar arquivos: ${err.message}`;
  }
}

// Fallback para Single Page Applications (SPA) ou para URLs amigáveis sem .html
// Servir o index.html principal. Isso permite roteamento do lado do cliente.
app.get('*', (req, res) => {
  console.log(`Rota não correspondida (${req.path}), servindo fallback (SPA): frontend/build/index.html`);
  const indexPath = path.join(__dirname, 'frontend/build/index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Erro ao enviar index.html como fallback:', err);
        if (!res.headersSent) {
          res.status(500).send('Erro ao carregar a aplicação.');
        }
      }
    });
  } else {
    res.status(404).send('Página não encontrada e arquivo index.html não disponível como fallback.');
  }
});

// Tratamento de erros global para o servidor frontend
app.use((err, req, res, next) => {
  console.error("Erro no servidor frontend (index.js):", err.stack || err);
  if (!res.headersSent) {
    res.status(500).send('Algo deu errado no servidor frontend!');
  }
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor frontend rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
});

module.exports = app; 