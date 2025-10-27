const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

// Configurar CORS para permitir seu site
app.use(cors({
  origin: ['https://gasf-site.vercel.app', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

// ⭐ ROTA QUE SEU SITE PRECISA ⭐
app.get('/api/auth/status', (req, res) => {
  console.log('✅ Rota /api/auth/status foi chamada!');
  res.json({ 
    status: 'online', 
    message: 'Backend GASF funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Rota de login
app.post('/api/auth/login', (req, res) => {
  console.log('📨 Login attempt:', req.body);
  res.json({ 
    success: true, 
    message: 'Login successful',
    user: { id: 1, name: 'Demo User' },
    token: 'demo-token-12345'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// ====================
// ROTAS DO DASHBOARD
// ====================

// Rotas para o Kanban
app.get('/api/kanban/eixos', (req, res) => {
  console.log('📊 Rota /api/kanban/eixos chamada');
  res.json([
    { id: 1, nome: 'Estratégico', cor: '#3498db', descricao: 'Eixo estratégico principal' },
    { id: 2, nome: 'Operacional', cor: '#2ecc71', descricao: 'Eixo operacional' },
    { id: 3, nome: 'Financeiro', cor: '#e74c3c', descricao: 'Eixo financeiro' }
  ]);
});

app.get('/api/kanban/acoes', (req, res) => {
  console.log('📊 Rota /api/kanban/acoes chamada');
  res.json([
    { 
      id: 1, 
      titulo: 'Implementar novo sistema', 
      descricao: 'Implementar sistema de gestão',
      eixoId: 1, 
      status: 'pendente',
      prioridade: 'alta',
      dataCriacao: '2024-01-15',
      dataConclusao: null,
      responsavel: 'Admin'
    },
    { 
      id: 2, 
      titulo: 'Treinamento da equipe', 
      descricao: 'Capacitar equipe no novo sistema',
      eixoId: 2, 
      status: 'em_andamento',
      prioridade: 'media',
      dataCriacao: '2024-01-10',
      dataConclusao: null,
      responsavel: 'Gestor'
    }
  ]);
});

app.get('/api/usuarios', (req, res) => {
  console.log('👥 Rota /api/usuarios chamada');
  res.json([
    { id: 1, nome: 'Administrador', email: 'admin@email.com', role: 'admin' },
    { id: 2, nome: 'Gestor', email: 'gestor@email.com', role: 'manager' },
    { id: 3, nome: 'Usuário', email: 'usuario@email.com', role: 'user' }
  ]);
});

// Rota principal
app.get('/', (req, res) => {
  res.json({ 
    message: 'GASF Backend API',
    routes: ['/api/auth/status', '/api/auth/login', '/health', '/api/kanban/eixos', '/api/kanban/acoes', '/api/usuarios']
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
