#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════╗"
echo "║     ResearVia — Quick Start Setup             ║"
echo "╚═══════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo -e "${RED}✗ $1 is required but not installed.${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ $1 found${NC}"
}

echo -e "\n${YELLOW}Checking prerequisites...${NC}"
check_cmd docker
check_cmd docker compose || check_cmd docker-compose

# Copy .env if needed
if [ ! -f backend/.env ]; then
  echo -e "\n${YELLOW}Creating backend/.env from example...${NC}"
  cp backend/.env.example backend/.env
  echo -e "${GREEN}✓ backend/.env created — edit it to add optional API keys${NC}"
else
  echo -e "${GREEN}✓ backend/.env already exists${NC}"
fi

# Build and start
echo -e "\n${YELLOW}Building Docker images...${NC}"
docker compose build --parallel

echo -e "\n${YELLOW}Starting services...${NC}"
docker compose up -d

echo -e "\n${YELLOW}Waiting for MySQL to be ready...${NC}"
until docker compose exec mysql mysqladmin ping -h localhost -u root -prootpass123 &>/dev/null; do
  printf '.'
  sleep 2
done
echo ""

echo -e "\n${YELLOW}Running database migrations...${NC}"
docker compose exec api sh -c "cd /app && npx prisma migrate deploy"

echo -e "\n${YELLOW}Seeding initial data...${NC}"
docker compose exec api sh -c "cd /app && npx ts-node --project tsconfig.json prisma/seed.ts" || \
docker compose exec api sh -c "cd /app && npx prisma db seed" || \
echo -e "${YELLOW}⚠ Seed may have already run or failed — continuing${NC}"

echo -e "\n${GREEN}"
echo "╔═══════════════════════════════════════════════╗"
echo "║     ResearVia is ready!                       ║"
echo "╠═══════════════════════════════════════════════╣"
echo "║  Frontend:   http://localhost:3000             ║"
echo "║  API:        http://localhost:3001/v1          ║"
echo "║  Swagger:    http://localhost:3001/api/docs    ║"
echo "║  Admin:      http://localhost:3000/admin       ║"
echo "╠═══════════════════════════════════════════════╣"
echo "║  Admin login: admin@researvia.com             ║"
echo "║  Password:    Admin@123456                    ║"
echo "╚═══════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}Useful commands:${NC}"
echo "  docker compose logs -f api        # API logs"
echo "  docker compose logs -f frontend   # Frontend logs"
echo "  docker compose down               # Stop all services"
echo "  docker compose exec api npx prisma studio  # DB GUI"
