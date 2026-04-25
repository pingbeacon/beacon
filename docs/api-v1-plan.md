# API v1 — Implementation Plan

## Overview

Phase 4: personal access tokens + public REST API. Team-scoped, fine-grained scopes, security-first.

---

## Scope

| Resource | Operations |
|---|---|
| Monitors | CRUD (list, show, create, update, delete) |
| Heartbeats | Read-only (list per monitor, show) |
| Status Pages | CRUD (list, show, create, update, delete) |
| Incidents | Read-only (list per monitor, show) |
| Tags | Read-only (list) |

All routes under `/api/v1/` prefix. Existing `/api/push/{token}` endpoint unchanged.

---

## Authentication

- **Sanctum personal access tokens**
- Token is **team-scoped at creation** — stores `team_id` in Sanctum's abilities JSON
- Token cannot exceed the creator's team role permissions
- Guard: `auth:sanctum` on all `/api/v1/` routes
- Secret shown **once** on creation, never retrievable again

---

## Token Scopes

| Scope | Grants |
|---|---|
| `monitors:read` | GET monitors |
| `monitors:write` | POST/PUT/PATCH/DELETE monitors |
| `heartbeats:read` | GET heartbeats |
| `status-pages:read` | GET status pages |
| `status-pages:write` | POST/PUT/PATCH/DELETE status pages |
| `incidents:read` | GET incidents |
| `tags:read` | GET tags |

Every endpoint checks both: (1) token has the required scope, (2) user's team role permits the action.

---

## Token Management

- **UI**: `/settings/api-tokens` — new tab in existing settings area
- **Limit**: 10 tokens per user per team (enforced server-side)
- **Expiry**: Optional at creation — user picks 30d / 90d / 1y / No expiration
- **Sanctum `expires_at`** column handles expiry checks automatically
- **Revoke**: Single token or revoke-all panic button
- **Display**: name, scopes, team, expiry, last used at, created at

### Token Management Rate Limit

`10 requests/minute` per user on token create/delete endpoints.

---

## API Rate Limiting

`60 requests/minute` per token on all `/api/v1/` endpoints.

Returns `429 Too Many Requests` with `Retry-After` header.

---

## Response Format

### Success — single resource

```json
{
  "data": { ... }
}
```

### Success — collection

```json
{
  "data": [ ... ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 42,
    "last_page": 3
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

| Code | HTTP Status |
|---|---|
| `unauthenticated` | 401 |
| `unauthorized` | 403 |
| `not_found` | 404 |
| `validation_error` | 422 |
| `too_many_requests` | 429 |
| `server_error` | 500 |

---

## Pagination

- Strategy: **offset-based** (`?page=2`)
- Default: `15` per page
- Max: `100` per page (enforced, capped silently)
- Query params: `?page=N&per_page=N`

---

## CORS

Same-origin only (Laravel default). Terminal/server consumers (`curl`, scripts, CI) are unaffected — CORS only restricts browser cross-origin JS.

---

## Routes

```
GET    /api/v1/monitors
POST   /api/v1/monitors
GET    /api/v1/monitors/{monitor}
PUT    /api/v1/monitors/{monitor}
DELETE /api/v1/monitors/{monitor}

GET    /api/v1/monitors/{monitor}/heartbeats
GET    /api/v1/monitors/{monitor}/heartbeats/{heartbeat}

GET    /api/v1/monitors/{monitor}/incidents
GET    /api/v1/monitors/{monitor}/incidents/{incident}

GET    /api/v1/status-pages
POST   /api/v1/status-pages
GET    /api/v1/status-pages/{statusPage}
PUT    /api/v1/status-pages/{statusPage}
DELETE /api/v1/status-pages/{statusPage}

GET    /api/v1/tags

POST   /api/settings/api-tokens          (rate: 10/min)
GET    /api/settings/api-tokens
DELETE /api/settings/api-tokens/{token}  (rate: 10/min)
DELETE /api/settings/api-tokens          (revoke all, rate: 10/min)
```

---

## File Structure

```
app/Http/Controllers/Api/V1/
  MonitorController.php
  HeartbeatController.php
  StatusPageController.php
  IncidentController.php
  TagController.php

app/Http/Controllers/Settings/
  ApiTokenController.php

app/Http/Requests/Api/V1/
  StoreMonitorRequest.php
  UpdateMonitorRequest.php
  StoreStatusPageRequest.php
  UpdateStatusPageRequest.php
  StoreApiTokenRequest.php

app/Http/Resources/Api/V1/
  MonitorResource.php
  HeartbeatResource.php
  StatusPageResource.php
  IncidentResource.php
  TagResource.php

routes/api.php   ← extend existing file
```

---

## Security Checklist

- [ ] Token secret shown once, never stored retrievable
- [ ] All resources scoped to token's `team_id` — no cross-team data leakage
- [ ] TeamRole checked on every write operation
- [ ] Rate limiting on all endpoints + stricter on token management
- [ ] Token cap enforced (10/user/team)
- [ ] `expires_at` respected by Sanctum automatically
- [ ] Policies reused from existing web layer — no duplicate authz logic
- [ ] No sensitive fields in API responses (no `push_token`, no notification channel credentials)

---

## Implementation Order

1. Sanctum configuration (guard, middleware)
2. Token management — `ApiTokenController` + UI (`/settings/api-tokens`)
3. Rate limiting configuration in `bootstrap/app.php`
4. Error response handler for API routes
5. API Resources (response transformers)
6. Monitor endpoints + tests
7. Heartbeat endpoints + tests
8. Status page endpoints + tests
9. Incident endpoints + tests
10. Tag endpoints + tests
