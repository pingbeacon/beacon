<?php

namespace Database\Factories;

use App\Models\Assertion;
use App\Models\AssertionResult;
use App\Models\Heartbeat;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AssertionResult>
 */
class AssertionResultFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'assertion_id' => Assertion::factory(),
            'heartbeat_id' => Heartbeat::factory(),
            'passed' => true,
            'actual_value' => null,
            'observed_at' => now(),
        ];
    }

    public function failed(?string $actual = null): self
    {
        return $this->state([
            'passed' => false,
            'actual_value' => $actual,
        ]);
    }
}
