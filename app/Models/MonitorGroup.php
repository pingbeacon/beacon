<?php

namespace App\Models;

use Database\Factories\MonitorGroupFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MonitorGroup extends Model
{
    /** @use HasFactory<MonitorGroupFactory> */
    use HasFactory;

    protected $fillable = [
        'team_id',
        'user_id',
        'parent_id',
        'name',
        'description',
        'sort_order',
        'is_collapsed',
    ];

    protected function casts(): array
    {
        return [
            'is_collapsed' => 'boolean',
            'sort_order' => 'integer',
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

    public function parent(): BelongsTo
    {
        return $this->belongsTo(MonitorGroup::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(MonitorGroup::class, 'parent_id');
    }

    public function monitors(): HasMany
    {
        return $this->hasMany(Monitor::class);
    }
}
