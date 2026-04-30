<?php

namespace App\Models;

use Database\Factories\NotificationRouteFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationRoute extends Model
{
    /** @use HasFactory<NotificationRouteFactory> */
    use HasFactory;

    protected $fillable = [
        'team_id',
        'monitor_id',
        'name',
        'priority',
        'conditions',
        'channel_ids',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'conditions' => 'array',
            'channel_ids' => 'array',
            'is_active' => 'boolean',
            'priority' => 'integer',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function monitor(): BelongsTo
    {
        return $this->belongsTo(Monitor::class);
    }
}
