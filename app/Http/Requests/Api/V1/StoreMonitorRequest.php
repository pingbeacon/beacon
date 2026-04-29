<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMonitorRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['http', 'tcp', 'ping', 'dns', 'push'])],
            'url' => ['required_if:type,http', 'nullable', 'url'],
            'host' => ['required_if:type,tcp', 'required_if:type,ping', 'required_if:type,dns', 'nullable', 'string'],
            'port' => ['required_if:type,tcp', 'nullable', 'integer', 'between:1,65535'],
            'dns_record_type' => ['required_if:type,dns', 'nullable', Rule::in(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA'])],
            'method' => ['prohibited_unless:type,http', Rule::in(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])],
            'body' => ['nullable', 'string'],
            'headers' => ['nullable', 'array'],
            'accepted_status_codes' => ['nullable', 'array', 'prohibited_unless:type,http'],
            'accepted_status_codes.*' => ['integer', 'between:100,599'],
            'interval' => ['sometimes', 'integer', 'min:10', 'max:3600'],
            'timeout' => ['sometimes', 'integer', 'min:1', 'max:120'],
            'retry_count' => ['sometimes', 'integer', 'min:0', 'max:10'],
            'ssl_monitoring_enabled' => ['sometimes', 'boolean'],
            'ssl_expiry_notification_days' => ['nullable', 'array'],
            'ssl_expiry_notification_days.*' => ['integer', 'min:1'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Monitor name is required.',
            'type.required' => 'Monitor type is required.',
            'type.in' => 'Type must be one of: http, tcp, ping, dns, push.',
            'url.required_if' => 'A URL is required for HTTP monitors.',
            'url.url' => 'URL must be a valid URL.',
            'host.required_if' => 'Host is required for tcp, ping, and dns monitors.',
            'port.required_if' => 'Port is required for tcp monitors.',
            'port.between' => 'Port must be between 1 and 65535.',
            'dns_record_type.required_if' => 'DNS record type is required for dns monitors.',
            'dns_record_type.in' => 'DNS record type must be one of: A, AAAA, CNAME, MX, TXT, NS, SOA.',
            'method.in' => 'HTTP method must be one of: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS.',
            'interval.min' => 'Interval must be at least 10 seconds.',
            'interval.max' => 'Interval may not be greater than 3600 seconds.',
            'timeout.min' => 'Timeout must be at least 1 second.',
            'timeout.max' => 'Timeout may not be greater than 120 seconds.',
            'retry_count.max' => 'Retry count may not be greater than 10.',
        ];
    }
}
