<?php

namespace Database\Factories;

use App\Models\Monitor;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Monitor>
 */
class MonitorFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'team_id' => fn (array $attributes) => User::find($attributes['user_id'])?->current_team_id,
            'name' => fake()->domainName(),
            'type' => 'http',
            'url' => fake()->url(),
            'method' => 'GET',
            'accepted_status_codes' => [200, 201, 301],
            'interval' => 60,
            'timeout' => 30,
            'retry_count' => 3,
            'status' => 'pending',
            'is_active' => true,
        ];
    }

    public function http(): static
    {
        return $this->state(fn () => [
            'type' => 'http',
            'url' => fake()->url(),
        ]);
    }

    public function tcp(): static
    {
        return $this->state(fn () => [
            'type' => 'tcp',
            'host' => fake()->domainName(),
            'port' => fake()->randomElement([80, 443, 3306, 5432, 6379]),
        ]);
    }

    public function ping(): static
    {
        return $this->state(fn () => [
            'type' => 'ping',
            'host' => fake()->domainName(),
        ]);
    }

    public function dns(): static
    {
        return $this->state(fn () => [
            'type' => 'dns',
            'host' => fake()->domainName(),
            'dns_record_type' => 'A',
        ]);
    }

    public function push(): static
    {
        return $this->state(fn () => [
            'type' => 'push',
            'push_token' => Str::uuid()->toString(),
        ]);
    }

    public function up(): static
    {
        return $this->state(fn () => ['status' => 'up']);
    }

    public function down(): static
    {
        return $this->state(fn () => ['status' => 'down']);
    }

    public function paused(): static
    {
        return $this->state(fn () => [
            'status' => 'paused',
            'is_active' => false,
        ]);
    }
}
