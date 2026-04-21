<?php

namespace App\Services\Checkers;

use App\DTOs\CheckResult;
use App\Models\Monitor;
use Illuminate\Support\Facades\Http;
use Throwable;

class HttpChecker implements MonitorChecker
{
    public function check(Monitor $monitor): CheckResult
    {
        $start = microtime(true);

        try {
            $response = Http::timeout($monitor->timeout)
                ->withUserAgent('UptimeRadar/1.0')

                ->withHeaders($monitor->headers ?? [])
                ->send($monitor->method ?? 'GET', $monitor->url);

            $responseTime = (int) round((microtime(true) - $start) * 1000);
            $statusCode = $response->status();
            $acceptedCodes = $monitor->accepted_status_codes ?? [200];

            if (in_array($statusCode, $acceptedCodes)) {
                return new CheckResult(
                    status: 'up',
                    responseTime: $responseTime,
                    statusCode: $statusCode,
                );
            }

            return new CheckResult(
                status: 'down',
                responseTime: $responseTime,
                statusCode: $statusCode,
                message: "Unexpected status code: {$statusCode}",
            );
        } catch (Throwable $e) {
            $responseTime = (int) round((microtime(true) - $start) * 1000);

            return new CheckResult(
                status: 'down',
                responseTime: $responseTime,
                message: $e->getMessage(),
            );
        }
    }
}
