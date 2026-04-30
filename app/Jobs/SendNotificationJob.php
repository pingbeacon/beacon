<?php

namespace App\Jobs;

use App\Models\Incident;
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
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Throwable;

class SendNotificationJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public array $backoff = [30, 120];

    public function __construct(
        public NotificationChannel $channel,
        public Monitor $monitor,
        public string $status,
        public ?string $message = null,
        public ?int $incidentId = null,
    ) {
        $this->onQueue('notifications');
    }

    public function handle(): void
    {
        $notifier = $this->resolveNotifier();
        $ackUrl = $this->resolveAckUrl();

        $notifier->send($this->channel, $this->monitor, $this->status, $this->message, $ackUrl);

        Log::info('Notification sent', [
            'channel_id' => $this->channel->id,
            'channel_type' => $this->channel->type,
            'monitor_id' => $this->monitor->id,
            'monitor_name' => $this->monitor->name,
            'status' => $this->status,
            'incident_id' => $this->incidentId,
        ]);
    }

    private function resolveAckUrl(): ?string
    {
        if ($this->incidentId === null) {
            return null;
        }

        $incident = Incident::query()->find($this->incidentId);

        if ($incident === null || $incident->ack_token === null) {
            return null;
        }

        return URL::temporarySignedRoute(
            'incidents.ack',
            now()->addDays(7),
            ['token' => $incident->ack_token],
        );
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
