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

- [ ] API token management (personal access tokens)
- [ ] Public REST API for monitors, heartbeats, and status pages

## Phase 5 — Future

- [ ] Geographic monitoring (multi-region checks)
- [ ] Advanced alerting rules (escalation policies, on-call rotations)
- [ ] Integrations (PagerDuty, Opsgenie, Datadog)
- [ ] Performance budgets and SLA tracking
- [ ] Mobile app (React Native)
