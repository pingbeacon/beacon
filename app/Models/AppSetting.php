<?php

namespace App\Models;

use Database\Factories\AppSettingFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppSetting extends Model
{
    /** @use HasFactory<AppSettingFactory> */
    use HasFactory;

    protected $fillable = [
        'team_id',
        'user_id',
        'key',
        'value',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function getForUser(int $userId, string $key, mixed $default = null): mixed
    {
        $setting = static::query()
            ->where('user_id', $userId)
            ->where('key', $key)
            ->first();

        return $setting?->value ?? $default;
    }

    public static function setForUser(int $userId, string $key, mixed $value): static
    {
        $teamId = User::find($userId)?->current_team_id;

        return static::updateOrCreate(
            ['user_id' => $userId, 'key' => $key],
            ['value' => $value, 'team_id' => $teamId],
        );
    }
}
