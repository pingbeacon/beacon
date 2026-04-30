<?php

namespace App\DTOs;

final class PhaseCaptureResult
{
    /**
     * @param  array<string, array<int, string>|string>  $headers
     */
    public function __construct(
        public PhaseTiming $timing,
        public ?int $statusCode,
        public int $totalMs,
        public ?string $body = null,
        public array $headers = [],
        public ?string $error = null,
    ) {}
}
