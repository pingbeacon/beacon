<?php

namespace Database\Factories;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AppSetting>
 */
class AppSettingFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'team_id' => fn (array $attributes) => User::find($attributes['user_id'])?->current_team_id,
            'key' => fake()->unique()->word(),
            'value' => fake()->word(),
        ];
    }
}
