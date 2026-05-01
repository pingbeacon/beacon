<?php

namespace App\Services\Assertions;

use App\DTOs\AssertionPayload;
use App\DTOs\DryRunResult;

/**
 * Replays a candidate assertion expression against a payload (a stored
 * heartbeat or a pasted response, resolved by the caller). Pure: never
 * persists, never fires notifications.
 */
final class DryRunner
{
    public function run(string $type, string $expression, AssertionPayload $payload): DryRunResult
    {
        $start = hrtime(true);
        $verdict = AssertionDsl::evaluate($type, $expression, $payload);
        $elapsedMs = (hrtime(true) - $start) / 1_000_000;

        $verdictName = $verdict->parseError !== null
            ? 'parse_error'
            : ($verdict->passed ? 'pass' : 'fail');

        return new DryRunResult(
            verdict: $verdictName,
            type: $type,
            expression: $expression,
            actualValue: $verdict->actualValue,
            parseError: $verdict->parseError,
            evaluationMs: round($elapsedMs, 3),
        );
    }
}
