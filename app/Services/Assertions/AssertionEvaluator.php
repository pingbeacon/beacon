<?php

namespace App\Services\Assertions;

use App\DTOs\AssertionPayload;
use App\DTOs\AssertionResultData;
use App\Models\Assertion;
use DateTimeImmutable;

final class AssertionEvaluator
{
    /**
     * Evaluate a heartbeat payload against a set of assertions.
     *
     * Body / header / content_type rules are skipped (no row emitted) when the
     * payload lacks the underlying field — auto-passing missing data would be
     * misleading.
     *
     * @param  iterable<Assertion>  $assertions
     * @return array<int, AssertionResultData>
     */
    public function evaluate(
        AssertionPayload $payload,
        iterable $assertions,
        DateTimeImmutable $observedAt,
    ): array {
        $results = [];

        foreach ($assertions as $assertion) {
            if ($assertion->muted) {
                continue;
            }

            if ($this->shouldSkipForMissingField($assertion->type, $payload)) {
                continue;
            }

            $verdict = AssertionDsl::evaluate($assertion->type, $assertion->expression, $payload);

            $results[] = new AssertionResultData(
                assertionId: $assertion->id,
                passed: $verdict->passed,
                actualValue: $verdict->parseError !== null ? "<parse error: {$verdict->parseError}>" : $verdict->actualValue,
                observedAt: $observedAt,
            );
        }

        return $results;
    }

    private function shouldSkipForMissingField(string $type, AssertionPayload $payload): bool
    {
        return match ($type) {
            'body' => $payload->body === null,
            'header' => $payload->headers === [],
            'content_type' => $payload->contentType === null && ! isset($payload->headers['content-type']),
            default => false,
        };
    }
}
