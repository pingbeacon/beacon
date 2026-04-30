<?php

namespace Database\Factories;

use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Models\NotificationDelivery;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<NotificationDelivery>
 */
class NotificationDeliveryFactory extends Factory
{
    public function definition(): array
    {
        $user = User::factory()->create();
        $teamId = $user->current_team_id;

        return [
            'team_id' => $teamId,
            'channel_id' => NotificationChannel::factory()->state([
                'user_id' => $user->id,
                'team_id' => $teamId,
            ]),
            'monitor_id' => Monitor::factory()->state([
                'user_id' => $user->id,
                'team_id' => $teamId,
            ]),
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
