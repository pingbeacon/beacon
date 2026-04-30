<?php

namespace App\Models;

use Database\Factories\EscalationFireFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EscalationFire extends Model
{
    /** @use HasFactory<EscalationFireFactory> */
    use HasFactory;

    protected $fillable = [
        'incident_id',
        'escalation_step_id',
        'fired_at',
    ];

    protected function casts(): array
    {
        return [
            'fired_at' => 'datetime',
        ];
    }

    public function incident(): BelongsTo
    {
        return $this->belongsTo(Incident::class);
    }

    public function step(): BelongsTo
    {
        return $this->belongsTo(EscalationStep::class, 'escalation_step_id');
    }
}
