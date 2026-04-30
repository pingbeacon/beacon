<?php

namespace App\DTOs;

final class PhaseTiming
{
    public function __construct(
        public ?int $phaseDnsMs = null,
        public ?int $phaseTcpMs = null,
        public ?int $phaseTlsMs = null,
        public ?int $phaseTtfbMs = null,
        public ?int $phaseTransferMs = null,
    ) {}

    public static function empty(): self
    {
        return new self;
    }

    /**
     * @return array{phase_dns_ms: ?int, phase_tcp_ms: ?int, phase_tls_ms: ?int, phase_ttfb_ms: ?int, phase_transfer_ms: ?int}
     */
    public function toArray(): array
    {
        return [
            'phase_dns_ms' => $this->phaseDnsMs,
            'phase_tcp_ms' => $this->phaseTcpMs,
            'phase_tls_ms' => $this->phaseTlsMs,
            'phase_ttfb_ms' => $this->phaseTtfbMs,
            'phase_transfer_ms' => $this->phaseTransferMs,
        ];
    }
}
