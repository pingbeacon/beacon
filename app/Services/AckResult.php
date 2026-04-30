<?php

namespace App\Services;

use App\Enums\AckStatus;
use App\Models\Incident;

final class AckResult
{
    public function __construct(
        public readonly AckStatus $status,
        public readonly ?Incident $incident = null,
    ) {}
}
