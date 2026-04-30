<?php

namespace App\DTOs;

class CheckResult
{
    public function __construct(
        public string $status, // 'up' or 'down'
        public int $responseTime, // ms
        public ?int $statusCode = null,
        public ?string $message = null,
        public ?int $phaseDnsMs = null,
        public ?int $phaseTcpMs = null,
        public ?int $phaseTlsMs = null,
        public ?int $phaseTtfbMs = null,
        public ?int $phaseTransferMs = null,
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
}
