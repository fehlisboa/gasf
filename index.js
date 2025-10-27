require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

// Configurar CORS para permitir seu site do Vercel
app.use(cors({
  origin: ['https://gasf-site.vercel.app', 'http://localhost:3000'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de todas as requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ⭐⭐ ROTA QUE SEU SITE PRECISA ⭐⭐
app.get('/api/auth/status', (req, res) => {
  console.log('✅ Rota /api/auth/status foi chamada!');
  res.json({ 
    status: 'online', 
    message: 'Servidor backend funcionando perfeitamente!',
    timestamp: new Date().toISOString(),
    server: 'gasf-app.onrender.com'
  });
});

// Rota de login (se seu site precisar)
app.post('/api/auth/login', (req, res) => {
  console.log('📨 Tentativa de login:', req.body);
  res.json({ 
    success: true, 
    message: 'Login realizado com sucesso',
    user: { id: 1, name: 'Usuário Demo' },
    token: 'demo-token-12345'
  });
});

// Rota principal do backend
app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend GASF rodando!',
    rotas: {
      status: '/api/auth/status',
      login: '/api/auth/login',
      health: '/health'
    }
  });
});

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Rota não encontrada
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend GASF rodando na porta ${PORT}`);
  console.log(`📍 URL: https://gasf-app.onrender.com`);
  console.log(`✅ Rota de status: https://gasf-app.onrender.com/api/auth/status`);
  console.log(`🔐 Rota de login: https://gasf-app.onrender.com/api/auth/login`);
});
