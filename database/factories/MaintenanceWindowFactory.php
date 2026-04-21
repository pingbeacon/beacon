<?php

namespace Database\Factories;

use App\Models\MaintenanceWindow;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MaintenanceWindow>
 */
class MaintenanceWindowFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'team_id' => fn (array $attributes) => User::find($attributes['user_id'])?->current_team_id,
            'title' => fake()->sentence(3),
            'description' => fake()->optional()->sentence(),
            'start_time' => now()->addHour(),
            'end_time' => now()->addHours(3),
            'timezone' => 'UTC',
            'is_recurring' => false,
            'is_active' => true,
        ];
    }

    public function active(): static
    {
        return $this->state(fn () => [
            'start_time' => now()->subHour(),
            'end_time' => now()->addHour(),
        ]);
    }

    public function past(): static
    {
        return $this->state(fn () => [
            'start_time' => now()->subHours(3),
            'end_time' => now()->subHour(),
        ]);
    }

    public function recurring(string $type = 'daily'): static
    {
        return $this->state(fn () => [
            'is_recurring' => true,
            'recurrence_type' => $type,
            'recurrence_days' => $type === 'weekly' ? [now()->dayOfWeek] : ($type === 'monthly' ? [now()->day] : null),
        ]);
    }
}
