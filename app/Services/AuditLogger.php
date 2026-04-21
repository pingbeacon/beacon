<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

class AuditLogger
{
    public static function log(Model $model, string $action, array $oldValues = [], array $newValues = []): void
    {
        $user = auth()->user();

        if (! $user) {
            return;
        }

        $teamId = $model->team_id ?? $user->current_team_id;

        if (! $teamId) {
            return;
        }

        AuditLog::query()->create([
            'team_id' => $teamId,
            'user_id' => $user->id,
            'auditable_type' => $model->getMorphClass(),
            'auditable_id' => $model->getKey(),
            'action' => $action,
            'old_values' => empty($oldValues) ? null : $oldValues,
            'new_values' => empty($newValues) ? null : $newValues,
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
        ]);
    }
}
