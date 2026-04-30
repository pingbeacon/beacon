<?php

namespace App\DTOs;

class TestNowResult
{
    public function __construct(
        public string $status,
        public int $responseTime,
        public ?int $statusCode,
        public ?string $message,
        public string $startedAt,
        public string $type,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'status' => $this->status,
            'responseTime' => $this->responseTime,
            'statusCode' => $this->statusCode,
            'message' => $this->message,
            'startedAt' => $this->startedAt,
            'type' => $this->type,
        ];
    }
}
