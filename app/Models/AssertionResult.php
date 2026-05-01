<?php

namespace App\Models;

use Database\Factories\AssertionResultFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssertionResult extends Model
{
    /** @use HasFactory<AssertionResultFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'assertion_id',
        'heartbeat_id',
        'passed',
        'actual_value',
        'observed_at',
    ];

    protected function casts(): array
    {
        return [
            'passed' => 'boolean',
            'observed_at' => 'datetime',
        ];
    }

    public function assertion(): BelongsTo
    {
        return $this->belongsTo(Assertion::class);
    }

    public function heartbeat(): BelongsTo
    {
        return $this->belongsTo(Heartbeat::class);
    }
}
