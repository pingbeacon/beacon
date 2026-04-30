<?php

namespace App\DTOs;

use App\Models\Monitor;

final class NotificationEvent
{
    public function __construct(
        public Monitor $monitor,
        public string $type,
        public string $newStatus,
        public ?string $previousStatus = null,
        public ?string $severity = null,
        public ?int $incidentId = null,
    ) {}
}
