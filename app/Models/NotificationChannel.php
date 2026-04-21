<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Database\Factories\NotificationChannelFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class NotificationChannel extends Model
{
    /** @use HasFactory<NotificationChannelFactory> */
    use Auditable, HasFactory;

    protected static array $auditExclude = ['configuration'];

    protected $fillable = [
        'team_id',
        'user_id',
        'name',
        'type',
        'configuration',
        'is_enabled',
    ];

    protected function casts(): array
    {
        return [
            'configuration' => 'encrypted:array',
            'is_enabled' => 'boolean',
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
}
