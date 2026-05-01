<?php

namespace App\Models;

use Database\Factories\AssertionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Assertion extends Model
{
    /** @use HasFactory<AssertionFactory> */
    use HasFactory;

    protected $fillable = [
        'monitor_id',
        'type',
        'expression',
        'name',
        'severity',
        'on_fail',
        'muted',
        'tolerance',
    ];

    protected function casts(): array
    {
        return [
            'muted' => 'boolean',
            'tolerance' => 'integer',
        ];
    }

    public function monitor(): BelongsTo
    {
        return $this->belongsTo(Monitor::class);
    }

    public function results(): HasMany
    {
        return $this->hasMany(AssertionResult::class);
    }
}
