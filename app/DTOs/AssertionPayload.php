<?php

namespace App\DTOs;

final class AssertionPayload
{
    /**
     * @param  array<string, string>  $headers  any case — keys are normalized to lower-case at the DTO boundary
     */
    public function __construct(
        public ?int $statusCode,
        public ?int $latencyMs,
        public ?string $body,
        public array $headers = [],
        public ?string $contentType = null,
    ) {
        $this->headers = array_change_key_case($headers, CASE_LOWER);
    }
}
