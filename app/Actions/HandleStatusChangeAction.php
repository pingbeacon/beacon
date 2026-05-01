<?php

namespace App\Actions;

use App\DTOs\NotificationEvent;
use App\Events\MonitorStatusChanged;
use App\Jobs\SendNotificationJob;
use App\Models\Incident;
use App\Models\Monitor;
use App\Services\IncidentSeverityClassifier;
use App\Services\NotificationRouter;

class HandleStatusChangeAction
{
    public function __construct(
        public NotificationRouter $router = new NotificationRouter,
        public IncidentSeverityClassifier $severityClassifier = new IncidentSeverityClassifier,
    ) {}

    public function execute(Monitor $monitor, string $newStatus, ?string $message = null): void
    {
        $oldStatus = $monitor->status;
        $inMaintenance = $monitor->isInMaintenance();

        $monitor->update(['status' => $newStatus]);

        MonitorStatusChanged::dispatch($monitor, $oldStatus, $newStatus, $message);

        if ($inMaintenance) {
            return;
        }

        $incidentId = null;

        if ($newStatus === 'down' && $oldStatus !== 'down') {
            $heartbeat = $monitor->heartbeats()->latest('id')->first();

            $incident = Incident::create([
                'monitor_id' => $monitor->id,
                'started_at' => now(),
                'cause' => $message,
                'severity' => $this->severityClassifier->classify($monitor, $heartbeat)->value,
            ]);

            $incidentId = $incident->id;
        }

        if ($newStatus === 'up' && $oldStatus === 'down') {
            $monitor->incidents()
                ->whereNull('resolved_at')
                ->update(['resolved_at' => now()]);
        }

        $event = new NotificationEvent(
            monitor: $monitor,
            type: 'status_flip',
            newStatus: $newStatus,
            previousStatus: $oldStatus,
            incidentId: $incidentId,
        );

        foreach ($this->router->route($event) as $channel) {
            SendNotificationJob::dispatch($channel, $monitor, $newStatus, $message, $incidentId)
                ->onQueue('notifications');
        }
    }
}
