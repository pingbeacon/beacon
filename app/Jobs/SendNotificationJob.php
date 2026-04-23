<?php

namespace App\Jobs;

use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Services\Notifiers\DiscordNotifier;
use App\Services\Notifiers\EmailNotifier;
use App\Services\Notifiers\Notifier;
use App\Services\Notifiers\SlackNotifier;
use App\Services\Notifiers\TelegramNotifier;
use App\Services\Notifiers\WebhookNotifier;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendNotificationJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public NotificationChannel $channel,
        public Monitor $monitor,
        public string $status,
        public ?string $message = null,
    ) {
        $this->onQueue('notifications');
    }

    public function handle(): void
    {
        $cooldownKey = "notification_cooldown:{$this->monitor->id}:{$this->channel->id}";

        if (Cache::has($cooldownKey)) {
            Log::info('Notification skipped due to cooldown', [
                'channel_id' => $this->channel->id,
                'monitor_id' => $this->monitor->id,
            ]);

            return;
        }

        Cache::put($cooldownKey, true, now()->addMinutes(1));

        $notifier = $this->resolveNotifier();

        $notifier->send($this->channel, $this->monitor, $this->status, $this->message);

        Log::info('Notification sent', [
            'channel_id' => $this->channel->id,
            'channel_type' => $this->channel->type,
            'monitor_id' => $this->monitor->id,
            'monitor_name' => $this->monitor->name,
            'status' => $this->status,
        ]);
    }

    public function failed(Throwable $exception): void
    {
        Log::error('Notification failed', [
            'channel_id' => $this->channel->id,
            'monitor_id' => $this->monitor->id,
            'error' => $exception->getMessage(),
        ]);
    }

    private function resolveNotifier(): Notifier
    {
        return match ($this->channel->type) {
            'email' => new EmailNotifier,
            'slack' => new SlackNotifier,
            'discord' => new DiscordNotifier,
            'telegram' => new TelegramNotifier,
            'webhook' => new WebhookNotifier,
            default => throw new \InvalidArgumentException("Unknown channel type: {$this->channel->type}"),
        };
    }
}
