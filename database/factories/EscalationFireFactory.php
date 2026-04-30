<?php

namespace Database\Factories;

use App\Models\EscalationFire;
use App\Models\EscalationStep;
use App\Models\Incident;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EscalationFire>
 */
class EscalationFireFactory extends Factory
{
    public function definition(): array
    {
        return [
            'incident_id' => Incident::factory(),
            'escalation_step_id' => EscalationStep::factory(),
            'fired_at' => now(),
        ];
    }
}
