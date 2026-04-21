<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Carbon\Carbon;
use Database\Factories\MaintenanceWindowFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class MaintenanceWindow extends Model
{
    /** @use HasFactory<MaintenanceWindowFactory> */
    use Auditable, HasFactory;

    protected static array $auditExclude = [];

    protected $fillable = [
        'team_id',
        'user_id',
        'title',
        'description',
        'start_time',
        'end_time',
        'timezone',
        'is_recurring',
        'recurrence_type',
        'recurrence_days',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'is_recurring' => 'boolean',
            'recurrence_days' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function monitors(): BelongsToMany
    {
        return $this->belongsToMany(Monitor::class);
    }

    public function monitorGroups(): BelongsToMany
    {
        return $this->belongsToMany(MonitorGroup::class);
    }

    public function isCurrentlyActive(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        $now = Carbon::now($this->timezone);

        if (! $this->is_recurring) {
            $start = $this->start_time->copy()->setTimezone($this->timezone);
            $end = $this->end_time->copy()->setTimezone($this->timezone);

            return $now->between($start, $end);
        }

        $startTime = $this->start_time->copy()->setTimezone($this->timezone);
        $endTime = $this->end_time->copy()->setTimezone($this->timezone);
        $timeOfDayStart = $startTime->format('H:i:s');
        $timeOfDayEnd = $endTime->format('H:i:s');

        $todayStart = $now->copy()->setTimeFromTimeString($timeOfDayStart);
        $todayEnd = $now->copy()->setTimeFromTimeString($timeOfDayEnd);

        if ($todayEnd->lt($todayStart)) {
            $todayEnd->addDay();
        }

        if (! $now->between($todayStart, $todayEnd)) {
            return false;
        }

        return match ($this->recurrence_type) {
            'daily' => true,
            'weekly' => in_array($now->dayOfWeek, $this->recurrence_days ?? []),
            'monthly' => in_array($now->day, $this->recurrence_days ?? []),
            default => false,
        };
    }

    public function affectsMonitor(Monitor $monitor): bool
    {
        if ($this->monitors()->where('monitors.id', $monitor->id)->exists()) {
            return true;
        }

        if ($monitor->monitor_group_id && $this->monitorGroups()->where('monitor_groups.id', $monitor->monitor_group_id)->exists()) {
            return true;
        }

        return false;
    }
}
