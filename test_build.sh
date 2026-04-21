#!/bin/bash
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${YELLOW}[…]${NC} $1"; }

# --- Setup .env ---

if [ ! -f .env ]; then
    info "Creating .env from .env.example..."
    cp .env.example .env
    APP_KEY="base64:$(openssl rand -base64 32)"
    sed -i "s|^APP_KEY=.*|APP_KEY=${APP_KEY}|" .env
    echo "DB_PASSWORD=test_secret" >> .env
    ok ".env created"
else
    ok ".env already exists"
    # Ensure DB_PASSWORD is set
    if ! grep -q "^DB_PASSWORD=" .env; then
        echo "DB_PASSWORD=test_secret" >> .env
    fi
    # Ensure APP_KEY is set
    if grep -q "^APP_KEY=$" .env; then
        APP_KEY="base64:$(openssl rand -base64 32)"
        sed -i "s|^APP_KEY=.*|APP_KEY=${APP_KEY}|" .env
        ok "Generated missing APP_KEY"
    fi
fi

# --- Build ---

info "Building image..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml build
ok "Image built"

# --- Start ---

info "Starting services..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
ok "Services started"

# --- Wait for app health ---

info "Waiting for app to be healthy (migrations may take a moment)..."
attempt=0
max=36  # 3 minutes
until docker compose ps app | grep -q "healthy"; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge "$max" ]; then
        fail "App did not become healthy in time. Logs:\n$(docker compose logs --tail=30 app)"
    fi
    if docker compose ps app | grep -q "exited\|Exit"; then
        fail "App container exited. Logs:\n$(docker compose logs --tail=30 app)"
    fi
    sleep 5
done
ok "App is healthy"

# --- Smoke tests ---

info "Testing HTTP /up..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/up)
if [ "$STATUS" = "200" ]; then
    ok "GET /up → 200"
else
    fail "GET /up → $STATUS (expected 200)"
fi

info "Checking queue worker..."
if docker compose ps queue | grep -q "Up\|running"; then
    ok "Queue worker running"
else
    fail "Queue worker not running"
fi

info "Checking Reverb..."
if docker compose ps reverb | grep -q "Up\|running"; then
    ok "Reverb running"
else
    fail "Reverb not running"
fi

info "Checking scheduler..."
if docker compose ps scheduler | grep -q "Up\|running"; then
    ok "Scheduler running"
else
    fail "Scheduler not running"
fi

# --- Summary ---

echo ""
ok "All checks passed."
echo ""
docker compose ps
echo ""
echo "  Logs:    docker compose logs -f"
echo "  Teardown: docker compose down -v"
echo ""
