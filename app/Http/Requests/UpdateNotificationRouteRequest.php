<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateNotificationRouteRequest extends FormRequest
{
    public function authorize(): bool
    {
        $monitor = $this->route('monitor');

        if ($monitor === null || $this->user() === null) {
            return false;
        }

        return $monitor->team_id === $this->user()->current_team_id;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'priority' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'is_active' => ['sometimes', 'boolean'],
            'conditions' => ['sometimes', 'array'],
            'conditions.severity_filter' => ['nullable', 'array'],
            'conditions.severity_filter.*' => ['string', Rule::in(['critical', 'warning', 'info'])],
            'conditions.status_filter' => ['nullable', 'array'],
            'conditions.status_filter.*' => ['string', Rule::in(['up', 'down', 'paused', 'resolved'])],
            'channel_ids' => ['sometimes', 'array', 'min:1'],
            'channel_ids.*' => [
                'integer',
                Rule::exists('notification_channels', 'id')
                    ->where('team_id', $this->user()->current_team_id),
            ],
        ];
    }
}
