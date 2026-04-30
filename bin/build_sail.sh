#!/bin/bash
# Bootstrap the Sail-based local dev stack.
#   - Copies .env.example.sail → .env (if missing)
#   - Generates APP_KEY (if missing)
#   - Builds the laravel.test image
#   - Brings up pgsql + mailpit + laravel.test
#   - Installs composer + npm deps inside the container
#   - Runs migrations
set -e

cd "$(dirname "$0")/.."

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${YELLOW}[…]${NC} $1"; }

# --- Flags ---
FRESH=0
for arg in "$@"; do
    case "$arg" in
        --fresh) FRESH=1 ;;
        -h|--help)
            cat <<EOF
Usage: bin/build_sail.sh [--fresh]

  --fresh   Drop + recreate all tables (migrate:fresh --seed). DESTRUCTIVE.
            Default: idempotent migrate --seed (preserves existing data).
EOF
            exit 0
            ;;
        *) fail "Unknown arg: $arg (try --help)" ;;
    esac
done

SAIL_FILE="docker-compose.sail.yml"
SAIL_TEMPLATE=".env.example.sail"

[ -f "$SAIL_FILE" ] || fail "$SAIL_FILE missing. Run from repo root."
[ -f "$SAIL_TEMPLATE" ] || fail "$SAIL_TEMPLATE missing."

# --- Setup .env ---
if [ ! -f .env ]; then
    info "Creating .env from $SAIL_TEMPLATE..."
    cp "$SAIL_TEMPLATE" .env
    ok ".env created"
else
    ok ".env exists"
    if ! grep -q "^COMPOSE_FILE=" .env; then
        echo "" >> .env
        echo "COMPOSE_FILE=$SAIL_FILE" >> .env
        ok "Appended COMPOSE_FILE=$SAIL_FILE"
    fi
    if ! grep -q "^WWWUSER=" .env; then
        echo "WWWUSER=$(id -u)" >> .env
        echo "WWWGROUP=$(id -g)" >> .env
        ok "Appended WWWUSER/WWWGROUP"
    fi
fi

# --- Composer deps (host) so vendor/laravel/sail exists ---
if [ ! -f vendor/bin/sail ]; then
    info "Installing composer deps on host (one-time, needed to bootstrap sail image)..."
    if command -v composer >/dev/null 2>&1; then
        composer install --no-interaction --prefer-dist
    else
        docker run --rm -v "$(pwd):/app" -w /app composer:2 install --no-interaction --prefer-dist
    fi
    ok "Composer deps installed"
fi

SAIL="vendor/bin/sail"

# --- Build image ---
info "Building Sail image..."
$SAIL build
ok "Image built"

# --- Start services ---
info "Starting services..."
$SAIL up -d
ok "Services started"

# --- APP_KEY ---
if grep -q "^APP_KEY=$" .env || grep -q "^APP_KEY=base64:$" .env; then
    info "Generating APP_KEY..."
    $SAIL artisan key:generate --force
    ok "APP_KEY set"
fi

# --- Wait for pgsql ---
info "Waiting for pgsql healthcheck..."
attempt=0
max=24
until $SAIL ps pgsql 2>/dev/null | grep -q "healthy"; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge "$max" ]; then
        fail "pgsql not healthy in time. Logs:\n$($SAIL logs --tail=30 pgsql)"
    fi
    sleep 5
done
ok "pgsql healthy"

# --- Migrate + seed ---
if [ "$FRESH" = "1" ]; then
    info "Running migrate:fresh --seed (drops + recreates all tables)..."
    $SAIL artisan migrate:fresh --seed --force
    ok "Schema reset + seeders applied"
else
    info "Running migrate --seed (idempotent, preserves data)..."
    $SAIL artisan migrate --seed --force
    ok "Migrations + seeders applied"
fi

# --- npm deps + build ---
if [ -f package.json ]; then
    info "Installing npm deps..."
    $SAIL npm install
    ok "npm deps installed"
fi

# --- Playwright browsers (Pest browser tests) ---
if [ -f node_modules/.bin/playwright ]; then
    if [ ! -d node_modules/playwright-core/.local-browsers ]; then
        info "Installing Playwright Chromium (one-time, ~120MB)..."
        $SAIL exec -T laravel.test bash -c 'PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium --force'
        ok "Playwright Chromium installed"
    else
        ok "Playwright browsers already present"
    fi
fi

# --- Summary ---
echo ""
ok "Sail stack ready."
echo ""
$SAIL ps
echo ""
echo "  Run dev server: sail npm run dev   (then visit http://localhost)"
echo "  Mailpit UI:     http://localhost:8025"
echo "  Logs:           sail logs -f"
echo "  Teardown:       sail down -v"
echo ""
