<?php

namespace Database\Factories;

use App\Enums\IncidentSeverity;
use App\Models\Incident;
use App\Models\Monitor;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Incident>
 */
class IncidentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'monitor_id' => Monitor::factory(),
            'started_at' => now()->subMinutes(fake()->numberBetween(10, 120)),
            'resolved_at' => null,
            'cause' => fake()->sentence(),
            'severity' => IncidentSeverity::Sev2,
        ];
    }

    public function resolved(): static
    {
        return $this->state(fn (array $attributes) => [
            'resolved_at' => now(),
        ]);
    }

    public function severity(IncidentSeverity $severity): static
    {
        return $this->state(fn () => ['severity' => $severity]);
    }
}
