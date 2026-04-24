<?php

namespace App\Events;

use App\Models\Heartbeat;
use App\Models\Monitor;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class HeartbeatRecorded implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Monitor $monitor,
        public Heartbeat $heartbeat,
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
        return 'HeartbeatRecorded';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'monitorId' => $this->monitor->id,
            'heartbeat' => [
                'id' => $this->heartbeat->id,
                'status' => $this->heartbeat->status,
                'status_code' => $this->heartbeat->status_code,
                'response_time' => $this->heartbeat->response_time,
                'created_at' => $this->heartbeat->created_at->toISOString(),
            ],
            'monitorStatus' => $this->monitor->status,
            'uptimePercentage' => $this->monitor->uptimePercentage(),
            'averageResponseTime' => $this->monitor->averageResponseTime(),
        ];
    }
}
