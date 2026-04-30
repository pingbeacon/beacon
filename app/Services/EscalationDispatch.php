<?php

namespace App\Services;

use App\Models\EscalationStep;
use App\Models\Incident;

final class EscalationDispatch
{
    public function __construct(
        public Incident $incident,
        public EscalationStep $step,
    ) {}
}
