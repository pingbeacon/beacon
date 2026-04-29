<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;

class StatusPageResource extends ApiResource
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
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description,
            'is_published' => $this->is_published,
            'custom_domain' => $this->custom_domain,
            'header_text' => $this->header_text,
            'footer_text' => $this->footer_text,
            'show_powered_by' => $this->show_powered_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
