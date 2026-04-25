<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;

class ApiTokenResource extends ApiResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $abilities = $this->abilities ?? [];
        $scopes = collect($abilities)->reject(fn ($a) => str_starts_with($a, 'team:'))->values();
        $teamAbility = collect($abilities)->first(fn ($a) => str_starts_with($a, 'team:'));
        $teamId = $teamAbility ? (int) substr($teamAbility, 5) : null;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'scopes' => $scopes,
            'team_id' => $teamId,
            'expires_at' => $this->expires_at,
            'last_used_at' => $this->last_used_at,
            'created_at' => $this->created_at,
        ];
    }
}
