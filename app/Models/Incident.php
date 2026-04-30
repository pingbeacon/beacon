<?php

namespace App\Models;

use Database\Factories\IncidentFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Incident extends Model
{
    /** @use HasFactory<IncidentFactory> */
    use HasFactory;

    protected $fillable = [
        'monitor_id',
        'started_at',
        'resolved_at',
        'cause',
        'acked_at',
        'acked_by',
        'ack_token',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'resolved_at' => 'datetime',
            'acked_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $incident): void {
            if ($incident->ack_token === null) {
                $incident->ack_token = Str::random(64);
            }
        });
    }

    public function monitor(): BelongsTo
    {
        return $this->belongsTo(Monitor::class);
    }

    public function acker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acked_by');
    }

    public function scopeUnacked(Builder $query): Builder
    {
        return $query->whereNull('acked_at');
    }

    public function scopeAcked(Builder $query): Builder
    {
        return $query->whereNotNull('acked_at');
    }
}
