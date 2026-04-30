<?php

namespace App\Services\Notifiers;

use App\Models\Monitor;
use App\Models\NotificationChannel;
use Illuminate\Support\Facades\Http;

class TelegramNotifier implements Notifier
{
    public function send(NotificationChannel $channel, Monitor $monitor, string $status, ?string $message = null, ?string $ackUrl = null): void
    {
        $botToken = $channel->configuration['bot_token'];
        $chatId = $channel->configuration['chat_id'];
        $text = $message ?? "Beacon: Monitor \"{$monitor->name}\" is now {$status}.";

        if ($ackUrl !== null) {
            $text .= "\n\nAcknowledge: {$ackUrl}";
        }

        Http::post("https://api.telegram.org/bot{$botToken}/sendMessage", [
            'chat_id' => $chatId,
            'text' => $text,
        ]);
    }
}
