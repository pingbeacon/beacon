<?php

namespace App\Services\Notifiers;

use App\Models\Monitor;
use App\Models\NotificationChannel;
use Illuminate\Support\Facades\Http;

class SlackNotifier implements Notifier
{
    public function send(NotificationChannel $channel, Monitor $monitor, string $status, ?string $message = null, ?string $ackUrl = null): void
    {
        $webhookUrl = $channel->configuration['webhook_url'];
        $text = $message ?? "Monitor \"{$monitor->name}\" is now *{$status}*.";

        if ($ackUrl !== null) {
            $text .= " <{$ackUrl}|Acknowledge>";
        }

        Http::post($webhookUrl, [
            'text' => $text,
        ]);
    }
}
