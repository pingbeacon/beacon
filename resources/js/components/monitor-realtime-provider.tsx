import { usePage } from "@inertiajs/react"
import { useEcho } from "@laravel/echo-react"
import { useCallback, useEffect } from "react"
import {
  type CheckingPayload,
  type HeartbeatPayload,
  handleChecking,
  handleHeartbeat,
  handleStatusChanged,
  hydrate,
  type StatusChangedPayload,
} from "@/stores/monitor-realtime"
import type { Monitor } from "@/types/monitor"
import type { SharedData, SidebarMonitor } from "@/types/shared"

function sidebarToMonitor(s: SidebarMonitor): Monitor {
  return {
    id: s.id,
    user_id: 0,
    monitor_group_id: null,
    name: s.name,
    type: s.type,
    url: s.url,
    host: s.host,
    port: s.port,
    dns_record_type: null,
    method: "GET",
    body: null,
    headers: null,
    accepted_status_codes: null,
    interval: 60,
    timeout: 30,
    retry_count: 0,
    status: s.status,
    is_active: true,
    push_token: null,
    ssl_monitoring_enabled: false,
    ssl_expiry_notification_days: null,
    last_checked_at: null,
    next_check_at: null,
    created_at: "",
    updated_at: "",
    heartbeats: [],
  }
}

export function MonitorRealtimeProvider() {
  const { auth, sidebarMonitors } = usePage<SharedData>().props
  const userId = auth?.user?.id

  useEffect(() => {
    if (!sidebarMonitors || sidebarMonitors.length === 0) {
      return
    }
    hydrate(sidebarMonitors.map(sidebarToMonitor))
  }, [sidebarMonitors])

  const onHeartbeat = useCallback((payload: HeartbeatPayload) => {
    handleHeartbeat(payload)
  }, [])

  const onStatusChanged = useCallback((payload: StatusChangedPayload) => {
    handleStatusChanged(payload)
  }, [])

  const onChecking = useCallback((payload: CheckingPayload) => {
    handleChecking(payload)
  }, [])

  useEcho(`monitors.${userId}`, ".HeartbeatRecorded", onHeartbeat)
  useEcho(`monitors.${userId}`, ".MonitorStatusChanged", onStatusChanged)
  useEcho(`monitors.${userId}`, ".MonitorChecking", onChecking)

  return null
}
