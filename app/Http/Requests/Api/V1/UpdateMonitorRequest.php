<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMonitorRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'url' => ['sometimes', 'nullable', 'url'],
            'host' => ['sometimes', 'nullable', 'string'],
            'port' => ['sometimes', 'nullable', 'integer', 'between:1,65535'],
            'dns_record_type' => ['sometimes', 'nullable', Rule::in(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA'])],
            'method' => ['sometimes', Rule::in(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])],
            'body' => ['sometimes', 'nullable', 'string'],
            'headers' => ['sometimes', 'nullable', 'array'],
            'accepted_status_codes' => ['sometimes', 'nullable', 'array'],
            'accepted_status_codes.*' => ['integer', 'between:100,599'],
            'interval' => ['sometimes', 'integer', 'min:10', 'max:3600'],
            'timeout' => ['sometimes', 'integer', 'min:1', 'max:120'],
            'retry_count' => ['sometimes', 'integer', 'min:0', 'max:10'],
            'is_active' => ['sometimes', 'boolean'],
            'ssl_monitoring_enabled' => ['sometimes', 'boolean'],
            'ssl_expiry_notification_days' => ['sometimes', 'nullable', 'array'],
            'ssl_expiry_notification_days.*' => ['integer', 'min:1'],
        ];
    }
}
