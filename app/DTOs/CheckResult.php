<?php

namespace App\DTOs;

class CheckResult
{
    public function __construct(
        public string $status, // 'up' or 'down'
        public int $responseTime, // ms
        public ?int $statusCode = null,
        public ?string $message = null,
    ) {}
}
