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

// Rota principal
app.get('/', (req, res) => {
  res.json({ 
    message: 'GASF Backend API',
    routes: ['/api/auth/status', '/api/auth/login', '/health']
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
