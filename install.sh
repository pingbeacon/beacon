#!/bin/bash
set -e

REPO_OWNER="pingbeacon"
REPO_NAME="beacon"
RAW_BASE="https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main"
INSTALL_DIR="${BEACON_DIR:-/opt/beacon}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[beacon]${NC} $1"; }
success() { echo -e "${GREEN}[beacon]${NC} $1"; }
warn()    { echo -e "${YELLOW}[beacon]${NC} $1"; }
error()   { echo -e "${RED}[beacon]${NC} $1" >&2; exit 1; }

echo ""
echo "  ██████╗ ███████╗ █████╗  ██████╗ ██████╗ ███╗   ██╗"
echo "  ██╔══██╗██╔════╝██╔══██╗██╔════╝██╔═══██╗████╗  ██║"
echo "  ██████╔╝█████╗  ███████║██║     ██║   ██║██╔██╗ ██║"
echo "  ██╔══██╗██╔══╝  ██╔══██║██║     ██║   ██║██║╚██╗██║"
echo "  ██████╔╝███████╗██║  ██║╚██████╗╚██████╔╝██║ ╚████║"
echo "  ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝"
echo ""
info "Self-hosted installer"
echo ""

# --- Prerequisites ---

check_command() {
    if ! command -v "$1" > /dev/null 2>&1; then
        error "$1 is required but not installed. Please install it and try again."
    fi
}

check_command docker
check_command curl
check_command openssl

if ! docker compose version > /dev/null 2>&1; then
    error "Docker Compose plugin is required. Run: apt install docker-compose-plugin or see https://docs.docker.com/compose/install/"
fi

info "Prerequisites: OK"

# --- Install directory ---

if [ -d "$INSTALL_DIR" ] && [ -f "$INSTALL_DIR/docker-compose.yml" ]; then
    warn "Existing installation found at $INSTALL_DIR"
    printf "Update it? [y/N] "
    read -r answer
    if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
        info "Aborted."
        exit 0
    fi
fi

mkdir -p "$INSTALL_DIR"
info "Install directory: $INSTALL_DIR"

# --- Download compose file ---

info "Downloading docker-compose.yml..."
curl -sSL "${RAW_BASE}/docker-compose.yml" -o "${INSTALL_DIR}/docker-compose.yml"

# --- Generate or reuse .env ---

ENV_FILE="${INSTALL_DIR}/.env"

if [ -f "$ENV_FILE" ]; then
    warn ".env already exists — keeping existing secrets."
else
    info "Generating .env..."

    # Prompt for APP_URL
    if [ -n "$APP_URL" ]; then
        app_url="$APP_URL"
    else
        printf "Enter your app URL (e.g. https://beacon.example.com) [http://localhost]: "
        read -r app_url
        app_url="${app_url:-http://localhost}"
    fi

    app_key="base64:$(openssl rand -base64 32)"
    db_password="$(openssl rand -hex 16)"
    reverb_app_key="$(openssl rand -hex 16)"
    reverb_app_secret="$(openssl rand -hex 32)"
    reverb_app_id="$(shuf -i 1000-9999 -n 1 2>/dev/null || echo 1234)"

    # Derive reverb host from APP_URL
    reverb_host="$(echo "$app_url" | sed 's|https\?://||' | sed 's|/.*||')"
    reverb_scheme="$(echo "$app_url" | grep -o '^https\?' || echo 'http')"
    if [ "$reverb_scheme" = "https" ]; then
        reverb_port=443
    else
        reverb_port=8080
    fi

    cat > "$ENV_FILE" <<EOF
APP_NAME=Beacon
APP_ENV=production
APP_KEY=${app_key}
APP_DEBUG=false
APP_TIMEZONE=UTC
APP_URL=${app_url}

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=error

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=beacon
DB_USERNAME=beacon
DB_PASSWORD=${db_password}

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false

BROADCAST_CONNECTION=reverb
FILESYSTEM_DISK=local
QUEUE_CONNECTION=database

CACHE_STORE=database
CACHE_PREFIX=

MAIL_MAILER=log

REVERB_APP_KEY=${reverb_app_key}
REVERB_APP_SECRET=${reverb_app_secret}
REVERB_APP_ID=${reverb_app_id}
REVERB_HOST=${reverb_host}
REVERB_PORT=${reverb_port}
REVERB_SCHEME=${reverb_scheme}
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=8080

VITE_APP_NAME=Beacon
VITE_REVERB_APP_KEY=${reverb_app_key}
VITE_REVERB_HOST=${reverb_host}
VITE_REVERB_PORT=${reverb_port}
VITE_REVERB_SCHEME=${reverb_scheme}
EOF

    success ".env generated."
fi

# --- Pull images ---

info "Pulling Docker images..."
docker compose -f "${INSTALL_DIR}/docker-compose.yml" --env-file "$ENV_FILE" pull

# --- Start services ---

info "Starting Beacon..."
docker compose -f "${INSTALL_DIR}/docker-compose.yml" --env-file "$ENV_FILE" up -d

# --- Wait for app to be healthy ---

info "Waiting for app to be ready (this may take a minute while migrations run)..."
attempt=0
max_attempts=30
until docker compose -f "${INSTALL_DIR}/docker-compose.yml" --env-file "$ENV_FILE" ps app | grep -q "healthy"; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge "$max_attempts" ]; then
        warn "App is taking longer than expected to start."
        warn "Check logs: docker compose -f ${INSTALL_DIR}/docker-compose.yml logs app"
        break
    fi
    sleep 5
done

echo ""
success "Beacon is running!"
echo ""
echo "  App:      $(grep APP_URL "$ENV_FILE" | cut -d= -f2)"
echo "  Reverb:   ws://$(grep REVERB_HOST "$ENV_FILE" | cut -d= -f2):$(grep REVERB_SERVER_PORT "$ENV_FILE" | cut -d= -f2)"
echo ""
echo "  Logs:     docker compose -f ${INSTALL_DIR}/docker-compose.yml logs -f"
echo "  Stop:     docker compose -f ${INSTALL_DIR}/docker-compose.yml down"
echo "  Update:   curl -sSL ${RAW_BASE}/install.sh | sh"
echo ""
