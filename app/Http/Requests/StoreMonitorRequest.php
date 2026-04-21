<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMonitorRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['http', 'tcp', 'ping', 'dns', 'push'])],
            'url' => ['required_if:type,http', 'nullable', 'url'],
            'host' => ['required_if:type,tcp', 'required_if:type,ping', 'required_if:type,dns', 'nullable', 'string'],
            'port' => ['required_if:type,tcp', 'nullable', 'integer', 'between:1,65535'],
            'dns_record_type' => ['required_if:type,dns', 'nullable', Rule::in(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA'])],
            'method' => ['sometimes', Rule::in(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])],
            'body' => ['nullable', 'string'],
            'headers' => ['nullable', 'array'],
            'accepted_status_codes' => ['nullable', 'array'],
            'accepted_status_codes.*' => ['integer'],
            'interval' => ['sometimes', 'integer', 'min:10', 'max:3600'],
            'timeout' => ['sometimes', 'integer', 'min:1', 'max:120'],
            'retry_count' => ['sometimes', 'integer', 'min:0', 'max:10'],
            'tag_ids' => ['nullable', 'array'],
            'tag_ids.*' => ['integer', Rule::exists('tags', 'id')->where('team_id', $this->user()->current_team_id)],
            'notification_channel_ids' => ['nullable', 'array'],
            'notification_channel_ids.*' => ['integer', Rule::exists('notification_channels', 'id')->where('team_id', $this->user()->current_team_id)],
            'monitor_group_id' => ['nullable', 'integer', Rule::exists('monitor_groups', 'id')->where('team_id', $this->user()->current_team_id)],
            'ssl_monitoring_enabled' => ['sometimes', 'boolean'],
            'ssl_expiry_notification_days' => ['nullable', 'array'],
            'ssl_expiry_notification_days.*' => ['integer', 'min:1'],
        ];
    }
}
