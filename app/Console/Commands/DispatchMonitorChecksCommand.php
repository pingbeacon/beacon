<?php

namespace App\Console\Commands;

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

        $monitors = Monitor::query()
            ->where('is_active', true)
            ->where('type', '!=', 'push')
            ->where(function ($query) use ($now) {
                $query->whereNull('next_check_at')
                    ->orWhere('next_check_at', '<=', $now);
            })
            ->get();

        foreach ($monitors as $monitor) {
            CheckMonitorJob::dispatch($monitor)->onQueue('monitors');

            $monitor->update([
                'next_check_at' => $now->copy()->addSeconds($monitor->interval),
            ]);
        }

        return $monitors->count();
    }

    private function markOverduePushMonitorsAsDown(Carbon $now): void
    {
        $pushMonitors = Monitor::query()
            ->where('is_active', true)
            ->where('type', 'push')
            ->where('status', '!=', 'down')
            ->get();

        foreach ($pushMonitors as $monitor) {
            $threshold = $now->copy()->subSeconds($monitor->interval * 2);

            $recentHeartbeat = $monitor->heartbeats()
                ->where('created_at', '>=', $threshold)
                ->exists();

            if (! $recentHeartbeat) {
                $monitor->heartbeats()->create([
                    'status' => 'down',
                    'response_time' => 0,
                    'message' => 'No push heartbeat received within expected interval.',
                ]);

                $monitor->update(['status' => 'down', 'last_checked_at' => $now]);
            }
        }
    }
}
