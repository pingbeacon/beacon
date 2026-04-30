<?php

namespace App\Services;

use DateTimeImmutable;
use DateTimeInterface;

final class EscalationEngine
{
    private DateTimeInterface $now;

    public function __construct(?DateTimeInterface $now = null)
    {
        $this->now = $now ?? new DateTimeImmutable;
    }

    /**
     * Decide which (incident, step) pairs should fire at the engine's "now".
     *
     * Side-effect-free: no DB writes, no jobs dispatched, no broadcasts.
     *
     * @param  iterable<EscalationContext>  $contexts
     * @return array<EscalationDispatch>
     */
    public function tick(iterable $contexts): array
    {
        $dispatches = [];
        $nowTs = $this->now->getTimestamp();

        foreach ($contexts as $context) {
            $incident = $context->incident;

            if ($incident->acked_at !== null || $incident->resolved_at !== null) {
                continue;
            }

            if ($incident->started_at === null) {
                continue;
            }

            $startedTs = $incident->started_at->getTimestamp();
            $alreadyFired = array_flip($context->alreadyFiredStepIds);

            $orderedSteps = collect($context->policy->steps)->sortBy('order')->values();

            foreach ($orderedSteps as $step) {
                $fireAt = $startedTs + ($step->delay_minutes * 60);

                if ($fireAt > $nowTs) {
                    break;
                }

                if (isset($alreadyFired[$step->id])) {
                    continue;
                }

                $dispatches[] = new EscalationDispatch($incident, $step);
            }
        }

        return $dispatches;
    }
}
