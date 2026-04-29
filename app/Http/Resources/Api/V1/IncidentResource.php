<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;

class IncidentResource extends ApiResource
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
            'started_at' => $this->started_at,
            'resolved_at' => $this->resolved_at,
            'cause' => $this->cause,
            'duration_seconds' => $this->resolved_at
                ? $this->started_at->diffInSeconds($this->resolved_at)
                : null,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
