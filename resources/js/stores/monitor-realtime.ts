import { useEffect, useSyncExternalStore } from "react"
import type { Heartbeat, Monitor, MonitorStatus } from "@/types/monitor"

const HEARTBEAT_LIMIT = 90

function mergeHeartbeats(
  existing: Heartbeat[] | undefined,
  incoming: Heartbeat[] | undefined,
): Heartbeat[] {
  const a = existing ?? []
  const b = incoming ?? []
  if (a.length === 0) return b.slice(-HEARTBEAT_LIMIT)
  if (b.length === 0) return a.slice(-HEARTBEAT_LIMIT)
  const seen = new Set<number>()
  const merged: Heartbeat[] = []
  const all = [...a, ...b]
  all.sort((x, y) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime())
  for (const hb of all) {
    if (seen.has(hb.id)) continue
    seen.add(hb.id)
    merged.push(hb)
  }
  return merged.slice(-HEARTBEAT_LIMIT)
}

export interface HeartbeatPayload {
  monitorId: number
  heartbeat: Heartbeat
  monitorStatus: string
  lastCheckedAt?: string
  uptimePercentage: number
  averageResponseTime: number | null
}

export interface StatusChangedPayload {
  monitorId: number
  oldStatus: string
  newStatus: string
  message: string | null
}

export interface CheckingPayload {
  monitorId: number
}

export interface MonitorCounts {
  total: number
  up: number
  down: number
  pending: number
  paused: number
}

interface State {
  monitors: Monitor[]
  byId: Record<number, Monitor>
}

export type RealtimeEvent =
  | { type: "heartbeat"; payload: HeartbeatPayload }
  | { type: "status"; payload: StatusChangedPayload }
  | { type: "checking"; payload: CheckingPayload }

let state: State = { monitors: [], byId: {} }
const listeners = new Set<() => void>()
const eventListeners = new Set<(event: RealtimeEvent) => void>()

function emit(): void {
  for (const l of listeners) {
    l()
  }
}

function emitEvent(event: RealtimeEvent): void {
  for (const l of eventListeners) {
    l(event)
  }
}

export function subscribeToEvents(listener: (event: RealtimeEvent) => void): () => void {
  eventListeners.add(listener)
  return () => {
    eventListeners.delete(listener)
  }
}

function commit(byId: Record<number, Monitor>): void {
  state = { byId, monitors: Object.values(byId) }
  emit()
}

function timestamp(value: string | null | undefined): number {
  return value ? new Date(value).getTime() : 0
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSnapshot(): State {
  return state
}

export function hydrate(monitors: Monitor[] | undefined | null): void {
  if (!monitors || monitors.length === 0) {
    return
  }
  const byId: Record<number, Monitor> = { ...state.byId }
  let changed = false
  for (const incoming of monitors) {
    const existing = byId[incoming.id]
    if (!existing) {
      byId[incoming.id] = incoming
      changed = true
      continue
    }
    const existingNewer = timestamp(existing.last_checked_at) > timestamp(incoming.last_checked_at)
    const base = existingNewer ? existing : incoming
    const merged: Monitor = {
      ...base,
      heartbeats: mergeHeartbeats(existing.heartbeats, incoming.heartbeats),
    }
    byId[incoming.id] = merged
    changed = true
  }
  if (!changed) {
    return
  }
  commit(byId)
}

export function handleHeartbeat(payload: HeartbeatPayload): void {
  emitEvent({ type: "heartbeat", payload })
  const existing = state.byId[payload.monitorId]
  if (!existing) {
    return
  }
  const heartbeats = mergeHeartbeats(existing.heartbeats, [payload.heartbeat])
  const updated: Monitor = {
    ...existing,
    status: payload.monitorStatus as MonitorStatus,
    heartbeats,
    uptime_percentage: payload.uptimePercentage,
    average_response_time: payload.averageResponseTime,
    last_checked_at: payload.lastCheckedAt ?? existing.last_checked_at,
  }
  commit({ ...state.byId, [payload.monitorId]: updated })
}

export function handleStatusChanged(payload: StatusChangedPayload): void {
  emitEvent({ type: "status", payload })
  const existing = state.byId[payload.monitorId]
  if (!existing) {
    return
  }
  if (existing.status === payload.newStatus) {
    return
  }
  const updated: Monitor = { ...existing, status: payload.newStatus as MonitorStatus }
  commit({ ...state.byId, [payload.monitorId]: updated })
}

export function handleChecking(payload: CheckingPayload): void {
  emitEvent({ type: "checking", payload })
  const existing = state.byId[payload.monitorId]
  if (!existing) {
    return
  }
  if (existing.status === "pending") {
    return
  }
  const updated: Monitor = { ...existing, status: "pending" }
  commit({ ...state.byId, [payload.monitorId]: updated })
}

export function __resetForTests(): void {
  state = { monitors: [], byId: {} }
  listeners.clear()
  eventListeners.clear()
}

function getMonitorsSnapshot(): Monitor[] {
  return state.monitors
}

let cachedCountsState: State | null = null
let cachedCounts: MonitorCounts = { total: 0, up: 0, down: 0, pending: 0, paused: 0 }

function getCountsSnapshot(): MonitorCounts {
  if (cachedCountsState === state) {
    return cachedCounts
  }
  const counts: MonitorCounts = { total: 0, up: 0, down: 0, pending: 0, paused: 0 }
  for (const m of state.monitors) {
    counts.total++
    if (m.status === "up") counts.up++
    else if (m.status === "down") counts.down++
    else if (m.status === "pending") counts.pending++
    else if (m.status === "paused") counts.paused++
  }
  cachedCounts = counts
  cachedCountsState = state
  return counts
}

export function useMonitors(): Monitor[] {
  return useSyncExternalStore(subscribe, getMonitorsSnapshot, getMonitorsSnapshot)
}

export function useMonitor(id: number): Monitor | undefined {
  const getMonitor = (): Monitor | undefined => state.byId[id]
  return useSyncExternalStore(subscribe, getMonitor, getMonitor)
}

export function useMonitorCounts(): MonitorCounts {
  return useSyncExternalStore(subscribe, getCountsSnapshot, getCountsSnapshot)
}

export function useHydrateMonitors(monitors: Monitor[] | undefined | null): void {
  useEffect(() => {
    hydrate(monitors)
  }, [monitors])
}

export function useHydrateMonitor(monitor: Monitor | undefined | null): void {
  useEffect(() => {
    if (monitor) {
      hydrate([monitor])
    }
  }, [monitor])
}
