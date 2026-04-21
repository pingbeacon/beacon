<?php

namespace App\Actions;

use App\DTOs\ImportResult;
use App\Models\Monitor;
use App\Models\MonitorGroup;
use App\Models\Tag;
use App\Models\User;

class ImportMonitorsAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(User $user, array $data): ImportResult
    {
        $result = new ImportResult;

        if (! isset($data['version']) || ! isset($data['monitors'])) {
            $result->errors[] = 'Invalid import format: missing version or monitors.';

            return $result;
        }

        $groupMap = [];

        foreach ($data['groups'] ?? [] as $groupData) {
            if (empty($groupData['name'])) {
                $result->errors[] = 'Skipped group with empty name.';

                continue;
            }

            $existing = MonitorGroup::query()
                ->where('team_id', $user->current_team_id)
                ->where('name', $groupData['name'])
                ->first();

            if ($existing) {
                $groupMap[$groupData['name']] = $existing->id;
            } else {
                $group = MonitorGroup::query()->create([
                    'user_id' => $user->id,
                    'team_id' => $user->current_team_id,
                    'name' => $groupData['name'],
                    'description' => $groupData['description'] ?? null,
                    'sort_order' => $groupData['sort_order'] ?? 0,
                ]);
                $groupMap[$groupData['name']] = $group->id;
                $result->groupsCreated++;
            }
        }

        foreach ($data['monitors'] ?? [] as $monitorData) {
            if (empty($monitorData['name']) || empty($monitorData['type'])) {
                $result->errors[] = 'Skipped monitor with missing name or type.';

                continue;
            }

            $groupId = null;
            if (! empty($monitorData['group_name']) && isset($groupMap[$monitorData['group_name']])) {
                $groupId = $groupMap[$monitorData['group_name']];
            }

            $monitor = Monitor::query()->create([
                'user_id' => $user->id,
                'team_id' => $user->current_team_id,
                'monitor_group_id' => $groupId,
                'name' => $monitorData['name'],
                'type' => $monitorData['type'],
                'url' => $monitorData['url'] ?? null,
                'host' => $monitorData['host'] ?? null,
                'port' => $monitorData['port'] ?? null,
                'dns_record_type' => $monitorData['dns_record_type'] ?? null,
                'method' => $monitorData['method'] ?? 'GET',
                'body' => $monitorData['body'] ?? null,
                'headers' => $monitorData['headers'] ?? null,
                'accepted_status_codes' => $monitorData['accepted_status_codes'] ?? null,
                'interval' => $monitorData['interval'] ?? 60,
                'timeout' => $monitorData['timeout'] ?? 30,
                'retry_count' => $monitorData['retry_count'] ?? 3,
                'ssl_monitoring_enabled' => $monitorData['ssl_monitoring_enabled'] ?? false,
                'ssl_expiry_notification_days' => $monitorData['ssl_expiry_notification_days'] ?? null,
                'status' => 'pending',
            ]);

            $result->monitorsCreated++;

            foreach ($monitorData['tags'] ?? [] as $tagData) {
                if (empty($tagData['name'])) {
                    continue;
                }

                $tag = Tag::query()
                    ->where('team_id', $user->current_team_id)
                    ->where('name', $tagData['name'])
                    ->first();

                if (! $tag) {
                    $tag = Tag::query()->create([
                        'user_id' => $user->id,
                        'team_id' => $user->current_team_id,
                        'name' => $tagData['name'],
                        'color' => $tagData['color'] ?? '#6B7280',
                    ]);
                    $result->tagsCreated++;
                }

                $monitor->tags()->attach($tag->id);
            }
        }

        return $result;
    }
}
