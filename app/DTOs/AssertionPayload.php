<?php

namespace App\DTOs;

final class AssertionPayload
{
    /**
     * @param  array<string, string>  $headers  header keys must already be lower-cased
     */
    public function __construct(
        public ?int $statusCode,
        public ?int $latencyMs,
        public ?string $body,
        public array $headers = [],
        public ?string $contentType = null,
    ) {}
}
