<?php

namespace App\Services;

use App\Models\EscalationPolicy;
use App\Models\Incident;

final class EscalationContext
{
    /**
     * @param  array<int>  $alreadyFiredStepIds  Step IDs already persisted in escalation_fires for this incident
     */
    public function __construct(
        public Incident $incident,
        public EscalationPolicy $policy,
        public array $alreadyFiredStepIds = [],
    ) {}
}
