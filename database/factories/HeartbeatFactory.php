<?php

namespace Database\Factories;

use App\Models\Heartbeat;
use App\Models\Monitor;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Heartbeat>
 */
class HeartbeatFactory extends Factory
{
    public function definition(): array
    {
        return [
            'monitor_id' => Monitor::factory(),
            'status' => 'up',
            'status_code' => 200,
            'response_time' => fake()->numberBetween(10, 500),
            'message' => null,
        ];
    }

    public function up(): static
    {
        return $this->state(fn () => [
            'status' => 'up',
            'status_code' => 200,
        ]);
    }

    public function down(): static
    {
        return $this->state(fn () => [
            'status' => 'down',
            'status_code' => 500,
            'message' => 'Connection failed',
        ]);
    }
}
