<?php

namespace Database\Factories;

use App\Models\NotificationRoute;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<NotificationRoute>
 */
class NotificationRouteFactory extends Factory
{
    public function definition(): array
    {
        return [
            'team_id' => null,
            'monitor_id' => null,
            'name' => fake()->words(3, true),
            'priority' => 100,
            'conditions' => [
                'severity_filter' => null,
                'status_filter' => null,
            ],
            'channel_ids' => [],
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
