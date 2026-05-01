<?php

namespace App\DTOs;

class CheckResult
{
    /**
     * @param  array<string, string>  $responseHeaders  lowercased header keys; in-memory only, never persisted to heartbeats
     */
    public function __construct(
        public string $status, // 'up' or 'down'
        public ?int $responseTime, // ms; null when no response was received (distinct from a real 0ms)
        public ?int $statusCode = null,
        public ?string $message = null,
        public ?int $phaseDnsMs = null,
        public ?int $phaseTcpMs = null,
        public ?int $phaseTlsMs = null,
        public ?int $phaseTtfbMs = null,
        public ?int $phaseTransferMs = null,
        public ?string $responseBody = null,
        public array $responseHeaders = [],
        public ?string $contentType = null,
    ) {}

    public function withTiming(PhaseTiming $timing): self
    {
        $this->phaseDnsMs = $timing->phaseDnsMs;
        $this->phaseTcpMs = $timing->phaseTcpMs;
        $this->phaseTlsMs = $timing->phaseTlsMs;
        $this->phaseTtfbMs = $timing->phaseTtfbMs;
        $this->phaseTransferMs = $timing->phaseTransferMs;

        return $this;
    }

    /**
     * @param  array<string, array<int, string>|string>  $headers
     */
    public function withResponse(?string $body, array $headers): self
    {
        $normalised = [];
        foreach ($headers as $name => $value) {
            $normalised[strtolower((string) $name)] = is_array($value) ? implode(', ', $value) : (string) $value;
        }

        $this->responseBody = $body;
        $this->responseHeaders = $normalised;
        $this->contentType = $normalised['content-type'] ?? null;

        return $this;
    }
}
