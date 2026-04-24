<?php

namespace App\Services\Checkers;

use App\DTOs\CheckResult;
use App\Models\Monitor;

class TcpChecker implements MonitorChecker
{
    public function check(Monitor $monitor): CheckResult
    {
        $start = microtime(true);

        try {
            $errno = 0;
            $errstr = '';

            $connection = @fsockopen(
                $monitor->host,
                (int) $monitor->port,
                $errno,
                $errstr,
                (float) $monitor->timeout
            );

            $responseTime = (int) round((microtime(true) - $start) * 1000);

            if ($connection !== false) {
                fclose($connection);

                return new CheckResult(
                    status: 'up',
                    responseTime: $responseTime,
                );
            }

            return new CheckResult(
                status: 'down',
                responseTime: $responseTime,
                message: $errstr ?: "Connection refused on port {$monitor->port}",
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
