<?php

namespace App\Jobs;

use App\Actions\HandleStatusChangeAction;
use App\DTOs\CheckResult;
use App\Events\HeartbeatRecorded;
use App\Events\MonitorChecking;
use App\Models\Monitor;
use App\Services\Checkers\DnsChecker;
use App\Services\Checkers\HttpChecker;
use App\Services\Checkers\MonitorChecker;
use App\Services\Checkers\PingChecker;
use App\Services\Checkers\TcpChecker;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class CheckMonitorJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public function __construct(public Monitor $monitor)
    {
        $this->onQueue('monitors');
    }

    public function handle(HandleStatusChangeAction $handleStatusChange): void
    {
        MonitorChecking::dispatch($this->monitor);

        try {
            $checker = $this->resolveChecker();
            $result = $this->runWithRetry($checker);
        } catch (Throwable $e) {
            $heartbeat = $this->monitor->heartbeats()->create([
                'status' => 'down',
                'response_time' => 0,
                'message' => $e->getMessage(),
            ]);

            $this->monitor->update([
                'last_checked_at' => now(),
                'status' => 'down',
            ]);

            HeartbeatRecorded::dispatch($this->monitor->fresh(), $heartbeat);

            throw $e;
        }

        $heartbeat = $this->monitor->heartbeats()->create([
            'status' => $result->status,
            'status_code' => $result->statusCode,
            'response_time' => $result->responseTime,
            'message' => $result->message,
        ]);

        $previousStatus = $this->monitor->status;
        $this->monitor->update(['last_checked_at' => now()]);

        if ($result->status !== $previousStatus && $previousStatus !== 'pending') {
            $handleStatusChange->execute($this->monitor, $result->status, $result->message);
        } elseif ($previousStatus === 'pending') {
            $this->monitor->update(['status' => $result->status]);
        }

        HeartbeatRecorded::dispatch($this->monitor->fresh(), $heartbeat);
    }

    private function resolveChecker(): MonitorChecker
    {
        return match ($this->monitor->type) {
            'http' => new HttpChecker,
            'tcp' => new TcpChecker,
            'ping' => new PingChecker,
            'dns' => new DnsChecker,
            default => throw new \InvalidArgumentException("Unsupported monitor type: {$this->monitor->type}"),
        };
    }

    private function runWithRetry(MonitorChecker $checker): CheckResult
    {
        $attempts = max(1, $this->monitor->retry_count + 1);
        $lastResult = null;

        for ($i = 0; $i < $attempts; $i++) {
            $result = $checker->check($this->monitor);

            if ($result->status === 'up') {
                return $result;
            }

            $lastResult = $result;

            if ($i < $attempts - 1) {
                sleep(1);
            }
        }

        return $lastResult;
    }
}
