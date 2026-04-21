<?php

namespace App\Services\Checkers;

use App\DTOs\CheckResult;
use App\Models\Monitor;

class PingChecker implements MonitorChecker
{
    public function check(Monitor $monitor): CheckResult
    {
        $start = microtime(true);
        $host = escapeshellarg($monitor->host);
        $timeout = (int) $monitor->timeout;

        exec("ping -c 1 -W {$timeout} {$host} 2>&1", $output, $exitCode);

        $responseTime = (int) round((microtime(true) - $start) * 1000);
        $outputStr = implode("\n", $output);

        if ($exitCode === 0) {
            if (preg_match('/time[=<](\d+\.?\d*)\s*ms/i', $outputStr, $matches)) {
                $responseTime = (int) round((float) $matches[1]);
            }

            return new CheckResult(
                status: 'up',
                responseTime: $responseTime,
            );
        }

        return new CheckResult(
            status: 'down',
            responseTime: $responseTime,
            message: "Ping failed for host {$monitor->host}",
        );
    }
}
