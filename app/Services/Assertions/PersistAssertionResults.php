<?php

namespace App\Services\Assertions;

use App\DTOs\AssertionPayload;
use App\Models\AssertionResult;
use App\Models\Heartbeat;
use App\Models\Monitor;

/**
 * Glue between the heartbeat ingest pipeline and the pure AssertionEvaluator.
 *
 * Resolves the monitor's active (non-muted) assertions, evaluates them against the
 * provided payload, and bulk-inserts the resulting `assertion_results` rows.
 */
final class PersistAssertionResults
{
    public function __construct(public AssertionEvaluator $evaluator) {}

    public function run(Monitor $monitor, Heartbeat $heartbeat, AssertionPayload $payload): void
    {
        $assertions = $monitor->assertions()->where('muted', false)->get();
        if ($assertions->isEmpty()) {
            return;
        }

        $observedAt = $heartbeat->created_at?->toDateTimeImmutable() ?? new \DateTimeImmutable;

        $results = $this->evaluator->evaluate($payload, $assertions, $observedAt);
        if ($results === []) {
            return;
        }

        $rows = array_map(fn ($r) => [
            'assertion_id' => $r->assertionId,
            'heartbeat_id' => $heartbeat->id,
            'passed' => $r->passed,
            'actual_value' => $r->actualValue,
            'observed_at' => $r->observedAt->format('Y-m-d H:i:s'),
        ], $results);

        AssertionResult::query()->insert($rows);
    }
}
