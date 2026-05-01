<?php

namespace App\DTOs;

use DateTimeImmutable;

final class AssertionResultData
{
    public function __construct(
        public int $assertionId,
        public bool $passed,
        public ?string $actualValue,
        public DateTimeImmutable $observedAt,
    ) {}
}
