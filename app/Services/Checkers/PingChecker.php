<?php

namespace App\Services\Checkers;

use App\DTOs\CheckResult;
use App\Models\Monitor;

class PingChecker implements MonitorChecker
{
    public function check(Monitor $monitor): CheckResult
    {
        $start = microtime(true);

        try {
            // Clean host in case user provided a URL
            $host = preg_replace('/^https?:\/\//i', '', $monitor->host);
            $host = explode('/', $host)[0];
            $host = explode(':', $host)[0];

            $escapedHost = escapeshellarg($host);
            $timeout = (int) $monitor->timeout;

            exec("ping -c 1 -W {$timeout} {$escapedHost} 2>&1", $output, $exitCode);

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

            $errorMsg = $output[0] ?? "Ping failed for host {$host}";
            if (str_contains($errorMsg, 'unknown host')) {
                $errorMsg = "Unknown host: {$host}";
            }

            return new CheckResult(
                status: 'down',
                responseTime: $responseTime,
                message: $errorMsg,
            );
        } catch (\Throwable $e) {
            $responseTime = (int) round((microtime(true) - $start) * 1000);

            return new CheckResult(
                status: 'down',
                responseTime: $responseTime,
                message: $e->getMessage(),
            );
        }
    }
}
