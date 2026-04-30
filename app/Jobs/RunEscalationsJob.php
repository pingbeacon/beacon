<?php

namespace App\Jobs;

use App\Models\EscalationFire;
use App\Models\EscalationPolicy;
use App\Models\Incident;
use App\Models\NotificationChannel;
use App\Services\EscalationContext;
use App\Services\EscalationEngine;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;

class RunEscalationsJob implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        $incidents = Incident::query()
            ->unacked()
            ->whereNull('resolved_at')
            ->with('monitor')
            ->get();

        if ($incidents->isEmpty()) {
            return;
        }

        $contexts = [];
        $engine = new EscalationEngine(now()->toDateTimeImmutable());

        foreach ($incidents as $incident) {
            if ($incident->monitor === null) {
                continue;
            }

            $policy = $this->resolvePolicy($incident);

            if ($policy === null) {
                continue;
            }

            $firedStepIds = EscalationFire::query()
                ->where('incident_id', $incident->id)
                ->pluck('escalation_step_id')
                ->all();

            $contexts[] = new EscalationContext($incident, $policy, $firedStepIds);
        }

        $dispatches = $engine->tick($contexts);

        foreach ($dispatches as $dispatch) {
            $this->fireDispatch($dispatch->incident, $dispatch->step);
        }
    }

    private function resolvePolicy(Incident $incident): ?EscalationPolicy
    {
        $monitor = $incident->monitor;

        $policy = EscalationPolicy::query()
            ->where('is_active', true)
            ->where('monitor_id', $monitor->id)
            ->with('steps')
            ->first();

        if ($policy !== null) {
            return $policy;
        }

        return EscalationPolicy::query()
            ->where('is_active', true)
            ->whereNull('monitor_id')
            ->where('team_id', $monitor->team_id)
            ->with('steps')
            ->first();
    }

    private function fireDispatch(Incident $incident, $step): void
    {
        $inserted = DB::table('escalation_fires')->insertOrIgnore([
            'incident_id' => $incident->id,
            'escalation_step_id' => $step->id,
            'fired_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($inserted === 0) {
            return;
        }

        $monitor = $incident->monitor;
        $channelIds = array_map('intval', $step->channel_ids ?? []);

        if ($channelIds === []) {
            return;
        }

        $channels = NotificationChannel::query()
            ->whereIn('id', $channelIds)
            ->where('team_id', $monitor->team_id)
            ->where('is_enabled', true)
            ->get();

        foreach ($channels as $channel) {
            SendNotificationJob::dispatch(
                $channel,
                $monitor,
                $monitor->status,
                $incident->cause,
                $incident->id,
                'escalation',
            )->onQueue('notifications');
        }
    }
}
