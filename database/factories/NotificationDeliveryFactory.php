<?php

namespace Database\Factories;

use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Models\NotificationDelivery;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<NotificationDelivery>
 */
class NotificationDeliveryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'channel_id' => NotificationChannel::factory(),
            'monitor_id' => Monitor::factory(),
            'incident_id' => null,
            'event_type' => 'status_flip',
            'status' => 'delivered',
            'latency_ms' => fake()->numberBetween(20, 800),
            'error' => null,
            'dispatched_at' => now(),
        ];
    }

    public function failed(): static
    {
        return $this->state(fn () => [
            'status' => 'failed',
            'error' => 'upstream error',
        ]);
    }
}
