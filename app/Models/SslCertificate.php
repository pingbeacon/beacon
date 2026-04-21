<?php

namespace App\Models;

use Database\Factories\SslCertificateFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SslCertificate extends Model
{
    /** @use HasFactory<SslCertificateFactory> */
    use HasFactory;

    protected $fillable = [
        'monitor_id',
        'issuer',
        'subject',
        'valid_from',
        'valid_to',
        'fingerprint',
        'days_until_expiry',
        'is_valid',
        'error_message',
        'last_checked_at',
    ];

    protected function casts(): array
    {
        return [
            'valid_from' => 'datetime',
            'valid_to' => 'datetime',
            'is_valid' => 'boolean',
            'days_until_expiry' => 'integer',
            'last_checked_at' => 'datetime',
        ];
    }

    public function monitor(): BelongsTo
    {
        return $this->belongsTo(Monitor::class);
    }

    public function isExpiringSoon(int $days): bool
    {
        return $this->is_valid && $this->days_until_expiry !== null && $this->days_until_expiry <= $days;
    }
}
