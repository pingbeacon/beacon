<?php

namespace Database\Factories;

use App\Models\Assertion;
use App\Models\Monitor;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Assertion>
 */
class AssertionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'monitor_id' => Monitor::factory(),
            'type' => 'status',
            'expression' => 'status == 200',
            'name' => null,
            'severity' => 'warning',
            'on_fail' => 'log_only',
            'muted' => false,
            'tolerance' => 1,
        ];
    }

    public function status(int $code = 200): self
    {
        return $this->state([
            'type' => 'status',
            'expression' => "status == {$code}",
        ]);
    }

    public function latency(int $maxMs = 2000): self
    {
        return $this->state([
            'type' => 'latency',
            'expression' => "response_time_ms < {$maxMs}",
        ]);
    }

    public function bodyJson(string $path, string $literal): self
    {
        return $this->state([
            'type' => 'body',
            'expression' => sprintf('%s == %s', $path, json_encode($literal)),
        ]);
    }

    public function header(string $name, string $regex): self
    {
        return $this->state([
            'type' => 'header',
            'expression' => "{$name} ~ {$regex}",
        ]);
    }

    public function muted(): self
    {
        return $this->state(['muted' => true]);
    }
}
