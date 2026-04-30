<?php

namespace App\Jobs;

use App\Actions\HandleStatusChangeAction;
use App\DTOs\CheckResult;
use App\Events\HeartbeatRecorded;
use App\Events\MonitorChecking;
use App\Models\Monitor;
use App\Services\PhaseTimingCapture;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Throwable;

class CheckHttpMonitorsBatchJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    /** @param array<int> $monitorIds */
    public function __construct(public array $monitorIds)
    {
        $this->onQueue('monitors');
    }

    public function handle(HandleStatusChangeAction $handleStatusChange): void
    {
        $monitors = Monitor::query()
            ->whereIn('id', $this->monitorIds)
            ->with('notificationChannels')
            ->get()
            ->keyBy('id');

        if ($monitors->isEmpty()) {
            return;
        }

        foreach ($monitors as $monitor) {
            MonitorChecking::dispatch($monitor);
        }

        $responses = Http::pool(function (Pool $pool) use ($monitors) {
            return $monitors->map(fn ($monitor) => $pool->as((string) $monitor->id)
                ->timeout($monitor->timeout)
                ->withUserAgent('Beacon/1.0')
                ->withHeaders($monitor->headers ?? [])
                ->send($monitor->method ?? 'GET', $monitor->url)
            )->values()->toArray();
        });

        foreach ($monitors as $monitor) {
            $response = $responses[(string) $monitor->id] ?? null;
            $result = $this->buildResult($monitor, $response);

            $heartbeat = $monitor->heartbeats()->create([
                'status' => $result->status,
                'status_code' => $result->statusCode,
                'response_time' => $result->responseTime,
                'phase_dns_ms' => $result->phaseDnsMs,
                'phase_tcp_ms' => $result->phaseTcpMs,
                'phase_tls_ms' => $result->phaseTlsMs,
                'phase_ttfb_ms' => $result->phaseTtfbMs,
                'phase_transfer_ms' => $result->phaseTransferMs,
                'message' => $result->message,
            ]);

            $previousStatus = $monitor->status;
            $monitor->update(['last_checked_at' => now()]);

            if ($result->status !== $previousStatus && $previousStatus !== 'pending') {
                $handleStatusChange->execute($monitor, $result->status, $result->message);
            } elseif ($previousStatus === 'pending') {
                $monitor->update(['status' => $result->status]);
            }

            HeartbeatRecorded::dispatch($monitor->refresh(), $heartbeat);
        }
    }

    private function buildResult(Monitor $monitor, mixed $response): CheckResult
    {
        if ($response instanceof Throwable || $response === null) {
            return new CheckResult(
                status: 'down',
                responseTime: 0,
                message: $response instanceof Throwable ? $response->getMessage() : 'No response received.',
            );
        }

        /** @var Response $response */
        $stats = $response->handlerStats();
        $responseTime = isset($stats['total_time'])
            ? (int) round($stats['total_time'] * 1000)
            : 0;
        $timing = PhaseTimingCapture::fromHandlerStats($stats);

        $statusCode = $response->status();
        $acceptedCodes = $monitor->accepted_status_codes ?? [200];
        $status = in_array($statusCode, $acceptedCodes) ? 'up' : 'down';
        $message = $status === 'down' ? "Unexpected status code: {$statusCode}" : null;

        return (new CheckResult(
            status: $status,
            responseTime: $responseTime,
            statusCode: $statusCode,
            message: $message,
        ))->withTiming($timing);
    }
}
