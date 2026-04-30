<?php

namespace App\Services\Notifiers;

use App\Mail\MonitorStatusMail;
use App\Models\Monitor;
use App\Models\NotificationChannel;
use Illuminate\Support\Facades\Mail;

class EmailNotifier implements Notifier
{
    public function send(NotificationChannel $channel, Monitor $monitor, string $status, ?string $message = null, ?string $ackUrl = null): void
    {
        $email = $channel->configuration['email'];
        $body = $message ?? "Monitor \"{$monitor->name}\" has changed status to {$status}.";

        Mail::to($email)->send(new MonitorStatusMail($monitor->name, $status, $body, $ackUrl));
    }
}
