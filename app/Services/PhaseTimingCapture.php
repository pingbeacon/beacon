<?php

namespace App\Services;

use App\DTOs\PhaseCaptureResult;
use App\DTOs\PhaseTiming;
use App\Models\Monitor;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Throwable;

final class PhaseTimingCapture
{
    public function capture(Monitor $monitor): PhaseCaptureResult
    {
        try {
            $response = Http::timeout($monitor->timeout)
                ->withUserAgent('Beacon/1.0')
                ->withHeaders($monitor->headers ?? [])
                ->send($monitor->method ?? 'GET', $monitor->url);

            return self::resultFromResponse($response);
        } catch (Throwable $e) {
            return new PhaseCaptureResult(
                timing: PhaseTiming::empty(),
                statusCode: null,
                totalMs: 0,
                error: $e->getMessage(),
            );
        }
    }

    public static function resultFromResponse(Response $response): PhaseCaptureResult
    {
        $stats = $response->handlerStats();
        $timing = self::fromHandlerStats($stats);
        $totalMs = isset($stats['total_time'])
            ? (int) round($stats['total_time'] * 1000)
            : 0;

        return new PhaseCaptureResult(
            timing: $timing,
            statusCode: $response->status(),
            totalMs: $totalMs,
            body: $response->body(),
            headers: $response->headers(),
        );
    }

    /**
     * @param  array<string, mixed>  $stats
     */
    public static function fromHandlerStats(array $stats): PhaseTiming
    {
        $namelookup = self::asFloat($stats['namelookup_time'] ?? null);
        $connect = self::asFloat($stats['connect_time'] ?? null);
        $appconnect = self::asFloat($stats['appconnect_time'] ?? null);
        $starttransfer = self::asFloat($stats['starttransfer_time'] ?? null);
        $total = self::asFloat($stats['total_time'] ?? null);

        $dns = self::toMs($namelookup);
        $tcp = self::deltaMs($connect, $namelookup);

        $hasTls = $appconnect !== null && $appconnect > 0.0;
        $tls = $hasTls ? self::deltaMs($appconnect, $connect) : null;

        $ttfbAnchor = $hasTls ? $appconnect : $connect;
        $ttfb = self::deltaMs($starttransfer, $ttfbAnchor);
        $transfer = self::deltaMs($total, $starttransfer);

        return new PhaseTiming(
            phaseDnsMs: $dns,
            phaseTcpMs: $tcp,
            phaseTlsMs: $tls,
            phaseTtfbMs: $ttfb,
            phaseTransferMs: $transfer,
        );
    }

    private static function asFloat(mixed $value): ?float
    {
        if ($value === null) {
            return null;
        }

        return is_numeric($value) ? (float) $value : null;
    }

    private static function toMs(?float $seconds): ?int
    {
        if ($seconds === null || $seconds < 0) {
            return null;
        }

        return (int) round($seconds * 1000);
    }

    private static function deltaMs(?float $end, ?float $start): ?int
    {
        if ($end === null || $start === null) {
            return null;
        }

        $delta = $end - $start;
        if ($delta < 0) {
            return null;
        }

        return (int) round($delta * 1000);
    }
}
