# API v1 — curl Reference

Base URL: `http://localhost/api/v1`

Replace `TOKEN` with your personal access token from `/settings/api-tokens`.

---

## Authentication

All requests require:
```
Authorization: Bearer TOKEN
Accept: application/json
```

---

## Token Management

### List tokens
```bash
curl http://localhost/settings/api-tokens \
  -H "Accept: application/json" \
  -b cookies.txt
```

### Create token (session-based — use browser or cookie jar)
```bash
curl -X POST http://localhost/settings/api-tokens \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <csrf>" \
  -b cookies.txt \
  -d '{
    "name": "My CI Token",
    "team_id": 1,
    "scopes": ["monitors:read", "monitors:write", "heartbeats:read", "incidents:read", "status-pages:read", "status-pages:write", "tags:read"],
    "expires_at": "90d"
  }'
```

> Token management uses session auth. Create tokens via the UI at `/settings/api-tokens`.

---

## Monitors

### List monitors
```bash
curl http://localhost/api/v1/monitors \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json"
```

### List monitors — paginated
```bash
curl "http://localhost/api/v1/monitors?page=2&per_page=25" \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json"
```

### Show monitor
```bash
curl http://localhost/api/v1/monitors/1 \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json"
```

### Create monitor (HTTP)
```bash
curl -X POST http://localhost/api/v1/monitors \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Website",
    "type": "http",
    "url": "https://example.com",
    "method": "GET",
    "interval": 60,
    "timeout": 30
  }'
```

### Create monitor (TCP)
```bash
curl -X POST http://localhost/api/v1/monitors \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DB Server",
    "type": "tcp",
    "host": "db.example.com",
    "port": 5432,
    "interval": 60
  }'
```

### Create monitor (Push)
```bash
curl -X POST http://localhost/api/v1/monitors \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cron Job",
    "type": "push",
    "interval": 3600
  }'
```

### Update monitor
```bash
curl -X PUT http://localhost/api/v1/monitors/1 \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "interval": 120,
    "is_active": false
  }'
```

### Delete monitor
```bash
curl -X DELETE http://localhost/api/v1/monitors/1 \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json"
```

---

## Heartbeats

### List heartbeats for a monitor
```bash
curl http://localhost/api/v1/monitors/1/heartbeats \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json"
```

### List heartbeats — paginated
```bash
curl "http://localhost/api/v1/monitors/1/heartbeats?page=1&per_page=50" \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json"
```

### Show heartbeat
```bash
curl http://localhost/api/v1/monitors/1/heartbeats/42 \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json"
```

---

## Incidents

### List incidents for a monitor
```bash
curl http://localhost/api/v1/monitors/1/incidents \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json"
```

### Show incident
```bash
curl http://localhost/api/v1/monitors/1/incidents/7 \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json"
```

---

## Status Pages

### List status pages
```bash
curl http://localhost/api/v1/status-pages \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json"
```

### Show status page
```bash
curl http://localhost/api/v1/status-pages/1 \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json"
```

### Create status page
```bash
curl -X POST http://localhost/api/v1/status-pages \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Status Page",
    "slug": "my-status-page",
    "description": "Service status for my app.",
    "is_published": true
  }'
```

### Update status page
```bash
curl -X PUT http://localhost/api/v1/status-pages/1 \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "is_published": false
  }'
```

### Delete status page
```bash
curl -X DELETE http://localhost/api/v1/status-pages/1 \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json"
```

---

## Tags

### List tags
```bash
curl http://localhost/api/v1/tags \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json"
```

---

## Response Format

### Success — single resource
```json
{
  "data": {
    "id": 1,
    "name": "My Monitor",
    ...
  }
}
```

### Success — collection
```json
{
  "data": [...],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 42,
    "last_page": 3
  },
  "links": {
    "first": "...",
    "last": "...",
    "prev": null,
    "next": "..."
  }
}
```

### Error
```json
{
  "message": "The given data was invalid.",
  "errors": { "name": ["The name field is required."] },
  "code": "validation_error"
}
```

### Error codes

| Code | HTTP |
|------|------|
| `unauthenticated` | 401 |
| `unauthorized` | 403 |
| `not_found` | 404 |
| `validation_error` | 422 |
| `too_many_requests` | 429 |

---

## Scopes

| Scope | Grants |
|-------|--------|
| `monitors:read` | GET monitors |
| `monitors:write` | POST/PUT/DELETE monitors |
| `heartbeats:read` | GET heartbeats |
| `status-pages:read` | GET status pages |
| `status-pages:write` | POST/PUT/DELETE status pages |
| `incidents:read` | GET incidents |
| `tags:read` | GET tags |

---

## Rate Limits

- API endpoints: **60 req/min** per token
- Response header: `Retry-After` on 429

---

## Push Heartbeat (existing endpoint)

```bash
curl -X POST http://localhost/api/push/PUSH_TOKEN
```

Find `PUSH_TOKEN` on the monitor detail page.
