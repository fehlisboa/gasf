#!/bin/bash

# Cores para terminal
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Iniciando servidores da aplicação...${NC}"

# Verifica se o Python está instalado
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}Python não encontrado. Tentando iniciar diretamente...${NC}"
    PYTHON_AVAILABLE=false
else
    PYTHON_AVAILABLE=true
fi

# Verifica se o script Python existe
if [ ! -f "iniciar_servidores.py" ]; then
    echo -e "${YELLOW}Script iniciar_servidores.py não encontrado. Tentando iniciar diretamente...${NC}"
    PYTHON_AVAILABLE=false
fi

# Se Python está disponível, tenta usar o script Python
if [ "$PYTHON_AVAILABLE" = true ]; then
    # Verifica se o requests está instalado
    if ! python3 -c "import requests" &> /dev/null; then
        echo -e "${YELLOW}Instalando biblioteca requests para Python...${NC}"
        pip3 install requests || pip install requests
    fi
    
    echo -e "${GREEN}Iniciando servidores com Python...${NC}"
    python3 iniciar_servidores.py || python iniciar_servidores.py
    exit 0
fi

# Inicia diretamente se Python não estiver disponível
echo -e "${YELLOW}Iniciando servidores diretamente...${NC}"

# Encerra processos que possam estar usando as portas
echo -e "${YELLOW}Encerrando processos anteriores...${NC}"
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:4000 | xargs kill -9 2>/dev/null || true

# Verifica se o arquivo .env existe no backend
if [ ! -f "backend/.env" ] && [ -f "backend/env.example" ]; then
    echo -e "${YELLOW}Criando arquivo .env no backend...${NC}"
    cp backend/env.example backend/.env
    echo -e "${GREEN}Arquivo .env criado. Por favor, edite-o com suas configurações.${NC}"
fi

# Instala dependências do frontend
echo -e "${YELLOW}Instalando dependências do frontend...${NC}"
npm install

# Instala dependências do backend
echo -e "${YELLOW}Instalando dependências do backend...${NC}"
(cd backend && npm install)

# Inicia o backend
echo -e "${GREEN}Iniciando servidor backend...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Aguarda 5 segundos para o backend iniciar
echo -e "${YELLOW}Aguardando o backend iniciar...${NC}"
sleep 5

# Inicia o frontend
echo -e "${GREEN}Iniciando servidor frontend...${NC}"
node index.js &
FRONTEND_PID=$!

# Aguarda 3 segundos para o frontend iniciar
echo -e "${YELLOW}Aguardando o frontend iniciar...${NC}"
sleep 3

# Abre o navegador
echo -e "${GREEN}Abrindo navegador...${NC}"
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:4000
elif command -v open &> /dev/null; then
    open http://localhost:4000
else
    echo -e "${YELLOW}Não foi possível abrir o navegador automaticamente. Acesse:${NC}"
    echo -e "${BLUE}http://localhost:4000${NC}"
fi

echo ""
echo -e "${GREEN}Servidores iniciados!${NC}"
echo -e "- Frontend: ${BLUE}http://localhost:4000${NC}"
echo -e "- Backend API: ${BLUE}http://localhost:3000/api${NC}"
echo -e "- Health check: ${BLUE}http://localhost:3000/api/health${NC}"
echo ""
echo -e "${YELLOW}Pressione Ctrl+C para encerrar os servidores...${NC}"

# Aguarda o usuário pressionar Ctrl+C
trap 'echo -e "${YELLOW}Encerrando servidores...${NC}"; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo -e "${GREEN}Servidores encerrados!${NC}"; exit 0' INT
wait 