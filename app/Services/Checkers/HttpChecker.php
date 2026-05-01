<?php

namespace App\Services\Checkers;

use App\DTOs\CheckResult;
use App\Models\Monitor;
use App\Services\PhaseTimingCapture;
use Illuminate\Support\Facades\Http;
use Throwable;

class HttpChecker implements MonitorChecker
{
    public const BODY_CAPTURE_LIMIT = 65_536;

    public function check(Monitor $monitor): CheckResult
    {
        $start = microtime(true);

        try {
            $response = Http::timeout($monitor->timeout)
                ->withUserAgent('Beacon/1.0')
                ->withHeaders($monitor->headers ?? [])
                ->send($monitor->method ?? 'GET', $monitor->url);

            $responseTime = (int) round((microtime(true) - $start) * 1000);
            $statusCode = $response->status();
            $acceptedCodes = $monitor->accepted_status_codes ?? [200];
            $timing = PhaseTimingCapture::fromHandlerStats($response->handlerStats());

            $status = in_array($statusCode, $acceptedCodes) ? 'up' : 'down';
            $message = $status === 'down' ? "Unexpected status code: {$statusCode}" : null;

            return (new CheckResult(
                status: $status,
                responseTime: $responseTime,
                statusCode: $statusCode,
                message: $message,
            ))
                ->withTiming($timing)
                ->withResponse(self::truncateBody((string) $response->body()), $response->headers());
        } catch (Throwable $e) {
            $responseTime = (int) round((microtime(true) - $start) * 1000);

            return new CheckResult(
                status: 'down',
                responseTime: $responseTime,
                message: $e->getMessage(),
            );
        }
    }

    private static function truncateBody(string $body): string
    {
        return strlen($body) > self::BODY_CAPTURE_LIMIT
            ? substr($body, 0, self::BODY_CAPTURE_LIMIT)
            : $body;
    }
}
