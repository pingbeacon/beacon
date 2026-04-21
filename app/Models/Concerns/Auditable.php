<?php

namespace App\Models\Concerns;

use App\Models\AuditLog;

trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function ($model) {
            static::logAudit($model, 'created', [], $model->getAuditableAttributes());
        });

        static::updated(function ($model) {
            $original = collect($model->getOriginal())->only(array_keys($model->getDirty()));
            $changes = $model->getDirty();

            $excludeFields = array_merge(
                ['updated_at', 'created_at'],
                static::$auditExclude,
            );

            $original = collect($original)->except($excludeFields)->toArray();
            $changes = collect($changes)->except($excludeFields)->toArray();

            if (empty($changes)) {
                return;
            }

            static::logAudit($model, 'updated', $original, $changes);
        });

        static::deleted(function ($model) {
            static::logAudit($model, 'deleted', $model->getAuditableAttributes(), []);
        });
    }

    public static function logAudit($model, string $action, array $oldValues, array $newValues): void
    {
        $user = auth()->user();

        if (! $user || ! $model->team_id) {
            return;
        }

        AuditLog::query()->create([
            'team_id' => $model->team_id,
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

    protected function getAuditableAttributes(): array
    {
        $excludeFields = array_merge(
            ['updated_at', 'created_at', 'id'],
            static::$auditExclude,
        );

        return collect($this->attributesToArray())->except($excludeFields)->toArray();
    }
}
