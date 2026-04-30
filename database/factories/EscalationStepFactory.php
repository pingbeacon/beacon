<?php

namespace Database\Factories;

use App\Models\EscalationPolicy;
use App\Models\EscalationStep;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EscalationStep>
 */
class EscalationStepFactory extends Factory
{
    public function definition(): array
    {
        return [
            'escalation_policy_id' => EscalationPolicy::factory(),
            'order' => 1,
            'delay_minutes' => 0,
            'channel_ids' => [],
        ];
    }
}
