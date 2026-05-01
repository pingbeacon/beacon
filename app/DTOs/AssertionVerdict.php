<?php

namespace App\DTOs;

final class AssertionVerdict
{
    public function __construct(
        public bool $passed,
        public ?string $actualValue,
        public ?string $parseError = null,
    ) {}

    public static function pass(?string $actual = null): self
    {
        return new self(true, $actual);
    }

    public static function fail(?string $actual = null): self
    {
        return new self(false, $actual);
    }

    public static function parseError(string $reason): self
    {
        return new self(false, null, $reason);
    }
}
