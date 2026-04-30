<?php

namespace App\Services\Notifiers;

use App\Models\Monitor;
use App\Models\NotificationChannel;
use Illuminate\Support\Facades\Http;

class WebhookNotifier implements Notifier
{
    public function send(NotificationChannel $channel, Monitor $monitor, string $status, ?string $message = null, ?string $ackUrl = null): void
    {
        $url = $channel->configuration['url'];
        $secret = $channel->configuration['secret'] ?? null;
        $customHeaders = $this->parseCustomHeaders($channel->configuration['custom_headers'] ?? null);

        $payload = [
            'event' => 'monitor.status_changed',
            'monitor' => [
                'id' => $monitor->id,
                'name' => $monitor->name,
                'url' => $monitor->url,
                'status' => $status,
            ],
            'previous_status' => $monitor->getOriginal('status') ?? $monitor->status,
            'current_status' => $status,
            'message' => $message ?? "Monitor \"{$monitor->name}\" is now {$status}.",
            'timestamp' => now()->toISOString(),
            'ack_url' => $ackUrl,
        ];

        $headers = array_merge($customHeaders, [
            'Content-Type' => 'application/json',
        ]);

        if ($secret) {
            $signature = hash_hmac('sha256', json_encode($payload), $secret);
            $headers['X-Signature-256'] = 'sha256='.$signature;
        }

        Http::timeout(10)
            ->withHeaders($headers)
            ->post($url, $payload);
    }

    /**
     * @return array<string, string>
     */
    private function parseCustomHeaders(?string $headersJson): array
    {
        if (empty($headersJson)) {
            return [];
        }

        $decoded = json_decode($headersJson, true);

        if (! is_array($decoded)) {
            return [];
        }

        return $decoded;
    }
}
