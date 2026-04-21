<?php

namespace App\Actions;

use App\Models\Monitor;
use App\Models\MonitorGroup;
use App\Models\User;

class ExportMonitorsAction
{
    /**
     * @param  int[]|null  $monitorIds
     * @return array<string, mixed>
     */
    public function execute(User $user, ?array $monitorIds = null): array
    {
        $monitorsQuery = Monitor::query()
            ->where('team_id', $user->current_team_id)
            ->with(['tags', 'monitorGroup']);

        if ($monitorIds) {
            $monitorsQuery->whereIn('id', $monitorIds);
        }

        $monitors = $monitorsQuery->get();

        $groupIds = $monitors->pluck('monitor_group_id')->filter()->unique()->toArray();
        $groups = MonitorGroup::query()
            ->where('team_id', $user->current_team_id)
            ->when($monitorIds, fn ($q) => $q->whereIn('id', $groupIds))
            ->with('children')
            ->get();

        return [
            'version' => 1,
            'exported_at' => now()->toISOString(),
            'groups' => $groups->map(fn (MonitorGroup $group) => [
                'name' => $group->name,
                'description' => $group->description,
                'sort_order' => $group->sort_order,
            ])->toArray(),
            'monitors' => $monitors->map(fn (Monitor $monitor) => [
                'name' => $monitor->name,
                'type' => $monitor->type,
                'url' => $monitor->url,
                'host' => $monitor->host,
                'port' => $monitor->port,
                'dns_record_type' => $monitor->dns_record_type,
                'method' => $monitor->method,
                'body' => $monitor->body,
                'headers' => $monitor->headers,
                'accepted_status_codes' => $monitor->accepted_status_codes,
                'interval' => $monitor->interval,
                'timeout' => $monitor->timeout,
                'retry_count' => $monitor->retry_count,
                'ssl_monitoring_enabled' => $monitor->ssl_monitoring_enabled,
                'ssl_expiry_notification_days' => $monitor->ssl_expiry_notification_days,
                'group_name' => $monitor->monitorGroup?->name,
                'tags' => $monitor->tags->map(fn ($tag) => [
                    'name' => $tag->name,
                    'color' => $tag->color,
                ])->toArray(),
            ])->toArray(),
        ];
    }
}
