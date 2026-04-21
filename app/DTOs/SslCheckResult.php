<?php

namespace App\DTOs;

use Carbon\CarbonImmutable;

class SslCheckResult
{
    public function __construct(
        public ?string $issuer,
        public ?string $subject,
        public ?CarbonImmutable $validFrom,
        public ?CarbonImmutable $validTo,
        public ?string $fingerprint,
        public ?int $daysUntilExpiry,
        public bool $isValid,
        public ?string $errorMessage = null,
    ) {}
}
