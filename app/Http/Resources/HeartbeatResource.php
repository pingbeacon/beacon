<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HeartbeatResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'monitor_id' => $this->monitor_id,
            'status' => $this->status,
            'status_code' => $this->status_code,
            'response_time' => $this->response_time,
            'phase_dns_ms' => $this->phase_dns_ms,
            'phase_tcp_ms' => $this->phase_tcp_ms,
            'phase_tls_ms' => $this->phase_tls_ms,
            'phase_ttfb_ms' => $this->phase_ttfb_ms,
            'phase_transfer_ms' => $this->phase_transfer_ms,
            'message' => $this->message,
            'created_at' => $this->created_at,
        ];
    }
}
