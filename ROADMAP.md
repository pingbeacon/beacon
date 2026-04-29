# Uptime Kuma Clone — Roadmap

## Completed

- Monitor CRUD (HTTP, TCP, Ping, DNS, Push)
- Real-time heartbeat tracking via WebSockets
- Uptime tracker visualization (last 90 heartbeats)
- Incident tracking and display
- Tag management and monitor tagging
- Notification channels (Email, Slack, Discord, Telegram)
- Status pages
- Soft-delete and trash management
- Dashboard with summary cards

## Nice to have

- When a monitor goes down or up, display a live toast notification in the ui

## Phase 1 — Completed

- [x] Response time chart on monitor detail page (Recharts area chart, 24h window)
- [x] Search & filter monitors (client-side filtering by name, status, tag)
- [x] Multi-range uptime stats (24h / 7d / 30d uptime % and avg response time)

## Phase 2 — Completed

- [x] Monitor groups / folders
- [x] SSL certificate expiry monitoring
- [x] Maintenance windows (scheduled downtime suppression)
- [x] Bulk actions (pause, resume, delete multiple monitors)
- [x] Export/import monitors (JSON)

## Phase 3 — Completed

- [x] Multi-user / team support with roles (Owner, Admin, Member, Viewer)
- [x] Audit log for monitor changes
- [x] Webhook notification channel (HMAC-SHA256 signing, custom headers)
- [x] Public status page customization (custom domain, branding, logo, favicon, custom CSS)

## Phase 4 — Planned

- [ ] API token management (personal access tokens, team-scoped, fine-grained scopes, optional expiry)
- [ ] Public REST API v1: monitors (CRUD), heartbeats (read), status pages (CRUD), incidents (read), tags (read)

### API — Future Improvements

- [ ] Cursor-based pagination for heartbeats (high-volume)
- [ ] Maintenance windows API (CRUD)
- [ ] Monitor groups API (CRUD)
- [ ] Notification channels API (read-only, no credential exposure)
- [ ] Webhook events (push events to external URLs on monitor status change)
- [ ] API v2 with breaking changes if needed
- [ ] OAuth2 app authorization (third-party integrations)
- [ ] Read-only public token (no auth, for open dashboards)

## Phase 5 — Future

- [ ] Geographic monitoring (multi-region checks)
- [ ] Advanced alerting rules (escalation policies, on-call rotations)
- [ ] Integrations (PagerDuty, Opsgenie, Datadog)
- [ ] Performance budgets and SLA tracking
- [ ] Mobile app (React Native)
