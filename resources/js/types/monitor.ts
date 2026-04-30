export type MonitorType = 'http' | 'tcp' | 'ping' | 'dns' | 'push'
export type MonitorStatus = 'up' | 'down' | 'pending' | 'paused'
export type HeartbeatStatus = 'up' | 'down'

export interface MonitorGroup {
    id: number
    user_id: number
    parent_id: number | null
    name: string
    description: string | null
    sort_order: number
    is_collapsed: boolean
    created_at: string
    updated_at: string
    children?: MonitorGroup[]
    monitors?: Monitor[]
}

export interface Monitor {
    id: number
    user_id: number
    monitor_group_id: number | null
    name: string
    type: MonitorType
    url: string | null
    host: string | null
    port: number | null
    dns_record_type: string | null
    method: string
    body: string | null
    headers: Record<string, string> | null
    accepted_status_codes: number[] | null
    interval: number
    timeout: number
    retry_count: number
    status: MonitorStatus
    is_active: boolean
    push_token: string | null
    ssl_monitoring_enabled: boolean
    ssl_expiry_notification_days: number[] | null
    last_checked_at: string | null
    next_check_at: string | null
    created_at: string
    updated_at: string
    monitor_group?: MonitorGroup
    tags?: Tag[]
    heartbeats?: Heartbeat[]
    incidents?: Incident[]
    notification_channels?: NotificationChannel[]
    uptime_percentage?: number
    average_response_time?: number | null
    has_incidents_24h?: boolean
}

export interface Heartbeat {
    id: number
    monitor_id: number
    status: HeartbeatStatus
    status_code: number | null
    response_time: number | null
    message: string | null
    created_at: string
}

export interface Tag {
    id: number
    user_id: number
    name: string
    color: string
    created_at: string
    updated_at: string
}

export interface NotificationChannel {
    id: number
    user_id: number
    team_id: number
    name: string
    type: 'email' | 'slack' | 'discord' | 'telegram' | 'webhook'
    is_enabled: boolean
    created_at: string
    updated_at: string
}

export type RouteSeverity = 'critical' | 'warning' | 'info'
export type RouteStatusFilter = 'up' | 'down' | 'paused' | 'resolved'

export interface NotificationRouteConditions {
    severity_filter: RouteSeverity[] | null
    status_filter: RouteStatusFilter[] | null
}

export interface NotificationRoute {
    id: number
    monitor_id: number | null
    team_id: number | null
    name: string | null
    priority: number
    is_active: boolean
    conditions: NotificationRouteConditions
    channel_ids: number[]
    created_at: string
    updated_at: string
}

export interface Incident {
    id: number
    monitor_id: number
    started_at: string
    resolved_at: string | null
    cause: string | null
    created_at: string
    updated_at: string
}

export interface SslCertificate {
    id: number
    monitor_id: number
    issuer: string | null
    subject: string | null
    valid_from: string | null
    valid_to: string | null
    fingerprint: string | null
    days_until_expiry: number | null
    is_valid: boolean
    error_message: string | null
    last_checked_at: string | null
    created_at: string
    updated_at: string
}

export interface MaintenanceWindow {
    id: number
    user_id: number
    title: string
    description: string | null
    start_time: string
    end_time: string
    timezone: string
    is_recurring: boolean
    recurrence_type: 'daily' | 'weekly' | 'monthly' | null
    recurrence_days: number[] | null
    is_active: boolean
    created_at: string
    updated_at: string
    monitors?: Monitor[]
    monitor_groups?: MonitorGroup[]
}

export interface UptimeStats {
    uptime_24h: number
    uptime_7d: number
    uptime_30d: number
    avg_response_24h: number | null
    avg_response_7d: number | null
    avg_response_30d: number | null
}

export interface ChartDataPoint {
    created_at: string
    response_time: number | null
    status: HeartbeatStatus
}

export interface StatusPage {
    id: number
    user_id: number
    team_id: number
    title: string
    slug: string
    description: string | null
    is_published: boolean
    logo_path: string | null
    favicon_path: string | null
    primary_color: string | null
    background_color: string | null
    text_color: string | null
    custom_css: string | null
    header_text: string | null
    footer_text: string | null
    custom_domain: string | null
    show_powered_by: boolean
    created_at: string
    updated_at: string
    monitors?: Monitor[]
}

export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface Team {
    id: number
    name: string
    slug: string
    personal_team: boolean
    created_at?: string
    updated_at?: string
    users?: TeamMember[]
    users_count?: number
    pivot?: { role: TeamRole }
}

export interface TeamMember {
    id: number
    name: string
    email: string
    pivot: { role: TeamRole }
}

export interface RealtimeHeartbeat {
    id: number
    status: HeartbeatStatus
    status_code: number | null
    response_time: number | null
    created_at: string
}

export interface HeartbeatPayload {
    monitorId: number
    heartbeat: RealtimeHeartbeat
    monitorStatus: MonitorStatus
    lastCheckedAt?: string | null
    uptimePercentage: number
    averageResponseTime: number | null
}

export interface StatusChangedPayload {
    monitorId: number
    oldStatus: MonitorStatus
    newStatus: MonitorStatus
    message: string | null
}

export interface CheckingPayload {
    monitorId: number
}

export interface AuditLog {
    id: number
    team_id: number
    user_id: number | null
    auditable_type: string
    auditable_id: number
    action: string
    old_values: Record<string, unknown> | null
    new_values: Record<string, unknown> | null
    ip_address: string | null
    user_agent: string | null
    created_at: string
    user?: { id: number; name: string; email: string }
}
