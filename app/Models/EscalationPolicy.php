<?php

namespace App\Models;

use Database\Factories\EscalationPolicyFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EscalationPolicy extends Model
{
    /** @use HasFactory<EscalationPolicyFactory> */
    use HasFactory;

    protected $fillable = [
        'team_id',
        'monitor_id',
        'name',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
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

    public function steps(): HasMany
    {
        return $this->hasMany(EscalationStep::class)->orderBy('order');
    }
}
