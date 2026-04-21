<?php

namespace Database\Factories;

use App\Models\MonitorGroup;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MonitorGroup>
 */
class MonitorGroupFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'team_id' => fn (array $attributes) => User::find($attributes['user_id'])?->current_team_id,
            'name' => fake()->words(2, true),
            'description' => fake()->optional()->sentence(),
            'sort_order' => 0,
            'is_collapsed' => false,
        ];
    }
}
