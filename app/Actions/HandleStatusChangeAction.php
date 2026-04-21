<?php

namespace App\Actions;

use App\Events\MonitorStatusChanged;
use App\Jobs\SendNotificationJob;
use App\Models\Incident;
use App\Models\Monitor;

class HandleStatusChangeAction
{
    public function execute(Monitor $monitor, string $newStatus, ?string $message = null): void
    {
        $oldStatus = $monitor->status;
        $monitor->update(['status' => $newStatus]);

        MonitorStatusChanged::dispatch($monitor, $oldStatus, $newStatus, $message);

        if ($newStatus === 'down' && $oldStatus !== 'down') {
            Incident::create([
                'monitor_id' => $monitor->id,
                'started_at' => now(),
                'cause' => $message,
            ]);
        }

        if ($newStatus === 'up' && $oldStatus === 'down') {
            $monitor->incidents()
                ->whereNull('resolved_at')
                ->update(['resolved_at' => now()]);
        }

        if ($monitor->isInMaintenance()) {
            return;
        }

        foreach ($monitor->notificationChannels as $channel) {
            SendNotificationJob::dispatch($channel, $monitor, $newStatus, $message)
                ->onQueue('notifications');
        }
    }
}
