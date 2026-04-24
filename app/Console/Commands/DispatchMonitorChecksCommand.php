<?php

namespace App\Console\Commands;

use App\Actions\HandleStatusChangeAction;
use App\Jobs\CheckHttpMonitorsBatchJob;
use App\Jobs\CheckMonitorJob;
use App\Models\Monitor;
use Carbon\Carbon;
use Illuminate\Console\Command;

class DispatchMonitorChecksCommand extends Command
{
    protected $signature = 'monitors:check';

    protected $description = 'Dispatch monitor check jobs for due monitors';

    public function handle(): void
    {
        $stopAt = now()->addSeconds(55);
        $totalDispatched = 0;

        do {
            $totalDispatched += $this->dispatchDueMonitors();
            $this->markOverduePushMonitorsAsDown(now());

            $nextDueAt = Monitor::query()
                ->where('is_active', true)
                ->where('type', '!=', 'push')
                ->whereNotNull('next_check_at')
                ->where('next_check_at', '<=', $stopAt)
                ->min('next_check_at');

            if (! $nextDueAt) {
                break;
            }

            $sleepSeconds = (int) max(1, now()->diffInSeconds(Carbon::parse($nextDueAt), absolute: false));

            if (now()->addSeconds($sleepSeconds)->greaterThan($stopAt)) {
                break;
            }

            sleep($sleepSeconds);
        } while (now()->lessThan($stopAt));

        $this->info("Dispatched {$totalDispatched} monitor check jobs.");
    }

    private function dispatchDueMonitors(): int
    {
        $now = now();

        $candidates = Monitor::query()
            ->where('is_active', true)
            ->where('type', '!=', 'push')
            ->where(function ($query) use ($now) {
                $query->whereNull('next_check_at')
                    ->orWhere('next_check_at', '<=', $now);
            })
            ->get();

        if ($candidates->isEmpty()) {
            return 0;
        }

        // Atomically claim each monitor by updating next_check_at only if it hasn't changed.
        // This prevents double-dispatch if two processes run concurrently.
        $monitors = $candidates->filter(function (Monitor $monitor) use ($now) {
            $affected = Monitor::where('id', $monitor->id)
                ->where(function ($query) use ($monitor) {
                    if (is_null($monitor->next_check_at)) {
                        $query->whereNull('next_check_at');
                    } else {
                        $query->where('next_check_at', $monitor->next_check_at);
                    }
                })
                ->update(['next_check_at' => $now->copy()->addSeconds($monitor->interval)]);

            return $affected > 0;
        });

        if ($monitors->isEmpty()) {
            return 0;
        }

        [$httpMonitors, $otherMonitors] = $monitors->partition(fn ($m) => $m->type === 'http');

        $httpMonitors->chunk(10)->each(
            fn ($chunk) => CheckHttpMonitorsBatchJob::dispatch($chunk->pluck('id')->toArray())
        );

        foreach ($otherMonitors as $monitor) {
            CheckMonitorJob::dispatch($monitor)->onQueue('monitors');
        }

        return $monitors->count();
    }

    private function markOverduePushMonitorsAsDown(Carbon $now): void
    {
        $pushMonitors = Monitor::query()
            ->where('is_active', true)
            ->where('type', 'push')
            ->where('status', '!=', 'down')
            ->withMax('heartbeats', 'created_at')
            ->get();

        if ($pushMonitors->isEmpty()) {
            return;
        }

        $handleStatusChange = new HandleStatusChangeAction;

        foreach ($pushMonitors as $monitor) {
            $threshold = $now->copy()->subSeconds($monitor->interval * 2);
            $lastHeartbeatAt = $monitor->heartbeats_max_created_at;

            if ($lastHeartbeatAt && Carbon::parse($lastHeartbeatAt)->greaterThanOrEqualTo($threshold)) {
                continue;
            }

            $message = 'No push heartbeat received within expected interval.';

            $monitor->heartbeats()->create([
                'status' => 'down',
                'response_time' => 0,
                'message' => $message,
            ]);

            $monitor->update(['last_checked_at' => $now]);

            $handleStatusChange->execute($monitor, 'down', $message);
        }
    }
}
