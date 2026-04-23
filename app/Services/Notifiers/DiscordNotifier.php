<?php

namespace App\Services\Notifiers;

use App\Models\Monitor;
use App\Models\NotificationChannel;
use Illuminate\Support\Facades\Http;

class DiscordNotifier implements Notifier
{
    public function send(NotificationChannel $channel, Monitor $monitor, string $status, ?string $message = null): void
    {
        $webhookUrl = $channel->configuration['webhook_url'];
        $description = $message ?? "Monitor \"{$monitor->name}\" has changed status to **{$status}**.";
        $color = $status === 'up' ? 3066993 : 15158332;

        Http::post($webhookUrl, [
            'embeds' => [
                [
                    'title' => "Beacon Alert: {$monitor->name}",
                    'description' => $description,
                    'color' => $color,
                ],
            ],
        ]);
    }
}
