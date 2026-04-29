<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;

class HeartbeatResource extends ApiResource
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
            'message' => $this->message,
            'created_at' => $this->created_at,
        ];
    }
}
