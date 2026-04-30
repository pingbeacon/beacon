<?php

namespace App\Http\Resources;

use App\Models\NotificationDelivery;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin NotificationDelivery
 */
class NotificationDeliveryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'channel_id' => $this->channel_id,
            'channel' => $this->whenLoaded('channel', fn () => [
                'id' => $this->channel->id,
                'name' => $this->channel->name,
                'type' => $this->channel->type,
            ]),
            'incident_id' => $this->incident_id,
            'incident' => $this->whenLoaded('incident', fn () => $this->incident ? [
                'id' => $this->incident->id,
                'started_at' => optional($this->incident->started_at)->toIso8601String(),
                'resolved_at' => optional($this->incident->resolved_at)?->toIso8601String(),
            ] : null),
            'event_type' => $this->event_type,
            'status' => $this->status,
            'latency_ms' => $this->latency_ms,
            'error' => $this->error,
            'dispatched_at' => optional($this->dispatched_at)->toIso8601String(),
        ];
    }
}
