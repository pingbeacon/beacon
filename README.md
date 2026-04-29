# Beacon

Self-hosted uptime monitoring. Track HTTP endpoints, TCP ports, DNS records, ping, and push heartbeats. Get alerted the moment something goes down.

Built with Laravel, React, and WebSockets — real-time status updates without polling.

---

## Features

- **Monitor types** — HTTP/HTTPS, TCP, Ping, DNS, Push heartbeat
- **Real-time dashboard** — live status updates via WebSockets (no page refresh)
- **Response time charts** — 1h / 24h / 7d / 30d views
- **Uptime statistics** — 24h, 7d, 30d uptime % and average response time
- **Incident tracking** — automatic incident open/close with duration
- **SSL monitoring** — certificate expiry alerts with configurable lead time
- **Status pages** — public pages with custom domain, branding, and CSS
- **Notification channels** — Email, Slack, Discord, Telegram, Webhook
- **Maintenance windows** — suppress alerts during planned downtime
- **Monitor groups** — organize monitors into folders
- **Bulk actions** — pause, resume, or delete multiple monitors at once
- **Import / export** — JSON-based monitor backup and restore
- **Multi-user teams** — Owner, Admin, Member, Viewer roles
- **Audit log** — track all configuration changes
- **REST API** — full API v1 with personal access tokens and per-resource scopes

---

## Quick Install

One command. Requires Docker with the Compose plugin.

```bash
curl -sSL https://raw.githubusercontent.com/pingbeacon/beacon/main/install.sh | sh
```

The script will:
1. Check prerequisites (Docker, curl, openssl)
2. Prompt for your `APP_URL`
3. Generate a `.env` with secure random secrets
4. Pull images and start all services
5. Print the URL when ready

**Update an existing install:**

```bash
curl -sSL https://raw.githubusercontent.com/pingbeacon/beacon/main/install.sh | sh
```

The script detects an existing install and asks before updating.

---

## Docker Compose

If you prefer to manage the setup yourself:

**1. Download the compose file**

```bash
mkdir -p ~/.beacon && curl -sSL \
  https://raw.githubusercontent.com/pingbeacon/beacon/main/docker-compose.yml \
  -o ~/.beacon/docker-compose.yml
```

**2. Create a `.env` file**

```bash
cat > ~/.beacon/.env <<EOF
APP_NAME=Beacon
APP_ENV=production
APP_KEY=base64:$(openssl rand -base64 32)
APP_DEBUG=false
APP_URL=http://localhost

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=beacon
DB_USERNAME=beacon
DB_PASSWORD=$(openssl rand -hex 16)

SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database
BROADCAST_CONNECTION=reverb

REVERB_APP_KEY=$(openssl rand -hex 16)
REVERB_APP_SECRET=$(openssl rand -hex 32)
REVERB_APP_ID=1234
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=8080

VITE_REVERB_APP_KEY=${REVERB_APP_KEY}
VITE_REVERB_HOST=localhost
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http
EOF
```

**3. Start**

```bash
docker compose -f ~/.beacon/docker-compose.yml --env-file ~/.beacon/.env up -d
```

**Services started:**

| Service | Description |
|---|---|
| `app` | Laravel app + Nginx (port 80) |
| `queue` | Queue worker (monitors, SSL, notifications) |
| `reverb` | WebSocket server (port 8080) |
| `scheduler` | Cron scheduler (runs monitor checks) |
| `postgres` | PostgreSQL 17 database |

**Useful commands:**

```bash
# View logs
docker compose -f ~/.beacon/docker-compose.yml logs -f

# Stop
docker compose -f ~/.beacon/docker-compose.yml down

# Pull latest image and restart
docker compose -f ~/.beacon/docker-compose.yml pull && \
docker compose -f ~/.beacon/docker-compose.yml up -d
```

---

## Local Development

**Requirements:** PHP 8.4, Composer, Node.js 20+, SQLite

```bash
git clone https://github.com/pingbeacon/beacon.git
cd beacon

# Install dependencies
composer install
npm install

# Environment setup
cp .env.example .env
php artisan key:generate

# Database
touch database/database.sqlite
php artisan migrate

# Start everything
composer run dev
```

`composer run dev` starts the Laravel server, queue worker, Vite, Reverb WebSocket server, and scheduler concurrently.

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) and register an account.

**Run tests:**

```bash
php artisan test
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `APP_URL` | Public URL of your instance | `http://localhost` |
| `DB_PASSWORD` | PostgreSQL password | — |
| `REVERB_HOST` | WebSocket host (must match `APP_URL` domain) | `localhost` |
| `REVERB_SCHEME` | `http` or `https` | `http` |
| `REVERB_PORT` | Public WebSocket port | `8080` |
| `MAIL_MAILER` | Mail driver for email alerts | `log` |
| `MAIL_HOST` | SMTP host | — |
| `MAIL_PORT` | SMTP port | `587` |
| `MAIL_USERNAME` | SMTP username | — |
| `MAIL_PASSWORD` | SMTP password | — |
| `MAIL_FROM_ADDRESS` | Sender address | — |

---

## REST API

Beacon exposes a versioned REST API for programmatic access to monitors, heartbeats, incidents, status pages, and tags.

**Base URL:** `{APP_URL}/api/v1`

**Authentication:** Bearer token — create tokens at **Settings → API Tokens**.

```bash
curl https://your-beacon.example.com/api/v1/monitors \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json"
```

**Available scopes:**

| Scope | Access |
|---|---|
| `monitors:read` | List and view monitors |
| `monitors:write` | Create, update, delete monitors |
| `heartbeats:read` | List and view heartbeats |
| `incidents:read` | List and view incidents |
| `status-pages:read` | List and view status pages |
| `status-pages:write` | Create, update, delete status pages |
| `tags:read` | List tags |

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/monitors` | List monitors |
| `POST` | `/api/v1/monitors` | Create monitor |
| `GET` | `/api/v1/monitors/{id}` | Get monitor |
| `PUT` | `/api/v1/monitors/{id}` | Update monitor |
| `DELETE` | `/api/v1/monitors/{id}` | Delete monitor |
| `GET` | `/api/v1/monitors/{id}/heartbeats` | List heartbeats |
| `GET` | `/api/v1/monitors/{id}/incidents` | List incidents |
| `GET` | `/api/v1/status-pages` | List status pages |
| `POST` | `/api/v1/status-pages` | Create status page |
| `GET` | `/api/v1/status-pages/{id}` | Get status page |
| `PUT` | `/api/v1/status-pages/{id}` | Update status page |
| `DELETE` | `/api/v1/status-pages/{id}` | Delete status page |
| `GET` | `/api/v1/tags` | List tags |

All list endpoints support `?page=` and `?per_page=` (max 100). Full curl reference: [`docs/api.md`](docs/api.md).

---

## License

MIT
