<?php

namespace App\Services;

use App\Enums\IncidentSeverity;
use App\Models\Heartbeat;
use App\Models\Monitor;

/**
 * Single point of truth for incident severity. Pure function over the
 * triggering heartbeat plus the owning monitor's config — no DB reads,
 * no side effects.
 *
 * - down + monitor flagged is_critical → Sev1
 * - down + non-critical                → Sev2
 * - degraded                           → Sev3
 * - anything else (incl. null beat)    → Info
 */
class IncidentSeverityClassifier
{
    public function classify(Monitor $monitor, ?Heartbeat $heartbeat): IncidentSeverity
    {
        $status = $heartbeat?->status;

        if ($status === 'down') {
            return $monitor->is_critical ? IncidentSeverity::Sev1 : IncidentSeverity::Sev2;
        }

        if ($status === 'degraded') {
            return IncidentSeverity::Sev3;
        }

        return IncidentSeverity::Info;
    }
}
