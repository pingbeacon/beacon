<?php

namespace App\Models;

use Database\Factories\HeartbeatFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Heartbeat extends Model
{
    /** @use HasFactory<HeartbeatFactory> */
    use HasFactory;

    const UPDATED_AT = null;

    protected $fillable = [
        'monitor_id',
        'status',
        'status_code',
        'response_time',
        'phase_dns_ms',
        'phase_tcp_ms',
        'phase_tls_ms',
        'phase_ttfb_ms',
        'phase_transfer_ms',
        'message',
    ];

    protected function casts(): array
    {
        return [
            'status_code' => 'integer',
            'response_time' => 'integer',
            'phase_dns_ms' => 'integer',
            'phase_tcp_ms' => 'integer',
            'phase_tls_ms' => 'integer',
            'phase_ttfb_ms' => 'integer',
            'phase_transfer_ms' => 'integer',
        ];
    }

    public function monitor(): BelongsTo
    {
        return $this->belongsTo(Monitor::class);
    }
}
