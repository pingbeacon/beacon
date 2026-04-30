<?php

namespace App\Jobs;

use App\Models\Incident;
use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Models\NotificationDelivery;
use App\Services\Notifiers\DiscordNotifier;
use App\Services\Notifiers\EmailNotifier;
use App\Services\Notifiers\Notifier;
use App\Services\Notifiers\SlackNotifier;
use App\Services\Notifiers\TelegramNotifier;
use App\Services\Notifiers\WebhookNotifier;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Carbon;
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
        public string $eventType = 'status_flip',
    ) {
        $this->onQueue('notifications');
    }

    public function handle(): void
    {
        $notifier = $this->resolveNotifier();
        $ackUrl = $this->resolveAckUrl();

        $start = microtime(true);
        $dispatchedAt = now();

        try {
            $notifier->send($this->channel, $this->monitor, $this->status, $this->message, $ackUrl);
        } catch (Throwable $e) {
            $this->recordDelivery(
                status: 'failed',
                latencyMs: (int) round((microtime(true) - $start) * 1000),
                error: $e->getMessage(),
                dispatchedAt: $dispatchedAt,
            );

            throw $e;
        }

        $this->recordDelivery(
            status: 'delivered',
            latencyMs: (int) round((microtime(true) - $start) * 1000),
            error: null,
            dispatchedAt: $dispatchedAt,
        );

        Log::info('Notification sent', [
            'channel_id' => $this->channel->id,
            'channel_type' => $this->channel->type,
            'monitor_id' => $this->monitor->id,
            'monitor_name' => $this->monitor->name,
            'status' => $this->status,
            'incident_id' => $this->incidentId,
            'event_type' => $this->eventType,
        ]);
    }

    private function recordDelivery(string $status, int $latencyMs, ?string $error, Carbon $dispatchedAt): void
    {
        NotificationDelivery::create([
            'team_id' => $this->channel->team_id ?? $this->monitor->team_id,
            'channel_id' => $this->channel->id,
            'monitor_id' => $this->monitor->id,
            'incident_id' => $this->incidentId,
            'event_type' => $this->eventType,
            'status' => $status,
            'latency_ms' => $latencyMs,
            'error' => $error,
            'dispatched_at' => $dispatchedAt,
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
        if (app()->bound(Notifier::class)) {
            return app(Notifier::class);
        }

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
