<?php

namespace App\Models;

use Database\Factories\EscalationStepFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EscalationStep extends Model
{
    /** @use HasFactory<EscalationStepFactory> */
    use HasFactory;

    protected $fillable = [
        'escalation_policy_id',
        'order',
        'delay_minutes',
        'channel_ids',
    ];

    protected function casts(): array
    {
        return [
            'channel_ids' => 'array',
            'order' => 'integer',
            'delay_minutes' => 'integer',
        ];
    }

    public function policy(): BelongsTo
    {
        return $this->belongsTo(EscalationPolicy::class, 'escalation_policy_id');
    }
}
