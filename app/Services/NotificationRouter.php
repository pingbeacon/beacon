<?php

namespace App\Services;

use App\DTOs\NotificationEvent;
use App\Models\NotificationChannel;
use App\Models\NotificationRoute;
use Illuminate\Support\Collection;

final class NotificationRouter
{
    /**
     * Resolve the ordered list of notification channels for a given event.
     *
     * Side-effect-free: no DB writes, no jobs dispatched, no broadcasts.
     *
     * @return Collection<int, NotificationChannel>
     */
    public function route(NotificationEvent $event): Collection
    {
        $monitor = $event->monitor;

        $routes = NotificationRoute::query()
            ->where('is_active', true)
            ->where(function ($query) use ($monitor): void {
                $query
                    ->where('monitor_id', $monitor->id)
                    ->orWhere(function ($q) use ($monitor): void {
                        $q->whereNull('monitor_id')
                            ->where(function ($qq) use ($monitor): void {
                                $qq->where('team_id', $monitor->team_id)
                                    ->orWhereNull('team_id');
                            });
                    });
            })
            ->orderBy('priority')
            ->orderBy('id')
            ->get();

        $matchingRoutes = $routes->filter(fn (NotificationRoute $route) => $this->matches($route, $event));

        if ($matchingRoutes->isEmpty() && $routes->isEmpty()) {
            return $this->fallbackToPivotChannels($event);
        }

        $orderedIds = [];
        foreach ($matchingRoutes as $route) {
            foreach ($route->channel_ids ?? [] as $id) {
                $orderedIds[(int) $id] = true;
            }
        }

        if ($orderedIds === []) {
            return collect();
        }

        $channels = NotificationChannel::query()
            ->whereIn('id', array_keys($orderedIds))
            ->where('is_enabled', true)
            ->where('team_id', $monitor->team_id)
            ->get()
            ->keyBy('id');

        return collect(array_keys($orderedIds))
            ->map(fn (int $id) => $channels->get($id))
            ->filter()
            ->values();
    }

    private function matches(NotificationRoute $route, NotificationEvent $event): bool
    {
        $conditions = $route->conditions ?? [];

        $severityFilter = $conditions['severity_filter'] ?? null;
        if (is_array($severityFilter) && $severityFilter !== []) {
            if ($event->severity === null || ! in_array($event->severity, $severityFilter, true)) {
                return false;
            }
        }

        $statusFilter = $conditions['status_filter'] ?? null;
        if (is_array($statusFilter) && $statusFilter !== []) {
            if (! in_array($event->newStatus, $statusFilter, true)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return Collection<int, NotificationChannel>
     */
    private function fallbackToPivotChannels(NotificationEvent $event): Collection
    {
        return $event->monitor
            ->notificationChannels()
            ->where('is_enabled', true)
            ->where('notification_channels.team_id', $event->monitor->team_id)
            ->get();
    }
}
