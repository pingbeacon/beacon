<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Database\Factories\MonitorFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Monitor extends Model
{
    /** @use HasFactory<MonitorFactory> */
    use Auditable, HasFactory, SoftDeletes;

    protected static array $auditExclude = [];

    protected $fillable = [
        'team_id',
        'user_id',
        'monitor_group_id',
        'name',
        'type',
        'url',
        'host',
        'port',
        'dns_record_type',
        'method',
        'body',
        'headers',
        'accepted_status_codes',
        'interval',
        'timeout',
        'retry_count',
        'status',
        'is_active',
        'push_token',
        'last_checked_at',
        'next_check_at',
        'sort_order',
        'ssl_monitoring_enabled',
        'ssl_expiry_notification_days',
    ];

    protected function casts(): array
    {
        return [
            'headers' => 'array',
            'accepted_status_codes' => 'array',
            'is_active' => 'boolean',
            'ssl_monitoring_enabled' => 'boolean',
            'ssl_expiry_notification_days' => 'array',
            'interval' => 'integer',
            'timeout' => 'integer',
            'retry_count' => 'integer',
            'port' => 'integer',
            'sort_order' => 'integer',
            'last_checked_at' => 'datetime',
            'next_check_at' => 'datetime',
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

    public function monitorGroup(): BelongsTo
    {
        return $this->belongsTo(MonitorGroup::class);
    }

    public function sslCertificate(): HasOne
    {
        return $this->hasOne(SslCertificate::class);
    }

    public function maintenanceWindows(): BelongsToMany
    {
        return $this->belongsToMany(MaintenanceWindow::class);
    }

    public function isInMaintenance(): bool
    {
        foreach ($this->maintenanceWindows as $window) {
            if ($window->isCurrentlyActive() && $window->affectsMonitor($this)) {
                return true;
            }
        }

        if ($this->monitor_group_id) {
            $groupWindows = MaintenanceWindow::query()
                ->whereHas('monitorGroups', fn ($q) => $q->where('monitor_groups.id', $this->monitor_group_id))
                ->where('is_active', true)
                ->get();

            foreach ($groupWindows as $window) {
                if ($window->isCurrentlyActive()) {
                    return true;
                }
            }
        }

        return false;
    }

    public function heartbeats(): HasMany
    {
        return $this->hasMany(Heartbeat::class);
    }

    public function incidents(): HasMany
    {
        return $this->hasMany(Incident::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    public function notificationChannels(): BelongsToMany
    {
        return $this->belongsToMany(NotificationChannel::class);
    }

    public function assertions(): HasMany
    {
        return $this->hasMany(Assertion::class);
    }

    public function statusPages(): BelongsToMany
    {
        return $this->belongsToMany(StatusPage::class, 'status_page_monitor')->withPivot('sort_order');
    }

    public function uptimePercentage(int $hours = 24): float
    {
        $windowStart = now()->subHours($hours);
        // Don't count time before the monitor existed
        $effectiveStart = $this->created_at->greaterThan($windowStart) ? $this->created_at : $windowStart;
        $windowSeconds = (int) $effectiveStart->diffInSeconds(now());
        $expectedChecks = (int) floor($windowSeconds / $this->interval);

        // Not enough time has elapsed for even one check — no data expected yet
        if ($expectedChecks === 0) {
            return 100.0;
        }

        $result = $this->heartbeats()
            ->where('created_at', '>=', $effectiveStart)
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as up_count', ['up'])
            ->first();

        $upCount = (int) ($result?->up_count ?? 0);

        return round(min($upCount, $expectedChecks) / $expectedChecks * 100, 2);
    }

    public function averageResponseTime(int $hours = 24): ?float
    {
        $average = $this->heartbeats()
            ->where('created_at', '>=', now()->subHours($hours))
            ->whereNotNull('response_time')
            ->avg('response_time');

        return $average ? round($average, 2) : null;
    }

    /**
     * @return array{uptime_24h: float, uptime_7d: float, uptime_30d: float, avg_response_24h: float|null, avg_response_7d: float|null, avg_response_30d: float|null}
     */
    public function uptimeStats(): array
    {
        return [
            'uptime_24h' => $this->uptimePercentage(24),
            'uptime_7d' => $this->uptimePercentage(168),
            'uptime_30d' => $this->uptimePercentage(720),
            'avg_response_24h' => $this->averageResponseTime(24),
            'avg_response_7d' => $this->averageResponseTime(168),
            'avg_response_30d' => $this->averageResponseTime(720),
        ];
    }

    /**
     * @return Collection<int, Heartbeat>
     */
    public function lastHeartbeats(int $count = 90): Collection
    {
        return $this->heartbeats()
            ->latest('created_at')
            ->limit($count)
            ->get();
    }

    /**
     * Uptime percentage computed from already-loaded heartbeats.
     *
     * Falls back to 100.0 when the heartbeats relation is empty so freshly
     * created monitors don't render as 0%.
     */
    public function uptimePercentageFromLoaded(): float
    {
        $heartbeats = $this->relationLoaded('heartbeats') ? $this->heartbeats : collect();

        if ($heartbeats->isEmpty()) {
            return 100.0;
        }

        $upCount = $heartbeats->where('status', 'up')->count();

        return round(($upCount / $heartbeats->count()) * 100, 2);
    }

    public function averageResponseTimeFromLoaded(): ?float
    {
        $heartbeats = $this->relationLoaded('heartbeats') ? $this->heartbeats : collect();

        $values = $heartbeats
            ->whereNotNull('response_time')
            ->pluck('response_time');

        if ($values->isEmpty()) {
            return null;
        }

        return round($values->avg(), 2);
    }
}
