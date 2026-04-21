<?php

namespace App\Events;

use App\Models\Monitor;
use App\Models\SslCertificate;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SslCertificateChecked implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Monitor $monitor,
        public SslCertificate $sslCertificate,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('monitors.'.$this->monitor->user_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'SslCertificateChecked';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'monitorId' => $this->monitor->id,
            'sslCertificate' => [
                'issuer' => $this->sslCertificate->issuer,
                'subject' => $this->sslCertificate->subject,
                'valid_from' => $this->sslCertificate->valid_from?->toISOString(),
                'valid_to' => $this->sslCertificate->valid_to?->toISOString(),
                'days_until_expiry' => $this->sslCertificate->days_until_expiry,
                'is_valid' => $this->sslCertificate->is_valid,
                'error_message' => $this->sslCertificate->error_message,
            ],
        ];
    }
}
